<?php
// stock/get_master_medicines.php - Used by stock manager to pick from master DB
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

try {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    if (!empty($search)) {
        $stmt = $pdo->prepare(
            "SELECT medicine_id, brand_name, generic_name, category, requires_prescription
             FROM master_medicines
             WHERE is_active = 1
               AND (brand_name LIKE :s OR generic_name LIKE :s OR category LIKE :s)
             ORDER BY brand_name ASC
             LIMIT 50"
        );
        $like = '%' . $search . '%';
        $stmt->bindParam(':s', $like);
    } else {
        $stmt = $pdo->prepare(
            "SELECT medicine_id, brand_name, generic_name, category, requires_prescription
             FROM master_medicines
             WHERE is_active = 1
             ORDER BY brand_name ASC
             LIMIT 100"
        );
    }

    $stmt->execute();
    $medicines = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $medicines]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

