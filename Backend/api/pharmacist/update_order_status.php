<?php
// pharmacist/update_order_status.php
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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->order_id) || !isset($data->status)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id and status are required"]);
    exit();
}

$order_id  = (int)$data->order_id;
$new_status = trim($data->status);
$valid = ['pending','processing','ready_for_pickup','completed','cancelled'];

if (!in_array($new_status, $valid)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid status value"]);
    exit();
}

try {
    // SECURITY: Ensure pharmacist can only update orders for their pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();
    
    if (!$pharmacist) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Pharmacist profile not found"]));
    }

    $stmt = $pdo->prepare("UPDATE orders SET status = :status WHERE order_id = :id AND pharmacy_id = :phid");
    $stmt->execute([
        ':status' => $new_status,
        ':id' => $order_id,
        ':phid' => $pharmacist['pharmacy_id']
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status"  => "success",
            "message" => "Order status updated to " . str_replace('_', ' ', $new_status)
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Order not found or unauthorized"
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
