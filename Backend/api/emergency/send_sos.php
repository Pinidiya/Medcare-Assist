<?php
session_start();
require_once '../../config/cors.php';
require_once '../../config/db.php';
require_once '../../config/load_env.php';
require_once '../../models/SOSAlert.php';

// Check if user is a patient
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'patient') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Unauthorized access. Patient role required."]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$latitude = isset($input['latitude']) ? (float)$input['latitude'] : null;
$longitude = isset($input['longitude']) ? (float)$input['longitude'] : null;
$patient_id = $_SESSION['user_id'];

if (!$latitude || !$longitude) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Location data (latitude and longitude) is required."]);
    exit();
}

try {
    $pdo->beginTransaction();

    // 1. Record the SOS alert in the database
    $stmt = $pdo->prepare("INSERT INTO sos_alerts (patient_id, latitude, longitude, status) VALUES (?, ?, ?, 'sent')");
    $stmt->execute([$patient_id, $latitude, $longitude]);
    $sos_id = $pdo->lastInsertId();

    // 2. Trigger Alert using Model
    $alertData = SOSAlert::triggerAlert($patient_id, $latitude, $longitude);
    $familyContacts = $alertData['emergency_contacts'];
    $nearestHospitals = $alertData['nearest_hospitals'];
    $userName = $alertData['user_name'];

    // 3. Send SMS using Text.lk API
    $smsToken = getenv('TEXTLK_API_TOKEN');
    if (!$smsToken) {
        $smsToken = "5167|OOEU0qoSLeikBwo1NwiIlYc2uT7xipfDxWvzZDwX9d3165a8"; // Fallback for old configurations
    }
    $smsEndpoint = "https://app.text.lk/api/v3/sms/send";
    $locationUrl = "https://maps.google.com/?q={$latitude},{$longitude}";
    $messageText = "EMERGENCY: {$userName} has triggered an SOS alert via MedCare Assist. Location: {$locationUrl}";

    $smsResults = [];

    if (!empty($familyContacts)) {
        foreach ($familyContacts as $contact) {
            if (strpos($contact, '0') === 0) {
                $contact = '94' . substr($contact, 1);
            }

            $data = [
                'recipient' => $contact,
                'sender_id' => 'TextLKDemo',
                'type' => 'plain',
                'message' => $messageText
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $smsEndpoint);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $smsToken,
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            
            $response = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $smsResults[] = ['contact' => $contact, 'status' => $httpcode, 'response' => $response];
        }
    }

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "SOS alert sent successfully.",
        "data" => [
            "sos_id" => $sos_id,
            "sms_results" => $smsResults,
            "nearest_hospitals" => $nearestHospitals,
            "emergency_numbers" => [
                "ambulance" => "1990",
                "police" => "119",
                "fire" => "110",
                "general" => "112"
            ]
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
