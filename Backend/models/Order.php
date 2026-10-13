<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * Order - Represents a pharmacy order created by a patient.
 * Implements Exportable interface for standardized array/JSON serialization.
 */
class Order implements Exportable
{
    private int $orderId;
    private int $patientId;
    private int $pharmacyId;
    private ?int $prescriptionId;
    private float $totalAmount;
    private string $status;
    private ?string $notes;
    private ?string $advancePaymentSlip;
    private ?string $pickupPin;
    private string $createdAt;
    private string $updatedAt;

    public function __construct(array $data = [])
    {
        $this->orderId = (int)($data['order_id'] ?? 0);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->pharmacyId = (int)($data['pharmacy_id'] ?? 0);
        $this->prescriptionId = isset($data['prescription_id']) ? (int)$data['prescription_id'] : null;
        $this->totalAmount = (float)($data['total_amount'] ?? 0.00);
        $this->status = $data['status'] ?? 'pending';
        $this->notes = $data['notes'] ?? null;
        $this->advancePaymentSlip = $data['advance_payment_slip'] ?? null;
        $this->pickupPin = $data['pickup_pin'] ?? null;
        $this->createdAt = $data['created_at'] ?? '';
        $this->updatedAt = $data['updated_at'] ?? '';
    }

    /**
     * Find an order by ID.
     */
    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM orders WHERE order_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    /**
     * Get all orders for a patient (with pharmacy name and address).
     */
    public static function getByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT o.*, p.pharmacy_name, p.address AS pharmacy_address
             FROM orders o
             JOIN pharmacies p ON o.pharmacy_id = p.pharmacy_id
             WHERE o.patient_id = :pid
             ORDER BY o.created_at DESC"
        );
        $stmt->execute([':pid' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get active orders for a patient (excluding completed, cancelled, rejected).
     */
    public static function getActiveOrdersByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT o.order_id, o.patient_id, o.pharmacy_id, o.prescription_id, o.pickup_pin,
                    o.advance_payment_slip, o.pharmacist_note, o.status, o.total_amount, 
                    o.notes, o.created_at, o.updated_at,
                    p.pharmacy_name as pharmacy_name, p.address as pharmacy_address, p.phone as pharmacy_phone
             FROM orders o
             LEFT JOIN pharmacies p ON o.pharmacy_id = p.pharmacy_id
             WHERE o.patient_id = :pid AND o.status NOT IN ('Completed', 'completed', 'cancelled', 'Rejected')
             ORDER BY o.created_at DESC"
        );
        $stmt->execute([':pid' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new order.
     */
    public static function create(int $patientId, int $pharmacyId, array $data = []): array
    {
        $db = Database::getInstance()->getConnection();

        $prescriptionId = isset($data['prescription_id']) ? (int)$data['prescription_id'] : null;
        $totalAmount = (float)($data['total_amount'] ?? 0.00);
        $status = $data['status'] ?? 'pending';
        $notes = $data['notes'] ?? null;
        $advancePaymentSlip = $data['advance_payment_slip'] ?? null;
        $pickupPin = $data['pickup_pin'] ?? null;

        $stmt = $db->prepare(
            "INSERT INTO orders (patient_id, pharmacy_id, prescription_id, total_amount, status, notes, advance_payment_slip, pickup_pin, created_at, updated_at)
             VALUES (:pid, :phid, :rxid, :total, :status, :notes, :slip, :pin, NOW(), NOW())"
        );
        $stmt->execute([
            ':pid'    => $patientId,
            ':phid'   => $pharmacyId,
            ':rxid'   => $prescriptionId,
            ':total'  => $totalAmount,
            ':status' => $status,
            ':notes'  => $notes,
            ':slip'   => $advancePaymentSlip,
            ':pin'    => $pickupPin,
        ]);

        $orderId = (int)$db->lastInsertId();

        return [
            'order_id' => $orderId,
            'status'   => $status,
            'message'  => 'Order created successfully.',
        ];
    }

    /**
     * Update the status of this order.
     */
    public function updateStatus(string $status): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE orders SET status = :status, updated_at = NOW() WHERE order_id = :id"
        );
        $stmt->execute([
            ':status' => $status,
            ':id'     => $this->orderId,
        ]);
        if ($stmt->rowCount() > 0) {
            $this->status = $status;
            return true;
        }
        return false;
    }

    /**
     * Cancel this order.
     */
    public function cancel(): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE order_id = :id AND status NOT IN ('completed', 'cancelled')"
        );
        $stmt->execute([':id' => $this->orderId]);
        if ($stmt->rowCount() > 0) {
            $this->status = 'cancelled';
            return true;
        }
        return false;
    }

    /**
     * Get items associated with this order.
     */
    public function getItems(): array
    {
        require_once __DIR__ . '/OrderItem.php';
        return OrderItem::getByOrder($this->orderId);
    }

    /**
     * Get messages associated with this order.
     */
    public function getMessages(): array
    {
        require_once __DIR__ . '/OrderMessage.php';
        return OrderMessage::getByOrder($this->orderId);
    }

    // ── Getters ─────────────────────────────────
    public function getOrderId(): int { return $this->orderId; }
    public function getPatientId(): int { return $this->patientId; }
    public function getPharmacyId(): int { return $this->pharmacyId; }
    public function getPrescriptionId(): ?int { return $this->prescriptionId; }
    public function getTotalAmount(): float { return $this->totalAmount; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function getAdvancePaymentSlip(): ?string { return $this->advancePaymentSlip; }
    public function getPickupPin(): ?string { return $this->pickupPin; }
    public function getCreatedAt(): string { return $this->createdAt; }
    public function getUpdatedAt(): string { return $this->updatedAt; }

    public function toArray(): array
    {
        return [
            'order_id'             => $this->orderId,
            'patient_id'           => $this->patientId,
            'pharmacy_id'          => $this->pharmacyId,
            'prescription_id'      => $this->prescriptionId,
            'total_amount'         => $this->totalAmount,
            'status'               => $this->status,
            'notes'                => $this->notes,
            'advance_payment_slip' => $this->advancePaymentSlip,
            'pickup_pin'           => $this->pickupPin,
            'created_at'           => $this->createdAt,
            'updated_at'           => $this->updatedAt,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
