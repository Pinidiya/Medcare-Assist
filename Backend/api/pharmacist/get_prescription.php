<?php
// pharmacist/get_prescription.php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacist();

require_once '../../config/db.php';

try {
    $staff = null;
    if ($_SESSION['role'] === 'pharmacy_owner') {
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid LIMIT 1");
        $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
        $staff = $ph_stmt->fetch();
    } else {
        $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $ph_stmt->execute([':uid' => $_SESSION['user_id']]);
        $staff = $ph_stmt->fetch();

        if (!$staff || !$staff['pharmacy_id']) {
            $ph_stmt2 = $pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
            $ph_stmt2->execute([':uid' => $_SESSION['user_id']]);
            $staff = $ph_stmt2->fetch();
        }
    }

    if (!$staff || !$staff['pharmacy_id']) {
        echo json_encode(["status" => "success", "data" => [], "counts" => ["pending" => 0, "verified" => 0, "rejected" => 0], "message" => "Not linked to any pharmacy"]);
        exit();
    }

    $pid    = $staff['pharmacy_id'];
    $statusFilter = isset($_GET['status']) ? trim($_GET['status']) : null;

    $sql = "SELECT r.reservation_id AS prescription_id, r.prescription_url AS file_path, 
                   r.status, '' AS notes, r.pharmacist_note AS pharmacist_notes, 
                   r.created_at AS uploaded_at,
                   u.full_name AS patient_name, u.email AS patient_email,
                   p.phone_number AS patient_phone
            FROM reservations r
            JOIN patients p ON r.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.user_id
            WHERE r.pharmacy_id = :pid AND r.prescription_url IS NOT NULL AND r.prescription_url != ''";

    if ($statusFilter) {
        if ($statusFilter === 'pending') {
            $sql .= " AND LOWER(r.status) = 'pending'";
        } else if ($statusFilter === 'verified') {
            $sql .= " AND LOWER(r.status) IN ('claimed', 'approved')";
        } else if ($statusFilter === 'rejected') {
            $sql .= " AND LOWER(r.status) = 'rejected'";
        }
    }
    $sql .= " ORDER BY r.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pid', $pid);
    $stmt->execute();
    $prescriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also get counts
    $count_sql = "SELECT 
        SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
        SUM(CASE WHEN LOWER(status) IN ('claimed', 'approved') THEN 1 ELSE 0 END) as verified_cnt,
        SUM(CASE WHEN LOWER(status) = 'rejected' THEN 1 ELSE 0 END) as rejected_cnt
        FROM reservations 
        WHERE pharmacy_id = :pid AND prescription_url IS NOT NULL AND prescription_url != ''";
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->bindParam(':pid', $pid);
    $count_stmt->execute();
    $row = $count_stmt->fetch(PDO::FETCH_ASSOC);

    $counts = [
        'pending' => (int)$row['pending_cnt'],
        'approved' => (int)$row['verified_cnt'],
        'rejected' => (int)$row['rejected_cnt']
    ];

    // Map output status to frontend expected format
    foreach ($prescriptions as &$rx) {
        $st = strtolower($rx['status']);
        if ($st === 'pending') {
            $rx['status'] = 'pending';
        } else if ($st === 'rejected') {
            $rx['status'] = 'rejected';
        } else {
            $rx['status'] = 'approved'; // 'claimed', 'approved'
        }
    }

    echo json_encode([
        "status" => "success",
        "data"   => $prescriptions,
        "counts" => $counts
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
