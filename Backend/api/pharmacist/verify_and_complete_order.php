<?php
// pharmacist/verify_and_complete_order.php
// Unified endpoint: accepts 4-digit PIN OR PayHere ref ID
// Searches reservations AND orders, completes the found record.
// SECURITY: pickup_pin is NEVER returned to the pharmacist in any response.
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

$data      = json_decode(file_get_contents("php://input"), true);
$pin_input = isset($data['pin']) ? trim($data['pin']) : '';
$action    = isset($data['action']) ? trim($data['action']) : 'search'; // 'search' or 'complete'
$order_id  = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$order_type = isset($data['order_type']) ? trim($data['order_type']) : '';

if (empty($pin_input)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "PIN or reference is required"]);
    exit();
}

try {
    // Get pharmacist + pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "No pharmacy linked to this account"]);
        exit();
    }
    $pharmacy_id = (int)$pharmacist['pharmacy_id'];

    // ─────────────────────────────────────────────────────────────────
    // ACTION: COMPLETE — pharmacist clicked "Complete Order" on the popup
    // ─────────────────────────────────────────────────────────────────
    if ($action === 'complete') {
        if (!$order_id || empty($order_type)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "order_id and order_type required for completion"]);
            exit();
        }

        $pdo->beginTransaction();

        $items_to_deduct = [];

        if ($order_type === 'reservation') {
            // Verify PIN still matches (double check)
            $chk = $pdo->prepare("SELECT pickup_pin, status FROM reservations WHERE reservation_id = :rid AND pharmacy_id = :phid FOR UPDATE");
            $chk->execute([':rid' => $order_id, ':phid' => $pharmacy_id]);
            $rec = $chk->fetch();
            if (!$rec) { $pdo->rollBack(); http_response_code(404); echo json_encode(["status" => "error", "message" => "Reservation not found"]); exit(); }
            if ((string)$rec['pickup_pin'] !== $pin_input) { $pdo->rollBack(); http_response_code(400); echo json_encode(["status" => "error", "message" => "PIN mismatch — cannot complete"]); exit(); }

            $pdo->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid")
                ->execute([':rid' => $order_id]);
            $pdo->prepare("UPDATE orders SET status = 'completed' WHERE notes = :note AND pharmacy_id = :phid")
                ->execute([':note' => "Created from Reservation #$order_id", ':phid' => $pharmacy_id]);

            // Fetch items to deduct
            $items_stmt = $pdo->prepare("
                SELECT dpi.medicine_id, dpi.quantity as requested_quantity
                FROM digital_prescription_items dpi
                JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
                WHERE dp.reservation_id = :rid
            ");
            $items_stmt->execute([':rid' => $order_id]);
            $items_to_deduct = $items_stmt->fetchAll(PDO::FETCH_ASSOC);

        } elseif ($order_type === 'order') {
            $chk = $pdo->prepare("SELECT pickup_pin, status FROM orders WHERE order_id = :oid AND pharmacy_id = :phid FOR UPDATE");
            $chk->execute([':oid' => $order_id, ':phid' => $pharmacy_id]);
            $rec = $chk->fetch();
            if (!$rec) { $pdo->rollBack(); http_response_code(404); echo json_encode(["status" => "error", "message" => "Order not found"]); exit(); }
            if ((string)$rec['pickup_pin'] !== $pin_input) { $pdo->rollBack(); http_response_code(400); echo json_encode(["status" => "error", "message" => "PIN mismatch — cannot complete"]); exit(); }

            $pdo->prepare("UPDATE orders SET status = 'completed' WHERE order_id = :oid")
                ->execute([':oid' => $order_id]);
            // Also complete linked reservation if any
            if (preg_match('/Created from Reservation #(\d+)/', $rec['notes'] ?? '', $m)) {
                $pdo->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid")
                    ->execute([':rid' => (int)$m[1]]);
            }

            // Fetch items to deduct
            $items_stmt = $pdo->prepare("
                SELECT medicine_id, quantity as requested_quantity
                FROM order_items
                WHERE order_id = :oid
            ");
            $items_stmt->execute([':oid' => $order_id]);
            $items_to_deduct = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // --- DEDUCT STOCK LOGIC ---
        foreach ($items_to_deduct as $item) {
            $medicine_id = (int)$item['medicine_id'];
            $requested_qty = (int)$item['requested_quantity'];

            if ($requested_qty <= 0) continue;

            $batch_stmt = $pdo->prepare("
                 SELECT batch_id, quantity_in_stock 
                 FROM medicine_batches 
                 WHERE pharmacy_id = :phid 
                   AND medicine_id = :mid 
                   AND quantity_in_stock > 0 
                 ORDER BY expiry_date ASC 
                 FOR UPDATE
            ");
            $batch_stmt->execute([':phid' => $pharmacy_id, ':mid' => $medicine_id]);
            $batches = $batch_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $remaining_to_deduct = $requested_qty;

            foreach ($batches as $batch) {
                if ($remaining_to_deduct <= 0) break;

                $batch_id = $batch['batch_id'];
                $available_in_batch = (int)$batch['quantity_in_stock'];

                if ($available_in_batch <= $remaining_to_deduct) {
                    $pdo->prepare("UPDATE medicine_batches SET quantity_in_stock = 0 WHERE batch_id = :bid")
                        ->execute([':bid' => $batch_id]);
                    $remaining_to_deduct -= $available_in_batch;
                } else {
                    $pdo->prepare("UPDATE medicine_batches SET quantity_in_stock = quantity_in_stock - :deduct WHERE batch_id = :bid")
                        ->execute([':deduct' => $remaining_to_deduct, ':bid' => $batch_id]);
                    $remaining_to_deduct = 0;
                }
            }

            if ($remaining_to_deduct > 0) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Insufficient stock for medicine ID: {$medicine_id}. Short by: {$remaining_to_deduct}"]);
                exit();
            }

            $pdo->prepare("
                 UPDATE pharmacy_inventory 
                 SET stock_quantity = stock_quantity - :deducted 
                 WHERE pharmacy_id = :phid AND medicine_id = :mid
            ")->execute([':deducted' => $requested_qty, ':phid' => $pharmacy_id, ':mid' => $medicine_id]);
        }
        // --- END DEDUCT STOCK LOGIC ---

        // Update pickup_pins audit table if it exists
        try {
            $pdo->prepare("UPDATE pickup_pins SET is_verified = 1, verified_at = NOW() WHERE reservation_id = :rid AND pin_code = :pin")
                ->execute([':rid' => $order_id, ':pin' => $pin_input]);
        } catch (PDOException $e) { /* table may not exist */ }

        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Order completed successfully."]);
        exit();
    }

    // ─────────────────────────────────────────────────────────────────
    // ACTION: SEARCH — find the order by PIN/ref, return bill details
    // pickup_pin is STRIPPED from all response data
    // ─────────────────────────────────────────────────────────────────

    // Get pharmacy info for bill display
    $ph_info = $pdo->prepare("SELECT pharmacy_name, address, phone FROM pharmacies WHERE pharmacy_id = :phid");
    $ph_info->execute([':phid' => $pharmacy_id]);
    $pharmacy_info = $ph_info->fetch(PDO::FETCH_ASSOC);

    // 1. Search reservations by pickup_pin
    $stmt1 = $pdo->prepare("
        SELECT r.reservation_id AS id, 'reservation' AS type, r.status, r.payment_status,
               r.total_amount, r.amount_paid, r.created_at, r.prescription_url,
               u.full_name AS patient_name, u.email AS patient_email,
               COALESCE(p.phone_number, u.phone, '') AS patient_phone
        FROM reservations r
        JOIN patients p ON r.patient_id = p.patient_id
        JOIN users u ON p.user_id = u.user_id
        WHERE r.pickup_pin = :pin AND r.pharmacy_id = :phid
          AND r.status IN ('paid', 'advance_paid', 'pending_pickup', 'bill_generated', 'Reserved')
        LIMIT 1
    ");
    $stmt1->execute([':pin' => $pin_input, ':phid' => $pharmacy_id]);
    $result = $stmt1->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        // Fetch items — NEVER include pickup_pin in response
        $items_stmt = $pdo->prepare("
            SELECT dpi.quantity, dpi.unit_price, m.brand_name, m.generic_name,
                   (dpi.quantity * dpi.unit_price) AS line_total
            FROM digital_prescription_items dpi
            JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
            JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
            WHERE dp.reservation_id = :rid
        ");
        $items_stmt->execute([':rid' => $result['id']]);
        $result['items']            = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['pharmacy_name']    = $pharmacy_info['pharmacy_name'] ?? 'Pharmacy';
        $result['pharmacy_address'] = $pharmacy_info['address'] ?? '';
        $result['pharmacy_phone']   = $pharmacy_info['phone'] ?? '';
        // DO NOT include pickup_pin in response
        unset($result['pickup_pin']);

        echo json_encode(["status" => "success", "data" => $result]);
        exit();
    }

    // 2. Search orders by pickup_pin
    $stmt2 = $pdo->prepare("
        SELECT o.order_id AS id, 'order' AS type, o.status, 'Paid' AS payment_status,
               o.total_amount, o.total_amount AS amount_paid, o.created_at,
               u.full_name AS patient_name, u.email AS patient_email,
               COALESCE(p.phone_number, u.phone, '') AS patient_phone
        FROM orders o
        JOIN users u ON o.patient_id = u.user_id
        LEFT JOIN patients p ON u.user_id = p.user_id
        WHERE o.pickup_pin = :pin AND o.pharmacy_id = :phid
          AND o.status IN ('Reserved', 'pending_pickup', 'Paid')
        LIMIT 1
    ");
    $stmt2->execute([':pin' => $pin_input, ':phid' => $pharmacy_id]);
    $result = $stmt2->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        $items_stmt = $pdo->prepare("
            SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name,
                   (oi.quantity * oi.unit_price) AS line_total
            FROM order_items oi
            JOIN master_medicines m ON oi.medicine_id = m.medicine_id
            WHERE oi.order_id = :oid
        ");
        $items_stmt->execute([':oid' => $result['id']]);
        $result['items']            = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
        $result['pharmacy_name']    = $pharmacy_info['pharmacy_name'] ?? 'Pharmacy';
        $result['pharmacy_address'] = $pharmacy_info['address'] ?? '';
        $result['pharmacy_phone']   = $pharmacy_info['phone'] ?? '';
        unset($result['pickup_pin']);

        echo json_encode(["status" => "success", "data" => $result]);
        exit();
    }

    // 3. Search by PayHere reference ID (payments table)
    try {
        $stmt3 = $pdo->prepare("
            SELECT py.order_id, py.payhere_ref_id, py.amount, py.status AS payment_status,
                   o.status, o.total_amount, o.created_at, o.pharmacy_id,
                   u.full_name AS patient_name, u.email AS patient_email,
                   COALESCE(p.phone_number, u.phone, '') AS patient_phone
            FROM payments py
            JOIN orders o ON py.order_id = o.order_id
            JOIN users u ON o.patient_id = u.user_id
            LEFT JOIN patients p ON u.user_id = p.user_id
            WHERE py.payhere_ref_id = :ref AND o.pharmacy_id = :phid
              AND o.status NOT IN ('completed', 'cancelled')
            LIMIT 1
        ");
        $stmt3->execute([':ref' => $pin_input, ':phid' => $pharmacy_id]);
        $payhere_result = $stmt3->fetch(PDO::FETCH_ASSOC);

        if ($payhere_result) {
            $items_stmt = $pdo->prepare("
                SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name,
                       (oi.quantity * oi.unit_price) AS line_total
                FROM order_items oi
                JOIN master_medicines m ON oi.medicine_id = m.medicine_id
                WHERE oi.order_id = :oid
            ");
            $items_stmt->execute([':oid' => $payhere_result['order_id']]);
            $items = $items_stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["status" => "success", "data" => [
                'id'               => $payhere_result['order_id'],
                'type'             => 'order',
                'status'           => $payhere_result['status'],
                'payment_status'   => 'online_paid',
                'total_amount'     => $payhere_result['total_amount'],
                'created_at'       => $payhere_result['created_at'],
                'patient_name'     => $payhere_result['patient_name'],
                'patient_email'    => $payhere_result['patient_email'],
                'patient_phone'    => $payhere_result['patient_phone'],
                'payhere_ref'      => $payhere_result['payhere_ref_id'],
                'items'            => $items,
                'pharmacy_name'    => $pharmacy_info['pharmacy_name'] ?? 'Pharmacy',
                'pharmacy_address' => $pharmacy_info['address'] ?? '',
                'pharmacy_phone'   => $pharmacy_info['phone'] ?? '',
            ]]);
            exit();
        }
    } catch (PDOException $e) {
        // payments table may not have payhere_ref_id column yet — fall through
        error_log("PayHere search failed: " . $e->getMessage());
    }

    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "No active order found with this PIN or reference."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
