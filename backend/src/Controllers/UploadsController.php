<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\HttpException;
use App\Core\ImageProcessor;
use App\Core\Request;

/**
 * Subida centralizada de imágenes (multipart/form-data):
 * POST /api/v1/uploads y POST /api/v1/uploads/editor.
 * Todas las imágenes pasan por ImageProcessor (WebP + resize + miniatura).
 */
final class UploadsController
{
    private const CONTEXTOS = ['editor', 'noticias', 'articulos', 'portadas'];

    public function store(Request $request): array
    {
        $file = $request->files()['archivo'] ?? null;
        if (!is_array($file)) {
            throw new HttpException(422, 'Datos inválidos', ['archivo' => 'Seleccione una imagen.']);
        }

        $contexto = (string) $request->input('contexto', 'editor');
        if (!in_array($contexto, self::CONTEXTOS, true)) {
            $contexto = 'editor';
        }

        $paths = ImageProcessor::process($file, $contexto);

        return [
            'path' => $paths['path'],
            'thumb_path' => $paths['thumb_path'],
            'url' => $request->absoluteUrl($paths['path']),
            'thumb_url' => $request->absoluteUrl($paths['thumb_path']),
        ];
    }
}
