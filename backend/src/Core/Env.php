<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Cargador mínimo de variables de entorno desde el archivo .env del backend.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $vars = [];

    private static bool $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) {
            return;
        }
        self::$loaded = true;

        if (!is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $separator = strpos($line, '=');
            if ($separator === false) {
                continue;
            }

            $key = trim(substr($line, 0, $separator));
            $value = trim(substr($line, $separator + 1));
            if ($key === '') {
                continue;
            }

            if (
                strlen($value) >= 2
                && ($value[0] === '"' || $value[0] === "'")
                && $value[0] === substr($value, -1)
            ) {
                $value = substr($value, 1, -1);
            }

            // El entorno real del servidor tiene prioridad sobre el archivo.
            $fromEnvironment = getenv($key);
            self::$vars[$key] = $fromEnvironment === false ? $value : $fromEnvironment;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return self::$vars[$key] ?? $default;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null || $value === '') {
            throw new \RuntimeException(sprintf('Falta la variable de entorno "%s" en .env', $key));
        }

        return $value;
    }

    public static function getInt(string $key, int $default): int
    {
        $value = self::get($key);
        if ($value === null || !is_numeric($value)) {
            return $default;
        }

        return (int) $value;
    }
}
