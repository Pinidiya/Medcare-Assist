<?php
// patient/reject_reservation.php
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
        SELECT status 
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

    // Update reservation status to 'rejected'
    $up_stmt = $pdo->prepare("
        UPDATE reservations 
        SET status = 'rejected' 
        WHERE reservation_id = :rid
    ");
    $up_stmt->execute([':rid' => $reservation_id]);

    // Post system message to the chat session
    $sys_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'patient', :msg, NOW())"
    );
    $sys_msg = "❌ [SYSTEM MESSAGE]: Patient has rejected the digital bill quotation. The reservation status is now updated to 'rejected'.";
    $sys_stmt->execute([
        ':rid' => $reservation_id,
        ':sid' => $_SESSION['user_id'],
        ':msg' => $sys_msg
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Reservation has been successfully rejected"
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
