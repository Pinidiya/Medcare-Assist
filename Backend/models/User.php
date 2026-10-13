<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/interfaces/Authenticatable.php';
require_once __DIR__ . '/interfaces/Exportable.php';

/**
 * User - Abstract base class for all user roles (Patient, Pharmacist, Admin, etc.)
 * Implements core authentication and profile management.
 * 
 * OOP Concepts:
 * - Abstraction: Cannot be instantiated directly
 * - Encapsulation: Protected attributes with public getters
 * - Polymorphism: toArray() must be implemented by each child class
 */
abstract class User implements Authenticatable, Exportable
{
    protected int $id;
    protected string $fullName;
    protected string $email;
    protected string $passwordHash;
    protected string $role;
    protected ?string $phone;
    protected ?string $avatar;
    protected ?string $bio;
    protected bool $isActive;
    protected string $createdAt;
    protected string $updatedAt;

    public function __construct(array $data = [])
    {
        // Support both user_id (users table) and id (stock_managers table)
        $this->id = (int)($data['user_id'] ?? $data['id'] ?? 0);

        // Support both full_name and first_name + last_name
        if (isset($data['full_name'])) {
            $this->fullName = $data['full_name'];
        } else {
            $this->fullName = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        }

        $this->email = $data['email'] ?? '';
        $this->passwordHash = $data['password_hash'] ?? $data['password'] ?? '';
        $this->role = $data['role'] ?? '';
        $this->phone = $data['phone'] ?? null;
        $this->avatar = $data['avatar'] ?? null;
        $this->bio = $data['bio'] ?? null;
        $this->isActive = (bool)($data['is_active'] ?? true);
        $this->createdAt = $data['created_at'] ?? '';
        $this->updatedAt = $data['updated_at'] ?? '';
    }

    // ── Authentication ───────────────────────────────────────────

    /**
     * Authenticate a user by email and password.
     * Sets session variables on success.
     */
    public static function login(string $email, string $password): ?array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT user_id, full_name, email, password_hash, role, is_active, account_status
             FROM users WHERE email = :email LIMIT 1"
        );
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user) return null;
        if (!password_verify($password, $user['password_hash'])) return null;
        if (!$user['is_active']) return null;
        if (isset($user['account_status']) && $user['account_status'] === 'suspended') return null;

        // Set session
        $_SESSION['user_id']   = (int)$user['user_id'];
        $_SESSION['role']      = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];

        return $user;
    }

    /**
     * Destroy the current session (logout).
     */
    public function logout(): void
    {
        session_unset();
        session_destroy();
    }

    /**
     * Update the user's profile in the users table.
     */
    public function updateProfile(array $data): bool
    {
        $db = Database::getInstance()->getConnection();
        $allowedFields = ['full_name', 'email', 'phone', 'avatar', 'bio',
                          'family_contact', 'family_relationship',
                          'family_contact_2', 'family_relationship_2', 'is_sos_enabled'];

        $fields = [];
        $params = [':id' => $this->id];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`$field` = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE user_id = :id";
        $stmt = $db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Generate and save a password reset token for an email.
     */
    public static function generateResetToken(string $email): ?string
    {
        $db = Database::getInstance()->getConnection();
        // Check if user exists
        $stmt = $db->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        if (!$stmt->fetch()) return null;

        // Generate token
        $token = bin2hex(random_bytes(32));

        // Use MySQL's NOW() to prevent timezone mismatches between PHP and MySQL
        $update = $db->prepare("UPDATE users SET reset_token = :token, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE email = :email");
        $update->execute([':token' => $token, ':email' => $email]);

        return $token;
    }

    /**
     * Reset password using a valid token.
     */
    public static function resetPassword(string $token, string $newPassword): bool
    {
        $db = Database::getInstance()->getConnection();
        // Check valid token
        $stmt = $db->prepare("SELECT user_id FROM users WHERE reset_token = :token AND reset_token_expiry > NOW() LIMIT 1");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch();

        if (!$user) return false;

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID);
        $update = $db->prepare("UPDATE users SET password_hash = :hash, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = :id");
        return $update->execute([':hash' => $hash, ':id' => $user['user_id']]);
    }

    // ── Getters ──────────────────────────────────────────────────

    public function getId(): int
    {
        return $this->id;
    }

    public function getFullName(): string
    {
        return $this->fullName;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getRole(): string
    {
        return $this->role;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function getAvatar(): ?string
    {
        return $this->avatar;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    /**
     * Each child class must provide its own array representation.
     */
    abstract public function toArray(): array;

    public function toJSON(): string
    {
        return json_encode($this->toArray());
    }
}
