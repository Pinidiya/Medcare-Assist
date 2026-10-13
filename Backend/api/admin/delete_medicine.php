<?php
// api/admin/delete_medicine.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_admin();

require_once __DIR__ . '/../../models/Notification.php';

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

if (!$medicine_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Medicine ID is required"]);
    exit();
}

try {
    $db = Database::getInstance()->getConnection();
    
    $oldStmt = $db->prepare("SELECT brand_name, is_active FROM master_medicines WHERE medicine_id = :id");
    $oldStmt->execute([':id' => $medicine_id]);
    $oldMed = $oldStmt->fetch();

    if (!$oldMed) {
        echo json_encode(["status" => "error", "message" => "Medicine not found."]);
        exit();
    }
    
    if ($oldMed['is_active'] == 0) {
        echo json_encode(["status" => "success", "message" => "Medicine is already deleted/inactive."]);
        exit();
    }

    $db->beginTransaction();

    $stmt = $db->prepare("UPDATE master_medicines SET is_active = 0 WHERE medicine_id = :mid");
    $stmt->execute([':mid' => $medicine_id]);

    // Notifications
    $invStmt = $db->prepare("SELECT DISTINCT pharmacy_id FROM pharmacy_inventory WHERE medicine_id = :mid");
    $invStmt->execute([':mid' => $medicine_id]);
    $pharmacies = $invStmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($pharmacies)) {
        $notifTitle = "Medicine Removed by Admin";
        $notifBody = "The admin has removed '" . $oldMed['brand_name'] . "' from the Master Database. You may need to review your inventory.";
        
        foreach ($pharmacies as $pid) {
            $ownerStmt = $db->prepare("SELECT owner_id FROM pharmacies WHERE pharmacy_id = :pid");
            $ownerStmt->execute([':pid' => $pid]);
            $ownerId = $ownerStmt->fetchColumn();

            $phStmt = $db->prepare("SELECT user_id FROM pharmacists WHERE pharmacy_id = :pid");
            $phStmt->execute([':pid' => $pid]);
            $phIds = $phStmt->fetchAll(PDO::FETCH_COLUMN);

            $staffStmt = $db->prepare("SELECT user_id FROM pharmacists WHERE pharmacy_id = :pid1 UNION SELECT user_id FROM stock_managers WHERE pharmacy_id = :pid2");
            $staffStmt->execute([':pid1' => $pid, ':pid2' => $pid]);
            $staffIds = $staffStmt->fetchAll(PDO::FETCH_COLUMN);

            $allUsers = array_unique(array_merge([$ownerId], $phIds, $staffIds));

            foreach ($allUsers as $uid) {
                if ($uid) {
                    Notification::create($uid, $notifTitle, $notifBody, 'error');
                }
            }
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Medicine successfully deleted (marked inactive). Notifications sent to affected pharmacies."]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
