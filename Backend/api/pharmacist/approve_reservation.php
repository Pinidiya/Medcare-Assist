<?php
// pharmacist/approve_reservation.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';
require_once '../../services/PharmacistService.php';

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
    $pharmacistService = new PharmacistService($pdo);
    $pharmacist = $pharmacistService->getPharmacistDetails($_SESSION['user_id']);

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Pharmacist is not linked to a pharmacy"]);
        exit();
    }

    $pharmacy_id = (int)$pharmacist['pharmacy_id'];

    // Select reservation to verify ownership
    $res_stmt = $pdo->prepare(
        "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid"
    );
    $res_stmt->execute([':rid' => $reservation_id]);
    $reservation = $res_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reservation) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found"]);
        exit();
    }

    if ($reservation['pharmacy_id'] !== $pharmacy_id) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "You can only approve reservations belonging to your pharmacy"]);
        exit();
    }

    // Approve via PharmacistService
    $pharmacistService->approveReservation($reservation_id, $_SESSION['user_id']);

    echo json_encode([
        "status"  => "success",
        "message" => "Reservation approved successfully."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
