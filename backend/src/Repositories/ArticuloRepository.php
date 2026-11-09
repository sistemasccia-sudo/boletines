<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo de artículos (tarticulo). Los listados NUNCA traen `cuerpo`.
 */
final class ArticuloRepository
{
    private const LIST_COLUMNS = 'idtnoticia AS id, titular AS titulo, bajada, fecha, imagenes';

    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'idtnoticia',
        'fecha' => 'fecha',
        'titulo' => 'titular',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, titulo, fecha_desde, fecha_hasta
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        $titulo = trim((string) ($params['titulo'] ?? ''));
        if ($titulo !== '') {
            $where[] = 'titular LIKE :titulo';
            $bindings['titulo'] = '%' . addcslashes($titulo, '\\%_') . '%';
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

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tarticulo' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['fecha'];

        $stmt = $pdo->prepare(
            'SELECT ' . self::LIST_COLUMNS . ' FROM tarticulo'
            . $whereSql
            . ' ORDER BY ' . $sortColumn . ' ' . $order . ', idtnoticia DESC'
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
            'SELECT idtnoticia AS id, titular AS titulo, bajada, cuerpo, fecha, imagenes'
            . ' FROM tarticulo WHERE idtnoticia = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data titulo, cuerpo, bajada, fecha, imagen
     * @return int id generado
     */
    public function insert(array $data): int
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO tarticulo (titular, cuerpo, bajada, fecha, estado, imagenes)'
            . ' VALUES (:titular, :cuerpo, :bajada, :fecha, 1, :imagenes)'
        );
        $stmt->execute([
            'titular' => $data['titulo'],
            'cuerpo' => $data['cuerpo'],
            'bajada' => $data['bajada'],
            'fecha' => $data['fecha'],
            'imagenes' => $data['imagen'],
        ]);

        return (int) Db::connection()->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data titulo, cuerpo, bajada; imagen opcional
     *                                   (clave presente ⇒ se reemplaza; null ⇒ se elimina)
     */
    public function update(int $id, array $data): void
    {
        $sets = [
            'titular = :titular',
            'cuerpo = :cuerpo',
            'bajada = :bajada',
        ];
        $bindings = [
            'titular' => $data['titulo'],
            'cuerpo' => $data['cuerpo'],
            'bajada' => $data['bajada'],
            'id' => $id,
        ];

        if (array_key_exists('imagen', $data)) {
            $sets[] = 'imagenes = :imagenes';
            $bindings['imagenes'] = $data['imagen'];
        }

        $stmt = Db::connection()->prepare(
            'UPDATE tarticulo SET ' . implode(', ', $sets) . ' WHERE idtnoticia = :id'
        );
        $stmt->execute($bindings);
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM tarticulo WHERE idtnoticia = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
