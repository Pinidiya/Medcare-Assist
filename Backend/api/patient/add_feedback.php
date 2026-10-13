<?php
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/Feedback.php';

$data = json_decode(file_get_contents("php://input"), true);
$rating = isset($data['rating']) ? (int)$data['rating'] : 5;
$feedback_text = isset($data['feedback_text']) ? trim($data['feedback_text']) : '';
$user_id = $_SESSION['user_id'];

if (empty($feedback_text)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Feedback text is required"]);
    exit();
}

try {
    Feedback::create($user_id, $rating, $feedback_text);
    
    echo json_encode(["status" => "success", "message" => "Feedback submitted successfully"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to submit feedback: " . $e->getMessage()]);
}
?>
