<?php
// api/shared/view_file.php
require_once __DIR__ . '/../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die("Unauthorized");
}

if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    die("File parameter is required");
}

$file_param = $_GET['file'];

// Basic security against directory traversal
if (strpos($file_param, '..') !== false || strpos($file_param, '://') !== false) {
    http_response_code(403);
    die("Forbidden");
}

// The database stores paths like "uploads/prescriptions/rx_1_123.jpg"
// We need to resolve this to the absolute path on the server
$base_dir = realpath(__DIR__ . '/../../'); 
$absolute_path = realpath($base_dir . '/' . $file_param);
$uploads_dir = realpath(__DIR__ . '/../../uploads/');

// Ensure the resolved path actually points inside the Backend/uploads directory
if ($absolute_path === false || strpos($absolute_path, $uploads_dir) !== 0) {
    http_response_code(404);
    die("File not found or access denied");
}

// Ensure the file exists
if (!file_exists($absolute_path)) {
    http_response_code(404);
    die("File not found");
}

// Get the correct MIME type
$mime_type = mime_content_type($absolute_path);
if (!$mime_type) {
    $mime_type = 'application/octet-stream';
}

// Serve the file
header('Content-Type: ' . $mime_type);
header('Content-Length: ' . filesize($absolute_path));
// Prevents caching of private files across users
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

readfile($absolute_path);
exit();
?>
