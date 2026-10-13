<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check if the current user is an admin

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->request_id) || !isset($data->action)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "request_id and action are required"]);
    exit();
}

$request_id = (int)$data->request_id;
$action = trim($data->action);

if (isset($data->admin_notes)) {
    $admin_notes = trim($data->admin_notes);
} else {
    $admin_notes = null;
}

$admin_id = (int)$_SESSION['user_id'];

if ($action !== 'approve' && $action !== 'reject') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Action must be 'approve' or 'reject'"]);
    exit();
}

try {
    // Use the Admin model to update the medicine request
    $result = Admin::approveMedicineRequest($request_id, $action, $admin_notes, $admin_id);
    
    if ($result['status'] == false) {
        http_response_code(404); // Not Found
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit();
    }

    $response = [
        "status"  => "success",
        "message" => $result['message']
    ];
    
    if (isset($result['medicine_id'])) {
        $response['medicine_id'] = $result['medicine_id'];
    }

    // Send the response back to the client
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
