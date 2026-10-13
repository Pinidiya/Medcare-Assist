<?php
// patient/get_history.php
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

try {
    // Get patient's patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();
    
    if (!$patient) {
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }
    $patient_id = (int)$patient['patient_id'];

    // Select reservations with prescriptions
    $sql = "SELECT r.reservation_id, r.prescription_url, r.status, r.created_at, 
                   p.pharmacy_name
            FROM reservations r
            JOIN pharmacies p ON r.pharmacy_id = p.pharmacy_id
            WHERE r.patient_id = :pid AND r.prescription_url IS NOT NULL AND r.prescription_url != ''
            ORDER BY r.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':pid' => $patient_id]);
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $history
    ]);

} catch (PDOException $e) {
    error_log("History Fetch Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error occurred"]);
}
?>
