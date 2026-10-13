<?php
// pharmacist/get_staff.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

try {
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->bindParam(':uid', $_SESSION['user_id']);
    $ph_stmt->execute();
    $pharmacy = $ph_stmt->fetch();

    if (!$pharmacy) {
        echo json_encode(["status" => "success", "data" => [], "message" => "No pharmacy found"]);
        exit();
    }

    $pid  = $pharmacy['pharmacy_id'];

    $stmt = $pdo->prepare(
        "SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, p.pharmacist_id AS staff_id, p.created_at AS joined_at
FROM pharmacists p JOIN users u ON p.user_id = u.user_id WHERE p.pharmacy_id = :pid
UNION
SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, s.stock_manager_id AS staff_id, s.created_at AS joined_at
FROM stock_managers s JOIN users u ON s.user_id = u.user_id WHERE s.pharmacy_id = :pid
ORDER BY role, full_name ASC"
    );
    $stmt->bindParam(':pid', $pid);
    $stmt->execute();
    $staff = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $staff]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

