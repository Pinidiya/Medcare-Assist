<?php
// api/admin/update_medicine.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin' && $_SESSION['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$medicine_id = $data['medicine_id'] ?? null;
$brand_name = trim($data['brand_name'] ?? '');
$generic_name = trim($data['generic_name'] ?? '');
$category = trim($data['category'] ?? '');
$description = trim($data['description'] ?? '');
$requires_prescription = isset($data['requires_prescription']) ? (int)$data['requires_prescription'] : 0;
$is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;

if (!$medicine_id || !$brand_name || !$generic_name || !$category) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit();
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if another medicine exists with same brand and generic name
    $checkStmt = $db->prepare("SELECT medicine_id FROM master_medicines WHERE brand_name = :bn AND generic_name = :gn AND medicine_id != :mid");
    $checkStmt->execute([':bn' => $brand_name, ':gn' => $generic_name, ':mid' => $medicine_id]);
    if ($checkStmt->fetch()) {
        echo json_encode(["status" => "error", "message" => "Another medicine with this Brand and Generic name already exists."]);
        exit();
    }

    $db->beginTransaction();

    // Fetch old details to see what changed
    $oldStmt = $db->prepare("SELECT * FROM master_medicines WHERE medicine_id = :id");
    $oldStmt->execute([':id' => $medicine_id]);
    $oldMed = $oldStmt->fetch();

    if (!$oldMed) {
        echo json_encode(["status" => "error", "message" => "Medicine not found."]);
        $db->rollBack();
        exit();
    }

    $stmt = $db->prepare("UPDATE master_medicines SET brand_name = :bn, generic_name = :gn, category = :cat, description = :desc, requires_prescription = :req, is_active = :act WHERE medicine_id = :mid");
    $stmt->execute([
        ':bn' => $brand_name,
        ':gn' => $generic_name,
        ':cat' => $category,
        ':desc' => $description,
        ':req' => $requires_prescription,
        ':act' => $is_active,
        ':mid' => $medicine_id
    ]);

    // Send notifications if name or status changed
    if ($oldMed['brand_name'] !== $brand_name || $oldMed['is_active'] != $is_active) {
        // Find all pharmacies that have this medicine in inventory
        $invStmt = $db->prepare("SELECT DISTINCT pharmacy_id FROM pharmacy_inventory WHERE medicine_id = :mid");
        $invStmt->execute([':mid' => $medicine_id]);
        $pharmacies = $invStmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($pharmacies)) {
            $notifTitle = "Medicine Updated: " . $oldMed['brand_name'];
            $notifBody = "The admin has updated the master details for '" . $oldMed['brand_name'] . "'. New name: '$brand_name'. " . ($is_active == 0 ? "It is now marked as INACTIVE." : "");
            
            foreach ($pharmacies as $pid) {
                // Get Owner
                $ownerStmt = $db->prepare("SELECT owner_id FROM pharmacies WHERE pharmacy_id = :pid");
                $ownerStmt->execute([':pid' => $pid]);
                $ownerId = $ownerStmt->fetchColumn();

                // Get Pharmacists
                $phStmt = $db->prepare("SELECT user_id FROM pharmacists WHERE pharmacy_id = :pid");
                $phStmt->execute([':pid' => $pid]);
                $phIds = $phStmt->fetchAll(PDO::FETCH_COLUMN);

                // Get Staff (Stock Managers)
                $staffStmt = $db->prepare("SELECT user_id FROM pharmacists WHERE pharmacy_id = :pid1 UNION SELECT user_id FROM stock_managers WHERE pharmacy_id = :pid2");
                $staffStmt->execute([':pid1' => $pid, ':pid2' => $pid]);
                $staffIds = $staffStmt->fetchAll(PDO::FETCH_COLUMN);

                $allUsers = array_unique(array_merge([$ownerId], $phIds, $staffIds));

                // Insert notifications
                $insertNotif = $db->prepare("INSERT INTO notifications (user_id, title, body, type) VALUES (:uid, :title, :body, 'warning')");
                foreach ($allUsers as $uid) {
                    if ($uid) {
                        $insertNotif->execute([':uid' => $uid, ':title' => $notifTitle, ':body' => $notifBody]);
                    }
                }
            }
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Medicine updated successfully."]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
