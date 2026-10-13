<?php
// pharmacist/dispense.php
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

if (!isset($data['order_id']) || empty($data['order_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Order ID is required"]);
    exit();
}

$order_id = (int)$data['order_id'];

try {
    // Get pharmacist's pharmacy_id from database
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();
    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Pharmacist not linked to any pharmacy"]);
        exit();
    }
    $pharmacy_id = (int)$pharmacist['pharmacy_id'];

    $pdo->beginTransaction();

    // 1. Get all items in this order
    $stmt = $pdo->prepare("SELECT medicine_id, quantity FROM order_items WHERE order_id = :oid");
    $stmt->execute([':oid' => $order_id]);
    $items = $stmt->fetchAll();

    foreach ($items as $item) {
        $med_id = $item['medicine_id'];
        $qty_needed = $item['quantity'];

        // 2. Fetch available batches for this medicine in this pharmacy, ordered by expiry_date ASC (FEFO)
        $batchStmt = $pdo->prepare(
            "SELECT batch_id, quantity 
             FROM batches 
             WHERE medicine_id = :mid AND pharmacy_id = :phid AND quantity > 0 
             ORDER BY expiry_date ASC"
        );
        $batchStmt->execute([':mid' => $med_id, ':phid' => $pharmacy_id]);
        $batches = $batchStmt->fetchAll();

        // 3. Deduct quantity across batches
        foreach ($batches as $batch) {
            if ($qty_needed <= 0) break;

            if ($batch['quantity'] >= $qty_needed) {
                $new_qty = $batch['quantity'] - $qty_needed;
                $updateStmt = $pdo->prepare("UPDATE batches SET quantity = :qty WHERE batch_id = :bid");
                $updateStmt->execute([':qty' => $new_qty, ':bid' => $batch['batch_id']]);
                $qty_needed = 0;
            } else {
                $qty_needed -= $batch['quantity'];
                $updateStmt = $pdo->prepare("UPDATE batches SET quantity = 0 WHERE batch_id = :bid");
                $updateStmt->execute([':bid' => $batch['batch_id']]);
            }
        }

        // If we still need more, it means insufficient stock overall for this item
        if ($qty_needed > 0) {
            throw new Exception("Insufficient stock for Medicine ID: $med_id");
        }
    }

    // 4. Update order status to Completed
    $completeStmt = $pdo->prepare("UPDATE orders SET status = 'Completed' WHERE order_id = :oid AND pharmacy_id = :phid");
    $completeStmt->execute([':oid' => $order_id, ':phid' => $pharmacy_id]);

    $pdo->commit();

    echo json_encode(["status" => "success", "message" => "Order dispensed successfully using FEFO"]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>