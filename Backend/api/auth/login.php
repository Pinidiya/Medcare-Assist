<?php
// login.php - MedCare Assist Authentication

session_start();

require_once '../../config/cors.php';
require_once '../../config/db.php';

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$json_data = file_get_contents("php://input");
$data = json_decode($json_data);

if (!isset($data->email) || empty(trim($data->email)) || !isset($data->password) || empty(trim($data->password))) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required"]);
    exit();
}

$email    = trim($data->email);
$password = trim($data->password);

try {
    $query = "SELECT u.user_id, u.full_name, u.email, u.password_hash, u.role, u.is_active, u.account_status, u.is_sos_enabled,
                 (SELECT verification_status FROM pharmacies WHERE owner_id = u.user_id LIMIT 1) as pharmacy_status,
                 (SELECT is_verified_by_admin FROM pharmacists WHERE user_id = u.user_id LIMIT 1) as pharmacist_admin_status,
                 (SELECT pharmacy_id FROM pharmacists WHERE user_id = u.user_id LIMIT 1) as pharmacist_pharmacy_id,
                 (SELECT is_active FROM stock_managers WHERE user_id = u.user_id LIMIT 1) as stock_manager_active,
                 (SELECT p.pharmacy_name FROM pharmacies p JOIN stock_managers sm ON p.pharmacy_id = sm.pharmacy_id WHERE sm.user_id = u.user_id LIMIT 1) as pharmacy_name,
                 (SELECT p.verification_status FROM pharmacies p JOIN pharmacists ph ON p.pharmacy_id = ph.pharmacy_id WHERE ph.user_id = u.user_id LIMIT 1) as pharmacist_pharmacy_status,
                 (SELECT p.verification_status FROM pharmacies p JOIN stock_managers ps ON p.pharmacy_id = ps.pharmacy_id WHERE ps.user_id = u.user_id LIMIT 1) as stock_manager_pharmacy_status
              FROM users u WHERE u.email = :email LIMIT 1";
    $stmt  = $pdo->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    $user = $stmt->fetch();

    if ($user) {
        // First check suspension status (soft delete)
        if (isset($user['account_status']) && $user['account_status'] === 'suspended') {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Your account has been suspended by the administrator."]);
            exit();
        }

        if ($user['role'] === 'pharmacy_owner' && $user['pharmacy_status'] === 'rejected') {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Your pharmacy application has been rejected by the admin."]);
            exit();
        }

        if ($user['role'] === 'pharmacist') {
            if (isset($user['pharmacist_pharmacy_status']) && $user['pharmacist_pharmacy_status'] === 'rejected') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "You cannot log in because your assigned pharmacy has been rejected by the admin."]);
                exit();
            }
            if ($user['pharmacist_admin_status'] === 0 || $user['pharmacist_admin_status'] === '0') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Your pharmacist account has been rejected by the admin."]);
                exit();
            }
            if (is_null($user['pharmacist_admin_status'])) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Your pharmacist account is pending admin verification. Please wait for approval."]);
                exit();
            }
            if (is_null($user['pharmacist_pharmacy_id'])) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "You cannot log in because you have been unlinked by your pharmacy. Please wait until you are linked again."]);
                exit();
            }
        }

        if ($user['role'] === 'stock_manager') {
            if (isset($user['stock_manager_pharmacy_status']) && $user['stock_manager_pharmacy_status'] === 'rejected') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "You cannot log in because your assigned pharmacy has been rejected by the admin."]);
                exit();
            }
            if (isset($user['stock_manager_active']) && (int)$user['stock_manager_active'] === 0) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "You cannot log in because you have been unlinked by your pharmacy. Please wait until you are linked again."]);
                exit();
            }
        }

        if (!$user['is_active']) {
            if ($user['role'] === 'pharmacist') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Your pharmacist account is pending admin verification. Please wait for approval."]);
            } else {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Your account has been deactivated. Contact admin."]);
            }
            exit();
        }

        if (password_verify($password, $user['password_hash'])) {
            session_regenerate_id(true);

            $_SESSION['user_id']   = $user['user_id'];
            $_SESSION['role']      = $user['role'];
            $_SESSION['full_name'] = $user['full_name'];

            http_response_code(200);
            echo json_encode([
                "status"  => "success",
                "message" => "Login successful",
                "user"    => [
                    "id"   => $user['user_id'],
                    "name" => $user['full_name'],
                    "role" => $user['role'],
                    "email"=> $user['email'],
                    "is_sos_enabled" => $user['is_sos_enabled'], "pharmacy_name" => $user['pharmacy_name'] ?? null
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
