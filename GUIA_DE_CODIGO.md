# Guía de código — SaludWEB Web

Esta guía recorre, archivo por archivo, el código de la SPA de SaludWEB que
vive en `SaludWEB_Web`. La idea es que puedas abrir cualquier archivo y saber
para qué está, con qué se conecta y por dónde empezar a leerlo.

## Cómo usar esta guía

- La convención de líneas es `Lxx` o `Lxx-Lyy`: es el **número de línea dentro
  de ese archivo**, no del proyecto. Los rangos son orientativos para que
  ubiques el bloque; si el archivo cambió, el número puede haberse corrido.
- Cada archivo tiene un encabezado con `Rol`, `Props / estado principal`,
  `Se conecta con`, y `Notas`; los archivos grandes suman `Recorrido por
  bloques`.
- Los números de línea se obtuvieron contando las líneas reales de cada
  archivo (`(Get-Content archivo).Count`), no con la estimación de líneas no
  vacías, que da de menos.
- Si es la primera vez que ves el proyecto, andá directo a "Orden de lectura
  recomendado" al final.

## Arquitectura y flujo

SaludWEB Web es una SPA de React 18 + Vite que consume una API REST en
`http://127.0.0.1:8000`. La separación es estricta:

1. **Entrada** (`index.html` → `src/main.jsx`): monta React en `#root` e
   importa `App.css` (y con él los tokens).
2. **Raíz** (`src/App.jsx`): define el router y el orden de capas
   `BrowserRouter → AuthProvider → AppContent`. No tiene lógica de negocio.
3. **Sesión** (`src/context/AuthContext.jsx`): guarda usuario y token, verifica
   la sesión contra `/api/auth/me`, expone `autenticado`, `cargando`, `usuario`.
4. **Datos** (`src/api/*`): `client.js` (Axios + interceptores), `turnera.js`
   (todas las llamadas REST del dominio), `realtime.js` (canal SSE).
5. **Pantallas** (`src/components/*`): cada módulo con sus formularios, listas
   y estilos.
6. **Tiempo real**: en desarrollo, Axios usa baseURL vacía para pasar por el
   proxy `/api` de Vite y evitar CORS; en producción usa `VITE_API_URL`. El
   canal de eventos es Server-Sent Events (`EventSource`), no WebSocket.

Regla transversal: el **frontend nunca es la defensa**. Oculta pantallas y
deshabilita acciones, pero el control de acceso real (rol, alcance de los
datos) lo aplica el backend. Por eso hay un 403 manejado como caso real y no
como sorpresa.

## Mapa general (árbol)

```
SaludWEB_Web/
├─ index.html                 # HTML de entrada; monta React en #root
├─ package.json               # deps, scripts (dev/build/preview/test)
├─ vite.config.js             # base dev/build, proxy /api, host 127.0.0.1
├─ proponer_contraste.php     # calcula el ajuste de color WCAG AA
├─ ver_contraste.php          # audita los ratios de tokens.css
├─ verificar_variables.php    # detecta var(--x) sin definir
├─ verificar_pwa.mjs          # E2E de la PWA (Playwright)
├─ verificar_tiempo_real.mjs  # prueba de los dos navegadores (Playwright)
├─ public/
│  ├─ .htaccess               # fallback SPA + cache + compresión (Apache)
│  └─ sw.js                   # service worker (caparazón offline)
└─ src/
   ├─ main.jsx                # punto de entrada; registra el SW en prod
   ├─ App.jsx                 # router + contexto + tabla de rutas
   ├─ App.css                 # estilos globales (reset, botones, forms...)
   ├─ tokens.css              # tokens de diseño (color, espaciado, tipografía)
   ├─ api/
   │  ├─ client.js            # instancia de Axios + interceptores
   │  ├─ realtime.js          # canal SSE
   │  └─ turnera.js           # funciones REST del dominio
   ├─ context/
   │  └─ AuthContext.jsx      # provider de sesión
   ├─ hooks/
   │  ├─ useAuth.js           # acceso al contexto de sesión
   │  ├─ useEventosRealtime.js# suscripción al canal SSE
   │  └─ usePolling.js        # polling adaptativo + useSegundosDesde
   ├─ utils/
   │  ├─ correlationId.js     # id de correlación (X-Correlation-Id)
   │  ├─ logger.js            # log estructurado con redacción de secretos
   │  ├─ crudHelpers.js       # helpers CRUD (errores, datos, badges, fechas)
   │  ├─ correlationId.test.js
   │  └─ logger.test.js
   └─ components/
      ├─ Navbar.jsx/.css
      ├─ Auth/               # Login, Register, Auth.css
      ├─ common/             # AvisoOffline, ConfirmarModal, Paginacion, Toast
      ├─ Configuracion/      # Configuracion.jsx
      ├─ Dashboard/          # Dashboard.jsx/.css
      ├─ Medicos/            # FormularioMedico, ListaMedicos, Medicos.css
      ├─ Pacientes/          # FormularioPaciente, ListaPacientes, Pacientes.css
      ├─ Prescripciones/     # FormularioPrescripcion, ChangeStateForm,
      │                      #   ListaPrescripciones, Prescripciones.css
      ├─ Turnera/            # CatalogoTurnera, AgendaMedico, ReservarTurno,
      │                      #   MisTurnos, PiezasTurnera, Turnera.css
      └─ Usuarios/           # Usuarios.jsx, MenuAcciones.jsx, Usuarios.css
```

## Archivo por archivo

### Raíz del proyecto

#### `index.html`

**Rol:** documento HTML de entrada. Contiene el `<div id="root">` donde React
monta toda la app y los metadatos de la PWA.

**Recorrido por bloques:**
- L1-L27: `<head>` con `lang="es"`, `charset`, `theme-color` (`#4a5cba`),
  favicon (`/vite.svg`), `manifest`, `apple-touch-icon`, metas de
  `mobile-web-app-capable`, `viewport` y `<title>`.
- L28-L35: `<body>` con `#root` y el `<script type="module" src="/src/main.jsx">`.

**Notas:** cada línea está comentada a propósito, pensando en la lectura del
código como material de cátedra. El `manifest` y el `apple-touch-icon` usan
rutas relativas (`./`) para que la app funcione servida desde un subdirectorio.

#### `package.json`

**Rol:** manifiesto del proyecto. Define deps, scripts y el tipo de módulo.

**Notas:**
- `"type": "module"` para poder usar `import`/`export`.
- Scripts: `dev` (vite), `build`, `preview`, `test` y `test:watch` (corren los
  dos tests con `node --test`).
- Dependencias: `axios ^1.5.0`, `react ^18.2.0`, `react-dom ^18.2.0`,
  `react-router-dom ^6.15.0`.
- DevDependencies: `@vitejs/plugin-react ^4.1.0`, `playwright ^1.63.0`,
  `vite ^4.5.0`.
- No hay eslint ni prettier declarados como dependencia; el `eslint-disable`
  que aparece en algún componente es para herramientas del editor.

#### `vite.config.js`

**Rol:** configuración de Vite. Resuelve dos cosas que no tienen un valor
único: el `base` y el destino del proxy.

**Recorrido por bloques:**
- L1-L5: imports (`defineConfig`, `loadEnv`, plugin de React).
- L14-L33: `defineConfig(({ command, mode }) => ...)`; `loadEnv(mode, cwd,
  'VITE_')` y cálculo de `proxyTarget` (`VITE_PROXY_TARGET` o
  `http://127.0.0.1:8000`).
- L35-L77: objeto de config: `base` según `command`, plugin React, `server`
  con `port 5173`, `host: '127.0.0.1'` y proxy `/api`.

**Notas:** `base: './'` en build permite abrir la SPA desde un subdirectorio,
pero en el dev server rompe las rutas; por eso depende de `command`. El `host`
IPv4 explícito evita el problema de Windows, donde `localhost` puede resolver
primero a `::1` y dar "conexión rechazada".

#### `public/.htaccess`

**Rol:** configuración de Apache para el build servido. Hace el fallback de SPA
y ajusta cache/compresión.

**Recorrido por bloques:**
- L23: `RewriteEngine On`.
- L56: `RewriteRule ^api/ - [F,L]` — bloquea `/api` en la carpeta de la web
  (red de seguridad; devuelve 403 en lugar de servir `index.html` donde se
  espera JSON).
- L68-L76: si el archivo/directorio no existe, todo va a `index.html` para que
  el router del cliente resuelva la ruta.
- L87-L100: cache por tipo (CSS/JS/imágenes un año, por el hash del build).
- L108-L114: compresión gzip por tipo.

**Notas:** se bloquea `/api` y no se reenvía al backend a propósito: un destino
con `../` es una ruta de sistema de archivos, no una URL, y un mal manejo
podría exponer el código fuente del backend.

#### `public/sw.js`

**Rol:** service worker que da arranque offline al "caparazón" de la app.

**Recorrido por bloques:**
- L21-L24: `CACHE_COPA = "saludweb-capa-v1"` y `ARCHIVOS_INICIALES`
  (`./`, `./index.html`).
- L26-L37: `install` — precarga el caparazón y `skipWaiting()`.
- L39-L57: `activate` — borra versiones viejas de la caché y `clients.claim()`.
- L59-L132: `fetch` — solo GET; `/api` nunca se cachea; navegación
  red-primero con fallback al HTML; assets del mismo origen caché-primero con
  refresco en segundo plano.

**Notas:** el SW se registra solo en el build (`import.meta.env.PROD`, ver
`src/main.jsx`). Los datos clínicos jamás se sirven de caché: un turno viejo
sería un error clínico.

#### `proponer_contraste.php`

**Rol:** script de consola que calcula el ajuste mínimo de luminosidad de cada
color que no cumple WCAG AA, preservando el matiz (trabaja en HSL, no
restando a ciegas sobre RGB).

**Recorrido por bloques:**
- L17: `OBJETIVO = 4.5`.
- L23-L115: utilidades de color (`canalLineal`, `luminancia`, `contraste`,
  `aRgb`, `aHex`, `rgbAHsl`, `hslARgb`).
- L122-L143: `ajustarLuminosidad` — baja y, si no alcanza, sube la L en pasos
  de 0.002 hasta llegar al objetivo.
- L146-L197: tabla de `$casos` y salida con el color actual, el propuesto y los
  ratios antes/después.

**Notas:** es la herramienta con la que se corrigieron los contrastes del
proyecto (por ejemplo, el verde de `Toast` pasó a `#12883e`, 4.55:1).

#### `ver_contraste.php`

**Rol:** audita los ratios de contraste afirmados en los comentarios de
`src/tokens.css` contra el hex real del token.

**Recorrido por bloques:**
- L15-L40: utilidades de color (mismas cuentas WCAG).
- L46-L86: lee del propio comentario el ratio declarado y el token; la
  referencia no se escribe fija en el script.
- L90-L139: recalcula y reporta: ratio que no coincide, token que no existe con
  ese valor, o ratio afirmado que no llega a AA.

**Notas:** el ratio se lee del archivo justamente para que el script no
compare el archivo contra una copia de los números.

#### `verificar_variables.php`

**Rol:** linter que detecta `var(--x)` usadas en algún `.css` sin que `--x`
exista en `tokens.css`. Una variable inexistente hace que el navegador
descarte la declaración entera, sin aviso.

**Recorrido por bloques:**
- L15-L16: raíz y ruta de `tokens.css` (con `__DIR__`).
- L18-L26: variables definidas.
- L28-L75: recorre todos los `.css`, quita comentarios y busca usos de `var()`.
- L77-L117: reporta las rotas y las que solo usan valor de reserva; sale con
  código 1 si hay alguna rota.

**Notas:** las variables usadas siempre con valor de reserva se informan aparte,
porque no rompen nada.

#### `verificar_pwa.mjs`

**Rol:** verificación E2E de la PWA con Playwright/Chromium (215 líneas).
Comprueba manifest, service worker, recarga desde caché, arranque offline y
que `/api` nunca se sirva de caché.

**Recorrido por bloques:**
- L1-L26: encabezado y modo de uso.
- L28-L57: imports, `chromium`, `WEB` y utilidades (`verificar`, `evaluar`).
- L59-L208: `main()` con los pasos: 1 carga inicial y manifest/SW (L70),
  2 recarga en línea (L129), 3 offline: la app abre y `/api` falla (L141),
  4 recuperación al volver la red (L179), cierre ordenado (L195).
- L208-L215: resumen y código de salida (0 = todo bien, 1 = hay fallos).

**Notas:** sin red, `GET /api/medicos` **debe** fallar; es la única condición
que se espera que falle, y es la que demuestra que no se cachean datos clínicos.

#### `verificar_tiempo_real.mjs`

**Rol:** la "prueba de los dos navegadores" (494 líneas). Abre dos contextos
aislados de Playwright, cada uno con su sesión, reserva un turno en uno y mide
cuánto tarda en verse en el otro. Techo de latencia: 500 ms.

**Recorrido por bloques:**
- L1-L73: encabezado; explica por qué dos contextos y no dos pestañas, y la
  restricción de que la fecha debe caer dentro de la ventana del informe.
- L40-L137: imports, constantes (`WEB`, `API`, datos del turno) y búsqueda de
  una fecha/hora válida (`FECHA_FIJADA`).
- L139-L156: `CUENTAS` (paciente y admin, dos usuarios distintos).
- L158-L216: utilidades de salida.
- L217-L...: la prueba: 1 dos navegadores con sesiones independientes (L234),
  2 el navegador B abre el panel y espera "En vivo" (L246-L272),
  3 el navegador A reserva por API (L279) y se limpia al final (L313),
  4 la medición de latencia leyendo el número "Turnos registrados" (L326).
- Cierre y reporte final.

**Notas:** los dos usuarios son distintos a propósito, para que la prueba
detecte si el canal filtrara datos entre usuarios. La reserva se hace por API
(no por la interfaz) porque lo que se mide es la propagación del evento.

### Núcleo de `src`

#### `src/main.jsx`

**Rol:** punto de entrada. Registra el service worker en producción y monta
React en `#root`.

**Recorrido por bloques:**
- L1-L8: imports (`React`, `ReactDOM`, `App`, `./App.css`).
- L16-L25: registro del SW solo si `import.meta.env.PROD` y hay
  `serviceWorker`, con ruta relativa `./sw.js`.
- L28-L35: `ReactDOM.createRoot(...).render(<React.StrictMode><App/></React.StrictMode>)`.

**Notas:** en desarrollo no se registra el SW para no interferir con el hot
reload.

#### `src/App.jsx`

**Rol:** raíz de la SPA: router, contexto de sesión y tabla de rutas. Es el
mapa de la aplicación; no tiene lógica de negocio ni estado propio.

**Recorrido por bloques:**
- L1-L26: encabezado con las tres ideas clave (qué vive acá, el orden de las
  capas, por qué hay dos formas de proteger una ruta).
- L27-L45: imports.
- L47-L90: `ProtectedRoute` — guardia de sesión. Consulta `cargando` **antes**
  que `!autenticado` para no expulsar durante la verificación inicial.
- L92-L143: `AdminRoute` — `ProtectedRoute` + exigir `tipo_usuario === 'admin'`.
  Compara contra `tipo_usuario` (nombre del campo en el contexto de sesión).
- L145-L312: `AppContent` — monta `Navbar` y `AvisoOffline` fuera de `<Routes>`
  y declara la tabla de rutas (públicas, protegidas y de la turnera).
- L314-L325: `App` — `BrowserRouter → AuthProvider → AppContent`.

**Notas:** `/login` y `/register` se resuelven con ternario porque deben
expulsar a quien ya tiene sesión; el resto usa `ProtectedRoute`. Las rutas de
la turnera son irregulares a propósito: catálogo, agenda y reserva son
públicas; "mis turnos" exige sesión.

#### `src/App.css`

**Rol:** estilos globales compartidos por toda la SPA. Importa `tokens.css`.
Mobile-first, con área táctil mínima de 44px.

**Recorrido por bloques:**
- L1-L17: encabezado (cambios respecto de la versión anterior).
- L19-L29: `TOKENS` — `@import './tokens.css'`.
- L30-L69: `RESET` — `*`, `html, body, #root`, `body`.
- L70-L110: `LAYOUT PRINCIPAL` — `.app` (columna, `100dvh`),
  `.main-content` (padding para la barra inferior + zona segura).
- L111-L162: `ESTADO DE CARGA` — `.loading-container`, `.spinner`, `@keyframes spin`.
- L163-L176: `COMPONENTES COMUNES` — `.container`.
- L177-L325: `BOTONES` — `.btn`, `:focus-visible`, `:disabled`, `.btn-primary`,
  `.btn-secondary`, `.btn-danger`, `.btn-sm`.
- L326-L366: `TABLAS` — solo contenedor y tipografía; las celdas las estila
  `Medicos.css`.
- L367-L522: `FORMULARIOS` — `.form-container`, `.form-group`, inputs,
  `textarea`, placeholders, estados `[aria-invalid='true']` y foco.
- L523-L558: `TEXTO SOLO PARA LECTORES DE PANTALLA` — `.sr-only`.
- L559-L585: `ACCESIBILIDAD` — `:focus-visible` global y enlaces.
- L586-L638: `MOVIMIENTO REDUCIDO` — `@media (prefers-reduced-motion: reduce)`.
- L639-L686: `ALERTAS` — `.alert` y variantes; `.alert-offline` (persistente).
- L687-L731: `RESPONSIVE — MOBILE FIRST` — único breakpoint `min-width: 768px`.
- L732-L867: barra de navegación inferior (`.bottom-nav`), solo mobile.
- L868-L888: `ÁREA DE TOQUE` — `.area-toque`.
- L889-L923: `PÍLDORA DE ROL` — `.rol-pildora`.

**Notas:** el único lugar que estila celdas de tabla es `Medicos.css`, para no
tener dos reglas que se pisan. El breakpoint se declaró como variable de motivo
para que un `max-width` a mano quede evidente.

#### `src/tokens.css`

**Rol:** fuente única de verdad de los tokens de diseño (colores, espaciado,
tipografía, radios, sombras, alturas). Tema oscuro vía `[data-tema="oscuro"]`.

**Notas:** los comentarios declaran el ratio de contraste de cada color y son
auditados por `ver_contraste.php`. Los colores de estado de turno
(`--turno-*-fg` / `--turno-*-bg`) son el ejemplo de tokens usados con `var()`.

### `src/api`

#### `src/api/client.js`

**Rol:** instancia única de Axios con la configuración de baseURL e
interceptores (adjunta `Authorization` y limpia la sesión ante un 401). También
genera y adjunta el `X-Correlation-Id`.

**Se conecta con:** `correlationId.js` (id de correlación) y `logger.js`.
Todos los demás módulos de API lo importan a través suyo.

**Notas:** en desarrollo la baseURL es **vacía** a propósito, para que las
peticiones pasen por el proxy `/api` de Vite y no haya CORS; en producción usa
`VITE_API_URL`.

#### `src/api/realtime.js`

**Rol:** cliente del canal de Server-Sent Events.

**Recorrido por bloques:**
- L1-L16: encabezado e import de `client` (solo para leer la baseURL).
- L18-L42: `TIPOS_EVENTO` (L28) y la lista derivada (L40). Es el contrato
  espejo de `RealtimeService::tiposValidos()` y de `GET /api/eventos/estado`.
- L44-L84: `tokenActual` (L73) y armado de la URL con `URLSearchParams`.
- L86-L311: `suscribirseAlCanal` (L113) — validación de sesión, handlers
  guardados para poder quitarlos, reconexión con espera creciente (1s, 2s, 4s…
  tope 30s) y `ultimoId` como función.
- L312-L317: `estadoDelModulo` — diagnóstico por Axios (GET normal).

**Notas:** la lista de tipos está escrita en los dos lados; si el backend
agrega uno y el frontend no lo escucha, el desajuste se nota al leer el
código. `EventSource` reconecta solo, pero se toma el control para aplicar la
espera creciente.

#### `src/api/turnera.js`

**Rol:** aísla **todas** las llamadas HTTP del dominio. Normaliza las dos
formas de respuesta del backend (paginada `{items,total,…}` o simple) para que
los componentes nunca lean `.data.data`.

**Recorrido por bloques:**
- L1-L31: encabezado y explicación de las formas de respuesta.
- L32-L38: import de `client`.
- L40-L100: utilidades internas (`desenvolver`/normalización) y
  `mensajeDeError` (L83).
- L102-L215: catálogos públicos — `listarEspecialidades` (L110),
  `listarMedicos` (L127), `listarDisponibilidades` (L178),
  `consultarDisponibilidad` (L207).
- L217-L425: acciones del usuario autenticado — `reservarTurno` (L248),
  `listarPacientes` (L277), `listarTurnos` (L299), `cancelarTurno` (L333),
  `cambiarEstadoTurno` (L346), `confirmarTurno` (L367),
  `listarMisTurnos` (L394).
- L427-L471: ficha del usuario — `vincularFicha` (L440),
  `listarNotificaciones` (L452), `generarRecordatorios` (L467).
- L473-L493: `obtenerEstadisticas` (L490).

**Notas:** `listarMisTurnos` (L394) **no** captura el error a propósito: si
resolviera con un objeto que trae el error adentro, `usePolling` lo tomaría por
una respuesta exitosa y un 500 se vería igual que "cero turnos". La promesa
tiene que rechazar para que el hook distinga "falló" de "está vacío".

### `src/context`

#### `src/context/AuthContext.jsx`

**Rol:** provider de sesión. Guarda `usuario`, `token`, `cargando` y `error`;
expone login, logout y el estado `autenticado`.

**Se conecta con:** `client` (para `/api/auth/login` y `/api/auth/me`) y
`useAuth` (que lo consume).

**Notas:** el token se guarda en `localStorage`. `verificarSesion` corre al
montar contra `/api/auth/me`; de ahí sale el campo `tipo_usuario` (que los
guards de `App.jsx` leen).

### `src/hooks`

#### `src/hooks/useAuth.js`

**Rol:** acceso corto al contexto de sesión. Envuelve `useContext(AuthContext)`
y lanza un error si se usa fuera del provider (19 líneas).

**Se conecta con:** `AuthContext.jsx`.

#### `src/hooks/useEventosRealtime.js`

**Rol:** hook que abre el canal SSE y lo cierra solo al desmontar.

**Props / estado principal:** recibe `(canal, alRecibir, activo)`; devuelve
`{ estado, ultimoEvento, reconectar }`. Canales usados: `tablero`,
`mis-turnos`, `mi-agenda`.

**Se conecta con:** `suscribirseAlCanal` de `api/realtime.js`.

**Notas:** si el canal se cae, expone `reconectar` para que la pantalla ofrezca
un botón de reintento (por si la reconexión automática no alcanza).

#### `src/hooks/usePolling.js`

**Rol:** polling con espera adaptativa. Acorta la espera si la respuesta trae
algo nuevo, la duplica si es idéntica (hasta un tope) y pausa cuando la pestaña
no está visible. La clave es un string, no un array de dependencias.

**Recorrido por bloques:**
- L1-L43: encabezado; por qué polling y por qué "clave" en vez de un array.
- L44-L82: imports y constantes (`ESPERA_MINIMA` ≈ 5s, `ESPERA_MAXIMA` ≈ 60s).
- L83-L144: firma, estado visible (`datos`, `cargando`, `refreshing`, `error`)
  y refs (generación, último dato serializado, espera actual).
- L145-L209: `ejecutar` — la tarea de recarga (compara strings, no objetos).
- L213-L225: `recargar` manual (botón "Actualizar").
- L228-L...: reinicio cuando cambia la clave.
- L251-L379: efecto principal: `programar` con espera variable, listener de
  `visibilitychange` y primera consulta inmediata.
- L381-L402: limpieza (cancela temporizador, invalida el ciclo por generación)
  y `return` del hook.
- L404-L444: `useSegundosDesde` (hook auxiliar del "actualizado hace N s").

**Notas:** comparar por `JSON.stringify` y no por referencia es clave: cada
respuesta es un objeto nuevo en memoria, así que sin esto el polling
detectaría "cambios" siempre y nunca entraría en la espera larga.

### `src/utils`

#### `src/utils/correlationId.js`

**Rol:** genera y recuerda un identificador de correlación por sesión de
pestaña, que viaja en el header `X-Correlation-Id` y sale en cada línea de log.

**Recorrido por bloques:** formato `cid_` + 16 hex (8 bytes) generados con
`crypto.getRandomValues`; `esValido` (L63), `generar` (L74), `actual` (L106),
`inicializar` (L160), `olvidar` (L184).

**Se conecta con:** `client.js` (header) y `logger.js` (cada línea).

#### `src/utils/logger.js`

**Rol:** log estructurado en JSON, con redacción de datos sensibles (tokens,
contraseñas, datos clínicos) y truncado de valores largos.

**Recorrido por bloques:**
- L1-L30: encabezado e import de `correlationId`.
- L36-L59: `niveles` con peso numérico (permite comparar sin comparar
  palabras) y la lista de niveles aceptados.
- L61-L224: `redacción de datos sensibles` — claves que se borran entero,
  claves que se enmascaran parcial (deja 4 caracteres), truncado por longitud.
- L226-L262: estado del logger (nivel mínimo por `VITE_LOG_LEVEL`, destino
  inyectable; por defecto la consola).
- L264-L310: `configurar` (L264), `nivelActual` (L277), `correlationId` (L284).
- L311-L366: `registro` (L311) y `debug`/`info`/`warn`/`error` (L342-L366).
- L368-L377: `restablecer` (L368) y `limpiarContexto` (L377).

**Notas:** los secretos se redactan **en su totalidad**: un token enmascarado
sigue siendo medio token. Un error se reduce a su mensaje (el stack en consola
es ruido). Un destino que falla no puede romper la pantalla.

#### `src/utils/crudHelpers.js`

**Rol:** helpers compartidos por las pantallas CRUD.

**Notas:** exporta `handleApiError` (L8) —convierte el error de Axios en un
mensaje legible—, `getDatos` (L41) —extrae `response.data.data`—, `formatDate`
(L44), `formatDateTime` (L59), `getStatusColor` (L78) y `getStatusBadge` (L99).

#### `src/utils/correlationId.test.js` y `src/utils/logger.test.js`

**Rol:** tests unitarios (con `node --test`) del formato/validez del
correlation id y de la redacción/niveles/truncado del logger.

**Se conecta con:** se ejecutan con `npm test` (ver `package.json`).

### Componentes transversales

#### `src/components/Navbar.jsx` y `Navbar.css`

**Rol:** navegación superior. En desktop muestra los enlaces horizontales; en
mobile, la navegación principal es la barra inferior (`App.css`) y el navbar
queda con las acciones secundarias (Configuración, cerrar sesión).

**Props / estado principal:** usa `useAuth` para saber el rol y el usuario;
arma los enlaces según el rol.

**Se conecta con:** `AuthContext` (logout) y `react-router-dom` (`Link`,
`useLocation` para el estado activo).

**Notas:** los enlaces se adaptan al rol para no ofrecer pantallas que darían
403.

### `src/components/Auth`

#### `src/components/Auth/Login.jsx`

**Rol:** formulario de acceso. Envía a `/api/auth/login` a través del contexto
de sesión y navega al dashboard al entrar.

**Se conecta con:** `useAuth`, `Link` al registro.

**Notas:** es una ruta "pública" que en realidad expulsa a quien ya tiene
sesión (el ternario en `App.jsx`).

#### `src/components/Auth/Register.jsx`

**Rol:** formulario de alta de cuenta. Crea el usuario y luego inicia sesión.

**Se conecta con:** `useAuth`, `Link` al login.

#### `src/components/Auth/Auth.css`

**Rol:** estilos de las pantallas de autenticación (tarjeta centrada, fondo con
degradado de marca).

**Notas:** solo resumen; los colores salen de tokens.

### `src/components/common`

#### `src/components/common/AvisoOffline.jsx` y `AvisoOffline.css`

**Rol:** cartel global de "sin conexión". Vive fuera de `<Routes>` en
`App.jsx`, así que no se desmonta al navegar y conserva su estado.

**Se conecta con:** los eventos `online`/`offline` del navegador y los fallos
de petición.

**Notas:** es persistente a propósito: no se va solo con el tiempo.

#### `src/components/common/ConfirmarModal.jsx` y `ConfirmarModal.css`

**Rol:** modal de confirmación reutilizable, en lugar del `confirm()` nativo.

**Props / estado principal:** recibe `abierto`, `titulo`, `mensaje`,
`textoConfirmar`, `onConfirmar`, `onCancelar`. Deshabilita el botón mientras la
operación está en curso (evita el doble clic).

**Se conecta con:** las pantallas CRUD que borran (por ejemplo,
`ListaPrescripciones`).

#### `src/components/common/Paginacion.jsx` y `Paginacion.css`

**Rol:** controles de paginación reutilizables.

**Props / estado principal:** recibe `pagina`, `porPagina`, `total`,
`totalPaginas`, `onCambiarPagina`.

**Se conecta con:** las listas paginadas (`ListaPrescripciones`, `Usuarios`,
etc.).

**Notas:** los números de página se complementan con texto tipo "Ir a la
página N" para lectores de pantalla.

#### `src/components/common/Toast.jsx` y `Toast.css`

**Rol:** notificación flotante. Éxitos se ocultan solos; errores quedan hasta
que el usuario los cierre.

**Props / estado principal:** recibe `{ tipo, texto, onCerrar }`; `tipo` es
`exito` | `error` | `info`.

**Notas:** el color de éxito se ajustó a `#12883e` (4.55:1) por WCAG. La "✕" de
cierre cumple 44px de área táctil.

### `src/components/Configuracion`

#### `src/components/Configuracion/Configuracion.jsx`

**Rol:** pantalla de cuenta. Permite vincular la cuenta con la ficha clínica
(DNI para paciente, matrícula para médico) y muestra datos de la sesión.

**Recorrido por bloques:**
- L1-L27: encabezado (qué hace y qué no).
- L8-L26: imports y utilidades.
- A partir de L27: componente con el formulario de vinculación.

**Se conecta con:** `useAuth` y `vincularFicha` de `api/turnera.js`.

**Notas:** el paciente ve esta pantalla en el dashboard en lugar de las tres
tarjetas de gestión.

### `src/components/Dashboard`

#### `src/components/Dashboard/Dashboard.jsx`

**Rol:** panel de entrada tras iniciar sesión. Tiene **dos versiones** según el
rol: admin/médico ven estadísticas de gestión; el paciente ve sus próximos
turnos.

**Recorrido por bloques:**
- L1-L66: encabezado (por qué dos versiones, enlaces por rol, por qué ya no usa
  polling, la regla de "el canal avisa, los datos se piden por REST").
- L69-L97: imports (`Link`, `useAuth`, `api/turnera`, `useEventosRealtime`,
  piezas compartidas).
- L99-L155: componente, `rol`, `veEstadisticas`, marca de recarga en curso.
- L156-L253: la carga (`cargar` con `useCallback`, protección ante eventos
  simultáneos, spinner solo si no hay datos previos).
- L255-L294: el canal en vivo — se elige por rol (`tablero` o `mis-turnos`) y
  `manejarEvento` solo dispara `recargar()` (no arma el número en el cliente).
- L296-L311: carga inicial, una sola vez, cuando ya se sabe el rol.
- L313-L329: `tarjetas` armadas según `veEstadisticas`.
- L331-L519: JSX (encabezado, indicador del canal, botón de recarga, tarjetas).

**Notas:** decidir por rol **antes** de pedir evita que un paciente reciba un
403 en su propia pantalla de bienvenida. Los datos siguen viniendo por REST: la
tabla `citas` es la única fuente de verdad.

#### `src/components/Dashboard/Dashboard.css`

**Rol:** estilos del panel: encabezado, cajitas de estadísticas, indicador del
canal (verde/ámbar/rojo) y grilla de tarjetas.

### `src/components/Medicos`

#### `src/components/Medicos/FormularioMedico.jsx`

**Rol:** formulario de alta/edición de un médico.

**Props / estado principal:** recibe el médico a editar (o `null` para alta) y
`onGuardar` / `onCancelar`. Maneja los campos del formulario y el estado de
envío.

**Se conecta con:** la lista (`ListaMedicos`) y el cliente de la API.

#### `src/components/Medicos/ListaMedicos.jsx`

**Rol:** listado de médicos con búsqueda, paginación y acciones CRUD.

**Se conecta con:** `FormularioMedico`, `ConfirmarModal`, `Paginacion`,
`crudHelpers` y el cliente de la API.

#### `src/components/Medicos/Medicos.css`

**Rol:** estilos del módulo. Es el lugar **único** que estila las celdas de
tabla (`th`, `td`), incluida la media query mobile que las convierte en
tarjetas con `data-label`.

**Notas:** `Pacientes.css` y `Prescripciones.css` lo importan para heredar el
mismo comportamiento y evitar dos reglas que se pisan.

### `src/components/Pacientes`

#### `src/components/Pacientes/FormularioPaciente.jsx`

**Rol:** formulario de alta/edición de un paciente.

**Se conecta con:** `ListaPacientes` y el cliente de la API.

#### `src/components/Pacientes/ListaPacientes.jsx`

**Rol:** listado de pacientes con búsqueda, paginación y acciones CRUD.

**Se conecta con:** `FormularioPaciente`, `ConfirmarModal`, `Paginacion`,
`crudHelpers`.

#### `src/components/Pacientes/Pacientes.css`

**Rol:** 4 líneas: solo `@import '../Medicos/Medicos.css';` y aclaraciones.
Reutiliza los estilos de médicos a propósito.

### `src/components/Prescripciones`

#### `src/components/Prescripciones/FormularioPrescripcion.jsx`

**Rol:** formulario de alta/edición de una prescripción (medicamentos, dosis,
paciente, etc.).

**Props / estado principal:** recibe `prescripcion` (objeto o `null`) y
`onGuardar` / `onCancelar`.

**Se conecta con:** `ListaPrescripciones`.

#### `src/components/Prescripciones/ChangeStateForm.jsx`

**Rol:** formulario para cambiar el estado de una prescripción.

**Notas:** el estado inicial del `<select>` es el estado **actual** de la
prescripción, y el `<select>` solo conoce los estados definidos; un estado que
no esté en la lista no se puede elegir (fragilidad conocida: si el backend
agrega un estado, hay que sumarlo acá).

#### `src/components/Prescripciones/ListaPrescripciones.jsx`

**Rol:** lista de prescripciones con CRUD, cambio de estado, búsqueda
debounceada y filtro por estado. RBAC en UI: solo médico/admin recetan; solo
admin elimina.

**Recorrido por bloques:**
- L1-L21: imports (`client`, `FormularioPrescripcion`, `ChangeStateForm`,
  `useAuth`, `crudHelpers`, `Paginacion`, `ConfirmarModal`, `Toast`).
- L22-L66: componente, `esAdmin`, `esMedico`, `puedeRecetar` y estado
  (lista, carga, error, formularios, búsqueda, debounce, paginado, filtro,
  a eliminar, notificación).
- L67-L76: debounce de búsqueda (400 ms).
- L77-L83: recarga al cambiar página, tamaño, búsqueda aplicada o filtro.
- L84-L110: `cargar` (GET paginado con `q` y `estado`).
- L112-L135: handlers de "Nueva", "Editar", "Cambiar Estado", "Eliminar".
- L136-L162: `confirmarEliminar` (DELETE con prevención de doble clic).
- L164-L192: `guardar` (PUT/POST).
- L194-L215: `guardarEstado` (PATCH `/estado`).
- L218-L255: render de los formularios (prescripción y cambio de estado).
- L257-L408: render de la lista (filtros, tres estados de carga/vacío/tabla,
  paginación, modal y toast).

**Notas:** con paginado, búsqueda y filtros se resuelven en el backend; la web
recarga la página actual para que los totales sean los del backend.

#### `src/components/Prescripciones/Prescripciones.css`

**Rol:** estilos del módulo; importa `Medicos.css` y agrega lo propio
(badges de estado, por ejemplo). Solo resumen.

### `src/components/Turnera`

#### `src/components/Turnera/CatalogoTurnera.jsx`

**Rol:** pantalla pública de la turnera. Flujo especialidad → médicos → agenda.

**Recorrido por bloques:**
- L1-L21: encabezado e imports.
- L60: estado de los filtros; L69: estado de los datos.
- L75-L107: efectos de carga (especialidades y médicos).
- L146-L162: efectos derivados.
- L184: JSX con el flujo de selección.

**Se conecta con:** `listarEspecialidades` y `listarMedicos` de `api/turnera.js`
y `PiezasTurnera`.

**Notas:** son dos consultas al backend; se filtra por especialidad en el
servidor en lugar de traer todo y filtrar en el cliente.

#### `src/components/Turnera/AgendaMedico.jsx`

**Rol:** agenda de un profesional (pública, sin sesión). Es la pantalla más
compleja del módulo: calendario armado a mano, "próximos días" desde los días
de atención reales y fechas en hora local.

**Recorrido por bloques:**
- L1-L28: encabezado (las tres razones de su complejidad).
- L30-L66: imports (`useParams`, `useNavigate`, `Link`, `api/turnera`,
  `usePolling`, `PiezasTurnera`).
- L68-L83: constantes `DIAS` y versiones abreviadas.
- L84-L117: componente y estado (filtros, `diasAtencion`, `medico`,
  `diaAbierto`, mensajes).
- L119-L200: búsqueda del profesional (con `activo=1`, `Promise.all`).
- L202-L287: disponibilidad del día abierto y días de atención (desde
  `/api/disponibilidades`, `dia_semana` 1=lunes…7=domingo).
- L289-L296: `dias` a mostrar (`construirDias`).
- L298-L307: `alternarDia`.
- L309-L367: apertura automática del primer día (con ref para no reabrir el
  que el usuario cerró).
- L369-L385: `reservar` — navega a la reserva con fecha y hora por query.
- L387-L430: estados de carga y "profesional no encontrado".
- L432-L607: render de la agenda (días, horarios, reserva).
- L609-L763: helpers de fecha (construcción en hora local, no UTC).

**Notas:** las fechas **no** se manejan en UTC: un `new Date("2026-10-05")` con
hora 0 en Argentina puede caer el día anterior. Todas las conversiones pasan
por los helpers del final.

#### `src/components/Turnera/ReservarTurno.jsx`

**Rol:** última pantalla del flujo público y primera que exige sesión. Tres
estados: sin sesión / con sesión sin ficha / con sesión y ficha vinculada.

**Recorrido por bloques:**
- L1-L38: encabezado (regla de negocio de la ficha, dos modos según rol, nota
  de seguridad).
- L41-L65: imports (`useParams`, `useSearchParams`, `useNavigate`, `Link`,
  `useAuth`, `api/turnera`, `PiezasTurnera`).
- L67-L130: componente y estado (formulario, pacientes, flags de operación,
  `vinculado`).
- L132-L172: validación de la URL y carga del listado de pacientes (solo para
  quien reserva en nombre de otro).
- L174-L273: handlers `confirmarReserva` (con `idPaciente` solo para
  admin/médico) y `confirmarVinculacion`.
- L275-L306: `resumen` del turno, compartido por los tres estados.
- L308-L349: Estado A — sin sesión (invita a registrarse o entrar).
- L351-L397: Estado B — con sesión sin ficha (formulario de vinculación).
- L399-L471: Estado C — confirmación (selector de paciente solo si
  `reservaEnNombreDeOtro`).

**Notas:** cuando reserva un paciente, la web **no manda** su id; el backend lo
impone desde el token. El 409 (horario tomado) tiene mensaje propio.

#### `src/components/Turnera/MisTurnos.jsx`

**Rol:** turnos de la persona con sesión. Usa polling (no suscripción,
justamente para tener el estado derivado del backend) y ofrece confirmar y
cancelar como operaciones distintas.

**Recorrido por bloques:**
- L1-L30: encabezado e imports.
- L108-L172: efectos de carga con `usePolling` (`listarMisTurnos`).
- render con lista y acciones.

**Se conecta con:** `listarMisTurnos`, `confirmarTurno` y `cancelarTurno` de
`api/turnera.js`.

#### `src/components/Turnera/PiezasTurnera.jsx`

**Rol:** piezas de interfaz compartidas por el módulo (`Cargando`, `Aviso`,
`Vacio`, y posiblemente `Paginacion` de turnera).

**Recorrido por bloques:** L1-L9: encabezado e imports; luego las piezas.

**Notas:** se usan las mismas piezas en catálogo y agenda para que una misma
situación no se vea distinta según la pantalla.

#### `src/components/Turnera/Turnera.css`

**Rol:** estilos del módulo de turnera (grilla de días, tarjetas de horario,
badges de estado, formularios).

**Notas:** los estados de turno usan tokens (`--turno-*-fg` / `--turno-*-bg`);
hay un único `@media (max-width: 640px)` en este módulo.

### `src/components/Usuarios`

#### `src/components/Usuarios/Usuarios.jsx`

**Rol:** gestión de roles y permisos (solo admin). Lista las cuentas y permite
cambiar su `tipo_usuario`. **No** administra permisos finos de prescripciones:
eso lo resuelve el backend.

**Recorrido por bloques:**
- L1-L38: encabezado (qué hace y qué no, la defensa está en el backend).
- L42-L101: roles — respaldo local, `ROLES_ETIQUETAS`, normalización y
  `etiquetaDeRol`; constante de debounce (400 ms).
- L103-L141: componente y estado (búsqueda, búsqueda aplicada, paginado,
  roles, flags `cargando` / `guardandoId` / `error`).
- L143-L174: carga de roles (una sola vez, con cancelación al desmontar).
- L176-L192: debounce de búsqueda.
- L194-L303: `cargarUsuarios` (con `useCallback`, dependencia
  `busquedaAplicada`) y `cambiarRol` (PATCH `/api/usuarios/{id}/rol`).
- L305-L498: render (filtros, tabla con columnas Nombre/Email/Rol/Estado/Acción,
  `MenuAcciones`, paginación).
- L500-L530: `mensajeDeError` — helper **local** del archivo (no el de
  `crudHelpers`), que cubre los casos sin respuesta (red caída, cancelación).

**Notas:** el rol se muestra en una píldora solo-lectura y el cambio vive en su
propia columna, para no degradar a alguien por accidente al leer su rol. El
aviso `nota_vinculacion` informa la consecuencia real de un cambio de rol.

#### `src/components/Usuarios/MenuAcciones.jsx`

**Rol:** menú desplegable con una acción de cambio de rol por fila.

**Recorrido por bloques:**
- L1-L47: encabezado e imports.
- L72-L161: handlers (abrir/cerrar menú, elegir acción, cierre al hacer clic
  afuera).

**Props / estado principal:** recibe `usuario`, `roles`, `esPropio`,
`guardando`, `alCambiar`.

**Se conecta con:** `PATCH /api/usuarios/{id}/rol` a través del `alCambiar` que
le pasa `Usuarios.jsx`.

**Notas:** único endpoint de acción; los textos son del tipo "Convertir en
Médico" / "Convertir en Administrador". Si `esPropio`, no ofrece cambiarse el
rol a uno mismo.

#### `src/components/Usuarios/Usuarios.css`

**Rol:** estilos del módulo. Duplica a propósito reglas de `Medicos.css` para
no acoplarse; usa solo `var()`. Lo auditan `verificar_variables.php` y
`ver_contraste.php`.

**Notas:** la píldora de rol (`.rol-pildora`) se define en `App.css`, no acá.

## Orden de lectura recomendado

Si recién empezás, leé en este orden (cada paso se apoya en el anterior):

1. `index.html` y `src/main.jsx` — cómo arranca la app.
2. `src/App.jsx` — el router y los guards.
3. `src/context/AuthContext.jsx` y `src/hooks/useAuth.js` — la sesión.
4. `src/api/client.js` — cómo se habla con la API (proxy, interceptor, 401).
5. `src/api/turnera.js` — el catálogo de llamadas del dominio.
6. `src/hooks/usePolling.js` — el patrón de actualización periódica.
7. `src/components/Dashboard/Dashboard.jsx` — primera pantalla tras el login.
8. `src/components/Turnera/CatalogoTurnera.jsx` y `AgendaMedico.jsx` — el flujo
   público.
9. `src/components/Turnera/ReservarTurno.jsx` — el flujo con sesión.
10. `src/components/Prescripciones/ListaPrescripciones.jsx` — un CRUD completo.
11. `src/components/Usuarios/Usuarios.jsx` — el módulo solo-admin.
12. `src/api/realtime.js` + `src/hooks/useEventosRealtime.js` — el tiempo real.

## Glosario breve

- **SPA (Single Page Application):** una sola página HTML que navega por
  JavaScript; el servidor no reenvía HTML por cada ruta.
- **Proxy de Vite:** en desarrollo, Vite reenvía lo que empieza con `/api` al
  backend, para no lidiar con CORS.
- **SSE (Server-Sent Events):** canal de una sola dirección (servidor →
  navegador) sobre HTTP, abierto con `EventSource`. Es lo que usa el "tiempo
  real" de este proyecto.
- **Polling adaptativo:** consultar cada tanto, con espera que se acorta si hay
  novedades y se alarga si no, y pausada cuando la pestaña no está visible.
- **Gating por rol:** mostrar/ocultar pantallas y acciones según
  `tipo_usuario`. Es ayuda de UI, no seguridad: la defensa real está en el
  backend.
- **RBAC (Role-Based Access Control):** control de acceso basado en roles; en
  la UI se usa para no ofrecer acciones que el backend rechazaría.
- **Correlación (correlation id):** identificador que viaja en
  `X-Correlation-Id` y aparece en cada log, para unir una petición del
  navegador con su traza en el backend.
- **Service worker:** código que corre en el navegador y hace de intermediario
  de red; acá cachea el caparazón de la app para el arranque offline.
- **Token de diseño:** variable CSS (`--primario`, `--esp-4`, …) definida en
  `tokens.css`; es la fuente única de verdad de colores y medidas.
- **Debounce:** esperar a que el usuario deje de escribir (por ejemplo 400 ms)
  antes de disparar la búsqueda, para no mandar una petición por tecla.
