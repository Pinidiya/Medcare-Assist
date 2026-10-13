<?php

/**
 * Interface Authenticatable
 * 
 * Defines the contract for user authentication operations.
 * Implemented by the User abstract class and its subclasses.
 * 
 * OOP Concept: Abstraction - Defines a contract without implementation details.
 * OOP Concept: Polymorphism - Different user types can authenticate differently.
 */
interface Authenticatable
{
    /**
     * Authenticate a user with email and password.
     *
     * @param string $email    The user's email address.
     * @param string $password The plaintext password to verify.
     * @return array|null      User data array on success, null on failure.
     */
    public static function login(string $email, string $password): ?array;

    /**
     * Log out the current user by destroying the session.
     *
     * @return void
     */
    public function logout(): void;
}
