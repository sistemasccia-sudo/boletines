<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo Bol. Legal (normas_legales).
 *
 * Mapeo legacy: titular ← título, bajada ← norma legal, cuerpo ← cuerpo,
 * fecha ← fecha. `fecha_especial` se pone igual a `fecha` al crear (columna
 * NOT NULL que el módulo no expone); `estado` conserva su DEFAULT 1.
 */
final class LegalRepository
{
    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'id',
        'titulo' => 'titular',
        'norma_legal' => 'bajada',
        'fecha' => 'fecha',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, titulo, norma_legal, fecha_desde, fecha_hasta
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        // Búsqueda parcial por título / norma legal (LIKE escapando comodines).
        foreach (['titulo' => 'titular', 'norma_legal' => 'bajada'] as $param => $column) {
            $value = trim((string) ($params[$param] ?? ''));
            if ($value !== '') {
                $where[] = $column . ' LIKE :' . $param;
                $bindings[$param] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value) . '%';
            }
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

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM normas_legales' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['fecha'];

        // El listado no trae `cuerpo` (HTML pesado): solo el detalle.
        $stmt = $pdo->prepare(
            'SELECT id, titular, bajada, fecha FROM normas_legales'
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

    /** Detalle completo (incluye `cuerpo`). */
    public function find(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT id, titular, bajada, cuerpo, fecha FROM normas_legales WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data titulo, norma_legal (nullable), cuerpo, fecha
     * @return int id generado
     */
    public function insert(array $data): int
    {
        // fecha_especial = fecha: columna NOT NULL que el módulo no expone.
        $stmt = Db::connection()->prepare(
            'INSERT INTO normas_legales (titular, bajada, cuerpo, fecha, fecha_especial)'
            . ' VALUES (:titulo, :norma_legal, :cuerpo, :fecha, :fecha_especial)'
        );
        $stmt->execute([
            'titulo' => $data['titulo'],
            'norma_legal' => $data['norma_legal'],
            'cuerpo' => $data['cuerpo'],
            'fecha' => $data['fecha'],
            'fecha_especial' => $data['fecha'],
        ]);

        return (int) Db::connection()->lastInsertId();
    }

    /** @param array<string, mixed> $data titulo, norma_legal, cuerpo, fecha */
    public function update(int $id, array $data): void
    {
        // `fecha_especial` y `estado` no se tocan (los maneja el legacy).
        $stmt = Db::connection()->prepare(
            'UPDATE normas_legales SET titular = :titulo, bajada = :norma_legal,'
            . ' cuerpo = :cuerpo, fecha = :fecha WHERE id = :id'
        );
        $stmt->execute([
            'titulo' => $data['titulo'],
            'norma_legal' => $data['norma_legal'],
            'cuerpo' => $data['cuerpo'],
            'fecha' => $data['fecha'],
            'id' => $id,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM normas_legales WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
