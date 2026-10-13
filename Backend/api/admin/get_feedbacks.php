<?php
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/Feedback.php';

try {
    $feedbacks = Feedback::getAll();
    
    // Map properties for frontend compatibility
    $formatted = array_map(function($f) {
        $f['patient_name'] = $f['full_name'];
        $f['patient_email'] = $f['email'];
        unset($f['full_name'], $f['email']);
        return $f;
    }, $feedbacks);
    
    echo json_encode(["status" => "success", "data" => $formatted]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to fetch feedbacks: " . $e->getMessage()]);
}
?>
