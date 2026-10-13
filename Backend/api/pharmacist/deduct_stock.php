<?php
// backend/api/pharmacist/deduct_stock.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

  // Fetch batches using FEFO (First Expire, First Out)
        // We use FOR UPDATE to lock the rows during transaction to prevent race conditions

        

// Verify pharmacist session

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->items) || !is_array($data->items)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid payload, 'items' array is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist is not linked to a pharmacy"]);
        exit();
    }
    
    $pharmacy_id = $pharmacist['pharmacy_id'];

    // Begin Transaction for strict concurrency control
    $pdo->beginTransaction();

    foreach ($data->items as $item) {
        $medicine_id = (int)$item->medicine_id;
        $requested_qty = (int)$item->requested_quantity;

        if ($requested_qty <= 0) continue;

        // Fetch batches using FEFO (First Expire, First Out)
        // We use FOR UPDATE to lock the rows during transaction to prevent race conditions
        $batch_stmt = $pdo->prepare(
            "SELECT batch_id, quantity_in_stock 
             FROM medicine_batches 
             WHERE pharmacy_id = :phid 
               AND medicine_id = :mid 
               AND quantity_in_stock > 0 
             ORDER BY expiry_date ASC 
             FOR UPDATE"
        );
        $batch_stmt->execute([
            ':phid' => $pharmacy_id,
            ':mid'  => $medicine_id
        ]);
        
        $batches = $batch_stmt->fetchAll();
        $remaining_to_deduct = $requested_qty;

        foreach ($batches as $batch) {
            if ($remaining_to_deduct <= 0) break;

            $batch_id = $batch['batch_id'];
            $available_in_batch = (int)$batch['quantity_in_stock'];

            if ($available_in_batch <= $remaining_to_deduct) {
                // Deduct entire batch
                $deduct_stmt = $pdo->prepare("UPDATE medicine_batches SET quantity_in_stock = 0 WHERE batch_id = :bid");
                $deduct_stmt->execute([':bid' => $batch_id]);
                $remaining_to_deduct -= $available_in_batch;
            } else {
                // Deduct partial batch
                $deduct_stmt = $pdo->prepare("UPDATE medicine_batches SET quantity_in_stock = quantity_in_stock - :deduct WHERE batch_id = :bid");
                $deduct_stmt->execute([
                    ':deduct' => $remaining_to_deduct,
                    ':bid' => $batch_id
                ]);
                $remaining_to_deduct = 0;
            }
        }

        // If after looping all batches we still have items to deduct, we don't have enough stock
        if ($remaining_to_deduct > 0) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "Insufficient stock for medicine ID: {$medicine_id}. Short by: {$remaining_to_deduct}"
            ]);
            exit();
        }

        // Update the aggregated pharmacy_inventory stock_quantity to keep it synced
        $inv_update = $pdo->prepare(
            "UPDATE pharmacy_inventory 
             SET stock_quantity = stock_quantity - :deducted 
             WHERE pharmacy_id = :phid AND medicine_id = :mid"
        );
        $inv_update->execute([
            ':deducted' => $requested_qty,
            ':phid' => $pharmacy_id,
            ':mid' => $medicine_id
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Stock deducted successfully using FEFO methodology"
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>