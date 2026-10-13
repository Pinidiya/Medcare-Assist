<?php
// shared/get_quotation.php
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
            die(json_encode(["status" => "error", "message" => "Unauthorized to view this quotation"]));
        }
    } else if ($_SESSION['role'] === 'pharmacist' || $_SESSION['role'] === 'pharmacy_owner') {
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid1 UNION SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid2 LIMIT 1");
        $ph_stmt->execute([':uid1' => $_SESSION['user_id'], ':uid2' => $_SESSION['user_id']]);
        $pharmacy = $ph_stmt->fetch();
        if (!$pharmacy || (int)$pharmacy['pharmacy_id'] !== (int)$order['pharmacy_id']) {
            http_response_code(403);
            die(json_encode(["status" => "error", "message" => "Unauthorized to view this quotation"]));
        }
    } else {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized role"]));
    }

    $stmt = $pdo->prepare(
        "SELECT oi.*, m.brand_name as medicine_name, m.generic_name 
         FROM order_items oi
         JOIN master_medicines m ON oi.medicine_id = m.medicine_id
         WHERE oi.order_id = :oid"
    );
    $stmt->execute([':oid' => $order_id]);
    $items = $stmt->fetchAll();

    $quotation = [
        'prescribed' => [],
        'manual_otc' => [],
        'prescribed_total' => 0,
        'manual_otc_total' => 0,
        'grand_total' => 0
    ];

    foreach ($items as $item) {
        $subtotal = $item['quantity'] * $item['unit_price'];
        $item['subtotal'] = $subtotal;
        
        if ($item['item_type'] === 'prescribed') {
            $quotation['prescribed'][] = $item;
            $quotation['prescribed_total'] += $subtotal;
        } else {
            $quotation['manual_otc'][] = $item;
            $quotation['manual_otc_total'] += $subtotal;
        }
    }

    $quotation['grand_total'] = $quotation['prescribed_total'] + $quotation['manual_otc_total'];

    echo json_encode([
        "status" => "success",
        "data" => $quotation
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
