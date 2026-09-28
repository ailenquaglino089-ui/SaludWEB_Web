<?php
/**
 * proponer_contraste.php - Calcula el ajuste minimo de cada color que falla
 * WCAG 2.1 AA, preservando el matiz original.
 *
 * Por que existe: corregir contraste "a ojo" lleva a oscurecer de mas y a
 * romper la paleta. Y oscurecer los tres canales por igual (restar el mismo
 * numero a R, G y B) arruina el color: un #2196F3 terminaba en #000360, que ya
 * no es azul. Por eso se trabaja en HSL y se baja solo la luminosidad, dejando
 * intactos matiz y saturacion.
 *
 * Uso: php proponer_contraste.php
 */

declare(strict_types=1);

const OBJETIVO = 4.5;

/**
 * Deshace la curva sRGB sobre un canal ya normalizado en 0..1.
 * WCAG trabaja con el valor lineal, no con el byte.
 */
function canalLineal(float $canal): float
{
    return $canal <= 0.03928 ? $canal / 12.92 : pow(($canal + 0.055) / 1.055, 2.4);
}

function luminancia(string $hex): float
{
    // aRgb ya devuelve 0..1: no se divide por 255 otra vez, o todos los
    // canales caen a ~0.002 y el contraste de cualquier par da 1.00.
    [$r, $g, $b] = aRgb($hex);

    return 0.2126 * canalLineal($r)
         + 0.7152 * canalLineal($g)
         + 0.0722 * canalLineal($b);
}

function contraste(string $a, string $b): float
{
    $la = luminancia($a);
    $lb = luminancia($b);

    return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
}

function aRgb(string $hex): array
{
    $hex = ltrim($hex, '#');

    if (strlen($hex) === 3) {
        $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }

    return [
        hexdec(substr($hex, 0, 2)) / 255,
        hexdec(substr($hex, 2, 2)) / 255,
        hexdec(substr($hex, 4, 2)) / 255,
    ];
}

function aHex(array $rgb): string
{
    return sprintf(
        '#%02x%02x%02x',
        (int) round(max(0, min(1, $rgb[0])) * 255),
        (int) round(max(0, min(1, $rgb[1])) * 255),
        (int) round(max(0, min(1, $rgb[2])) * 255)
    );
}

function rgbAHsl(array $rgb): array
{
    [$r, $g, $b] = $rgb;
    $max = max($r, $g, $b);
    $min = min($r, $g, $b);
    $l = ($max + $min) / 2;
    $d = $max - $min;

    if ($d == 0.0) {
        return [0.0, 0.0, $l];
    }

    $s = $l > 0.5 ? $d / (2.0 - $max - $min) : $d / ($max + $min);

    switch ($max) {
        case $r: $h = ($g - $b) / $d + ($g < $b ? 6.0 : 0.0); break;
        case $g: $h = ($b - $r) / $d + 2.0; break;
        default:  $h = ($r - $g) / $d + 4.0; break;
    }

    return [$h / 6.0, $s, $l];
}

function hslARgb(float $h, float $s, float $l): array
{
    if ($s == 0.0) {
        return [$l, $l, $l];
    }

    $q = $l < 0.5 ? $l * (1 + $s) : $l + $s - $l * $s;
    $p = 2 * $l - $q;

    $f = function (float $t) use ($p, $q): float {
        if ($t < 0) { $t += 1; }
        if ($t > 1) { $t -= 1; }
        if ($t < 1 / 6) { return $p + ($q - $p) * 6 * $t; }
        if ($t < 1 / 2) { return $q; }
        if ($t < 2 / 3) { return $p + ($q - $p) * (2 / 3 - $t) * 6; }

        return $p;
    };

    return [$f($h + 1 / 3), $f($h), $f($h - 1 / 3)];
}

/**
 * Baja la luminosidad en pasos de 0.002 hasta alcanzar el ratio objetivo.
 * Se prueba primero bajar; si el color ya es demasiado oscuro para bajar mas,
 * se sube. Asi el matiz nunca se pierde.
 */
function ajustarLuminosidad(string $color, string $fondo, float $objetivo): array
{
    [$h, $s, $l] = rgbAHsl(aRgb($color));

    for ($i = 0; $i <= 500; $i++) {
        $candidato = aHex(hslARgb($h, $s, max(0.0, $l - $i * 0.002)));

        if (contraste($candidato, $fondo) >= $objetivo) {
            return [$candidato, 'bajar L'];
        }
    }

    for ($i = 0; $i <= 500; $i++) {
        $candidato = aHex(hslARgb($h, $s, min(1.0, $l + $i * 0.002)));

        if (contraste($candidato, $fondo) >= $objetivo) {
            return [$candidato, 'subir L'];
        }
    }

    return [$color, 'imposible'];
}

// [color, fondo contra el que se lee, etiqueta, sentido]
$casos = [
    ['#aaa',  '#f2f2f2', 'Turnera .slot:disabled', 'texto'],
    ['#bbb',  '#ffffff', 'Turnera .slot sin horas', 'texto'],
    ['#999',  '#ffffff', 'Medicos .meta / Paginacion', 'texto'],
    ['#888',  '#ffffff', 'Turnera texto terciario', 'texto'],
    ['#777',  '#ffffff', 'Turnera texto secundario', 'texto'],
    ['#adb5bd', '#e9ecef', 'Paginacion :disabled', 'texto'],
    ['#a86b12', '#fff4e0', 'Turnera chip pendiente', 'texto'],
    ['#16a34a', '#ffffff', 'Toast exito', 'fondo'],
    ['#667eea', '#ffffff', 'Boton primario', 'fondo'],
    ['#2e9e5b', '#ffffff', 'Turnera badge ok', 'fondo'],
    ['#e05252', '#ffffff', 'Turnera badge cancelado', 'fondo'],
    ['#f44336', '#ffffff', 'Medicos eliminar', 'fondo'],
    ['#2196F3', '#ffffff', 'Medicos primario', 'fondo'],
    ['#FF9800', '#ffffff', 'Prescripciones warn', 'fondo'],
    ['#764ba2', '#ffffff', 'Gradiente Auth (borde)', 'fondo'],
];

printf("%-30s %-9s %-9s %-9s %-10s %s\n", 'CASO', 'ACTUAL', 'NUEVO', 'ANTES', 'DESPUES', 'MODO');
echo str_repeat('-', 92) . "\n";

$propuestos = [];

foreach ($casos as [$color, $fondo, $donde, $sentido]) {
    // El texto se lee sobre $fondo, asi que el color a ajustar es el del texto.
    // En los casos de "fondo" el texto es blanco fijo y lo que se ajusta es el
    // color de fondo: por eso se invierte el par para medirlo como texto.
    if ($sentido === 'fondo') {
        [$ajustado, $modo] = ajustarLuminosidad($color, '#ffffff', OBJETIVO);
    } else {
        [$ajustado, $modo] = ajustarLuminosidad($color, $fondo, OBJETIVO);
    }

    $antes = $sentido === 'fondo'
        ? contraste('#ffffff', $color)
        : contraste($color, $fondo);
    $despues = $sentido === 'fondo'
        ? contraste('#ffffff', $ajustado)
        : contraste($ajustado, $fondo);

    printf(
        "%-30s %-9s %-9s %-9.2f %-10.2f %s\n",
        $donde,
        $color,
        $ajustado,
        $antes,
        $despues,
        $modo
    );

    $propuestos[$donde] = $ajustado;
}

echo "\n";
