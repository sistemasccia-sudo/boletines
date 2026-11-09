<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo de fuentes de información (fuente_diarios).
 */
final class FuenteRepository
{
    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'id',
        'codigo' => 'codigo',
        'nombre' => 'nombre',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, nombre
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        $nombre = trim((string) ($params['nombre'] ?? ''));
        if ($nombre !== '') {
            $where[] = 'nombre LIKE :nombre';
            $bindings['nombre'] = '%' . addcslashes($nombre, '\\%_') . '%';
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Db::connection();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM fuente_diarios' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'codigo');
        $order = strtolower((string) ($params['order'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['codigo'];

        $stmt = $pdo->prepare(
            'SELECT id, codigo, nombre, state FROM fuente_diarios'
            . $whereSql
            . ' ORDER BY ' . $sortColumn . ' ' . $order . ', id ASC'
            . ' LIMIT :limit OFFSET :offset'
        );
        foreach ($bindings as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue('offset', ($page - 1) * $pageSize, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'meta' => ['page' => $page, 'pageSize' => $pageSize, 'total' => $total],
        ];
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT id, codigo, nombre, state FROM fuente_diarios WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * Crea con código consecutivo (MAX+1) calculado en la misma sentencia
     * (MyISAM bloquea la tabla durante el INSERT, evitando colisiones).
     */
    public function insert(string $nombre): int
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO fuente_diarios (codigo, nombre, state)'
            . ' SELECT IFNULL(MAX(codigo), 0) + 1, :nombre, 1 FROM fuente_diarios'
        );
        $stmt->execute(['nombre' => $nombre]);

        return (int) Db::connection()->lastInsertId();
    }

    public function update(int $id, string $nombre): bool
    {
        $stmt = Db::connection()->prepare(
            'UPDATE fuente_diarios SET nombre = :nombre WHERE id = :id'
        );
        $stmt->execute(['nombre' => $nombre, 'id' => $id]);

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM fuente_diarios WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /** true si el código de la fuente está referenciado por noticias o artículos. */
    public function isUsedByCodigo(string $codigo): bool
    {
        // Dos consultas separadas: un placeholder nombrado no puede repetirse
        // con consultas preparadas nativas (SQLSTATE HY093).
        $stmt = Db::connection()->prepare('SELECT COUNT(*) FROM tnoticia WHERE fkfuente = :fuente_noticias');
        $stmt->execute(['fuente_noticias' => $codigo]);
        if ((int) $stmt->fetchColumn() > 0) {
            return true;
        }

        $stmt = Db::connection()->prepare('SELECT COUNT(*) FROM tarticulo WHERE fkfuente = :fuente_articulos');
        $stmt->execute(['fuente_articulos' => $codigo]);

        return (int) $stmt->fetchColumn() > 0;
    }
}
