<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->user_id)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "user_id is required"]);
    exit();
}

$user_id = (int)$data->user_id;

// Prevent admins from deactivating or suspending themselves
if ($user_id === (int)$_SESSION['user_id']) {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Cannot modify your own admin account status"]);
    exit();
}

try {
    if (isset($data->account_status)) {
        $status = trim($data->account_status);
        
        if ($status !== 'active' && $status !== 'suspended') {
            http_response_code(400); 
            echo json_encode(["status" => "error", "message" => "Invalid account_status value. Must be 'active' or 'suspended'."]);
            exit();
        }
        
        Admin::suspendUser($user_id, $status);
        
        if ($status === 'suspended') {
            $message_text = "User account suspended successfully";
        } else {
            $message_text = "User account reactivated successfully";
        }

        echo json_encode([
            "status"  => "success",
            "message" => $message_text
        ]);
        exit(); 
    }

    if (isset($data->is_active)) {
        $is_active = (int)$data->is_active;
    } else {
        $is_active = 0; 
    }
    
    Admin::toggleUserActive($user_id, $is_active);

    if ($is_active === 1) {
        $message_text = "User activated";
    } else {
        $message_text = "User deactivated";
    }

    echo json_encode([
        "status"  => "success",
        "message" => $message_text
    ]);
    
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
