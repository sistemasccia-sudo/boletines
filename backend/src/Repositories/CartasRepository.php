<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

/**
 * SQL del módulo Cartas (cartas).
 *
 * El código NNN-AAAA se guarda partido en la BD: `codigo` (int) + `anio`
 * (year). `idusuario` lo aporta la autenticación y `fecha` su DEFAULT.
 * Unicidad de código: índice UNIQUE (codigo, anio) = migración 003.
 */
final class CartasRepository
{
    /** Lista blanca de ordenamiento (sin input del usuario en SQL). */
    private const SORTABLE = [
        'id' => 'idcartas',
        'remitente' => 'remitente',
        'destinatario' => 'destinatario',
        'asunto' => 'asunto',
        'fecha' => 'fecha',
    ];

    /**
     * @param array<string, mixed> $params page, pageSize, sort, order, codigo, remitente, destinatario, asunto, fecha_desde, fecha_hasta
     * @return array{data: list<array<string, mixed>>, meta: array{page: int, pageSize: int, total: int}}
     */
    public function list(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = min(100, max(1, (int) ($params['pageSize'] ?? 20)));

        $where = [];
        $bindings = [];

        // Filtro por columna: «NNN-AAAA» completo → coincidencia exacta
        // (la BD guarda el número sin ceros: 001-2026 = código 1); si no,
        // búsqueda parcial sobre el código compuesto («571», «2026»…).
        $codigo = trim((string) ($params['codigo'] ?? ''));
        if ($codigo !== '') {
            if (preg_match('/^0*(\d+)-(\d{4})$/', $codigo, $matches) === 1) {
                $where[] = 'codigo = :codigo AND anio = :anio';
                $bindings['codigo'] = (int) $matches[1];
                $bindings['anio'] = (int) $matches[2];
            } else {
                $where[] = "CONCAT(codigo, '-', anio) LIKE :codigo";
                $bindings['codigo'] = '%' . $this->escapeLike($codigo) . '%';
            }
        }

        foreach (['remitente', 'destinatario', 'asunto'] as $param) {
            $value = trim((string) ($params[$param] ?? ''));
            if ($value !== '') {
                $where[] = $param . ' LIKE :' . $param;
                $bindings[$param] = '%' . $this->escapeLike($value) . '%';
            }
        }

        // `fecha` es timestamp: `hasta` se lleva al final del día.
        foreach (['fecha_desde' => '>=', 'fecha_hasta' => '<='] as $param => $operator) {
            $value = trim((string) ($params[$param] ?? ''));
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
                $where[] = 'fecha ' . $operator . ' :' . $param;
                $bindings[$param] = $param === 'fecha_hasta' ? $value . ' 23:59:59' : $value;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pdo = Db::connection();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM cartas' . $whereSql);
        $stmt->execute($bindings);
        $total = (int) $stmt->fetchColumn();

        $sort = (string) ($params['sort'] ?? 'fecha');
        $order = strtolower((string) ($params['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        if ($sort === 'codigo') {
            // El código se ordena por año y luego por número (NNN).
            $orderBy = 'anio ' . $order . ', codigo ' . $order;
        } else {
            $orderBy = (self::SORTABLE[$sort] ?? self::SORTABLE['fecha']) . ' ' . $order;
        }

        // JOIN con usuarios para mostrar quién registró la carta.
        $stmt = $pdo->prepare(
            'SELECT cartas.idcartas AS id, cartas.codigo, cartas.anio, cartas.remitente,'
            . ' cartas.destinatario, cartas.asunto, cartas.fecha,'
            . ' u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos'
            . ' FROM cartas LEFT JOIN usuarios u ON u.id = cartas.idusuario'
            . $whereSql
            . ' ORDER BY ' . $orderBy . ', idcartas DESC'
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
            'SELECT cartas.idcartas AS id, cartas.codigo, cartas.anio, cartas.remitente,'
            . ' cartas.destinatario, cartas.asunto, cartas.fecha,'
            . ' u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos'
            . ' FROM cartas LEFT JOIN usuarios u ON u.id = cartas.idusuario'
            . ' WHERE cartas.idcartas = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /** Carta existente con ese código (para el 422 de duplicado). */
    public function findByCodigo(int $codigo, int $anio, ?int $excludeId = null): ?array
    {
        $sql = 'SELECT idcartas FROM cartas WHERE codigo = :codigo AND anio = :anio';
        $bindings = ['codigo' => $codigo, 'anio' => $anio];

        if ($excludeId !== null) {
            $sql .= ' AND idcartas != :id';
            $bindings['id'] = $excludeId;
        }

        $stmt = Db::connection()->prepare($sql);
        $stmt->execute($bindings);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /** Mayor código registrado en un año (0 si el año no tiene cartas). */
    public function maxCodigoDelAnio(int $anio): int
    {
        $stmt = Db::connection()->prepare(
            'SELECT COALESCE(MAX(codigo), 0) FROM cartas WHERE anio = :anio'
        );
        $stmt->execute(['anio' => $anio]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $data codigo, anio, remitente, destinatario, asunto, idusuario
     * @return int id generado
     */
    public function insert(array $data): int
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO cartas (codigo, anio, remitente, destinatario, asunto, idusuario)'
            . ' VALUES (:codigo, :anio, :remitente, :destinatario, :asunto, :idusuario)'
        );
        $stmt->execute([
            'codigo' => $data['codigo'],
            'anio' => $data['anio'],
            'remitente' => $data['remitente'],
            'destinatario' => $data['destinatario'],
            'asunto' => $data['asunto'],
            'idusuario' => $data['idusuario'],
        ]);

        return (int) Db::connection()->lastInsertId();
    }

    /** @param array<string, mixed> $data codigo, anio, remitente, destinatario, asunto */
    public function update(int $id, array $data): void
    {
        $stmt = Db::connection()->prepare(
            'UPDATE cartas SET codigo = :codigo, anio = :anio, remitente = :remitente,'
            . ' destinatario = :destinatario, asunto = :asunto WHERE idcartas = :id'
        );
        $stmt->execute([
            'codigo' => $data['codigo'],
            'anio' => $data['anio'],
            'remitente' => $data['remitente'],
            'destinatario' => $data['destinatario'],
            'asunto' => $data['asunto'],
            'id' => $id,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM cartas WHERE idcartas = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /** Escapa comodines de LIKE (barra incluida por defecto en MySQL). */
    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
