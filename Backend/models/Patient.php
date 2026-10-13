<?php
require_once __DIR__ . '/User.php';

/**
 * Patient - Represents a patient user in MedCare Assist.
 * Extends User (Inheritance). Manages medical locker, reminders, reservations (Composition).
 */
class Patient extends User
{
    private int $patientId;
    private ?string $emergencyContact;
    private ?string $address;

    public function __construct(array $data = [])
    {
        parent::__construct($data);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->emergencyContact = $data['family_contact'] ?? $data['emergency_contact'] ?? null;
        $this->address = $data['address'] ?? null;
    }

    /**
     * Find patient by user_id from the users + patients tables.
     */
    public static function findByUserId(int $userId): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT u.*, p.patient_id, p.phone_number, p.address
             FROM users u
             LEFT JOIN patients p ON u.user_id = p.user_id
             WHERE u.user_id = :uid AND u.role = 'patient'
             LIMIT 1"
        );
        $stmt->execute([':uid' => $userId]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    /**
     * Ensure patient record exists in patients table (auto-create if missing).
     */
    public function ensurePatientRecord(): int
    {
        if ($this->patientId > 0) return $this->patientId;

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("INSERT INTO patients (user_id, created_at) VALUES (:uid, NOW())");
        $stmt->execute([':uid' => $this->id]);
        $this->patientId = (int)$db->lastInsertId();
        return $this->patientId;
    }

    public function getPatientId(): int
    {
        return $this->patientId;
    }

    /**
     * Search medicines across all verified pharmacies.
     */
    public function searchMedicines(string $query = '', string $district = '', ?float $lat = null, ?float $lng = null): array
    {
        // Delegate to MasterMedicine model
        require_once __DIR__ . '/MasterMedicine.php';
        return MasterMedicine::search($query, $district, $lat, $lng);
    }

    /**
     * Upload a prescription file and create a reservation.
     */
    public function uploadPrescription(int $pharmacyId, array $file, string $notes = ''): array
    {
        $patientId = $this->ensurePatientRecord();

        // Validate file
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!in_array($ext, $allowed)) {
            throw new InvalidArgumentException('Only PDF, JPG, JPEG, PNG files are allowed');
        }

        // Upload file
        $uploadDir = __DIR__ . '/../uploads/prescriptions/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $filename = 'rx_res_' . $this->id . '_' . time() . '.' . $ext;
        $filePath = 'uploads/prescriptions/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            throw new RuntimeException('Failed to upload prescription file');
        }

        return ['file_path' => $filePath, 'patient_id' => $patientId];
    }

    /**
     * Create a new reservation with prescription.
     */
    public function makeReservation(int $pharmacyId, string $prescriptionUrl, string $notes = ''): array
    {
        require_once __DIR__ . '/Reservation.php';
        $patientId = $this->ensurePatientRecord();
        return Reservation::create($patientId, $pharmacyId, $prescriptionUrl, $this->id, $notes);
    }

    /**
     * Get all reservations for this patient.
     */
    public function getReservations(): array
    {
        require_once __DIR__ . '/Reservation.php';
        if ($this->patientId <= 0) return [];
        return Reservation::getByPatient($this->patientId);
    }

    /**
     * Get patient dashboard data.
     */
    public function getDashboard(): array
    {
        $db = Database::getInstance()->getConnection();

        // Order stats
        $orderStmt = $db->prepare(
            "SELECT status, COUNT(*) as cnt FROM orders WHERE patient_id = :pid GROUP BY status"
        );
        $orderStmt->execute([':pid' => $this->id]);
        $orderStats = [];
        while ($row = $orderStmt->fetch()) {
            $orderStats[$row['status']] = (int)$row['cnt'];
        }

        // Prescription count
        $rxStmt = $db->prepare("SELECT COUNT(*) as cnt FROM prescriptions WHERE patient_id = :pid");
        $rxStmt->execute([':pid' => $this->id]);
        $prescriptionCount = (int)$rxStmt->fetch()['cnt'];

        // Recent orders (last 5)
        $recentStmt = $db->prepare(
            "SELECT o.order_id, o.total_amount, o.status, o.created_at,
                    ph.pharmacy_name AS pharmacy_name,
                    COUNT(oi.order_item_id) AS item_count
             FROM orders o
             JOIN pharmacies ph ON o.pharmacy_id = ph.pharmacy_id
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.patient_id = :pid
             GROUP BY o.order_id
             ORDER BY o.created_at DESC
             LIMIT 5"
        );
        $recentStmt->execute([':pid' => $this->id]);
        $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

        // Nearby pharmacies (approved, random 5)
        $phStmt = $db->prepare(
            "SELECT pharmacy_id, pharmacy_name AS name, address, phone, latitude, longitude
             FROM pharmacies WHERE verification_status = 'fully_verified'
             ORDER BY RAND() LIMIT 5"
        );
        $phStmt->execute();
        $pharmacies = $phStmt->fetchAll(PDO::FETCH_ASSOC);

        // Active reminders
        require_once __DIR__ . '/Reminder.php';
        $reminders = Reminder::getByPatient($this->id);

        return [
            'total_orders'        => array_sum($orderStats),
            'order_counts'        => $orderStats,
            'total_prescriptions' => $prescriptionCount,
            'recent_orders'       => $recentOrders,
            'nearby_pharmacies'   => $pharmacies,
            'reminders'           => $reminders,
        ];
    }

    public function toArray(): array
    {
        return [
            'user_id'           => $this->id,
            'patient_id'        => $this->patientId,
            'full_name'         => $this->fullName,
            'email'             => $this->email,
            'role'              => $this->role,
            'phone'             => $this->phone,
            'emergency_contact' => $this->emergencyContact,
            'address'           => $this->address,
            'avatar'            => $this->avatar,
            'is_active'         => $this->isActive,
        ];
    }
}
