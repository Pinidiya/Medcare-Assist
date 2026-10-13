<?php
// auth/register_pharmacy.php - Pharmacy Owner Registration (multipart/form-data)
session_start();
require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

// Validate required fields from $_POST (multipart/form-data)
$required_fields = ['full_name', 'email', 'password', 'pharmacy_name', 'address', 'phone'];
foreach ($required_fields as $field) {
    if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Field '$field' is required"]);
        exit();
    }
}

$full_name  = trim($_POST['full_name']);
$email      = trim($_POST['email']);
$password   = trim($_POST['password']);

// Pharmacy fields
$pharmacy_name          = trim($_POST['pharmacy_name']);
$address                = trim($_POST['address']);
$district               = isset($_POST['district']) ? trim($_POST['district']) : null;
$phone                  = trim($_POST['phone']);
$owner_nic              = isset($_POST['owner_nic']) ? trim($_POST['owner_nic']) : null;
$nmra_license           = isset($_POST['nmra_license']) ? trim($_POST['nmra_license']) : null;
$nmra_expiry_date       = isset($_POST['nmra_expiry_date']) ? trim($_POST['nmra_expiry_date']) : null;
$business_registration  = isset($_POST['business_registration']) ? trim($_POST['business_registration']) : null;
$latitude               = isset($_POST['latitude']) ? trim($_POST['latitude']) : null;
$longitude              = isset($_POST['longitude']) ? trim($_POST['longitude']) : null;

if ($phone !== null && $phone !== '') {
    $cleanPhone = preg_replace('/[\s\-]/', '', $phone);
    if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
        exit();
    }
    $phone = $cleanPhone;
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
    $owner_photo_path   = null;
    $license_doc_path   = null;
    $max_file_size = 5 * 1024 * 1024; // 5MB

    // Handle owner_photo upload
    if (!isset($_FILES['owner_photo']) || $_FILES['owner_photo']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Owner photo is required"]));
    }
    
    // SECURITY: File size check
    if ($_FILES['owner_photo']['size'] > $max_file_size) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Owner photo exceeds 5MB limit"]));
    }

    // SECURITY: Extension whitelist
    $ext = strtolower(pathinfo($_FILES['owner_photo']['name'], PATHINFO_EXTENSION));
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($ext, $allowed_exts)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Owner photo must be JPG, PNG, or WebP"]));
    }

    // SECURITY: Server-side MIME check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES['owner_photo']['tmp_name']);
    finfo_close($finfo);
    $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed_mimes)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Invalid image file content"]));
    }

    $filename = 'owner_' . time() . '_' . uniqid() . '.' . $ext;
    $target = $upload_base . 'owner_photos/' . $filename;
    if (!move_uploaded_file($_FILES['owner_photo']['tmp_name'], $target)) {
        http_response_code(500);
        die(json_encode(["status" => "error", "message" => "Failed to upload owner photo"]));
    }
    $owner_photo_path = 'uploads/owner_photos/' . $filename;

    // Handle license_doc upload
    if (!isset($_FILES['license_doc']) || $_FILES['license_doc']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "License document is required"]));
    }

    // SECURITY: File size check
    if ($_FILES['license_doc']['size'] > $max_file_size) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "License document exceeds 5MB limit"]));
    }

    // SECURITY: Extension whitelist
    $ext = strtolower(pathinfo($_FILES['license_doc']['name'], PATHINFO_EXTENSION));
    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!in_array($ext, $allowed_exts)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "License document must be JPG, PNG, WebP, or PDF"]));
    }

    // SECURITY: Server-side MIME check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES['license_doc']['tmp_name']);
    finfo_close($finfo);
    $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!in_array($mime, $allowed_mimes)) {
        http_response_code(400);
        die(json_encode(["status" => "error", "message" => "Invalid document file content"]));
    }

    $filename = 'license_' . time() . '_' . uniqid() . '.' . $ext;
    $target = $upload_base . 'pharmacy_docs/' . $filename;
    if (!move_uploaded_file($_FILES['license_doc']['tmp_name'], $target)) {
        http_response_code(500);
        die(json_encode(["status" => "error", "message" => "Failed to upload license document"]));
    }
    $license_doc_path = 'uploads/pharmacy_docs/' . $filename;

    $pdo->beginTransaction();

    $password_hash = password_hash($password, PASSWORD_ARGON2ID);

    // Insert user
    $user_stmt = $pdo->prepare(
        "INSERT INTO users (full_name, email, password_hash, role, phone)
         VALUES (:full_name, :email, :password_hash, 'pharmacy_owner', :phone)"
    );
    $user_stmt->bindParam(':full_name',     $full_name);
    $user_stmt->bindParam(':email',         $email);
    $user_stmt->bindParam(':password_hash', $password_hash);
    $user_stmt->bindParam(':phone',         $phone);
    $user_stmt->execute();

    $owner_id = $pdo->lastInsertId();

    // Insert pharmacy
    $pharm_stmt = $pdo->prepare(
        "INSERT INTO pharmacies (owner_id, pharmacy_name, address, district, phone, latitude, longitude, license_doc_path, nmra_reg_number, nmra_expiry_date, business_registration, owner_nic, owner_photo, verification_status)
         VALUES (:owner_id, :name, :address, :district, :phone, :latitude, :longitude, :license_doc_path, :nmra_license, :nmra_expiry_date, :business_registration, :owner_nic, :owner_photo, 'pending_admin_approval')"
    );
    $pharm_stmt->bindParam(':owner_id',               $owner_id);
    $pharm_stmt->bindParam(':name',                   $pharmacy_name);
    $pharm_stmt->bindParam(':address',                $address);
    $pharm_stmt->bindParam(':district',               $district);
    $pharm_stmt->bindParam(':phone',                  $phone);
    $pharm_stmt->bindParam(':latitude',               $latitude);
    $pharm_stmt->bindParam(':longitude',              $longitude);
    $pharm_stmt->bindParam(':license_doc_path',       $license_doc_path);
    $pharm_stmt->bindParam(':nmra_license',           $nmra_license);
    $pharm_stmt->bindParam(':nmra_expiry_date',       $nmra_expiry_date);
    $pharm_stmt->bindParam(':business_registration',  $business_registration);
    $pharm_stmt->bindParam(':owner_nic',              $owner_nic);
    $pharm_stmt->bindParam(':owner_photo',            $owner_photo_path);
    $pharm_stmt->execute();

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        "status"  => "success",
        "message" => "Pharmacy owner account created successfully! Your pharmacy is pending approval."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
