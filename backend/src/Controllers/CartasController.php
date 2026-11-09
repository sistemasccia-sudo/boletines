<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\CartasRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de Cartas (cartas).
 *
 * El código NNN-AAAA viaja compuesto en la API y se guarda partido
 * (`codigo` int + `anio` year). La unicidad la garantiza el índice UNIQUE
 * de la migración 003 más un chequeo previo (y un 422 con el siguiente
 * código disponible ante colisión concurrente).
 */
final class CartasController
{
    private CartasRepository $cartas;

    public function __construct()
    {
        $this->cartas = new CartasRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->cartas->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = self::toDto($row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->cartas->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Carta no encontrada');
        }

        return self::toDto($row);
    }

    /**
     * Siguiente código correlativo del año actual (America/Lima), calculado
     * desde el mayor `codigo` registrado en la BD para ese año.
     *
     * @return array{codigo: string}
     */
    public function siguienteCodigo(Request $request): array
    {
        $anio = (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y');

        return ['codigo' => self::formatCodigo($this->nextCodigo((int) $anio), (int) $anio)];
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $this->assertNotDuplicated($data['codigo'], $data['anio'], null);

        $data['idusuario'] = self::usuarioId($request);
        $id = $this->insertCatchingDuplicate($data);

        $row = $this->cartas->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear la carta');
        }

        return self::toDto($row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->cartas->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Carta no encontrada');
        }

        $data = $this->validate($request);
        $this->assertNotDuplicated($data['codigo'], $data['anio'], $id);

        try {
            $this->cartas->update($id, $data);
        } catch (\PDOException $exception) {
            if ($this->isDuplicateKey($exception)) {
                $this->duplicateError($data['codigo'], $data['anio']);
            }
            throw $exception;
        }

        $row = $this->cartas->find($id);

        return self::toDto($row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->cartas->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Carta no encontrada');
        }

        $this->cartas->delete($id);

        return ['message' => 'Carta eliminada'];
    }

    /** Valida y normaliza el JSON de entrada. */
    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'codigo' => ['rules' => 'required|regex:/^\d{1,9}-\d{4}$/', 'label' => 'Código'],
            'remitente' => ['rules' => 'required|max:100', 'label' => 'Remitente'],
            'destinatario' => ['rules' => 'required|max:100', 'label' => 'Destinatario'],
            'asunto' => ['rules' => 'required|max:255', 'label' => 'Asunto'],
        ]);

        [$numero, $anio] = self::parseCodigo((string) $input['codigo']);

        return [
            'codigo' => $numero,
            'anio' => $anio,
            'remitente' => trim((string) $input['remitente']),
            'destinatario' => trim((string) $input['destinatario']),
            'asunto' => trim((string) $input['asunto']),
        ];
    }

    /** Un código por (número, año). */
    private function assertNotDuplicated(int $codigo, int $anio, ?int $excludeId): void
    {
        if ($this->cartas->findByCodigo($codigo, $anio, $excludeId) !== null) {
            $this->duplicateError($codigo, $anio);
        }
    }

    private function duplicateError(int $codigo, int $anio): never
    {
        // Sugerencia: el mayor código de ese año + 1.
        $siguiente = $this->nextCodigo($anio);

        throw new HttpException(422, 'Datos inválidos', [
            'codigo' => sprintf(
                'El código %s ya existe. El siguiente disponible es %s.',
                self::formatCodigo($codigo, $anio),
                self::formatCodigo($siguiente, $anio),
            ),
        ]);
    }

    /** @param array<string, mixed> $data */
    private function insertCatchingDuplicate(array $data): int
    {
        try {
            return $this->cartas->insert($data);
        } catch (\PDOException $exception) {
            // Colisión concurrente + índice UNIQUE (migración 003).
            if ($this->isDuplicateKey($exception)) {
                $this->duplicateError($data['codigo'], $data['anio']);
            }
            throw $exception;
        }
    }

    private function isDuplicateKey(\PDOException $exception): bool
    {
        return str_starts_with((string) $exception->getCode(), '23000')
            || str_contains($exception->getMessage(), 'Duplicate entry');
    }

    private function nextCodigo(int $anio): int
    {
        return $this->cartas->maxCodigoDelAnio($anio) + 1;
    }

    /** Id del usuario autenticado (`sub` del JWT) para `cartas.idusuario`. */
    private static function usuarioId(Request $request): int
    {
        $id = (int) ($request->user()['sub'] ?? 0);
        if ($id < 1) {
            throw new HttpException(401, 'Sesión no válida');
        }

        return $id;
    }

    /** @return array{0: int, 1: int} [número, año] */
    private static function parseCodigo(string $codigo): array
    {
        if (preg_match('/^(\d{1,9})-(\d{4})$/', $codigo, $matches) !== 1) {
            throw new HttpException(422, 'Datos inválidos', [
                'codigo' => 'Formato no válido (NNN-AAAA, p. ej. 571-2026).',
            ]);
        }

        return [(int) $matches[1], (int) $matches[2]];
    }

    private static function formatCodigo(int $numero, int $anio): string
    {
        return sprintf('%03d-%d', $numero, $anio);
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toDto(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'codigo' => self::formatCodigo((int) $row['codigo'], (int) $row['anio']),
            'remitente' => (string) $row['remitente'],
            'destinatario' => (string) $row['destinatario'],
            'asunto' => (string) $row['asunto'],
            // `fecha` es timestamp: se expone solo la fecha (AAAA-MM-DD).
            'fecha' => substr((string) $row['fecha'], 0, 10),
            // Quién registró la carta (JOIN con usuarios; '' si no se resuelve).
            'usuario' => trim(
                (string) ($row['usuario_nombres'] ?? '') . ' ' . (string) ($row['usuario_apellidos'] ?? '')
            ),
        ];
    }
}
