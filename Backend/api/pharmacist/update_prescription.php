<?php
// pharmacist/update_prescription.php
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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->prescription_id) || !isset($data->status)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "prescription_id and status are required"]);
    exit();
}

$prescription_id = (int)$data->prescription_id;
$new_status      = trim($data->status);
$notes           = isset($data->notes) ? trim($data->notes) : null;
$user_id         = (int)$_SESSION['user_id'];

if (!in_array($new_status, ['verified', 'rejected'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Status must be verified or rejected"]);
    exit();
}

try {
    // Get pharmacist details based on user_id
    $phid = null;
    $pharmacy_id = null;
    if ($_SESSION['role'] === 'pharmacist') {
        $ph_stmt = $pdo->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $ph_stmt->execute([':uid' => $user_id]);
        $staff = $ph_stmt->fetch();
        if ($staff) {
            $phid = $staff['pharmacist_id'];
            $pharmacy_id = $staff['pharmacy_id'];
        }
    }

    if (!$pharmacy_id) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Pharmacist profile not found"]));
    }

    $update_status = ($new_status === 'verified') ? 'Claimed' : 'Rejected';

    $stmt = $pdo->prepare(
        "UPDATE reservations
         SET status = :status, pharmacist_note = :notes, assigned_pharmacist_id = :phid
         WHERE reservation_id = :id AND pharmacy_id = :pharmacy_id"
    );
    $stmt->execute([
        ':status' => $update_status,
        ':notes' => $notes,
        ':phid' => $phid,
        ':id' => $prescription_id,
        ':pharmacy_id' => $pharmacy_id
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status"  => "success",
            "message" => "Prescription " . $new_status . " successfully"
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Prescription not found or unauthorized"
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>