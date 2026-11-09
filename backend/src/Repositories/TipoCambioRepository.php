<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo de tipo de cambio (tcambio).
 *
 * Formato confirmado por el usuario (revisión en producción): la tabla
 * tiene columna `fuente` (allí se guarda la fuente seleccionada) y
 * compra/venta son VARCHAR con solo el monto (p. ej. "3.745").
 * Un registro por fecha.
 */
final class TipoCambioRepository
{
    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'id',
        'fecha' => 'fecha',
        'fuente' => 'fuente',
        'compra' => 'compra',
        'venta' => 'venta',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, fuente, fecha_desde, fecha_hasta
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        $fuente = trim((string) ($params['fuente'] ?? ''));
        if ($fuente !== '') {
            $where[] = 'fuente = :fuente';
            $bindings['fuente'] = $fuente;
        }

        foreach (['fecha_desde' => '>=', 'fecha_hasta' => '<='] as $param => $operator) {
            $value = trim((string) ($params[$param] ?? ''));
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
                $where[] = 'fecha ' . $operator . ' :' . $param;
                $bindings[$param] = $value;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Db::connection();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tcambio' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['fecha'];

        $stmt = $pdo->prepare(
            'SELECT id, fecha, compra, venta, fuente FROM tcambio'
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
        $stmt = Db::connection()->prepare(
            'SELECT id, fecha, compra, venta, fuente FROM tcambio WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /** Registro existente de la fecha (un tipo de cambio por día), opcionalmente excluyendo un id. */
    public function findByFecha(string $fecha, ?int $excludeId = null): ?array
    {
        $sql = 'SELECT id FROM tcambio WHERE fecha = :fecha';
        $bindings = ['fecha' => $fecha];

        if ($excludeId !== null) {
            $sql .= ' AND id != :id';
            $bindings['id'] = $excludeId;
        }

        $stmt = Db::connection()->prepare($sql);
        $stmt->execute($bindings);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data fecha, compra, venta, fuente (cada campo por separado)
     * @return int id generado
     */
    public function insert(array $data): int
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO tcambio (fecha, compra, venta, fuente)'
            . ' VALUES (:fecha, :compra, :venta, :fuente)'
        );
        $stmt->execute([
            'fecha' => $data['fecha'],
            'compra' => $data['compra'],
            'venta' => $data['venta'],
            'fuente' => $data['fuente'],
        ]);

        return (int) Db::connection()->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data fecha, compra, venta, fuente
     */
    public function update(int $id, array $data): void
    {
        $stmt = Db::connection()->prepare(
            'UPDATE tcambio SET fecha = :fecha, compra = :compra, venta = :venta, fuente = :fuente'
            . ' WHERE id = :id'
        );
        $stmt->execute([
            'fecha' => $data['fecha'],
            'compra' => $data['compra'],
            'venta' => $data['venta'],
            'fuente' => $data['fuente'],
            'id' => $id,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM tcambio WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
