<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Ensure the user is an admin

try {
    if (isset($_GET['status'])) {
        $status = trim($_GET['status']);
    } else {
        $status = null;
    }
    
    if (isset($_GET['nmra'])) {
        $nmra = trim($_GET['nmra']);
    } else {
        $nmra = null;
    }
    
    $pharmacies = Admin::getPharmacies($status, $nmra);
    
    echo json_encode(["status" => "success", "data" => $pharmacies]);
    
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
