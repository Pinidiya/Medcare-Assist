<?php
// pharmacist/create_staff.php - Create stock manager account
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
$email     = isset($_POST['email']) ? trim($_POST['email']) : '';
$password  = isset($_POST['password']) ? trim($_POST['password']) : '';
$role      = isset($_POST['role']) ? trim($_POST['role']) : '';
$phone     = isset($_POST['phone']) ? trim($_POST['phone']) : '';

if (empty($full_name) || empty($email) || empty($password) || empty($role) || empty($phone)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "All core fields (name, email, password, role, phone) are required"]);
    exit();
}

if ($role !== 'stock_manager') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Pharmacists can only add Stock Managers"]);
    exit();
}

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

try {
    // Get pharmacist's pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->bindParam(':uid', $_SESSION['user_id']);
    $ph_stmt->execute();
    $pharmacy = $ph_stmt->fetch();

    if (!$pharmacy) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist not linked to a pharmacy"]);
        exit();
    }

    $pharmacy_id = $pharmacy['pharmacy_id'];

    // Check if email exists
    $check_stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
    $check_stmt->bindParam(':email', $email);
    $check_stmt->execute();
    if ($check_stmt->fetch()) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email already registered"]);
        exit();
    }

    $pdo->beginTransaction();

    $hash = password_hash($password, PASSWORD_ARGON2ID);
    $is_active = 1;

    // Create user
    $user_stmt = $pdo->prepare(
        "INSERT INTO users (full_name, email, password_hash, role, phone, is_active) VALUES (:name, :email, :hash, :role, :phone, :active)"
    );
    $user_stmt->bindParam(':name',  $full_name);
    $user_stmt->bindParam(':email', $email);
    $user_stmt->bindParam(':hash',  $hash);
    $user_stmt->bindParam(':role',  $role);
    $user_stmt->bindParam(':phone', $phone);
    $user_stmt->bindParam(':active', $is_active);
    $user_stmt->execute();
    $new_user_id = $pdo->lastInsertId();

    // Link to pharmacy in stock_managers
    $staff_stmt = $pdo->prepare(
        "INSERT INTO stock_managers (pharmacy_id, user_id, is_active) VALUES (:pid, :uid, :active)"
    );
    $staff_stmt->bindParam(':pid', $pharmacy_id);
    $staff_stmt->bindParam(':uid', $new_user_id);
    $staff_stmt->bindParam(':active', $is_active);
    $staff_stmt->execute();

    $pdo->commit();

    echo json_encode([
        "status"  => "success",
        "message" => "Stock Manager account created successfully and is active.",
        "user_id" => $new_user_id,
        "is_active" => $is_active
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>