<?php
// Audita los COMENTARIOS de tokens.css contra el valor real del token.
//
// Un comentario de contraste equivocado es peor que no tenerlo: el dia
// que alguien confie en el y no mire el hex, va a usar un color que no
// cumple. Este script extrae los ratios afirmados y los recalcula.

declare(strict_types=1);

$tokensPath = 'C:\\xampp\\htdocs\\Workspace_SaludWEB\\SaludWEB_Web\\src\\tokens.css';
$lineas = file($tokensPath, FILE_IGNORE_NEW_LINES);

function hexACanales(string $hex): array
{
    $hex = ltrim($hex, '#');
    if (strlen($hex) === 3) {
        $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }
    return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
}

function luminance(string $hex): float
{
    $pesos = [0.2126, 0.7152, 0.0722];
    $b = 0.0;
    foreach (hexACanales($hex) as $i => $v) {
        $c = $v / 255;
        $b += $pesos[$i] * ($c <= 0.03928 ? $c / 12.92 : pow(($c + 0.055) / 1.055, 2.4));
    }
    return $b;
}

function contraste(string $a, string $b): float
{
    $la = luminance($a);
    $lb = luminance($b);
    return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
}

// El ratio NO se escribe aca: se lee del propio comentario de tokens.css.
// Si estuviera fijo en el script, el script compararia el archivo contra una
// copia mia de los numeros, y dos copias mienten igual de bien. Leyendolo del
// archivo, el unico valor de referencia es el hex real del token.
$declarado = [];
$fondoDe = [
    '--texto' => '#ffffff',
    '--texto-medio' => '#ffffff',
    '--texto-suave' => '#ffffff',
    '--texto-tenue' => '#f2f2f2',
    '--texto-deshabilitado' => '#e9ecef',
    '--exito' => '#ffffff',
    '--error' => '#ffffff',
    '--aviso' => '#ffffff',
    '--aviso-texto' => '#fff4e0',
    '--info' => '#ffffff',
    '--confirmado' => '#ffffff',
    '--cancelado' => '#ffffff',
    '--primario' => '#ffffff',
];

// Se recorre el archivo guardando, para cada token, su hex y el primer
// ratio que aparece en su bloque de comentario. El ratio tiene que ser el
// del token, no uno citado de paso, asi que se para en la proxima
// declaracion de token.
$actual = null;
$hex = null;
$ratio = null;
foreach ($lineas as $l) {
    if (preg_match('/^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/', $l, $m)) {
        if ($actual !== null && $ratio !== null && isset($fondoDe[$actual])) {
            $declarado[] = [$actual, $hex, $fondoDe[$actual], $ratio];
        }
        $actual = $m[1];
        $hex = $m[2];
        $ratio = null;
        continue;
    }
    if ($actual !== null && $ratio === null && preg_match('/(\d+\.\d+):1/', $l, $m)) {
        $ratio = (float) $m[1];
    }
}
if ($actual !== null && $ratio !== null && isset($fondoDe[$actual])) {
    $declarado[] = [$actual, $hex, $fondoDe[$actual], $ratio];
}

// El valor real que declara el archivo, para detectar tokens que el
// comentario describe pero el codigo no tiene.
$reales = [];
$actual = null;
foreach ($lineas as $l) {
    if (preg_match('/^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/', $l, $m)) {
        $actual = $m[1];
        $reales[$actual] = $m[2];
    }
}

printf("%-22s %-9s %-9s %-9s %-8s %s\n", 'TOKEN', 'DECLARADO', 'REAL', 'CALCULADO', 'FONDO', 'ESTADO');
echo str_repeat('-', 88), "\n";

$problemas = 0;
foreach ($declarado as [$nombre, $valor, $fondo, $afirmado]) {
    $calculado = contraste($valor, $fondo);

    // Tolerancia de 0.02 por redondeo a dos decimales.
    $coincide = abs($calculado - $afirmado) < 0.02;
    $enArchivo = ($reales[$nombre] ?? null) === $valor;

    $problemasTexto = [];
    if (!$coincide) {
        $problemasTexto[] = sprintf('ratio dice %.2f, real %.2f', $afirmado, $calculado);
    }
    if (!$enArchivo) {
        $problemasTexto[] = sprintf('el token vale %s, no %s', $reales[$nombre] ?? 'AUSENTE', $valor);
    }

    $cumpleAA = $afirmado >= 4.5;
    if (!$cumpleAA) {
        $problemasTexto[] = 'el ratio afirmado no llega a AA';
    }

    if ($problemasTexto) {
        $problemas++;
    }

    printf(
        "%-22s %-9s %-9s %-9s %-8s %s\n",
        $nombre,
        number_format($afirmado, 2, '.', ''),
        $reales[$nombre] ?? 'AUSENTE',
        number_format($calculado, 2, '.', ''),
        $fondo,
        $problemasTexto ? implode('; ', $problemasTexto) : 'OK'
    );
}

echo "\n", str_repeat('-', 88), "\n";
printf("Tokens auditados: %d | Con problemas: %d\n", count($declarado), $problemas);
