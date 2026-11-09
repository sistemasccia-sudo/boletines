<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Representa la petición HTTP entrante (método, ruta, query, body JSON, headers y archivos).
 */
final class Request
{
    /** @var array<string, mixed> */
    private array $user = [];

    /** @var array<string, string> */
    private array $routeParams = [];

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     * @param array<string, mixed> $files
     */
    public function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $query,
        private readonly array $body,
        private readonly array $headers,
        private readonly array $files,
        private readonly string $ip
    ) {
    }

    public static function fromGlobals(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? $path : '/';

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (!str_starts_with($key, 'HTTP_') || !is_string($value)) {
                continue;
            }
            $name = strtolower(str_replace('_', '-', substr($key, 5)));
            $headers[$name] = $value;
        }
        if (isset($_SERVER['CONTENT_TYPE']) && is_string($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = $_SERVER['CONTENT_TYPE'];
        }

        $body = [];
        $contentType = $headers['content-type'] ?? '';
        if (stripos($contentType, 'application/json') !== false) {
            $raw = file_get_contents('php://input');
            if (is_string($raw) && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $body = $decoded;
                }
            }
        } else {
            $body = $_POST;
        }

        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

        return new self($method, $path, $_GET, $body, $headers, $_FILES, $ip);
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function ip(): string
    {
        return $this->ip;
    }

    /** @param array<string, string> $params */
    public function setRouteParams(array $params): void
    {
        $this->routeParams = $params;
    }

    /** Parámetro de ruta (p. ej. {id}); 404 si falta o esta vacío. */
    public function routeParam(string $name): string
    {
        $value = $this->routeParams[$name] ?? '';
        if ($value === '') {
            throw new HttpException(404, 'Recurso no encontrado');
        }
        return $value;
    }

    /** Parámetro de ruta numérico entero; 404 si no es un id válido. */
    public function routeParamInt(string $name): int
    {
        $value = $this->routeParam($name);
        if (ctype_digit($value) === false) {
            throw new HttpException(404, 'Recurso no encontrado');
        }
        return (int) $value;
    }

    /**
     * URL absoluta de un recurso estático (p. ej. uploads/…),
     * detectando HTTPS también detrás de proxy (cPanel/AutoSSL).
     */
    public function absoluteUrl(string $relativePath): string
    {
        $httpsFlag = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
        $isHttps = ($httpsFlag !== '' && $httpsFlag !== 'off')
            || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';

        $scheme = $isHttps ? 'https' : 'http';
        $host = $this->headers['host'] ?? 'localhost';

        return $scheme . '://' . $host . '/' . ltrim($relativePath, '/');
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    /** @return array<string, mixed> Todos los query params de la URL. */
    public function queryParams(): array
    {
        return $this->query;
    }

    /** @return array<string, mixed> */
    public function body(): array
    {
        return $this->body;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /** @return array<string, mixed> */
    public function files(): array
    {
        return $this->files;
    }

    /** @param array<string, mixed> $claims */
    public function setUser(array $claims): void
    {
        $this->user = $claims;
    }

    /** @return array<string, mixed> */
    public function user(): array
    {
        if ($this->user === []) {
            throw new HttpException(401, 'Autenticación requerida');
        }

        return $this->user;
    }
}
