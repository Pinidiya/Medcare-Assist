<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check if the current user is an admin

try {
    $stats = Admin::getStats();
    
    echo json_encode([
        "status" => "success",
        "data"   => $stats
    ]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
