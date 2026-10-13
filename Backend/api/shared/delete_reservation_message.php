<?php
// shared/delete_reservation_message.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

// Verify session role

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->message_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "message_id is required"]);
    exit();
}

try {
    $message_id = (int)$data->message_id;
    $user_id = (int)$_SESSION['user_id'];

    // Verify ownership of the message before deleting
    $stmt = $pdo->prepare("SELECT sender_id FROM reservation_chats WHERE message_id = :mid");
    $stmt->execute([':mid' => $message_id]);
    $msg = $stmt->fetch();

    if (!$msg) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Message not found"]);
        exit();
    }

    if ((int)$msg['sender_id'] !== $user_id) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "You are not authorized to delete this message"]);
        exit();
    }

    // Delete the message
    $del_stmt = $pdo->prepare("DELETE FROM reservation_chats WHERE message_id = :mid");
    $del_stmt->execute([':mid' => $message_id]);

    echo json_encode(["status" => "success", "message" => "Message deleted successfully"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
