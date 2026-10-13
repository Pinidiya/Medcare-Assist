<?php
// pharmacist/verify_reservation_pickup.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$reservation_id = isset($data['reservation_id']) ? (int)$data['reservation_id'] : 0;
$pin = isset($data['pin']) ? trim($data['pin']) : '';

if (!$reservation_id || empty($pin)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Valid reservation_id and pin are required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT pickup_pin, status FROM reservations WHERE reservation_id = :rid");
    $stmt->execute([':rid' => $reservation_id]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if (!in_array($reservation['status'], ['pending_pickup', 'paid', 'advance_paid'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Reservation is not in a valid state for pickup"]);
        exit();
    }

    if ((string)$reservation['pickup_pin'] !== (string)$pin) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid PIN. Verification failed."]);
        exit();
    }

    $updateStmt = $pdo->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid");
    $updateStmt->execute([':rid' => $reservation_id]);

    // Cross-completion: Update linked order if it exists
    $linked_note = "Created from Reservation #" . $reservation_id;
    $up_ord = $pdo->prepare("UPDATE orders SET status = 'completed' WHERE notes = :notes");
    $up_ord->execute([':notes' => $linked_note]);

    // Also update pickup_pins table if it exists
    try {
        $pinUpdate = $pdo->prepare(
            "UPDATE pickup_pins SET is_verified = 1, verified_at = NOW() WHERE reservation_id = :rid AND pin_code = :pin"
        );
        $pinUpdate->execute([':rid' => $reservation_id, ':pin' => $pin]);
    } catch (PDOException $e) {
        // pickup_pins table may not exist - log but don't fail
        error_log("Failed to update pickup_pins: " . $e->getMessage());
    }

    echo json_encode([
        "status" => "success",
        "message" => "PIN verified successfully. Reservation completed."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>