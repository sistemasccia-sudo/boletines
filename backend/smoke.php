<?php

declare(strict_types=1);

/**
 * Prueba de humo de la API (Fase 3): CRUDs, sanitizado de HTML,
 * subida/procesado de imágenes, duplicados y códigos HTTP.
 *
 * Uso (con el servidor local corriendo):
 *   php -S localhost:8000 -t public public/router.php
 *   php smoke.php
 *
 * Crea registros temporales y los elimina al finalizar.
 */

require __DIR__ . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\ImageProcessor;
use App\Core\Jwt;

if (!function_exists('curl_init')) {
    fwrite(STDERR, "Se requiere la extensión curl de PHP.\n");
    exit(2);
}

Env::load(__DIR__ . '/.env');

// Reinicio de tablas del módulo: solo en entorno local, para que la prueba
// sea repetible. Aborta si APP_ENV no es 'local' (nunca tocar producción).
if (Env::get('APP_ENV') !== 'local') {
    fwrite(STDERR, "APP_ENV no es 'local'; smoke.php no ejecuta cambios en esta base.\n");
    exit(2);
}
$pdo = \App\Core\Db::connection();
foreach (['tnoticia', 'tarticulo', 'portadas', 'tcambio', 'tobituario', 'fuente_diarios', 'normas_legales', 'cartas'] as $table) {
    $pdo->exec('DELETE FROM ' . $table);
}

// Usuario real de la BD: su id va en el JWT (sub) y es la FK de cartas.idusuario.
$GLOBALS['smokeUserId'] = (string) (int) ($pdo->query('SELECT id FROM usuarios ORDER BY id ASC LIMIT 1')->fetchColumn() ?: 1);

const BASE = 'http://localhost:8000/api/v1';

$GLOBALS['passes'] = 0;
$GLOBALS['failures'] = 0;
/** @var list<string> $createdImages */
$createdImages = [];
/** @var list<int> $createdIds */
$createdIds = [];

function check(string $label, bool $ok, mixed $extra = null): void
{
    if ($ok) {
        $GLOBALS['passes']++;
        echo "  OK  {$label}\n";
        return;
    }

    $GLOBALS['failures']++;
    echo "FAIL  {$label}";
    if ($extra !== null) {
        echo ' => ' . json_encode($extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    echo "\n";
}

/**
 * @return array{0: int, 1: array<string, mixed>}
 */
function api(
    string $method,
    string $path,
    ?array $json = null,
    ?array $files = null,
    bool $auth = true,
    array $form = []
): array {
    $token = Jwt::encode(['sub' => $GLOBALS['smokeUserId'], 'iat' => time(), 'exp' => time() + 3600, 'nombre' => 'Smoke']);

    $headers = ['Accept: application/json'];
    if ($auth) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    $options = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 30,
    ];

    if ($files !== null) {
        $post = [];
        foreach ($files as $key => $filePath) {
            $post[$key] = new CURLFile($filePath, mime_content_type($filePath) ?: 'application/octet-stream', basename($filePath));
        }
        foreach ($form as $key => $value) {
            $post[$key] = $value;
        }
        $options[CURLOPT_POSTFIELDS] = $post;
    } elseif ($json !== null) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_POSTFIELDS] = json_encode($json, JSON_UNESCAPED_UNICODE);
    }

    $options[CURLOPT_HTTPHEADER] = $headers;

    $ch = curl_init(BASE . $path);
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    if ($raw === false) {
        $error = curl_error($ch);
        curl_close($ch);
        echo "FAIL  error de red en {$method} {$path}: {$error}\n";
        $GLOBALS['failures']++;
        return [0, []];
    }

    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    // El servidor borró/archivó archivos durante la petición: invalida el
    // stat cache para que las is_file() posteriores sean frescas.
    clearstatcache();

    $body = json_decode(substr((string) $raw, $headerSize), true);

    return [$status, is_array($body) ? $body : []];
}

$publicDir = __DIR__ . '/public';
$todayLima = (new DateTimeImmutable('now', new DateTimeZone('America/Lima')))->format('Y-m-d');

echo "== Autenticación y router ==\n";
[$status] = api('GET', '/fuentes', null, null, false);
check('401 sin token', $status === 401);

[$status] = api('GET', '/no-existe');
check('404 ruta inexistente', $status === 404);

[$status] = api('PUT', '/fuentes');
check('405 método no permitido', $status === 405);

[$status] = api('GET', '/fuentes/abc');
check('404 id no numérico', $status === 404);

echo "== Fuentes ==\n";
[$status, $list] = api('GET', '/fuentes?page=1&pageSize=1000');
check('listado 200 con meta', $status === 200 && isset($list['meta']['total']), $list);
check('pageSize tope 100', ($list['meta']['pageSize'] ?? 0) === 100, $list['meta'] ?? null);

[$status, $fuente1] = api('POST', '/fuentes', ['nombre' => 'Agencia Andina']);
check('crear fuente', $status === 200 && ($fuente1['codigo'] ?? null) === 1, $fuente1);
$createdIds['fuentes'][] = $fuente1['id'] ?? 0;

[$status, $fuente2] = api('POST', '/fuentes', ['nombre' => 'Reuters']);
check('código consecutivo', ($fuente2['codigo'] ?? null) === 2, $fuente2);
$createdIds['fuentes'][] = $fuente2['id'] ?? 0;

[$status, $err] = api('POST', '/fuentes', ['nombre' => '   ']);
check('422 nombre vacío', $status === 422 && !empty($err['error']['fields']['nombre']), $err);

[$status, $edit] = api('PUT', '/fuentes/' . $fuente1['id'], ['nombre' => 'Agencia Andina Editada']);
check('PUT actualiza', $status === 200 && $edit['nombre'] === 'Agencia Andina Editada', $edit);

[$status, $list] = api('GET', '/fuentes?sort=nombre&order=asc');
check('listado 2 fuentes', $status === 200 && ($list['meta']['total'] ?? 0) === 2, $list['meta'] ?? null);

echo "== Noticias + sanitizado HTML ==\n";
$cuerpo = '<p>Hola <script>alert(1)</script><a href="javascript:alert(2)">malo</a> '
    . '<a href="https://example.com">externo</a> '
    . '<img src="data:image/png;base64,AAAA" alt="x"> '
    . '<img src="http://localhost:8000/uploads/ok.jpg" alt="ok"></p><h2>Título</h2>';

[$status, $noticia] = api('POST', '/noticias', [
    'titulo' => 'Noticia de prueba',
    'bajada' => 'Bajada de prueba',
    'cuerpo' => $cuerpo,
    'tipo' => '1',
    'fuente_codigo' => (string) $fuente1['codigo'],
    'mostrar_en_web' => true,
]);
check('crear noticia', $status === 200 && isset($noticia['id']), $noticia);
$createdIds['noticias'][] = $noticia['id'] ?? 0;

$cuerpoOk = (string) ($noticia['cuerpo'] ?? '');
check('elimina <script>', !str_contains($cuerpoOk, '<script'), $cuerpoOk);
check('elimina javascript:', !str_contains($cuerpoOk, 'javascript:'), $cuerpoOk);
check('elimina data: URI', !str_contains($cuerpoOk, 'data:image'), $cuerpoOk);
check(
    'enlace externo con rel seguro',
    str_contains($cuerpoOk, 'https://example.com') && str_contains($cuerpoOk, 'noopener'),
    $cuerpoOk
);
check('conserva h2', str_contains($cuerpoOk, '<h2>'), $cuerpoOk);

[$status, $err] = api('POST', '/noticias', ['titulo' => 'x', 'cuerpo' => '<p>y</p>', 'tipo' => '9']);
check('422 tipo inválido', $status === 422 && !empty($err['error']['fields']['tipo']), $err);

[$status, $lista] = api('GET', '/noticias?titulo=prueba');
$first = $lista['data'][0] ?? [];
check('filtro por título', $status === 200 && ($lista['meta']['total'] ?? 0) === 1, $lista['meta'] ?? null);
check('listado sin cuerpo', !array_key_exists('cuerpo', $first));
check('listado con fuente_nombre (join)', ($first['fuente_nombre'] ?? null) !== null, $first);
check('listado con imagen null', array_key_exists('imagen', $first) && $first['imagen'] === null, $first);

[$status, $detalle] = api('GET', '/noticias/' . $noticia['id']);
check('detalle con cuerpo', $status === 200 && str_contains((string) ($detalle['cuerpo'] ?? ''), '<h2>'));

[$status] = api('GET', '/noticias?sort=cuerpo&order=asc');
check('sort fuera de la lista blanca → 200 (usa default)', $status === 200);

[$status, $upd] = api('PUT', '/noticias/' . $noticia['id'], [
    'titulo' => 'Titular actualizado',
    'bajada' => 'Bajada 2',
    'cuerpo' => '<p>Actualizado</p>',
    'tipo' => '2',
    'fuente_codigo' => (string) $fuente1['codigo'],
    'mostrar_en_web' => false,
]);
check(
    'PUT actualiza (sin clave imagen ⇒ conserva)',
    $status === 200 && $upd['titulo'] === 'Titular actualizado' && $upd['mostrar_en_web'] === false,
    $upd
);
check('PUT conserva fecha original', ($upd['fecha'] ?? '') === ($noticia['fecha'] ?? '__'), $upd['fecha'] ?? null);

echo "== Cambiar orden de noticias ==\n";
[$status, $ordenDia] = api('GET', '/noticias/orden');
$idsHoy = array_column($ordenDia['data'] ?? [], 'id');
check(
    'GET /noticias/orden trae las noticias de hoy',
    $status === 200 && ($ordenDia['fecha'] ?? '') === $todayLima && in_array($noticia['id'], $idsHoy, true),
    $ordenDia
);

[$status, $noticia2] = api('POST', '/noticias', [
    'titulo' => 'Noticia de orden 2',
    'cuerpo' => '<p>Orden</p>',
    'tipo' => '1',
]);
$createdIds['noticias'][] = $noticia2['id'] ?? 0;
check('crear segunda noticia de hoy', $status === 200 && isset($noticia2['id']), $noticia2);

[$status, $ordenDia] = api('GET', '/noticias/orden');
check('listado del día con 2 noticias', $status === 200 && count($ordenDia['data'] ?? []) === 2, $ordenDia);

[$status, $soloLocal] = api('GET', '/noticias/orden?tipo=1');
check('filtro por tipo=1 (local)', $status === 200 && count($soloLocal['data'] ?? []) === 2, $soloLocal);

[$status, $sinNacional] = api('GET', '/noticias/orden?tipo=2');
check('filtro por tipo=2 sin resultados', $status === 200 && count($sinNacional['data'] ?? []) === 0, $sinNacional);

[$status, $swap] = api('POST', '/noticias/orden/intercambiar', [
    'ids' => [$noticia['id'], $noticia2['id']],
]);
$nuevos = $swap['data'] ?? [];
check(
    'intercambia el orden de las dos noticias',
    $status === 200
        && ($nuevos[0]['id'] ?? null) === $noticia2['id']
        && ($nuevos[1]['id'] ?? null) === $noticia['id'],
    $swap
);

[$status, $err] = api('POST', '/noticias/orden/intercambiar', [
    'ids' => [$noticia['id'], $noticia['id']],
]);
check('422 misma noticia dos veces', $status === 422 && !empty($err['error']['fields']['ids']), $err);

[$status, $err] = api('POST', '/noticias/orden/intercambiar', [
    'ids' => [$noticia['id']],
]);
check('422 sin dos noticias', $status === 422 && !empty($err['error']['fields']['ids']), $err);

[$status, $noticiaAyer] = api('POST', '/noticias', [
    'titulo' => 'Noticia de ayer',
    'cuerpo' => '<p>Ayer</p>',
    'tipo' => '1',
    'fecha' => date('Y-m-d', strtotime($todayLima . ' -1 day')),
]);
$createdIds['noticias'][] = $noticiaAyer['id'] ?? 0;
[$status, $err] = api('POST', '/noticias/orden/intercambiar', [
    'ids' => [$noticia['id'], $noticiaAyer['id']],
]);
check('422 noticia que no es del día', $status === 422 && !empty($err['error']['fields']['ids']), $err);

echo "== Subida de imágenes (ImageProcessor) ==\n";
$tmpPng = tempnam(sys_get_temp_dir(), 'smoke') . '.png';
$image = imagecreatetruecolor(1200, 900);
$bg = imagecolorallocate($image, 30, 100, 200);
imagefilledrectangle($image, 0, 0, 1199, 899, $bg);
imagepng($image, $tmpPng);
imagedestroy($image);

[$status, $up] = api('POST', '/uploads/editor', null, ['archivo' => $tmpPng], true, ['contexto' => 'editor']);
check('subida OK (ruta relativa)', $status === 200 && str_starts_with((string) ($up['path'] ?? ''), 'uploads/'), $up);
$createdImages[] = (string) ($up['path'] ?? '');
$createdImages[] = (string) ($up['thumb_path'] ?? '');

check(
    'principal en WebP y existe',
    is_file($publicDir . '/' . ($up['path'] ?? '')) && str_ends_with((string) ($up['path'] ?? ''), '.webp')
);
check('miniatura existe', is_file($publicDir . '/' . ($up['thumb_path'] ?? '')));
[$w] = getimagesize($publicDir . '/' . ($up['path'] ?? 'x'));
check('ancho ≤ 1600 (editor)', $w <= 1600, $w);
[$tw] = getimagesize($publicDir . '/' . ($up['thumb_path'] ?? 'x'));
check('miniatura ≤ 400 px', $tw <= 400, $tw);
check(
    'URL absoluta',
    str_starts_with((string) ($up['url'] ?? ''), 'http://localhost:8000/uploads/'),
    $up['url'] ?? null
);

$fake = tempnam(sys_get_temp_dir(), 'fake') . '.jpg';
file_put_contents($fake, '<?php echo 1;');
[$status, $err] = api('POST', '/uploads/editor', null, ['archivo' => $fake], true, ['contexto' => 'editor']);
check('422 MIME inválido (no imagen)', $status === 422, $err);

$big = tempnam(sys_get_temp_dir(), 'big');
file_put_contents($big, str_repeat('A', 11 * 1024 * 1024));
[$status] = api('POST', '/uploads/editor', null, ['archivo' => $big], true, ['contexto' => 'editor']);
check('422 > 10 MB', $status === 422);

[$status, $err] = api('POST', '/uploads/editor', null, null, true);
check('422 sin archivo', $status === 422 && !empty($err['error']['fields']['archivo']), $err);

echo "== Noticia con imagen: reemplazo y borrado ==\n";
[$status, $up1] = api('POST', '/uploads', null, ['archivo' => $tmpPng], true, ['contexto' => 'noticias']);
[$status, $n2] = api('POST', '/noticias', [
    'titulo' => 'Noticia con imagen',
    'cuerpo' => '<p>Con imagen</p>',
    'tipo' => '3',
    'imagen' => (string) ($up1['path'] ?? ''),
]);
check('crear noticia con imagen', $status === 200 && ($n2['imagen'] ?? null) === ($up1['url'] ?? ''), $n2);
$createdIds['noticias'][] = $n2['id'] ?? 0;

[$status, $up2] = api('POST', '/uploads', null, ['archivo' => $tmpPng], true, ['contexto' => 'noticias']);
[$status] = api('PUT', '/noticias/' . $n2['id'], [
    'titulo' => 'Noticia con imagen',
    'cuerpo' => '<p>Con imagen 2</p>',
    'tipo' => '3',
    'imagen' => (string) ($up2['path'] ?? ''),
]);
check(
    'PUT con imagen nueva borra la anterior',
    $status === 200
        && !is_file($publicDir . '/' . ($up1['path'] ?? 'x'))
        && !is_file($publicDir . '/' . ($up1['thumb_path'] ?? 'x'))
        && is_file($publicDir . '/' . ($up2['path'] ?? 'x')),
    $up1
);
$createdImages[] = (string) ($up2['path'] ?? '');
$createdImages[] = (string) ($up2['thumb_path'] ?? '');

echo "== Artículos ==\n";
[$status, $artUp] = api('POST', '/uploads', null, ['archivo' => $tmpPng], true, ['contexto' => 'articulos']);
[$status, $articulo] = api('POST', '/articulos', [
    'titulo' => 'Artículo de prueba',
    'bajada' => 'Bajada del artículo',
    'cuerpo' => '<p>Cuerpo <b>artículo</b> <script>bad()</script></p>',
    'imagen' => (string) ($artUp['path'] ?? ''),
]);
$createdImages[] = (string) ($artUp['path'] ?? '');
$createdImages[] = (string) ($artUp['thumb_path'] ?? '');
$createdIds['articulos'][] = $articulo['id'] ?? 0;
check('crear artículo', $status === 200 && isset($articulo['id']), $articulo);
check('artículo sanitizado', !str_contains((string) ($articulo['cuerpo'] ?? ''), '<script'));
check('artículo con imagen', ($articulo['imagen'] ?? null) === ($artUp['url'] ?? null), $articulo);

[$status, $artList] = api('GET', '/articulos?titulo=prueba');
check('listado artículos', $status === 200 && ($artList['meta']['total'] ?? 0) === 1, $artList['meta'] ?? null);

echo "== Portadas ==\n";
[$status, $portUp] = api('POST', '/uploads', null, ['archivo' => $tmpPng], true, ['contexto' => 'portadas']);
$createdImages[] = (string) ($portUp['path'] ?? '');
$createdImages[] = (string) ($portUp['thumb_path'] ?? '');
[$pw] = getimagesize($publicDir . '/' . ($portUp['path'] ?? 'x'));
check('portada ≤ 2000 px', $pw <= 2000, $pw);

[$status, $portada] = api('POST', '/portadas', ['fecha' => $todayLima, 'archivo' => (string) ($portUp['path'] ?? '')]);
$createdIds['portadas'][] = $portada['id'] ?? 0;
check('crear portada', $status === 200 && ($portada['archivo'] ?? null) === ($portUp['url'] ?? ''), $portada);

[$status, $err] = api('POST', '/portadas', ['archivo' => 'ruta/mala.jpg']);
check('422 ruta fuera de uploads/', $status === 422 && !empty($err['error']['fields']['archivo']), $err);

[$status, $portList] = api('GET', '/portadas?fecha_desde=' . $todayLima);
check('listado portadas por rango de fechas', $status === 200 && ($portList['meta']['total'] ?? 0) === 1, $portList['meta'] ?? null);

echo "== Tipo de cambio ==\n";
[$status, $tc] = api('POST', '/tipo-cambio', [
    'fuente' => 'SUNAT',
    'compra' => '3.745',
    'venta' => '3.75',
    'fecha' => $todayLima,
]);
$createdIds['tipo-cambio'][] = $tc['id'] ?? 0;
check(
    'crear (monto y fuente por separado)',
    $status === 200
        && ($tc['compra'] ?? '') === '3.745'
        && ($tc['venta'] ?? '') === '3.75'
        && ($tc['fuente'] ?? '') === 'SUNAT',
    $tc
);

[$status, $err] = api('POST', '/tipo-cambio', [
    'fuente' => 'RPP',
    'compra' => '3.74',
    'venta' => '3.76',
    'fecha' => $todayLima,
]);
check('422 duplicado (un registro por fecha)', $status === 422 && !empty($err['error']['fields']['fecha']), $err);

[$status] = api('POST', '/tipo-cambio', [
    'fuente' => 'OTRA',
    'compra' => '3.7',
    'venta' => '3.71',
    'fecha' => $todayLima,
]);
check('422 fuente no permitida', $status === 422);

[$status] = api('POST', '/tipo-cambio', [
    'fuente' => 'RPP',
    'compra' => '-1',
    'venta' => '3.71',
    'fecha' => $todayLima,
]);
check('422 compra negativa', $status === 422);

[$status, $tcUpd] = api('PUT', '/tipo-cambio/' . $tc['id'], [
    'fuente' => 'RPP',
    'compra' => '3.8',
    'venta' => '3.81',
    'fecha' => $todayLima,
]);
check(
    'PUT actualiza monto y fuente por separado',
    $status === 200
        && ($tcUpd['compra'] ?? '') === '3.8'
        && ($tcUpd['venta'] ?? '') === '3.81'
        && ($tcUpd['fuente'] ?? '') === 'RPP',
    $tcUpd
);

[$status] = api('POST', '/tipo-cambio', [
    'fuente' => 'RPP',
    'compra' => '3.8',
    'venta' => '3.82',
    'fecha' => $todayLima,
]);
check('422 duplicado de fecha tras editar', $status === 422);

[$status, $tcList] = api('GET', '/tipo-cambio?fuente=RPP&fecha_desde=' . $todayLima . '&sort=compra&order=desc');
check('listado con filtros (fuente + rango de fechas)', $status === 200 && ($tcList['meta']['total'] ?? 0) === 1, $tcList);

echo "== Obituarios ==\n";
[$status, $ob] = api('POST', '/obituarios', ['nombre' => 'Juan Pérez', 'descripcion' => 'Falleció a los 80 años']);
$createdIds['obituarios'][] = $ob['id'] ?? 0;
check('crear obituario', $status === 200 && isset($ob['id']), $ob);
check('fecha = hoy (America/Lima)', ($ob['fecha'] ?? '') === $todayLima, $ob['fecha'] ?? null);

[$status, $err] = api('POST', '/obituarios', ['nombre' => '', 'descripcion' => 'x']);
check('422 nombre vacío', $status === 422 && !empty($err['error']['fields']['nombre']), $err);

echo "== Bol. Legal ==\n";
[$status, $lg] = api('POST', '/legal', [
    'titulo' => 'Norma de prueba',
    'norma_legal' => 'Decreto Supremo N° 001-2026',
    'cuerpo' => '<p>Cuerpo con <strong>formato</strong>.</p>',
    'fecha' => $todayLima,
]);
$createdIds['legal'][] = $lg['id'] ?? 0;
check('crear norma legal (mapeo titular/bajada)', $status === 200 && isset($lg['id']), $lg);
check(
    'dto detalle con cuerpo + campos mapeados',
    ($lg['titulo'] ?? '') === 'Norma de prueba'
        && ($lg['norma_legal'] ?? '') === 'Decreto Supremo N° 001-2026'
        && str_contains((string) ($lg['cuerpo'] ?? ''), '<strong>')
        && ($lg['fecha'] ?? '') === $todayLima,
    $lg
);

// El listado no debe traer `cuerpo` (rendimiento) y acepta filtro por título.
[$status, $lgList] = api('GET', '/legal?pageSize=100&titulo=Norma de prueba');
$lgItem = $lgList['data'][0] ?? [];
check(
    'listado sin `cuerpo` + filtro por título',
    $status === 200 && ($lgList['meta']['total'] ?? 0) === 1 && !array_key_exists('cuerpo', $lgItem),
    $lgItem
);

// El HTML del editor se sanitiza en el backend (lista blanca).
[$status, $lgXss] = api('POST', '/legal', [
    'titulo' => 'Con script',
    'norma_legal' => 'Ley de prueba',
    'cuerpo' => '<p>ok</p><script>alert(1)</script>',
    'fecha' => $todayLima,
]);
$createdIds['legal'][] = $lgXss['id'] ?? 0;
check(
    'sanitiza el cuerpo (sin <script>)',
    $status === 200 && !str_contains((string) ($lgXss['cuerpo'] ?? ''), 'script'),
    $lgXss['cuerpo'] ?? null
);

[$status, $lgSinFecha] = api('POST', '/legal', [
    'titulo' => 'Sin fecha en el payload',
    'norma_legal' => 'Ley sin fecha',
    'cuerpo' => '<p>x</p>',
]);
$createdIds['legal'][] = $lgSinFecha['id'] ?? 0;
check('fecha por defecto = hoy (America/Lima)', $status === 200 && ($lgSinFecha['fecha'] ?? '') === $todayLima, $lgSinFecha['fecha'] ?? null);

[$status, $err] = api('POST', '/legal', ['titulo' => '', 'norma_legal' => 'Ley X', 'cuerpo' => '<p>x</p>', 'fecha' => $todayLima]);
check('422 título vacío', $status === 422 && !empty($err['error']['fields']['titulo']), $err);

[$status, $err] = api('POST', '/legal', ['titulo' => 'x', 'norma_legal' => '', 'cuerpo' => '<p>x</p>', 'fecha' => $todayLima]);
check('422 norma legal vacía', $status === 422 && !empty($err['error']['fields']['norma_legal']), $err);

[$status, $lgSinCuerpo] = api('POST', '/legal', [
    'titulo' => 'Norma sin cuerpo',
    'norma_legal' => 'Ley Z',
    'fecha' => $todayLima,
]);
$createdIds['legal'][] = $lgSinCuerpo['id'] ?? 0;
check('cuerpo opcional (se guarda vacío)', $status === 200 && ($lgSinCuerpo['cuerpo'] ?? null) === '', $lgSinCuerpo);

[$status, $lgUpd] = api('PUT', '/legal/' . $lg['id'], [
    'titulo' => 'Norma actualizada',
    'norma_legal' => 'Ley N° 321',
    'cuerpo' => '<p>Cuerpo editado</p>',
    'fecha' => $todayLima,
]);
check('PUT norma legal', $status === 200 && ($lgUpd['titulo'] ?? '') === 'Norma actualizada', $lgUpd);

[$status, $lgGet] = api('GET', '/legal/' . $lg['id']);
check('GET detalle conserva el cuerpo editado', $status === 200 && str_contains((string) ($lgGet['cuerpo'] ?? ''), 'editado'), $lgGet);

echo "== Cartas ==\n";
[$status, $sig] = api('GET', '/cartas/siguiente-codigo');
check('siguiente-codigo (formato NNN-AAAA)', $status === 200 && preg_match('/^\d{3,}-\d{4}$/', (string) ($sig['codigo'] ?? '')) === 1, $sig);

[$status, $ct] = api('POST', '/cartas', [
    'codigo' => $sig['codigo'],
    'remitente' => 'Empresa SAC',
    'destinatario' => 'Cámara de Comercio',
    'asunto' => 'Solicitud de informe',
]);
$createdIds['cartas'][] = $ct['id'] ?? 0;
check('crear carta con el código sugerido + usuario del JWT', $status === 200 && ($ct['codigo'] ?? '') === ($sig['codigo'] ?? '') && !empty($ct['usuario']), $ct);

[$status, $err] = api('POST', '/cartas', [
    'codigo' => $sig['codigo'],
    'remitente' => 'x',
    'destinatario' => 'y',
    'asunto' => 'z',
]);
check(
    '422 código duplicado con el siguiente sugerido',
    $status === 422 && str_contains((string) ($err['error']['fields']['codigo'] ?? ''), 'siguiente disponible'),
    $err
);

[$status] = api('POST', '/cartas', ['codigo' => 'abc', 'remitente' => 'x', 'destinatario' => 'y', 'asunto' => 'z']);
check('422 código con formato inválido', $status === 422);

// Filtro de búsqueda por cada columna.
[$status, $ctList] = api('GET', '/cartas?remitente=Empresa');
check('filtro por remitente', $status === 200 && ($ctList['meta']['total'] ?? 0) === 1, $ctList['meta'] ?? null);

[$status, $ctList] = api('GET', '/cartas?destinatario=' . rawurlencode('Cámara'));
check('filtro por destinatario', $status === 200 && ($ctList['meta']['total'] ?? 0) === 1, $ctList['meta'] ?? null);

[$status, $ctList] = api('GET', '/cartas?asunto=informe');
check('filtro por asunto', $status === 200 && ($ctList['meta']['total'] ?? 0) === 1, $ctList['meta'] ?? null);

[$status, $ctList] = api('GET', '/cartas?codigo=' . rawurlencode((string) ($sig['codigo'] ?? '')));
$ctRow = $ctList['data'][0] ?? [];
check(
    'filtro por código (exacto) + columna usuario en el listado',
    $status === 200 && ($ctList['meta']['total'] ?? 0) === 1 && !empty($ctRow['usuario']),
    $ctRow
);

[$status, $ctList] = api('GET', '/cartas?fecha_desde=' . $todayLima . '&sort=codigo&order=asc');
check('filtro de fechas + orden por código', $status === 200 && ($ctList['meta']['total'] ?? 0) === 1, $ctList['meta'] ?? null);

[$status, $ctUpd] = api('PUT', '/cartas/' . $ct['id'], [
    'codigo' => $sig['codigo'],
    'remitente' => 'Empresa SAC',
    'destinatario' => 'Colegio de Ingenieros',
    'asunto' => 'Asunto editado',
]);
check('PUT carta', $status === 200 && ($ctUpd['destinatario'] ?? '') === 'Colegio de Ingenieros', $ctUpd);

[$status, $err] = api('POST', '/cartas', [
    'codigo' => $sig['codigo'],
    'remitente' => 'a',
    'destinatario' => 'b',
    'asunto' => 'c',
]);
check('422 duplicado de código tras editar', $status === 422, $err);

[$status] = api('DELETE', '/cartas/' . $ct['id']);
check('eliminar carta', $status === 200);

[$status] = api('GET', '/cartas/' . $ct['id']);
check('404 tras eliminar la carta', $status === 404);

echo "== Borrados (con bloqueo por uso) ==\n";
[$status] = api('DELETE', '/fuentes/' . $fuente2['id']);
check('eliminar fuente sin uso', $status === 200);

[$status, $err] = api('DELETE', '/fuentes/' . $fuente1['id']);
check('422 fuente en uso por noticias', $status === 422 && str_contains((string) ($err['error']['message'] ?? ''), 'en uso'), $err);

[$status] = api('DELETE', '/fuentes/abc');
check('404 id no numérico en DELETE', $status === 404);

[$status] = api('DELETE', '/noticias/' . $noticia['id']);
check('eliminar noticia', $status === 200);

[$status] = api('DELETE', '/noticias/' . $n2['id']);
check(
    'eliminar noticia borra sus archivos',
    $status === 200
        && !is_file($publicDir . '/' . ($up2['path'] ?? 'x'))
        && !is_file($publicDir . '/' . ($up2['thumb_path'] ?? 'x'))
);

[$status] = api('DELETE', '/fuentes/' . $fuente1['id']);
check('fuente ya utilizable tras borrar noticias', $status === 200);

// Limpieza de los registros restantes creados por esta prueba.
foreach (['articulos', 'portadas', 'tipo-cambio', 'obituarios', 'legal', 'cartas'] as $recurso) {
    foreach ($createdIds[$recurso] ?? [] as $id) {
        if ($id > 0) {
            api('DELETE', '/' . $recurso . '/' . $id);
        }
    }
}

foreach ($createdImages as $path) {
    if ($path !== '') {
        ImageProcessor::deleteFiles($path);
    }
}

@unlink($tmpPng);
@unlink($fake);
@unlink($big);

printf("\n%d correctas, %d fallidas\n", $GLOBALS['passes'], $GLOBALS['failures']);
exit($GLOBALS['failures'] === 0 ? 0 : 1);
