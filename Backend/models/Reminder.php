<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Reminder - Medicine reminder for patients.
 * Demonstrates Encapsulation (private props, public methods).
 */
class Reminder
{
    private int $reminderId;
    private int $patientId;
    private string $medicineName;
    private string $reminderTime;
    private string $frequency;
    private bool $isActive;
    private ?string $endDate;
    private string $createdAt;

    public function __construct(array $data = [])
    {
        $this->reminderId = (int)($data['reminder_id'] ?? 0);
        $this->patientId = (int)($data['patient_id'] ?? 0);
        $this->medicineName = $data['medicine_name'] ?? '';
        $this->reminderTime = $data['reminder_time'] ?? '';
        $this->frequency = $data['frequency'] ?? 'Every 24 hours';
        $this->isActive = (bool)($data['is_active'] ?? true);
        $this->endDate = $data['end_date'] ?? null;
        $this->createdAt = $data['created_at'] ?? '';
    }

    /**
     * Get all active reminders for a patient.
     */
    public static function getByPatient(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT * FROM reminders WHERE patient_id = :pid AND is_active = 1 ORDER BY reminder_time ASC"
        );
        $stmt->execute([':pid' => $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            return (new self($row))->toArray();
        }, $rows);
    }

    /**
     * Create a new reminder.
     */
    public static function setReminder(int $patientId, string $medicineName, string $time, string $frequency, ?string $endDate = null): self
    {
        $frequencyMap = [
            '1' => 'Every 24 hours',
            '2' => 'Every 12 hours',
            '3' => 'Every 8 hours',
            '4' => 'Every 6 hours',
        ];
        $frequencyStr = $frequencyMap[$frequency] ?? $frequency;

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO reminders (patient_id, medicine_name, reminder_time, frequency, is_active, end_date)
             VALUES (:pid, :name, :time, :freq, 1, :end_date)"
        );
        $stmt->execute([
            ':pid'      => $patientId,
            ':name'     => $medicineName,
            ':time'     => $time,
            ':freq'     => $frequencyStr,
            ':end_date' => $endDate,
        ]);

        return new self([
            'reminder_id'   => (int)$db->lastInsertId(),
            'patient_id'    => $patientId,
            'medicine_name' => $medicineName,
            'reminder_time' => $time,
            'frequency'     => $frequencyStr,
            'is_active'     => 1,
            'end_date'      => $endDate,
        ]);
    }

    /**
     * Check which reminders are due at the current time.
     */
    public static function getDueReminders(int $patientId): array
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            "SELECT reminder_id, medicine_name, reminder_time, frequency, end_date
             FROM reminders
             WHERE patient_id = :pid AND is_active = 1"
        );
        $stmt->execute([':pid' => $patientId]);
        $reminders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = new DateTime();
        $dueReminders = [];

        foreach ($reminders as $rem) {
            // Check if past end date
            if (!empty($rem['end_date']) && $now > new DateTime($rem['end_date'] . ' 23:59:59')) {
                continue;
            }

            // Parse frequency to hours
            $hours = 24;
            if (preg_match('/(\d+)\s*hours?/i', $rem['frequency'], $m)) {
                $hours = (int)$m[1];
            }

            // Check if current time matches any scheduled slot
            $baseTime = new DateTime($rem['reminder_time']);
            $currentHour = (int)$now->format('H');
            $currentMinute = (int)$now->format('i');
            $baseHour = (int)$baseTime->format('H');
            $baseMinute = (int)$baseTime->format('i');

            if ($currentMinute === $baseMinute) {
                $diff = ($currentHour - $baseHour + 24) % 24;
                if ($diff % $hours === 0) {
                    $dueReminders[] = [
                        'reminder_id'   => $rem['reminder_id'],
                        'medicine_name' => $rem['medicine_name'],
                        'reminder_time' => $rem['reminder_time'],
                        'frequency'     => $rem['frequency'],
                    ];
                }
            }
        }

        return $dueReminders;
    }

    /**
     * Trigger alarm (placeholder - returns reminder info for frontend notification).
     */
    public function triggerAlarm(): array
    {
        return [
            'alert'         => true,
            'medicine_name' => $this->medicineName,
            'reminder_time' => $this->reminderTime,
            'message'       => "Time to take your medicine: {$this->medicineName}",
        ];
    }

    // ── Getters ─────────────────────────────────
    public function getReminderId(): int { return $this->reminderId; }
    public function getMedicineName(): string { return $this->medicineName; }
    public function getReminderTime(): string { return $this->reminderTime; }
    public function getFrequency(): string { return $this->frequency; }
    public function isActive(): bool { return $this->isActive; }

    public function toArray(): array
    {
        return [
            'reminder_id'   => $this->reminderId,
            'patient_id'    => $this->patientId,
            'medicine_name' => $this->medicineName,
            'reminder_time' => $this->reminderTime,
            'frequency'     => $this->frequency,
            'is_active'     => $this->isActive,
            'end_date'      => $this->endDate,
        ];
    }
}
