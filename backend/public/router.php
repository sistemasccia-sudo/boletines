<?php

declare(strict_types=1);

/**
 * Router para el servidor de desarrollo de PHP:
 *   php -S localhost:8000 -t public public/router.php
 * Los archivos estáticos reales (uploads/…) se sirven tal cual; el resto
 * cae en el front controller index.php (API + 404 JSON).
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($path) || $path === '') {
    $path = '/';
}

$full = realpath(__DIR__ . $path);
if ($full !== false && str_starts_with($full, __DIR__) && is_file($full)) {
    return false;
}

require __DIR__ . '/index.php';
