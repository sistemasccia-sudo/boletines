<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\TipoCambioRepository;

/**
 * CRUD de tipo de cambio (tcambio).
 *
 * Formato confirmado por el usuario (revisión en producción): la tabla
 * tiene columna `fuente` (allí se guarda la fuente seleccionada) y
 * compra/venta son VARCHAR con **solo el monto** (p. ej. "3.745"). Un
 * registro por fecha → 422 (índice UNIQUE en la migración 008 +
 * chequeo previo aquí).
 */
final class TipoCambioController
{
    private const FUENTES = ['SUNAT', 'RPP', 'EL COMERCIO'];

    private TipoCambioRepository $tiposCambio;

    public function __construct()
    {
        $this->tiposCambio = new TipoCambioRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->tiposCambio->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = self::toDto($row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->tiposCambio->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Tipo de cambio no encontrado');
        }

        return self::toDto($row);
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $this->assertNotDuplicated($data, null);

        $id = $this->insertCatchingDuplicate($data);
        $row = $this->tiposCambio->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear el tipo de cambio');
        }

        return self::toDto($row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->tiposCambio->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Tipo de cambio no encontrado');
        }

        $data = $this->validate($request);
        $this->assertNotDuplicated($data, $id);

        try {
            $this->tiposCambio->update($id, $data);
        } catch (\PDOException $exception) {
            if ($this->isDuplicateKey($exception)) {
                $this->duplicateError((string) $data['fecha']);
            }
            throw $exception;
        }

        $row = $this->tiposCambio->find($id);

        return self::toDto($row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->tiposCambio->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Tipo de cambio no encontrado');
        }

        $this->tiposCambio->delete($id);

        return ['message' => 'Tipo de cambio eliminado'];
    }

    /**
     * Valida y normaliza el JSON de entrada: cada campo se guarda por
     * separado (sin componer texto).
     *
     * @return array<string, mixed>
     */
    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'fuente' => ['rules' => 'required|in:' . implode(',', self::FUENTES), 'label' => 'Fuente'],
            'compra' => ['rules' => 'required|decimal:4|positive', 'label' => 'Compra'],
            'venta' => ['rules' => 'required|decimal:4|positive', 'label' => 'Venta'],
            'fecha' => ['rules' => 'required|date', 'label' => 'Fecha'],
        ]);

        return [
            'fuente' => (string) $input['fuente'],
            'compra' => trim((string) $input['compra']),
            'venta' => trim((string) $input['venta']),
            'fecha' => (string) $input['fecha'],
        ];
    }

    /** Un registro por fecha. */
    /** @param array<string, mixed> $data */
    private function assertNotDuplicated(array $data, ?int $excludeId): void
    {
        $existing = $this->tiposCambio->findByFecha((string) $data['fecha'], $excludeId);

        if ($existing !== null) {
            $this->duplicateError((string) $data['fecha']);
        }
    }

    private function duplicateError(string $fecha): never
    {
        throw new HttpException(422, 'Datos inválidos', [
            'fecha' => 'Ya existe un tipo de cambio para el ' . $fecha . '.',
        ]);
    }

    /** @param array<string, mixed> $data */
    private function insertCatchingDuplicate(array $data): int
    {
        try {
            return $this->tiposCambio->insert($data);
        } catch (\PDOException $exception) {
            // Colisión concurrente + índice UNIQUE de fecha (migración 008).
            if ($this->isDuplicateKey($exception)) {
                $this->duplicateError((string) $data['fecha']);
            }
            throw $exception;
        }
    }

    private function isDuplicateKey(\PDOException $exception): bool
    {
        return str_starts_with((string) $exception->getCode(), '23000')
            || str_contains($exception->getMessage(), 'Duplicate entry');
    }

    /**
     * DTO: cada campo por separado, tal como está guardado en la BD.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function toDto(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'fecha' => (string) $row['fecha'],
            'compra' => (string) $row['compra'],
            'venta' => (string) $row['venta'],
            'fuente' => (string) ($row['fuente'] ?? ''),
        ];
    }
}
