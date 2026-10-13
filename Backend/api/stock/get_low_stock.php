<?php
// stock/get_low_stock.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

try {
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id']);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        echo json_encode(["status" => "success", "data" => [], "count" => 0]);
        exit();
    }

    $pid = $staff['pharmacy_id'];

    $stmt = $pdo->prepare(
        "SELECT pi.inventory_id, pi.stock_quantity, pi.low_stock_threshold,
                pi.unit_price, pi.expiry_date,
                mm.brand_name, mm.generic_name, mm.category,
                CASE WHEN pi.stock_quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END AS alert_type
         FROM pharmacy_inventory pi
         JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
         WHERE pi.pharmacy_id = :pid
           AND pi.stock_quantity <= pi.low_stock_threshold
         ORDER BY pi.stock_quantity ASC"
    );
    $stmt->bindParam(':pid', $pid);
    $stmt->execute();
    $alerts = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data"   => $alerts,
        "count"  => count($alerts)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

