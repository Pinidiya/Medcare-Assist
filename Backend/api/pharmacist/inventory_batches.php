<?php
// pharmacist/inventory_batches.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Get pharmacist's pharmacy_id
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $ph_stmt->fetch();
    if (!$pharmacist) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Pharmacist profile not found"]);
        exit();
    }
    $pharmacy_id = $pharmacist['pharmacy_id'];
    if ($method === 'GET') {
        $stmt = $pdo->prepare(
            "SELECT b.*, m.brand_name, m.generic_name 
             FROM batches b
             JOIN master_medicines m ON b.medicine_id = m.medicine_id
             WHERE b.pharmacy_id = :phid
             ORDER BY b.expiry_date ASC"
        );
        $stmt->execute([':phid' => $pharmacy_id]);
        $batches = $stmt->fetchAll();
        
        echo json_encode(["status" => "success", "data" => $batches]);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['medicine_id'], $data['batch_number'], $data['expiry_date'], $data['quantity'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "medicine_id, batch_number, expiry_date, and quantity are required"]);
            exit();
        }
        $med_id = $data['medicine_id'];
        $batch_no = $data['batch_number'];
        $exp_date = $data['expiry_date'];
        $qty = $data['quantity'];

        $stmt = $pdo->prepare(
            "INSERT INTO batches (medicine_id, pharmacy_id, batch_number, expiry_date, quantity)
             VALUES (:mid, :phid, :bno, :exp, :qty)"
        );
        $stmt->execute([
            ':mid' => $med_id,
            ':phid' => $pharmacy_id,
            ':bno' => $batch_no,
            ':exp' => $exp_date,
            ':qty' => $qty
        ]);
        
        echo json_encode(["status" => "success", "message" => "Batch added successfully"]);
    }
    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['batch_id'], $data['quantity'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "batch_id and quantity are required"]);
            exit();
        }
        $batch_id = $data['batch_id'];
        $qty = $data['quantity'];

        $stmt = $pdo->prepare("UPDATE batches SET quantity = :qty WHERE batch_id = :bid AND pharmacy_id = :phid");
        $stmt->execute([':qty' => $qty, ':bid' => $batch_id, ':phid' => $pharmacy_id]);

        echo json_encode(["status" => "success", "message" => "Batch quantity updated"]);
    }
    elseif ($method === 'DELETE') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['batch_id'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "batch_id is required"]);
            exit();
        }
        $batch_id = $data['batch_id'];

        $stmt = $pdo->prepare("DELETE FROM batches WHERE batch_id = :bid AND pharmacy_id = :phid");
        $stmt->execute([':bid' => $batch_id, ':phid' => $pharmacy_id]);

        echo json_encode(["status" => "success", "message" => "Batch deleted"]);
    }
    else {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        exit();
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>