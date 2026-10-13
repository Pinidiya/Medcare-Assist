<?php
// backend/api/patient/direct_reserve.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$pharmacy_id = isset($data['pharmacy_id']) ? (int)$data['pharmacy_id'] : 0;
$notes       = isset($data['notes']) ? trim($data['notes']) : '';

if (!$pharmacy_id || empty($notes)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Pharmacy ID and notes (medicine details) are required"]);
    exit();
}

try {
    // Ensure patients table entry exists for this user_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();

    if (!$patient) {
        $ins_pat = $pdo->prepare("INSERT INTO patients (user_id, created_at) VALUES (:uid, NOW())");
        $ins_pat->execute([':uid' => $_SESSION['user_id']]);
        $patient_id = $pdo->lastInsertId();
    } else {
        $patient_id = (int)$patient['patient_id'];
    }

    $dummy_path = 'DIRECT_ORDER'; // This signifies to the pharmacist that there's no physical file

    // Insert Reservation
    $stmt = $pdo->prepare(
        "INSERT INTO reservations (patient_id, pharmacy_id, prescription_url, status, payment_status, total_amount, created_at)
         VALUES (:pid, :phid, :url, 'Pending', 'Pending', 0.00, NOW())"
    );
    $stmt->execute([
        ':pid'  => $patient_id,
        ':phid' => $pharmacy_id,
        ':url'  => $dummy_path
    ]);
    $reservation_id = $pdo->lastInsertId();

    // Optionally add a system message in the chat
    $chat_stmt = $pdo->prepare(
        "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
         VALUES (:rid, :sid, 'patient', :msg, NOW())"
    );
    $welcome_msg = "Hello! I placed a direct order for a non-prescription medicine. Please review. Notes: " . $notes;
    $chat_stmt->execute([
        ':rid' => $reservation_id,
        ':sid' => $_SESSION['user_id'],
        ':msg' => $welcome_msg
    ]);

    echo json_encode([
        "status"         => "success",
        "message"        => "Order placed successfully. The pharmacy will review it shortly.",
        "reservation_id" => $reservation_id
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
