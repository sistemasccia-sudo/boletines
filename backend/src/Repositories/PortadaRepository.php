<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo de portadas (portadas: fecha + archivo).
 */
final class PortadaRepository
{
    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'id',
        'fecha' => 'fecha',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, fecha_desde, fecha_hasta
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        foreach (['fecha_desde' => '>=', 'fecha_hasta' => '<='] as $param => $operator) {
            $value = trim((string) ($params[$param] ?? ''));
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
                $where[] = 'fecha ' . $operator . ' :' . $param;
                $bindings[$param] = $value;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Db::connection();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM portadas' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['fecha'];

        $stmt = $pdo->prepare(
            'SELECT id, fecha, archivo FROM portadas'
            . $whereSql
            . ' ORDER BY ' . $sortColumn . ' ' . $order . ', id DESC'
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
        $stmt = Db::connection()->prepare('SELECT id, fecha, archivo FROM portadas WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /** @return int id generado */
    public function insert(string $fecha, string $archivo): int
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO portadas (fecha, archivo) VALUES (:fecha, :archivo)'
        );
        $stmt->execute(['fecha' => $fecha, 'archivo' => $archivo]);

        return (int) Db::connection()->lastInsertId();
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM portadas WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
