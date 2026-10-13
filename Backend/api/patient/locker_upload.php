<?php
// backend/api/patient/locker_upload.php
require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/MedicalLocker.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['document'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No file uploaded."]);
    exit();
}

$file = $_FILES['document'];
$document_name = isset($_POST['document_name']) ? trim($_POST['document_name']) : $file['name'];

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    $lockerDoc = MedicalLocker::uploadDocument($_SESSION['user_id'], $document_name, $file);
    
    $data = $lockerDoc->toArray();
    $data['file_type'] = strtolower(pathinfo($data['document_url'], PATHINFO_EXTENSION));

    echo json_encode([
        "status" => "success",
        "message" => "Document securely uploaded.",
        "data" => $data
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "System error: " . $e->getMessage()]);
}
?>

