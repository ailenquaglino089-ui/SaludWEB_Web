<?php

$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($ruta)) {
    http_response_code(400);
    exit;
}

if ($ruta === '/api' || str_starts_with($ruta, '/api/')) {
    require __DIR__ . '/../../SaludWEB_Backend/index.php';
    return true;
}

$dist = realpath(__DIR__ . '/../dist');
if ($dist === false) {
    http_response_code(503);
    echo 'La web todavía no está compilada.';
    return true;
}

$rutaDecodificada = rawurldecode($ruta);
if (str_contains($rutaDecodificada, "\0")) {
    http_response_code(400);
    return true;
}

$archivo = realpath($dist . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $rutaDecodificada), DIRECTORY_SEPARATOR));
$prefijoDist = $dist . DIRECTORY_SEPARATOR;
if (
    $archivo !== false
    && strncasecmp($archivo, $prefijoDist, strlen($prefijoDist)) === 0
    && is_file($archivo)
) {
    return false;
}

if ($ruta !== '/' && pathinfo($ruta, PATHINFO_EXTENSION) !== '') {
    http_response_code(404);
    return true;
}

readfile($dist . DIRECTORY_SEPARATOR . 'index.html');
return true;
