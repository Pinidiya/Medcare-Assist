<?php

/**
 * Interface Searchable
 * 
 * Defines the contract for entities that support search and lookup operations.
 * Implemented by MasterMedicine, Pharmacy, Hospital, etc.
 * 
 * OOP Concept: Abstraction - Common search behavior across different entities.
 * OOP Concept: Polymorphism - Each entity searches its own data differently.
 */
interface Searchable
{
    /**
     * Search for entities matching the given query string.
     *
     * @param string $query The search term.
     * @return array        Array of matching results.
     */
    public static function search(string $query): array;

    /**
     * Find a single entity by its primary key.
     *
     * @param int $id The primary key value.
     * @return self|null The entity instance or null if not found.
     */
    public static function findById(int $id): ?self;
}
