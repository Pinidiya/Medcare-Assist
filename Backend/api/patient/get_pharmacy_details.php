<?php
// backend/api/patient/get_pharmacy_details.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Pharmacy ID is required"]);
    exit();
}

$pharmacy_id = (int)$_GET['id'];

try {
    $stmt = $pdo->prepare("
        SELECT pharmacy_id, pharmacy_name, address, district, phone, verification_status, latitude, longitude
        FROM pharmacies
        WHERE pharmacy_id = :id AND verification_status = 'fully_verified'
    ");
    $stmt->bindParam(':id', $pharmacy_id);
    $stmt->execute();
    
    $pharmacy = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($pharmacy) {
        echo json_encode(["status" => "success", "data" => $pharmacy]);
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Pharmacy not found or not verified"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
