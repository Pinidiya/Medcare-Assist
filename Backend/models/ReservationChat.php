<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * ReservationChat - Chat messages linked to a reservation.
 * Demonstrates Encapsulation with private properties and controlled access.
 */
class ReservationChat
{
    private int $messageId;
    private int $reservationId;
    private int $senderId;
    private string $senderRole;
    private string $messageText;
    private bool $isRead;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->messageId = (int)($data['message_id'] ?? 0);
        $this->reservationId = (int)($data['reservation_id'] ?? 0);
        $this->senderId = (int)($data['sender_id'] ?? 0);
        $this->senderRole = $data['sender_role'] ?? 'patient';
        $this->messageText = $data['message_text'] ?? '';
        $this->isRead = (bool)($data['is_read'] ?? false);
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Get all chat messages for a reservation.
     */
    public static function getByReservation(int $reservationId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT rc.*, u.full_name AS sender_name
             FROM reservation_chats rc
             JOIN users u ON rc.sender_id = u.user_id
             WHERE rc.reservation_id = :rid
             ORDER BY rc.created_at ASC"
        );
        $stmt->execute([':rid' => $reservationId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            return (new self($row))->toArray() + ['sender_name' => $row['sender_name']];
        }, $rows);
    }

    /**
     * Send a new chat message.
     */
    public static function sendMessage(int $reservationId, int $senderId, string $role, string $text): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
             VALUES (:rid, :sid, :role, :msg, NOW())"
        );
        $stmt->execute([
            ':rid'  => $reservationId,
            ':sid'  => $senderId,
            ':role' => $role,
            ':msg'  => $text,
        ]);

        return new self([
            'message_id'     => (int)$db->lastInsertId(),
            'reservation_id' => $reservationId,
            'sender_id'      => $senderId,
            'sender_role'    => $role,
            'message_text'   => $text,
            'is_read'        => false,
        ]);
    }

    /**
     * Mark this message as read.
     */
    public function markAsRead(): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("UPDATE reservation_chats SET is_read = 1 WHERE message_id = :id");
        $stmt->execute([':id' => $this->messageId]);
        $this->isRead = true;
        return $stmt->rowCount() > 0;
    }

    // ── Getters ─────────────────────────────────
    public function getMessageId(): int { return $this->messageId; }
    public function getReservationId(): int { return $this->reservationId; }
    public function getSenderRole(): string { return $this->senderRole; }
    public function getMessageText(): string { return $this->messageText; }
    public function isRead(): bool { return $this->isRead; }

    public function toArray(): array
    {
        return [
            'message_id'     => $this->messageId,
            'reservation_id' => $this->reservationId,
            'sender_id'      => $this->senderId,
            'sender_role'    => $this->senderRole,
            'message_text'   => $this->messageText,
            'is_read'        => $this->isRead,
            'created_at'     => $this->createdAt,
        ];
    }
}
