<?php
// shared/get_reservation_chat.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

// Verify session role

$reservation_id = isset($_GET['reservation_id']) ? (int)$_GET['reservation_id'] : 0;
if (!$reservation_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "reservation_id is required"]);
    exit();
}

try {
    // 1. Fetch reservation to check authorization
    $res_stmt = $pdo->prepare(
        "SELECT patient_id, pharmacy_id, assigned_pharmacist_id, status, payment_status, total_amount, created_at, prescription_url
         FROM reservations WHERE reservation_id = :rid"
    );
    $res_stmt->execute([':rid' => $reservation_id]);
    $reservation = $res_stmt->fetch();

    if (!$reservation) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    // 2. Perform Authorization Checks
    if ($_SESSION['role'] === 'patient') {
        // Find patient's patient_id
        $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
        $p_stmt->execute([':uid' => $_SESSION['user_id']]);
        $patient = $p_stmt->fetch();
        
        if (!$patient || (int)$patient['patient_id'] !== (int)$reservation['patient_id']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You are not authorized to view this chat"]);
            exit();
        }
    } else if ($_SESSION['role'] === 'pharmacist' || $_SESSION['role'] === 'pharmacy_owner') {
        // Find pharmacist's or owner's pharmacy_id
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid1 UNION SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid2 LIMIT 1");
        $ph_stmt->execute([':uid1' => $_SESSION['user_id'], ':uid2' => $_SESSION['user_id']]);
        $pharmacist = $ph_stmt->fetch();

        if (!$pharmacist || (int)$pharmacist['pharmacy_id'] !== (int)$reservation['pharmacy_id']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You are not authorized to view this chat"]);
            exit();
        }
    } else {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Role not authorized"]);
        exit();
    }

    // 3. Mark unread messages from the OTHER party as read (unless no_mark_read is set)
    $no_mark_read = isset($_GET['no_mark_read']) && $_GET['no_mark_read'] === 'true';
    if (!$no_mark_read) {
        $opposite_role = ($_SESSION['role'] === 'patient') ? 'pharmacist' : 'patient';
        $mark_stmt = $pdo->prepare(
            "UPDATE reservation_chats 
             SET is_read = 1 
             WHERE reservation_id = :rid 
               AND sender_role = :opp_role 
               AND is_read = 0"
        );
        $mark_stmt->execute([':rid' => $reservation_id, ':opp_role' => $opposite_role]);
    }

    // 4. Get Chat Messages
    $msg_stmt = $pdo->prepare(
        "SELECT rc.message_id, rc.sender_id, rc.sender_role, rc.message_text, rc.created_at, rc.is_read,
                u.full_name AS sender_name
         FROM reservation_chats rc
         JOIN users u ON rc.sender_id = u.user_id
         WHERE rc.reservation_id = :rid
         ORDER BY rc.created_at ASC"
    );
    $msg_stmt->execute([':rid' => $reservation_id]);
    $messages = $msg_stmt->fetchAll();

    // 4. Get Digital Prescription Quote Details if status is Quoted/Reserved/Completed
    $quote = null;
    $dp_stmt = $pdo->prepare(
        "SELECT dp.digital_prescription_id, dp.total_amount, dp.created_at
         FROM digital_prescriptions dp
         WHERE dp.reservation_id = :rid LIMIT 1"
    );
    $dp_stmt->execute([':rid' => $reservation_id]);
    $dp = $dp_stmt->fetch();

    if ($dp) {
        $items_stmt = $pdo->prepare(
            "SELECT dpi.item_id, dpi.quantity, dpi.unit_price,
                    mm.medicine_id, mm.brand_name, mm.generic_name, mm.category
             FROM digital_prescription_items dpi
             JOIN master_medicines mm ON dpi.medicine_id = mm.medicine_id
             WHERE dpi.digital_prescription_id = :dpid"
        );
        $items_stmt->execute([':dpid' => $dp['digital_prescription_id']]);
        $items = $items_stmt->fetchAll();

        $quote = [
            "digital_prescription_id" => (int)$dp['digital_prescription_id'],
            "total_amount"            => (float)$dp['total_amount'],
            "created_at"              => $dp['created_at'],
            "items"                   => $items
        ];
    }

    // Also get patient profile details & pharmacy details for chat header context
    $details_stmt = $pdo->prepare(
        "SELECT r.reservation_id, r.status, r.payment_status, r.total_amount, r.pharmacist_note, r.pickup_pin,
                r.created_at, r.prescription_url,
                u_pat.full_name AS patient_name,
                COALESCE(p.phone_number, u_pat.phone, '') AS patient_phone,
                COALESCE(p.age, u_pat.age, NULL) AS patient_age,
                COALESCE(p.address, '') AS patient_location,
                u_ph.full_name AS pharmacist_name,
                ph.pharmacy_name, ph.latitude, ph.longitude
         FROM reservations r
         JOIN patients p ON r.patient_id = p.patient_id
         JOIN users u_pat ON p.user_id = u_pat.user_id
         JOIN pharmacies ph ON r.pharmacy_id = ph.pharmacy_id
         LEFT JOIN pharmacists ph_user ON r.assigned_pharmacist_id = ph_user.pharmacist_id
         LEFT JOIN users u_ph ON ph_user.user_id = u_ph.user_id
         WHERE r.reservation_id = :rid"
    );
    $details_stmt->execute([':rid' => $reservation_id]);
    $header_context = $details_stmt->fetch();

    // SECURITY: Strip pickup_pin from context before sending to pharmacist
    if ($_SESSION['role'] === 'pharmacist' && isset($header_context['pickup_pin'])) {
        unset($header_context['pickup_pin']);
    }

    echo json_encode([
        "status"   => "success",
        "context"  => $header_context,
        "messages" => $messages,
        "quote"    => $quote
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
