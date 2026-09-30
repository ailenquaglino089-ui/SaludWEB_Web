// ============================================================
// verificar_pwa.mjs - Verificación E2E de la PWA en un navegador real
// ============================================================
// Comprueba en Chromium (vía Playwright) que el build ya publicado se
// comporta como PWA: manifest presente y válido, service worker activo,
// recarga servida desde el caché, arranque OFFLINE de la app, y que los
// datos de /api NO se sirven desde el caché (siempre de la red).
//
// CÓMO SE USA
//   1. npm install   (trae las dependencias, incluida esta devDependency)
//   2. npx playwright install chromium   (descarga el navegador, una vez)
//   3. npm run build   (el build produce dist/ con el servicio worker ya
//      compilado; el SW se registra SOLO en producción, es decir acá)
//   4. npx vite preview   (sirve dist/ en http://localhost:4173)
//   5. node verificar_pwa.mjs   (ejecuta las comprobaciones de abajo)
//
// QUÉ SE PRUEBA Y POR QUÉ
//   Los scripts probar_*.php verifican la API, pero la PWA no se puede
//   validar por HTTP: el service worker es código que corre en el navegador
//   y solo se puede comprobar usándolo de verdad. Aviones apagados, WiFi
//   cortado... la red real sería de mentira; Playwright corta la red de la
//   pestaña (setOffline) y eso es determinístico y repetible.
//
//   Todas las afirmaciones imprimen [OK]/[FALLA] y el script termina con
//   código de salida distinto de 0 si algo falla (puede correrse en un CI).
// ============================================================

// chromium = el navegador de Playwright. La SPA necesita un contexto seguro
// (localhost y 127.0.0.1 cuentan como seguros para los service workers, así
// que el registro del SW va a funcionar).
import { chromium } from 'playwright';

// URL de la SPA. Es la del `vite preview` por defecto. Puede pasarse otra
// (p.ej. el despliegue real en XAMPP) como primer argumento: la prueba debe
// correr contra un build ya servido, no contra el dev server de Vite.
const url = process.argv[2] || 'http://127.0.0.1:4173';

// Llevan el conteo para el resumen final, igual que probar_turnera.php.
let ok = 0;
let fallos = 0;

// Imprime el resultado de un paso y acumula. exitCode final = nº de fallos.
function paso(bien, descripcion, detalle = '') {
  if (bien) {
    ok++;
    console.log(`[OK]    ${descripcion}`);
  } else {
    fallos++;
    console.log(`[FALLA] ${descripcion}`);
    if (detalle) console.log(`        ${detalle}`);
  }
}

// Ejecuta una expresión en el contexto de la página y devuelve el resultado.
// Es la única forma de preguntarle al navegador cosas que solo él sabe
// (navigator.serviceWorker, navigator.onLine, si #root tiene contenido).
const enPagina = (pagina, js) => pagina.evaluate(js);

// Es el arranque de la prueba: se abre el navegador de una sola vez y se
// cierra al final (finally) para no dejar procesos colgados aunque algo falle.
try {
  // headless: chromium sin ventana. No hace falta verlo: la prueba solo
  // necesita que el navegador funcione de verdad.
  const navegador = await chromium.launch({ headless: true });
  // Un contexto nuevo = una pestaña limpia: sin cookies, sin sesión, sin SW
  // de visitas anteriores. Aisla cada corrida de las anteriores.
  const contexto = await navegador.newContext();

  // ----------------------------------------------------------------
  // 1. CARGA INICIAL: la app abre y el SW existe y se registra
  // ----------------------------------------------------------------
  console.log('--- Carga inicial y registro del service worker ---');

  const pagina = await contexto.newPage();
  // Errores de red o de JS del navegador se acumulan para diagnosticar:
  // una petición 404 o una excepción en consola son fallas invisibles en
  // pantalla pero rompen una PWA.
  const erroresPagina = [];
  pagina.on('pageerror', (e) => erroresPagina.push('pageerror: ' + e.message));
  pagina.on('requestfailed', (r) => {
    // Las peticiones a /api SE EXCLUYEN de este diagnóstico a propósito. El
    // paso "OFFLINE: /api NO se sirve desde el caché" corta la red y provoca
    // deliberadamente que GET /api/medicos falle; ese fallo es la afirmación
    // de esa comprobación, no un error de la app. Contarlo acá arriba como
    // falla duplicaría la comprobación y el resumen marcaría "fallos" por la
    // condición que justamente se quiere ver. TODO lo demás que falle (assets,
    // html, navegación) SÍ es un error real.
    if (!r.url().includes('/api')) {
      erroresPagina.push('requestfailed: ' + r.url());
    }
  });

  // Primer navegación: la app entera (HTML + assets + registro del SW).
  await pagina.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await pagina.waitForTimeout(500);
  paso((await pagina.locator('#root *').count()) > 0, 'La app renderiza (#root con contenido)');

  // El <link rel="manifest"> debe existir en el head del index.html servido.
  const hayManifest = await enPagina(pagina, () =>
    Boolean(document.querySelector('link[rel="manifest"]'))
  );
  paso(hayManifest, 'El HTML declara el link rel="manifest"');

  // El manifest se debe resolver y tener los datos mínimos de instalabilidad.
  const manifest = await enPagina(pagina, async () => {
    try {
      const r = await fetch(document.querySelector('link[rel="manifest"]').href);
      return await r.json();
    } catch {
      return null;
    }
  });
  paso(Boolean(manifest?.name), 'El manifest se resuelve y tiene nombre', JSON.stringify(manifest));
  const iconos = manifest?.icons ?? [];
  paso(iconos.some((i) => i.sizes === '512x512') && iconos.some((i) => i.sizes === '192x192'),
    'El manifest trae íconos 192x192 y 512x512');
  paso(Boolean(manifest?.theme_color) && manifest?.display === 'standalone',
    'El manifest define theme_color y display standalone');

  // El service worker debe quedar ACTIVO tras la primera carga (la app lo
  // registra en el load y self.skipWaiting() + clients.claim() lo activan).
  const swActivo = await enPagina(pagina, async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active !== null;
  });
  paso(swActivo, 'El service worker queda activo');

  // ----------------------------------------------------------------
  // 2. RECARGA EN LÍNEA: ya puede servir la app el service worker
  // ----------------------------------------------------------------
  console.log('\n--- Recarga en línea (el SW controla la pestaña) ---');

  await pagina.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await pagina.waitForTimeout(500);
  // Tras la recarga, el SW "controla" la página: navigator.serviceWorker.controller
  // deja de ser null. Eso significa que el flujo de fetch pasa por sw.js.
  const controla = await enPagina(pagina, () => Boolean(navigator.serviceWorker.controller));
  paso(controla, 'El service worker controla la navegación tras recargar');

  // ----------------------------------------------------------------
  // 3. OFFLINE: la app debe seguir abriendo y avisando "sin conexión"
  // ----------------------------------------------------------------
  console.log('\n--- Apagado de la red (modo avión) ---');

  // Corta la red DE LA PESTAÑA. Determinístico: no importa si la máquina
  // tiene internet, la pestaña no puede hacer ninguna petición HTTP.
  await contexto.setOffline(true);

  // La recarga OFFLINE es la prueba de fuego del caché del caparazón: la
  // navegación es network-first pero, sin red, debe servir el index.html
  // cacheado y la app tiene que arrancar igual.
  await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await pagina.waitForTimeout(800);

  // Aún sin red, el DOM de la app debe estar montado (login o dashboard).
  paso((await pagina.locator('#root *').count()) > 0, 'OFFLINE: la app abre sin red (caparazón en caché)');

  // El problema debe ser visible: el cartel de AvisoOffline aparece cuando
  // el navegador pasa a offline (evento 'offline') y/o cuando una petición a
  // /api muere sin respuesta. Debe haber una barra .aviso-conexion en pantalla.
  const aviso = await pagina.locator('.aviso-conexion').count();
  paso(aviso > 0, 'OFFLINE: se muestra el aviso global de "sin conexión"');

  // Los datos clínicos NO se cachean por diseño: sin red, GET /api/medicos
  // debe FALLAR (fetch lanza). Si esto pasara, estaría sirviendo datos viejos
  // del caché, y eso sería un dato clínico desactualizado presentado como
  // válido. Es la única condición que DEBE fallar en la prueba.
  const apiFueraDeCaché = await enPagina(pagina, async () => {
    try {
      await fetch('/api/medicos');
      return false; // respondió: el caché está entregando la API
    } catch {
      return true;  // sin red y sin caché: la API siempre pide la red
    }
  });
  paso(apiFueraDeCaché, 'OFFLINE: /api NO se sirve desde el caché (falla sin red)');

  // ----------------------------------------------------------------
  // 4. RECUPERACIÓN: al volver la red, el aviso se esconde solo
  // ----------------------------------------------------------------
  console.log('\n--- Vuelta de la red ---');

  await contexto.setOffline(false);
  // Después de un instante, la app (al intentar data) o el evento 'online'
  // del navegador deben esconder el cartel: ya no hay problema que reportar.
  await pagina.waitForTimeout(1500);
  const oculto = await pagina.locator('.aviso-conexion').count();
  paso(oculto === 0, 'ONLINE: el aviso de "sin conexión" desaparece');

  // Los errores de página acumulados: si el offline previo rompió algo
  // (excepciones JS), queda registrado y cuenta como falla.
  paso(erroresPagina.length === 0, 'Sin errores de JS ni peticiones fallidas',
    erroresPagina.join(' | '));

  // Cierre ordenado: el navegador y su contexto se destruyen SIEMPRE.
  await navegador.close();
} catch (e) {
  // Un fallo de infraestructura (no se abrió el navegador, la URL no
  // responde) también es una falla, y se reporta con su mensaje.
  fallos++;
  console.log('[FALLA] No se pudo ejecutar la prueba: ' + e.message);
  if (e.code === 'ERR_CONNECTION_REFUSED') {
    console.log('        Levantá el servidor primero: npx vite preview');
  }
}

// ----------------------------------------------------------------
// RESULTADO
// ----------------------------------------------------------------
console.log('\n--- Resultado ---');
console.log(`Pasos OK: ${ok}`);
console.log(`Fallos:   ${fallos}`);
console.log(fallos === 0 ? 'La PWA funciona como se espera.' : 'Hay fallos que revisar.');
// Código de salida: 0 = todo bien, 1 = hay fallos (para correrlo en CI/hooks).
process.exitCode = fallos === 0 ? 0 : 1;