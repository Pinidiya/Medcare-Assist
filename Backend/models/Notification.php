<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * Notification - Represents a system notification for a user.
 * Implements Exportable interface.
 */
class Notification implements Exportable
{
    private int $notificationId;
    private int $userId;
    private string $title;
    private string $body;
    private string $type;
    private bool $isRead;
    private ?string $link;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->notificationId = (int)($data['notification_id'] ?? 0);
        $this->userId = (int)($data['user_id'] ?? 0);
        $this->title = $data['title'] ?? '';
        $this->body = $data['body'] ?? '';
        $this->type = $data['type'] ?? 'info';
        $this->isRead = (bool)($data['is_read'] ?? false);
        $this->link = $data['link'] ?? null;
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Get all notifications for a specific user.
     */
    public static function getByUser(int $userId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC"
        );
        $stmt->execute([':uid' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            return (new self($row))->toArray();
        }, $rows);
    }

    /**
     * Create a new notification for a user.
     */
    public static function create(int $userId, string $title, string $body, string $type = 'info', ?string $link = null): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO notifications (user_id, title, body, type, is_read, link, created_at)
             VALUES (:uid, :title, :body, :type, 0, :link, NOW())"
        );
        $stmt->execute([
            ':uid'   => $userId,
            ':title' => $title,
            ':body'  => $body,
            ':type'  => $type,
            ':link'  => $link,
        ]);

        $id = (int)$db->lastInsertId();
        return new self([
            'notification_id' => $id,
            'user_id'         => $userId,
            'title'           => $title,
            'body'            => $body,
            'type'            => $type,
            'is_read'         => 0,
            'link'            => $link,
            'created_at'      => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Get unread notification count for a user.
     */
    public static function getUnreadCount(int $userId): int
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT COUNT(*) AS count FROM notifications WHERE user_id = :uid AND is_read = 0"
        );
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($row['count'] ?? 0);
    }

    /**
     * Mark this notification as read.
     */
    public function markAsRead(): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE notifications SET is_read = 1 WHERE notification_id = :id"
        );
        $result = $stmt->execute([':id' => $this->notificationId]);
        if ($result) {
            $this->isRead = true;
        }
        return $result;
    }

    /**
     * Mark all notifications as read for a user.
     */
    public static function markAllAsRead(int $userId): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0"
        );
        return $stmt->execute([':uid' => $userId]);
    }

    // ── Getters ──────────────────────────────────────────────────
    public function getNotificationId(): int { return $this->notificationId; }
    public function getUserId(): int { return $this->userId; }
    public function getTitle(): string { return $this->title; }
    public function getBody(): string { return $this->body; }
    public function getType(): string { return $this->type; }
    public function isRead(): bool { return $this->isRead; }
    public function getLink(): ?string { return $this->link; }
    public function getCreatedAt(): string { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'notification_id' => $this->notificationId,
            'user_id'         => $this->userId,
            'title'           => $this->title,
            'body'            => $this->body,
            'type'            => $this->type,
            'is_read'         => $this->isRead,
            'link'            => $this->link,
            'created_at'      => $this->createdAt,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
