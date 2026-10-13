<?php
// auth/register_pharmacist.php - Pharmacist Registration (multipart/form-data)
session_start();
require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

// Validate required fields
$required_fields = ['full_name', 'email', 'password', 'slmc_registration_number', 'nic'];
foreach ($required_fields as $field) {
    if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Field '$field' is required"]);
        exit();
    }
}

$full_name               = trim($_POST['full_name']);
$email                   = trim($_POST['email']);
$password                = trim($_POST['password']);
$phone                   = isset($_POST['phone']) ? trim($_POST['phone']) : null;
$slmc_registration_number = trim($_POST['slmc_registration_number']);
$nic                     = trim($_POST['nic']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email format"]);
    exit();
}

if ($phone !== null && $phone !== '') {
    $cleanPhone = preg_replace('/[\s\-]/', '', $phone);
    if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
        exit();
    }
    $phone = $cleanPhone;
}

$cleanNic = preg_replace('/\s+/', '', $nic);
if (!preg_match('/^([0-9]{9}[vVxX]|[0-9]{12})$/', $cleanNic)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid NIC Number is required (9 digits + V/X or 12 digits)"]);
    exit();
}
$nic = $cleanNic;

if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char"]);
    exit();
}

try {
    // Check if email already exists BEFORE uploading files
    $check_stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
    $check_stmt->bindParam(':email', $email);
    $check_stmt->execute();

    if ($check_stmt->fetch()) {
        http_response_code(409);
        die(json_encode(["status" => "error", "message" => "Email address is already registered"]));
    }

    // File upload handling
    $upload_base = '../../uploads/';
    if (!is_dir($upload_base . 'pharmacist_certs/')) {
        mkdir($upload_base . 'pharmacist_certs/', 0755, true); // Changed from 0777 to 0755
    }
    if (!is_dir($upload_base . 'pharmacist_photos/')) {
        mkdir($upload_base . 'pharmacist_photos/', 0755, true); // Changed from 0777 to 0755
    }
    
    $certificate_path = null;
    $photo_path       = null;
    $max_file_size    = 5 * 1024 * 1024; // 5MB

    // Handle certificate upload
    if (!isset($_FILES['certificate']) || $_FILES['certificate']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Certificate upload is required"]));
    }
    
    if ($_FILES['certificate']['size'] > $max_file_size) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Certificate exceeds 5MB limit"]));
    }

    $ext = strtolower(pathinfo($_FILES['certificate']['name'], PATHINFO_EXTENSION));
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!in_array($ext, $allowed_exts)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Certificate must be JPG, PNG, WebP, or PDF"]));
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES['certificate']['tmp_name']);
    finfo_close($finfo);
    $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!in_array($mime, $allowed_mimes)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Invalid certificate file content"]));
    }

    $filename = 'cert_' . time() . '_' . uniqid() . '.' . $ext;
    $target = $upload_base . 'pharmacist_certs/' . $filename;
    if (!move_uploaded_file($_FILES['certificate']['tmp_name'], $target)) {
        http_response_code(500);
        die(json_encode(["status" => "error", "message" => "Failed to upload certificate"]));
    }
    $certificate_path = 'uploads/pharmacist_certs/' . $filename;

    // Handle photo upload
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Photo upload is required"]));
    }

    if ($_FILES['photo']['size'] > $max_file_size) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Photo exceeds 5MB limit"]));
    }

    $ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
    $allowed_exts_photo = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($ext, $allowed_exts_photo)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Photo must be JPG, PNG, or WebP"]));
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES['photo']['tmp_name']);
    finfo_close($finfo);
    $allowed_mimes_photo = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed_mimes_photo)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Invalid photo file content"]));
    }

    $filename = 'photo_' . time() . '_' . uniqid() . '.' . $ext;
    $target = $upload_base . 'pharmacist_photos/' . $filename;
    if (!move_uploaded_file($_FILES['photo']['tmp_name'], $target)) {
        http_response_code(500);
        die(json_encode(["status" => "error", "message" => "Failed to upload photo"]));
    }
    $photo_path = 'uploads/pharmacist_photos/' . $filename;

    $pdo->beginTransaction();

    $password_hash = password_hash($password, PASSWORD_ARGON2ID);

    // Insert user with is_active = 0 (pending admin approval)
    $user_stmt = $pdo->prepare(
        "INSERT INTO users (full_name, email, password_hash, role, phone, is_active)
         VALUES (:full_name, :email, :password_hash, 'pharmacist', :phone, 0)"
    );
    $user_stmt->bindParam(':full_name',     $full_name);
    $user_stmt->bindParam(':email',         $email);
    $user_stmt->bindParam(':password_hash', $password_hash);
    $user_stmt->bindParam(':phone',         $phone);
    $user_stmt->execute();

    $user_id = $pdo->lastInsertId();

    // Insert into pharmacists table
    $detail_stmt = $pdo->prepare(
        "INSERT INTO pharmacists (user_id, pharmacy_id, slmc_number, is_verified_by_admin, certificate_path, photo_path)
         VALUES (:user_id, NULL, :slmc, NULL, :cert, :photo)"
    );
    $detail_stmt->bindParam(':user_id', $user_id);
    $detail_stmt->bindParam(':slmc',    $slmc_registration_number);
    $detail_stmt->bindParam(':cert',    $certificate_path);
    $detail_stmt->bindParam(':photo',   $photo_path);
    $detail_stmt->execute();

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        "status"  => "success",
        "message" => "Pharmacist account created successfully! Your account is pending admin verification."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
