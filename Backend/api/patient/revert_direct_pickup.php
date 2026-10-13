<?php
// backend/api/patient/revert_direct_pickup.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->reservation_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing reservation_id"]);
    exit();
}

$reservation_id = (int)$data->reservation_id;
$user_id = $_SESSION['user_id'];

try {
    // Get patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $user_id]);
    $patient = $p_stmt->fetch();
    if (!$patient) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Patient record not found"]);
        exit();
    }
    $patient_id = $patient['patient_id'];

    // Verify reservation belongs to patient and is in pending_pickup status
    $check = $pdo->prepare("SELECT status FROM reservations WHERE reservation_id = :rid AND patient_id = :pid");
    $check->execute([':rid' => $reservation_id, ':pid' => $patient_id]);
    $res = $check->fetch();

    if (!$res) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if ($res['status'] !== 'pending_pickup') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Can only revert from pending_pickup status"]);
        exit();
    }

    // Revert status to bill_generated
    $update = $pdo->prepare("UPDATE reservations SET status = 'bill_generated' WHERE reservation_id = :rid");
    $update->execute([':rid' => $reservation_id]);

    echo json_encode([
        "status" => "success",
        "message" => "Reservation reverted to bill_generated successfully"
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
