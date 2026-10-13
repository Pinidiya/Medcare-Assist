<?php
// stock/remove_medicine_inventory.php
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

    // 1. Delete all batches for this medicine
    $del_batches = $pdo->prepare("DELETE FROM medicine_batches WHERE pharmacy_id = :pid AND medicine_id = :mid");
    $del_batches->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $del_batches->bindParam(':mid', $medicine_id, PDO::PARAM_INT);
    $del_batches->execute();

    // 2. Delete from pharmacy_inventory
    $del_inv = $pdo->prepare("DELETE FROM pharmacy_inventory WHERE pharmacy_id = :pid AND medicine_id = :mid");
    $del_inv->bindParam(':pid', $pharmacy_id, PDO::PARAM_INT);
    $del_inv->bindParam(':mid', $medicine_id, PDO::PARAM_INT);
    $del_inv->execute();

    $pdo->commit();

    echo json_encode(["status" => "success", "message" => "Medicine and all its batches were removed successfully"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

