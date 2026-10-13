<?php
// backend/api/patient/locker_delete.php
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once __DIR__ . '/../../config/db.php';

$patient_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$locker_id = isset($input['locker_id']) ? (int)$input['locker_id'] : 0;

if (!$locker_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid document ID."]);
    exit();
}

try {
    $pdo->beginTransaction();

    // Verify ownership and get the URL
    $stmt = $pdo->prepare("SELECT document_url FROM medical_locker WHERE locker_id = ? AND patient_id = ? FOR UPDATE");
    $stmt->execute([$locker_id, $patient_id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Document not found."]);
        exit();
    }

    // Delete from DB
    $delStmt = $pdo->prepare("DELETE FROM medical_locker WHERE locker_id = ?");
    $delStmt->execute([$locker_id]);

    $pdo->commit();

    // Delete the actual file
    $filepath = __DIR__ . '/../../../storage/medical_locker/' . $doc['document_url'];
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    echo json_encode([
        "status" => "success",
        "message" => "Document deleted successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
