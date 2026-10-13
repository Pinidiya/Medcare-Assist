<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Searchable.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/* pharmcy locator and serch module eka 79 line idan pallehata*/

class Pharmacy implements Searchable, Exportable
{
    private int $pharmacy_id;
    private string $name;
    private string $location;

    public function __construct(array $data = [])
    {
        $this->pharmacy_id = (int)($data['pharmacy_id'] ?? 0);
        $this->name = $data['pharmacy_name'] ?? $data['name'] ?? '';
        $this->location = $data['address'] ?? $data['location'] ?? '';
    }

    // Getters
    public function getPharmacyId(): int { return $this->pharmacy_id; }
    public function getName(): string { return $this->name; }
    public function getLocation(): string { return $this->location; }

    // Fetches the inventory for a specific pharmacy
    public static function getInventory(int $pharmacy_id): array
    {
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare(
            "SELECT 
                mb.batch_id,
                mb.batch_number,
                mb.quantity_in_stock as quantity,
                mb.expiry_date,
                mb.created_at,
                mb.selling_price as unit_price,
                mm.medicine_id,
                mm.brand_name,
                mm.generic_name,
                mm.category,
                s.name AS supplier_name
             FROM medicine_batches mb
             JOIN master_medicines mm ON mb.medicine_id = mm.medicine_id
             LEFT JOIN suppliers s ON mb.supplier_id = s.id
             WHERE mb.pharmacy_id = :pid
             ORDER BY mb.expiry_date ASC"
        );
        $stmt->bindParam(':pid', $pharmacy_id);
        
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetches the staff members working at a specific pharmacy
    public static function getStaff(int $pharmacy_id): array
    {
        $db = Database::getInstance()->getConnection();
        
                $stmt = $db->prepare(
            "SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active,
                    p.slmc_number AS slmc_registration_number, pd.nic, pd.certificate_path, p.is_verified_by_admin AS verification_status
             FROM pharmacists p
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN pharmacist_details pd ON u.user_id = pd.user_id
             WHERE p.pharmacy_id = :pid1
             UNION ALL
             SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active,
                    NULL AS slmc_registration_number, NULL AS nic, NULL AS certificate_path, 1 AS verification_status
             FROM stock_managers s
             JOIN users u ON s.user_id = u.user_id
             WHERE s.pharmacy_id = :pid2
             ORDER BY role ASC, full_name ASC"
        );
        $stmt->execute([':pid1' => $pharmacy_id, ':pid2' => $pharmacy_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM pharmacies WHERE pharmacy_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    public static function search(string $query): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM pharmacies WHERE pharmacy_name LIKE :q OR address LIKE :q2 OR district LIKE :q3 ORDER BY pharmacy_name ASC"
        );
        $q = '%' . $query . '%';
        $stmt->execute([':q' => $q, ':q2' => $q, ':q3' => $q]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function toArray(): array
    {
        return [
            'pharmacy_id' => $this->pharmacy_id,
            'name'        => $this->name,
            'location'    => $this->location,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
?>

