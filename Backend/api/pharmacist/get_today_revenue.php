<?php
// pharmacist/get_today_revenue.php
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
        echo json_encode(["status" => "success", "today_revenue" => 0, "today_orders" => 0]);
        exit();
    }

    $pid = (int)$pharmacist['pharmacy_id'];
    $today = date('Y-m-d');

    // Revenue from orders billed today (completed today)
    $orders_stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS cnt
         FROM orders
         WHERE pharmacy_id = :pid
           AND status IN ('Completed', 'completed')
           AND DATE(updated_at) = :today"
    );
    $orders_stmt->execute([':pid' => $pid, ':today' => $today]);
    $orders_row = $orders_stmt->fetch();

    // Revenue from reservations billed today (completed today)
    $res_stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS cnt
         FROM reservations
         WHERE pharmacy_id = :pid
           AND status IN ('Completed', 'completed')
           AND total_amount > 0
           AND DATE(updated_at) = :today"
    );
    $res_stmt->execute([':pid' => $pid, ':today' => $today]);
    $res_row = $res_stmt->fetch();

    // Also get all-time total for context
    $total_stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders
         WHERE pharmacy_id = :pid AND status IN ('Completed', 'completed')"
    );
    $total_stmt->execute([':pid' => $pid]);
    $total_orders = $total_stmt->fetch();

    $total_res_stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) AS revenue
         FROM reservations
         WHERE pharmacy_id = :pid AND status IN ('Completed', 'completed')"
    );
    $total_res_stmt->execute([':pid' => $pid]);
    $total_res = $total_res_stmt->fetch();

    $today_revenue = (float)($orders_row['revenue'] ?? 0) + (float)($res_row['revenue'] ?? 0);
    $today_count   = (int)($orders_row['cnt'] ?? 0) + (int)($res_row['cnt'] ?? 0);
    $total_revenue = (float)($total_orders['revenue'] ?? 0) + (float)($total_res['revenue'] ?? 0);

    echo json_encode([
        "status"         => "success",
        "today_revenue"  => $today_revenue,
        "today_orders"   => $today_count,
        "total_revenue"  => $total_revenue,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
