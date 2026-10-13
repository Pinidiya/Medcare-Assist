<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * MasterMedicine - Represents a medicine in the master catalog.
 * Used by Patient to search medicines and by DigitalPrescription to reference items.
 */
class MasterMedicine
{
    private int $medicineId;
    private string $brandName;
    private string $genericName;
    private ?string $category;
    private ?string $description;
    private bool $requiresPrescription;
    private bool $isActive;

    public function __construct(array $data = [])
    {
        $this->medicineId = (int)($data['medicine_id'] ?? 0);
        $this->brandName = $data['brand_name'] ?? '';
        $this->genericName = $data['generic_name'] ?? '';
        $this->category = $data['category'] ?? null;
        $this->description = $data['description'] ?? null;
        $this->requiresPrescription = (bool)($data['requires_prescription'] ?? true);
        $this->isActive = (bool)($data['is_active'] ?? true);
    }

    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM master_medicines WHERE medicine_id = :id AND is_active = 1 LIMIT 1");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        return $data ? new self($data) : null;
    }

    /**
     * Search medicines across verified pharmacies with optional location-based sorting.
     */
    public static function search(string $query = '', string $district = '', ?float $lat = null, ?float $lng = null): array
    {
        $db = Database::getInstance()->getConnection();
        $useLocation = ($lat !== null && $lng !== null);

        $sql = "SELECT m.medicine_id, m.brand_name, m.generic_name, m.category, m.description,
                       m.requires_prescription, p.pharmacy_id, p.pharmacy_name, p.address,
                       p.district, p.phone, p.latitude, p.longitude,
                       pi.stock_quantity, pi.unit_price";

        if ($useLocation) {
            $sql .= ", (6371 * acos(cos(radians(:lat1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng1)) + sin(radians(:lat2)) * sin(radians(p.latitude)))) AS distance";
        } else {
            $sql .= ", NULL AS distance";
        }

        $sql .= " FROM master_medicines m
                  JOIN pharmacy_inventory pi ON m.medicine_id = pi.medicine_id
                  JOIN pharmacies p ON pi.pharmacy_id = p.pharmacy_id
                  WHERE m.is_active = 1 AND pi.stock_quantity > 0
                    AND p.verification_status = 'fully_verified'";

        if (!empty($query)) {
            $sql .= " AND (m.brand_name LIKE :q1 OR m.generic_name LIKE :q2)";
        }
        if (!empty($district)) {
            $sql .= " AND p.district = :district";
        }

        $sql .= " ORDER BY distance ASC, pi.unit_price ASC";

        $stmt = $db->prepare($sql);

        if ($useLocation) {
            $stmt->bindValue(':lat1', $lat);
            $stmt->bindValue(':lng1', $lng);
            $stmt->bindValue(':lat2', $lat);
        }
        if (!empty($query)) {
            $searchParam = "%$query%";
            $stmt->bindValue(':q1', $searchParam);
            $stmt->bindValue(':q2', $searchParam);
        }
        if (!empty($district)) {
            $stmt->bindValue(':district', $district);
        }

        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by medicine name to merge duplicates
        $medicines = [];
        foreach ($results as $row) {
            $groupKey = strtolower(trim($row['brand_name']) . '|' . trim($row['generic_name']));
            
            if (!isset($medicines[$groupKey])) {
                $medicines[$groupKey] = [
                    'medicine_id'           => $row['medicine_id'], // Default ID
                    'brand_name'            => $row['brand_name'],
                    'generic_name'          => $row['generic_name'],
                    'category'              => $row['category'],
                    'description'           => $row['description'],
                    'requires_prescription' => (int)$row['requires_prescription'],
                    'pharmacies'            => [],
                ];
            }
            
            // Add pharmacy, but include the specific medicine_id this pharmacy stocks
            $medicines[$groupKey]['pharmacies'][] = [
                'pharmacy_id'    => $row['pharmacy_id'],
                'medicine_id'    => $row['medicine_id'], // The actual ID this pharmacy has
                'pharmacy_name'  => $row['pharmacy_name'],
                'address'        => $row['address'],
                'district'       => $row['district'],
                'phone'          => $row['phone'],
                'latitude'       => $row['latitude'],
                'longitude'      => $row['longitude'],
                'stock_quantity' => $row['stock_quantity'],
                'unit_price'     => $row['unit_price'],
                'distance'       => $row['distance'] ? round((float)$row['distance'], 2) : null,
            ];
        }

        // Return values and sort by brand_name
        $finalResults = array_values($medicines);
        usort($finalResults, function($a, $b) {
            return strcmp($a['brand_name'], $b['brand_name']);
        });
        
        return $finalResults;
    }

    /**
     * Get details with all pharmacies stocking this medicine.
     */
    public function getDetails(): array
    {
        $arr = $this->toArray();
        $arr['pharmacies'] = $this->getPharmacies();
        return $arr;
    }

    /**
     * Get pharmacies that stock this medicine.
     */
    public function getPharmacies(): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT p.pharmacy_id, p.pharmacy_name, p.address, p.district, p.phone,
                    p.latitude, p.longitude, pi.stock_quantity, pi.unit_price
             FROM pharmacy_inventory pi
             JOIN pharmacies p ON pi.pharmacy_id = p.pharmacy_id
             WHERE pi.medicine_id = :mid AND pi.stock_quantity > 0
               AND p.verification_status = 'fully_verified'
             ORDER BY pi.unit_price ASC"
        );
        $stmt->execute([':mid' => $this->medicineId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ── Getters ─────────────────────────────────
    public function getMedicineId(): int { return $this->medicineId; }
    public function getBrandName(): string { return $this->brandName; }
    public function getGenericName(): string { return $this->genericName; }
    public function requiresPrescription(): bool { return $this->requiresPrescription; }

    public function toArray(): array
    {
        return [
            'medicine_id'           => $this->medicineId,
            'brand_name'            => $this->brandName,
            'generic_name'          => $this->genericName,
            'category'              => $this->category,
            'description'           => $this->description,
            'requires_prescription' => $this->requiresPrescription,
            'is_active'             => $this->isActive,
        ];
    }
}
