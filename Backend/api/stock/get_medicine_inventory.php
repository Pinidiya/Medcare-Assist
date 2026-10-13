<?php
// stock/get_medicine_inventory.php
// Returns inventory based on pharmacy_inventory table
// Columns: medicine_id, brand_name, generic_name, category, total_stock, status
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

try {
    // Resolve pharmacy_id
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $pid = (int)$staff['pharmacy_id'];

    $sql = "SELECT 
                pi.medicine_id,
                mm.brand_name,
                mm.generic_name,
                mm.category,
                mm.requires_prescription,
                COALESCE(pi.stock_quantity, 0) AS total_stock,
                CASE
                    WHEN COALESCE(pi.stock_quantity, 0) = 0 THEN 'out_of_stock'
                    WHEN COALESCE(pi.stock_quantity, 0) < 20 THEN 'low_stock'
                    ELSE 'in_stock'
                END AS status
            FROM pharmacy_inventory pi
            JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
            WHERE pi.pharmacy_id = :pid
            ORDER BY mm.brand_name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid, PDO::PARAM_INT);
    $stmt->execute();
    $inventory = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data"   => $inventory
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

