<?php
// stock/add_medicine_batch.php
// Inserts a new batch into medicine_batches with supplier_id and selling_price
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

// ── Auth guard ──────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

// ── Parse & validate ────────────────────────────────────────────────
$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->medicine_id) ||
    !isset($data->quantity_in_stock) ||
    !isset($data->selling_price) ||
    !isset($data->expiry_date)
) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "message" => "medicine_id, quantity_in_stock, selling_price, and expiry_date are required"
    ]);
    exit();
}

$medicine_id       = (int)$data->medicine_id;
$quantity_in_stock = (int)$data->quantity_in_stock;
$selling_price     = (float)$data->selling_price;
$expiry_date       = trim($data->expiry_date);
$supplier_name     = isset($data->supplier_name) ? trim($data->supplier_name) : '';

// Auto-generate batch_number if not provided
$batch_number = isset($data->batch_number) && !empty(trim($data->batch_number))
    ? trim($data->batch_number)
    : 'BATCH-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

// Validation
if ($medicine_id <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid medicine_id"]);
    exit();
}
if ($selling_price < 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Price cannot be negative"]);
    exit();
}
if ($quantity_in_stock <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Quantity must be greater than 0"]);
    exit();
}
if (empty($expiry_date)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Expiry date is required"]);
    exit();
}

try {
    $pdo->beginTransaction();

    // ── 1. Resolve pharmacy_id ──────────────────────────────────────
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        throw new Exception("You are not linked to any active pharmacy");
    }
    $pharmacy_id = (int)$staff['pharmacy_id'];

    // ── 2. Verify medicine exists ───────────────────────────────────
    $med_check = $pdo->prepare(
        "SELECT medicine_id, brand_name FROM master_medicines WHERE medicine_id = :id AND is_active = 1"
    );
    $med_check->bindParam(':id', $medicine_id, PDO::PARAM_INT);
    $med_check->execute();
    $medicine = $med_check->fetch();

    if (!$medicine) {
        throw new Exception("Medicine not found in master database");
    }

    // ── 3. Resolve or Create Supplier ─────────────────────────────
    $supplier_id = null;
    if (!empty($supplier_name)) {
        $sup_check = $pdo->prepare("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(:name)");
        $sup_check->bindParam(':name', $supplier_name);
        $sup_check->execute();
        $sup = $sup_check->fetch();
        
        if ($sup) {
            $supplier_id = $sup['id'];
        } else {
            $sup_insert = $pdo->prepare("INSERT INTO suppliers (name) VALUES (:name)");
            $sup_insert->bindParam(':name', $supplier_name);
            $sup_insert->execute();
            $supplier_id = $pdo->lastInsertId();
        }
    }

    // ── 4. Insert into medicine_batches ──────────────────────────────
    $batch_stmt = $pdo->prepare("
        INSERT INTO medicine_batches 
            (pharmacy_id, medicine_id, supplier_id, batch_number, quantity_in_stock, selling_price, expiry_date)
        VALUES 
            (:pharmacy_id, :medicine_id, :supplier_id, :batch_number, :quantity_in_stock, :selling_price, :expiry_date)
    ");
    $batch_stmt->bindParam(':pharmacy_id',      $pharmacy_id, PDO::PARAM_INT);
    $batch_stmt->bindParam(':medicine_id',      $medicine_id, PDO::PARAM_INT);
    $batch_stmt->bindParam(':supplier_id',      $supplier_id, PDO::PARAM_INT);
    $batch_stmt->bindParam(':batch_number',     $batch_number);
    $batch_stmt->bindParam(':quantity_in_stock', $quantity_in_stock, PDO::PARAM_INT);
    $batch_stmt->bindParam(':selling_price',    $selling_price);
    $batch_stmt->bindParam(':expiry_date',      $expiry_date);
    $batch_stmt->execute();

    $batch_id = $pdo->lastInsertId();

    // ── 5. UPSERT pharmacy_inventory (aggregate stock + latest price)
    $inv_stmt = $pdo->prepare("
        INSERT INTO pharmacy_inventory (pharmacy_id, medicine_id, stock_quantity, unit_price, expiry_date)
        VALUES (:pharmacy_id, :medicine_id, :qty, :price, :expiry)
        ON DUPLICATE KEY UPDATE
            stock_quantity = stock_quantity + VALUES(stock_quantity),
            unit_price     = VALUES(unit_price),
            expiry_date    = LEAST(COALESCE(expiry_date, VALUES(expiry_date)), VALUES(expiry_date))
    ");
    $inv_stmt->execute([
        ':pharmacy_id' => $pharmacy_id,
        ':medicine_id' => $medicine_id,
        ':qty'         => $quantity_in_stock,
        ':price'       => $selling_price,
        ':expiry'      => $expiry_date
    ]);

    $pdo->commit();

    echo json_encode([
        "status"       => "success",
        "message"      => "Batch added for " . $medicine['brand_name'],
        "batch_id"     => (int)$batch_id,
        "batch_number" => $batch_number
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

