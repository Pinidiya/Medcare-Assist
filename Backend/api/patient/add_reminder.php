<?php
// backend/api/patient/add_reminder.php
require_once 'patient_auth.php';

require_once '../../models/Patient.php';
require_once '../../models/Reminder.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (is_array($input)) {
    $medicine_name = trim($input['medicine_name'] ?? '');
    $frequency     = trim($input['frequency'] ?? '');
    $start_time    = trim($input['start_time'] ?? '');
    $end_date      = !empty($input['end_date']) ? trim($input['end_date']) : null;
} else {
    $medicine_name = trim($_POST['medicine_name'] ?? '');
    $frequency     = trim($_POST['frequency'] ?? '');
    $start_time    = trim($_POST['start_time'] ?? '');
    $end_date      = !empty($_POST['end_date']) ? trim($_POST['end_date']) : null;
}

if (empty($medicine_name) || empty($frequency) || empty($start_time)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_name, frequency, and start_time are required"]);
    exit();
}

try {
    $patient = Patient::findByUserId($_SESSION['user_id']);
    if (!$patient) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Patient not found"]);
        exit();
    }

    $reminder = Reminder::setReminder($patient->getPatientId(), $medicine_name, $start_time, $frequency, $end_date);
    
    echo json_encode([
        "status" => "success", 
        "message" => "Reminder added successfully",
        "data" => $reminder->toArray()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "System error: " . $e->getMessage()]);
}
?>

