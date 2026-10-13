<?php
// payment/payhere_notify.php
session_start();
require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

// Retrieve POST parameters from PayHere
$merchant_id = isset($_POST['merchant_id']) ? $_POST['merchant_id'] : '';
$order_id = isset($_POST['order_id']) ? (int)$_POST['order_id'] : 0; // reservation_id
$payhere_amount = isset($_POST['payhere_amount']) ? $_POST['payhere_amount'] : '';
$payhere_currency = isset($_POST['payhere_currency']) ? $_POST['payhere_currency'] : '';
$status_code = isset($_POST['status_code']) ? $_POST['status_code'] : '';
$md5sig = isset($_POST['md5sig']) ? $_POST['md5sig'] : '';

require_once '../../config/load_env.php';
$merchant_secret = getenv('PAYHERE_MERCHANT_SECRET') ?: "NTc1NzYyNzc5MjU3NDY4MTI5OTI4OTA2OTE3ODQ3NTI3NTg2OTQ="; // Match sandbox key

error_log("PayHere Webhook Hit: Order ID " . $order_id . ", Status: " . $status_code);

// Validate MD5 signature
$local_md5sig = strtoupper(
    md5(
        $merchant_id . 
        $order_id . 
        $payhere_amount . 
        $payhere_currency . 
        $status_code . 
        strtoupper(md5($merchant_secret))
    )
);

if ($local_md5sig !== $md5sig) {
    error_log("PayHere Error: MD5 mismatch. Local: $local_md5sig, Received: $md5sig");
    http_response_code(400);
    echo "MD5 signature mismatch";
    exit();
}

if ($status_code != 2) {
    error_log("PayHere: Status Code $status_code (Not Success) for Order " . $order_id);
    echo "Payment status not success";
    exit();
}

try {
    $pdo->beginTransaction();

    // 1. Fetch Reservation
    $res_stmt = $pdo->prepare("
        SELECT r.reservation_id, r.patient_id, r.pharmacy_id, r.total_amount, r.pickup_pin, r.pharmacist_note,
               p.user_id AS patient_user_id
        FROM reservations r
        JOIN patients p ON r.patient_id = p.patient_id
        WHERE r.reservation_id = :rid FOR UPDATE
    ");
    $res_stmt->execute([':rid' => $order_id]);
    $reservation = $res_stmt->fetch();

    if (!$reservation) {
        error_log("PayHere Error: Reservation $order_id not found or missing pharmacist/quote");
        $pdo->rollBack();
        http_response_code(404);
        echo "Reservation not found";
        exit();
    }
    
    error_log("PayHere: Found Reservation $order_id, Total: " . $reservation['total_amount']);

    // 2. Update Reservation Status
    $up_res = $pdo->prepare("
        UPDATE reservations 
        SET status = 'paid', payment_status = 'paid', amount_paid = :amt 
        WHERE reservation_id = :rid
    ");
    $up_res->execute([
        ':amt' => $reservation['total_amount'],
        ':rid' => $order_id
    ]);

    // 3. Check if corresponding Order already exists (avoid duplicates)
    $check_stmt = $pdo->prepare("SELECT order_id FROM orders WHERE notes = :note LIMIT 1");
    $note_identifier = "Created from Reservation #" . $order_id;
    $check_stmt->execute([':note' => $note_identifier]);
    $existing_order = $check_stmt->fetch();

    $new_order_id = 0;
    if (!$existing_order) {
        // 4. Create Order record
        $ins_ord = $pdo->prepare("
            INSERT INTO orders (patient_id, pharmacy_id, prescription_id, pickup_pin, status, total_amount, notes, created_at, updated_at)
            VALUES (:pid, :phid, NULL, :pin, 'Reserved', :total, :notes, NOW(), NOW())
        ");
        $ins_ord->execute([
            ':pid'    => $reservation['patient_user_id'],
            ':phid'   => $reservation['pharmacy_id'],
            ':pin'    => $reservation['pickup_pin'],
            ':total'  => $reservation['total_amount'],
            ':notes'  => $note_identifier
        ]);
        $new_order_id = $pdo->lastInsertId();

        // 5. Fetch digital prescription itemso
        $items_stmt = $pdo->prepare("
            SELECT dpi.medicine_id, dpi.quantity, dpi.unit_price, mm.brand_name
            FROM digital_prescription_items dpi
            JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
            JOIN master_medicines mm ON dpi.medicine_id = mm.medicine_id
            WHERE dp.reservation_id = :rid
        ");
        $items_stmt->execute([':rid' => $order_id]);
        $items = $items_stmt->fetchAll();

        // 6. Copy items to order_items
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
        $items_stmt->execute([':rid' => $order_id]);
        $items = $items_stmt->fetchAll();
    }

    // 7. Get Pharmacy details
    $ph_stmt = $pdo->prepare("SELECT pharmacy_name FROM pharmacies WHERE pharmacy_id = :phid");
    $ph_stmt->execute([':phid' => $reservation['pharmacy_id']]);
    $ph_row = $ph_stmt->fetch();
    $pharmacy_name = $ph_row ? $ph_row['pharmacy_name'] : 'Pharmacy';

    // 8. Format confirmation message
    $items_lines = [];
    foreach ($items as $item) {
        $line_total = $item['quantity'] * $item['unit_price'];
        $items_lines[] = "  {$item['brand_name']}  x{$item['quantity']}  —  Rs. " . number_format($line_total, 2, '.', ',');
    }
    $items_text = implode("\n", $items_lines);

    $sys_msg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "✅ BILL CONFIRMED — {$pharmacy_name}\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Order #{$new_order_id} (Reservation #{$order_id})\n"
             . "Date: " . date('d M Y, h:i A') . "\n\n"
             . "Confirmed Items:\n{$items_text}\n\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
             . "Total Paid/Reserved: LKR " . number_format($reservation['total_amount'], 2, '.', ',') . "\n"
             . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
             . "🔐 Verification PIN: {$reservation['pickup_pin']}\n\n"
             . "Please present this PIN at the pharmacy counter to collect your medicines.";

    // 9. Send message to patient chat (system/pharmacist message)
    $sys_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'pharmacist', :msg, NOW())"
    );
    // Default to 1 ( Kamall Perera)
    $sid = 1;
    $sys_stmt->execute([
        ':rid' => $order_id,
        ':sid' => $sid,
        ':msg' => $sys_msg
    ]);

    error_log("PayHere: Successfully completed webhook for Order $order_id");

    $pdo->commit();
    echo "success";

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo "Database error: " . $e->getMessage();
}
?>
