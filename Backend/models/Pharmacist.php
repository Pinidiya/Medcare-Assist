<?php
require_once __DIR__ . '/User.php';

/**
 * Pharmacist Model
 * 
 * Extends the abstract User class to represent a Pharmacist.
 * Demonstrates OOP Inheritance, Encapsulation, and Polymorphism.
 */
class Pharmacist extends User
{
    private int $pharmacistId;
    private ?int $pharmacyId;
    private string $slmcNumber;
    private ?bool $isVerifiedByAdmin;

    public function __construct(array $data = [])
    {
        // Call the parent constructor to initialize User properties
        parent::__construct($data);

        // Initialize Pharmacist specific properties
        $this->pharmacistId = (int)($data['pharmacist_id'] ?? 0);
        $this->pharmacyId = isset($data['pharmacy_id']) ? (int)$data['pharmacy_id'] : null;
        $this->slmcNumber = $data['slmc_number'] ?? '';
        
        if (isset($data['is_verified_by_admin'])) {
            $this->isVerifiedByAdmin = (bool)$data['is_verified_by_admin'];
        } else {
            $this->isVerifiedByAdmin = null;
        }
    }

    // --- Getters and Setters (Encapsulation) ---

    public function getPharmacistId(): int
    {
        return $this->pharmacistId;
    }

    public function getPharmacyId(): ?int
    {
        return $this->pharmacyId;
    }

    public function getSlmcNumber(): string
    {
        return $this->slmcNumber;
    }

    public function isVerifiedByAdmin(): ?bool
    {
        return $this->isVerifiedByAdmin;
    }

    /**
     * Polymorphism: Implement the abstract toArray() method from User.
     * Returns Pharmacist-specific data combined with base User data.
     */
    public function toArray(): array
    {
        return [
            // Base User Attributes
            'user_id'              => $this->getId(),
            'full_name'            => $this->getFullName(),
            'email'                => $this->getEmail(),
            'role'                 => $this->getRole(),
            'phone'                => $this->getPhone(),
            'avatar'               => $this->getAvatar(),
            'is_active'            => $this->isActive(),
            
            // Pharmacist Specific Attributes
            'pharmacist_id'        => $this->pharmacistId,
            'pharmacy_id'          => $this->pharmacyId,
            'slmc_number'          => $this->slmcNumber,
            'is_verified_by_admin' => $this->isVerifiedByAdmin
        ];
    }

    /**
     * Get all pharmacists for Admin dashboard
     * Returns an array of detailed pharmacist data.
     */
    public static function getAllForAdmin(): array
    {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active,
                       p.pharmacist_id, p.pharmacist_id AS detail_id, p.slmc_number AS slmc_reg_number,
                       p.pharmacy_id, ph.pharmacy_name, ph.verification_status AS pharmacy_status,
                       pd.certificate_path, pd.photo_path, pd.nic,
                       CASE 
                           WHEN p.is_verified_by_admin = 1 THEN 'approved' 
                           WHEN p.is_verified_by_admin = 0 THEN 'rejected' 
                           ELSE 'pending' 
                       END AS status,
                       p.created_at
                FROM pharmacists p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id
                LEFT JOIN pharmacist_details pd ON p.user_id = pd.user_id
                ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
