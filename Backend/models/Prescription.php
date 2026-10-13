<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * Prescription - Represents a patient uploaded prescription.
 * Implements Exportable interface.
 */
class Prescription implements Exportable
{
    private int $prescriptionId;
    private int $patientId;
    private int $pharmacyId;
    private string $filePath;
    private ?string $notes;
    private string $status;
    private ?string $pharmacistNotes;
    private ?int $verifiedBy;
    private string $uploadedAt;
    private ?string $pharmacyName;

    public function __construct(array $data = [])
    {
        $this->prescriptionId = (int)($data['prescription_id'] ?? 0);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->pharmacyId = (int)($data['pharmacy_id'] ?? 0);
        $this->filePath = $data['file_path'] ?? '';
        $this->notes = $data['notes'] ?? null;
        $this->status = $data['status'] ?? 'pending';
        $this->pharmacistNotes = $data['pharmacist_notes'] ?? null;
        $this->verifiedBy = isset($data['verified_by']) && $data['verified_by'] !== null ? (int)$data['verified_by'] : null;
        $this->uploadedAt = $data['uploaded_at'] ?? '';
        $this->pharmacyName = $data['pharmacy_name'] ?? null;
    }

    /**
     * Find a prescription by ID.
     */
    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT p.*, ph.pharmacy_name 
             FROM prescriptions p 
             LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id 
             WHERE p.prescription_id = :id 
             LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    /**
     * Get all prescriptions for a patient (with pharmacy name).
     */
    public static function getByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT p.*, ph.pharmacy_name 
             FROM prescriptions p 
             JOIN pharmacies ph ON p.pharmacy_id = ph.pharmacy_id 
             WHERE p.patient_id = :pid 
             ORDER BY p.uploaded_at DESC"
        );
        $stmt->execute([':pid' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all prescriptions for a pharmacy, with optional status filter.
     */
    public static function getByPharmacy(int $pharmacyId, ?string $status = null): array
    {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT p.*, u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone
                FROM prescriptions p
                JOIN users u ON p.patient_id = u.user_id
                WHERE p.pharmacy_id = :phid";
        $params = [':phid' => $pharmacyId];

        if ($status !== null && $status !== '') {
            $sql .= " AND p.status = :status";
            $params[':status'] = $status;
        }

        $sql .= " ORDER BY p.uploaded_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Upload / create a new prescription.
     */
    public static function upload(int $patientId, int $pharmacyId, string $filePath, string $notes = ''): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO prescriptions (patient_id, pharmacy_id, file_path, notes, status, uploaded_at)
             VALUES (:pid, :phid, :file_path, :notes, 'pending', NOW())"
        );
        $stmt->execute([
            ':pid'       => $patientId,
            ':phid'      => $pharmacyId,
            ':file_path' => $filePath,
            ':notes'     => $notes,
        ]);
        $id = (int)$db->lastInsertId();

        return self::findById($id) ?? new self([
            'prescription_id' => $id,
            'patient_id'      => $patientId,
            'pharmacy_id'     => $pharmacyId,
            'file_path'       => $filePath,
            'notes'           => $notes,
            'status'          => 'pending',
            'uploaded_at'     => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Update status and verification details for this prescription.
     */
    public function updateStatus(string $status, ?int $verifiedBy = null, ?string $pharmacistNotes = null): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE prescriptions 
             SET status = :status, 
                 verified_by = :verified_by, 
                 pharmacist_notes = :pharmacist_notes 
             WHERE prescription_id = :id"
        );
        $result = $stmt->execute([
            ':status'           => $status,
            ':verified_by'      => $verifiedBy,
            ':pharmacist_notes' => $pharmacistNotes,
            ':id'               => $this->prescriptionId,
        ]);

        if ($result) {
            $this->status = $status;
            $this->verifiedBy = $verifiedBy;
            $this->pharmacistNotes = $pharmacistNotes;
        }

        return $result;
    }

    // ── Getters ──────────────────────────────────────────────────
    public function getPrescriptionId(): int { return $this->prescriptionId; }
    public function getPatientId(): int { return $this->patientId; }
    public function getPharmacyId(): int { return $this->pharmacyId; }
    public function getFilePath(): string { return $this->filePath; }
    public function getNotes(): ?string { return $this->notes; }
    public function getStatus(): string { return $this->status; }
    public function getPharmacistNotes(): ?string { return $this->pharmacistNotes; }
    public function getVerifiedBy(): ?int { return $this->verifiedBy; }
    public function getUploadedAt(): string { return $this->uploadedAt; }
    public function getPharmacyName(): ?string { return $this->pharmacyName; }

    public function toArray(): array
    {
        return [
            'prescription_id'  => $this->prescriptionId,
            'patient_id'       => $this->patientId,
            'pharmacy_id'      => $this->pharmacyId,
            'file_path'        => $this->filePath,
            'notes'            => $this->notes,
            'status'           => $this->status,
            'pharmacist_notes' => $this->pharmacistNotes,
            'verified_by'      => $this->verifiedBy,
            'uploaded_at'      => $this->uploadedAt,
            'pharmacy_name'    => $this->pharmacyName,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
