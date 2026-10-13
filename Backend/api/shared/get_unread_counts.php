<?php

require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

// Verify session

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];

try {
    if ($role === 'pharmacist') {
        // Get pharmacist's pharmacy_id
        $ph_stmt = $pdo->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $ph_stmt->execute([':uid' => $user_id]);
        $pharmacist = $ph_stmt->fetch();

        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            echo json_encode(["status" => "success", "unread" => new \stdClass()]);
            exit();
        }

        // Count unread messages FROM patients on all claimed reservations for this pharmacist
        $stmt = $pdo->prepare(
            "SELECT rc.reservation_id, COUNT(*) as unread_count
             FROM reservation_chats rc
             JOIN reservations r ON rc.reservation_id = r.reservation_id
             WHERE r.pharmacy_id = :phid
               AND (r.assigned_pharmacist_id = :phmid OR r.assigned_pharmacist_id IS NULL)
               AND rc.sender_role = 'patient'
               AND rc.is_read = 0
             GROUP BY rc.reservation_id"
        );
        $stmt->execute([
            ':phid'  => $pharmacist['pharmacy_id'],
            ':phmid' => $pharmacist['pharmacist_id']
        ]);

    } else {
        // Patient: get patient_id
        $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
        $p_stmt->execute([':uid' => $user_id]);
        $patient = $p_stmt->fetch();

        if (!$patient) {
            echo json_encode(["status" => "success", "unread" => new \stdClass()]);
            exit();
        }

        // Count unread messages FROM pharmacists on all reservations for this patient
        $stmt = $pdo->prepare(
            "SELECT rc.reservation_id, COUNT(*) as unread_count
             FROM reservation_chats rc
             JOIN reservations r ON rc.reservation_id = r.reservation_id
             WHERE r.patient_id = :pid
               AND rc.sender_role = 'pharmacist'
               AND rc.is_read = 0
             GROUP BY rc.reservation_id"
        );
        $stmt->execute([':pid' => $patient['patient_id']]);
    }

    // Build { reservation_id: count } map
    $rows = $stmt->fetchAll();
    $unread = new \stdClass();
    foreach ($rows as $row) {
        $unread->{$row['reservation_id']} = (int)$row['unread_count'];
    }

    echo json_encode([
        "status" => "success",
        "unread" => $unread
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database failure: " . $e->getMessage()]);
}
?>
