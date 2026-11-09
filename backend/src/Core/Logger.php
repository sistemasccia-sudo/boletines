<?php

declare(strict_types=1);

namespace App\Core;

use Throwable;

/**
 * Registro de errores en el servidor. NUNCA se exponen trazas al cliente
 * (AGENTS.md); el motivo real queda en `storage/app.log` para diagnóstico.
 */
final class Logger
{
    private const MAX_BYTES = 2_000_000;

    /**
     * Escribe un Throwable con contexto (método, URI, traza breve).
     * Si no puede escribir el archivo, cae a `error_log()` de PHP.
     */
    public static function error(string $channel, Throwable $e): void
    {
        $line = sprintf(
            "[%s] [%s] %s: %s\n  at %s:%d\n  %s %s\n  %s\n\n",
            date('Y-m-d H:i:s'),
            $channel,
            $e::class,
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
            $_SERVER['REQUEST_METHOD'] ?? '-',
            $_SERVER['REQUEST_URI'] ?? '-',
            self::shortTrace($e),
        );

        $path = dirname(__DIR__, 2) . '/storage/app.log';
        $directory = dirname($path);

        if (!is_dir($directory)) {
            @mkdir($directory, 0755, true);
        }

        // Rotación simple para que el log no crezca sin límite.
        if (is_file($path) && @filesize($path) > self::MAX_BYTES) {
            @rename($path, $path . '.old');
        }

        if (@file_put_contents($path, $line, FILE_APPEND | LOCK_EX) === false) {
            error_log(sprintf('[%s] %s in %s:%d', $channel, $e->getMessage(), $e->getFile(), $e->getLine()));
        }
    }

    /** Primeras líneas de la traza: suficiente para ubicar el fallo sin logs gigantes. */
    private static function shortTrace(Throwable $e): string
    {
        $lines = explode("\n", $e->getTraceAsString());

        return implode("\n    ", array_slice($lines, 0, 12));
    }

    private function __construct()
    {
    }
}
