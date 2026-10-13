<?php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->password) || empty(trim($data->password))) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password is required to delete the account"]);
    exit();
}

$password = trim($data->password);

try {
    // Verify password
    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Incorrect password"]);
        exit();
    }

    // Delete user
    $deleteStmt = $pdo->prepare("DELETE FROM users WHERE user_id = :user_id");
    $deleteStmt->bindParam(':user_id', $user_id);
    
    if ($deleteStmt->execute()) {
        session_destroy();
        echo json_encode(["status" => "success", "message" => "Account deleted successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to delete account"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
