<?php
// pharmacist/search_inventory.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

// Verify pharmacist session

$query = isset($_GET['q']) ? trim($_GET['q']) : '';

if (strlen($query) < 1) {
    echo json_encode(["status" => "success", "data" => []]);
    exit();
}

try {
    // Get pharmacist pharmacy_id
    $stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $stmt->fetch();

    $pharmacy_id = ($pharmacist && $pharmacist['pharmacy_id']) ? (int)$pharmacist['pharmacy_id'] : null;

    $search_term = "%$query%";
    $results = [];

    // First try pharmacy_inventory (medicines stocked at this pharmacy) if linked
    if ($pharmacy_id) {
        $sql = "SELECT pi.inventory_id, pi.stock_quantity, pi.unit_price, pi.expiry_date,
                       mm.medicine_id, mm.brand_name, mm.generic_name, mm.category, mm.requires_prescription
                FROM pharmacy_inventory pi
                JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
                WHERE pi.pharmacy_id = :phid 
                  AND pi.stock_quantity > 0
                  AND (mm.brand_name LIKE :q1 OR mm.generic_name LIKE :q2)
                ORDER BY mm.brand_name ASC
                LIMIT 30";

        $search_stmt = $pdo->prepare($sql);
        $search_stmt->execute([
            ':phid' => $pharmacy_id,
            ':q1'   => $search_term,
            ':q2'   => $search_term
        ]);
        $results = $search_stmt->fetchAll();
    }

    echo json_encode([
        "status" => "success",
        "data"   => $results
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>