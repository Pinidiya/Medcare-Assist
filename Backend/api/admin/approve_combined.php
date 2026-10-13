<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check the session role

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method not allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->pharmacy_id) || !isset($data->action)) {
    http_response_code(400); // Bad request because data is missing
    echo json_encode(["status" => "error", "message" => "pharmacy_id and action are required"]);
    exit();
}

$pharmacy_id = (int)$data->pharmacy_id;

$action = trim($data->action);

if ($action !== 'approve' && $action !== 'reject') {
    http_response_code(400); // Bad request
    echo json_encode(["status" => "error", "message" => "Action must be 'approve' or 'reject'"]);
    exit();
}

try {
    // Call the Admin model function to process the approval/rejection
    $result = Admin::approveCombined($pharmacy_id, $action);

    if ($result['status'] == false) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit(); 
    }
    
    echo json_encode([
        "status"  => "success",
        "message" => $result['message']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
