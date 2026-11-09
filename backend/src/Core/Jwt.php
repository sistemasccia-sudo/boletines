<?php

declare(strict_types=1);

namespace App\Core;

/**
 * JWT HS256 mínimo (access token corto) sin dependencias externas.
 * Se usa hash_hmac con la secreta definida en JWT_SECRET (.env).
 */
final class Jwt
{
    /** @param array<string, mixed> $claims */
    public static function encode(array $claims): string
    {
        $header = self::base64UrlEncode(
            json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR)
        );
        $payload = self::base64UrlEncode(json_encode($claims, JSON_THROW_ON_ERROR));
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $payload, self::secret(), true)
        );

        return $header . '.' . $payload . '.' . $signature;
    }

    /** @return array<string, mixed> */
    public static function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new HttpException(401, 'Token inválido');
        }

        [$header, $payload, $signature] = $parts;

        $expected = self::base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $payload, self::secret(), true)
        );
        if (!hash_equals($expected, $signature)) {
            throw new HttpException(401, 'Token inválido');
        }

        try {
            $headerData = json_decode(self::base64UrlDecode($header), true, 512, JSON_THROW_ON_ERROR);
            $claims = json_decode(self::base64UrlDecode($payload), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpException(401, 'Token inválido');
        }

        if (
            !is_array($headerData)
            || ($headerData['alg'] ?? null) !== 'HS256'
            || !is_array($claims)
        ) {
            throw new HttpException(401, 'Token inválido');
        }

        if (isset($claims['exp']) && time() >= (int) $claims['exp']) {
            throw new HttpException(401, 'Sesión expirada, vuelva a iniciar sesión');
        }

        return $claims;
    }

    private static function secret(): string
    {
        $secret = Env::require('JWT_SECRET');
        if (strlen($secret) < 32) {
            throw new \RuntimeException('JWT_SECRET debe tener al menos 32 caracteres');
        }

        return $secret;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new HttpException(401, 'Token inválido');
        }

        return $decoded;
    }
}
