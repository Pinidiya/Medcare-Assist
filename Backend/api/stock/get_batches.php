<?php
// stock/get_batches.php — Get all medicine batches for the stock manager's pharmacy
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

try {
    // Get pharmacy_id for this stock manager
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
                mb.batch_id,
                mb.batch_number,
                mb.quantity_in_stock,
                mb.expiry_date,
                mb.created_at,
                mb.selling_price as unit_price,
                mm.medicine_id,
                mm.brand_name,
                mm.generic_name,
                mm.category,
                mm.requires_prescription,
                s.name AS supplier_name
            FROM medicine_batches mb
            JOIN master_medicines mm ON mb.medicine_id = mm.medicine_id
            LEFT JOIN suppliers s ON mb.supplier_id = s.id
            WHERE mb.pharmacy_id = :pid
            ORDER BY mb.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid, PDO::PARAM_INT);
    $stmt->execute();
    $batches = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data"   => $batches,
        "count"  => count($batches)
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

