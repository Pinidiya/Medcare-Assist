<?php
// pharmacist/get_stock.php
// Returns the current inventory for the pharmacist's pharmacy.
//
// Data source: pharmacy_inventory JOIN master_medicines JOIN medicine_batches
//
// WHY this approach:
//   - pharmacy_inventory holds the AGGREGATE stock count per medicine per pharmacy.
//     It is updated every time the Stock Manager adds a new batch via add_medicine_batch.php.
//   - medicine_batches holds individual FEFO batches; we grab the nearest expiry
//     from it so the pharmacist can see which batch is "next up".
//   - This means as soon as the Stock Manager adds stock, it shows here automatically.
//
// Returns one row per medicine (not per batch), which is what the Inventory table needs.

require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

try {
    // Step 1: Find this pharmacist's pharmacy from the pharmacists table
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $pid    = (int)$staff['pharmacy_id'];
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    // Step 2: Main query — one row per medicine with aggregate stock from pharmacy_inventory
    // The subquery picks the nearest expiry from medicine_batches (FEFO)
    $sql = "SELECT
                pi.inventory_id,
                pi.medicine_id,
                pi.stock_quantity       AS quantity,
                pi.unit_price,
                pi.expiry_date,
                pi.low_stock_threshold,
                pi.updated_at,
                mm.brand_name,
                mm.generic_name,
                mm.category,
                mm.requires_prescription,
                -- Nearest expiry batch number (FEFO: First Expiry, First Out)
                (SELECT mb2.batch_number
                 FROM medicine_batches mb2
                 WHERE mb2.medicine_id = pi.medicine_id
                   AND mb2.pharmacy_id = pi.pharmacy_id
                   AND mb2.quantity_in_stock > 0
                 ORDER BY mb2.expiry_date ASC
                 LIMIT 1
                ) AS batch_number,
                -- Nearest expiry date from active batches
                (SELECT MIN(mb3.expiry_date)
                 FROM medicine_batches mb3
                 WHERE mb3.medicine_id = pi.medicine_id
                   AND mb3.pharmacy_id = pi.pharmacy_id
                   AND mb3.quantity_in_stock > 0
                ) AS nearest_expiry
            FROM pharmacy_inventory pi
            JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
            WHERE pi.pharmacy_id = :pid";

    if (!empty($search)) {
        $sql .= " AND (mm.brand_name LIKE :s OR mm.generic_name LIKE :s2 OR mm.category LIKE :s3)";
    }

    $sql .= " ORDER BY mm.brand_name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid, PDO::PARAM_INT);

    if (!empty($search)) {
        $like = '%' . $search . '%';
        $stmt->bindParam(':s',  $like);
        $stmt->bindParam(':s2', $like);
        $stmt->bindParam(':s3', $like);
    }

    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Step 3: Compute status for each medicine row
    $today = new DateTime();
    $data  = [];

    foreach ($rows as $row) {
        $qty       = (int)$row['quantity'];
        $threshold = (int)($row['low_stock_threshold'] ?? 20);
        $expiry    = $row['nearest_expiry'] ? new DateTime($row['nearest_expiry']) : null;
        $daysLeft  = $expiry ? (int)$today->diff($expiry)->days : 999;
        $isExpired = $expiry && $expiry < $today;

        if ($qty <= 0 || $isExpired) {
            $status = 'out-of-stock';
        } elseif ($daysLeft <= 30) {
            $status = 'expiring-soon';
        } elseif ($qty <= $threshold) {
            $status = $qty <= 5 ? 'critical' : 'low-stock';
        } else {
            $status = 'in-stock';
        }

        $data[] = [
            // Fields the pharmacist frontend reads (InventoryContent.jsx)
            'medicine_id'            => (int)$row['medicine_id'],
            'brand_name'             => $row['brand_name'],
            'generic_name'           => $row['generic_name'],
            'category'               => $row['category'],
            'requires_prescription'  => (bool)$row['requires_prescription'],
            // total_quantity is what the frontend groups by — matches our old batches grouping
            'total_quantity'         => $qty,
            'unit_price'             => (float)$row['unit_price'],
            'nearest_expiry'         => $row['nearest_expiry'],
            'expiry_date'            => $row['nearest_expiry'],
            'batch_number'           => $row['batch_number'] ?? 'N/A',
            'stock_status'           => $status,
            'updated_at'             => $row['updated_at'],
        ];
    }

    echo json_encode(["status" => "success", "data" => $data, "pharmacy_id" => $pid]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
