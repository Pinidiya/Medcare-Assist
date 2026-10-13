<?php
require_once __DIR__ . '/../../config/auto_auth.php';
require_once '../../config/cors.php';
require_once '../../config/auto_auth.php';
require_auth();

require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"));



// New fields
$full_name = isset($data->full_name) ? trim($data->full_name) : null;
$phone = isset($data->phone) ? trim($data->phone) : null;
  if ($phone !== null) {
      $cleanPhone = preg_replace('/[\s\-]/', '', $phone);
      if (!preg_match('/^[0-9]{10}$/', $cleanPhone)) {
          http_response_code(400); 
          echo json_encode(["status" => "error", "message" => "Phone number must be exactly 10 digits"]);
          exit();
      }
      $phone = $cleanPhone;
  }
$family_contact = isset($data->family_contact) ? trim($data->family_contact) : null;
$family_relationship = isset($data->family_relationship) ? trim($data->family_relationship) : null;
$family_contact_2 = isset($data->family_contact_2) ? trim($data->family_contact_2) : null;
$family_relationship_2 = isset($data->family_relationship_2) ? trim($data->family_relationship_2) : null;
$is_sos_enabled = isset($data->is_sos_enabled) ? (int)$data->is_sos_enabled : null;
$pharmacy_name = isset($data->pharmacy_name) ? trim($data->pharmacy_name) : null;
$address = isset($data->address) ? trim($data->address) : null;
$new_password = (isset($data->new_password) && !empty(trim($data->new_password))) ? trim($data->new_password) : null;

try {
    $updateFields = [];
    $params = [':user_id' => $user_id];

    $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = :user_id LIMIT 1");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($new_password !== null) {
        // Require old password validation
        if (!isset($data->password) || empty(trim($data->password))) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Current password is required to set a new password"]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = :user_id LIMIT 1");
        $stmt->execute([':user_id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify(trim($data->password), $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Incorrect current password"]);
            exit();
        }

        $new_password = trim($data->new_password);
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $new_password)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "New password does not meet security requirements"]);
            exit();
        }

        $updateFields[] = "password_hash = :new_pass";
        $params[':new_pass'] = password_hash($new_password, PASSWORD_ARGON2ID);
    }

    if ($full_name !== null) { $updateFields[] = "full_name = :full_name"; $params[':full_name'] = $full_name; }
    if ($phone !== null) { $updateFields[] = "phone = :phone"; $params[':phone'] = $phone; }
    if ($family_contact !== null) { $updateFields[] = "family_contact = :fc1"; $params[':fc1'] = $family_contact; }
    if ($family_relationship !== null) { $updateFields[] = "family_relationship = :fr1"; $params[':fr1'] = $family_relationship; }
    if ($family_contact_2 !== null) { $updateFields[] = "family_contact_2 = :fc2"; $params[':fc2'] = $family_contact_2; }
    if ($family_relationship_2 !== null) { $updateFields[] = "family_relationship_2 = :fr2"; $params[':fr2'] = $family_relationship_2; }
    if ($is_sos_enabled !== null) { $updateFields[] = "is_sos_enabled = :sos"; $params[':sos'] = $is_sos_enabled; }

    if (empty($updateFields)) {
        echo json_encode(["status" => "success", "message" => "No changes provided"]);
        exit();
    }

    $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE user_id = :user_id";
    $updateStmt = $pdo->prepare($query);

    if ($updateStmt->execute($params)) {
        // Update pharmacy details if applicable
        if ($pharmacy_name !== null || $address !== null) {
            $pharmUpdates = [];
            $pharmParams = [':user_id' => $user_id];
            
            if ($pharmacy_name !== null) {
                $pharmUpdates[] = "pharmacy_name = :pharmacy_name";
                $pharmParams[':pharmacy_name'] = $pharmacy_name;
            }
            if ($address !== null) {
                $pharmUpdates[] = "address = :address";
                $pharmParams[':address'] = $address;
            }
            
            if (!empty($pharmUpdates)) {
                $pharmStmt = $pdo->prepare("UPDATE pharmacies SET " . implode(", ", $pharmUpdates) . " WHERE owner_id = :user_id");
                $pharmStmt->execute($pharmParams);
            }
        }
        
        // Also update session full_name if it changed
        if ($full_name !== null) {
            $_SESSION['full_name'] = $full_name;
        }
        echo json_encode(["status" => "success", "message" => "Profile updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to update profile"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>

