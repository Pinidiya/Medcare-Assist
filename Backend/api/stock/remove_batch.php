<?php
// stock/remove_batch.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->batch_id) || empty($data->batch_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "batch_id is required"]);
    exit();
}

$batch_id = (int)$data->batch_id;

try {
    $pdo->beginTransaction();

    // Resolve pharmacy_id
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        throw new Exception("You are not linked to any active pharmacy");
    }
    $pharmacy_id = (int)$staff['pharmacy_id'];

    // Get batch details
    $batch_check = $pdo->prepare("SELECT medicine_id, quantity_in_stock FROM medicine_batches WHERE batch_id = :bid AND pharmacy_id = :pid");
    $batch_check->bindParam(':bid', $batch_id, PDO::PARAM_INT);
    $batch_check->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $batch_check->execute();
    $batch = $batch_check->fetch();

    if (!$batch) {
        throw new Exception("Batch not found or unauthorized");
    }

    $medicine_id = $batch['medicine_id'];

    // Delete batch
    $del_batch = $pdo->prepare("DELETE FROM medicine_batches WHERE batch_id = :bid AND pharmacy_id = :pid");
    $del_batch->bindParam(':bid', $batch_id, PDO::PARAM_INT);
    $del_batch->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $del_batch->execute();

    // Recalculate stock for this medicine
    $recalc = $pdo->prepare("SELECT COALESCE(SUM(quantity_in_stock), 0) as total_qty FROM medicine_batches WHERE pharmacy_id = :pid AND medicine_id = :mid");
    $recalc->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $recalc->bindParam(':mid', $medicine_id, PDO::PARAM_INT);
    $recalc->execute();
    $new_qty = (int)$recalc->fetch()['total_qty'];

    // Update inventory
    $update_inv = $pdo->prepare("UPDATE pharmacy_inventory SET stock_quantity = :qty WHERE pharmacy_id = :pid AND medicine_id = :mid");
    $update_inv->bindParam(':qty', $new_qty, PDO::PARAM_INT);
    $update_inv->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $update_inv->bindParam(':mid', $medicine_id, PDO::PARAM_INT);
    $update_inv->execute();

    $pdo->commit();

    echo json_encode(["status" => "success", "message" => "Batch removed successfully"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

