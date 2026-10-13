<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * MedicalLocker - Secure document storage for patient medical records.
 * Demonstrates Encapsulation with file access control.
 */
class MedicalLocker
{
    private int $lockerId;
    private int $patientId;
    private string $documentName;
    private string $documentUrl;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->lockerId = (int)($data['locker_id'] ?? 0);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->documentName = $data['document_name'] ?? '';
        $this->documentUrl = $data['document_url'] ?? '';
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Get all documents for a patient.
     */
    public static function getByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT locker_id, document_name, document_url, created_at
             FROM medical_locker WHERE patient_id = :pid ORDER BY created_at DESC"
        );
        $stmt->execute([':pid' => $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            return (new self($row))->toArray();
        }, $rows);
    }

    /**
     * Upload a new document to the locker.
     */
    public static function uploadDocument(int $patientId, string $documentName, array $file): self
    {
        // Validate file
        $allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        $allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
        $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($file['type'], $allowedTypes) || !in_array($fileExt, $allowedExts)) {
            throw new InvalidArgumentException('Invalid file type. Only PDF and images allowed.');
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            throw new InvalidArgumentException('File size exceeds 5MB limit.');
        }

        // Server-side MIME type check
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, $allowedTypes)) {
            throw new InvalidArgumentException('Invalid file content.');
        }

        // Secure storage directory
        $storageDir = __DIR__ . '/../../storage/medical_locker/';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
            file_put_contents($storageDir . '.htaccess', "Require all denied\nOptions -Indexes");
        }

        // Generate secure filename
        $secureFilename = bin2hex(random_bytes(16)) . '_' . time() . '.' . $fileExt;
        $targetPath = $storageDir . $secureFilename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new RuntimeException('Failed to move uploaded file.');
        }

        // Save to database
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO medical_locker (patient_id, document_name, document_url) VALUES (:pid, :name, :url)"
        );
        $stmt->execute([
            ':pid'  => $patientId,
            ':name' => $documentName,
            ':url'  => $secureFilename,
        ]);

        return new self([
            'locker_id'     => (int)$db->lastInsertId(),
            'patient_id'    => $patientId,
            'document_name' => $documentName,
            'document_url'  => $secureFilename,
            'created_at'    => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Delete this document from locker and filesystem.
     */
    public function deleteDocument(): bool
    {
        $db = Database::getInstance()->getConnection();

        // Delete from database
        $stmt = $db->prepare("DELETE FROM medical_locker WHERE locker_id = :id AND patient_id = :pid");
        $stmt->execute([':id' => $this->lockerId, ':pid' => $this->patientId]);

        // Delete file from filesystem
        $filepath = __DIR__ . '/../../storage/medical_locker/' . $this->documentUrl;
        if (file_exists($filepath)) {
            unlink($filepath);
        }

        return $stmt->rowCount() > 0;
    }

    /**
     * Get the file path for viewing/downloading.
     * Validates ownership before returning path.
     */
    public function viewDocument(int $requestingPatientId): ?string
    {
        if ($this->patientId !== $requestingPatientId) {
            return null; // Access denied
        }

        $filepath = __DIR__ . '/../../storage/medical_locker/' . $this->documentUrl;
        return file_exists($filepath) ? $filepath : null;
    }

    /**
     * Find a specific locker document by ID and patient.
     */
    public static function findByIdAndPatient(int $lockerId, int $patientId): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM medical_locker WHERE locker_id = :id AND patient_id = :pid LIMIT 1"
        );
        $stmt->execute([':id' => $lockerId, ':pid' => $patientId]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    // ── Getters ─────────────────────────────────
    public function getLockerId(): int { return $this->lockerId; }
    public function getDocumentName(): string { return $this->documentName; }
    public function getDocumentUrl(): string { return $this->documentUrl; }

    public function toArray(): array
    {
        return [
            'locker_id'     => $this->lockerId,
            'patient_id'    => $this->patientId,
            'document_name' => $this->documentName,
            'document_url'  => $this->documentUrl,
            'created_at'    => $this->createdAt,
        ];
    }
}
