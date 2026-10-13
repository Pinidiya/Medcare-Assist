<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check if the user is an admin.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->pharmacist_id) && !isset($data->pharmacist_user_id)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "pharmacist_id or pharmacist_user_id is required"]);
    exit();
}

$action = trim($data->action);

if ($action !== 'approve' && $action !== 'reject') {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Action must be 'approve' or 'reject'"]);
    exit();
}

try {
    $pharmacist_id = 0; 
    
    if (isset($data->pharmacist_id)) {
        $pharmacist_id = (int)$data->pharmacist_id;
    } else if (isset($data->pharmacist_user_id)) {
        $db = Database::getInstance()->getConnection();
        $stmt_uid = $db->prepare("SELECT pharmacist_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $stmt_uid->execute([':uid' => (int)$data->pharmacist_user_id]);
        
        $pharmacist_record = $stmt_uid->fetch();
        if ($pharmacist_record) {
            $pharmacist_id = (int)$pharmacist_record['pharmacist_id'];
        }
    }

    $result = Admin::approvePharmacist($pharmacist_id, $action);
    
    if ($result['status'] == false) {
        if ($result['message'] === 'Pharmacist not found') {
            http_response_code(404); // Not Found
        } else {
            http_response_code(400); 
        }
        
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit();
    }

    echo json_encode([
        "status"  => "success",
        "message" => $result['message']
    ]);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
