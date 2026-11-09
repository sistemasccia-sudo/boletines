<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo de noticias (tnoticia + join a fuente_diarios).
 * Los listados NUNCA traen `cuerpo` (rendimiento, AGENTS.md).
 */
final class NoticiaRepository
{
    private const LIST_COLUMNS = 'n.idtnoticia AS id, n.titular AS titulo, n.bajada, n.fecha, n.tipo, '
        . 'n.fkfuente AS fuente_codigo, n.pagina_web AS mostrar_en_web, n.imagenes, f.nombre AS fuente_nombre';

    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'n.idtnoticia',
        'fecha' => 'n.fecha',
        'titulo' => 'n.titular',
        'tipo' => 'n.tipo',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, titulo, tipo, fuente, fecha_desde, fecha_hasta
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
            $where[] = 'n.titular LIKE :titulo';
            $bindings['titulo'] = '%' . addcslashes($titulo, '\\%_') . '%';
        }

        $tipo = (string) ($params['tipo'] ?? '');
        if (in_array($tipo, ['1', '2', '3', '4'], true)) {
            $where[] = 'n.tipo = :tipo';
            $bindings['tipo'] = $tipo;
        }

        $fuente = trim((string) ($params['fuente'] ?? ''));
        if ($fuente !== '') {
            $where[] = 'n.fkfuente = :fuente';
            $bindings['fuente'] = $fuente;
        }

        foreach (['fecha_desde' => '>=', 'fecha_hasta' => '<='] as $param => $operator) {
            $value = trim((string) ($params[$param] ?? ''));
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
                $where[] = 'n.fecha ' . $operator . ' :' . $param;
                $bindings[$param] = $value;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Db::connection();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tnoticia n' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sortColumn = self::SORTABLE[$sort] ?? self::SORTABLE['fecha'];

        $stmt = $pdo->prepare(
            'SELECT ' . self::LIST_COLUMNS . ' FROM tnoticia n'
            . ' LEFT JOIN fuente_diarios f ON f.codigo = n.fkfuente'
            . $whereSql
            . ' ORDER BY ' . $sortColumn . ' ' . $order . ', n.idtnoticia DESC'
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
            'SELECT n.idtnoticia AS id, n.titular AS titulo, n.bajada, n.cuerpo, n.fecha, n.tipo,'
            . ' n.fkfuente AS fuente_codigo, n.pagina_web AS mostrar_en_web, n.imagenes,'
            . ' f.nombre AS fuente_nombre FROM tnoticia n'
            . ' LEFT JOIN fuente_diarios f ON f.codigo = n.fkfuente'
            . ' WHERE n.idtnoticia = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data titulo, cuerpo, fuente_codigo, bajada, tipo, fecha, mostrar_en_web, imagen
     * @return int id generado
     */
    public function insert(array $data): int
    {
        $pdo = Db::connection();

        // La nueva noticia queda al final del orden de su día.
        $ordenStmt = $pdo->prepare(
            'SELECT IFNULL(MAX(orden), 0) + 1 FROM tnoticia WHERE fecha = :fecha_orden'
        );
        $ordenStmt->execute(['fecha_orden' => $data['fecha']]);
        $orden = (int) $ordenStmt->fetchColumn();

        $stmt = $pdo->prepare(
            'INSERT INTO tnoticia (titular, cuerpo, fkfuente, bajada, tipo, fecha, estado, pagina_web, imagenes, orden)'
            . ' VALUES (:titular, :cuerpo, :fkfuente, :bajada, :tipo, :fecha, 1, :pagina_web, :imagenes, :orden)'
        );
        $stmt->execute([
            'titular' => $data['titulo'],
            'cuerpo' => $data['cuerpo'],
            'fkfuente' => $data['fuente_codigo'],
            'bajada' => $data['bajada'],
            'tipo' => $data['tipo'],
            'fecha' => $data['fecha'],
            'pagina_web' => $data['mostrar_en_web'] ? 1 : 0,
            'imagenes' => $data['imagen'],
            'orden' => $orden,
        ]);

        return (int) $pdo->lastInsertId();
    }

    /**
     * @param array<string, mixed> $data titulo, cuerpo, fuente_codigo, bajada, tipo,
     *                                    mostrar_en_web; imagen opcional (clave presente ⇒
     *                                    se reemplaza; null ⇒ se elimina; ausente ⇒ sin cambios)
     */
    public function update(int $id, array $data): void
    {
        $sets = [
            'titular = :titular',
            'cuerpo = :cuerpo',
            'fkfuente = :fkfuente',
            'bajada = :bajada',
            'tipo = :tipo',
            'pagina_web = :pagina_web',
        ];
        $bindings = [
            'titular' => $data['titulo'],
            'cuerpo' => $data['cuerpo'],
            'fkfuente' => $data['fuente_codigo'],
            'bajada' => $data['bajada'],
            'tipo' => $data['tipo'],
            'pagina_web' => $data['mostrar_en_web'] ? 1 : 0,
            'id' => $id,
        ];

        if (array_key_exists('imagen', $data)) {
            $sets[] = 'imagenes = :imagenes';
            $bindings['imagenes'] = $data['imagen'];
        }

        $stmt = Db::connection()->prepare(
            'UPDATE tnoticia SET ' . implode(', ', $sets) . ' WHERE idtnoticia = :id'
        );
        $stmt->execute($bindings);
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM tnoticia WHERE idtnoticia = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Noticias de un día ordenadas por su posición («Cambiar orden»).
     * `$tipo` (1..4) filtra por tipo; vacío o inválido ⇒ todas (como en list()).
     *
     * @return list<array<string, mixed>>
     */
    public function listOrdenDelDia(string $fecha, string $tipo = ''): array
    {
        $where = 'fecha = :fecha';
        $bindings = ['fecha' => $fecha];

        if (in_array($tipo, ['1', '2', '3', '4'], true)) {
            $where .= ' AND tipo = :tipo';
            $bindings['tipo'] = $tipo;
        }

        $stmt = Db::connection()->prepare(
            'SELECT idtnoticia AS id, titular AS titulo, orden, fecha'
            . ' FROM tnoticia WHERE ' . $where
            . ' ORDER BY orden ASC, idtnoticia ASC'
        );
        $stmt->execute($bindings);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Intercambia el orden de dos noticias de la fecha indicada dentro de
     * UNA transacción (SELECT ... FOR UPDATE bloquea ambas filas hasta el
     * COMMIT). Devuelve false si alguna noticia no existe o no es de esa
     * fecha (las demás filas no se tocan).
     */
    public function swapOrden(int $idA, int $idB, string $fecha): bool
    {
        $pdo = Db::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT idtnoticia, orden FROM tnoticia'
                . ' WHERE idtnoticia IN (:id_a, :id_b) AND fecha = :fecha'
                . ' FOR UPDATE'
            );
            $stmt->bindValue('id_a', $idA, PDO::PARAM_INT);
            $stmt->bindValue('id_b', $idB, PDO::PARAM_INT);
            $stmt->bindValue('fecha', $fecha);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($rows) !== 2) {
                $pdo->rollBack();
                return false;
            }

            $ordenes = [];
            foreach ($rows as $row) {
                $ordenes[(int) $row['idtnoticia']] = (int) $row['orden'];
            }

            $update = $pdo->prepare('UPDATE tnoticia SET orden = :orden WHERE idtnoticia = :id');
            $update->execute(['orden' => $ordenes[$idB], 'id' => $idA]);
            $update->execute(['orden' => $ordenes[$idA], 'id' => $idB]);

            $pdo->commit();

            return true;
        } catch (\Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }
    }
}
