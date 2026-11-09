<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\FuenteRepository;

/**
 * CRUD de fuentes de información (fuente_diarios).
 * Al eliminar: se bloquea si está en uso por noticias/artículos.
 */
final class FuenteController
{
    private FuenteRepository $fuentes;

    public function __construct()
    {
        $this->fuentes = new FuenteRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->fuentes->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = self::toDto($row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->fuentes->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Fuente no encontrada');
        }

        return self::toDto($row);
    }

    public function store(Request $request): array
    {
        $input = $request->body();
        Validator::check($input, [
            'nombre' => ['rules' => 'required|max:255', 'label' => 'Nombre'],
        ]);

        $id = $this->fuentes->insert((string) $input['nombre']);
        $row = $this->fuentes->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear la fuente');
        }

        return self::toDto($row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->fuentes->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Fuente no encontrada');
        }

        $input = $request->body();
        Validator::check($input, [
            'nombre' => ['rules' => 'required|max:255', 'label' => 'Nombre'],
        ]);

        $this->fuentes->update($id, (string) $input['nombre']);
        $row = $this->fuentes->find($id);

        return self::toDto($row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->fuentes->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Fuente no encontrada');
        }

        // Sin borrado en cascada: bloquear si otras filas la referencian.
        $codigo = (string) (int) $existing['codigo'];
        if ($this->fuentes->isUsedByCodigo($codigo)) {
            throw new HttpException(
                422,
                'No se puede eliminar: la fuente está en uso por noticias o artículos.'
            );
        }

        $this->fuentes->delete($id);

        return ['message' => 'Fuente eliminada'];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toDto(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'codigo' => (int) $row['codigo'],
            'nombre' => (string) $row['nombre'],
            'state' => (int) $row['state'],
        ];
    }
}
