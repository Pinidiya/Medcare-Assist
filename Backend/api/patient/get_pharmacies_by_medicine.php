<?php
// patient/get_pharmacies_by_medicine.php - Get pharmacies that stock a given medicine
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

if (!isset($_GET['medicine_id']) || empty($_GET['medicine_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_id parameter is required"]);
    exit();
}

$medicine_id = (int)$_GET['medicine_id'];

try {
    $stmt = $pdo->prepare(
        "SELECT p.pharmacy_id, p.pharmacy_name AS name, p.address, p.district, p.phone,
                p.latitude, p.longitude,
                pi.unit_price, pi.stock_quantity
         FROM pharmacy_inventory pi
         JOIN pharmacies p ON pi.pharmacy_id = p.pharmacy_id
         WHERE pi.medicine_id = :medicine_id
           AND pi.stock_quantity > 0
           AND p.verification_status = 'fully_verified'
         ORDER BY pi.unit_price ASC"
    );
    $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
    $stmt->execute();
    $pharmacies = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $pharmacies]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
