<?php

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/MedicineRequest.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// Read user_id from session — this is set by auth/login.php
$managerId = $_SESSION['user_id'] ?? 0;
if (!$managerId || ($_SESSION['role'] ?? '') !== 'stock_manager') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

// medicine_name and reason are required fields
if (empty($input['medicine_name']) || empty($input['reason'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Medicine name and reason are required']);
    exit();
}

// Map frontend field names to what MedicineRequest::create() expects.
// The 'description' column stores generic composition; company name goes in description too.
$mappedInput = [
    'medicine_name'       => $input['medicine_name'],
    'generic_composition' => $input['generic_composition'] ?? null,
    'company'             => $input['company'] ?? null,
    'reason'              => $input['reason'],
];

try {
    $request = MedicineRequest::create($mappedInput, $managerId);

    if (!$request) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to submit request']);
        exit();
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Request submitted successfully',
        'data' => $request->toArray(),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}
