<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Env;
use App\Core\Request;

/**
 * Headers CORS restringidos al origen configurado en CORS_ORIGIN (.env).
 * Resuelve el preflight OPTIONS con 204.
 */
final class CorsMiddleware
{
    public static function handle(Request $request): void
    {
        /** @var array{origin: ?string, allow_methods: array<int, string>, allow_headers: array<int, string>, max_age: int} $config */
        $config = require dirname(__DIR__, 2) . '/config/cors.php';

        $requestOrigin = $request->header('Origin');
        $allowedOrigin = $config['origin'];

        if (
            is_string($allowedOrigin)
            && $allowedOrigin !== ''
            && is_string($requestOrigin)
            && hash_equals($allowedOrigin, $requestOrigin)
        ) {
            header('Access-Control-Allow-Origin: ' . $allowedOrigin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: ' . implode(', ', $config['allow_methods']));
            header('Access-Control-Allow-Headers: ' . implode(', ', $config['allow_headers']));
            header('Access-Control-Max-Age: ' . $config['max_age']);
        }

        if ($request->method() === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private function __construct()
    {
    }
}
