<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Bloqueo temporal básico basado en archivo (para /auth/login).
 * No requiere tablas nuevas en la base de datos.
 */
final class RateLimiter
{
    private const STORAGE_FILE = 'rate_limit.json';

    public static function assert(string $key, int $maxAttempts, int $windowMinutes): void
    {
        $entries = self::read();
        $now = time();
        $windowSeconds = $windowMinutes * 60;

        $recent = 0;
        foreach ($entries[$key] ?? [] as $timestamp) {
            if ($now - (int) $timestamp < $windowSeconds) {
                $recent++;
            }
        }

        if ($recent >= $maxAttempts) {
            throw new HttpException(
                429,
                'Demasiados intentos de acceso. Espere unos minutos y vuelva a intentarlo.'
            );
        }
    }

    public static function hit(string $key, int $windowMinutes): void
    {
        $entries = self::read();
        $now = time();
        $windowSeconds = $windowMinutes * 60;

        $current = [];
        foreach ($entries[$key] ?? [] as $timestamp) {
            if ($now - (int) $timestamp < $windowSeconds) {
                $current[] = (int) $timestamp;
            }
        }
        $current[] = $now;

        $entries[$key] = $current;
        self::prune($entries, $windowSeconds);
        self::write($entries);
    }

    public static function clear(string $key): void
    {
        $entries = self::read();
        if (!isset($entries[$key])) {
            return;
        }
        unset($entries[$key]);
        self::write($entries);
    }

    /** @return array<string, array<int, int>> */
    private static function read(): array
    {
        $path = self::path();
        if (!is_file($path)) {
            return [];
        }

        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        try {
            flock($handle, LOCK_SH);
            $contents = stream_get_contents($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }

        if (!is_string($contents) || trim($contents) === '') {
            return [];
        }

        $decoded = json_decode($contents, true);

        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string, array<int, int>> $entries */
    private static function write(array $entries): void
    {
        $path = self::path();
        $handle = @fopen($path, 'cb');
        if ($handle === false) {
            error_log('[boletin-api] No se pudo abrir el archivo de rate limiting: ' . $path);
            return;
        }

        try {
            flock($handle, LOCK_EX);
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($entries) ?: '{}');
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
    }

    /**
     * Elimina las entradas vencidas de todas las claves.
     *
     * @param array<string, array<int, int>> $entries
     */
    private static function prune(array &$entries, int $windowSeconds): void
    {
        $cutoff = time() - $windowSeconds;
        foreach ($entries as $key => $timestamps) {
            $valid = array_values(array_filter($timestamps, static fn (int $t): bool => $t >= $cutoff));
            if ($valid === []) {
                unset($entries[$key]);
            } else {
                $entries[$key] = $valid;
            }
        }
    }

    private static function path(): string
    {
        $directory = dirname(__DIR__, 2) . '/storage';
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        return $directory . '/' . self::STORAGE_FILE;
    }
}
