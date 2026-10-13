<?php
// patient/upload_slip.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$order_id = isset($_POST['order_id']) ? (int)$_POST['order_id'] : 0;

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id is required"]);
    exit();
}

if (!isset($_FILES['payment_slip']) || $_FILES['payment_slip']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payment slip file is required"]);
    exit();
}

$ext = strtolower(pathinfo($_FILES['payment_slip']['name'], PATHINFO_EXTENSION));
$allowed = ['pdf', 'jpg', 'jpeg', 'png'];

if (!in_array($ext, $allowed)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Only PDF, JPG, JPEG, PNG files are allowed"]);
    exit();
}

// SECURITY: File size check (5MB)
$max_file_size = 5 * 1024 * 1024;
if ($_FILES['payment_slip']['size'] > $max_file_size) {
    http_response_code(400);
    die(json_encode(["status" => "error", "message" => "Payment slip exceeds 5MB limit"]));
}

// SECURITY: Server-side MIME check
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['payment_slip']['tmp_name']);
finfo_close($finfo);
$allowed_mimes = ['image/jpeg', 'image/png', 'application/pdf'];
if (!in_array($mime, $allowed_mimes)) {
    http_response_code(400);
    die(json_encode(["status" => "error", "message" => "Invalid payment slip content"]));
}

$upload_dir = __DIR__ . '/../../uploads/slips/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$filename = 'slip_' . $order_id . '_' . time() . '.' . $ext;
$file_path = 'uploads/slips/' . $filename;

if (!move_uploaded_file($_FILES['payment_slip']['tmp_name'], $upload_dir . $filename)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to upload payment slip"]);
    exit();
}

try {
    // SECURITY: Map user_id to actual patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();
    
    if (!$patient) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Patient profile not found"]));
    }
    $patient_id = $patient['patient_id'];

    // Verify that the order belongs to this patient
    $checkStmt = $pdo->prepare("SELECT order_id FROM orders WHERE order_id = :oid AND patient_id = :pid");
    $checkStmt->execute([':oid' => $order_id, ':pid' => $patient_id]);
    if (!$checkStmt->fetch()) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Unauthorized access to this order"]);
        exit();
    }

    $stmt = $pdo->prepare(
        "UPDATE orders 
         SET advance_payment_slip = :path, status = 'Pending Verification' 
         WHERE order_id = :oid"
    );
    $stmt->bindParam(':path', $file_path);
    $stmt->bindParam(':oid', $order_id);
    $stmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "Payment slip uploaded successfully. Pharmacist will verify it shortly."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
