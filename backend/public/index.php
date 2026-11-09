<?php

declare(strict_types=1);

use App\Core\Env;
use App\Core\HttpException;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Middleware\CorsMiddleware;

$autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (!is_readable($autoload)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['error' => ['message' => 'Dependencias no instaladas. Ejecute "composer install" en /backend.', 'fields' => new stdClass()]],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}
require $autoload;

Env::load(dirname(__DIR__) . '/.env');

/** @var array<int, array{0: string, 1: string, 2: array{0: class-string, 1: string}, 3: array<int, callable>}> $routeConfig */
$routeConfig = require dirname(__DIR__) . '/config/routes.php';

$router = new Router();
foreach ($routeConfig as [$method, $path, $handler, $middleware]) {
    $router->add($method, $path, $handler, $middleware);
}

try {
    $request = Request::fromGlobals();
    CorsMiddleware::handle($request);
    $router->dispatch($request);
} catch (HttpException $e) {
    Response::error($e->getMessage(), $e->getStatus(), $e->getFields());
} catch (Throwable $e) {
    // El motivo real queda en storage/app.log (nunca se expone al cliente).
    Logger::error('boletin-api', $e);
    Response::error('Error interno del servidor', 500);
}
