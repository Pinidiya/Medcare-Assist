<?php
// backend/api/patient/locker_view.php
// We don't require cors.php here because we are returning a file stream, not JSON.
// But we still need db.php
require_once '../../config/db.php';
require_once '../../config/auto_auth.php';
require_patient();

$patient_id = $_SESSION['user_id'];
$locker_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$locker_id) {
    http_response_code(400);
    die("Invalid document ID.");
}

try {
    // Ensure the document belongs to the patient
    $stmt = $pdo->prepare("SELECT document_url, document_name FROM medical_locker WHERE locker_id = ? AND patient_id = ?");
    $stmt->execute([$locker_id, $patient_id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        http_response_code(404);
        die("Document not found or you don't have permission to view it.");
    }

    $filepath = __DIR__ . '/../../../storage/medical_locker/' . $doc['document_url'];

    if (!file_exists($filepath)) {
        http_response_code(404);
        die("File is missing from server.");
    }

    $ext = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));
    $content_type = 'application/octet-stream';
    if ($ext === 'pdf') $content_type = 'application/pdf';
    else if ($ext === 'jpg' || $ext === 'jpeg') $content_type = 'image/jpeg';
    else if ($ext === 'png') $content_type = 'image/png';

    header('Content-Type: ' . $content_type);
    header('Content-Disposition: inline; filename="' . basename($doc['document_name']) . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    // Clear output buffer and stream the file
    ob_clean();
    flush();
    readfile($filepath);
    exit();

} catch (PDOException $e) {
    http_response_code(500);
    die("Database error.");
}
?>
