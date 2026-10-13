<?php
// patient/delete_reservation.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);
$reservation_id = $data['reservation_id'] ?? null;

if (!$reservation_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Reservation ID required"]);
    exit();
}

try {
    // Add column if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN is_deleted_by_patient TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) {
        // Column likely already exists, ignore
    }

    // Get patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    // Soft delete the reservation for the patient
    $stmt = $pdo->prepare("UPDATE reservations SET is_deleted_by_patient = 1 WHERE reservation_id = :rid AND patient_id = :pid");
    $stmt->execute([
        ':rid' => $reservation_id,
        ':pid' => $patient['patient_id']
    ]);

    echo json_encode(["status" => "success", "message" => "Reservation deleted from dashboard"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
