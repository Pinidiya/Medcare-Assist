<?php

class MedicineRequest
{
    private int $id;
    private string $medicineName;
    private ?string $genericComposition;
    private ?string $company;
    private string $reason;
    private string $status;
    private ?int $requestedBy;
    private string $createdAt;
    private string $updatedAt;

    public function __construct(array $data = [])
    {
        $this->id = (int)($data['id'] ?? 0);
        $this->medicineName = $data['medicine_name'] ?? '';
        $this->genericComposition = $data['generic_composition'] ?? null;
        $this->company = $data['company'] ?? null;
        $this->reason = $data['reason'] ?? '';
        $this->status = $data['status'] ?? 'pending';
        $this->requestedBy = isset($data['requested_by']) ? (int)$data['requested_by'] : null;
        $this->createdAt = $data['created_at'] ?? '';
        $this->updatedAt = $data['updated_at'] ?? '';
    }

    public static function getAll(int $managerId = 0): array
    {
        $db = Database::getInstance()->getConnection();
        if ($managerId > 0) {
            $stmt = $db->prepare("SELECT * FROM medicine_requests WHERE requested_by = :id ORDER BY created_at DESC");
            $stmt->execute([':id' => $managerId]);
        } else {
            $stmt = $db->prepare("SELECT * FROM medicine_requests ORDER BY created_at DESC");
            $stmt->execute();
        }
        return array_map(fn($row) => new self($row), $stmt->fetchAll());
    }

    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM medicine_requests WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    public static function create(array $data, int $requestedBy): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO medicine_requests (medicine_name, generic_composition, company, reason, requested_by)
             VALUES (:medicine_name, :generic_composition, :company, :reason, :requested_by)"
        );

        $stmt->execute([
            ':medicine_name' => $data['medicine_name'],
            ':generic_composition' => $data['generic_composition'] ?? null,
            ':company' => $data['company'] ?? null,
            ':reason' => $data['reason'],
            ':requested_by' => $requestedBy,
        ]);

        $id = (int)$db->lastInsertId();
        return self::findById($id);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'medicine_name' => $this->medicineName,
            'generic_composition' => $this->genericComposition,
            'company' => $this->company,
            'reason' => $this->reason,
            'status' => $this->status,
            'requested_by' => $this->requestedBy,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
