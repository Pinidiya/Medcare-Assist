<?php
// backend/api/patient/get_patient_medicines.php

require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_patient();

require_once '../../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'patient') {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

try {
    // SECURITY: Map user_id to actual patient_id
    $p_stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE user_id = :uid LIMIT 1");
    $p_stmt->execute([':uid' => $_SESSION['user_id']]);
    $patient = $p_stmt->fetch();
    
    if (!$patient) {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Patient profile not found"]));
    }
    $patient_id = $patient['patient_id'];

    // We assume the user wants active medicines. We pull from the reminders table.
    // We'll calculate the next_dose_datetime based on today's date and the reminder_time.
    $query = "SELECT 
                reminder_id,
                medicine_name, 
                dosage AS dosage_instructions, 
                reminder_time,
                frequency,
                end_date
              FROM reminders 
              WHERE patient_id = :patient_id AND is_active = 1
                AND (end_date IS NULL OR end_date >= CURDATE())";
              
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':patient_id', $patient_id);
    $stmt->execute();
    
    $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    $current_date = date('Y-m-d');
    
    foreach ($medicines as $med) {
        $next_dose = $current_date . ' ' . $med['reminder_time'];
        
        // If the time has already passed today, push it to tomorrow
        if (strtotime($next_dose) < time()) {
            $next_dose = date('Y-m-d H:i:s', strtotime($next_dose . ' +1 day'));
        }
        
        $result[] = [
            'id' => $med['reminder_id'],
            'medicine_name' => $med['medicine_name'],
            'dosage_instructions' => $med['dosage_instructions'] . ' (' . $med['frequency'] . ')',
            'next_dose_datetime' => $next_dose,
            'end_date' => $med['end_date']
        ];
    }

    echo json_encode(["status" => "success", "data" => $result]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
