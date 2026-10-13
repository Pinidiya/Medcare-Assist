<?php
// pharmacist/get_pending_reservations.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

// Verify pharmacist session

require_once '../../services/PharmacistService.php';

try {
    $pharmacistService = new PharmacistService($pdo);
    $pharmacist = $pharmacistService->getPharmacistDetails($_SESSION['user_id']);

    if (!$pharmacist || !$pharmacist['pharmacy_id']) {
        echo json_encode([
            "status" => "success",
            "pending" => [],
            "claimed" => [],
            "message" => "Pharmacist is not currently linked to any active pharmacy"
        ]);
        exit();
    }

    $pharmacist_id = (int)$pharmacist['pharmacist_id'];
    $pharmacy_id   = (int)$pharmacist['pharmacy_id'];

    $pending_reservations = $pharmacistService->getPendingReservations($pharmacy_id);
    $claimed_reservations = $pharmacistService->getClaimedReservations($pharmacy_id, $pharmacist_id);

    echo json_encode([
        "status"  => "success",
        "pending" => $pending_reservations,
        "claimed" => $claimed_reservations
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
