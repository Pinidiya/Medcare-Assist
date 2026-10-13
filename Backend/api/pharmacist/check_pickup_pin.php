<?php
// pharmacist/check_pickup_pin.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$order_id = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$pin = isset($data['pin']) ? trim($data['pin']) : '';

if (!$order_id || empty($pin)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid order_id and pin are required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("
        SELECT o.pickup_pin, o.status, u.full_name, u.email, p.phone_number, p.address
        FROM orders o
        JOIN users u ON o.patient_id = u.user_id
        LEFT JOIN patients p ON u.user_id = p.user_id
        WHERE o.order_id = :oid
    ");
    $stmt->execute([':oid' => $order_id]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Order not found"]);
        exit();
    }

    if ($order['status'] !== 'Reserved') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Order is not in Reserved status"]);
        exit();
    }

    if ($order['pickup_pin'] !== $pin) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid PIN. Verification failed."]);
        exit();
    }

    // PIN is correct, fetch ordered items
    $itemsStmt = $pdo->prepare(
        "SELECT oi.quantity, m.brand_name, m.generic_name
         FROM order_items oi
         JOIN master_medicines m ON oi.medicine_id = m.medicine_id
         WHERE oi.order_id = :oid"
    );
    $itemsStmt->execute([':oid' => $order_id]);
    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $items,
        "patient" => [
            "name" => $order['full_name'],
            "email" => $order['email'],
            "phone" => $order['phone_number'] ?? 'N/A',
            "address" => $order['address'] ?? 'N/A'
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>