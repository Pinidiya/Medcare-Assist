<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check if the person making the request is an admin

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

if (isset($_GET['status'])) {
    $status = trim($_GET['status']);
} else {
    $status = null;
}

$allowed_statuses = ['pending', 'approved', 'rejected'];

try {
    // Call the Admin model to get the list of medicine requests
    $requests = Admin::getMedicineRequests($status);
    
    echo json_encode(["status" => "success", "data" => $requests]);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
