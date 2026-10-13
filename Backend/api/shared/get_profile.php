<?php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$user_id = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.full_name, u.email, u.role, u.phone, 
               u.family_contact, u.family_relationship, u.family_contact_2, u.family_relationship_2,
               u.is_sos_enabled,
               p.slmc_number AS license_number,
               COALESCE(ph_owner.pharmacy_name, ph_pharmacist.pharmacy_name, ph_staff.pharmacy_name) AS pharmacy_name, 
               COALESCE(ph_owner.address, ph_pharmacist.address, ph_staff.address) AS address
        FROM users u
        LEFT JOIN pharmacists p ON u.user_id = p.user_id
        LEFT JOIN stock_managers ps ON u.user_id = ps.user_id
        LEFT JOIN pharmacies ph_owner ON u.user_id = ph_owner.owner_id
        LEFT JOIN pharmacies ph_pharmacist ON p.pharmacy_id = ph_pharmacist.pharmacy_id
        LEFT JOIN pharmacies ph_staff ON ps.pharmacy_id = ph_staff.pharmacy_id
        WHERE u.user_id = :user_id 
        LIMIT 1
    ");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown IP';
        
        $os = 'Unknown OS';
        if (preg_match('/windows/i', $user_agent)) $os = 'Windows';
        elseif (preg_match('/macintosh|mac os x/i', $user_agent)) $os = 'Mac OS';
        elseif (preg_match('/linux/i', $user_agent)) $os = 'Linux';
        elseif (preg_match('/iphone/i', $user_agent)) $os = 'iPhone';
        elseif (preg_match('/android/i', $user_agent)) $os = 'Android';

        $browser = 'Unknown Browser';
        if (preg_match('/edg/i', $user_agent)) $browser = 'Edge';
        elseif (preg_match('/chrome/i', $user_agent)) $browser = 'Chrome';
        elseif (preg_match('/firefox/i', $user_agent)) $browser = 'Firefox';
        elseif (preg_match('/safari/i', $user_agent)) $browser = 'Safari';

        $user['session_info'] = [
            'os' => $os,
            'browser' => $browser,
            'ip' => $ip,
            'is_current' => true
        ];

        echo json_encode(["status" => "success", "data" => $user]);
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
