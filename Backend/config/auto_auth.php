<?php
// Backend/config/auto_auth.php

/**
 * Initializes a secure PHP session.
 * Includes all recommended security ini settings.
 */

/*මේ file එකෙන් secure session එකක් හදන්න (HttpOnly, SameSite, Secure cookies) වගේම users ලාට විවිධ roles වලට 
 (admin, patient, pharmacist)  */



function init_secure_session() {
    if (session_status() === PHP_SESSION_NONE) {
        // Prevent JS access to session cookie (XSS protection)
        ini_set('session.cookie_httponly', 1);
        
        // HTTPS only (Conditional for localhost testing)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            ini_set('session.cookie_secure', 1);
        }
        
        // CSRF protection
        ini_set('session.cookie_samesite', 'Lax');
        
        // Reject uninitialized session IDs
        ini_set('session.use_strict_mode', 1);
        
        session_start();
    }
}

/**
 * Validates the current session and ensures the user has one of the allowed roles.
 * @param array $allowed_roles Array of string roles allowed to access the endpoint. Empty array means any logged-in user.
 */
function require_auth(array $allowed_roles = []) {
    init_secure_session();
    
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Unauthorized access. Please login."]);
        exit();
    }
    
    if (!empty($allowed_roles) && !in_array($_SESSION['role'], $allowed_roles)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Forbidden: Insufficient privileges for role " . $_SESSION['role']]);
        exit();
    }
}

// --- Convenience Middleware Functions ---

function require_admin() {
    require_auth(['admin', 'superadmin']);
}

function require_pharmacist() {
    require_auth(['pharmacist']);
}

function require_patient() {
    require_auth(['patient']);
}

function require_pharmacy_owner() {
    require_auth(['pharmacy_owner']);
}

function require_stock_manager() {
    require_auth(['stock_manager']);
}
?>
