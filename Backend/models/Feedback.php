<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * Feedback - Represents user feedback for MedcareAssist.
 * Implements Exportable interface.
 */
class Feedback implements Exportable
{
    private int $id;
    private ?int $userId;
    private int $rating;
    private string $feedbackText;
    private string $status;
    private string $createdAt;
    private string $updatedAt;
    private ?string $fullName;
    private ?string $email;

    public function __construct(array $data = [])
    {
        $this->id = (int)($data['id'] ?? 0);
        $this->userId = isset($data['user_id']) && $data['user_id'] !== null ? (int)$data['user_id'] : null;
        $this->rating = (int)($data['rating'] ?? 5);
        $this->feedbackText = $data['feedback_text'] ?? '';
        $this->status = $data['status'] ?? 'pending';
        $this->createdAt = $data['created_at'] ?? '';
        $this->updatedAt = $data['updated_at'] ?? '';
        $this->fullName = $data['full_name'] ?? null;
        $this->email = $data['email'] ?? null;
    }

    /**
     * Find a feedback entry by ID.
     */
    public static function findById(int $id): ?self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT f.*, u.full_name, u.email
             FROM feedbacks f
             LEFT JOIN users u ON f.user_id = u.user_id
             WHERE f.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    /**
     * Get all feedbacks, optionally filtered by status (JOIN users for full_name, email).
     */
    public static function getAll(?string $status = null): array
    {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT f.*, u.full_name, u.email
                FROM feedbacks f
                LEFT JOIN users u ON f.user_id = u.user_id";
        $params = [];

        if ($status !== null && $status !== '') {
            $sql .= " WHERE f.status = :status";
            $params[':status'] = $status;
        }

        $sql .= " ORDER BY f.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all approved feedbacks for public display.
     */
    public static function getApproved(): array
    {
        return self::getAll('approved');
    }

    /**
     * Create a new feedback entry.
     */
    public static function create(int $userId, int $rating, string $feedbackText): self
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO feedbacks (user_id, rating, feedback_text, status, created_at, updated_at)
             VALUES (:uid, :rating, :text, 'pending', NOW(), NOW())"
        );
        $stmt->execute([
            ':uid'    => $userId,
            ':rating' => $rating,
            ':text'   => $feedbackText,
        ]);

        $id = (int)$db->lastInsertId();
        return self::findById($id) ?? new self([
            'id'            => $id,
            'user_id'       => $userId,
            'rating'        => $rating,
            'feedback_text' => $feedbackText,
            'status'        => 'pending',
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Update the status of this feedback.
     */
    public function updateStatus(string $status): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "UPDATE feedbacks SET status = :status, updated_at = NOW() WHERE id = :id"
        );
        $result = $stmt->execute([
            ':status' => $status,
            ':id'     => $this->id,
        ]);

        if ($result) {
            $this->status = $status;
            $this->updatedAt = date('Y-m-d H:i:s');
        }

        return $result;
    }

    // ── Getters ──────────────────────────────────────────────────
    public function getId(): int { return $this->id; }
    public function getUserId(): ?int { return $this->userId; }
    public function getRating(): int { return $this->rating; }
    public function getFeedbackText(): string { return $this->feedbackText; }
    public function getStatus(): string { return $this->status; }
    public function getCreatedAt(): string { return $this->createdAt; }
    public function getUpdatedAt(): string { return $this->updatedAt; }
    public function getFullName(): ?string { return $this->fullName; }
    public function getEmail(): ?string { return $this->email; }

    /**
     * Delete a feedback entry by ID.
     */
    public static function delete(int $id): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("DELETE FROM feedbacks WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function toArray(): array
    {
        return [
            'id'            => $this->id,
            'user_id'       => $this->userId,
            'rating'        => $this->rating,
            'feedback_text' => $this->feedbackText,
            'status'        => $this->status,
            'created_at'    => $this->createdAt,
            'updated_at'    => $this->updatedAt,
            'full_name'     => $this->fullName,
            'email'         => $this->email,
        ];
    }

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
