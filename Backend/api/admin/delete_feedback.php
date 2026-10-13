<?php
// delete_feedback.php - Admin
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/Feedback.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'));
if (!isset($data->feedback_id)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Feedback ID required']);
    exit();
}

try {
    Feedback::delete((int)$data->feedback_id);

    echo json_encode([
        'status' => 'success',
        'message' => 'Feedback deleted successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
