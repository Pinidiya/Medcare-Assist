<?php
require_once __DIR__ . '/User.php';
require_once __DIR__ . '/../config/Database.php';

class Admin extends User
{
    public function __construct(array $data = [])
    {
        parent::__construct($data);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->fullName,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->isActive
        ];
    }

    public static function verifyPharmacyLicense(int $pharmacy_id, string $action): bool
    {
        $db = Database::getInstance()->getConnection();
        $new_status = ($action === 'approve') ? 'fully_verified' : 'incomplete';
        $stmt = $db->prepare("UPDATE pharmacies SET verification_status = :status WHERE pharmacy_id = :id");
        $stmt->bindParam(':status', $new_status);
        $stmt->bindParam(':id', $pharmacy_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public static function addMasterMedicine(array $data): int
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO master_medicines (brand_name, generic_name, category, description, requires_prescription)
             VALUES (:brand, :generic, :category, :desc, :rx)"
        );
        $stmt->bindParam(':brand',    $data['brand_name']);
        $stmt->bindParam(':generic',  $data['generic_name']);
        $stmt->bindParam(':category', $data['category']);
        $stmt->bindParam(':desc',     $data['description']);
        $stmt->bindParam(':rx',       $data['requires_rx']);
        $stmt->execute();
        
        return (int)$db->lastInsertId();
    }

    public static function suspendUser(int $user_id, string $status): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("UPDATE users SET account_status = :status WHERE user_id = :id");
        return $stmt->execute([':status' => $status, ':id' => $user_id]);
    }

    public static function toggleUserActive(int $user_id, int $is_active): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("UPDATE users SET is_active = :active WHERE user_id = :id");
        $stmt->bindParam(':active', $is_active);
        $stmt->bindParam(':id', $user_id);
        return $stmt->execute();
    }

    public static function getUsers(?string $role = null): array
    {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT u.user_id, u.full_name, u.email, u.role, u.is_active, u.phone, u.created_at, u.account_status,
                       CASE 
                           WHEN u.role = 'pharmacy_owner' THEN (SELECT verification_status FROM pharmacies WHERE owner_id = u.user_id LIMIT 1)
                           WHEN u.role = 'pharmacist' THEN (SELECT CASE WHEN pharmacy_id IS NULL THEN 'incomplete' WHEN is_verified_by_admin = 1 AND u.is_active = 1 THEN 'fully_verified' ELSE 'incomplete' END FROM pharmacists WHERE user_id = u.user_id LIMIT 1)
                           WHEN u.role = 'stock_manager' THEN (SELECT CASE WHEN ps.is_active = 0 THEN 'not_verified' WHEN ph.verification_status = 'rejected' THEN 'not_verified' ELSE 'fully_verified' END FROM stock_managers ps JOIN pharmacies ph ON ps.pharmacy_id = ph.pharmacy_id WHERE ps.user_id = u.user_id LIMIT 1)
                           ELSE NULL
                       END as specific_status
                FROM users u";
        
        if ($role) {
            $sql .= " WHERE u.role = :role";
        }
        $sql .= " ORDER BY u.created_at DESC";
        
        $stmt = $db->prepare($sql);
        if ($role) {
            $stmt->bindParam(':role', $role);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function approveCombined(int $pharmacy_id, string $action): array
    {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        try {
            $check_status = $db->prepare("SELECT verification_status FROM pharmacies WHERE pharmacy_id = :pid FOR UPDATE");
            $check_status->execute([':pid' => $pharmacy_id]);
            $current_status = $check_status->fetchColumn();

            if ($current_status === 'fully_verified' && $action === 'approve') {
                $db->rollBack();
                return ["status" => false, "message" => "This pharmacy has already been approved by another admin."];
            }
            if ($current_status === 'rejected' && $action === 'reject') {
                $db->rollBack();
                return ["status" => false, "message" => "This pharmacy has already been rejected by another admin."];
            }

            if ($action === 'approve') {
                $ph_stmt = $db->prepare("SELECT COUNT(*) as total_pharmacists, SUM(is_verified_by_admin) as verified_pharmacists FROM pharmacists WHERE pharmacy_id = :pid");
                $ph_stmt->execute([':pid' => $pharmacy_id]);
                $stats = $ph_stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($stats['total_pharmacists'] == 0) {
                    $db->rollBack();
                    return ["status" => false, "message" => "Cannot approve pharmacy without a linked pharmacist."];
                }
                
                if ($stats['verified_pharmacists'] < 1) {
                    $db->rollBack();
                    return ["status" => false, "message" => "Please accept at least one pharmacist verification first before approving the pharmacy."];
                }

                $db->prepare("UPDATE pharmacies SET verification_status = 'fully_verified' WHERE pharmacy_id = :id")->execute([':id' => $pharmacy_id]);
      
                $message = "Pharmacy verified successfully. Pharmacy is now ONLINE.";
            } else {
                $db->prepare("UPDATE pharmacies SET verification_status = 'rejected' WHERE pharmacy_id = :id")->execute([':id' => $pharmacy_id]);
                $db->prepare("UPDATE pharmacists SET is_verified_by_admin = FALSE WHERE pharmacy_id = :id")->execute([':id' => $pharmacy_id]);
                
                $db->prepare("UPDATE stock_managers SET is_active = 0 WHERE pharmacy_id = :id")->execute([':id' => $pharmacy_id]);
                
                $db->prepare("UPDATE users SET is_active = 0 WHERE user_id = (SELECT owner_id FROM pharmacies WHERE pharmacy_id = :id)")->execute([':id' => $pharmacy_id]);
                $db->prepare("UPDATE users SET is_active = 0 WHERE user_id IN (SELECT user_id FROM pharmacists WHERE pharmacy_id = :id)")->execute([':id' => $pharmacy_id]);
                $db->prepare("UPDATE users SET is_active = 0 WHERE user_id IN (SELECT user_id FROM stock_managers WHERE pharmacy_id = :id)")->execute([':id' => $pharmacy_id]);

                $message = "Pharmacy application rejected. Status set to rejected.";
            }
            $db->commit();
            return ["status" => true, "message" => $message];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function approveMedicineRequest(int $request_id, string $action, ?string $admin_notes, int $admin_id): array
    {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        try {
            $check = $db->prepare("SELECT * FROM medicine_requests WHERE request_id = :id FOR UPDATE");
            $check->execute([':id' => $request_id]);
            $request = $check->fetch(PDO::FETCH_ASSOC);

            if (!$request) {
                $db->rollBack();
                return ["status" => false, "message" => "Medicine request not found"];
            }

            if ($request['status'] !== 'pending') {
                $db->rollBack();
                return ["status" => false, "message" => "This medicine request has already been handled by another admin."];
            }


            $new_status = ($action === 'approve') ? 'approved' : 'rejected';
            $update_stmt = $db->prepare("UPDATE medicine_requests SET status = :status, admin_notes = :notes, reviewed_by = :admin_id WHERE request_id = :id");
            $update_stmt->execute([':status' => $new_status, ':notes' => $admin_notes, ':admin_id' => $admin_id, ':id' => $request_id]);

            $medicine_id = null;
            if ($action === 'approve') {
                $med_stmt = $db->prepare(
                    "INSERT INTO master_medicines (brand_name, generic_name, category, description, requires_prescription)
                     VALUES (:brand, :generic, :category, :desc, :rx)"
                );
                $med_stmt->execute([
                    ':brand' => $request['medicine_name'],
                    ':generic' => $request['medicine_name'],
                    ':category' => $request['category'] ?: 'General',
                    ':desc' => $request['description'] ?: '',
                    ':rx' => (int)$request['requires_prescription']
                ]);
                $medicine_id = $db->lastInsertId();
            }

            $notif_title = ($action === 'approve') ? 'Medicine Request Approved' : 'Medicine Request Rejected';
            $notif_body = ($action === 'approve') ? 'Your request for "' . $request['medicine_name'] . '" has been approved.' : 'Your request for "' . $request['medicine_name'] . '" has been rejected.';
            $notif_type = ($action === 'approve') ? 'success' : 'warning';
            $notif_stmt = $db->prepare("INSERT INTO notifications (user_id, title, body, type) VALUES (:uid, :title, :body, :type)");
            $notif_stmt->execute([':uid' => $request['requested_by'], ':title' => $notif_title, ':body' => $notif_body, ':type' => $notif_type]);

            $db->commit();
            return ["status" => true, "message" => "Medicine request " . $action . "d successfully", "medicine_id" => $medicine_id];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function approvePharmacist(int $pharmacist_id, string $action): array
    {
        $db = Database::getInstance()->getConnection();
        $check = $db->prepare("SELECT p.pharmacy_id, p.is_verified_by_admin, ph.verification_status 
                               FROM pharmacists p 
                               LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id
                               WHERE p.pharmacist_id = :id FOR UPDATE");
        $check->execute([':id' => $pharmacist_id]);
        $pharmacist = $check->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacist) return ["status" => false, "message" => "Pharmacist not found"];
        
        if ($pharmacist['is_verified_by_admin'] === 1 && $action === 'approve') {
            return ["status" => false, "message" => "This pharmacist has already been approved by another admin."];
        }
        if ($pharmacist['is_verified_by_admin'] === 0 && $action === 'reject') {
            return ["status" => false, "message" => "This pharmacist has already been rejected by another admin."];
        }
        if (!$pharmacist['pharmacy_id'] && $action === 'approve') return ["status" => false, "message" => "Pharmacist is not linked to any pharmacy."];
        
        if ($action === 'approve' && $pharmacist['verification_status'] === 'rejected') {
            return ["status" => false, "message" => "Cannot approve pharmacist because the associated pharmacy is rejected."];
        }

        $pharmacy_id = $pharmacist['pharmacy_id'];
        $current_pharmacy_status = $pharmacist['verification_status'];

        $db->beginTransaction();
        try {
            if ($action === 'approve') {
                $db->prepare("UPDATE pharmacists SET is_verified_by_admin = 1 WHERE pharmacist_id = :id")->execute([':id' => $pharmacist_id]);
                
                $new_status = $current_pharmacy_status;
                if ($current_pharmacy_status === 'verified_pending_pharmacist') {
                    $db->prepare("UPDATE pharmacies SET verification_status = 'fully_verified' WHERE pharmacy_id = :pid")->execute([':pid' => $pharmacy_id]);
                    $new_status = 'fully_verified';
                    $message = "Pharmacist link approved. Pharmacy is now fully verified and online.";
                } else {
                    $message = "Pharmacist approved successfully. Please also approve the pharmacy if it is pending.";
                }
                
                $db->prepare("UPDATE users u JOIN pharmacists p ON u.user_id = p.user_id SET u.is_active = 1 WHERE p.pharmacist_id = :id")->execute([':id' => $pharmacist_id]);
            } else {
                $db->prepare("UPDATE pharmacists SET is_verified_by_admin = 0 WHERE pharmacist_id = :id")->execute([':id' => $pharmacist_id]);
                $new_status = null;
                if ($pharmacy_id) {
                    $check_stmt = $db->prepare("SELECT 
                        SUM(CASE WHEN is_verified_by_admin = 1 THEN 1 ELSE 0 END) as verified,
                        SUM(CASE WHEN is_verified_by_admin IS NULL THEN 1 ELSE 0 END) as pending
                        FROM pharmacists WHERE pharmacy_id = :pid");
                    $check_stmt->execute([':pid' => $pharmacy_id]);
                    $stats = $check_stmt->fetch(PDO::FETCH_ASSOC);

                    $verified = (int)$stats['verified'];
                    $pending = (int)$stats['pending'];

                    if ($verified > 0) {
                        $new_status = 'fully_verified';
                    } elseif ($pending > 0) {
                        $new_status = 'pending_admin_approval';
                    } else {
                        $new_status = 'rejected';
                    }

                    $db->prepare("UPDATE pharmacies SET verification_status = :status WHERE pharmacy_id = :pid")
                       ->execute([':status' => $new_status, ':pid' => $pharmacy_id]);
                       
                    if ($new_status === 'rejected') {
                        $db->prepare("UPDATE stock_managers SET is_active = 0 WHERE pharmacy_id = :pid")->execute([':pid' => $pharmacy_id]);
                        $db->prepare("UPDATE users SET is_active = 0 WHERE user_id = (SELECT owner_id FROM pharmacies WHERE pharmacy_id = :pid)")->execute([':pid' => $pharmacy_id]);
                        $db->prepare("UPDATE users SET is_active = 0 WHERE user_id IN (SELECT user_id FROM pharmacists WHERE pharmacy_id = :pid)")->execute([':pid' => $pharmacy_id]);
                        $db->prepare("UPDATE users SET is_active = 0 WHERE user_id IN (SELECT user_id FROM stock_managers WHERE pharmacy_id = :pid)")->execute([':pid' => $pharmacy_id]);
                    }
                }
                $message = "Pharmacist link rejected.";
            }
            $db->commit();
            return ["status" => true, "message" => $message, "new_pharmacy_status" => $new_status];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function crossCheckNmra(string $nmra_reg): ?array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT pharmacy_name, address, owner_name, pharmacist_name, slmc_number, nmra_reg_number FROM nmra_registry WHERE nmra_reg_number = :reg LIMIT 1");
        $stmt->execute([':reg' => $nmra_reg]);
        $nmra_data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $nmra_data ?: null;
    }

    public static function getMedicineRequests(?string $status = null): array
    {
        $db = Database::getInstance()->getConnection();
        $allowed_statuses = ['pending', 'approved', 'rejected'];
        $sql = "SELECT mr.request_id, mr.medicine_name, mr.category, mr.description,
                       mr.requires_prescription, mr.status, mr.admin_notes, mr.created_at,
                       u.user_id AS requestor_id, u.full_name AS requestor_name, u.email AS requestor_email,
                       p.pharmacy_id, p.pharmacy_name AS pharmacy_name
                FROM medicine_requests mr
                JOIN users u ON mr.requested_by = u.user_id
                JOIN pharmacies p ON mr.pharmacy_id = p.pharmacy_id";

        if ($status && in_array($status, $allowed_statuses)) {
            $sql .= " WHERE mr.status = :status";
        }
        $sql .= " ORDER BY mr.created_at DESC";

        $stmt = $db->prepare($sql);
        if ($status && in_array($status, $allowed_statuses)) {
            $stmt->bindParam(':status', $status);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getMedicines(string $search = ''): array
    {
        $db = Database::getInstance()->getConnection();
        if (!empty($search)) {
            $stmt = $db->prepare(
                "SELECT * FROM master_medicines
                 WHERE is_active = 1
                 AND (brand_name LIKE :s OR generic_name LIKE :s OR category LIKE :s)
                 ORDER BY brand_name ASC"
            );
            $like = '%' . $search . '%';
            $stmt->bindParam(':s', $like);
        } else {
            $stmt = $db->prepare("SELECT * FROM master_medicines WHERE is_active = 1 ORDER BY brand_name ASC");
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getPharmacies(?string $status = null, ?string $nmra = null): array
    {
        $db = Database::getInstance()->getConnection();
        $allowed = ['incomplete', 'pending_admin_approval', 'fully_verified', 'rejected'];
        $sql = "SELECT p.pharmacy_id, p.pharmacy_name AS name, p.address, p.phone, 
                       p.verification_status AS status, p.created_at, 
                       p.nmra_reg_number AS nmra_license, p.nmra_expiry_date,
                       p.business_registration, p.owner_nic, p.owner_photo, p.license_doc_path,
                       u.full_name AS owner_name, u.email AS owner_email,
                       ph.slmc_number, ph.is_verified_by_admin AS pharmacist_verified,
                       pu.full_name AS pharmacist_name
                FROM pharmacies p
                JOIN users u ON p.owner_id = u.user_id
                LEFT JOIN pharmacists ph ON ph.pharmacist_id = (
                    SELECT p_sub.pharmacist_id 
                    FROM pharmacists p_sub
                    JOIN users u_sub ON p_sub.user_id = u_sub.user_id
                    WHERE p_sub.pharmacy_id = p.pharmacy_id
                    AND (u_sub.is_active = 1 OR p_sub.is_verified_by_admin IS NULL)
                    ORDER BY u_sub.is_active DESC, p_sub.created_at DESC
                    LIMIT 1
                )
                LEFT JOIN users pu ON ph.user_id = pu.user_id";

        $conditions = [];
        $params = [];

        if ($status && in_array($status, $allowed)) {
            $conditions[] = "p.verification_status = :status";
            $params[':status'] = $status;
        }
        if ($nmra) {
            $conditions[] = "p.nmra_reg_number LIKE :nmra";
            $params[':nmra'] = "%$nmra%";
        }
        if (count($conditions) > 0) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getPharmacists(): array
    {
        require_once __DIR__ . '/Pharmacist.php';
        return Pharmacist::getAllForAdmin();
    }

    public static function getPharmacyStaff(int $pharmacy_id): array
    {
        $db = Database::getInstance()->getConnection();
                $stmt = $db->prepare(
            "SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, p.is_verified_by_admin AS staff_is_active,
                    p.slmc_number AS slmc_registration_number, CASE WHEN u.is_active = 1 AND p.is_verified_by_admin = 1 THEN 1 ELSE 0 END AS verification_status
             FROM pharmacists p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.pharmacy_id = :pid1
             UNION ALL
             SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, s.is_active AS staff_is_active,
                    NULL AS slmc_registration_number, NULL AS verification_status
             FROM stock_managers s
             JOIN users u ON s.user_id = u.user_id
             WHERE s.pharmacy_id = :pid2
             ORDER BY role ASC, full_name ASC"
        );
        $stmt->execute([':pid1' => $pharmacy_id, ':pid2' => $pharmacy_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getStats(): array
    {
        $db = Database::getInstance()->getConnection();
        
        $users_stmt = $db->prepare("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        $users_stmt->execute();
        $users_by_role = [];
        while ($row = $users_stmt->fetch(PDO::FETCH_ASSOC)) {
            $users_by_role[$row['role']] = (int)$row['count'];
        }
        $total_users = array_sum($users_by_role);

        $pharmacy_stmt = $db->prepare("SELECT verification_status, COUNT(*) as count FROM pharmacies GROUP BY verification_status");
        $pharmacy_stmt->execute();
        $pharmacies = ['incomplete' => 0, 'pending_admin_approval' => 0, 'fully_verified' => 0];
        while ($row = $pharmacy_stmt->fetch(PDO::FETCH_ASSOC)) {
            $pharmacies[$row['verification_status']] = (int)$row['count'];
        }
        $pharmacies['approved'] = $pharmacies['fully_verified'];
        $total_pharmacies = array_sum($pharmacies);

        $med_stmt = $db->prepare("SELECT COUNT(*) as count FROM master_medicines WHERE is_active = 1");
        $med_stmt->execute();
        $total_medicines = (int)$med_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $order_stmt = $db->prepare("SELECT COUNT(*) as count FROM reservations");
        $order_stmt->execute();
        $total_orders = (int)$order_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $recent_stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $recent_stmt->execute();
        $recent_users = (int)$recent_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $pharmacist_stats = ['pending' => 0, 'approved' => 0];
        $ph_stmt = $db->prepare("SELECT is_verified_by_admin, COUNT(*) as count FROM pharmacists GROUP BY is_verified_by_admin");
        $ph_stmt->execute();
        while ($row = $ph_stmt->fetch(PDO::FETCH_ASSOC)) {
            $status_label = $row['is_verified_by_admin'] ? 'approved' : 'pending';
            $pharmacist_stats[$status_label] = (int)$row['count'];
        }

        $medicine_requests = 0;
        try {
            $mr_stmt = $db->prepare("SELECT COUNT(*) as count FROM medicine_requests WHERE status = 'pending'");
            $mr_stmt->execute();
            $medicine_requests = (int)$mr_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        } catch (Exception $e) {}

        return [
            "total_users"      => $total_users,
            "users_by_role"    => $users_by_role,
            "pharmacies"       => $pharmacies,
            "total_pharmacies" => $total_pharmacies,
            "total_medicines"  => $total_medicines,
            "total_orders"     => $total_orders,
            "recent_users"     => $recent_users,
            "pharmacist_stats" => $pharmacist_stats,
            "medicine_requests"=> $medicine_requests
        ];
    }
}


