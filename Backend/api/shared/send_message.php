<?php
// shared/send_message.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once __DIR__ . '/../../config/db.php';

/* send massage code line 25 idn pahala thiyenne */


if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$order_id = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$message = isset($data['message']) ? trim($data['message']) : '';
$sender_role = $_SESSION['role'];

if (!$order_id || empty($message)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid order_id and message are required"]);
    exit();
}

// Convert pharmacist/pharmacy_owner to 'pharmacist' for chat logic if needed, 
// but enum is patient or pharmacist.
$mapped_role = ($sender_role === 'patient') ? 'patient' : 'pharmacist';

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
            die(json_encode(["status" => "error", "message" => "Unauthorized to send messages to this chat"]));
        }
    } else if ($_SESSION['role'] === 'pharmacist' || $_SESSION['role'] === 'pharmacy_owner') {
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid1 UNION SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid2 LIMIT 1");
        $ph_stmt->execute([':uid1' => $_SESSION['user_id'], ':uid2' => $_SESSION['user_id']]);
        $pharmacy = $ph_stmt->fetch();
        if (!$pharmacy || (int)$pharmacy['pharmacy_id'] !== (int)$order['pharmacy_id']) {
            http_response_code(403);
            die(json_encode(["status" => "error", "message" => "Unauthorized to send messages to this chat"]));
        }
    } else {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized role"]));
    }

    $stmt = $pdo->prepare(
        "INSERT INTO order_messages (order_id, sender_role, message)
         VALUES (:oid, :role, :msg)"
    );
    $stmt->execute([
        ':oid' => $order_id,
        ':role' => $mapped_role,
        ':msg' => $message
    ]);

    echo json_encode([
        "status" => "success",
        "message" => "Message sent",
        "data" => [
            "message_id" => $pdo->lastInsertId(),
            "sender_role" => $mapped_role,
            "message" => $message,
            "created_at" => date('Y-m-d H:i:s')
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
