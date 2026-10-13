<?php
// api/public/search_medicines.php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/MasterMedicine.php';

$query = isset($_GET['q']) ? trim($_GET['q']) : '';

if (strlen($query) < 2) {
    echo json_encode(["status" => "success", "data" => []]);
    exit();
}

try {
    // By using MasterMedicine::search, it automatically:
    // 1. Only returns medicines actually in stock at verified pharmacies
    // 2. Groups duplicates by brand_name & generic_name
    $results = MasterMedicine::search($query);
    
    echo json_encode(["status" => "success", "data" => $results]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
