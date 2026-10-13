<?php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_pharmacy_owner();

require_once '../../config/db.php';
require_once '../../models/Pharmacy.php';

// Check if the user is a pharmacy owner

try {
    $ph_stmt = $pdo->prepare("SELECT pharmacy_id FROM pharmacies WHERE owner_id = :owner LIMIT 1");
    $ph_stmt->bindParam(':owner', $_SESSION['user_id']);
    $ph_stmt->execute();
    $pharmacy = $ph_stmt->fetch();

    if (!$pharmacy) {
        echo json_encode(["status" => "success", "data" => [], "message" => "No pharmacy found"]);
        exit();
    }

    $pid = (int)$pharmacy['pharmacy_id'];

    $batches = Pharmacy::getInventory($pid);

    echo json_encode(["status" => "success", "data" => $batches]);
} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
