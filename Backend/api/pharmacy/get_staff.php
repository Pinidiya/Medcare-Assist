<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacy_owner();

require_once '../../config/db.php';
require_once '../../models/PharmacyOwner.php';

// Check if the user is a pharmacy owner

try {
    $owner_id = (int)$_SESSION['user_id'];
    
    $result = PharmacyOwner::getStaff($owner_id);
    
    if ($result['status'] === true) {
        $result['status'] = 'success';
    }
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
