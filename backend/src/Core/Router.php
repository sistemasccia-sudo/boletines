<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Router mínimo: rutas por método con parámetros `{id}` (p. ej.
 * /api/v1/noticias/{id}), con middlewares por ruta.
 */
final class Router
{
    /** @var array<string, list<array{pattern: string, handler: array{0: class-string, 1: string}, middleware: array<int, callable>, paramNames: list<string>}>> */
    private array $routes = [];

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function add(string $method, string $path, array $handler, array $middleware = []): void
    {
        $paramNames = [];
        $pattern = preg_replace_callback(
            '#\{([A-Za-z_][A-Za-z0-9_]*)\}#',
            static function (array $matches) use (&$paramNames): string {
                $paramNames[] = $matches[1];
                return '([^/]+)';
            },
            $path
        );

        $this->routes[strtoupper($method)][] = [
            'pattern' => '#^' . $pattern . '$#',
            'handler' => $handler,
            'middleware' => $middleware,
            'paramNames' => $paramNames,
        ];
    }

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    /** @param array{0: class-string, 1: string} $handler @param array<int, callable> $middleware */
    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(Request $request): void
    {
        $method = $request->method();
        $path = $request->path();

        foreach ($this->routes[$method] ?? [] as $route) {
            if (preg_match($route['pattern'], $path, $matches) !== 1) {
                continue;
            }

            $params = [];
            foreach ($route['paramNames'] as $index => $name) {
                $params[$name] = rawurldecode($matches[$index + 1]);
            }
            $request->setRouteParams($params);

            foreach ($route['middleware'] as $middlewareCallable) {
                $middlewareCallable($request);
            }

            [$class, $action] = $route['handler'];
            $result = (new $class())->{$action}($request);
            if (is_array($result)) {
                Response::json($result);
            }
            return;
        }

        // ¿Otro método coincide con la misma ruta? → 405.
        foreach ($this->routes as $allowedMethod => $routes) {
            if ($allowedMethod === $method) {
                continue;
            }
            foreach ($routes as $route) {
                if (preg_match($route['pattern'], $path) === 1) {
                    Response::error('Método no permitido para este recurso', 405);
                }
            }
        }

        Response::error('Recurso no encontrado', 404);
    }
}
