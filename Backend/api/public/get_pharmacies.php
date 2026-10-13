<?php
// api/public/get_pharmacies.php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

try {
    $db = Database::getInstance()->getConnection();
    
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    $sql = "SELECT pharmacy_id, pharmacy_name, address, district, phone, latitude, longitude 
            FROM pharmacies 
            WHERE verification_status = 'fully_verified'";
            
    $params = [];
    
    if (strlen($query) >= 2) {
        $sql .= " AND (pharmacy_name LIKE :q1 OR district LIKE :q2)";
        $params[':q1'] = "%$query%";
        $params[':q2'] = "%$query%";
    }
    
    $sql .= " ORDER BY pharmacy_name ASC LIMIT 20";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $results]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
