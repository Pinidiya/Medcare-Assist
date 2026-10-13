<?php
// patient/upload_prescription.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';
require_once '../../models/Prescription.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$pharmacy_id = isset($_POST['pharmacy_id']) ? (int)$_POST['pharmacy_id'] : 0;
$notes       = isset($_POST['notes']) ? trim($_POST['notes']) : '';

if (!$pharmacy_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "pharmacy_id is required"]);
    exit();
}

if (!isset($_FILES['prescription']) || $_FILES['prescription']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Prescription file is required"]);
    exit();
}

$ext     = strtolower(pathinfo($_FILES['prescription']['name'], PATHINFO_EXTENSION));
$allowed = ['pdf', 'jpg', 'jpeg', 'png'];

if (!in_array($ext, $allowed)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Only PDF, JPG, JPEG, PNG files are allowed"]);
    exit();
}

// SECURITY: File size check (5MB)
$max_file_size = 5 * 1024 * 1024;
if ($_FILES['prescription']['size'] > $max_file_size) {
    http_response_code(400);
    die(json_encode(["status" => "error", "message" => "Prescription file exceeds 5MB limit"]));
}

// SECURITY: Server-side MIME check
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['prescription']['tmp_name']);
finfo_close($finfo);
$allowed_mimes = ['image/jpeg', 'image/png', 'application/pdf'];
if (!in_array($mime, $allowed_mimes)) {
    http_response_code(400);
    die(json_encode(["status" => "error", "message" => "Invalid prescription file content"]));
}

$upload_dir = __DIR__ . '/../../uploads/prescriptions/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$filename  = 'rx_' . $_SESSION['user_id'] . '_' . time() . '.' . $ext;
$file_path = 'uploads/prescriptions/' . $filename;

if (!move_uploaded_file($_FILES['prescription']['tmp_name'], $upload_dir . $filename)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to upload prescription"]);
    exit();
}

try {
    $prescription = Prescription::upload($_SESSION['user_id'], $pharmacy_id, $file_path, $notes);

    echo json_encode([
        "status"          => "success",
        "message"         => "Prescription uploaded successfully. The pharmacy will review it shortly.",
        "prescription_id" => $prescription->getPrescriptionId()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
