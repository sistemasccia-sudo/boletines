<?php

declare(strict_types=1);

use App\Core\Env;

return [
    // Origen permitido (debe coincidir exactamente con CORS_ORIGIN en .env)
    'origin' => Env::get('CORS_ORIGIN'),
    'allow_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allow_headers' => ['Content-Type', 'Authorization'],
    'max_age' => 600,
];
