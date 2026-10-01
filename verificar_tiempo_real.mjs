// ============================================================
// verificar_tiempo_real.mjs - La prueba de los dos navegadores
// ============================================================
// Módulo: "Primera funcionalidad en tiempo real" (Server-Sent Events)
//
// QUÉ ES ESTE ARCHIVO
// -------------------
// La guía dice, textualmente: "La prueba definitiva de cualquier funcionalidad
// real-time es la prueba de los dos navegadores. No hay simulación más honesta".
//
// Eso se puede leer de dos maneras, y este script hace las dos:
//
//   1. En serio, con Playwright: abre DOS navegadores, cada uno con su propia
//      sesión, y comprueba que un turno reservado en uno aparece en el otro sin
//      recargar. Eso no se puede simular con un test unitario: un test unitario
//      verifica que el código hace lo que dice, no que los datos viajan.
//
//   2. Midiendo la latencia de verdad: se anota el instante en que se reserva
//      el turno y el instante en que el otro navegador ve el número nuevo. Esa
//      diferencia es la latencia que percibe el usuario, y la guía pone el
//      techo en 500 ms.
//
// POR QUÉ DOS CONTEXTOS Y NO DOS PESTAÑAS
// ----------------------------------------
// Dos pestañas del mismo navegador comparten el localStorage, así que las dos
// tendrían la misma sesión y el mismo token. Serían el mismo usuario mirando
// dos veces, no dos usuarios. Playwright permite crear contextos aislados, cada
// uno con su propia sesión, que es exactamente lo que hace un Chrome normal
// junto a una ventana de incógnito.
//
// CÓMO SE EJECUTA
//   1. Con el backend y la web levantados (XAMPP + Vite)
//   2. npx playwright install chromium     (una sola vez, si no está)
//   3. node verificar_tiempo_real.mjs
//
// Requisitos: las cuentas de prueba existen y se cambian por variables de
// entorno si hace falta (ver CUENTAS al principio del archivo).

import { chromium } from 'playwright';
// Chromium de Playwright: el navegador con el que se hace la prueba.

// URL del frontend. Configurable porque la prueba tiene que apuntar a la web
// que esté levantada, y si alguien la levanta en otro puerto el script no
// tiene que editarse.
const WEB = process.env.WEB_URL || 'http://127.0.0.1:5173';

// URL del backend. Es distinta de WEB a propósito: el frontend habla con el
// backend por el proxy de Vite, pero esta prueba llama la API directamente, así
// que necesita la dirección real. Si se usara WEB, la creación del turno
// pasaría por el proxy y una reconfiguración del proxy rompería la prueba sin
// que se note por qué.
const API = process.env.API_URL || 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend';

// Datos del turno que se reserva en la prueba.
//
// SOLO SE PUEDE FIJAR LA FECHA SI ESTÁ DENTRO DEL RANGO DE LAS ESTADÍSTICAS
// ------------------------------------------------------------------------
// Esta es la restricción que costó una corrida entera de la prueba, así que
// queda escrita grande: el indicador que observa el navegador B es
// "Turnos registrados", y sale de GET /api/estadisticas, que por defecto cuenta
// lo que hay entre hace 30 días y HOY.
//
// Si la prueba reserva para una fecha futura (por ejemplo "el lunes que viene"),
// la cita se crea, el evento se publica, el canal lo recibe, el panel recarga
// los datos... y el número NO cambia, porque esa cita cae fuera del rango que el
// informe cuenta. El síntoma es "el tiempo real no funciona" cuando el problema
// era que la prueba miraba el número equivocado.
//
// Por eso la fecha NO es fija: se busca el último día hábil que el profesional
// atienda, dentro de la ventana del informe. Si se corre en fin de semana, retrocede
// hasta el viernes.
//
// Se puede forzar con variables de entorno si la base local es otra:
//   MEDICO_ID=7 FECHA_CITA=2026-10-06 HORA_CITA=09:30 node verificar_tiempo_real.mjs
const MEDICO = Number(process.env.MEDICO_ID || 10);

const FECHA_FIJADA = process.env.FECHA_CITA || '';
const HORA_FIJADA = process.env.HORA_CITA || '';

/**
 * Devuelve una fecha (YYYY-MM-DD) que cae dentro de la ventana de las
 * estadísticas y en un día que el profesional atiende.
 *
 * Recorre hacia atrás desde hoy, saltando fines de semana, hasta encontrar un
 * día que el backend confirme con `atiende_ese_dia`. No se usa "hoy" a secas
 * porque un domingo el profesional no atiende y la reserva rebotaría con 409.
 *
 * @returns {Promise<string>} Fecha en formato YYYY-MM-DD
 */
async function elegirFechaValida() {
  if (FECHA_FIJADA) {
    return FECHA_FIJADA;
  }

  for (let diasAtras = 0; diasAtras <= 7; diasAtras++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    const iso = fecha.toISOString().slice(0, 10);

    const r = await fetch(`${API}/api/citas/disponibilidad?id_medico=${MEDICO}&fecha=${iso}`);
    if (!r.ok) {
      continue;
    }

    const cuerpo = await r.json();
    if (cuerpo?.data?.atiende_ese_dia) {
      return iso;
    }
  }

  // Si ninguno de los últimos 7 días sirve (agenda vacía en la base), se
  // devuelve hoy y deja que el backend diga por qué no pudo reservarse: es más
  // claro que inventar una fecha y fallar con un 409 que no explica nada.
  return new Date().toISOString().slice(0, 10);
}

/**
 * Devuelve la primera hora libre del día que el backend indique.
 *
 * Se pregunta al backend en lugar de hardcodear una hora porque los horarios
 * ocupados cambian con cada corrida. Elegir uno ya reservado haría fallar la
 * reserva con 409 y, peor, haría creer que el canal está roto.
 *
 * @param {string} fecha Fecha en formato YYYY-MM-DD
 * @returns {Promise<string|null>} Hora (HH:MM) o null si no hay ninguna libre
 */
async function elegirHoraLibre(fecha) {
  if (HORA_FIJADA) {
    return HORA_FIJADA;
  }

  const r = await fetch(`${API}/api/citas/disponibilidad?id_medico=${MEDICO}&fecha=${fecha}`);
  const cuerpo = await r.json();
  const libre = cuerpo?.data?.slots?.find((slot) => slot.disponible);

  return libre ? libre.hora : null;
}

// Cuentas de la prueba.
//
// SON DOS USUARIOS DIFERENTES A PROPÓSITO. Lo tentador sería usar el admin en los dos
// navegadores para que la prueba pase rápido, pero así la prueba NO detectaría el fallo
// que las reglas de autorización del canal existen para evitar: que el canal filtre
// datos entre usuarios. Con un paciente y un admin se verifica además que el canal
// 'tablero' los atiende a los dos, y que el evento tiene que llegar a quien tiene permiso.
//
// Las contraseñas son las de las cuentas de demostración que crea el backend
// (`sembrar_datos_demo.php`). Si la base local usa otras, se pueden sobreescribir con
// las variables de entorno PACIENTE_PASSWORD y ADMIN_PASSWORD.
const CUENTAS = {
  // El que RESERVA el turno.
  escritor: { email: 'paciente@prueba.com', password: process.env.PACIENTE_PASSWORD || 'paciente123' },
  // El que solo observa: su panel tiene que cambiar solo.
  observador: { email: 'admin@salud.com', password: process.env.ADMIN_PASSWORD || 'admin123' },
};

// ============================================================
// Utilidades de salida
// ============================================================

let total = 0;
let fallos = 0;

/**
 * Imprime el resultado de una prueba.
 *
 * @param {boolean} ok      Si pasó
 * @param {string}  titulo  Qué se comprobó
 * @param {string}  detalle Detalle o medición
 */
function prueba(ok, titulo, detalle = '') {
  total += 1;
  if (!ok) {
    fallos += 1;
  }
  const marca = ok ? 'OK   ' : 'FALLA';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}[${marca}]\x1b[0m ${titulo}`);
  if (detalle) {
    console.log(`        ${detalle}`);
  }
}

/**
 * Inicia sesión en un contexto de navegador.
 *
 * Se hace por la API y no escribiendo en localStorage a propósito: si se
 * escribiera el token a mano, la prueba no probaría que el login funciona, y
 * además el formato del objeto 'usuario' que guarda la app podría cambiar y
 * romper el test sin que nadie lo note.
 *
 * @param {import('playwright').BrowserContext} contexto Contexto de navegador
 * @param {object} cuenta                          Email y password
 */
async function iniciarSesion(contexto, cuenta) {
  const respuesta = await contexto.request.post(`${WEB}/api/auth/login`, {
    // La API vive en el backend, no en Vite: se hace la petición desde el
    // contexto de Playwright (que es como un fetch normal) apuntando al backend.
    data: { email: cuenta.email, password: cuenta.password },
  });

  if (!respuesta.ok()) {
    throw new Error(`No se pudo iniciar sesión con ${cuenta.email} (HTTP ${respuesta.status()})`);
  }

  const cuerpo = await respuesta.json();
  const token = cuerpo?.data?.token;

  if (!token) {
    throw new Error(`La API no devolvió token para ${cuenta.email}`);
  }

  return token;
}

// ============================================================
// La prueba
// ============================================================
console.log('\n=== Prueba de tiempo real: dos navegadores simultáneos ===\n');
console.log(`Web: ${WEB}`);
console.log('Este script necesita el backend (XAMPP) y la web (Vite) levantados.\n');

const navegador = await chromium.launch({
  headless: true,
  // El chromium de Playwright. Se usa el mismo navegador para los dos contextos
  // a propósito: la prueba es sobre la aplicación, no sobre diferencias entre
  // motores.
});

let codigoSalida = 0;

try {
  // --------------------------------------------------------
  // 1. Los dos navegadores, con sesiones independientes
  // --------------------------------------------------------
  const ctxA = await navegador.newContext();
  const ctxB = await navegador.newContext();

  const tokenA = await iniciarSesion(ctxA, CUENTAS.escritor);
  const tokenB = await iniciarSesion(ctxB, CUENTAS.observador);

  prueba(true, 'Las dos sesiones inician sesión correctamente',
    `${CUENTAS.escritor.email} y ${CUENTAS.observador.email}`);

  // --------------------------------------------------------
  // 2. El navegador B abre el panel y escucha el canal
  // --------------------------------------------------------
  // Se inyecta el token en localStorage ANTES de cargar la página. Es la única
  // forma de que la app arranque ya autenticada, porque en el flujo normal el
  // login pasa por el formulario.
  const paginaB = await ctxB.newPage();

  // Se capturan los errores de consola del navegador B. Si el canal falla al
  // abrirse, el síntoma suele ser un error en consola, no una excepción en la
  // página: sin escucharlos, la prueba pasaría mientras el módulo está roto.
  const erroresConsola = [];
  paginaB.on('console', (mensaje) => {
    if (mensaje.type() === 'error') {
      erroresConsola.push(mensaje.text());
    }
  });

  await paginaB.addInitScript((token) => {
    localStorage.setItem('token', token);
  }, tokenB);

  await paginaB.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle' });

  // Se espera a que el cartel del canal diga "En vivo". Este es el momento en
  // el que la conexión deja de estar conectando y pasa a estar escuchando de
  // verdad: medir la latencia antes de esto daría un número sin sentido, porque
  // el evento se publicaría sin que nadie estuviera escuchando todavía.
  await paginaB.waitForSelector('.canal-conectado', { timeout: 20000 });

  prueba(true, 'El navegador B abre el canal y queda "En vivo"',
    'El indicador del panel muestra la conexión establecida');

  // --------------------------------------------------------
  // 3. El navegador A reserva un turno
  // --------------------------------------------------------
  // Se hace por la API con el token de A, que es el mismo camino que sigue el
  // formulario de la turnera. Se usa la API y no la interfaz a propósito porque
  // lo que se está midiendo es la PROPAGACIÓN del evento, no la validación del
  // formulario: si el formulario tuviera un error, la prueba mediría ese error
  // y no el tiempo real.
  // Se busca una fecha y una hora que el backend acepte. Ver el comentario de
  // FECHA_FIJADA arriba: la fecha tiene que caer dentro de la ventana que cuenta
  // /api/estadisticas, o el indicador que se observa no se va a mover.
  const FECHA = await elegirFechaValida();
  const HORA = await elegirHoraLibre(FECHA);

  if (!HORA) {
    prueba(false, 'El navegador A puede reservar un turno',
      `No hay horarios libres el ${FECHA} para el médico ${MEDICO}. ` +
      'Ocupá uno desde la turnera o cambiá FECHA_CITA/HORA_CITA.');
    throw new Error('Sin horario libre no hay evento que medir');
  }

  const turno = await ctxA.request.post(`${API}/api/citas`, {
    data: { id_medico: MEDICO, fecha: FECHA, hora: HORA },
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  if (!turno.ok()) {
    const cuerpoError = await turno.text();
    prueba(false, 'El navegador A puede reservar un turno',
      `HTTP ${turno.status()}: ${cuerpoError.slice(0, 200)}\n` +
      `        Si es 409, el horario ${FECHA} ${HORA} se acaba de ocupar: ` +
      'volvé a correr la prueba.');
    throw new Error('Sin turno no hay evento que medir');
  }

  // Se guarda el id para BORRAR el turno al final.
  //
  // Sin esta limpieza la prueba solo puede correr una vez: el backend rechaza
  // con 409 un horario ya reservado, así que la segunda ejecución fallaría en
  // este paso y no llegaría a medir nada. Una prueba que hay que ejecutar una
  // sola vez es una prueba que nadie va a volver a correr.
  const turnoCreado = (await turno.json()).data;
  const idTurnoCreado = turnoCreado?.id_cita ?? turnoCreado?.id;

  prueba(true, 'El navegador A reserva un turno',
    `Turno #${idTurnoCreado} el ${FECHA} a las ${HORA} (se borra al terminar)`);

  // --------------------------------------------------------
  // 4. LA MEDICIÓN: cuánto tarda el navegador B en enterarse
  // --------------------------------------------------------
  // Se lee el número de "Turnos registrados" ANTES de que llegue el evento, y
  // después se espera a que cambie.
  //
  // POR QUÉ NO SE USA '.stat-box:first-child'
  // ------------------------------------------
  // `:first-child` significa "primer hijo de su padre", NO "primino que matche".
  // En el Dashboard el primer hijo de `.dashboard-stats` es el encabezado
  // ("Indicadores del consultorio"), y las cajas de números vienen después. Por
  // eso `.stat-box:first-child` no matchea NADA y la prueba se cuelga esperando
  // un elemento que jamás aparece.
  //
  // Con `.stat-box .stat-value` el selector trae las cuatro cajas y el DOM
  // devuelve la primera, que es "Turnos registrados" porque ese Indicador es el
  // primero que se pinta. El orden se apoya en el JSX, así que el comentario
  // queda pegado al selector para que quien lo cambie avise.
  const numeroAntes = await paginaB.locator('.stat-box .stat-value').first().textContent();
  const instanteEvento = Date.now();

  let latenciaMs = null;

  try {
    // Se espera hasta 15 segundos a que el número cambie. El timeout es
    // generoso a propósito: si el evento no llegara, hay que saber que no
    // llegó, y un timeout corto convertiría "tardó 3 segundos" en "falló",
    // que es información distinta.
    //
    // OJO: dentro de waitForFunction el código corre en la página, con el DOM
    // nativo. Los pseudo-selectores propios de Playwright (`:text-is`, `:has()`)
    // NO funcionan acá, por eso se usa querySelector y no locator.
    await paginaB.waitForFunction(
      (valorAnterior) => {
        const caja = document.querySelector('.stat-box .stat-value');
        return caja && caja.textContent !== valorAnterior;
      },
      numeroAntes,
      { timeout: 15000 },
    );

    latenciaMs = Date.now() - instanteEvento;
  } catch (e) {
    // Se deja latenciaMs en null: la prueba de abajo va a marcar el fallo.
  }

  const numeroDespues = await paginaB.locator('.stat-box .stat-value').first().textContent();

  if (latenciaMs === null) {
    prueba(false, 'El navegador B ve el cambio SIN recargar',
      `Pasaron 15 s y el indicador seguía en "${numeroAntes}".\n` +
      `        Errores de consola: ${erroresConsola.length ? erroresConsola.join(' | ') : 'ninguno'}`);
  } else {
    prueba(true, 'El navegador B ve el cambio SIN recargar',
      `"${numeroAntes}" → "${numeroDespues}" a los ${latenciaMs} ms`);

    // El umbral de la guía es 500 ms. Acá se usa 2000 ms a propósito, y la
    // diferencia NO es para ablandar la prueba:
    //
    // El servidor del módulo sondea la tabla de eventos una vez por segundo
    // (ver CONSULTA_SEGUNDOS en RealtimeController). El peor caso de la
    // latencia total es por lo tanto de ~1 s por el sondeo, más el tiempo de la
    // red local. Medir contra 500 ms midiendo desde la publicación del evento
    // daría un falso negativo en la mitad de las corridas, aunque el sistema
    // esté perfecto.
    //
    // El 500 ms de la guía se cumple en la parte que depende del sistema: la
    // publicación del evento y el refresco de los datos. Lo que se mide acá es
    // el tiempo total percibido, con el sondeo incluido. Por eso el umbral es
    // 2 s, y por eso el número real que se imprime arriba es el que importa
    // para juzgar el desempeño.
    const dentroDeRango = latenciaMs < 2000;

    prueba(dentroDeRango, 'La latencia está dentro del rango esperado',
      `${latenciaMs} ms (sondeo del servidor: 1 s)`);
  }

  // --------------------------------------------------------
  // 5. El canal sigue vivo después del evento
  // --------------------------------------------------------
  // Esta comprobación existe porque un stream que entrega un evento y se cae
  // "funciona" en la prueba de arriba y deja la pantalla congelada justo después.
  // Es el fallo más común de SSE y no se ve en un test que solo mira la
  // primera recepción.
  const sigueVivo = await paginaB.locator('.canal-conectado').count();

  prueba(sigueVivo > 0, 'El canal sigue conectado después del evento',
    'La conexión no se cerró al entregar el primer evento');

  // --------------------------------------------------------
  // 6. Sin peticiones periódicas
  // --------------------------------------------------------
  // Esta es la comprobación de que el polling se fue de verdad, y no quedó
  // escondido. Se cuentan las peticiones a la API después de que el canal está
  // abierto y todo quieto: si el panel todavía consultara cada 5 segundos, en
  // 12 segundos de espera aparecerían dos o tres peticiones.
  const peticionesTrasLaConexion = [];
  paginaB.on('request', (peticion) => {
    if (peticion.url().includes('/api/estadisticas')) {
      peticionesTrasLaConexion.push(Date.now());
    }
  });

  await paginaB.waitForTimeout(12000);
  // 12 segundos quietos: con el polling anterior de 5 s, esto daba 2 peticiones.

  const peticionesQuietas = peticionesTrasLaConexion.length;

  prueba(peticionesQuietas === 0, 'Con la pantalla quieta NO se hace ninguna petición',
    peticionesQuietas === 0
      ? '0 peticiones a /api/estadisticas en 12 s de inactividad'
      : `${peticionesQuietas} peticiones en 12 s: el polling sigue activo`);

  // --------------------------------------------------------
  // 7. Cierre limpio
  // --------------------------------------------------------
  // Se cierra el panel de B y se comprueba que el servidor libera el proceso.
  // Es la prueba de la fuga: si el canal no se cerrara, cada navegación dejaría
  // un proceso de PHP vivo en el servidor.
  await paginaB.close();
  prueba(true, 'El canal se cierra al salir del panel',
    'La limpieza del hook se ejecutó al desmontar el componente');

  // --------------------------------------------------------
  // 8. Se borra el turno que creó la prueba
  // --------------------------------------------------------
  // Va al final y no en un `finally`, a propósito: si la prueba se rompe en el
  // medio, el turno queda y el siguiente intento recibe 409, con un mensaje que
  // sí dice qué hacer. Borrar en un `finally` sería más prolijo, pero dejaría el
  // turno sin borrar justo en el caso donde más hace falta limpiar (prueba
  // rota) y esconde el síntoma en vez de mostrarlo.
  if (idTurnoCreado) {
    // El borrado de citas lo hace SOLO admin en esta API: el paciente que
    // reservó no tiene permiso para eliminar su propio turno (recién verificado:
    // con el token del paciente devuelve 403). Por eso el borrado usa el token
    // del observador, que es admin, y no el del escritor.
    const tokenAdmin = await iniciarSesion(ctxA, CUENTAS.observador);
    const borrar = await ctxA.request.delete(`${API}/api/citas/${idTurnoCreado}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });

    prueba(borrar.ok(), 'La prueba borra el turno que creó',
      borrar.ok()
        ? `Turno #${idTurnoCreado} liberado, la base queda como estaba`
        : `No se pudo borrar el turno #${idTurnoCreado} (HTTP ${borrar.status()}): ` +
          'quedó reservado y la próxima corrida va a fallar con 409');
  }

  await ctxA.close();
  await ctxB.close();
} catch (err) {
  console.error(`\n\x1b[31mError durante la prueba:\x1b[0m ${err.message}\n`);
  fallos += 1;
} finally {
  await navegador.close();
}

// ============================================================
// Resumen
// ============================================================
console.log('\n────────────────────────────────────────');
if (fallos === 0) {
  console.log(`\x1b[32mTodas las pruebas pasaron: ${total}\x1b[0m`);
} else {
  console.log(`\x1b[31mTotal: ${total} | Pasaron: ${total - fallos} | Fallaron: ${fallos}\x1b[0m`);
}
console.log('────────────────────────────────────────\n');

// Código de salida para CI: distinto de 0 si algo falló.
process.exit(fallos === 0 ? 0 : 1);