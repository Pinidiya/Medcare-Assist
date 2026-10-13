<?php
// backend/api/patient/locker_get.php
require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/MedicalLocker.php';

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    if (!$patient) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $documents = MedicalLocker::getByPatient($_SESSION['user_id']);

    // Map to include a file_type based on the extension of document_url
    $processed = array_map(function($doc) {
        $ext = strtolower(pathinfo($doc['document_url'], PATHINFO_EXTENSION));
        $doc['file_type'] = $ext;
        return $doc;
    }, $documents);

    echo json_encode([
        "status" => "success",
        "data" => $processed
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "System error: " . $e->getMessage()]);
}
?>

