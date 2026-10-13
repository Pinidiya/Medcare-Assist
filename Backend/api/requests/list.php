<?php

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/MedicineRequest.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// Use user_id from session (set by auth/login.php) and verify role
$managerId = $_SESSION['user_id'] ?? 0;
if (!$managerId || ($_SESSION['role'] ?? '') !== 'stock_manager') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

try {
    $requests = MedicineRequest::getAll($managerId);

    echo json_encode([
        'status' => 'success',
        'data' => array_map(fn($req) => $req->toArray(), $requests),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}
