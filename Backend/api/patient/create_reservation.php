<?php
// patient/create_reservation.php
require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/Reservation.php';
require_once '../../models/ReservationChat.php';

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

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    // Upload prescription
    $uploadResult = $patient->uploadPrescription($pharmacy_id, $_FILES['prescription'], $notes);
    
    // Create reservation
    $reservationResult = $patient->makeReservation($pharmacy_id, $uploadResult['file_path'], $notes);

    echo json_encode([
        "status"         => "success",
        "message"        => "Prescription reservation created successfully. Pharmacists will review it shortly.",
        "reservation_id" => $reservationResult['reservation_id']
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "System error: " . $e->getMessage()]);
}
?>

