<?php

require_once __DIR__ . '/User.php';
require_once __DIR__ . '/../config/Database.php';

class PharmacyOwner extends User
{
    private string $license_doc;
    private string $nmra_reg;

    public function __construct(array $data = [])
    {
        parent::__construct($data);
        $this->license_doc = $data['license_doc'] ?? '';
        $this->nmra_reg = $data['nmra_reg'] ?? '';
    }

    public function getLicenseDoc(): string { return $this->license_doc; }
    public function getNmraReg(): string { return $this->nmra_reg; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->fullName,
            'email' => $this->email,
            'role' => $this->role,
            'license_doc' => $this->license_doc,
            'nmra_reg' => $this->nmra_reg
        ];
    }

    // Registers a new pharmacy for this owner
    public static function registerPharmacy(array $data, int $owner_id): int
    {
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare(
            "INSERT INTO pharmacies (owner_id, name, location, contact_number, email, verification_status)
             VALUES (:owner, :name, :location, :contact, :email, 'incomplete')"
        );
        $stmt->bindParam(':owner',    $owner_id);
        $stmt->bindParam(':name',     $data['name']);
        $stmt->bindParam(':location', $data['location']);
        $stmt->bindParam(':contact',  $data['contact_number']);
        $stmt->bindParam(':email',    $data['email']);
        
        $stmt->execute();
        
        return (int)$db->lastInsertId();
    }

    // Adds a new staff member to a pharmacy
    public static function addStaff(int $pharmacy_id, array $data): int
    {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction(); 
        
        try {
            // Check if the user already exists in the system
            $stmt = $db->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $data['email']]);
            $existingUser = $stmt->fetch();

            if ($existingUser) {
                // If they exist, just update their role
                $user_id = $existingUser['user_id'];
                $upStmt = $db->prepare("UPDATE users SET role = :role WHERE user_id = :uid");
                $upStmt->execute([':role' => $data['role'], ':uid' => $user_id]);
            } else {
                // Otherwise, create a brand new user
                $hash = password_hash($data['password'], PASSWORD_ARGON2ID);
                $insStmt = $db->prepare(
                    "INSERT INTO users (full_name, email, password_hash, role, phone)
                     VALUES (:fname, :email, :pass, :role, :phone)"
                );
                $insStmt->execute([
                    ':fname' => $data['full_name'],
                    ':email' => $data['email'],
                    ':pass'  => $hash,
                    ':role'  => $data['role'],
                    ':phone' => $data['phone']
                ]);
                $user_id = $db->lastInsertId();
            }

            // link staff logic removed

            $db->commit();
            return $user_id;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // Creates a new staff member and sets up their specific details
    public static function createStaff(int $owner_id, array $data): array
    {
        $db = Database::getInstance()->getConnection();
        
        $full_name = $data['full_name'];
        $email     = $data['email'];
        $password  = $data['password'];
        $role      = $data['role'];
        $phone     = $data['phone'];
        $slmc      = $data['slmc_registration_number'] ?? '';

        // Find the owner's pharmacy
        $ph_stmt = $db->prepare("SELECT pharmacy_id, verification_status FROM pharmacies WHERE owner_id = :owner LIMIT 1");
        $ph_stmt->execute([':owner' => $owner_id]);
        $pharmacy = $ph_stmt->fetch(PDO::FETCH_ASSOC);

        // Make sure the owner has a pharmacy first
        if (!$pharmacy) {
            return ["status" => false, "code" => 403, "message" => "Please register your pharmacy first before adding staff."];
        }
        $pharmacy_id = $pharmacy['pharmacy_id'];

        $check = $db->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
        $check->execute([':email' => $email]);
        if ($check->fetch()) {
            return ["status" => false, "code" => 409, "message" => "Email address already registered"];
        }

        $hash = password_hash($password, PASSWORD_ARGON2ID);
        $is_active = ($role === 'pharmacist') ? 0 : 1;

        $db->beginTransaction();
        try {
            // Insert into the main users table
            $user_stmt = $db->prepare(
                "INSERT INTO users (full_name, email, password_hash, role, phone, is_active) VALUES (:name, :email, :hash, :role, :phone, :active)"
            );
            $user_stmt->execute([
                ':name' => $full_name, ':email' => $email, ':hash' => $hash,
                ':role' => $role, ':phone' => $phone, ':active' => $is_active
            ]);
            $new_user_id = $db->lastInsertId();

            if ($role === 'stock_manager') { $staff_stmt = $db->prepare("INSERT INTO stock_managers (pharmacy_id, user_id, is_active) VALUES (:pid, :uid, 1)"); $staff_stmt->execute(['pid' => $pharmacy_id, 'uid' => $new_user_id]); }

            if ($role === 'pharmacist') {
                $files = $data['files'] ?? [];
                $cert_path = null;
                $photo_path = null;
                $upload_dir = __DIR__ . '/../uploads/pharmacists/';
                
                // Create the uploads folder if it doesn't exist
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0755, true); // Changed to 0755
                }
                
                $max_file_size = 5 * 1024 * 1024; // 5MB

                // Upload certificate
                if (isset($files['certificate']) && $files['certificate']['error'] === UPLOAD_ERR_OK) {
                    if ($files['certificate']['size'] > $max_file_size) {
                        throw new Exception("Certificate exceeds 5MB limit.");
                    }
                    $ext = strtolower(pathinfo($files['certificate']['name'], PATHINFO_EXTENSION));
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'pdf'])) {
                        throw new Exception("Certificate must be JPG, PNG, WebP, or PDF.");
                    }
                    $finfo = finfo_open(FILEINFO_MIME_TYPE);
                    $mime = finfo_file($finfo, $files['certificate']['tmp_name']);
                    finfo_close($finfo);
                    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])) {
                        throw new Exception("Invalid certificate content.");
                    }

                    $filename = 'cert_' . $new_user_id . '_' . time() . '.' . $ext;
                    if (!move_uploaded_file($files['certificate']['tmp_name'], $upload_dir . $filename)) {
                        throw new Exception("Failed to upload certificate.");
                    }
                    $cert_path = 'uploads/pharmacists/' . $filename;
                }
                
                // Upload photo
                if (isset($files['photo']) && $files['photo']['error'] === UPLOAD_ERR_OK) {
                    if ($files['photo']['size'] > $max_file_size) {
                        throw new Exception("Photo exceeds 5MB limit.");
                    }
                    $ext = strtolower(pathinfo($files['photo']['name'], PATHINFO_EXTENSION));
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                        throw new Exception("Photo must be JPG, PNG, or WebP.");
                    }
                    $finfo = finfo_open(FILEINFO_MIME_TYPE);
                    $mime = finfo_file($finfo, $files['photo']['tmp_name']);
                    finfo_close($finfo);
                    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'])) {
                        throw new Exception("Invalid photo content.");
                    }

                    $filename = 'photo_' . $new_user_id . '_' . time() . '.' . $ext;
                    if (!move_uploaded_file($files['photo']['tmp_name'], $upload_dir . $filename)) {
                        throw new Exception("Failed to upload photo.");
                    }
                    $photo_path = 'uploads/pharmacists/' . $filename;
                }

                // Insert into pharmacists table (core fields)
                $pharm_stmt = $db->prepare("INSERT INTO pharmacists (user_id, pharmacy_id, slmc_number, is_verified_by_admin) VALUES (:uid, :pid, :slmc, NULL)");
                $pharm_stmt->execute([':uid' => $new_user_id, ':pid' => $pharmacy_id, ':slmc' => $slmc]);

                // Insert into pharmacist_details table (nic, certificate, photo)
                $nic = $data['nic'] ?? null;
                $details_stmt = $db->prepare("INSERT INTO pharmacist_details (user_id, slmc_registration_number, nic, certificate_path, photo_path, verification_status) VALUES (:uid, :slmc, :nic, :cert, :photo, 'pending')");
                $details_stmt->execute([':uid' => $new_user_id, ':slmc' => $slmc, ':nic' => $nic, ':cert' => $cert_path, ':photo' => $photo_path]);

                // Update pharmacy verification status to pending if it was incomplete
                if ($pharmacy['verification_status'] === 'incomplete' || $pharmacy['verification_status'] === 'rejected') {
                    $stmt_pending = $db->prepare("UPDATE pharmacies SET verification_status = 'pending_admin_approval' WHERE pharmacy_id = :pid");
                    $stmt_pending->execute([':pid' => $pharmacy_id]);
                }
            }
            
            $db->commit();
            
            $msg = ($role === 'pharmacist') 
                ? "Pharmacist account created and linked successfully. It is pending Admin verification before the pharmacy goes online."
                : "Stock Manager account created successfully and is active.";
            
            return ["status" => true, "message" => $msg, "user_id" => $new_user_id, "is_active" => $is_active];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // Generates stats and data for the pharmacy owner's dashboard
    public static function getDashboard(int $owner_id): array
    {
        $db = Database::getInstance()->getConnection();
        
        $ph_stmt = $db->prepare("SELECT * FROM pharmacies WHERE owner_id = :owner LIMIT 1");
        $ph_stmt->execute([':owner' => $owner_id]);
        $pharmacy = $ph_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacy) {
            return ["status" => true, "pharmacy" => null, "message" => "No pharmacy registered yet"];
        }

        $pharmacy['name'] = $pharmacy['pharmacy_name'];
        $pharmacy['status'] = $pharmacy['verification_status'];
        $pid = (int)$pharmacy['pharmacy_id'];

        // Count how many pharmacists and stock managers we have
        $pharmacist_stmt = $db->prepare("SELECT COUNT(*) as count FROM pharmacists WHERE pharmacy_id = :pid");
        $pharmacist_stmt->execute([':pid' => $pid]);
        $pharmacists_count = (int)$pharmacist_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $stock_stmt = $db->prepare("SELECT COUNT(*) as count FROM stock_managers WHERE pharmacy_id = :pid AND is_active = 1");
        $stock_stmt->execute([':pid' => $pid]);
        $stock_managers_count = (int)$stock_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $total_staff = $pharmacists_count + $stock_managers_count;
        $staff_counts = ['pharmacist' => $pharmacists_count, 'stock_manager' => $stock_managers_count];

        // Count the orders by status
        $ord_stmt = $db->prepare("SELECT status, COUNT(*) as count FROM orders WHERE pharmacy_id = :pid GROUP BY status");
        $ord_stmt->execute([':pid' => $pid]);
        $orders = ['pending' => 0, 'processing' => 0, 'ready_for_pickup' => 0, 'completed' => 0, 'cancelled' => 0];
        while ($row = $ord_stmt->fetch(PDO::FETCH_ASSOC)) {
            $orders[$row['status']] = (int)$row['count'];
        }

        // Calculate total revenue from completed orders
        $rev_stmt = $db->prepare("SELECT COALESCE(SUM(total_amount),0) as revenue FROM orders WHERE pharmacy_id = :pid AND status = 'completed'");
        $rev_stmt->execute([':pid' => $pid]);
        $revenue = (float)$rev_stmt->fetch(PDO::FETCH_ASSOC)['revenue'];

        // Count pending prescriptions
        $rx_stmt = $db->prepare("SELECT COUNT(*) as count FROM prescriptions WHERE pharmacy_id = :pid AND status = 'pending'");
        $rx_stmt->execute([':pid' => $pid]);
        $pending_rx = (int)$rx_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Return all the calculated data
        return [
            "status"   => true,
            "pharmacy" => $pharmacy,
            "stats"    => [
                "total_staff"          => $total_staff,
                "pharmacists"          => $staff_counts['pharmacist'],
                "stock_managers"       => $staff_counts['stock_manager'],
                "orders"               => $orders,
                "total_revenue"        => $revenue,
                "pending_prescriptions"=> $pending_rx
            ]
        ];
    }

    // Gets a list of all staff members in the owner's pharmacy
    public static function getStaff(int $owner_id): array
    {
        $db = Database::getInstance()->getConnection();
        
        $ph_stmt = $db->prepare("SELECT pharmacy_id FROM pharmacies WHERE owner_id = :owner LIMIT 1");
        $ph_stmt->execute([':owner' => $owner_id]);
        $pharmacy = $ph_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacy) {
            return ["status" => true, "data" => [], "message" => "No pharmacy found"];
        }
        $pid = $pharmacy['pharmacy_id'];

        $stmt = $db->prepare(
            "SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active,
                    p.pharmacist_id AS staff_id, p.created_at AS joined_at,
                    p.slmc_number AS slmc_reg_number, pd.certificate_path, pd.photo_path,
                    CASE 
                        WHEN p.is_verified_by_admin = 1 THEN 'approved' 
                        WHEN u.is_active = 0 THEN 'unlinked'
                        WHEN p.is_verified_by_admin = 0 THEN 'rejected' 
                        ELSE 'pending' 
                    END AS status
             FROM pharmacists p
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN pharmacist_details pd ON u.user_id = pd.user_id
             WHERE p.pharmacy_id = :pid1
             UNION ALL
             SELECT u.user_id, u.full_name, u.email, u.role, u.phone, s.is_active,
                    s.stock_manager_id AS staff_id, s.created_at AS joined_at,
                    NULL AS slmc_reg_number, NULL AS certificate_path, NULL AS photo_path,
                    'approved' AS status
             FROM stock_managers s
             JOIN users u ON s.user_id = u.user_id
             WHERE s.pharmacy_id = :pid2
             ORDER BY role ASC, full_name ASC"
        );
        $stmt->execute([':pid1' => $pid, ':pid2' => $pid]);
        return ["status" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    // Links an existing pharmacist to the owner's pharmacy
    public static function linkPharmacist(int $owner_id, string $slmc_number): array
    {
        $db = Database::getInstance()->getConnection();
        
        // Ensure the pharmacy exists and needs a pharmacist
        $ph_stmt = $db->prepare("SELECT pharmacy_id, verification_status FROM pharmacies WHERE owner_id = :owner AND verification_status IN ('incomplete', 'rejected') LIMIT 1");
        $ph_stmt->execute([':owner' => $owner_id]);
        $pharmacy = $ph_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacy) {
            return ["status" => false, "code" => 400, "message" => "Pharmacy must be in incomplete or rejected status to link a new pharmacist."];
        }
        $pharmacy_id = $pharmacy['pharmacy_id'];

        // Find the pharmacist by their SLMC number
        $ph_check = $db->prepare("SELECT pharmacist_id, user_id, pharmacy_id FROM pharmacists WHERE slmc_number = :slmc LIMIT 1");
        $ph_check->execute([':slmc' => $slmc_number]);
        $pharmacist = $ph_check->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacist) {
            return ["status" => false, "code" => 404, "message" => "Pharmacist with SLMC number '$slmc_number' not found. Please verify the SLMC registration."];
        }
        
        // Prevent stealing pharmacists from other pharmacies
        if ($pharmacist['pharmacy_id'] !== null && (int)$pharmacist['pharmacy_id'] !== (int)$pharmacy_id) {
            return ["status" => false, "code" => 400, "message" => "This pharmacist is already linked to another pharmacy."];
        }

        $db->beginTransaction();
        try {
            // Update the pharmacist record
            $stmt = $db->prepare("UPDATE pharmacists SET pharmacy_id = :pid, is_verified_by_admin = NULL WHERE pharmacist_id = :phid");
            $stmt->execute([':pid' => $pharmacy_id, ':phid' => $pharmacist['pharmacist_id']]);

            // Ensure user is active
            $act_stmt = $db->prepare("UPDATE users SET is_active = 1 WHERE user_id = :uid");
            $act_stmt->execute([':uid' => $pharmacist['user_id']]);

            // Update the pharmacy status to pending approval
            $pharm_update = $db->prepare("UPDATE pharmacies SET verification_status = 'pending_admin_approval' WHERE pharmacy_id = :pid");
            $pharm_update->execute([':pid' => $pharmacy_id]);

            

            $db->commit();
            return ["status" => true, "message" => "Pharmacist linked successfully. Link is now pending Admin approval. The pharmacy status remains offline."];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function togglePharmacist(int $owner_id, ?int $pharmacist_id, ?int $user_id, string $action = 'unlink'): array
    {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        try {
            // Find the pharmacy owned by this owner
            $ph_stmt = $db->prepare("SELECT pharmacy_id, verification_status FROM pharmacies WHERE owner_id = :owner LIMIT 1");
            $ph_stmt->execute([':owner' => $owner_id]);
            $pharmacy = $ph_stmt->fetch(PDO::FETCH_ASSOC);
            if (!$pharmacy) {
                return ["status" => false, "code" => 404, "message" => "Pharmacy not found."];
            }
            $pharmacy_id = $pharmacy['pharmacy_id'];

            // Find the pharmacist using either their ID or their user ID
            if ($pharmacist_id) {
                $stmt1 = $db->prepare("SELECT pharmacist_id, user_id, is_verified_by_admin FROM pharmacists WHERE pharmacist_id = :phid LIMIT 1");
                $stmt1->execute([':phid' => $pharmacist_id]);
            } else {
                $stmt1 = $db->prepare("SELECT pharmacist_id, user_id, is_verified_by_admin FROM pharmacists WHERE user_id = :uid LIMIT 1");
                $stmt1->execute([':uid' => $user_id]);
            }
            $pharmacist = $stmt1->fetch(PDO::FETCH_ASSOC);

            if ($pharmacist) {
                $ph_id = $pharmacist['pharmacist_id'];
                $u_id = $pharmacist['user_id'];
                $is_verified = $pharmacist['is_verified_by_admin'];

                if ($action === 'unlink') {
                    $stmt2 = $db->prepare("UPDATE pharmacists SET is_verified_by_admin = 0 WHERE pharmacist_id = :phid");
                    $stmt2->execute([':phid' => $ph_id]);

                    $stmt_deactivate = $db->prepare("UPDATE users SET is_active = 0 WHERE user_id = :uid");
                    $stmt_deactivate->execute([':uid' => $u_id]);
                } else {
                    $verified_val = NULL;
                    $stmt2 = $db->prepare("UPDATE pharmacists SET pharmacy_id = :pid, is_verified_by_admin = :ver WHERE pharmacist_id = :phid");
                    $stmt2->execute([':pid' => $pharmacy_id, ':ver' => $verified_val, ':phid' => $ph_id]);

                    $stmt_activate = $db->prepare("UPDATE users SET is_active = 1 WHERE user_id = :uid");
                    $stmt_activate->execute([':uid' => $u_id]);
                }

                $check_stmt = $db->prepare("SELECT 
                    SUM(CASE WHEN p.is_verified_by_admin = 1 AND u.is_active = 1 THEN 1 ELSE 0 END) as verified,
                    SUM(CASE WHEN p.is_verified_by_admin IS NULL THEN 1 ELSE 0 END) as pending
                    FROM pharmacists p
                    JOIN users u ON p.user_id = u.user_id
                    WHERE p.pharmacy_id = :pid");
                $check_stmt->execute([':pid' => $pharmacy_id]);
                $stats = $check_stmt->fetch(PDO::FETCH_ASSOC);

                $verified = (int)$stats['verified'];
                $pending = (int)$stats['pending'];

                // Decide the new status
                if ($verified > 0) {
                    $new_status = 'fully_verified';
                } elseif ($pending > 0) {
                    $new_status = 'pending_admin_approval';
                } else {
                    if ($pharmacy['verification_status'] === 'rejected') {
                        $new_status = 'rejected';
                    } else {
                        $new_status = 'incomplete';
                    }
                }

                // Update the pharmacy with the new status
                $stmt3 = $db->prepare("UPDATE pharmacies SET verification_status = :status WHERE pharmacy_id = :pid");
                $stmt3->execute([':status' => $new_status, ':pid' => $pharmacy_id]);

                $msg = "Pharmacist " . ($action === 'unlink' ? "unlinked" : "marked as pending") . " successfully.";
                if ($action === 'link') {
                    $msg = "Need admin approval for link.";
                }
                if ($new_status === 'fully_verified') {
                    $msg .= " Pharmacy remains fully verified.";
                } elseif ($new_status === 'pending_admin_approval') {
                    $msg .= " Pharmacy status changed to pending admin approval.";
                } else {
                    $msg .= " Pharmacy status reverted to incomplete and is now offline.";
                }

                $db->commit();
                return ["status" => true, "message" => $msg, "new_status" => $new_status];
            } else {
                $stmt_check = $db->prepare("SELECT user_id FROM stock_managers WHERE pharmacy_id = :pid AND user_id = :uid");
                $stmt_check->execute([':pid' => $pharmacy_id, ':uid' => $user_id]);
                if ($stmt_check->fetch()) {
                    $is_active = ($action === 'unlink') ? 0 : 1;
                    $stmt4 = $db->prepare("UPDATE stock_managers SET is_active = :active WHERE pharmacy_id = :pid AND user_id = :uid");
                    $stmt4->execute([':active' => $is_active, ':pid' => $pharmacy_id, ':uid' => $user_id]);
                    $db->commit();
                    return ["status" => true, "message" => "Staff member " . ($action === 'unlink' ? 'unlinked' : 'linked') . " successfully.", "new_status" => $pharmacy['verification_status']];
                } else {
                    $db->rollBack();
                    return ["status" => false, "code" => 400, "message" => "Staff member not found."];
                }
            }
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
?>



