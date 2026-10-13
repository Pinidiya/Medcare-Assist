<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacy_owner();

require_once '../../config/db.php';
require_once '../../models/PharmacyOwner.php';

// Verify that the user is a pharmacy owner

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
$email     = isset($_POST['email']) ? trim($_POST['email']) : '';
$password  = isset($_POST['password']) ? trim($_POST['password']) : '';
$role      = isset($_POST['role']) ? trim($_POST['role']) : '';
$phone     = isset($_POST['phone']) ? trim($_POST['phone']) : '';

if (empty($full_name) || empty($email) || empty($password) || empty($role) || empty($phone)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "All core fields (name, email, password, role, phone) are required"]);
    exit();
}

if ($role !== 'pharmacist' && $role !== 'stock_manager') {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Role must be pharmacist or stock_manager"]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Invalid email format"]);
    exit();
}

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char"]);
    exit();
}

$cleanPhone = preg_replace('/[\s\-]/', '', $phone);
if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
    exit();
}
$phone = $cleanPhone;

$slmc = null;
$nic = null;

if ($role === 'pharmacist') {
    $slmc = isset($_POST['slmc_registration_number']) ? trim($_POST['slmc_registration_number']) : '';
    $nic = isset($_POST['nic']) ? preg_replace('/\s+/', '', $_POST['nic']) : '';

    if (empty($slmc)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "SLMC Registration Number is required for pharmacists"]);
        exit();
    }
    
    if (!preg_match('/^[0-9]{4,10}$/', $slmc)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "SLMC Registration Number must contain 4-10 digits"]);
        exit();
    }
    
    if (empty($nic)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "NIC Number is required for pharmacists"]);
        exit();
    }
    
    if (!preg_match('/^([0-9]{9}[vVxX]|[0-9]{12})$/', $nic)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Valid NIC Number is required (9 digits + V/X or 12 digits)"]);
        exit();
    }
}

try {
    $owner_id = (int)$_SESSION['user_id'];
    $data_for_staff = [
        'full_name' => $full_name,
        'email' => $email,
        'password' => $password,
        'role' => $role,
        'phone' => $phone,
        'slmc_registration_number' => $slmc,
        'nic' => $nic,
        'files' => $_FILES 
    ];

    $result = PharmacyOwner::createStaff($owner_id, $data_for_staff);

    if ($result['status'] == false) {
        http_response_code($result['code']);
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit();
    }

    echo json_encode([
        "status"  => "success",
        "message" => $result['message'],
        "user_id" => $result['user_id'],
        "is_active" => $result['is_active']
    ]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
