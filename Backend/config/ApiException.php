<?php

/**
 * ApiException - A domain exception carrying an HTTP status code.
 *
 * Thrown by the service layer whenever a business rule is violated
 * (e.g. missing input, forbidden action, record not found). The HTTP
 * status code is embedded so controllers can translate it into a
 * proper response without mixing concerns.
 */
class ApiException extends \Exception
{
    public function __construct(string $message, int $statusCode = 400)
    {
        parent::__construct($message, $statusCode);
    }
}
