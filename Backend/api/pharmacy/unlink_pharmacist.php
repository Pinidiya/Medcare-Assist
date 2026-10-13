<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacy_owner();

require_once '../../config/db.php';
require_once '../../models/PharmacyOwner.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->pharmacist_id) && !isset($data->user_id)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "pharmacist_id or user_id is required"]);
    exit();
}

try {
    if (isset($data->pharmacist_id)) {
        $pharmacist_id = (int)$data->pharmacist_id;
    } else {
        $pharmacist_id = null;
    }
    
    if (isset($data->user_id)) {
        $user_id = (int)$data->user_id;
    } else {
        $user_id = null;
    }
    
    $action = isset($data->action) ? $data->action : 'unlink';
    
    $owner_id = (int)$_SESSION['user_id'];
    $result = PharmacyOwner::togglePharmacist($owner_id, $pharmacist_id, $user_id, $action);
    
    if ($result['status'] == false) {
        http_response_code($result['code']);
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit();
    }
    
    $new_status = isset($result['new_status']) ? $result['new_status'] : 'incomplete';
    
    echo json_encode([
        "status" => "success",
        "message" => $result['message'],
        "new_status" => $new_status
    ]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
