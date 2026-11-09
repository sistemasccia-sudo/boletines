<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HtmlSanitizer;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Validator;
use App\Repositories\LegalRepository;
use DateTimeImmutable;
use DateTimeZone;

/**
 * CRUD de Bol. Legal (normas_legales).
 *
 * Mapeo: `titular` ← título, `bajada` ← norma legal, `cuerpo` ← cuerpo
 * (HTML sanitizado con HTMLPurifier antes de guardar), `fecha` ← fecha.
 */
final class LegalController
{
    private LegalRepository $legales;

    public function __construct()
    {
        $this->legales = new LegalRepository();
    }

    public function index(Request $request): array
    {
        $result = $this->legales->list($request->queryParams());

        foreach ($result['data'] as &$row) {
            $row = self::toListItem($row);
        }
        unset($row);

        return $result;
    }

    public function show(Request $request): array
    {
        $row = $this->legales->find($request->routeParamInt('id'));
        if ($row === null) {
            throw new HttpException(404, 'Norma legal no encontrada');
        }

        return self::toDetail($row);
    }

    public function store(Request $request): array
    {
        $data = $this->validate($request);
        $data['fecha'] = $this->fechaFromInput($request->body());

        $id = $this->legales->insert($data);
        $row = $this->legales->find($id);
        if ($row === null) {
            throw new HttpException(500, 'No se pudo crear la norma legal');
        }

        return self::toDetail($row);
    }

    public function update(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->legales->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Norma legal no encontrada');
        }

        $data = $this->validate($request);

        // Fecha indicada (ya validada) o la que tiene el registro.
        $fecha = trim((string) ($request->body()['fecha'] ?? ''));
        $data['fecha'] = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) === 1
            ? $fecha
            : (string) $existing['fecha'];

        $this->legales->update($id, $data);
        $row = $this->legales->find($id);

        return self::toDetail($row ?? $existing);
    }

    public function destroy(Request $request): array
    {
        $id = $request->routeParamInt('id');
        $existing = $this->legales->find($id);
        if ($existing === null) {
            throw new HttpException(404, 'Norma legal no encontrada');
        }

        $this->legales->delete($id);

        return ['message' => 'Norma legal eliminada'];
    }

    /** Valida y normaliza el JSON de entrada (sin `fecha`, la gestiona cada acción). */
    private function validate(Request $request): array
    {
        $input = $request->body();

        Validator::check($input, [
            'titulo' => ['rules' => 'required|max:2000', 'label' => 'Título'],
            'norma_legal' => ['rules' => 'required|max:2000', 'label' => 'Norma legal'],
            'cuerpo' => ['rules' => 'max:500000', 'label' => 'Cuerpo'],
            'fecha' => ['rules' => 'date', 'label' => 'Fecha'],
        ]);

        $cuerpo = trim((string) ($input['cuerpo'] ?? ''));

        return [
            'titulo' => trim((string) $input['titulo']),
            'norma_legal' => trim((string) $input['norma_legal']),
            // Cuerpo opcional: vacío ⇒ null (la columna lo permite).
            'cuerpo' => $cuerpo === '' ? null : HtmlSanitizer::purify($cuerpo),
        ];
    }

    /** Fecha de la norma: la indicada o hoy (zona horaria America/Lima). */
    private function fechaFromInput(array $input): string
    {
        $fecha = trim((string) ($input['fecha'] ?? ''));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) === 1) {
            return $fecha;
        }

        return (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toListItem(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'titulo' => (string) ($row['titular'] ?? ''),
            'norma_legal' => isset($row['bajada']) && $row['bajada'] !== null
                ? (string) $row['bajada']
                : null,
            'fecha' => (string) ($row['fecha'] ?? ''),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, mixed> */
    private static function toDetail(array $row): array
    {
        $dto = self::toListItem($row);
        $dto['cuerpo'] = (string) ($row['cuerpo'] ?? '');

        return $dto;
    }
}
