<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * SOSAlert - Emergency alert system for patients.
 * Finds nearby hospitals and notifies emergency contacts.
 */
class SOSAlert
{
    private int $sosId;
    private int $userId;
    private float $latitude;
    private float $longitude;
    private string $status;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->sosId = (int)($data['sos_id'] ?? 0);
        $this->userId = (int)($data['user_id'] ?? 0);
        $this->latitude = (float)($data['latitude'] ?? 0.0);
        $this->longitude = (float)($data['longitude'] ?? 0.0);
        $this->status = $data['status'] ?? 'active';
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Trigger a new SOS alert.
     * Gets user info, finds nearest hospitals, returns emergency data.
     */
    public static function triggerAlert(int $userId, float $latitude, float $longitude): array
    {
        $db = Database::getInstance()->getConnection();

        // Get user info and emergency contacts
        $userStmt = $db->prepare(
            "SELECT full_name, phone, family_contact, family_contact_2
             FROM users WHERE user_id = :uid"
        );
        $userStmt->execute([':uid' => $userId]);
        $user = $userStmt->fetch();

        if (!$user) {
            throw new RuntimeException('User not found');
        }

        // Collect emergency contacts
        $emergencyContacts = [];
        if (!empty($user['family_contact'])) {
            $emergencyContacts[] = $user['family_contact'];
        }
        if (!empty($user['family_contact_2'])) {
            $emergencyContacts[] = $user['family_contact_2'];
        }

        // Find nearest hospitals using Haversine formula
        $hospitals = self::getNearbyHospitals($latitude, $longitude);

        return [
            'user_name'          => $user['full_name'],
            'user_phone'         => $user['phone'],
            'location'           => ['latitude' => $latitude, 'longitude' => $longitude],
            'emergency_contacts' => $emergencyContacts,
            'nearest_hospitals'  => $hospitals,
            'status'             => 'triggered',
        ];
    }

    /**
     * Find the 5 nearest hospitals using Haversine formula.
     */
    public static function getNearbyHospitals(float $lat, float $lng, int $limit = 5, float $radiusKm = 50.0): array
    {
        require_once __DIR__ . '/Hospital.php';
        return Hospital::findNearby($lat, $lng, $radiusKm, $limit);
    }

    /**
     * Resolve/deactivate an SOS alert.
     */
    public function resolveAlert(): bool
    {
        $this->status = 'resolved';
        return true;
    }

    // ── Getters ─────────────────────────────────
    public function getSosId(): int { return $this->sosId; }
    public function getLatitude(): float { return $this->latitude; }
    public function getLongitude(): float { return $this->longitude; }
    public function getStatus(): string { return $this->status; }

    public function toArray(): array
    {
        return [
            'sos_id'    => $this->sosId,
            'user_id'   => $this->userId,
            'latitude'  => $this->latitude,
            'longitude' => $this->longitude,
            'status'    => $this->status,
            'created_at'=> $this->createdAt,
        ];
    }
}
