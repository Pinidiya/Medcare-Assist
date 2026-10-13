<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth(['superadmin']);

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT user_id, full_name, email, account_status, is_active, created_at 
                           FROM users 
                           WHERE role = 'admin' 
                           ORDER BY created_at DESC");
    $stmt->execute();
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $admins
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
