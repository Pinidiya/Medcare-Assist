<?php
// stock/get_current_selling_price.php
// FEFO Logic: Returns the batch that should be dispensed next
// (First Expire, First Out — earliest non-expired batch with stock > 0)
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

if (!isset($_GET['medicine_id']) || empty($_GET['medicine_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_id query parameter is required"]);
    exit();
}

$medicine_id = (int)$_GET['medicine_id'];

try {
    // Resolve pharmacy_id
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Not linked to any pharmacy"]);
        exit();
    }

    $pid = (int)$staff['pharmacy_id'];

    // FEFO: First Expire, First Out
    // Get the batch with earliest expiry that still has stock and hasn't expired
    $stmt = $pdo->prepare("
        SELECT 
            mb.batch_id,
            mb.batch_number,
            mb.selling_price,
            mb.quantity_in_stock,
            mb.expiry_date,
            mm.brand_name,
            mm.generic_name
        FROM medicine_batches mb
        JOIN master_medicines mm ON mb.medicine_id = mm.medicine_id
        WHERE mb.pharmacy_id = :pid
          AND mb.medicine_id = :mid
          AND mb.quantity_in_stock > 0
          AND mb.expiry_date >= CURDATE()
        ORDER BY mb.expiry_date ASC
        LIMIT 1
    ");
    $stmt->bindParam(':pid', $pid, PDO::PARAM_INT);
    $stmt->bindParam(':mid', $medicine_id, PDO::PARAM_INT);
    $stmt->execute();
    $batch = $stmt->fetch();

    if (!$batch) {
        echo json_encode([
            "status"  => "success",
            "data"    => null,
            "message" => "No valid batch found for this medicine (all expired or out of stock)"
        ]);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "data"   => [
            "batch_id"          => (int)$batch['batch_id'],
            "batch_number"      => $batch['batch_number'],
            "selling_price"     => (float)$batch['selling_price'],
            "quantity_in_stock" => (int)$batch['quantity_in_stock'],
            "expiry_date"       => $batch['expiry_date'],
            "brand_name"        => $batch['brand_name'],
            "generic_name"      => $batch['generic_name']
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

