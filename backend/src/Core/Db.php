<?php

declare(strict_types=1);

namespace App\Core;

use PDO;

/**
 * Conexión PDO única a la base de datos MySQL existente.
 * Emulación de consultas preparadas desactivada (solo consultas reales preparadas).
 */
final class Db
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            Env::require('DB_HOST'),
            Env::require('DB_PORT'),
            Env::require('DB_NAME'),
            Env::get('DB_CHARSET', 'utf8mb4')
        );

        // La contraseña puede ser vacía (p. ej. XAMPP local): no se exige con require().
        self::$connection = new PDO($dsn, Env::require('DB_USER'), Env::get('DB_PASS', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$connection;
    }

    private function __construct()
    {
    }
}
