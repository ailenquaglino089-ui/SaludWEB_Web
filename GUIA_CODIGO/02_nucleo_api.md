# Guía de código — Web · Núcleo, api, context, hooks y utils

> Recorrido línea por línea del arranque, el acceso a datos y las utilidades.
> Índice general en ../GUIA_DE_CODIGO.md

## `src/main.jsx` (35 líneas)
- **Rol:** Punto de entrada de la SPA: monta React sobre `#root` y registra el Service Worker solo en producción.
- **Recorrido línea por línea:**
  - L1–L9: imports de `React`, `ReactDOM/client`, el componente `App` y el CSS global (`./App.css`); los comentarios explican cada uno.
  - L10–L25: comentario y bloque que registra el Service Worker únicamente si `import.meta.env.PROD` y existe `navigator.serviceWorker`; espera el evento `load` y llama a `register('./sw.js')` con un `catch` que solo avisa por consola.
  - L26–L35: `ReactDOM.createRoot(document.getElementById('root')).render(...)` envuelve `<App />` en `<React.StrictMode>`; los comentarios describen el punto de montaje y el rol de StrictMode.
- **Se conecta con:** `src/App.jsx` (componente raíz), `src/App.css` (estilos globales), `public/sw.js` (Service Worker del build) y `index.html` (div `#root`).

## `src/App.jsx` (325 líneas)
- **Rol:** Raíz de la SPA: define los guards de ruta, la tabla de rutas y el orden de las capas (BrowserRouter → AuthProvider → AppContent).
- **Recorrido línea por línea:**
  - L1–L26: encabezado de comentarios que explica qué vive y qué no en el archivo, el orden obligatorio de las capas y por qué hay dos formas de proteger una ruta.
  - L27–L30: imports de `BrowserRouter`, `Routes`, `Route`, `Navigate`, `AuthProvider`, `AuthContext` y `useContext`.
  - L31–L46: imports de `Navbar`, `AvisoOffline`, pantallas (`Login`, `Register`, `Dashboard`, `ListaMedicos`, `ListaPacientes`, `ListaPrescripciones`, `Configuracion`, `Usuarios`, turnera) y el CSS `./App.css`.
  - L47–L57: comentario de `ProtectedRoute` (no es chequeo de permisos, solo de sesión).
  - L58–L90: `ProtectedRoute({ children })`: lee `autenticado` y `cargando`; si `cargando` devuelve el bloque `.loading-container` con spinner; si no hay sesión `<Navigate to="/login" />`; si hay sesión, `children`.
  - L91–L109: comentario de `AdminRoute` (por qué existe aparte de `ProtectedRoute`).
  - L110–L143: `AdminRoute({ children })`: misma guarda de carga, redirección a `/login` sin sesión y a `/dashboard` si `usuario?.tipo_usuario !== 'admin'`.
  - L144–L148: comienzo de `AppContent()` y lectura de `autenticado` vía `useContext`.
  - L149–L162: estructura visual: `<div className="app">`, `<Navbar />` y `<AvisoOffline />` fuera de `<Routes>`.
  - L163–L174: apertura de `<main className="main-content">` y `<Routes>`, más el comentario de rutas públicas.
  - L175–L183: rutas públicas `/login` y `/register`, cada una con ternario que redirige a `/dashboard` si ya hay sesión.
  - L184–L192: comentario de rutas protegidas.
  - L193–L200: ruta `/dashboard` envuelta en `ProtectedRoute`.
  - L201–L209: ruta `/medicos` protegida.
  - L210–L218: ruta `/pacientes` protegida.
  - L219–L227: ruta `/prescripciones` protegida.
  - L228–L241: comentario y ruta `/usuarios` envuelta en `AdminRoute`.
  - L242–L250: ruta `/configuracion` protegida.
  - L251–L276: comentario extenso de las rutas de turnera (protección irregular a propósito).
  - L277–L296: rutas `/turnera`, `/turnera/agenda/:idMedico`, `/turnera/mis-turnos` (protegida) y `/turnera/agenda/:idMedico/reservar`.
  - L297–L307: ruta raíz `/` con `Navigate` según `autenticado` y comodín `*` que redirige a `/`.
  - L308–L325: cierre de `</Routes>`, `</main>`, `</div>` y export default `App` que monta `<BrowserRouter><AuthProvider><AppContent /></AuthProvider></BrowserRouter>`.
- **Se conecta con:** `AuthContext.jsx` (contexto de sesión), `Navbar`, `AvisoOffline`, todas las pantallas importadas, `src/App.css` y `src/main.jsx` (que lo monta).

## `src/App.css` (923 líneas)
- **Rol:** Estilos globales de la SPA: reset, layout, botones, tablas, formularios, accesibilidad, alertas, responsive mobile-first y barra inferior de navegación.
- **Recorrido por bloques (todos los selectores cubiertos):**
  - L1–L17: comentario de cabecera con los seis cambios respecto de la versión anterior.
  - L19–L28: sección TOKENS y `@import './tokens.css'` con la explicación de por qué se importa desde acá.
  - L30–L46: RESET; selector universal `*` con `margin/padding: 0` y `box-sizing: border-box`.
  - L48–L58: `html, body, #root` con `height: 100%`, `font-family: var(--fuente)` y `-webkit-text-size-adjust`.
  - L60–L68: `body` con `background-color: var(--fondo)` y `overscroll-behavior-y: none`.
  - L70–L93: LAYOUT PRINCIPAL; `.app` con `display: flex`, columna y `min-height: 100vh/100dvh`.
  - L95–L109: `.main-content` con `flex: 1` y `padding-bottom` que reserva la barra inferior más la zona segura.
  - L111–L124: ESTADO DE CARGA; `.loading-container` centrado con `min-height` de viewport.
  - L126–L136: `.spinner`, círculo con borde y `animation: spin`.
  - L138–L142: `@keyframes spin`.
  - L144–L153: comentario de accesibilidad y `.loading-container p` con color y tamaño.
  - L155–L161: `.loading-container [role='status'], [aria-live]` con `text-align: center`.
  - L163–L175: COMPONENTES COMUNES; `.container` con `max-width: 1200px` y padding.
  - L177–L247: BOTONES; comentario y `.btn` (inline-flex, min-height 44px, padding, borde, tipografía, transiciones explícitas).
  - L249–L255: `.btn:focus-visible` con contorno y offset.
  - L257–L266: `.btn:disabled` con `cursor: not-allowed` y opacidad.
  - L268–L274: `.btn-primary` con degradado de marca.
  - L276–L282: `.btn-primary:hover:not(:disabled)` con elevación y sombra.
  - L284–L289: `.btn-primary:active:not(:disabled)` que vuelve al sitio.
  - L291–L295: `.btn-secondary`.
  - L297–L299: `.btn-secondary:hover:not(:disabled)`.
  - L301–L306: `.btn-danger`.
  - L308–L311: `.btn-danger:hover:not(:disabled)`.
  - L313–L324: comentario y `.btn-sm` que mantiene los 44px de área táctil.
  - L326–L344: TABLAS; comentario que aclara que las celdas no se estilan acá.
  - L345–L350: `.table-container`.
  - L352–L355: `table`.
  - L357–L365: `caption`.
  - L367–L378: FORMULARIOS; comentario de por qué 16px y 44px.
  - L379–L387: `.form-container`.
  - L389–L391: `.form-group`.
  - L393–L407: `.form-group label`.
  - L409–L439: `.form-group input, select, textarea` (área táctil, borde fuerte, transición de borde).
  - L441–L449: `textarea.form-group, .form-group textarea` (doble alto, resize vertical).
  - L451–L459: placeholders.
  - L461–L473: estado de error `[aria-invalid='true']`.
  - L475–L487: foco visible de campos.
  - L489–L494: `[aria-invalid='true']:focus-visible`.
  - L496–L512: comentario y `.campo-error`.
  - L514–L521: `.form-hint`.
  - L523–L557: comentario de `.sr-only` y la regla de clipping.
  - L559–L571: ACCESIBILIDAD; comentario y `:focus-visible` global.
  - L573–L578: `a`.
  - L580–L584: `a:hover`.
  - L586–L637: MOVIMIENTO REDUCIDO; comentario y `@media (prefers-reduced-motion: reduce)` con anulación de animaciones, spinner, y hover del botón primario.
  - L639–L650: ALERTAS; `.alert` base.
  - L652–L657: `.alert-success`.
  - L659–L664: `.alert-error`.
  - L666–L671: `.alert-info`.
  - L673–L685: comentario y `.alert-offline`.
  - L687–L713: RESPONSIVE; comentario del breakpoint único de 768px.
  - L714–L730: `@media (min-width: 768px)` que ajusta `.container`, `.form-container` y `.main-content`.
  - L732–L772: comentario y `.bottom-nav` (barra fija inferior).
  - L774–L787: `@media (min-width: 768px)` que oculta `.bottom-nav`.
  - L789–L826: `.bottom-nav__item`.
  - L828–L833: `.bottom-nav__item--activo`.
  - L835–L851: `.bottom-nav__item--activo::before` (barra de estado).
  - L853–L859: `.bottom-nav__icono`.
  - L861–L866: `.bottom-nav__item:focus-visible`.
  - L868–L888: ÁREA DE TOQUE; comentario y `.area-toque`.
  - L889–L922: PÍLDORA DE ROL; comentario y `.rol-pildora`.
  - L923: línea final en blanco.
- **Se conecta con:** `tokens.css` (variables), `main.jsx` y `App.jsx` (que lo importan), y los CSS de módulos que heredan sus reglas.

## `src/tokens.css` (436 líneas)
- **Rol:** Fuente única de verdad de los valores de diseño: colores, degradado de marca, grises, semánticos, estados de turno, medidas táctiles, tipografía, espaciado, radios, sombras, transiciones, z-index y zona segura.
- **Recorrido por bloques:**
  - L1–L48: encabezado: por qué existen los tokens, cómo se usan y el orden en `main.jsx`.
  - L50–L64: apertura de `:root` y comentario de COLORES DE MARCA.
  - L66–L80: `--primario`, `--primario-fuerte`, `--primario-suave`, `--secundario` con sus comentarios.
  - L82–L98: comentario del GRADIENTE DE MARCA y `--degradado-marca`.
  - L100–L116: comentario de GRISES Y TEXTO con la tabla de contrastes.
  - L118–L145: `--texto`, `--texto-medio`, `--texto-suave`, `--texto-tenue`, `--texto-deshabilitado`.
  - L147–L163: `--borde` y su comentario largo.
  - L165–L174: `--borde-fuerte`.
  - L176–L186: `--borde-tenue`, `--superficie`, `--fondo`, `--fondo-tenue`.
  - L188–L202: comentario de COLORES SEMÁNTICOS (variantes `-fondo` y `-solido`).
  - L204–L237: `--exito`, `--error`, `--aviso`, `--info`, `--confirmado`, `--cancelado` con sus lavados y textos.
  - L239–L245: comentario de ESTADOS DE TURNO.
  - L247–L273: pares `-fg`/`-bg` de `libre`, `confirmado`, `cancelado`, `pendiente`, `atendido`, `horario`, `neutro`.
  - L275–L296: comentario de MEDIDAS TÁCTILES y `--toque-minimo`, `--toque-minimo-sm`, `--toque-fila`.
  - L298–L341: comentario de TIPOGRAFÍA y `--fuente`, `--texto-xs/sm/base/md/lg/xl`, pesos, `--linea`.
  - L343–L358: comentario de ESPACIADO (escala de 4px) y `--esp-1` a `--esp-12`.
  - L360–L375: RADIOS Y SOMBRAS.
  - L377–L402: TRANSICIONES (`--transicion`), comentario de CAPAS y los `--z-*`; cierre de `:root`.
  - L404–L422: comentario de ZONA SEGURA con notch.
  - L423–L436: segundo `:root` con `--safe-*`, `--nav-height`, `--nav-height-movil` y `--bottom-nav-height`.
- **Se conecta con:** `App.css` (lo importa), todos los CSS de módulos que usan `var(--*)` y `main.jsx` por cadena de import.

## `src/api/client.js` (202 líneas)
- **Rol:** Instancia Axios central con URL base configurable, interceptor de petición (token + correlation id) e interceptor de respuesta (401, sin conexión, logging).
- **Recorrido línea por línea:**
  - L1–L2: import de `axios` y comentario.
  - L3–L5: import de `actual as correlationId`.
  - L6–L10: import de `* as logger` con el comentario del porqué.
  - L11–L36: comentario que explica por qué la URL base cambia entre desarrollo y producción.
  - L37–L39: constante `API_URL` desde `VITE_API_URL` o el fallback por entorno.
  - L40–L57: `axios.create({ baseURL, timeout: 15000, headers: Content-Type y X-Correlation-Id })`.
  - L58–L66: constantes `EVENTO_SIN_CONEXION` y `EVENTO_CON_CONEXION` con sus comentarios.
  - L67–L82: `avisarSinConexion()` y `avisarConConexion()` que despachan `CustomEvent` si hay `window`.
  - L83–L118: interceptor de request: lee token de `localStorage`, inyecta `Authorization: Bearer`, reescribe `X-Correlation-Id`; rama de error que loguea y rechaza.
  - L119–L199: interceptor de response: en éxito `avisarConConexion()`; en error loguea, distingue 401 con sesión (`habiaSesion`) para limpiar `token`/`usuario` y redirigir a `/login`, o sin sesión para dejar propagar; si no hay `error.response` avisa sin conexión y rechaza.
  - L200–L202: `export default client` con su comentario.
- **Se conecta con:** `utils/correlationId.js`, `utils/logger.js`, `AvisoOffline.jsx` (escucha los eventos) y todos los módulos de `api` (`realtime.js`, `turnera.js`) y `AuthContext.jsx`.

## `src/api/realtime.js` (317 líneas)
- **Rol:** Wrapper de Server-Sent Events: arma la URL del canal, administra la suscripción con estados, reintentos con espera creciente y limpieza.
- **Recorrido línea por línea:**
  - L1–L15: import de `client` y constante `API_URL` leída de `client.defaults.baseURL`, con el comentario de por qué no se duplica la regla.
  - L17–L27: comentario de TIPOS DE EVENTO como contrato backend/frontend.
  - L28–L33: objeto `TIPOS_EVENTO` (`cita_creada`, `cita_estado`, `cita_cancelada`, `cita_eliminada`).
  - L34–L42: comentario del porqué objeto y `LISTA_TIPOS = Object.values(TIPOS_EVENTO)`.
  - L44–L54: comentario de CONSTRUCCIÓN DE LA URL y jsdoc de `urlDelCanal`.
  - L55–L66: `urlDelCanal(canal, token)` con `URLSearchParams`.
  - L67–L83: jsdoc y `tokenActual()` que encapsula el acceso a `localStorage`.
  - L85–L112: comentario de SUSCRIPCIÓN y jsdoc de `suscribirseAlCanal`.
  - L113–L126: inicio de `suscribirseAlCanal`, lectura del token y salida temprana con stub si no hay sesión.
  - L127–L136: aviso `'conectando'` y variables de estado (`source`, `cerrada`, `intentos`, `temporizador`, `ultimoId`).
  - L137–L148: comentario de los handlers y `alAbrir` que resetea `intentos` y avisa `'conectado'`.
  - L150–L174: `alMensaje`: guarda `lastEventId`, parsea el JSON con `try/catch` (fallback con error) y llama a `alRecibir`.
  - L176–L213: `alErrorDeRed`: cierra el source, avisa `'reconectando'` y agenda reintento con espera exponencial topada a 30 s.
  - L215–L223: jsdoc de `abrir`.
  - L224–L239: `abrir()`: crea `EventSource`, registra eventos de control y `LISTA_TIPOS`, y asigna `onopen`/`onerror`.
  - L240–L243: llamada inicial a `abrir()`.
  - L245–L278: jsdoc y `cerrar()`: marca `cerrada`, cancela temporizador, quita listeners, suelta handlers y avisa `'cerrado'`.
  - L280–L297: jsdoc y `reconectar()` que cierra y reabre de inmediato.
  - L298–L302: `return { cerrar, reconectar, ultimoId }`.
  - L304–L317: jsdoc y `estadoDelModulo()` que hace un GET normal por Axios y desenvuelve `r.data.data`.
- **Se conecta con:** `api/client.js` (URL base y GET de diagnóstico), `hooks/useEventosRealtime.js` (consumidor principal) y `TIPOS_EVENTO` consumido en componentes de turnera/dashboard.

## `src/api/turnera.js` (493 líneas)
- **Rol:** Aísla todas las llamadas HTTP de la turnera y normaliza la forma de las respuestas para que los componentes nunca toquen `.data.data`.
- **Recorrido línea por línea:**
  - L1–L32: encabezado: por qué un archivo aparte y las dos formas reales de respuesta.
  - L33–L37: import de `client` con el comentario de lo que se hereda.
  - L39–L41: sección UTILIDADES INTERNAS.
  - L43–L69: jsdoc y `desenvolver(response)`: toma `response.data.data` y devuelve `data.items` si es paginado.
  - L71–L99: jsdoc y `mensajeDeError(error, porDefecto)` que recorre `mensaje`, `error`, `errores[0].mensaje`, `error.message`.
  - L101–L104: sección CATÁLOGOS PÚBLICOS.
  - L106–L116: jsdoc y `listarEspecialidades()`.
  - L118–L156: jsdoc y `listarMedicos(filtros)`: arma `params` (especialidad, q, activo, por_pagina) y hace GET `/api/medicos`.
  - L158–L186: jsdoc (diferencia con `consultarDisponibilidad`) y `listarDisponibilidades(idMedico)`.
  - L188–L214: jsdoc y `consultarDisponibilidad(idMedico, fecha)`.
  - L216–L218: sección ACCIONES DEL USUARIO AUTENTICADO.
  - L220–L268: jsdoc de la regla de `id_paciente` y `reservarTurno({...})` que arma `cuerpo`, agrega `id_paciente` si corresponde y hace POST `/api/citas`.
  - L270–L284: jsdoc y `listarPacientes()` con `por_pagina: 100`.
  - L286–L321: jsdoc y `listarTurnos(filtros)` que arma `params` (estado, desde, hasta, mias, por_pagina).
  - L323–L336: jsdoc y `cancelarTurno(idCita)` (POST a `/cancelar`).
  - L338–L349: jsdoc y `cambiarEstadoTurno(idCita, estado)` (PATCH a `/estado`).
  - L351–L369: jsdoc y `confirmarTurno(idCita)` que envuelve `cambiarEstadoTurno(..., 'confirmada')`.
  - L371–L424: jsdoc extenso y `listarMisTurnos()` que hace GET con `mias: 1`, desenvuelve y devuelve `{ turnos, vacios }`; la nota explica por qué NO captura el error.
  - L426–L428: sección FICHA DEL USUARIO.
  - L430–L446: jsdoc y `vincularFicha(tipo, documento)` (POST `/api/auth/vincular`).
  - L448–L455: jsdoc y `listarNotificaciones()`.
  - L457–L470: jsdoc y `generarRecordatorios()` (POST idempotente).
  - L472–L474: sección MÉTRICAS DE GESTIÓN.
  - L476–L493: jsdoc con la forma de la respuesta y `obtenerEstadisticas()`.
- **Se conecta con:** `api/client.js`, `hooks/usePolling.js` (`listarMisTurnos`), componentes de turnera (`CatalogoTurnera`, `AgendaMedico`, `ReservarTurno`, `MisTurnos`) y `Dashboard`/`Lista*` para los listados.

## `src/context/AuthContext.jsx` (232 líneas)
- **Rol:** Provider de sesión: estado de usuario/token/carga/error y los métodos `registro`, `login`, `logout`, `cambiarContrasena`, `recargarSesion`.
- **Recorrido línea por línea:**
  - L1–L4: imports de `React`, `createContext`, `useState`, `useEffect` y de `client`.
  - L5–L7: `export const AuthContext = createContext()`.
  - L8–L18: inicio de `AuthProvider` y los cuatro `useState` (`usuario`, `token` desde localStorage, `cargando`, `error`).
  - L19–L33: `useEffect` de montaje: si hay `token` llama a `verificarSesion()`, si no pone `cargando` en false.
  - L34–L56: `verificarSesion()`: GET `/api/auth/me`, setea usuario, y en error limpia `token`; `finally` pone `cargando` false.
  - L57–L84: jsdoc y `recargarSesion()` que vuelve a consultar `/api/auth/me` sin limpiar sesión en fallo.
  - L85–L114: `registro(email, password, nombre, tipoUsuario)`: limpia error, POST `/api/auth/registro`, devuelve el usuario o setea mensaje y relanza.
  - L115–L151: `login(email, password)`: limpia error, POST `/api/auth/login`, desestructura `{ token, ...usuarioData }`, persiste en localStorage y actualiza estado.
  - L152–L176: `logout()`: POST `/api/auth/logout` y en `finally` limpia localStorage y estado.
  - L177–L200: `cambiarContrasena(passwordActual, passwordNueva)`: POST y manejo de error.
  - L201–L225: objeto `value` con estado, `autenticado: !!token` y todos los métodos.
  - L226–L232: `return` del `<AuthContext.Provider value={value}>` envolviendo `children`.
- **Se conecta con:** `api/client.js`, `hooks/useAuth.js`, `App.jsx` (monta el provider y consume `AuthContext` en los guards), `Login.jsx`, `Register.jsx`, `Navbar` y `Configuracion`.

## `src/hooks/useAuth.js` (19 líneas)
- **Rol:** Hook de conveniencia que consume `AuthContext` y valida que exista el provider.
- **Recorrido línea por línea:**
  - L1–L4: imports de `useContext` y de `AuthContext` con sus comentarios.
  - L5–L19: `export const useAuth`: llama a `useContext(AuthContext)`, lanza error si no hay contexto y devuelve el objeto completo.
- **Se conecta con:** `context/AuthContext.jsx` (fuente del contexto) y cualquier componente que prefiera `useAuth()` antes que `useContext(AuthContext)`.

## `src/hooks/useEventosRealtime.js` (166 líneas)
- **Rol:** Hook que administra el ciclo de vida de la suscripción SSE: abre al montar, cierra al desmontar y expone estado, último evento y reconexión.
- **Recorrido línea por línea:**
  - L1–L9: imports de hooks de React y de `suscribirseAlCanal`, `TIPOS_EVENTO`.
  - L10–L30: jsdoc que explica por qué el hook y no `EventSource` directo.
  - L31–L36: firma `useEventosRealtime(canal, alRecibir, activo = true)` y `useState('inactivo')`.
  - L37–L41: comentario y `useState(null)` para `ultimoEvento`.
  - L42–L61: comentario y `refCallback` que evita re-suscribir por callbacks inestables.
  - L62–L65: `useEffect` que actualiza `refCallback.current`.
  - L66–L77: comentario, `refCanal` y su `useEffect`.
  - L78–L79: `refControl`.
  - L80–L89: `manejarEvento` con `useCallback` que delega y guarda `{ tipo, datos, momento }`.
  - L90–L98: `manejarEstado` con `useCallback` que envuelve `setEstado`.
  - L99–L116: comentario de la suscripción y `useEffect` que, si `!activo || !canal`, pone `'inactivo'` y retorna; si no, llama a `suscribirseAlCanal`.
  - L117–L126: comentario y `refControl.current = control`.
  - L127–L143: comentario de limpieza y `return` de cleanup que cierra el canal y suelta la referencia; dependencias `[canal, activo, manejarEvento, manejarEstado]`.
  - L144–L155: comentario de reconexión manual y `reconectar` con `useCallback`.
  - L156–L166: `return { estado, ultimoEvento, reconectar, TIPOS_EVENTO }`.
- **Se conecta con:** `api/realtime.js` (fuente de la suscripción) y los componentes que muestran estado "En vivo" (por ejemplo `Dashboard`, `MisTurnos`, `AgendaMedico`).

## `src/hooks/usePolling.js` (444 líneas)
- **Rol:** Hook de actualización periódica con espera adaptativa (backoff), pausa por pestaña oculta, descarte de respuestas obsoletas por generación, más el hook auxiliar `useSegundosDesde`.
- **Recorrido línea por línea:**
  - L1–L44: encabezado con las razones de polling vs SSE, backoff y el uso de `clave`.
  - L45–L51: imports de `useEffect`, `useRef`, `useState`, `useCallback`.
  - L52–L59: constantes `ESPERA_MINIMA` (5000) y `ESPERA_MAXIMA` (60000).
  - L60–L83: jsdoc de `usePolling` con parámetros y forma del retorno.
  - L84–L86: firma y desestructuración `{ activo = true, clave = '' }`.
  - L87–L98: estados `datos`, `cargando`, `refreshing`, `error`, `ultimaActualizacion`.
  - L99–L107: `tareaRef` y su actualización por render.
  - L108–L124: `esperaRef`, `datosRef`, `hayCambioRef`, `primeraCargaRef`.
  - L125–L143: comentario y `generacionRef` con el bloque que explica el descarte de respuestas obsoletas.
  - L144–L211: `ejecutar` con `useCallback`: verifica `vigente()`, compara `JSON.stringify`, actualiza refs/estado, maneja primera carga y traduce errores.
  - L212–L225: `recargar` con `useCallback` que resetea la espera y dispara `ejecutar`.
  - L226–L249: `useEffect` de reinicio al cambiar `[clave, activo]` que limpia datos y refs.
  - L250–L262: comentario del ciclo de polling y por qué la visibilidad se maneja dentro del mismo efecto.
  - L263–L396: efecto principal: sale si `!activo`, abre generación nueva, define `cancelarTemporizador`, `programar` (con backoff y cortes de generación/pausa), `alCambiarVisibilidad`, registra el listener, ejecuta la primera consulta y agenda el ciclo; retorna el cleanup.
  - L397–L402: comentario de dependencias y `return { datos, cargando, error, refreshing, ultimaActualizacion, recargar }`.
  - L403–L417: sección HOOK AUXILIAR y jsdoc de `useSegundosDesde`.
  - L418–L436: `useSegundosDesde(desde)`: estado forzador, efecto con `setInterval` de 1 s, cleanup.
  - L437–L444: retorno `0` si no hay fecha y `Math.max(0, ...)` con la división por 1000.
- **Se conecta con:** `api/turnera.js` (`listarMisTurnos` y listados), componentes de turnera/dashboard y `api` en general; `useSegundosDesde` alimenta el texto "actualizado hace N s".

## `src/utils/correlationId.js` (193 líneas)
- **Rol:** Genera, valida y persiste el identificador `X-Correlation-Id` compartido entre navegador y backend.
- **Recorrido línea por línea:**
  - L1–L30: encabezado: problema que resuelve, por qué archivo propio y formato `cid_`+16 hex.
  - L31–L38: `PREFIJO = 'cid'` y `BYTES = 8` con sus comentarios.
  - L39–L46: comentario y `CARACTERES_ADMITIDOS = /^[A-Za-z0-9_-]{1,64}$/`.
  - L47–L55: `CLAVE_ALMACEN` e `idActual = null` con comentarios.
  - L56–L67: jsdoc y `esValido(id)`.
  - L68–L95: jsdoc y `generar()`: usa `crypto.getRandomValues` o el fallback `Math.random`, pasa a hex y arma `${PREFIJO}_${hex}`.
  - L96–L111: jsdoc y `actual()` que inicializa si hace falta.
  - L112–L135: jsdoc y `leerGuardado()` con `try/catch`.
  - L136–L152: jsdoc y `guardar(id)` con `try/catch`.
  - L153–L173: jsdoc y `inicializar()` que adopta lo guardado si es válido o genera.
  - L174–L193: jsdoc y `olvidar()` que limpia memoria y almacenamiento.
- **Se conecta con:** `api/client.js` (encabezado `X-Correlation-Id` y reescritura), `utils/logger.js` (`correlationId()`) y `correlationId.test.js`.

## `src/utils/correlationId.test.js` (184 líneas)
- **Rol:** Pruebas del identificador de correlación con el runner de Node.
- **Recorrido línea por línea:**
  - L1–L10: encabezado con los casos cubiertos.
  - L11–L21: imports de `node:test`, `node:assert/strict` y las funciones del módulo.
  - L22–L33: comentario y `simularAlmacen()` que monta un `localStorage` en memoria.
  - L34–L43: `test.beforeEach` (olvida y simula almacén) y `test.afterEach` (olvida y borra el almacén).
  - L44–L51: prueba del formato del identificador generado.
  - L52–L58: prueba de que los identificadores generados son distintos.
  - L59–L66: prueba de `inicializar` sin nada guardado.
  - L67–L83: comentario y prueba de reutilización entre recargas con `import` re-evaluado.
  - L84–L90: prueba de que inicializar dos veces no cambia el id.
  - L91–L100: prueba de que `olvidar` borra el guardado.
  - L101–L111: prueba de ids con guiones y guiones bajos.
  - L112–L120: prueba de rechazo de saltos de línea.
  - L121–L126: prueba de rechazo de espacios.
  - L127–L132: prueba de rechazo de etiquetas.
  - L133–L141: prueba de rechazo de valores que no son texto.
  - L142–L147: prueba del límite de longitud (65 rechazado, 64 aceptado).
  - L148–L156: prueba de que un valor guardado corrupto se reemplaza.
  - L157–L166: prueba de funcionamiento sin almacenamiento.
  - L167–L184: prueba de que un almacenamiento que lanza excepción no rompe la inicialización ni `olvidar`.
- **Se conecta con:** `utils/correlationId.js` y el runner `node --test` del proyecto.

## `src/utils/crudHelpers.js` (118 líneas)
- **Rol:** Helpers comunes de CRUD: traducción de errores, extracción de datos, formateo de fechas y presentación de estados.
- **Recorrido línea por línea:**
  - L1–L6: encabezado del módulo.
  - L7–L38: `handleApiError(error)`: distingue `error.response` (mensaje, detalle de `errores`, `message`/`error`/`statusText`), `error.request` ("Sin conexión al servidor") y el caso restante (`error.message`).
  - L39–L42: `getDatos(response, porDefecto)` con acceso seguro a `.data.data`.
  - L43–L57: `formatDate(dateString)` con `toLocaleDateString('es-ES', ...)`.
  - L58–L76: `formatDateTime(dateString)` con `toLocaleString('es-ES', ...)`.
  - L77–L97: `getStatusColor(status)`: mapa de estados a colores HEX con fallback `#999`.
  - L98–L118: `getStatusBadge(status)`: mapa de estados a etiquetas con fallback al estado crudo.
- **Se conecta con:** componentes de Médicos, Pacientes y Prescripciones (bloques `catch` de los CRUD) y sus listados/ABM.

## `src/utils/logger.js` (377 líneas)
- **Rol:** Logger estructurado: escribe líneas JSON con nivel, correlación y contexto redactado, con destino configurable.
- **Recorrido línea por línea:**
  - L1–L29: encabezado: problema que resuelve, la regla "nada de secretos" y el destino por parámetro.
  - L30–L34: import de `actual as idActual` desde `correlationId.js`.
  - L35–L47: comentario de niveles y objeto `PESOS`.
  - L48–L51: `NIVELES = Object.keys(PESOS)`.
  - L52–L59: `ETIQUETA` con `DEBUG`/`INFO`/`WARN`/`ERROR`.
  - L60–L84: comentario de redacción y lista `CLAVES_REDACTADAS`.
  - L85–L99: comentario y lista `CLAVES_PARCIALES`.
  - L100–L115: `ETIQUETA_OCULTA`, `CARACTERES_VISIBLES`, `LARGO_MINIMO_ENMASCARABLE`, `LARGO_MAXIMO`.
  - L116–L125: jsdoc y `esClaveOculta`.
  - L126–L135: jsdoc y `esClaveParcial`.
  - L136–L153: jsdoc y `enmascarar(texto)`.
  - L154–L168: jsdoc y `truncar(texto)`.
  - L169–L223: jsdoc y `limpiar(valor, clave)`: strings (oculto/parcial/truncado), primitivos, `Error`, arrays y objetos anidados.
  - L224–L233: comentario de estado, `nivelMinimo = 'info'` y `destino = lineaPorDefecto`.
  - L234–L256: jsdoc y `lineaPorDefecto(etiqueta, linea)` que elige `console.error/warn/debug/info`.
  - L257–L272: jsdoc y `configurar({ nivel, destino })`.
  - L273–L286: jsdoc y `nivelActual()`, jsdoc y `correlationId()`.
  - L287–L301: jsdoc y `corresponde(nivel)` que compara pesos.
  - L302–L339: jsdoc y `registro(nivel, mensaje, contexto)`: filtra por nivel, arma el objeto `{ ts, nivel, correlation_id, mensaje, contexto }` y escribe con `try/catch`.
  - L340–L359: wrappers `debug`, `info`, `warn`, `error`.
  - L360–L371: jsdoc y `restablecer()`.
  - L372–L377: comentario y `export const limpiarContexto = limpiar`.
- **Se conecta con:** `utils/correlationId.js`, `api/client.js` (interceptores) y `logger.test.js`.

## `src/utils/logger.test.js` (313 líneas)
- **Rol:** Pruebas del logger con el runner de Node, con foco en la redacción de secretos.
- **Recorrido línea por línea:**
  - L1–L19: encabezado con los casos cubiertos.
  - L20–L36: imports de `node:test`, `node:assert/strict`, funciones de `logger.js` y de `correlationId.js`.
  - L37–L59: jsdoc y `capturar()` que inyecta un destino propio y devuelve `lineas` y `restaurar`.
  - L60–L71: `test.beforeEach` y `test.afterEach` (olvidar y restablecer).
  - L72–L92: prueba de que la línea es JSON con los campos obligatorios.
  - L93–L107: prueba de que dos eventos comparten `correlation_id`.
  - L108–L120: prueba de que un nivel por debajo del mínimo no se escribe.
  - L121–L136: prueba de filtrado por nivel `warn`.
  - L137–L147: prueba de que un nivel desconocido no se escribe.
  - L148–L156: prueba de configuración y consulta del nivel mínimo.
  - L157–L164: prueba de que un nivel mal configurado conserva el anterior.
  - L165–L179: prueba de redacción de contraseña.
  - L180–L200: prueba de redacción de tokens (`token`, `jwt`, `refresh_token`, `authorization`).
  - L201–L230: prueba de redacción de secretos anidados (`config.headers.Authorization`).
  - L231–L244: prueba de enmascarado parcial de datos personales.
  - L245–L255: prueba de que un dato personal corto se redacta completo.
  - L256–L269: prueba de truncado con aviso.
  - L270–L284: prueba de limpieza de arrays elemento por elemento.
  - L285–L291: prueba de que un `Error` se reduce a su mensaje.
  - L292–L305: prueba de que un destino que lanza no rompe la aplicación.
  - L306–L313: prueba de que el logger expone el identificador vigente.
- **Se conecta con:** `utils/logger.js`, `utils/correlationId.js` y el runner `node --test` del proyecto.

---

## Resumen
- **Ruta creada:** `C:\xampp\htdocs\Workspace_SaludWEB\SaludWEB_Web\GUIA_CODIGO\02_nucleo_api.md`
- **Archivos documentados:** 16 de 16 (todos los de la lista).
- **Quedaron afuera:** ninguno. Todos los archivos pedidos existen, se leyeron completos y se cubrieron línea por línea sin huecos.
