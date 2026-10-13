<?php
// stock/update_inventory.php - Add or update a medicine in pharmacy inventory
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

if (!isset($data->medicine_id) || !isset($data->stock_quantity) || !isset($data->unit_price)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_id, stock_quantity, and unit_price are required"]);
    exit();
}

$medicine_id      = (int)$data->medicine_id;
$stock_quantity   = (int)$data->stock_quantity;
$unit_price       = (float)$data->unit_price;
$expiry_date      = isset($data->expiry_date) ? trim($data->expiry_date) : null;
$low_threshold    = isset($data->low_stock_threshold) ? (int)$data->low_stock_threshold : 20;

try {
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id']);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Not linked to any pharmacy"]);
        exit();
    }

    $pharmacy_id = $staff['pharmacy_id'];

    // Verify medicine exists in master DB
    $med_check = $pdo->prepare("SELECT medicine_id FROM master_medicines WHERE medicine_id = :id AND is_active = 1");
    $med_check->bindParam(':id', $medicine_id);
    $med_check->execute();
    if (!$med_check->fetch()) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Medicine not found in master database"]);
        exit();
    }

    // UPSERT using INSERT ... ON DUPLICATE KEY UPDATE
    $stmt = $pdo->prepare(
        "INSERT INTO pharmacy_inventory (pharmacy_id, medicine_id, stock_quantity, unit_price, expiry_date, low_stock_threshold)
         VALUES (:pid, :mid, :qty, :price, :expiry, :threshold)
         ON DUPLICATE KEY UPDATE
           stock_quantity = VALUES(stock_quantity),
           unit_price = VALUES(unit_price),
           expiry_date = VALUES(expiry_date),
           low_stock_threshold = VALUES(low_stock_threshold)"
    );
    $stmt->bindParam(':pid',       $pharmacy_id);
    $stmt->bindParam(':mid',       $medicine_id);
    $stmt->bindParam(':qty',       $stock_quantity);
    $stmt->bindParam(':price',     $unit_price);
    $stmt->bindParam(':expiry',    $expiry_date);
    $stmt->bindParam(':threshold', $low_threshold);
    $stmt->execute();

    echo json_encode([
        "status"  => "success",
        "message" => "Inventory updated successfully"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

