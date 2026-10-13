<?php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';
require_once '../../services/PickupVerificationService.php';

// --- Main Execution ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$pin = isset($data['pin']) ? trim($data['pin']) : '';

try {
    $service = new PickupVerificationService($pdo, $_SESSION['user_id']);
    $result = $service->searchOrder($pin);
    echo json_encode(["status" => "success", "data" => $result]);
} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    if ($code !== 200) {
        http_response_code($code);
    }
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
