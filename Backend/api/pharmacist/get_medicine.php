<?php
// backend/api/pharmacist/get_medicines.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

// Verify pharmacist session

try {
    // Get pharmacist details
    $stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist is not linked to a pharmacy"]);
        exit();
    }

    $pharmacy_id = $pharmacist['pharmacy_id'];

    // Group by medicine_id to return the SUM(quantity_in_stock)
    // Pharmacist sees only the aggregated total quantity from all non-expired or available batches.
    $query = "
        SELECT 
            mb.medicine_id, 
            mm.brand_name, 
            mm.generic_name, 
            mm.category,
            SUM(mb.quantity_in_stock) as total_quantity,
            COALESCE(pi.unit_price, 0) as unit_price
        FROM medicine_batches mb
        JOIN master_medicines mm ON mb.medicine_id = mm.medicine_id
        LEFT JOIN pharmacy_inventory pi ON mb.medicine_id = pi.medicine_id AND mb.pharmacy_id = pi.pharmacy_id
        WHERE mb.pharmacy_id = :phid 
          AND mb.quantity_in_stock > 0
        GROUP BY mb.medicine_id
        ORDER BY mm.brand_name ASC
    ";

    $fetch_stmt = $pdo->prepare($query);
    $fetch_stmt->execute([':phid' => $pharmacy_id]);
    $medicines = $fetch_stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data"   => $medicines
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
