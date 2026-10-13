<?php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once '../../config/db.php';
require_once '../../models/Admin.php';

// Check if the user is an admin

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$raw_data = file_get_contents("php://input");
$data = json_decode($raw_data);

if (!isset($data->brand_name) || !isset($data->generic_name) || !isset($data->category)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "brand_name, generic_name, and category are required"]);
    exit();
}

$brand_name   = trim($data->brand_name);
$generic_name = trim($data->generic_name);
$category     = trim($data->category);

if (isset($data->description)) {
    $description = trim($data->description);
} else {
    $description = '';
}

if (isset($data->requires_prescription)) {
    $requires_rx = (int)$data->requires_prescription;
} else {
    $requires_rx = 0; // No prescription needed
}

$clean_data = [
    'brand_name' => $brand_name,
    'generic_name' => $generic_name,
    'category' => $category,
    'description' => $description,
    'requires_prescription' => $requires_rx,
    'requires_rx' => $requires_rx 
];

try {
    // Call the Admin model to add the medicine to the database
    $medicine_id = Admin::addMasterMedicine($clean_data);

    echo json_encode([
        "status"      => "success",
        "message"     => "Medicine added to master database",
        "medicine_id" => $medicine_id
    ]);
} catch (Exception $e) {
    // If something goes wrong, send a 500 Internal Server Error
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
