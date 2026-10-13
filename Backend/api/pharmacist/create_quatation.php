<?php
// pharmacist/create_quotation.php
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
$items = isset($data['items']) ? $data['items'] : []; // Array of {medicine_id, quantity, unit_price, item_type}

if (!$order_id || empty($items)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid order_id and items are required"]);
    exit();
}

try {
    // SECURITY: Ensure pharmacist can only create quotations for their pharmacy
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();
    
    if (!$pharmacist) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Pharmacist profile not found"]));
    }

    $ord_stmt = $pdo->prepare("SELECT pharmacy_id FROM orders WHERE order_id = :oid LIMIT 1");
    $ord_stmt->execute([':oid' => $order_id]);
    $order = $ord_stmt->fetch();

    if (!$order || (int)$order['pharmacy_id'] !== (int)$pharmacist['pharmacy_id']) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Order not found or unauthorized"]));
    }

    $pdo->beginTransaction();

    // Delete existing items for this order to recreate the quotation
    $delStmt = $pdo->prepare("DELETE FROM order_items WHERE order_id = :oid");
    $delStmt->execute([':oid' => $order_id]);

    $total_amount = 0;
    $insertStmt = $pdo->prepare(
        "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
         VALUES (:oid, :mid, :qty, :price, :type)"
    );

    foreach ($items as $item) {
        $mid = (int)$item['medicine_id'];
        $qty = (int)$item['quantity'];
        $price = (float)$item['unit_price'];
        $type = in_array($item['item_type'], ['prescribed', 'manual_otc']) ? $item['item_type'] : 'prescribed';
        
        $total_amount += ($qty * $price);

        $insertStmt->execute([
            ':oid' => $order_id,
            ':mid' => $mid,
            ':qty' => $qty,
            ':price' => $price,
            ':type' => $type
        ]);
    }

    // Update order status to Quoted and set total amount
    $updateStmt = $pdo->prepare(
        "UPDATE orders SET status = 'Quoted', total_amount = :total WHERE order_id = :oid"
    );
    $updateStmt->execute([':total' => $total_amount, ':oid' => $order_id]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Quotation created successfully. Order status updated to Quoted.",
        "total_amount" => $total_amount
    ]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
