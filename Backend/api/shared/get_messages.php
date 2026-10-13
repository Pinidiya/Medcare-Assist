<?php
// shared/get_messages.php
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

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id is required"]);
    exit();
}

try {
    // SECURITY: Authorization check
    $order_stmt = $pdo->prepare("SELECT patient_id, pharmacy_id FROM orders WHERE order_id = :oid");
    $order_stmt->execute([':oid' => $order_id]);
    $order = $order_stmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Order not found"]);
        exit();
    }

    if ($_SESSION['role'] === 'patient') {
        $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
        $p_stmt->execute([':uid' => $_SESSION['user_id']]);
        $patient = $p_stmt->fetch();
        if (!$patient || (int)$patient['patient_id'] !== (int)$order['patient_id']) {
            http_response_code(403);
            die(json_encode(["status" => "error", "message" => "Unauthorized to view this chat"]));
        }
    } else if ($_SESSION['role'] === 'pharmacist' || $_SESSION['role'] === 'pharmacy_owner') {
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid1 UNION SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid2 LIMIT 1");
        $ph_stmt->execute([':uid1' => $_SESSION['user_id'], ':uid2' => $_SESSION['user_id']]);
        $pharmacy = $ph_stmt->fetch();
        if (!$pharmacy || (int)$pharmacy['pharmacy_id'] !== (int)$order['pharmacy_id']) {
            http_response_code(403);
            die(json_encode(["status" => "error", "message" => "Unauthorized to view this chat"]));
        }
    } else {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized role"]));
    }

    $stmt = $pdo->prepare(
        "SELECT * FROM order_messages WHERE order_id = :oid ORDER BY created_at ASC"
    );
    $stmt->execute([':oid' => $order_id]);
    $messages = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data" => $messages
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
