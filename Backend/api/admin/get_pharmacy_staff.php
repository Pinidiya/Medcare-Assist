<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Verify that the user is logged in as an admin

if (isset($_GET['pharmacy_id'])) {
    $pharmacy_id = (int)$_GET['pharmacy_id']; 
} else {
    $pharmacy_id = 0; 
}

if ($pharmacy_id <= 0) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Valid pharmacy_id is required"]);
    exit();
}

try {
    $staff = Admin::getPharmacyStaff($pharmacy_id);
    
    echo json_encode(["status" => "success", "data" => $staff]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
