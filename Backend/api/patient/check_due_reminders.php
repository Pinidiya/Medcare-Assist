<?php
// backend/api/patient/check_due_reminders.php
// Returns reminders that are due at the CURRENT minute

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
    // Get all active reminders for this patient
    $query = "SELECT reminder_id, medicine_name, reminder_time, frequency, end_date
              FROM reminders 
              WHERE patient_id = :patient_id 
                AND is_active = 1
                AND (end_date IS NULL OR end_date >= CURDATE())";
    
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':patient_id', $patient_id);
    $stmt->execute();
    $reminders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $current_hour = (int)date('G'); // 0-23
    $current_minute = (int)date('i'); // 0-59
    
    $due_reminders = [];
    
    foreach ($reminders as $rem) {
        // Parse the reminder start time
        $time_parts = explode(':', $rem['reminder_time']);
        $start_hour = (int)$time_parts[0];
        $start_minute = (int)$time_parts[1];
        
        // Determine interval based on frequency
        $interval_hours = 24; // default: once a day
        $freq = $rem['frequency'];
        if (strpos($freq, '12') !== false) $interval_hours = 12;
        elseif (strpos($freq, '8') !== false) $interval_hours = 8;
        elseif (strpos($freq, '6') !== false) $interval_hours = 6;
        
        // Calculate all dose times for today
        $dose_hour = $start_hour;
        $dose_times = [];
        
        while ($dose_hour < 24) {
            $dose_times[] = ['hour' => $dose_hour, 'minute' => $start_minute];
            $dose_hour += $interval_hours;
        }
        
        // Check if current time matches any dose time
        foreach ($dose_times as $dose) {
            if ($dose['hour'] === $current_hour && $dose['minute'] === $current_minute) {
                $due_reminders[] = [
                    'id' => $rem['reminder_id'],
                    'medicine_name' => $rem['medicine_name'],
                    'frequency' => $rem['frequency']
                ];
                break;
            }
        }
    }
    
    echo json_encode(["status" => "success", "due" => $due_reminders]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error"]);
}
?>
