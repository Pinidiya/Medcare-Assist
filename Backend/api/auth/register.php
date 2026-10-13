<?php
// register.php - MedCare Assist User Registration

session_start();

require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$json_data = file_get_contents("php://input");
$data      = json_decode($json_data);

if (
    !isset($data->full_name) || empty(trim($data->full_name)) ||
    !isset($data->email)     || empty(trim($data->email))     ||
    !isset($data->password)  || empty(trim($data->password))  ||
    !isset($data->role)      || empty(trim($data->role))
) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "All fields (full_name, email, password, role) are required"]);
    exit();
}

$full_name = trim($data->full_name);
$email     = trim($data->email);
$password  = trim($data->password);
$role      = trim($data->role);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email format"]);
    exit();
}

// Only patients and pharmacy owners can self-register
$allowed_roles = ['patient', 'pharmacy_owner'];
if (!in_array($role, $allowed_roles)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid user role requested"]);
    exit();
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char"]);
    exit();
}

try {
    $check_stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
    $check_stmt->bindParam(':email', $email);
    $check_stmt->execute();

    if ($check_stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Email address is already registered"]);
        exit();
    }

    $password_hash = password_hash($password, PASSWORD_ARGON2ID);

    $insert_stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES (:full_name, :email, :password_hash, :role)");
    $insert_stmt->bindParam(':full_name',     $full_name);
    $insert_stmt->bindParam(':email',         $email);
    $insert_stmt->bindParam(':password_hash', $password_hash);
    $insert_stmt->bindParam(':role',          $role);

    if ($insert_stmt->execute()) {
        http_response_code(201);
        echo json_encode(["status" => "success", "message" => "Account created successfully! Please log in."]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to register user"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>