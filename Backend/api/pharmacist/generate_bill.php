<?php
// pharmacist/generate_bill.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

// Verify pharmacist session

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['reservation_id']) || !isset($data['items']) || !is_array($data['items'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "reservation_id and items array are required"]);
    exit();
}

$reservation_id = (int)$data['reservation_id'];
$items          = $data['items'];
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

    $pharmacist_id = (int)$pharmacist['pharmacist_id'];
    $pharmacy_id   = (int)$pharmacist['pharmacy_id'];

    // Retrieve reservation for verification
    $res_stmt = $pdo->prepare(
        "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid FOR UPDATE"
    );
    
    $pdo->beginTransaction();
    $res_stmt->execute([':rid' => $reservation_id]);
    $reservation = $res_stmt->fetch();

    if (!$reservation) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if ((int)$reservation['pharmacy_id'] !== $pharmacy_id) {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Reservation does not belong to your pharmacy"]);
        exit();
    }

    if ($reservation['assigned_pharmacist_id'] === null || (int)$reservation['assigned_pharmacist_id'] !== $pharmacist_id) {
        // Automatically assign it to this pharmacist to avoid blocking the bill generation
        $assign_stmt = $pdo->prepare("UPDATE reservations SET assigned_pharmacist_id = :phmid WHERE reservation_id = :rid");
        $assign_stmt->execute([':phmid' => $pharmacist_id, ':rid' => $reservation_id]);
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
            'unit_price'  => $price
        ];
    }

    // 1. Delete any existing digital prescriptions for this reservation (cascade will delete items)
    $del_stmt = $pdo->prepare("DELETE FROM digital_prescriptions WHERE reservation_id = :rid");
    $del_stmt->execute([':rid' => $reservation_id]);

    // 2. Insert new digital prescription
    $ins_dp = $pdo->prepare(
        "INSERT INTO digital_prescriptions (reservation_id, pharmacist_id, total_amount, created_at)
         VALUES (:rid, :phmid, :total, NOW())"
    );
    $ins_dp->execute([
        ':rid'   => $reservation_id,
        ':phmid' => $pharmacist_id,
        ':total' => $total_amount
    ]);
    $digital_prescription_id = $pdo->lastInsertId();

    // 3. Insert items
    $ins_item = $pdo->prepare(
        "INSERT INTO digital_prescription_items (digital_prescription_id, medicine_id, quantity, unit_price)
         VALUES (:dpid, :mid, :qty, :price)"
    );
    foreach ($validated_items as $v_item) {
        $ins_item->execute([
            ':dpid'  => $digital_prescription_id,
            ':mid'   => $v_item['medicine_id'],
            ':qty'   => $v_item['quantity'],
            ':price' => $v_item['unit_price']
        ]);
    }

    // 4. Get pharmacy name for the bill message
    $ph_stmt = $pdo->prepare("SELECT pharmacy_name FROM pharmacies WHERE pharmacy_id = :phid");
    $ph_stmt->execute([':phid' => $pharmacy_id]);
    $pharmacy_row = $ph_stmt->fetch();
    $pharmacy_name = $pharmacy_row ? $pharmacy_row['pharmacy_name'] : 'Pharmacy';

    // 5. Generate a 4-digit pickup PIN
    $pickup_pin = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

    // 6. Update reservations: total, status, note, and pickup_pin
    $up_res = $pdo->prepare(
        "UPDATE reservations SET total_amount = :total, status = 'bill_generated', pharmacist_note = :note, pickup_pin = :pin WHERE reservation_id = :rid"
    );
    $up_res->execute([
        ':total' => $total_amount,
        ':note'  => $pharmacist_note,
        ':pin'   => $pickup_pin,
        ':rid'   => $reservation_id
    ]);

    // 6b. Save PIN to pickup_pins table for audit trail
    try {
        $ins_pin = $pdo->prepare(
            "INSERT INTO pickup_pins (reservation_id, pharmacy_id, pin_code, total_amount, generated_by, created_at)
             VALUES (:rid, :phid, :pin, :total, :uid, NOW())"
        );
        $ins_pin->execute([
            ':rid'   => $reservation_id,
            ':phid'  => $pharmacy_id,
            ':pin'   => $pickup_pin,
            ':total' => $total_amount,
            ':uid'   => $_SESSION['user_id']
        ]);
    } catch (PDOException $e) {
        // pickup_pins table may not exist yet - log but don't fail the bill generation
        error_log("Failed to save PIN to pickup_pins: " . $e->getMessage());
    }

    // 7. Build itemized list for the formatted bill message
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

    // 8. Post formatted bill message to chat
    $sys_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'pharmacist', :msg, NOW())"
    );

    $note_line = $pharmacist_note ? "\n📝 Note: {$pharmacist_note}\n" : "";
    $sys_msg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "📋  BILL — {$pharmacy_name}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Reservation #{$reservation_id}\n"
             . "Date: " . date('d M Y, h:i A') . "\n\n"
             . "Items:\n{$items_text}\n"
             . "{$note_line}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Total:  LKR {$formatted_total}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
             . "Please review this bill. If you accept, click 'Confirm Pickup' — your secure Pickup PIN will be shown only on your screen to present at the pharmacy counter.";

    $sys_stmt->execute([
        ':rid' => $reservation_id,
        ':sid' => $_SESSION['user_id'],
        ':msg' => $sys_msg
    ]);

    $pdo->commit();

    echo json_encode([
        "status"                  => "success",
        "message"                 => "Bill compiled and sent to patient. Status updated to bill_generated.",
        "digital_prescription_id" => $digital_prescription_id,
        "total_amount"            => $total_amount,
        // pickup_pin intentionally NOT returned — patient receives it when they confirm pickup
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
