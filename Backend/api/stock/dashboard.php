<?php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once '../../config/db.php';
require_once '../../models/StockManager.php';

try {
    $stockManager = new StockManager();
    $metrics = $stockManager->getDashboardMetrics();
    $alerts = $stockManager->getAlerts();

    echo json_encode([
        "status" => "success",
        "data" => [
            "metrics" => $metrics,
            "alerts" => $alerts
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
