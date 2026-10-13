<?php
// auth/register_patient.php - Patient Registration

/* User Management and Security Module eke 91 line idala pahalata atha */


session_start();
require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->full_name) || empty(trim($data->full_name)) ||
    !isset($data->email)     || empty(trim($data->email))     ||
    !isset($data->password)  || empty(trim($data->password))
) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "full_name, email, and password are required"]);
    exit();
}

$full_name = trim($data->full_name);
$email     = trim($data->email);
$password  = trim($data->password);
$phone     = isset($data->phone) ? trim($data->phone) : null;
$birthday  = isset($data->birthday) ? trim($data->birthday) : null;
$age       = isset($data->age) ? (int)$data->age : null;
$family_contact      = isset($data->family_contact) ? trim($data->family_contact) : null;
$family_relationship = isset($data->family_relationship) ? trim($data->family_relationship) : null;
$family_contact_2      = isset($data->family_contact_2) ? trim($data->family_contact_2) : null;
$family_relationship_2 = isset($data->family_relationship_2) ? trim($data->family_relationship_2) : null;
$is_sos_enabled        = isset($data->is_sos_enabled) ? (int)$data->is_sos_enabled : 0;

if ($phone !== null && $phone !== '') {
    $cleanPhone = preg_replace('/[\s\-]/', '', $phone);
    if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
        exit();
    }
    $phone = $cleanPhone;
}

if ($family_contact !== null && $family_contact !== '') {
    $cleanContact = preg_replace('/[\s\-]/', '', $family_contact);
    if (!preg_match('/^[0-9]{10}$/', $cleanContact)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Family contact number must be exactly 10 digits"]);
        exit();
    }
    $family_contact = $cleanContact;
}

if ($family_contact_2 !== null && $family_contact_2 !== '') {
    $cleanContact2 = preg_replace('/[\s\-]/', '', $family_contact_2);
    if (!preg_match('/^[0-9]{10}$/', $cleanContact2)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Family contact 2 number must be exactly 10 digits"]);
        exit();
    }
    $family_contact_2 = $cleanContact2;
}

if ($birthday) {
    $birth_date = new DateTime($birthday);
    $today = new DateTime('today');
    $calculated_age = $birth_date->diff($today)->y;
    
    if (!$age) {
        $age = $calculated_age;
    }

    if ($calculated_age < 16) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "You must be at least 16 years old to register."]);
        exit();
    }
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

try {
 // Check if email already exists

    $check_stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
    $check_stmt->bindParam(':email', $email);
    $check_stmt->execute();

    if ($check_stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Email address is already registered"]);
        exit();
    }

    $password_hash = password_hash($password, PASSWORD_ARGON2ID);

    $stmt = $pdo->prepare(
        "INSERT INTO users (full_name, email, password_hash, role, phone, birthday, age, family_contact, family_relationship, family_contact_2, family_relationship_2, is_sos_enabled)
         VALUES (:full_name, :email, :password_hash, 'patient', :phone, :birthday, :age, :family_contact, :family_relationship, :family_contact_2, :family_relationship_2, :is_sos_enabled)"
    );
    $stmt->bindParam(':full_name',            $full_name);
    $stmt->bindParam(':email',                $email);
    $stmt->bindParam(':password_hash',        $password_hash);
    $stmt->bindParam(':phone',                $phone);
    $stmt->bindParam(':birthday',             $birthday);
    $stmt->bindParam(':age',                  $age);
    $stmt->bindParam(':family_contact',       $family_contact);
    $stmt->bindParam(':family_relationship',  $family_relationship);
    $stmt->bindParam(':family_contact_2',     $family_contact_2);
    $stmt->bindParam(':family_relationship_2',$family_relationship_2);
    $stmt->bindParam(':is_sos_enabled',       $is_sos_enabled, PDO::PARAM_INT);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode([
            "status"  => "success",
            "message" => "Patient account created successfully! Please log in."
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to register patient"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
