<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HtmlSanitizer;
use App\Core\HttpException;
use App\Core\ImageProcessor;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\NoticiaRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de noticias (tnoticia). `cuerpo` se sanitiza con HTMLPurifier
 * y las imágenes pasan por ImageProcessor (guardadas como ruta relativa).
 */
final class NoticiaController
{
    private NoticiaRepository $noticias;

    public function __construct()
    {
        $this->noticias = new NoticiaRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->noticias->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = $this->toListItem($request, $row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->noticias->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Noticia no encontrada');
        }

        return $this->toDetail($request, $row);
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $data['fecha'] = $this->fechaFromInput($request->body());

        $id = $this->noticias->insert($data);
        $row = $this->noticias->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear la noticia');
        }

        return $this->toDetail($request, $row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->noticias->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Noticia no encontrada');
        }

        $data = $this->validate($request);

        // Sin clave `imagen` ⇒ la imagen no cambia (PUT es JSON, no multipart).
        if (!array_key_exists('imagen', $request->body())) {
            unset($data['imagen']);
        }

        $this->noticias->update($id, $data);

        if (
            array_key_exists('imagen', $data)
            && $data['imagen'] !== ($existing['imagenes'] ?? null)
        ) {
            ImageProcessor::deleteFiles($existing['imagenes'] ?? null);
        }

        $row = $this->noticias->find($id);

        return $this->toDetail($request, $row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->noticias->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Noticia no encontrada');
        }

        $this->noticias->delete($id);
        ImageProcessor::deleteFiles(isset($existing['imagenes']) ? (string) $existing['imagenes'] : null);

        return ['message' => 'Noticia eliminada'];
    }

    /** Lista de las noticias de hoy (America/Lima) para «Cambiar orden» (filtro opcional `?tipo=1..4`). */
    public function ordenDelDia(Request $request): array
    {
        $fecha = self::hoyLima();
        $tipo = (string) ($request->queryParams()['tipo'] ?? '');
        $rows = $this->noticias->listOrdenDelDia($fecha, $tipo);
        $data = [];
        foreach ($rows as $row) {
            $data[] = self::toOrdenItem($row);
        }

        return ['fecha' => $fecha, 'data' => $data];
    }

    /**
     * Intercambia la posición de orden de dos noticias del día actual
     * (transacción en el repositorio) y devuelve la lista actualizada.
     *
     * @return array{fecha: string, data: list<array<string, mixed>>}
     */
    public function intercambiarOrden(Request $request): array
    {
        $ids = $this->validateIdsOrden($request);
        $fecha = self::hoyLima();

        if (!$this->noticias->swapOrden($ids[0], $ids[1], $fecha)) {
            throw new HttpException(422, 'Datos inválidos', [
                'ids' => 'Las noticias seleccionadas deben existir y ser del día actual.',
            ]);
        }

        return $this->ordenDelDia($request);
    }

    /** Valida y normaliza el JSON de entrada (sin `fecha`, la gestiona cada acción). */
    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'titulo' => ['rules' => 'required|max:2000', 'label' => 'Título'],
            'bajada' => ['rules' => 'max:2000', 'label' => 'Bajada'],
            'cuerpo' => ['rules' => 'required|max:500000', 'label' => 'Cuerpo'],
            'tipo' => ['rules' => 'required|in:1,2,3,4', 'label' => 'Tipo'],
            'fuente_codigo' => ['rules' => 'max:50', 'label' => 'Fuente'],
            'fecha' => ['rules' => 'date', 'label' => 'Fecha'],
            'imagen' => ['rules' => 'max:255|regex:/^uploads\/[A-Za-z0-9_.-]+$/', 'label' => 'Imagen'],
        ]);

        $bajada = trim((string) ($input['bajada'] ?? ''));
        $fuenteCodigo = trim((string) ($input['fuente_codigo'] ?? ''));
        $imagen = $input['imagen'] ?? null;

        return [
            'titulo' => trim((string) $input['titulo']),
            'cuerpo' => HtmlSanitizer::purify((string) $input['cuerpo']),
            'bajada' => $bajada === '' ? null : $bajada,
            'tipo' => (string) $input['tipo'],
            'fuente_codigo' => $fuenteCodigo === '' ? null : $fuenteCodigo,
            'mostrar_en_web' => (bool) ($input['mostrar_en_web'] ?? true),
            'imagen' => is_string($imagen) && $imagen !== '' ? $imagen : null,
        ];
    }

    /** Fecha de publicación: la indicada o hoy (zona horaria America/Lima). */
    private function fechaFromInput(array $input): string
    {
        $fecha = trim((string) ($input['fecha'] ?? ''));
        if ($fecha !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) === 1) {
            return $fecha;
        }

        return self::hoyLima();
    }

    private static function hoyLima(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');
    }

    /** @return array{0: int, 1: int} ids de las dos noticias a intercambiar */
    private function validateIdsOrden(Request $request): array
    {
        $ids = $request->body()['ids'] ?? null;
        if (!is_array($ids) || count($ids) !== 2) {
            throw new HttpException(422, 'Datos inválidos', [
                'ids' => 'Seleccione exactamente dos noticias.',
            ]);
        }

        $idA = filter_var($ids[0] ?? null, FILTER_VALIDATE_INT);
        $idB = filter_var($ids[1] ?? null, FILTER_VALIDATE_INT);
        if ($idA === false || $idB === false || $idA === $idB || $idA < 1 || $idB < 1) {
            throw new HttpException(422, 'Datos inválidos', [
                'ids' => 'Seleccione dos noticias distintas.',
            ]);
        }

        return [$idA, $idB];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toOrdenItem(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'titulo' => (string) ($row['titulo'] ?? ''),
            'orden' => (int) $row['orden'],
            'fecha' => (string) $row['fecha'],
        ];
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
            'tipo' => isset($row['tipo']) && $row['tipo'] !== null ? (string) $row['tipo'] : null,
            'fuente_codigo' => isset($row['fuente_codigo']) && $row['fuente_codigo'] !== null
                ? (string) $row['fuente_codigo']
                : null,
            'fuente_nombre' => isset($row['fuente_nombre']) && $row['fuente_nombre'] !== null
                ? (string) $row['fuente_nombre']
                : null,
            'mostrar_en_web' => (bool) ($row['mostrar_en_web'] ?? false),
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
