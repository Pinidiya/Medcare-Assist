<?php

/**
 * Interface Exportable
 * 
 * Defines the contract for entities that can be serialized to array/JSON format.
 * Implemented by all model classes for consistent data output.
 * 
 * OOP Concept: Abstraction - Standardizes data serialization across models.
 * OOP Concept: Polymorphism - Each model exports its own specific fields.
 */
interface Exportable
{
    /**
     * Convert the entity to an associative array.
     *
     * @return array The entity data as key-value pairs.
     */
    public function toArray(): array;

    /**
     * Convert the entity to a JSON string.
     *
     * @return string The entity data as JSON.
     */
    public function toJSON(): string;
}
