<?php
// patient/get_order_history.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

try {
    $user_id = (int)$_SESSION['user_id'];
    $history = [];

    // 1. Fetch Orders
    $sql_orders = "SELECT o.order_id, o.total_amount, o.status, o.created_at, o.updated_at,
                   p.pharmacy_name AS pharmacy_name, p.address AS pharmacy_address,
                   'order' as type
            FROM orders o
            JOIN pharmacies p ON o.pharmacy_id = p.pharmacy_id
            WHERE o.patient_id = :uid AND o.status IN ('completed', 'cancelled', 'Rejected', 'Completed')
            ORDER BY o.updated_at DESC";

    $stmt = $pdo->prepare($sql_orders);
    $stmt->execute([':uid' => $user_id]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($orders as $order) {
        $itemStmt = $pdo->prepare(
            "SELECT oi.quantity, m.brand_name, m.generic_name
             FROM order_items oi
             JOIN master_medicines m ON oi.medicine_id = m.medicine_id
             WHERE oi.order_id = :oid"
        );
        $itemStmt->execute([':oid' => $order['order_id']]);
        $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        $history[] = $order;
    }

    // 2. Fetch Reservations
    // First, find the patient_id from the patients table linked to this user_id
    $pat_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $pat_stmt->execute([':uid' => $user_id]);
    $patient = $pat_stmt->fetch();

    if ($patient) {
        $patient_id = $patient['patient_id'];
        
        $sql_res = "SELECT r.reservation_id AS order_id, r.total_amount, r.status, r.created_at, r.created_at AS updated_at,
                       p.pharmacy_name AS pharmacy_name, p.address AS pharmacy_address,
                       'reservation' as type
                FROM reservations r
                JOIN pharmacies p ON r.pharmacy_id = p.pharmacy_id
                WHERE r.patient_id = :pid AND r.status IN ('completed', 'cancelled', 'Rejected', 'Completed')
                ORDER BY r.created_at DESC";
        $stmt_res = $pdo->prepare($sql_res);
        $stmt_res->execute([':pid' => $patient_id]);
        $reservations = $stmt_res->fetchAll(PDO::FETCH_ASSOC);

        foreach ($reservations as $res) {
            $itemStmt = $pdo->prepare(
                "SELECT dpi.quantity, m.brand_name, m.generic_name
                 FROM digital_prescription_items dpi
                 JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
                 JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
                 WHERE dp.reservation_id = :rid"
            );
            $itemStmt->execute([':rid' => $res['order_id']]);
            $res['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            $history[] = $res;
        }
    }

    // Sort combined history by updated_at DESC
    usort($history, function($a, $b) {
        return strtotime($b['updated_at']) - strtotime($a['updated_at']);
    });

    echo json_encode([
        "status" => "success",
        "data" => $history
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error occurred: " . $e->getMessage()]);
}
?>
