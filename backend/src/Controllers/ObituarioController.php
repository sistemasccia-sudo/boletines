<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\ObituarioRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de obituarios (tobituario). Campos de formulario: nombre y
 * descripcion; `fecha` se asigna en el servidor (hoy, America/Lima).
 */
final class ObituarioController
{
    private ObituarioRepository $obituarios;

    public function __construct()
    {
        $this->obituarios = new ObituarioRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->obituarios->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = self::toDto($row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->obituarios->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Obituario no encontrado');
        }

        return self::toDto($row);
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $data['fecha'] = (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');

        $id = $this->obituarios->insert($data);
        $row = $this->obituarios->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear el obituario');
        }

        return self::toDto($row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->obituarios->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Obituario no encontrado');
        }

        $data = $this->validate($request);
        $this->obituarios->update($id, $data);

        $row = $this->obituarios->find($id);

        return self::toDto($row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->obituarios->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Obituario no encontrado');
        }

        $this->obituarios->delete($id);

        return ['message' => 'Obituario eliminado'];
    }

    /** @return array<string, mixed> */
    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'nombre' => ['rules' => 'required|max:180', 'label' => 'Nombre'],
            'descripcion' => ['rules' => 'required|max:5000', 'label' => 'Descripción'],
        ]);

        return [
            'nombre' => trim((string) $input['nombre']),
            'descripcion' => trim((string) $input['descripcion']),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toDto(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'nombre' => (string) $row['nombre'],
            'descripcion' => (string) $row['descripcion'],
            'velatorio' => isset($row['velatorio']) && $row['velatorio'] !== null ? (string) $row['velatorio'] : null,
            'cementerio' => isset($row['cementerio']) && $row['cementerio'] !== null ? (string) $row['cementerio'] : null,
            'fecha' => (string) $row['fecha'],
        ];
    }
}
