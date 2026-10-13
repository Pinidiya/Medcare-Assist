<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacy_owner();

require_once '../../config/db.php';
require_once '../../models/PharmacyOwner.php';

// Verify that the user is a pharmacy owner

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input);

if (!isset($data->slmc_number)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "slmc_number is required"]);
    exit();
}

$slmc_number = trim($data->slmc_number);
$owner_id = (int)$_SESSION['user_id'];

try {
    $result = PharmacyOwner::linkPharmacist($owner_id, $slmc_number);
    
    if ($result['status'] == false) {
        http_response_code($result['code']);
        echo json_encode(["status" => "error", "message" => $result['message']]);
        exit();
    }
    
    echo json_encode([
        "status" => "success",
        "message" => $result['message']
    ]);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
