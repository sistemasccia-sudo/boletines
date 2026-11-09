<?php

declare(strict_types=1);

use App\Controllers\ArticuloController;
use App\Controllers\AuthController;
use App\Controllers\CartasController;
use App\Controllers\FuenteController;
use App\Controllers\LegalController;
use App\Controllers\NoticiaController;
use App\Controllers\ObituarioController;
use App\Controllers\PortadaController;
use App\Controllers\TipoCambioController;
use App\Controllers\UploadsController;
use App\Middleware\AuthMiddleware;

/**
 * Rutas de la API: cada entrada es [método, path, [clase, acción], middlewares].
 * El front controller (public/index.php) las registra en el Router.
 */

$auth = [AuthMiddleware::class . '::handle'];

return [
    // Autenticación (única ruta pública)
    ['POST', '/api/v1/auth/login', [AuthController::class, 'login'], []],
    ['GET', '/api/v1/auth/me', [AuthController::class, 'me'], $auth],

    // Fuentes de información
    ['GET', '/api/v1/fuentes', [FuenteController::class, 'index'], $auth],
    ['POST', '/api/v1/fuentes', [FuenteController::class, 'store'], $auth],
    ['GET', '/api/v1/fuentes/{id}', [FuenteController::class, 'show'], $auth],
    ['PUT', '/api/v1/fuentes/{id}', [FuenteController::class, 'update'], $auth],
    ['DELETE', '/api/v1/fuentes/{id}', [FuenteController::class, 'destroy'], $auth],

    // Noticias
    ['GET', '/api/v1/noticias', [NoticiaController::class, 'index'], $auth],
    ['POST', '/api/v1/noticias', [NoticiaController::class, 'store'], $auth],
    // Cambiar orden (deben ir antes de /noticias/{id}: gana la primera ruta que coincide)
    ['GET', '/api/v1/noticias/orden', [NoticiaController::class, 'ordenDelDia'], $auth],
    ['POST', '/api/v1/noticias/orden/intercambiar', [NoticiaController::class, 'intercambiarOrden'], $auth],
    ['GET', '/api/v1/noticias/{id}', [NoticiaController::class, 'show'], $auth],
    ['PUT', '/api/v1/noticias/{id}', [NoticiaController::class, 'update'], $auth],
    ['DELETE', '/api/v1/noticias/{id}', [NoticiaController::class, 'destroy'], $auth],

    // Artículos
    ['GET', '/api/v1/articulos', [ArticuloController::class, 'index'], $auth],
    ['POST', '/api/v1/articulos', [ArticuloController::class, 'store'], $auth],
    ['GET', '/api/v1/articulos/{id}', [ArticuloController::class, 'show'], $auth],
    ['PUT', '/api/v1/articulos/{id}', [ArticuloController::class, 'update'], $auth],
    ['DELETE', '/api/v1/articulos/{id}', [ArticuloController::class, 'destroy'], $auth],

    // Portadas
    ['GET', '/api/v1/portadas', [PortadaController::class, 'index'], $auth],
    ['POST', '/api/v1/portadas', [PortadaController::class, 'store'], $auth],
    ['GET', '/api/v1/portadas/{id}', [PortadaController::class, 'show'], $auth],
    ['DELETE', '/api/v1/portadas/{id}', [PortadaController::class, 'destroy'], $auth],

    // Tipo de cambio
    ['GET', '/api/v1/tipo-cambio', [TipoCambioController::class, 'index'], $auth],
    ['POST', '/api/v1/tipo-cambio', [TipoCambioController::class, 'store'], $auth],
    ['GET', '/api/v1/tipo-cambio/{id}', [TipoCambioController::class, 'show'], $auth],
    ['PUT', '/api/v1/tipo-cambio/{id}', [TipoCambioController::class, 'update'], $auth],
    ['DELETE', '/api/v1/tipo-cambio/{id}', [TipoCambioController::class, 'destroy'], $auth],

    // Obituarios
    ['GET', '/api/v1/obituarios', [ObituarioController::class, 'index'], $auth],
    ['POST', '/api/v1/obituarios', [ObituarioController::class, 'store'], $auth],
    ['GET', '/api/v1/obituarios/{id}', [ObituarioController::class, 'show'], $auth],
    ['PUT', '/api/v1/obituarios/{id}', [ObituarioController::class, 'update'], $auth],
    ['DELETE', '/api/v1/obituarios/{id}', [ObituarioController::class, 'destroy'], $auth],

    // Bol. Legal
    ['GET', '/api/v1/legal', [LegalController::class, 'index'], $auth],
    ['POST', '/api/v1/legal', [LegalController::class, 'store'], $auth],
    ['GET', '/api/v1/legal/{id}', [LegalController::class, 'show'], $auth],
    ['PUT', '/api/v1/legal/{id}', [LegalController::class, 'update'], $auth],
    ['DELETE', '/api/v1/legal/{id}', [LegalController::class, 'destroy'], $auth],

    // Cartas («siguiente-código» debe ir antes de /cartas/{id})
    ['GET', '/api/v1/cartas', [CartasController::class, 'index'], $auth],
    ['POST', '/api/v1/cartas', [CartasController::class, 'store'], $auth],
    ['GET', '/api/v1/cartas/siguiente-codigo', [CartasController::class, 'siguienteCodigo'], $auth],
    ['GET', '/api/v1/cartas/{id}', [CartasController::class, 'show'], $auth],
    ['PUT', '/api/v1/cartas/{id}', [CartasController::class, 'update'], $auth],
    ['DELETE', '/api/v1/cartas/{id}', [CartasController::class, 'destroy'], $auth],

    // Actualización vía PATCH (alias de PUT; el frontend usa PATCH).
    ['PATCH', '/api/v1/fuentes/{id}', [FuenteController::class, 'update'], $auth],
    ['PATCH', '/api/v1/noticias/{id}', [NoticiaController::class, 'update'], $auth],
    ['PATCH', '/api/v1/articulos/{id}', [ArticuloController::class, 'update'], $auth],
    ['PATCH', '/api/v1/tipo-cambio/{id}', [TipoCambioController::class, 'update'], $auth],
    ['PATCH', '/api/v1/obituarios/{id}', [ObituarioController::class, 'update'], $auth],
    ['PATCH', '/api/v1/legal/{id}', [LegalController::class, 'update'], $auth],
    ['PATCH', '/api/v1/cartas/{id}', [CartasController::class, 'update'], $auth],

    // Subida de imágenes (multipart/form-data; el resto de acciones son JSON)
    ['POST', '/api/v1/uploads', [UploadsController::class, 'store'], $auth],
    ['POST', '/api/v1/uploads/editor', [UploadsController::class, 'store'], $auth],
];
