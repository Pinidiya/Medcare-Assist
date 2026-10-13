<?php
// patient/direct_pickup.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

// Verify patient session

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->reservation_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Reservation ID is required"]);
    exit();
}

$reservation_id = (int)$data->reservation_id;

try {
    // Get patient's patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();

    if (!$patient) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Patient record not found"]);
        exit();
    }

    $patient_id = (int)$patient['patient_id'];

    $pdo->beginTransaction();

    // Verify reservation belongs to patient and is in 'bill_generated' status
    $stmt = $pdo->prepare("
        SELECT status, pharmacy_id, total_amount, pickup_pin, pharmacist_note
        FROM reservations 
        WHERE reservation_id = :rid AND patient_id = :pid
    ");
    $stmt->execute([':rid' => $reservation_id, ':pid' => $patient_id]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if ($reservation['status'] !== 'bill_generated') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Reservation is not in bill_generated status"]);
        exit();
    }

    // Update reservation status to 'pending_pickup'
    $up_stmt = $pdo->prepare("
        UPDATE reservations 
        SET status = 'pending_pickup' 
        WHERE reservation_id = :rid
    ");
    $up_stmt->execute([':rid' => $reservation_id]);

    // Check if corresponding Order already exists (avoid duplicates)
    $check_stmt = $pdo->prepare("SELECT order_id FROM orders WHERE notes = :note LIMIT 1");
    $note_identifier = "Created from Reservation #" . $reservation_id;
    $check_stmt->execute([':note' => $note_identifier]);
    $existing_order = $check_stmt->fetch();

    $new_order_id = 0;
    if (!$existing_order) {
        // Create Order record
        $ins_ord = $pdo->prepare("
            INSERT INTO orders (patient_id, pharmacy_id, prescription_id, pickup_pin, status, total_amount, notes, created_at, updated_at)
            VALUES (:pid, :phid, NULL, :pin, 'Reserved', :total, :notes, NOW(), NOW())
        ");
        $ins_ord->execute([
            ':pid'    => $_SESSION['user_id'],
            ':phid'   => $reservation['pharmacy_id'],
            ':pin'    => $reservation['pickup_pin'],
            ':total'  => $reservation['total_amount'],
            ':notes'  => $note_identifier
        ]);
        $new_order_id = $pdo->lastInsertId();

        // Fetch digital prescription items
        $items_stmt = $pdo->prepare("
            SELECT dpi.medicine_id, dpi.quantity, dpi.unit_price, mm.brand_name
            FROM digital_prescription_items dpi
            JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
            JOIN master_medicines mm ON dpi.medicine_id = mm.medicine_id
            WHERE dp.reservation_id = :rid
        ");
        $items_stmt->execute([':rid' => $reservation_id]);
        $items = $items_stmt->fetchAll();

        // Copy items to order_items
        $ins_item = $pdo->prepare("
            INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
            VALUES (:oid, :mid, :qty, :price, 'prescribed')
        ");
        foreach ($items as $item) {
            $ins_item->execute([
                ':oid'   => $new_order_id,
                ':mid'   => $item['medicine_id'],
                ':qty'   => $item['quantity'],
                ':price' => $item['unit_price']
            ]);
        }
    } else {
        $new_order_id = $existing_order['order_id'];
        
        // Fetch items for messaging
        $items_stmt = $pdo->prepare("
            SELECT dpi.medicine_id, dpi.quantity, dpi.unit_price, mm.brand_name
            FROM digital_prescription_items dpi
            JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
            JOIN master_medicines mm ON dpi.medicine_id = mm.medicine_id
            WHERE dp.reservation_id = :rid
        ");
        $items_stmt->execute([':rid' => $reservation_id]);
        $items = $items_stmt->fetchAll();
    }

    // Get Pharmacy details
    $ph_stmt = $pdo->prepare("SELECT pharmacy_name FROM pharmacies WHERE pharmacy_id = :phid");
    $ph_stmt->execute([':phid' => $reservation['pharmacy_id']]);
    $ph_row = $ph_stmt->fetch();
    $pharmacy_name = $ph_row ? $ph_row['pharmacy_name'] : 'Pharmacy';

    // Format confirmation message
    $items_lines = [];
    foreach ($items as $item) {
        $line_total = $item['quantity'] * $item['unit_price'];
        $items_lines[] = "  {$item['brand_name']}  x{$item['quantity']}  —  Rs. " . number_format($line_total, 2, '.', ',');
    }
    $items_text = implode("\n", $items_lines);

    $sys_msg_bill = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                  . "✅ ORDER CONFIRMED — {$pharmacy_name}\n"
                  . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                  . "Order #{$new_order_id} (Reservation #{$reservation_id})\n"
                  . "Date: " . date('d M Y, h:i A') . "\n\n"
                  . "Confirmed Items:\n{$items_text}\n\n"
                  . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                  . "Total Amount: LKR " . number_format($reservation['total_amount'], 2, '.', ',') . "\n"
                  . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                  . "🔒 Method: Direct Pickup\n"
                  . "Your secure Pickup PIN is shown only on your screen. Please present it verbally at the pharmacy counter.";

    // Post system message to the chat session
    $sys_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'patient', :msg, NOW())"
    );
    $sys_msg = "🚶‍♂️ [SYSTEM MESSAGE]: Patient has opted for 'Direct Pickup'. The status is now updated to 'pending_pickup'. The patient is travelling to the pharmacy for pickup.";
    $sys_stmt->execute([
        ':rid' => $reservation_id,
        ':sid' => $_SESSION['user_id'],
        ':msg' => $sys_msg
    ]);

    // Send confirmation bill message to patient chat (as pharmacist sender)
    $sys_stmt2 = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'pharmacist', :msg, NOW())"
    );
    $sys_stmt2->execute([
        ':rid' => $reservation_id,
        ':sid' => 1, // Default pharmacist user
        ':msg' => $sys_msg_bill
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Direct pickup selected and order created successfully"
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
