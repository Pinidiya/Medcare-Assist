<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Reservation - Represents a medicine reservation created by a patient.
 * Demonstrates Composition: has ReservationChat and DigitalPrescription.
 */
class Reservation
{
    private int $reservationId;
    private int $patientId;
    private ?int $pharmacyId;
    private ?string $prescriptionUrl;
    private string $status;
    private string $paymentStatus;
    private float $totalAmount;
    private float $amountPaid;
    private ?string $pickupPin;
    private ?int $assignedPharmacistId;
    private ?string $pharmacistNote;
    private string $createdAt;
    private string $updatedAt;

    public function __construct(array $data = [])
    {
        $this->reservationId = (int)($data['reservation_id'] ?? 0);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->pharmacyId = isset($data['pharmacy_id']) ? (int)$data['pharmacy_id'] : null;
        $this->prescriptionUrl = $data['prescription_url'] ?? null;
        $this->status = $data['status'] ?? 'Pending';
        $this->paymentStatus = $data['payment_status'] ?? 'pending';
        $this->totalAmount = (float)($data['total_amount'] ?? 0.00);
        $this->amountPaid = (float)($data['amount_paid'] ?? 0.00);
        $this->pickupPin = $data['pickup_pin'] ?? null;
        $this->assignedPharmacistId = isset($data['assigned_pharmacist_id']) ? (int)$data['assigned_pharmacist_id'] : null;
        $this->pharmacistNote = $data['pharmacist_note'] ?? null;
        $this->createdAt = $data['created_at'] ?? '';
        $this->updatedAt = $data['updated_at'] ?? '';
    }

    /**
     * Find a reservation by ID.
     */
    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM reservations WHERE reservation_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    /**
     * Get all reservations for a patient (with pharmacy and pharmacist details).
     */
    public static function getByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT r.*, p.pharmacy_name, p.address AS pharmacy_address, p.phone AS pharmacy_phone,
                    p.latitude, p.longitude,
                    u.full_name AS pharmacist_name, u.email AS pharmacist_email
             FROM reservations r
             JOIN pharmacies p ON r.pharmacy_id = p.pharmacy_id
             LEFT JOIN pharmacists ph ON r.assigned_pharmacist_id = ph.pharmacist_id
             LEFT JOIN users u ON ph.user_id = u.user_id
             WHERE r.patient_id = :pid
             ORDER BY r.created_at DESC"
        );
        $stmt->execute([':pid' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new reservation.
     */
    public static function create(int $patientId, int $pharmacyId, string $prescriptionUrl, int $userId, string $notes = ''): array
    {
        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare(
            "INSERT INTO reservations (patient_id, pharmacy_id, prescription_url, status, payment_status, total_amount, created_at)
             VALUES (:pid, :phid, :url, 'Pending', 'pending', 0.00, NOW())"
        );
        $stmt->execute([
            ':pid'  => $patientId,
            ':phid' => $pharmacyId,
            ':url'  => $prescriptionUrl,
        ]);
        $reservationId = (int)$db->lastInsertId();

        // Add initial chat message
        require_once __DIR__ . '/ReservationChat.php';
        $welcomeMsg = 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: ' . ($notes ?: 'None');
        ReservationChat::sendMessage($reservationId, $userId, 'patient', $welcomeMsg);

        return [
            'reservation_id' => $reservationId,
            'status'         => 'Pending',
            'message'        => 'Prescription reservation created successfully.',
        ];
    }

    /**
     * Accept a quotation from the pharmacist.
     */
    public function acceptQuotation(): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE reservations SET status = 'Reserved', payment_status = 'pending_pickup'
             WHERE reservation_id = :id AND status = 'Quoted'"
        );
        $stmt->execute([':id' => $this->reservationId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Record an online payment (upload payment slip).
     */
    public function payOnline(float $amount, ?string $slipPath = null): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE reservations SET amount_paid = :amount, payment_status = 'advance_paid'
             WHERE reservation_id = :id"
        );
        $stmt->execute([
            ':amount' => $amount,
            ':id'     => $this->reservationId,
        ]);
        $this->amountPaid = $amount;
        $this->paymentStatus = 'advance_paid';
        return $stmt->rowCount() > 0;
    }

    /**
     * Generate a pickup PIN for this reservation.
     */
    public function generatePickupPIN(): string
    {
        $pin = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $db = Database::getInstance()->getConnection();

        // Update reservation
        $stmt = $db->prepare("UPDATE reservations SET pickup_pin = :pin WHERE reservation_id = :id");
        $stmt->execute([':pin' => $pin, ':id' => $this->reservationId]);

        // Insert into pickup_pins table
        $pinStmt = $db->prepare(
            "INSERT INTO pickup_pins (reservation_id, pharmacy_id, pin_code, total_amount, generated_by, created_at)
             VALUES (:rid, :phid, :pin, :amount, NULL, NOW())"
        );
        $pinStmt->execute([
            ':rid'    => $this->reservationId,
            ':phid'   => $this->pharmacyId,
            ':pin'    => $pin,
            ':amount' => $this->totalAmount,
        ]);

        $this->pickupPin = $pin;
        return $pin;
    }

    /**
     * Cancel this reservation.
     */
    public function cancel(): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE reservations SET status = 'Cancelled' WHERE reservation_id = :id AND status IN ('Pending', 'Claimed')"
        );
        $stmt->execute([':id' => $this->reservationId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Get chat messages for this reservation (Composition).
     */
    public function getChat(): array
    {
        require_once __DIR__ . '/ReservationChat.php';
        return ReservationChat::getByReservation($this->reservationId);
    }

    /**
     * Get the digital prescription for this reservation (Composition).
     */
    public function getDigitalPrescription(): ?array
    {
        require_once __DIR__ . '/DigitalPrescription.php';
        $dp = DigitalPrescription::findByReservation($this->reservationId);
        return $dp ? $dp->toArray() : null;
    }

    // ── Getters ─────────────────────────────────
    public function getReservationId(): int { return $this->reservationId; }
    public function getPatientId(): int { return $this->patientId; }
    public function getStatus(): string { return $this->status; }
    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function getTotalAmount(): float { return $this->totalAmount; }
    public function getPickupPin(): ?string { return $this->pickupPin; }

    public function toArray(): array
    {
        return [
            'reservation_id'         => $this->reservationId,
            'patient_id'             => $this->patientId,
            'pharmacy_id'            => $this->pharmacyId,
            'prescription_url'       => $this->prescriptionUrl,
            'status'                 => $this->status,
            'payment_status'         => $this->paymentStatus,
            'total_amount'           => $this->totalAmount,
            'amount_paid'            => $this->amountPaid,
            'pickup_pin'             => $this->pickupPin,
            'assigned_pharmacist_id' => $this->assignedPharmacistId,
            'pharmacist_note'        => $this->pharmacistNote,
            'created_at'             => $this->createdAt,
        ];
    }
}
