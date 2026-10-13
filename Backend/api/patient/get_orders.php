<?php
// patient/get_orders.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/Database.php';
require_once '../../models/Order.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

try {
    $orders = Order::getActiveOrdersByPatient($_SESSION['user_id']);

    echo json_encode([
        "status" => "success",
        "data" => $orders
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
