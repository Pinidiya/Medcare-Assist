<?php
// shared/send_reservation_message.php
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
if (!isset($data->reservation_id) || !isset($data->message_text) || empty(trim($data->message_text))) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "reservation_id and message_text are required"]);
    exit();
}

$reservation_id = (int)$data->reservation_id;
$message_text   = trim($data->message_text);

try {
    // 1. Fetch reservation to check authorization
    $res_stmt = $pdo->prepare(
        "SELECT patient_id, pharmacy_id, assigned_pharmacist_id FROM reservations WHERE reservation_id = :rid"
    );
    $res_stmt->execute([':rid' => $reservation_id]);
    $reservation = $res_stmt->fetch();

    if (!$reservation) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    // 2. Perform Authorization Checks
    if ($_SESSION['role'] === 'patient') {
        // Find patient's patient_id
        $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
        $p_stmt->execute([':uid' => $_SESSION['user_id']]);
        $patient = $p_stmt->fetch();
        
        if (!$patient || (int)$patient['patient_id'] !== (int)$reservation['patient_id']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You are not authorized to message in this chat"]);
            exit();
        }
    } else if ($_SESSION['role'] === 'pharmacist' || $_SESSION['role'] === 'pharmacy_owner') {
        // Find pharmacist's or owner's pharmacy_id
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid1 UNION SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid2 LIMIT 1");
        $ph_stmt->execute([':uid1' => $_SESSION['user_id'], ':uid2' => $_SESSION['user_id']]);
        $pharmacist = $ph_stmt->fetch();

        if (!$pharmacist || (int)$pharmacist['pharmacy_id'] !== (int)$reservation['pharmacy_id']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You are not authorized to message in this chat"]);
            exit();
        }
    } else {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Role not authorized"]);
        exit();
    }

    // 3. Insert Chat Message
    $ins_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, :role, :msg, NOW())"
    );
    $ins_stmt->execute([
        ':rid'  => $reservation_id,
        ':sid'  => $_SESSION['user_id'],
        ':role' => $_SESSION['role'],
        ':msg'  => $message_text
    ]);
    
    $message_id = $pdo->lastInsertId();

    echo json_encode([
        "status"  => "success",
        "message" => "Message sent successfully",
        "data"    => [
            "message_id"   => $message_id,
            "sender_id"    => $_SESSION['user_id'],
            "sender_role"  => $_SESSION['role'],
            "sender_name"  => $_SESSION['full_name'],
            "message_text" => $message_text,
            "created_at"   => date('Y-m-d H:i:s')
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
