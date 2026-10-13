<?php
// shared/check_duplicate_medicine.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once __DIR__ . '/../../config/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$order_id = isset($_GET['order_id']) ? (int)$_GET['order_id'] : 0;
$medicine_id = isset($_GET['medicine_id']) ? (int)$_GET['medicine_id'] : 0;

if (!$order_id || !$medicine_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id and medicine_id are required"]);
    exit();
}

try {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) as count 
         FROM order_items 
         WHERE order_id = :oid AND medicine_id = :mid AND item_type = 'manual_otc'"
    );
    $stmt->execute([':oid' => $order_id, ':mid' => $medicine_id]);
    $result = $stmt->fetch();

    $is_duplicate = ($result['count'] > 0);

    echo json_encode([
        "status" => "success",
        "is_duplicate" => $is_duplicate,
        "message" => $is_duplicate ? "Warning: Patient has already requested this item manually." : "Clear"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
