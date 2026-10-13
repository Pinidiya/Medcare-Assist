<?php
// stock/request_medicine.php - Stock manager requests a new medicine to be added
require_once __DIR__ . '/../../config/auto_auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_stock_manager();

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->medicine_name) || empty(trim($data->medicine_name))) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "medicine_name is required"]);
    exit();
}

$user_id              = (int)$_SESSION['user_id'];
$medicine_name        = trim($data->medicine_name);
$category             = isset($data->category) ? trim($data->category) : null;
$description          = isset($data->description) ? trim($data->description) : null;
$requires_prescription = isset($data->requires_prescription) ? (int)$data->requires_prescription : 0;

try {
    // Get the pharmacy_id for this stock manager from pharmacy_staff table
    $staff_stmt = $pdo->prepare(
        "SELECT pharmacy_id FROM stock_managers WHERE user_id = :uid AND is_active = 1 LIMIT 1"
    );
    $staff_stmt->bindParam(':uid', $user_id, PDO::PARAM_INT);
    $staff_stmt->execute();
    $staff = $staff_stmt->fetch();

    if (!$staff) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "You are not assigned to any pharmacy"]);
        exit();
    }

    $pharmacy_id = (int)$staff['pharmacy_id'];

    // Create the medicine request
    $stmt = $pdo->prepare(
        "INSERT INTO medicine_requests (requested_by, pharmacy_id, medicine_name, category, description, requires_prescription)
         VALUES (:requested_by, :pharmacy_id, :medicine_name, :category, :description, :requires_prescription)"
    );
    $stmt->bindParam(':requested_by',           $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':pharmacy_id',            $pharmacy_id, PDO::PARAM_INT);
    $stmt->bindParam(':medicine_name',          $medicine_name);
    $stmt->bindParam(':category',               $category);
    $stmt->bindParam(':description',            $description);
    $stmt->bindParam(':requires_prescription',  $requires_prescription, PDO::PARAM_INT);
    $stmt->execute();

    $request_id = $pdo->lastInsertId();

    echo json_encode([
        "status"     => "success",
        "message"    => "Medicine request submitted successfully",
        "request_id" => $request_id
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>

