<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\ImageProcessor;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\PortadaRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de portadas (portadas: fecha + archivo de imagen).
 * La imagen ya fue procesada por ImageProcessor vía POST /uploads.
 */
final class PortadaController
{
    private PortadaRepository $portadas;

    public function __construct()
    {
        $this->portadas = new PortadaRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->portadas->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = $this->toDto($request, $row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->portadas->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Portada no encontrada');
        }

        return $this->toDto($request, $row);
    }

    public function store(Request $request): array
    {
        $input = $request->body();
        Validator::check($input, [
            'fecha' => ['rules' => 'date', 'label' => 'Fecha'],
            'archivo' => ['rules' => 'required|max:255|regex:/^uploads\/[A-Za-z0-9_.-]+$/', 'label' => 'Imagen'],
        ]);

        $fecha = trim((string) ($input['fecha'] ?? ''));
        if ($fecha === '') {
            $fecha = (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');
        }

        $id = $this->portadas->insert($fecha, (string) $input['archivo']);
        $row = $this->portadas->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear la portada');
        }

        return $this->toDto($request, $row);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->portadas->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Portada no encontrada');
        }

        $this->portadas->delete($id);
        ImageProcessor::deleteFiles(isset($existing['archivo']) ? (string) $existing['archivo'] : null);

        return ['message' => 'Portada eliminada'];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private function toDto(Request $request, array $row): array
    {
        [$archivo, $archivoThumb] = ImageProcessor::urls($request, (string) $row['archivo']);

        return [
            'id' => (int) $row['id'],
            'fecha' => (string) $row['fecha'],
            'archivo' => $archivo,
            'archivo_thumb' => $archivoThumb,
        ];
    }
}
