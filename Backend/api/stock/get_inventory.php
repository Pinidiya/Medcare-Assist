<?php
// stock/get_inventory.php
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
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $pid    = $staff['pharmacy_id'];
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $sql = "SELECT pi.inventory_id, pi.stock_quantity, pi.unit_price,
                   pi.expiry_date, pi.low_stock_threshold, pi.updated_at,
                   mm.medicine_id, mm.brand_name, mm.generic_name, mm.category,
                   mm.requires_prescription,
                   CASE
                     WHEN pi.stock_quantity = 0 THEN 'out_of_stock'
                     WHEN pi.stock_quantity <= pi.low_stock_threshold THEN 'low_stock'
                     ELSE 'in_stock'
                   END AS stock_status
            FROM pharmacy_inventory pi
            JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
            WHERE pi.pharmacy_id = :pid";

    if (!empty($search)) {
        $sql .= " AND (mm.brand_name LIKE :s OR mm.generic_name LIKE :s OR mm.category LIKE :s)";
    }
    $sql .= " ORDER BY mm.brand_name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid);
    if (!empty($search)) {
        $like = '%' . $search . '%';
        $stmt->bindParam(':s', $like);
    }
    $stmt->execute();
    $inventory = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $inventory, "pharmacy_id" => $pid]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

