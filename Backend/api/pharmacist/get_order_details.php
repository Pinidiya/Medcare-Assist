<?php
// pharmacist/get_order_details.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

$type = isset($_GET['type']) ? trim($_GET['type']) : '';
$id   = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$id || !in_array($type, ['order', 'reservation'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "type (order|reservation) and id are required"]);
    exit();
}

require_once '../../services/PharmacistService.php';

try {
    $pharmacistService = new PharmacistService($pdo);
    $pharmacist = $pharmacistService->getPharmacistDetails($_SESSION['user_id']);

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Pharmacist not linked to a pharmacy"]);
        exit();
    }

    $pharmacy_id = (int)$pharmacist['pharmacy_id'];
    $result = null;

    if ($type === 'order') {
        $result = $pharmacistService->getOrderDetails($id, $pharmacy_id);
    } else {
        // reservation
        $result = $pharmacistService->getReservationDetails($id, $pharmacy_id);
    }

    if (!$result) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Order not found"]);
        exit();
    }

    echo json_encode(["status" => "success", "data" => $result]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
