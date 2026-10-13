<?php

class Database
{
    private static ?Database $instance = null;
    private PDO $connection;

    private string $host;
    private string $dbName;
    private string $username;
    private string $password;
    private int $port;

    private function __construct()
    {
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->port = (int)(getenv('DB_PORT') ?: 3306);
        $this->dbName = getenv('DB_NAME') ?: 'medcare_assist_db';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASS') ?: '';

        $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbName};charset=utf8mb4";

        $this->connection = new PDO($dsn, $this->username, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        return $this->connection;
    }

    // Prevent cloning and unserialization
    private function __clone() {}
    public function __wakeup()
    {
        throw new Exception("Cannot unserialize singleton");
    }
}
