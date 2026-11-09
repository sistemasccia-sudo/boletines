<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Error controlado que se traduce a una respuesta JSON con el HTTP status indicado.
 */
final class HttpException extends \RuntimeException
{
    /** @param array<string, string> $fields */
    public function __construct(
        private readonly int $status,
        string $message,
        private readonly array $fields = []
    ) {
        parent::__construct($message);
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    /** @return array<string, string> */
    public function getFields(): array
    {
        return $this->fields;
    }
}
