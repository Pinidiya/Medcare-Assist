<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Verify that the user is logged in as an admin

try {
    if (isset($_GET['search'])) {
        $search = trim($_GET['search']);
    } else {
        $search = ''; 
    }
    
    $medicines = Admin::getMedicines($search);
    
    echo json_encode(["status" => "success", "data" => $medicines]);
    
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
