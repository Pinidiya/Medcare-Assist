<?php
// pharmacist/delete_prescription.php
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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->prescription_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "prescription_id is required"]);
    exit();
}

$reservation_id = (int)$data->prescription_id;
$user_id = (int)$_SESSION['user_id'];

try {
    // SECURITY: Ensure pharmacist can only delete reservations for their pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $user_id]);
    $pharmacist = $ph_stmt->fetch();
    
    if (!$pharmacist) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Pharmacist profile not found"]));
    }

    $stmt = $pdo->prepare("DELETE FROM reservations WHERE reservation_id = :id AND pharmacy_id = :phid");
    $stmt->execute([
        ':id' => $reservation_id,
        ':phid' => $pharmacist['pharmacy_id']
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status"  => "success",
            "message" => "Prescription deleted successfully"
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Prescription not found, already deleted, or unauthorized"
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to delete: " . $e->getMessage()]);
}
?>
