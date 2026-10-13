<?php
// patient/checkout_reservation.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

// Verify patient session

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->reservation_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Reservation ID is required"]);
    exit();
}

$reservation_id = (int)$data->reservation_id;

require_once '../../config/load_env.php';
$merchant_id = getenv('PAYHERE_MERCHANT_ID') ?: "1235933";
$merchant_secret = getenv('PAYHERE_MERCHANT_SECRET') ?: "NTc1NzYyNzc5MjU3NDY4MTI5OTI4OTA2OTE3ODQ3NTI3NTg2OTQ=";
$currency = "LKR";

try {
    // Select reservation details and check ownership via user_id
    $stmt = $pdo->prepare("
        SELECT r.reservation_id, r.total_amount, u.full_name, u.email, p.phone_number, p.address
        FROM reservations r
        JOIN patients p ON r.patient_id = p.patient_id
        JOIN users u ON p.user_id = u.user_id
        WHERE r.reservation_id = :rid 
          AND u.user_id = :uid
          AND r.status IN ('Quoted', 'bill_generated') 
          AND r.payment_status = 'Pending'
    ");
    $stmt->execute([':rid' => $reservation_id, ':uid' => $_SESSION['user_id']]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reservation) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Reservation not found or status not eligible for payment."]);
        exit();
    }

    $amount = $reservation['total_amount'];
    
    // Hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
    $hash = strtoupper(
        md5(
            $merchant_id . 
            $reservation_id . 
            number_format($amount, 2, '.', '') . 
            $currency . 
            strtoupper(md5($merchant_secret))
        )
    );

    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $scriptPath = $_SERVER['SCRIPT_NAME'];
    $basePath = substr($scriptPath, 0, strpos($scriptPath, '/backend'));
    $baseUrl = $protocol . "://" . $host . $basePath;

    echo json_encode([
        "status" => "success",
        "payhere_params" => [
            "sandbox" => true,
            "merchant_id" => $merchant_id,
            "return_url" => $baseUrl . "/frontend/patient/reservations",
            "cancel_url" => $baseUrl . "/frontend/patient/reservations",
            "notify_url" => $baseUrl . "/backend/api/payment/payhere_notify.php",
            "order_id" => (string)$reservation_id,
            "items" => "MedCare Reservation #" . $reservation_id,
            "amount" => number_format($amount, 2, '.', ''),
            "currency" => $currency,
            "first_name" => $reservation['full_name'],
            "last_name" => "",
            "email" => $reservation['email'],
            "phone" => $reservation['phone_number'],
            "address" => $reservation['address'],
            "city" => "Colombo",
            "country" => "Sri Lanka",
            "hash" => $hash
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
