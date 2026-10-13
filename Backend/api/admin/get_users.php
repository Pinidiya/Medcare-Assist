<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Validate that the user is an admin

try {
    if (isset($_GET['role'])) {
        $role = trim($_GET['role']);
    } else {
        $role = null;
    }
    
    $allowed_roles = ['patient', 'pharmacy_owner', 'pharmacist', 'stock_manager', 'admin'];

    $fetch_role = null;
    
    if ($role !== null && in_array($role, $allowed_roles)) {
        $fetch_role = $role;
    }

    $users = Admin::getUsers($fetch_role);

    echo json_encode(["status" => "success", "data" => $users]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
