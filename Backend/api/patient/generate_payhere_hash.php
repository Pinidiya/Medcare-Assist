<?php
// patient/generate_payhere_hash.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

// Verify patient session

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->order_id) || !isset($data->amount)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "order_id and amount are required"]);
    exit();
}

$reservation_id = (int)$data->order_id;
$currency = isset($data->currency) ? trim($data->currency) : "LKR";

try {
    // SECURITY: Fetch actual amount and verify ownership
    $stmt = $pdo->prepare("
        SELECT r.total_amount 
        FROM reservations r
        JOIN patients p ON r.patient_id = p.patient_id
        WHERE r.reservation_id = :rid AND p.user_id = :uid
    ");
    $stmt->execute([
        ':rid' => $reservation_id,
        ':uid' => $_SESSION['user_id']
    ]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized or reservation not found"]));
    }

    $amount = (float)$reservation['total_amount'];

    require_once '../../config/load_env.php';
    $merchant_id = getenv('PAYHERE_MERCHANT_ID') ?: "1235933";
    $merchant_secret = getenv('PAYHERE_MERCHANT_SECRET') ?: "NTc1NzYyNzc5MjU3NDY4MTI5OTI4OTA2OTE3ODQ3NTI3NTg2OTQ=";

    // Format amount to 2 decimal places as required by PayHere
    $formatted_amount = number_format($amount, 2, '.', '');

    // Hash Formula: strtoupper(md5(merchant_id . order_id . amount . currency . strtoupper(md5(merchant_secret))))
    $hash = strtoupper(
        md5(
            $merchant_id . 
            $reservation_id . 
            $formatted_amount . 
            $currency . 
            strtoupper(md5($merchant_secret))
        )
    );

    echo json_encode([
        "status" => "success",
        "merchant_id" => $merchant_id,
        "order_id" => (string)$reservation_id,
        "amount" => $formatted_amount,
        "currency" => $currency,
        "hash" => $hash
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure"]);
}
?>
