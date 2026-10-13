<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth(['superadmin']);

require_once '../../config/db.php';

// Check if user is logged in and is a superadmin

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->full_name) || !isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields (full_name, email, password)"]);
    exit();
}

$full_name = trim($data->full_name);
$email     = trim($data->email);
$password  = $data->password;

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email format"]);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters"]);
    exit();
}

$hash = password_hash($password, PASSWORD_ARGON2ID);

try {
    // Check if email already exists
    $checkStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
    $checkStmt->execute([':email' => $email]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email already registered"]);
        exit();
    }

    // Insert new admin
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role, is_active, account_status) 
                           VALUES (:name, :email, :hash, 'admin', 1, 'active')");
    $stmt->execute([
        ':name'  => $full_name,
        ':email' => $email,
        ':hash'  => $hash
    ]);

    $new_admin_id = $pdo->lastInsertId();

    // Log the action
    $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_description, ip_address) VALUES (:uid, :act, :ip)");
    $logStmt->execute([
        ':uid' => $_SESSION['user_id'] ?? null,
        ':act' => 'Created admin account for ' . $email,
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ]);

    echo json_encode(["status" => "success", "message" => "Admin created successfully"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
