<?php
// pharmacist/check_reservation_pickup_pin.php
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
    $stmt = $pdo->prepare("
        SELECT r.pickup_pin, r.status, u.full_name, u.email, p.phone_number, p.address
        FROM reservations r
        JOIN patients p ON r.patient_id = p.patient_id
        JOIN users u ON p.user_id = u.user_id
        WHERE r.reservation_id = :rid
    ");
    $stmt->execute([':rid' => $reservation_id]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

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

    // PIN is correct, fetch digital prescription items
    $itemsStmt = $pdo->prepare(
        "SELECT dpi.quantity, m.brand_name, m.generic_name
         FROM digital_prescription_items dpi
         JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
         JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
         WHERE dp.reservation_id = :rid"
    );
    $itemsStmt->execute([':rid' => $reservation_id]);
    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $items,
        "patient" => [
            "name" => $reservation['full_name'],
            "email" => $reservation['email'],
            "phone" => $reservation['phone_number'] ?? 'N/A',
            "address" => $reservation['address'] ?? 'N/A'
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
