<?php
// Detecta var(--x) usadas en el CSS sin que exista --x en tokens.css.
//
// Es el fallo que mas dano hace y menos se ve: si una variable no existe,
// el navegador descarta la DECLARACION COMPLETA. No tira error, no avisa
// por consola, y el elemento se queda sin el fondo, sin el borde o sin el
// color. La pagina parece "un poco rota" sin que haya forma de saber por
// que. Un linter de esto es mas barato que debuggear eso.

declare(strict_types=1);

$raiz = 'C:\\xampp\\htdocs\\Workspace_SaludWEB\\SaludWEB_Web\\src';
$tokensPath = $raiz . '\\tokens.css';

// 1) Variables definidas, incluyendo las de la parte :root de tokens.css.
$definidas = [];
$contenido = file_get_contents($tokensPath);
if ($contenido === false) {
    fwrite(STDERR, "No se pudo leer tokens.css\n");
    exit(1);
}
preg_match_all('/(--[\w-]+)\s*:/', $contenido, $m);
$definidas = array_fill_keys($m[1], true);

// 2) Variables usadas en todos los .css.
$usadas = [];
$archivos = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($raiz));
foreach ($archivos as $archivo) {
    if (!$archivo->isFile() || $archivo->getExtension() !== 'css') {
        continue;
    }
    $ruta = $archivo->getPathname();
    $crudo = file_get_contents($ruta);
    if ($crudo === false) {
        continue;
    }

    // Se borran los comentarios antes de buscar. Sin esto, un var(--x)
    // escrito como ejemplo dentro de un comentario se reporta como
    // variable rota y el linter miente: hay que poder confiar en un
    // "0 errores" para que sirva.
    $texto = preg_replace('#/\*.*?\*/#s', '', $crudo);

    // Solo se buscan usos, no declaraciones: una linea "--x:" es la
    // declaracion del token, no un uso.
    preg_match_all('/var\(\s*(--[\w-]+)/', $texto, $usos);
    $lineas = preg_split('/\R/', $texto);

    foreach ($usos[1] as $i => $var) {
        // El segundo argumento de var() es un valor de reserva, que es
        // justamente el caso en que la variable puede no existir.
        $conReserva = false;
        $posUsos = [];
        $patron = '/var\(\s*' . preg_quote($var, '/') . '\s*(,|\))/';
        if (preg_match($patron, $texto)) {
            // Se detecta por el patron con cierre: hay que distinguir
            // "var(--x)" de "var(--x, rojo)".
            preg_match_all('/var\(\s*' . preg_quote($var, '/') . '\s*(,[^)]*)?\)/', $texto, $conComa);
            foreach ($conComa[0] as $caso) {
                if (str_contains($caso, ',')) {
                    $conReserva = true;
                }
            }
        }

        $usadas[$var][] = [
            'archivo' => basename($ruta),
            'linea' => $i,
            'conReserva' => $conReserva,
        ];
    }
}

ksort($usadas);

$roto = 0;
$conReserva = 0;

echo "VARIABLES USADAS SIN DEFINIR\n";
echo str_repeat('-', 74), "\n";

foreach ($usadas as $var => $apariciones) {
    if (isset($definidas[$var])) {
        continue;
    }

    // Si todos los usos traen valor de reserva, no rompe nada: el
    // navegador usa ese valor. Se informa aparte, no como error.
    $todasConReserva = true;
    foreach ($apariciones as $a) {
        if (!$a['conReserva']) {
            $todasConReserva = false;
            break;
        }
    }

    if ($todasConReserva) {
        $conReserva++;
        printf("%-26s OK (todas con valor de reserva)\n", $var);
        continue;
    }

    $roto++;
    printf("%-26s SIN DEFINIR  (%d usos)\n", $var, count($apariciones));
    foreach ($apariciones as $a) {
        printf("    %s  uso #%d%s\n", $a['archivo'], $a['linea'], $a['conReserva'] ? '  (con reserva)' : '  *** SIN RESERVA ***');
    }
}

echo "\n", str_repeat('-', 74), "\n";
printf("Variables distintas usadas: %d | Definidas en tokens.css: %d\n", count($usadas), count($definidas));
printf("Usos con valor de reserva: %d | Variables rotas: %d\n", $conReserva, $roto);

exit($roto > 0 ? 1 : 0);
