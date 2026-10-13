<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/load_env.php';
require_once __DIR__ . '/../../models/User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

if (empty($email)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email is required"]);
    exit();
}

try {
    $token = User::generateResetToken($email);
    
    if (!$token) {
        // Return explicit error for better user experience
        http_response_code(404);
        echo json_encode([
            "status" => "error", 
            "message" => "No account found with this email address. Please check and try again."
        ]);
        exit();
    }

    $resetLink = "http://localhost:5173/reset-password?token=" . $token;
    
    // Send email using PHPMailer with Gmail SMTP
    require_once __DIR__ . '/../../lib/PHPMailer/Exception.php';
    require_once __DIR__ . '/../../lib/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/../../lib/PHPMailer/SMTP.php';

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        
        $mail->Username   = 'medcareassistlk@gmail.com';
        // Use password from .env or fallback for older setups
        $mail->Password   = getenv('GMAIL_PASSWORD') ?: 'vsby iwif vcse siyd';
        
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = 465;
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];

        // Recipients
        $mail->setFrom('noreply@medcareassist.com', 'MedCare Assist');
        $mail->addAddress($email);

        // Content
        $mail->isHTML(false);
        $mail->Subject = 'Password Reset Request - MedcareAssist';
        $mail->Body    = "Hello,\n\nYou have requested to reset your password on MedcareAssist.\n\n"
                       . "Please click the following link to reset your password:\n"
                       . $resetLink . "\n\n"
                       . "If you did not request this, please ignore this email.\nThis link will expire in 5 minutes.";

        $mail->send();
        
        echo json_encode([
            "status" => "success",
            "message" => "A password reset link has been sent to your email.",
            "mail_sent" => true
        ]);
    } catch (Exception $e) {
        // SMTP failed
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Failed to send reset email. Please try again later.",
            "mail_sent" => false
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error"]);
}
?>
