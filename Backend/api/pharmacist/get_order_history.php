<?php
// pharmacist/get_order_history.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

try {
    // Get pharmacist's pharmacy_id
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $ph_stmt->bindParam(':uid', $_SESSION['user_id'], PDO::PARAM_INT);
    $ph_stmt->execute();
    $pharmacist = $ph_stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    $pid = (int)$pharmacist['pharmacy_id'];
    
    // Optional date filtering
    $date_from = isset($_GET['from']) ? trim($_GET['from']) : null;
    $date_to   = isset($_GET['to'])   ? trim($_GET['to'])   : null;

    // Normalize DB status to display status
    function normalizeStatus($s) {
        $s = strtolower(trim($s ?? ''));
        if ($s === 'completed') return 'completed';
        if (in_array($s, ['cancelled', 'rejected', 'cancel'])) return 'cancelled';
        if (in_array($s, ['pending', 'pending_pickup', 'bill_generated', 'quoted'])) return 'pending';
        if (in_array($s, ['reserved', 'paid', 'advance_paid'])) return 'pending';
        return 'pending';
    }

    $history = [];

    // 1. Fetch ALL Orders (all statuses)
    $sql_orders = "
        SELECT o.order_id, o.total_amount, o.status, o.created_at, o.updated_at,
               u.full_name AS patient_name, u.email AS patient_email, p_info.phone_number AS patient_phone,
               'order' as type,
               (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) AS item_count
        FROM orders o
        JOIN users u ON o.patient_id = u.user_id
        LEFT JOIN patients p_info ON u.user_id = p_info.user_id
        WHERE o.pharmacy_id = :pid AND (o.notes IS NULL OR o.notes NOT LIKE 'Created from Reservation #%')
    ";
    if ($date_from && $date_to) {
        $sql_orders .= " AND DATE(o.updated_at) BETWEEN :date_from AND :date_to";
    }
    $sql_orders .= " ORDER BY o.updated_at DESC";

    $stmt_orders = $pdo->prepare($sql_orders);
    $stmt_orders->bindParam(':pid', $pid, PDO::PARAM_INT);
    if ($date_from && $date_to) {
        $stmt_orders->bindParam(':date_from', $date_from);
        $stmt_orders->bindParam(':date_to', $date_to);
    }
    $stmt_orders->execute();
    $orders_raw = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);
    foreach ($orders_raw as &$row) {
        $row['display_status'] = normalizeStatus($row['status']);
    }
    $history = array_merge($history, $orders_raw);

    // 2. Fetch ALL Reservations (all statuses)
    $sql_res = "
        SELECT r.reservation_id AS order_id, r.total_amount, r.status, r.created_at, r.created_at AS updated_at,
               u.full_name AS patient_name, u.email AS patient_email, p_info.phone_number AS patient_phone,
               'reservation' as type,
               (SELECT COUNT(*) FROM digital_prescription_items dpi 
                JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id 
                WHERE dp.reservation_id = r.reservation_id) AS item_count
        FROM reservations r
        JOIN patients p_info ON r.patient_id = p_info.patient_id
        JOIN users u ON p_info.user_id = u.user_id
        WHERE r.pharmacy_id = :pid
    ";
    if ($date_from && $date_to) {
        $sql_res .= " AND DATE(r.created_at) BETWEEN :date_from AND :date_to";
    }
    $sql_res .= " ORDER BY r.created_at DESC";

    $stmt_res = $pdo->prepare($sql_res);
    $stmt_res->bindParam(':pid', $pid, PDO::PARAM_INT);
    if ($date_from && $date_to) {
        $stmt_res->bindParam(':date_from', $date_from);
        $stmt_res->bindParam(':date_to', $date_to);
    }
    $stmt_res->execute();
    $res_raw = $stmt_res->fetchAll(PDO::FETCH_ASSOC);
    foreach ($res_raw as &$row) {
        $row['display_status'] = normalizeStatus($row['status']);
    }
    $history = array_merge($history, $res_raw);

    // Sort combined history by updated_at DESC
    usort($history, function($a, $b) {
        return strtotime($b['updated_at']) - strtotime($a['updated_at']);
    });

    echo json_encode(["status" => "success", "data" => $history]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
