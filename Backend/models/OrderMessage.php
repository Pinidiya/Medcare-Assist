<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * OrderMessage - Represents a message sent regarding an order.
 * Implements Exportable interface for standardized array/JSON serialization.
 */
class OrderMessage implements Exportable
{
    private int $messageId;
    private int $orderId;
    private string $senderRole;
    private string $message;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->messageId = (int)($data['message_id'] ?? 0);
        $this->orderId = (int)($data['order_id'] ?? 0);
        $this->senderRole = $data['sender_role'] ?? 'patient';
        $this->message = $data['message'] ?? '';
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Get all messages for an order.
     */
    public static function getByOrder(int $orderId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM order_messages WHERE order_id = :oid ORDER BY created_at ASC"
        );
        $stmt->execute([':oid' => $orderId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Send a new message for an order.
     */
    public static function sendMessage(int $orderId, string $senderRole, string $message): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO order_messages (order_id, sender_role, message, created_at)
             VALUES (:oid, :role, :msg, NOW())"
        );
        $stmt->execute([
            ':oid'  => $orderId,
            ':role' => $senderRole,
            ':msg'  => $message,
        ]);

        $messageId = (int)$db->lastInsertId();

        return new self([
            'message_id'  => $messageId,
            'order_id'    => $orderId,
            'sender_role' => $senderRole,
            'message'     => $message,
            'created_at'  => date('Y-m-d H:i:s'),
        ]);
    }

    // ── Getters ─────────────────────────────────
    public function getMessageId(): int { return $this->messageId; }
    public function getOrderId(): int { return $this->orderId; }
    public function getSenderRole(): string { return $this->senderRole; }
    public function getMessage(): string { return $this->message; }
    public function getCreatedAt(): string { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'message_id'  => $this->messageId,
            'order_id'    => $this->orderId,
            'sender_role' => $this->senderRole,
            'message'     => $this->message,
            'created_at'  => $this->createdAt,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
