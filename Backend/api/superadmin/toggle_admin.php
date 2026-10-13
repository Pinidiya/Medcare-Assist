<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth(['superadmin']);

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->user_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "user_id is required"]);
    exit();
}

$user_id = (int)$data->user_id;

try {
    // Prevent modifying non-admins
    $checkStmt = $pdo->prepare("SELECT role FROM users WHERE user_id = :id");
    $checkStmt->execute([':id' => $user_id]);
    $user = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found"]);
        exit();
    }

    if ($user['role'] !== 'admin') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Can only modify admin accounts"]);
        exit();
    }

    // Toggle logic based on payload
    if (isset($data->account_status)) {
        $status = trim($data->account_status);
        if (!in_array($status, ['active', 'suspended'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid account_status value"]);
            exit();
        }
        
        $stmt = $pdo->prepare("UPDATE users SET account_status = :status WHERE user_id = :id AND role = 'admin'");
        $stmt->execute([':status' => $status, ':id' => $user_id]);
        
        // Log the action
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_description, ip_address) VALUES (:uid, :act, :ip)");
        $logStmt->execute([
            ':uid' => $_SESSION['user_id'] ?? null,
            ':act' => 'Updated admin account status to ' . $status . ' for user ID ' . $user_id,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);

        echo json_encode(["status"  => "success", "message" => "Admin account status updated successfully"]);
        exit();
    }

    if (isset($data->is_active)) {
        $is_active  = (int)$data->is_active;
        $stmt = $pdo->prepare("UPDATE users SET is_active = :active WHERE user_id = :id AND role = 'admin'");
        $stmt->execute([':active' => $is_active, ':id' => $user_id]);

        $actionDesc = $is_active ? "Activated admin account for user ID " : "Deactivated admin account for user ID ";
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_description, ip_address) VALUES (:uid, :act, :ip)");
        $logStmt->execute([
            ':uid' => $_SESSION['user_id'] ?? null,
            ':act' => $actionDesc . $user_id,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]);

        echo json_encode(["status"  => "success", "message" => $is_active ? "Admin activated" : "Admin deactivated"]);
        exit();
    }

    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No valid fields to update provided"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
