<?php
// backend/api/patient/search_medicines.php

require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/MasterMedicine.php';

$query = isset($_GET['q']) ? $_GET['q'] : '';
$district = isset($_GET['district']) ? $_GET['district'] : '';
$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    $response = $patient->searchMedicines($query, $district, $lat, $lng);

    echo json_encode([
        "status" => "success",
        "data" => $response
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "System error: " . $e->getMessage()
    ]);
}
?>

