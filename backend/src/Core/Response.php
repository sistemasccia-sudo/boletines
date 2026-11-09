<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Respuestas JSON de la API. Todas terminan la ejecución (`never`).
 */
final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /** @param array<string, string> $fields */
    public static function error(string $message, int $status, array $fields = []): never
    {
        self::json(
            [
                'error' => [
                    'message' => $message,
                    'fields' => $fields === [] ? new \stdClass() : $fields,
                ],
            ],
            $status
        );
    }
}
