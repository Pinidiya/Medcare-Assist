<?php
// patient/get_nearby_pharmacies.php - Get all approved pharmacies, optionally filtered by district
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$district = isset($_GET['district']) ? trim($_GET['district']) : null;

try {
    $sql = "SELECT pharmacy_id, pharmacy_name AS name, address, district, phone, latitude, longitude
            FROM pharmacies
            WHERE verification_status = 'fully_verified'";

    if ($district) {
        $sql .= " AND district = :district";
    }

    $sql .= " ORDER BY pharmacy_name ASC";

    $stmt = $pdo->prepare($sql);
    if ($district) {
        $stmt->bindParam(':district', $district);
    }
    $stmt->execute();
    $pharmacies = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $pharmacies]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
