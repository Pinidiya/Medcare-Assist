<?php
// patient/get_reservations.php
require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/Reservation.php';

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    
    if (!$patient) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $reservations = $patient->getReservations();

    echo json_encode([
        "status" => "success",
        "data"   => $reservations
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "System error: " . $e->getMessage()]);
}
?>

