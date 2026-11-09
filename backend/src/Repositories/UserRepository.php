<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * Acceso a datos de la tabla `usuarios` (solo consultas preparadas).
 */
final class UserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Db::connection();
    }

    /** @return array<string, mixed>|null */
    public function findByUsuario(string $usuario): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, nombres, apellidos, usuario, password, cargo, estado
             FROM usuarios
             WHERE usuario = :usuario
             LIMIT 1'
        );
        $statement->execute([':usuario' => $usuario]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, nombres, apellidos, usuario, password, cargo, estado
             FROM usuarios
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute([':id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $statement = $this->db->prepare(
            'UPDATE usuarios SET password = :password WHERE id = :id'
        );
        $statement->execute([
            ':password' => $passwordHash,
            ':id' => $id,
        ]);
    }
}
