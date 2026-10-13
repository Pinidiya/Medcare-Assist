<?php
// pharmacist/claim_reservation.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

// Verify pharmacist session

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->reservation_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "reservation_id is required"]);
    exit();
}

$reservation_id = (int)$data->reservation_id;

try {
    // Get pharmacist details
    $stmt = $pdo->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $_SESSION['user_id']]);
    $pharmacist = $stmt->fetch();

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist is not linked to a pharmacy"]);
        exit();
    }

    $pharmacist_id = (int)$pharmacist['pharmacist_id'];
    $pharmacy_id   = (int)$pharmacist['pharmacy_id'];

    // Select reservation to verify ownership and claiming status
    $res_stmt = $pdo->prepare(
        "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid FOR UPDATE"
    );
    $pdo->beginTransaction();
    $res_stmt->execute([':rid' => $reservation_id]);
    $reservation = $res_stmt->fetch();

    if (!$reservation) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if ($reservation['pharmacy_id'] !== $pharmacy_id) {
        $pdo->rollBack();
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "You can only claim reservations belonging to your pharmacy"]);
        exit();
    }

    if ($reservation['assigned_pharmacist_id'] !== null) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "This reservation has already been claimed by another pharmacist"]);
        exit();
    }

    // Update reservation
    $up_stmt = $pdo->prepare(
        "UPDATE reservations SET assigned_pharmacist_id = :phmid, status = 'Pending' WHERE reservation_id = :rid"
    );
    $up_stmt->execute([':phmid' => $pharmacist_id, ':rid' => $reservation_id]);

    // Insert system notification message in chat
    $sys_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'pharmacist', :msg, NOW())"
    );
    $sys_msg = "Hello! I am " . $_SESSION['full_name'] . ", your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!";
    $sys_stmt->execute([
        ':rid' => $reservation_id,
        ':sid' => $_SESSION['user_id'],
        ':msg' => $sys_msg
    ]);

    $pdo->commit();

    echo json_encode([
        "status"  => "success",
        "message" => "Reservation claimed successfully. Chat session has been initiated."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
