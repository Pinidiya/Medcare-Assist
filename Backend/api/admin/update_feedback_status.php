<?php
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/Feedback.php';

$data = json_decode(file_get_contents("php://input"), true);
$feedback_id = isset($data['feedback_id']) ? (int)$data['feedback_id'] : 0;
$status = isset($data['status']) ? $data['status'] : '';

if (empty($feedback_id) || !in_array($status, ['approved', 'rejected', 'pending'], true)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid parameters"]);
    exit();
}

try {
    $feedback = Feedback::findById($feedback_id);
    if (!$feedback) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Feedback not found"]);
        exit();
    }
    
    $feedback->updateStatus($status);
    
    echo json_encode(["status" => "success", "message" => "Feedback status updated to " . htmlspecialchars($status)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update feedback status: " . $e->getMessage()]);
}
?>
