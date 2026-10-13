<?php
// pharmacist/verify_pickup.php
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
    $stmt = $pdo->prepare("SELECT pickup_pin, status FROM orders WHERE order_id = :oid");
    $stmt->execute([':oid' => $order_id]);
    $order = $stmt->fetch();

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

    $updateStmt = $pdo->prepare("UPDATE orders SET status = 'completed' WHERE order_id = :oid");
    $updateStmt->execute([':oid' => $order_id]);

    // Cross-completion: Update linked reservation
    $stmt_notes = $pdo->prepare("SELECT notes FROM orders WHERE order_id = :oid");
    $stmt_notes->execute([':oid' => $order_id]);
    $order_notes = $stmt_notes->fetchColumn();
    if ($order_notes && preg_match('/Created from Reservation #(\d+)/', $order_notes, $matches)) {
        $linked_res_id = (int)$matches[1];
        $up_res = $pdo->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid");
        $up_res->execute([':rid' => $linked_res_id]);
    }

    echo json_encode([
        "status" => "success",
        "message" => "PIN verified successfully. Order and linked reservation completed."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>