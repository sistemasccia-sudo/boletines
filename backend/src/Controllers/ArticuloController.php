<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HtmlSanitizer;
use App\Core\HttpException;
use App\Core\ImageProcessor;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\ArticuloRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de artículos (tarticulo). `cuerpo` se sanitiza con HTMLPurifier.
 */
final class ArticuloController
{
    private ArticuloRepository $articulos;

    public function __construct()
    {
        $this->articulos = new ArticuloRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->articulos->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = $this->toListItem($request, $row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->articulos->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Artículo no encontrado');
        }

        return $this->toDetail($request, $row);
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $data['fecha'] = $this->fechaFromInput($request->body());

        $id = $this->articulos->insert($data);
        $row = $this->articulos->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear el artículo');
        }

        return $this->toDetail($request, $row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->articulos->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Artículo no encontrado');
        }

        $data = $this->validate($request);

        // Sin clave `imagen` ⇒ la imagen no cambia.
        if (!array_key_exists('imagen', $request->body())) {
            unset($data['imagen']);
        }

        $this->articulos->update($id, $data);

        if (
            array_key_exists('imagen', $data)
            && $data['imagen'] !== ($existing['imagenes'] ?? null)
        ) {
            ImageProcessor::deleteFiles($existing['imagenes'] ?? null);
        }

        $row = $this->articulos->find($id);

        return $this->toDetail($request, $row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->articulos->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Artículo no encontrado');
        }

        $this->articulos->delete($id);
        ImageProcessor::deleteFiles(isset($existing['imagenes']) ? (string) $existing['imagenes'] : null);

        return ['message' => 'Artículo eliminado'];
    }

    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'titulo' => ['rules' => 'required|max:255', 'label' => 'Título'],
            'bajada' => ['rules' => 'max:255', 'label' => 'Bajada'],
            'cuerpo' => ['rules' => 'required|max:500000', 'label' => 'Cuerpo'],
            'fecha' => ['rules' => 'date', 'label' => 'Fecha'],
            'imagen' => ['rules' => 'max:255|regex:/^uploads\/[A-Za-z0-9_.-]+$/', 'label' => 'Imagen'],
        ]);

        $bajada = trim((string) ($input['bajada'] ?? ''));
        $imagen = $input['imagen'] ?? null;

        return [
            'titulo' => trim((string) $input['titulo']),
            'cuerpo' => HtmlSanitizer::purify((string) $input['cuerpo']),
            'bajada' => $bajada === '' ? null : $bajada,
            'imagen' => is_string($imagen) && $imagen !== '' ? $imagen : null,
        ];
    }

    private function fechaFromInput(array $input): string
    {
        $fecha = trim((string) ($input['fecha'] ?? ''));
        if ($fecha !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) === 1) {
            return $fecha;
        }

        return (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private function toListItem(Request $request, array $row): array
    {
        $stored = isset($row['imagenes']) ? (string) $row['imagenes'] : null;
        [$imagen, $imagenThumb] = ImageProcessor::urls($request, $stored);

        return [
            'id' => (int) $row['id'],
            'titulo' => (string) ($row['titulo'] ?? ''),
            'bajada' => isset($row['bajada']) && $row['bajada'] !== null ? (string) $row['bajada'] : null,
            'fecha' => (string) ($row['fecha'] ?? ''),
            'imagen' => $imagen,
            'imagen_thumb' => $imagenThumb,
        ];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private function toDetail(Request $request, array $row): array
    {
        $dto = $this->toListItem($request, $row);
        $dto['cuerpo'] = (string) ($row['cuerpo'] ?? '');

        return $dto;
    }
}
