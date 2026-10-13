<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/Feedback.php';

try {
    $feedbacks = Feedback::getApproved();
    
    // Limit to 10 and map full_name to patient_name for the frontend
    $limited = array_slice($feedbacks, 0, 10);
    $formatted = array_map(function($f) {
        $f['patient_name'] = $f['full_name'];
        unset($f['full_name']);
        return $f;
    }, $limited);
    
    echo json_encode(["status" => "success", "data" => $formatted]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to fetch feedbacks: " . $e->getMessage()]);
}
?>
