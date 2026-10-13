<?php
// patient/get_dashboard.php
require_once 'patient_auth.php';
require_once '../../models/Patient.php';

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "data"   => $patient->getDashboard()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

