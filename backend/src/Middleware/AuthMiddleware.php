<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\HttpException;
use App\Core\Jwt;
use App\Core\Request;

/**
 * Exige un JWT válido en el header `Authorization: Bearer ...`
 * y lo inyecta como claims en la petición.
 */
final class AuthMiddleware
{
    public static function handle(Request $request): void
    {
        $header = $request->header('Authorization');
        if ($header === null || preg_match('/^Bearer\s+(\S+)$/i', $header, $matches) !== 1) {
            throw new HttpException(401, 'Token de autenticación no proporcionado');
        }

        $claims = Jwt::decode($matches[1]);
        $request->setUser($claims);
    }

    private function __construct()
    {
    }
}
