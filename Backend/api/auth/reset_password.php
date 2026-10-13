<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$token = trim($data['token'] ?? '');
$newPassword = $data['new_password'] ?? '';

if (empty($token) || empty($newPassword)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Token and new password are required"]);
    exit();
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $newPassword)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char"]);
    exit();
}

try {
    $success = User::resetPassword($token, $newPassword);
    
    if ($success) {
        echo json_encode(["status" => "success", "message" => "Password has been successfully reset. You can now login."]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid or expired reset token."]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error"]);
}
?>
