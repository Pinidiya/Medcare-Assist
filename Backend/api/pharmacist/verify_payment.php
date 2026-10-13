<?php
// pharmacist/verify_payment.php
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
$order_id = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$action = isset($data['action']) ? trim($data['action']) : ''; // 'approve' or 'reject'

if (!$order_id || !in_array($action, ['approve', 'reject'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid order_id and action ('approve' or 'reject') are required"]);
    exit();
}

try {
    $pdo->beginTransaction();

    $pin = null;
    $new_status = 'Rejected';
    $bill_message = null;
    $total_amount = 0;

    if ($action === 'approve') {
        $pin = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $new_status = 'Reserved';

        // Fetch existing order items to build the bill
        $item_stmt = $pdo->prepare(
            "SELECT oi.quantity, oi.unit_price, m.brand_name
             FROM order_items oi
             JOIN master_medicines m ON oi.medicine_id = m.medicine_id
             WHERE oi.order_id = :oid"
        );
        $item_stmt->execute([':oid' => $order_id]);
        $order_items = $item_stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate total from existing items
        foreach ($order_items as $item) {
            $total_amount += $item['quantity'] * $item['unit_price'];
        }

        // Get pharmacy name
        $ord_stmt = $pdo->prepare(
            "SELECT o.pharmacy_id, ph.pharmacy_name
             FROM orders o
             JOIN pharmacies ph ON o.pharmacy_id = ph.pharmacy_id
             WHERE o.order_id = :oid"
        );
        $ord_stmt->execute([':oid' => $order_id]);
        $order_info = $ord_stmt->fetch(PDO::FETCH_ASSOC);
        $pharmacy_name = $order_info ? $order_info['pharmacy_name'] : 'Pharmacy';

        // Build itemized bill text
        $formatted_total = number_format($total_amount, 2, '.', ',');
        $items_lines = [];
        foreach ($order_items as $item) {
            $line_total = $item['quantity'] * $item['unit_price'];
            $items_lines[] = "  {$item['brand_name']}  x{$item['quantity']}  —  Rs. " . number_format($line_total, 2, '.', ',');
        }
        $items_text = implode("\n", $items_lines);

        // Build formatted bill message
        $bill_message = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                      . "BILL — {$pharmacy_name}\n"
                      . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                      . "Order #{$order_id}\n"
                      . "Date: " . date('d M Y, h:i A') . "\n\n"
                      . "Items:\n{$items_text}\n\n"
                      . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                      . "Total:  LKR {$formatted_total}\n"
                      . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                      . "Pickup PIN: {$pin}\n\n"
                      . "Please share this PIN at the pharmacy counter to collect your order.";
    }

    // SECURITY: Ensure pharmacist can only verify payments for their pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();
    
    if (!$pharmacist) {
        $pdo->rollBack();
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Pharmacist profile not found"]));
    }

    // Update order status and pickup_pin
    $stmt = $pdo->prepare(
        "UPDATE orders 
         SET status = :status, pickup_pin = :pin, total_amount = :total
         WHERE order_id = :oid AND pharmacy_id = :phid"
    );
    $stmt->execute([
        ':status' => $new_status,
        ':pin'    => $pin,
        ':total'  => $total_amount,
        ':oid'    => $order_id,
        ':phid'   => $pharmacist['pharmacy_id']
    ]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        die(json_encode(["status" => "error", "message" => "Order not found or unauthorized"]));
    }

    // Post bill message to order_messages chat
    if ($action === 'approve' && $bill_message) {
        $msg_stmt = $pdo->prepare(
            "INSERT INTO order_messages (order_id, sender_role, message, created_at)
             VALUES (:oid, 'pharmacist', :msg, NOW())"
        );
        $msg_stmt->execute([
            ':oid' => $order_id,
            ':msg' => $bill_message
        ]);
    }

    $pdo->commit();

    if ($action === 'approve') {
        echo json_encode([
            "status"       => "success",
            "message"      => "Payment verified. Bill generated and sent with pickup PIN.",
            "pin"          => $pin,
            "total_amount" => $total_amount
        ]);
    } else {
        echo json_encode([
            "status"  => "success",
            "message" => "Payment rejected. Order marked as rejected."
        ]);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
