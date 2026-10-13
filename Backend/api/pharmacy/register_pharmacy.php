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

$name      = isset($_POST['name'])      ? trim($_POST['name'])      : '';
$address   = isset($_POST['address'])   ? trim($_POST['address'])   : '';
$phone     = isset($_POST['phone'])     ? trim($_POST['phone'])     : '';
$latitude  = isset($_POST['latitude'])  ? trim($_POST['latitude'])  : null;
$longitude = isset($_POST['longitude']) ? trim($_POST['longitude']) : null;

if ($phone !== null && $phone !== '') {
    $cleanPhone = preg_replace('/[\s\-]/', '', $phone);
    if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
        exit();
    }
    $phone = $cleanPhone;
}

if (empty($name) || empty($address)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Pharmacy name and address are required"]);
    exit();
}

// Check if this owner already registered a pharmacy
try {
    $check = $pdo->prepare("SELECT pharmacy_id FROM pharmacies WHERE owner_id = :owner LIMIT 1");
    $check->bindParam(':owner', $_SESSION['user_id']);
    $check->execute();
    
    if ($check->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(["status" => "error", "message" => "You have already registered a pharmacy"]);
        exit();
    }
} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    exit();
}

// Handle the license document file upload
$license_path = null;
if (isset($_FILES['license_doc']) && $_FILES['license_doc']['error'] === UPLOAD_ERR_OK) {
    
    $upload_dir = __DIR__ . '/../../uploads/licenses/';
    
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $ext = strtolower(pathinfo($_FILES['license_doc']['name'], PATHINFO_EXTENSION));
    $allowed = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!in_array($ext, $allowed)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Only PDF, JPG, JPEG, PNG files are allowed"]);
        exit();
    }

    $filename = 'license_' . $_SESSION['user_id'] . '_' . time() . '.' . $ext;
    $license_path = 'uploads/licenses/' . $filename;

    if (!move_uploaded_file($_FILES['license_doc']['tmp_name'], $upload_dir . $filename)) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to upload license document"]);
        exit();
    }
}

try {
    $stmt = $pdo->prepare(
        "INSERT INTO pharmacies (owner_id, pharmacy_name, address, phone, latitude, longitude, license_doc_path, nmra_reg_number, verification_status)
         VALUES (:owner, :name, :address, :phone, :lat, :lng, :license, :nmra, 'incomplete')"
    );
    
    $stmt->bindParam(':owner',   $_SESSION['user_id']);
    $stmt->bindParam(':name',    $name);
    $stmt->bindParam(':address', $address);
    $stmt->bindParam(':phone',   $phone);
    $stmt->bindParam(':lat',     $latitude);
    $stmt->bindParam(':lng',     $longitude);
    $stmt->bindParam(':license', $license_path);
    
    $nmra_placeholder = "NMRA-" . time();
    $stmt->bindParam(':nmra',    $nmra_placeholder);
    
    $stmt->execute();
    
    $owner = new PharmacyOwner([
        'user_id' => $_SESSION['user_id'], 
        'license_doc' => $license_path, 
        'nmra_reg' => $nmra_placeholder
    ]);

    echo json_encode([
        "status"      => "success",
        "message"     => "Pharmacy registered successfully. Pending admin approval.",
        "pharmacy_id" => $pdo->lastInsertId(),
        "owner_details" => $owner->toArray()
    ]);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
