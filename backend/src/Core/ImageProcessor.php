<?php

declare(strict_types=1);

namespace App\Core;

use GdImage;

/**
 * Procesamiento único de TODA imagen subida (AGENTS.md):
 * valida el archivo, corrige la orientación EXIF, redimensiona sin ampliar,
 * convierte a WebP, elimina metadatos (re-codificación) y genera miniatura.
 * Parámetros desde .env (IMAGE_*).
 */
final class ImageProcessor
{
    /** MIME permitidos => extensión de archivo. */
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    /**
     * Procesa una imagen subida ($_FILES) y guarda imagen + miniatura
     * en public/uploads con nombre aleatorio.
     *
     * @param array{name?: string, tmp_name?: string, error?: int, size?: int} $file
     * @param string $contexto editor|noticias|articulos|portadas (define el ancho máximo)
     * @return array{path: string, thumb_path: string} rutas relativas a public/
     */
    public static function process(array $file, string $contexto = 'editor'): array
    {
        self::assertWebpSupport();

        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            throw new HttpException(422, self::uploadErrorMessage($error));
        }

        $tmp = (string) ($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new HttpException(422, 'Archivo subido inválido.');
        }

        $maxUploadMb = Env::getInt('IMAGE_MAX_UPLOAD_MB', 10);
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0) {
            throw new HttpException(422, 'El archivo está vacío.');
        }
        if ($size > $maxUploadMb * 1024 * 1024) {
            throw new HttpException(422, sprintf('La imagen supera el tamaño máximo de %d MB.', $maxUploadMb));
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            throw new HttpException(500, 'No se pudo verificar el archivo subido.');
        }
        $mime = (string) finfo_file($finfo, $tmp);
        finfo_close($finfo);

        if (!isset(self::ALLOWED_MIME[$mime])) {
            throw new HttpException(422, 'Formato no válido. Use JPG, PNG o WebP.');
        }

        $info = @getimagesize($tmp);
        if ($info === false) {
            throw new HttpException(422, 'El archivo no es una imagen válida.');
        }
        [$width, $height] = $info;

        $maxSourcePx = Env::getInt('IMAGE_MAX_SOURCE_PX', 12000);
        if ($width > $maxSourcePx || $height > $maxSourcePx) {
            throw new HttpException(
                422,
                sprintf('Las dimensiones de la imagen exceden el máximo de %d px por lado.', $maxSourcePx)
            );
        }

        self::assertMemory($width, $height);

        $source = self::applyExifOrientation(self::createFrom($tmp, $mime), $tmp, $mime);

        $maxWidth = $contexto === 'portadas'
            ? Env::getInt('IMAGE_PORTADA_MAX_WIDTH', 2000)
            : Env::getInt('IMAGE_MAX_WIDTH', 1600);

        $quality = max(1, min(100, Env::getInt('IMAGE_QUALITY', 80)));

        // Miniatura siempre en WebP.
        $thumbImage = self::resizeTo($source, Env::getInt('IMAGE_THUMB_WIDTH', 400));
        $thumbData = self::encode($thumbImage, 'image/webp', $quality);
        imagedestroy($thumbImage);

        // Imagen principal en WebP; si pesa más que el original, se conserva
        // el original re-codificado (sin metadatos) solo si resulta menor.
        $mainImage = self::resizeTo($source, $maxWidth);
        imagedestroy($source);

        $mainData = self::encode($mainImage, 'image/webp', $quality);
        $extension = 'webp';

        if ($mime !== 'image/webp' && strlen($mainData) >= $size) {
            $alternative = self::encode($mainImage, $mime, $quality);
            if (strlen($alternative) < strlen($mainData)) {
                $mainData = $alternative;
                $extension = self::ALLOWED_MIME[$mime];
            }
        }
        imagedestroy($mainImage);

        $base = 'uploads/' . bin2hex(random_bytes(12));
        $path = $base . '.' . $extension;
        $thumbPath = $base . '_thumb.webp';

        $publicDir = dirname(__DIR__, 2) . '/public';
        if (file_put_contents($publicDir . '/' . $path, $mainData) === false) {
            throw new HttpException(500, 'No se pudo guardar la imagen en el servidor.');
        }
        if (file_put_contents($publicDir . '/' . $thumbPath, $thumbData) === false) {
            @unlink($publicDir . '/' . $path);
            throw new HttpException(500, 'No se pudo guardar la miniatura en el servidor.');
        }

        return ['path' => $path, 'thumb_path' => $thumbPath];
    }

    /**
     * Elimina una imagen y su miniatura derivada (solo dentro de public/uploads).
     * Rutas null/vacías o con `..` se ignoran.
     */
    public static function deleteFiles(?string $relativePath): void
    {
        if ($relativePath === null || $relativePath === '' || str_contains($relativePath, '..')) {
            return;
        }

        $publicDir = realpath(dirname(__DIR__, 2) . '/public');
        if ($publicDir === false) {
            return;
        }
        $uploadsDir = realpath($publicDir . '/uploads');
        if ($uploadsDir === false) {
            return;
        }

        $full = realpath($publicDir . '/' . ltrim($relativePath, '/'));
        if ($full === false || !str_starts_with($full, $uploadsDir . DIRECTORY_SEPARATOR)) {
            return;
        }

        @unlink($full);

        $thumb = preg_replace('/\.[A-Za-z0-9]+$/', '_thumb.webp', $full);
        if (is_string($thumb) && str_starts_with($thumb, $uploadsDir . DIRECTORY_SEPARATOR)) {
            @unlink($thumb);
        }
    }

    /** Ruta de la miniatura derivada de una ruta guardada en BD. */
    public static function thumbPath(string $path): string
    {
        return preg_replace('/\.[A-Za-z0-9]+$/', '_thumb.webp', $path) ?? $path;
    }

    /**
     * URLs públicas (imagen + miniatura) de una ruta guardada en BD.
     * Devuelve [null, null] si el archivo no existe; las URLs absolutas
     * heredadas del legacy se devuelven tal cual (sin miniatura).
     *
     * @return array{0: string|null, 1: string|null}
     */
    public static function urls(Request $request, ?string $stored): array
    {
        if ($stored === null || trim($stored) === '' || str_contains($stored, '..')) {
            return [null, null];
        }

        $stored = trim($stored);

        if (preg_match('#^https?://#i', $stored) === 1) {
            return [$stored, null];
        }

        $publicDir = dirname(__DIR__, 2) . '/public';
        if (!is_file($publicDir . '/' . ltrim($stored, '/'))) {
            return [null, null];
        }

        $thumbPath = self::thumbPath($stored);
        $thumb = is_file($publicDir . '/' . ltrim($thumbPath, '/'))
            ? $request->absoluteUrl($thumbPath)
            : $request->absoluteUrl($stored);

        return [$request->absoluteUrl($stored), $thumb];
    }

    private static function assertWebpSupport(): void
    {
        if (!function_exists('imagewebp') || !function_exists('imagecreatefromwebp')) {
            throw new HttpException(500, 'El servidor no tiene soporte WebP (extensión GD requerida).');
        }
    }

    private static function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'La imagen supera el tamaño permitido por el servidor.',
            UPLOAD_ERR_NO_FILE => 'Seleccione una imagen.',
            UPLOAD_ERR_PARTIAL => 'La imagen se subió incompleta. Intente de nuevo.',
            default => 'No se pudo subir la imagen.',
        };
    }

    /** Estima el uso de memoria de 3 copias de la imagen antes de decodificar. */
    private static function assertMemory(int $width, int $height): void
    {
        $limit = self::memoryLimitBytes();
        if ($limit <= 0) {
            return;
        }

        $needed = $width * $height * 4 * 3;
        $free = $limit - memory_get_usage(true);
        if ($needed > $free) {
            throw new HttpException(422, 'La imagen es demasiado grande para procesarla en el servidor.');
        }
    }

    private static function memoryLimitBytes(): int
    {
        $raw = trim((string) ini_get('memory_limit'));
        if ($raw === '' || $raw === '-1') {
            return 0;
        }

        $value = (float) $raw;
        $unit = strtolower(substr($raw, -1));

        return (int) match ($unit) {
            'g' => $value * 1024 * 1024 * 1024,
            'm' => $value * 1024 * 1024,
            'k' => $value * 1024,
            default => $value,
        };
    }

    private static function createFrom(string $path, string $mime): GdImage
    {
        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if ($image === false) {
            throw new HttpException(422, 'No se pudo leer la imagen.');
        }

        imagealphablending($image, false);
        imagesavealpha($image, true);

        return $image;
    }

    /**
     * Corrige la orientación EXIF (solo JPEG, valores 3, 6 y 8).
     * Devuelve la misma imagen o una nueva rotada (los tamaños 90/270 se intercambian).
     */
    private static function applyExifOrientation(GdImage $image, string $path, string $mime): GdImage
    {
        if ($mime !== 'image/jpeg' || !function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = is_array($exif) ? (int) ($exif['EXIF']['Orientation'] ?? 0) : 0;

        $degrees = match ($orientation) {
            3 => 180,
            6 => 270,
            8 => 90,
            default => 0,
        };

        if ($degrees === 0) {
            return $image;
        }

        $rotated = imagerotate($image, $degrees, 0);
        if ($rotated === false) {
            return $image;
        }

        imagealphablending($rotated, false);
        imagesavealpha($rotated, true);
        imagedestroy($image);

        return $rotated;
    }

    /**
     * Copia/escala $image a como mucho $maxWidth de ancho (nunca amplía)
     * y devuelve SIEMPRE un recurso nuevo (sin metadatos).
     */
    private static function resizeTo(GdImage $image, int $maxWidth): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);

        $scale = $width > $maxWidth ? $maxWidth / $width : 1.0;
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $copy = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($copy, false);
        imagesavealpha($copy, true);
        $transparent = imagecolorallocatealpha($copy, 0, 0, 0, 127);
        imagefilledrectangle($copy, 0, 0, $newWidth, $newHeight, $transparent);
        imagecopyresampled($copy, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        return $copy;
    }

    /** Codifica a los bytes del MIME indicado (esto elimina EXIF/GPS). */
    private static function encode(GdImage $image, string $mime, int $quality): string
    {
        ob_start();
        switch ($mime) {
            case 'image/jpeg':
                imagejpeg($image, null, $quality);
                break;
            case 'image/png':
                imagepng($image);
                break;
            default:
                imagewebp($image, null, $quality);
                break;
        }

        return (string) ob_get_clean();
    }

    private function __construct()
    {
    }
}
