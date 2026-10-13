<?php
// stock/add_medicine.php
// Adds a medicine from master_medicines to pharmacy_inventory with 0 stock
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

if (!isset($data->medicine_id) || empty($data->medicine_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_id is required"]);
    exit();
}

$medicine_id = (int)$data->medicine_id;

try {
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

    // Verify medicine exists
    $med_check = $pdo->prepare("SELECT medicine_id FROM master_medicines WHERE medicine_id = :id AND is_active = 1");
    $med_check->bindParam(':id', $medicine_id, PDO::PARAM_INT);
    $med_check->execute();
    if (!$med_check->fetch()) {
        throw new Exception("Medicine not found in master database");
    }

    // Insert into pharmacy_inventory (IGNORE if already exists)
    $inv_stmt = $pdo->prepare("
        INSERT IGNORE INTO pharmacy_inventory (pharmacy_id, medicine_id, stock_quantity, unit_price, expiry_date)
        VALUES (:pharmacy_id, :medicine_id, 0, 0.00, NULL)
    ");
    $inv_stmt->execute([
        ':pharmacy_id' => $pharmacy_id,
        ':medicine_id' => $medicine_id
    ]);

    if ($inv_stmt->rowCount() > 0) {
        echo json_encode(["status" => "success", "message" => "Medicine added to inventory successfully"]);
    } else {
        echo json_encode(["status" => "success", "message" => "Medicine is already in your inventory"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

