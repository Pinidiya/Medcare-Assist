<?php
// pharmacist/get_orders.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

try {
    $ph_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1"
    );
    $ph_stmt->bindParam(':uid', $_SESSION['user_id']);
    $ph_stmt->execute();
    $staff = $ph_stmt->fetch();

    if (!$staff) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $pid    = $staff['pharmacy_id'];
    $status = isset($_GET['status']) ? trim($_GET['status']) : null;

    $sql = "SELECT o.order_id, o.total_amount, o.status, o.notes, o.pickup_pin, 
                   o.pharmacist_note, o.advance_payment_slip, o.prescription_id,
                   o.created_at, o.updated_at,
                   u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
                   COUNT(oi.order_item_id) AS item_count
            FROM orders o
            JOIN users u ON o.patient_id = u.user_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.pharmacy_id = :pid";

    if ($status && in_array($status, ['pending','processing','ready_for_pickup','completed','cancelled'])) {
        $sql .= " AND o.status = :status";
    }
    $sql .= " GROUP BY o.order_id ORDER BY o.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid);
    if ($status && in_array($status, ['pending','processing','ready_for_pickup','completed','cancelled'])) {
        $stmt->bindParam(':status', $status);
    }
    $stmt->execute();
    $orders = $stmt->fetchAll();

    // Status counts
    $cnt_stmt = $pdo->prepare(
        "SELECT status, COUNT(*) as cnt FROM orders WHERE pharmacy_id = :pid GROUP BY status"
    );
    $cnt_stmt->bindParam(':pid', $pid);
    $cnt_stmt->execute();
    $counts = [];
    while ($row = $cnt_stmt->fetch()) {
        $counts[$row['status']] = (int)$row['cnt'];
    }

    echo json_encode(["status" => "success", "data" => $orders, "counts" => $counts]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
