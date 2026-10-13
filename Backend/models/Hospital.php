<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Searchable.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * Hospital - Represents a hospital or medical facility.
 * Implements Searchable and Exportable interfaces.
 */
class Hospital implements Searchable, Exportable
{
    private int $hospitalId;
    private string $name;
    private ?string $address;
    private ?string $phone;
    private ?string $email;
    private string $type;
    private ?string $district;
    private ?float $latitude;
    private ?float $longitude;
    private ?string $operatingHours;
    private bool $hasEmergency;
    private bool $isActive;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->hospitalId = (int)($data['hospital_id'] ?? 0);
        $this->name = $data['name'] ?? '';
        $this->address = $data['address'] ?? null;
        $this->phone = $data['phone'] ?? null;
        $this->email = $data['email'] ?? null;
        $this->type = $data['type'] ?? 'government';
        $this->district = $data['district'] ?? null;
        $this->latitude = isset($data['latitude']) && $data['latitude'] !== null ? (float)$data['latitude'] : null;
        $this->longitude = isset($data['longitude']) && $data['longitude'] !== null ? (float)$data['longitude'] : null;
        $this->operatingHours = $data['operating_hours'] ?? null;
        $this->hasEmergency = (bool)($data['has_emergency'] ?? true);
        $this->isActive = (bool)($data['is_active'] ?? true);
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Find a hospital by ID.
     */
    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM hospitals WHERE hospital_id = :id AND is_active = 1 LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    /**
     * Get all active hospitals, optionally filtered by district.
     */
    public static function getAll(?string $district = null): array
    {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT * FROM hospitals WHERE is_active = 1";
        $params = [];

        if ($district !== null && $district !== '') {
            $sql .= " AND district = :district";
            $params[':district'] = $district;
        }

        $sql .= " ORDER BY name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Search hospitals matching query string (Searchable interface).
     */
    public static function search(string $query): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM hospitals 
             WHERE is_active = 1 
               AND (name LIKE :q OR address LIKE :q2 OR district LIKE :q3 OR type LIKE :q4) 
             ORDER BY name ASC"
        );
        $q = '%' . $query . '%';
        $stmt->execute([':q' => $q, ':q2' => $q, ':q3' => $q, ':q4' => $q]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find nearby hospitals using Haversine formula (similar to SOSAlert::getNearbyHospitals).
     */
    public static function findNearby(float $lat, float $lng, float $radiusKm = 50.0, int $limit = 10): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            SELECT hospital_id, name, address, phone, email, type, district, latitude, longitude, operating_hours, has_emergency, is_active, created_at,
            (
                6371 * acos(
                    cos(radians(:lat1)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(:lng)) +
                    sin(radians(:lat2)) * sin(radians(latitude))
                )
            ) AS distance_km
            FROM hospitals
            WHERE is_active = 1
            HAVING distance_km < :radius
            ORDER BY distance_km ASC
            LIMIT :lim
        ");
        $stmt->bindValue(':lat1', $lat);
        $stmt->bindValue(':lat2', $lat);
        $stmt->bindValue(':lng', $lng);
        $stmt->bindValue(':radius', $radiusKm);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ── Getters ──────────────────────────────────────────────────
    public function getHospitalId(): int { return $this->hospitalId; }
    public function getName(): string { return $this->name; }
    public function getAddress(): ?string { return $this->address; }
    public function getPhone(): ?string { return $this->phone; }
    public function getEmail(): ?string { return $this->email; }
    public function getType(): string { return $this->type; }
    public function getDistrict(): ?string { return $this->district; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function getLongitude(): ?float { return $this->longitude; }
    public function getOperatingHours(): ?string { return $this->operatingHours; }
    public function hasEmergency(): bool { return $this->hasEmergency; }
    public function isActive(): bool { return $this->isActive; }
    public function getCreatedAt(): string { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'hospital_id'     => $this->hospitalId,
            'name'            => $this->name,
            'address'         => $this->address,
            'phone'           => $this->phone,
            'email'           => $this->email,
            'type'            => $this->type,
            'district'        => $this->district,
            'latitude'        => $this->latitude,
            'longitude'       => $this->longitude,
            'operating_hours' => $this->operatingHours,
            'has_emergency'   => $this->hasEmergency,
            'is_active'       => $this->isActive,
            'created_at'      => $this->createdAt,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
