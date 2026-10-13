<?php
// pharmacist/generate_order_bill.php
// Generates a bill for an order, saves order items, generates pickup pin,
// and posts the bill to order_messages chat
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['order_id']) || !isset($data['items']) || !is_array($data['items'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id and items array are required"]);
    exit();
}

$order_id = (int)$data['order_id'];
$items    = $data['items'];
$pharmacist_note = isset($data['pharmacist_note']) ? trim($data['pharmacist_note']) : null;

if (count($items) === 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Items array cannot be empty"]);
    exit();
}

try {
    // Get pharmacist details
    $stmt = $pdo->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist is not linked to a pharmacy"]);
        exit();
    }

    $pharmacy_id = (int)$pharmacist['pharmacy_id'];

    // Retrieve order for verification
    $ord_stmt = $pdo->prepare(
        "SELECT order_id, patient_id, pharmacy_id, status FROM orders WHERE order_id = :oid FOR UPDATE"
    );
    $pdo->beginTransaction();
    $ord_stmt->execute([':oid' => $order_id]);
    $order = $ord_stmt->fetch();

    if (!$order) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Order not found"]);
        exit();
    }

    if ($order['pharmacy_id'] != $pharmacy_id) {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Order does not belong to your pharmacy"]);
        exit();
    }

    // Calculate total amount & validate items
    $total_amount = 0.00;
    $validated_items = [];

    foreach ($items as $item) {
        if (!isset($item['medicine_id']) || !isset($item['quantity']) || !isset($item['unit_price'])) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Each item must have medicine_id, quantity, and unit_price"]);
            exit();
        }

        $med_id = (int)$item['medicine_id'];
        $qty    = (int)$item['quantity'];
        $price  = (float)$item['unit_price'];

        if ($qty <= 0 || $price < 0) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Quantity and price must be positive numbers"]);
            exit();
        }

        $total_amount += $qty * $price;
        $validated_items[] = [
            'medicine_id' => $med_id,
            'quantity'    => $qty,
            'unit_price'  => $price,
            'item_type'   => isset($item['item_type']) && in_array($item['item_type'], ['prescribed', 'manual_otc']) ? $item['item_type'] : 'prescribed'
        ];
    }

    // 1. Delete existing items for this order to recreate
    $del_stmt = $pdo->prepare("DELETE FROM order_items WHERE order_id = :oid");
    $del_stmt->execute([':oid' => $order_id]);

    // 2. Insert new order items
    $ins_item = $pdo->prepare(
        "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
         VALUES (:oid, :mid, :qty, :price, :type)"
    );
    foreach ($validated_items as $v_item) {
        $ins_item->execute([
            ':oid'  => $order_id,
            ':mid'  => $v_item['medicine_id'],
            ':qty'  => $v_item['quantity'],
            ':price'=> $v_item['unit_price'],
            ':type' => $v_item['item_type']
        ]);
    }

    // 3. Get pharmacy name for the bill message
    $ph_stmt = $pdo->prepare("SELECT pharmacy_name FROM pharmacies WHERE pharmacy_id = :phid");
    $ph_stmt->execute([':phid' => $pharmacy_id]);
    $pharmacy_row = $ph_stmt->fetch();
    $pharmacy_name = $pharmacy_row ? $pharmacy_row['pharmacy_name'] : 'Pharmacy';

    // 4. Generate a 4-digit pickup PIN
    $pickup_pin = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

    // 5. Update orders: total, status, note, and pickup_pin
    $up_ord = $pdo->prepare(
        "UPDATE orders 
         SET total_amount = :total, status = 'Reserved', pharmacist_note = :note, pickup_pin = :pin 
         WHERE order_id = :oid"
    );
    $up_ord->execute([
        ':total' => $total_amount,
        ':note'  => $pharmacist_note,
        ':pin'   => $pickup_pin,
        ':oid'   => $order_id
    ]);

    // 5b. Save PIN to pickup_pins table for audit trail
    try {
        $ins_pin = $pdo->prepare(
            "INSERT INTO pickup_pins (reservation_id, pharmacy_id, pin_code, total_amount, generated_by, created_at)
             VALUES (0, :phid, :pin, :total, :uid, NOW())"
        );
        $ins_pin->execute([
            ':phid'  => $pharmacy_id,
            ':pin'   => $pickup_pin,
            ':total' => $total_amount,
            ':uid'   => $_SESSION['user_id']
        ]);
    } catch (PDOException $e) {
        error_log("Failed to save PIN to pickup_pins: " . $e->getMessage());
    }

    // 6. Build itemized list for the formatted bill message
    $formatted_total = number_format($total_amount, 2, '.', ',');
    $items_lines = [];
    foreach ($validated_items as $v_item) {
        $med_stmt2 = $pdo->prepare("SELECT brand_name FROM master_medicines WHERE medicine_id = :mid");
        $med_stmt2->execute([':mid' => $v_item['medicine_id']]);
        $med_row = $med_stmt2->fetch();
        $med_name = $med_row ? $med_row['brand_name'] : 'Medicine #' . $v_item['medicine_id'];
        $line_total = $v_item['quantity'] * $v_item['unit_price'];
        $items_lines[] = "  {$med_name}  x{$v_item['quantity']}  —  Rs. " . number_format($line_total, 2, '.', ',');
    }
    $items_text = implode("\n", $items_lines);

    // 7. Post formatted bill message to order_messages chat
    $sys_stmt = $pdo->prepare(
        "INSERT INTO order_messages (order_id, sender_role, message, created_at)
         VALUES (:oid, 'pharmacist', :msg, NOW())"
    );

    $note_line = $pharmacist_note ? "\nNote: {$pharmacist_note}\n" : "";
    $sys_msg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "BILL — {$pharmacy_name}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Order #{$order_id}\n"
             . "Date: " . date('d M Y, h:i A') . "\n\n"
             . "Items:\n{$items_text}\n"
             . "{$note_line}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Total:  LKR {$formatted_total}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
             . "Pickup PIN: {$pickup_pin}\n\n"
             . "Please review this bill. Share this PIN at the pharmacy counter to collect your order.";

    $sys_stmt->execute([
        ':oid' => $order_id,
        ':msg' => $sys_msg
    ]);

    $pdo->commit();

    echo json_encode([
        "status"       => "success",
        "message"      => "Bill generated, pickup PIN created, and order updated to Reserved",
        "total_amount" => $total_amount,
        "pickup_pin"   => $pickup_pin,
        "order_id"     => $order_id
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>