<?php

require_once __DIR__ . '/User.php';

class StockManager extends User
{
    private string $firstName;
    private string $lastName;
    private string $staffId;

    private string $pharmacyName;
    private ?string $pharmacyAddress;
    private ?string $pharmacyPhone;



    public function __construct(array $data = [])
    {
        parent::__construct($data);
        $this->firstName = $data['first_name'] ?? '';
        $this->lastName = $data['last_name'] ?? '';
        $this->staffId = $data['staff_id'] ?? '';

        $this->pharmacyName = $data['pharmacy_name'] ?? 'City Pharmacy - Badulla';
        $this->pharmacyAddress = $data['pharmacy_address'] ?? null;
        $this->pharmacyPhone = $data['pharmacy_phone'] ?? null;


    }

    public function getFullName(): string
    {
        return trim("{$this->firstName} {$this->lastName}");
    }


    public static function findByEmail(string $email): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM stock_managers WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $data = $stmt->fetch();

        return $data ? new self($data) : null;
    }

    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM stock_managers WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();

        return $data ? new self($data) : null;
    }

    public static function authenticate(string $email, string $password): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM stock_managers WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $data = $stmt->fetch();

        if ($data && password_verify($password, $data['password'])) {
            return new self($data);
        }

        return null;
    }

    public function updateProfile(array $data): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE stock_managers SET 
                first_name = :first_name,
                last_name = :last_name,
                email = :email,
                phone = :phone,
                pharmacy_name = :pharmacy_name,
                pharmacy_address = :pharmacy_address,
                pharmacy_phone = :pharmacy_phone,
                bio = :bio
             WHERE id = :id"
        );

        return $stmt->execute([
            ':first_name' => $data['first_name'] ?? $this->firstName,
            ':last_name' => $data['last_name'] ?? $this->lastName,
            ':email' => $data['email'] ?? $this->email,
            ':phone' => $data['phone'] ?? $this->phone,
            ':pharmacy_name' => $data['pharmacy_name'] ?? $this->pharmacyName,
            ':pharmacy_address' => $data['pharmacy_address'] ?? $this->pharmacyAddress,
            ':pharmacy_phone' => $data['pharmacy_phone'] ?? $this->pharmacyPhone,
            ':bio' => $data['bio'] ?? $this->bio,
            ':id' => $this->id,
        ]);
    }

    public function getDashboardMetrics(): array
    {
        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare("
            SELECT 
                COUNT(*) AS total_items,
                SUM(CASE WHEN status = 'low-stock' THEN 1 ELSE 0 END) AS low_stock,
                SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) AS critical,
                SUM(CASE WHEN status = 'expiring-soon' THEN 1 ELSE 0 END) AS expiring_soon,
                COUNT(DISTINCT category) AS total_categories,
                COUNT(DISTINCT batch_id) AS total_batches,
                SUM(CASE WHEN status = 'out-of-stock' THEN 1 ELSE 0 END) AS out_of_stock
            FROM inventory_items
        ");
        $stmt->execute();
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalItems      = (int)($metrics['total_items'] ?? 0);
        $lowStock        = (int)($metrics['low_stock'] ?? 0);
        $critical        = (int)($metrics['critical'] ?? 0);
        $expiringSoon    = (int)($metrics['expiring_soon'] ?? 0);
        $totalCategories = (int)($metrics['total_categories'] ?? 0);
        $totalBatches    = (int)($metrics['total_batches'] ?? 0);
        $outOfStock      = (int)($metrics['out_of_stock'] ?? 0);

        return [
            'total_sku' => $totalItems,
            'low_stock' => $lowStock + $critical,
            'batches_tracked' => $totalBatches,
            'expiring_soon' => $expiringSoon,
            'total_categories' => $totalCategories,
            'critical' => $critical,
            'out_of_stock' => $outOfStock,
        ];
    }

    public function getAlerts(): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT name, status, stock, batch_id, supplier, expiry_date 
             FROM inventory_items 
             WHERE status IN ('critical', 'low-stock', 'expiring-soon') 
             ORDER BY FIELD(status, 'critical', 'low-stock', 'expiring-soon'), expiry_date ASC
             LIMIT 10"
        );
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'full_name' => $this->getFullName(),
            'email' => $this->email,
            'phone' => $this->phone,
            'staff_id' => $this->staffId,
            'role' => $this->role,
            'pharmacy_name' => $this->pharmacyName,
            'pharmacy_address' => $this->pharmacyAddress,
            'pharmacy_phone' => $this->pharmacyPhone,
            'avatar' => $this->avatar,
            'bio' => $this->bio,
        ];
    }
}
