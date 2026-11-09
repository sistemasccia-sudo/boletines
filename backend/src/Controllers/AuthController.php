<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Env;
use App\Core\HttpException;
use App\Core\Jwt;
use App\Core\RateLimiter;
use App\Core\Request;
use App\Repositories\UserRepository;

/**
 * Autenticación: login (con migración transparente de hash MD5/SHA1 legacy a bcrypt)
 * y consulta del usuario autenticado.
 */
final class AuthController
{
    private ?UserRepository $users = null;

    /** Conexión perezosa: la validación y el rate limiting no tocan la BD. */
    private function users(): UserRepository
    {
        return $this->users ??= new UserRepository();
    }

    /** @return array<string, mixed> */
    public function login(Request $request): array
    {
        $usuario = trim((string) $request->input('usuario', ''));
        $password = (string) $request->input('password', '');

        $fields = [];
        if ($usuario === '') {
            $fields['usuario'] = 'Ingrese su usuario';
        }
        if ($password === '') {
            $fields['password'] = 'Ingrese su contraseña';
        }
        if ($fields !== []) {
            throw new HttpException(422, 'Datos inválidos', $fields);
        }

        $maxAttempts = Env::getInt('LOGIN_MAX_ATTEMPTS', 10);
        $windowMinutes = Env::getInt('LOGIN_WINDOW_MINUTES', 15);
        $ipKey = 'login:ip:' . $request->ip();
        $userKey = 'login:usuario:' . strtolower($usuario);

        RateLimiter::assert($ipKey, $maxAttempts, $windowMinutes);
        RateLimiter::assert($userKey, $maxAttempts, $windowMinutes);

        $user = $this->users()->findByUsuario($usuario);

        if ($user === null || !$this->passwordMatches($password, (string) $user['password'])) {
            RateLimiter::hit($ipKey, $windowMinutes);
            RateLimiter::hit($userKey, $windowMinutes);
            throw new HttpException(401, 'Usuario o contraseña incorrectos');
        }

        if ((int) $user['estado'] !== 1) {
            throw new HttpException(403, 'Su usuario está inactivo. Contacte al administrador.');
        }

        // Migración transparente: si el hash legacy es MD5 o SHA1, se re-hashea con bcrypt.
        if (self::isLegacyHash((string) $user['password'])) {
            $this->users()->updatePassword(
                (int) $user['id'],
                password_hash($password, PASSWORD_BCRYPT)
            );
        }

        RateLimiter::clear($ipKey);
        RateLimiter::clear($userKey);

        $ttlMinutes = Env::getInt('JWT_TTL_MINUTES', 60);
        $issuedAt = time();

        $token = Jwt::encode([
            'sub' => (int) $user['id'],
            'usuario' => (string) $user['usuario'],
            'nombres' => (string) $user['nombres'],
            'apellidos' => (string) $user['apellidos'],
            'iat' => $issuedAt,
            'exp' => $issuedAt + ($ttlMinutes * 60),
        ]);

        return [
            'token' => $token,
            'expires_in' => $ttlMinutes * 60,
            'user' => self::toUserDto($user),
        ];
    }

    /** @return array<string, mixed> */
    public function me(Request $request): array
    {
        $claims = $request->user();
        $user = $this->users()->findById((int) ($claims['sub'] ?? 0));

        if ($user === null || (int) $user['estado'] !== 1) {
            throw new HttpException(401, 'Sesión no válida');
        }

        return ['user' => self::toUserDto($user)];
    }

    private function passwordMatches(string $plain, string $stored): bool
    {
        if (self::isLegacyHash($stored)) {
            return hash_equals(strtolower($stored), self::legacyDigest($plain, strlen($stored)));
        }

        return password_verify($plain, $stored);
    }

    /**
     * Detecta hashes legacy en hex: 32 caracteres = MD5, 40 = SHA1.
     */
    private static function isLegacyHash(string $stored): bool
    {
        return preg_match('/^[a-f0-9]{32}$/i', $stored) === 1
            || preg_match('/^[a-f0-9]{40}$/i', $stored) === 1;
    }

    /**
     * Digesto legacy del texto plano según la longitud del hash almacenado.
     */
    private static function legacyDigest(string $plain, int $length): string
    {
        return $length === 40 ? sha1($plain) : md5($plain);
    }

    /** @param array<string, mixed> $user @return array<string, mixed> */
    private static function toUserDto(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'nombres' => (string) $user['nombres'],
            'apellidos' => (string) $user['apellidos'],
            'usuario' => (string) $user['usuario'],
            'cargo' => $user['cargo'] !== null ? (string) $user['cargo'] : null,
        ];
    }
}
