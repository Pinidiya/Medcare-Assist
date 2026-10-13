<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * OrderItem - Represents an individual item in a pharmacy order.
 * Implements Exportable interface for standardized array/JSON serialization.
 */
class OrderItem implements Exportable
{
    private int $orderItemId;
    private int $orderId;
    private int $medicineId;
    private int $quantity;
    private float $unitPrice;
    private string $itemType;

    public function __construct(array $data = [])
    {
        $this->orderItemId = (int)($data['order_item_id'] ?? 0);
        $this->orderId = (int)($data['order_id'] ?? 0);
        $this->medicineId = (int)($data['medicine_id'] ?? 0);
        $this->quantity = (int)($data['quantity'] ?? 0);
        $this->unitPrice = (float)($data['unit_price'] ?? 0.00);
        $this->itemType = $data['item_type'] ?? 'prescribed';
    }

    /**
     * Get items for a given order (JOIN with master_medicines for brand_name, generic_name).
     */
    public static function getByOrder(int $orderId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT oi.*, mm.brand_name, mm.generic_name
             FROM order_items oi
             JOIN master_medicines mm ON oi.medicine_id = mm.medicine_id
             WHERE oi.order_id = :oid
             ORDER BY oi.order_item_id ASC"
        );
        $stmt->execute([':oid' => $orderId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new order item.
     */
    public static function create(int $orderId, int $medicineId, int $quantity, float $unitPrice, string $itemType = 'prescribed'): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
             VALUES (:oid, :mid, :qty, :price, :type)"
        );
        $stmt->execute([
            ':oid'   => $orderId,
            ':mid'   => $medicineId,
            ':qty'   => $quantity,
            ':price' => $unitPrice,
            ':type'  => $itemType,
        ]);

        $orderItemId = (int)$db->lastInsertId();

        return new self([
            'order_item_id' => $orderItemId,
            'order_id'      => $orderId,
            'medicine_id'   => $medicineId,
            'quantity'      => $quantity,
            'unit_price'    => $unitPrice,
            'item_type'     => $itemType,
        ]);
    }

    // ── Getters ─────────────────────────────────
    public function getOrderItemId(): int { return $this->orderItemId; }
    public function getOrderId(): int { return $this->orderId; }
    public function getMedicineId(): int { return $this->medicineId; }
    public function getQuantity(): int { return $this->quantity; }
    public function getUnitPrice(): float { return $this->unitPrice; }
    public function getItemType(): string { return $this->itemType; }

    public function toArray(): array
    {
        return [
            'order_item_id' => $this->orderItemId,
            'order_id'      => $this->orderId,
            'medicine_id'   => $this->medicineId,
            'quantity'      => $this->quantity,
            'unit_price'    => $this->unitPrice,
            'item_type'     => $this->itemType,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
