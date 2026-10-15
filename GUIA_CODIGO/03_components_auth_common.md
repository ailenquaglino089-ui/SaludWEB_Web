# Guía de código — Web · Auth, common, Configuración y Navbar

> Recorrido línea por línea de los componentes de acceso y reutilizables.
> Índice general en ../GUIA_DE_CODIGO.md

En este documento se recorre el código de la barra de navegación, las pantallas de autenticación (Login y Register), la pantalla de Configuración de la cuenta y las piezas reutilizables de la carpeta `common` (aviso de conexión, modal de confirmación, paginación y toasts). Todos los rangos de línea corresponden a los archivos tal como están en el repositorio; para cada archivo se cubren todas sus líneas en bloques contiguos, sin huecos ni saltos.

---

## `src/components/Navbar.jsx` (282 líneas)

- **Rol:** Barra de navegación superior de la aplicación. Muestra los enlaces públicos (Turnera) a cualquiera, y los enlaces privados según el rol del usuario con sesión activa. También concentra el bloque de usuario (nombre + rol), el cierre de sesión y el menú desplegable de móvil.
- **Recorrido línea por línea:**
  - L1–L8: Comentario de cabecera ("BARRA DE NAVEGACIÓN") e import de `Link`, `useLocation` y `useNavigate` desde `react-router-dom`, con la explicación de para qué sirve cada uno.
  - L9–L11: Línea en blanco e import de `useAuth` desde `../hooks/useAuth` (usuario, logout, autenticado), también con comentario.
  - L12–L17: Import de `useState` desde `react` (estado del menú móvil) e import del CSS `./Navbar.css`.
  - L19–L28: Docblock y constante `ENLACES_PUBLICOS`, con el objeto `{ a: '/turnera', texto: 'Turnera' }`. Se explica por qué Turnera va primero: es la única parte usable sin cuenta.
  - L30–L60: Docblock largo de `ENLACES_SEGUN_ROL`. Justifica por qué el rol decide el menú y no solo "tener sesión": un paciente no debe ver destinos que devuelven 403. Aclara que el backend usa `tipo_usuario`.
  - L61–L69: Declaración del objeto `ENLACES_SEGUN_ROL` y la lista `admin` (Dashboard, Médicos, Pacientes, Prescripciones, Usuarios, Configuración).
  - L70–L80: Comentario sobre "Usuarios": única entrada exclusiva del admin, ubicada después de Prescripciones y antes de Configuración. Recuerda que la defensa real son los `requireRol()` del backend.
  - L81–L87: Lista `medico` (Dashboard, Médicos, Pacientes, Prescripciones, Configuración).
  - L88–L93: Comentario: el médico ve los mismos módulos que el admin en el menú; la diferencia la aplica el backend endpoint por endpoint.
  - L94–L98: Lista `paciente` (Dashboard, Mis turnos, Configuración).
  - L99–L103: Comentario: el paciente sí tiene "Mis turnos" porque ya está dentro de la sesión.
  - L104–L107: Lista `por_defecto` (Dashboard, Configuración).
  - L108–L112: Comentario: ante un rol desconocido se muestra lo mínimo; cierra el objeto con `};`.
  - L114–L117: Firma `export default function Navbar()` y los hooks `useAuth()` (usuario, logout, autenticado), `useLocation()` y `useNavigate()`.
  - L119–L120: Estado local `menuAbierto` con `useState(false)` y su comentario: indica si el menú hamburguesa está abierto.
  - L122–L133: `handleLogout`: `await logout()`, `navigate('/login', { replace: true })` (replace para no dejar la ruta protegida en el historial) y `setMenuAbierto(false)`.
  - L135–L139: `irA`: cierra el menú móvil al navegar (`setMenuAbierto(false)`).
  - L141–L152: `esActivo(ruta)`: compara `location.pathname === ruta` de forma exacta (no `startsWith`) y explica por qué.
  - L153–L163: `alPulsarEscape(evento)`: cierra el menú si la tecla es `Escape`, para no dejar atrapado a quien navega con teclado.
  - L165–L169: Inicio del `return` con `<nav className="navbar" onKeyDown={alPulsarEscape}>` y comentario sobre usar `onKeyDown` en vez de `addEventListener`.
  - L170–L176: `<div className="navbar-container">` y comentario de que la marca navega a Turnera, no al dashboard.
  - L177–L179: `<Link to="/turnera" className="navbar-brand">` con el texto `🏥 SaludWEB`.
  - L181–L194: Botón hamburguesa (`className="navbar-toggle"`): `onClick` alterna `menuAbierto`, `aria-expanded`, `aria-controls="navbar-menu"` y `aria-label` dinámico según abierto/cerrado.
  - L196–L202: `<div id="navbar-menu" className={...}>` con la clase `open` condicional y comentario sobre la relación `aria-controls`.
  - L204–L215: `<div className="navbar-links">` y el `map` de `ENLACES_PUBLICOS` generando `<Link>` con `onClick={irA}` y `aria-current` según `esActivo`.
  - L217–L230: Renderizado de los enlaces privados: solo si `autenticado`, se elige la lista con `ENLACES_SEGUN_ROL[usuario?.tipo_usuario] ?? ENLACES_SEGUN_ROL.por_defecto` y se mapea a `<Link>`.
  - L231–L245: Comentario del bloque anterior: explica el `?? por_defecto` para cubrir el instante en que el contexto carga y evita el parpadeo del menú.
  - L246: `</div>` que cierra `navbar-links`.
  - L248–L261: `<div className="navbar-user">` para usuario autenticado: `<span className="user-name">` con `usuario?.nombre`, badge `user-role` con `tipo_usuario`, y botón `btn-logout` "Cerrar Sesión".
  - L262–L277: Rama sin sesión: comentario y los dos enlaces (`/login` "Ingresar" y `/register` "Crear cuenta").
  - L278–L282: Cierres de `navbar-menu`, `navbar-container`, `</nav>`, `);` y `}` de la función.
- **Se conecta con:** `hooks/useAuth` (contexto de sesión), `react-router-dom` (rutas), `Navbar.css` y los componentes de ruta de la SPA. Es montado por el layout de la aplicación.

---

## `src/components/Navbar.css` (309 líneas)

- **Rol:** Hoja de estilos de la barra de navegación: barra degradada sticky, marca, enlaces con subrayado animado, bloque de usuario, botón de logout y adaptación móvil con panel desplegable.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L3: Comentario de cabecera "NAVBAR - Estilos CSS".
  - L5–L21: `.navbar`: `background: var(--degradado-marca)`, `color: white`, `padding: 0`, sombra, `position: sticky`, `top: 0`, `z-index: 100`.
  - L23–L39: `.navbar-container`: `max-width: 1200px`, `margin: 0 auto`, `padding: 0 20px`, `display: flex`, `justify-content: space-between`, `align-items: center`, `height: 70px`.
  - L41–L53: `.navbar-brand`: `font-size: 24px`, `font-weight: 700`, sin subrayado, blanco y `transition: opacity 0.3s`.
  - L55–L59: `.navbar-brand:hover`: `opacity: 0.9`.
  - L61–L75: `.navbar-toggle`: `display: none` (oculto en desktop), sin fondo ni borde, color blanco, `font-size: 24px`, `cursor: pointer`.
  - L77–L91: `.navbar-menu`: `display: flex`, centrado vertical, `gap: 40px`, `flex: 1`, `justify-content: flex-end`, `margin-left: 40px`.
  - L93–L99: `.navbar-links`: `display: flex` y `gap: 30px`.
  - L101–L115: `.navbar-link`: color blanco, sin subrayado, `font-weight: 500`, `font-size: 14px`, `transition`, `position: relative`.
  - L117–L121: `.navbar-link:hover`: `opacity: 0.8`.
  - L123–L141: `.navbar-link::after`: pseudo-elemento del subrayado animado (`content: ''`, absoluto, `bottom: -5px`, `width: 0`, `height: 2px`, fondo blanco, `transition: width 0.3s`).
  - L143–L147: `.navbar-link:hover::after`: expande el subrayado a `width: 100%`.
  - L149–L157: `.navbar-user`: `display: flex`, centrado, `gap: 20px`.
  - L159–L171: `.user-name`: `font-size: 14px`, `font-weight: 500`, `inline-flex`, centrado y `gap: 8px` para el badge.
  - L173–L189: `.user-role`: badge tipo píldora (`rgba` blanco, `border-radius: 999px`, `font-size: 11px`, `text-transform: capitalize`).
  - L191–L211: `.btn-logout`: fondo blanco semitransparente, texto blanco, borde 2px blanco, `padding: 8px 16px`, `border-radius: 6px`, `transition: all 0.3s`.
  - L213–L219: `.btn-logout:hover`: fondo blanco y `color: var(--primario)`.
  - L221–L226: `@media (max-width: 768px)` y `.navbar-toggle { display: block; }`.
  - L228–L232: `.navbar-container` en móvil: `height: 60px`, `padding: 0 15px`.
  - L234–L262: `.navbar-menu` en móvil: pasa a `position: absolute`, `top: 60px`, ancho completo, columna, `max-height: 0` (colapsado), `overflow: hidden` y `transition`.
  - L264–L284: `.navbar-menu.open`: `max-height: 80vh` y `overflow-y: auto`, con el comentario que explica por qué 80vh y no 300px fijos.
  - L286–L291: `.navbar-links` en móvil: `flex-direction: column`, `gap: 15px`, `width: 100%`.
  - L293–L303: `.navbar-user` en móvil: columna, ancho completo, `margin-top: 15px` y `border-top` divisor.
  - L305–L309: `.btn-logout` en móvil a `width: 100%` y cierre de la media query.
- **Se conecta con:** las clases usadas por `Navbar.jsx` y los tokens del design system (`--degradado-marca`, `--primario`, `--borde`).

---

## `src/components/Auth/Login.jsx` (117 líneas)

- **Rol:** Formulario de inicio de sesión. Maneja email y contraseña controlados, muestra errores del backend y redirige al dashboard tras autenticar.
- **Recorrido línea por línea:**
  - L1–L8: Imports comentados: `useState`, `useNavigate`/`Link` de react-router, `useAuth` y el CSS `./Auth.css`.
  - L9–L11: Comentario del componente y firma `export default function Login()`.
  - L12–L19: Estados `email`, `password`, `error` y `cargando` con `useState`.
  - L21–L24: `const navigate = useNavigate()` y extracción de `login` desde `useAuth()`.
  - L26–L47: `handleSubmit`: `preventDefault`, limpia error, activa `cargando`, `await login(email, password)`, `navigate('/dashboard')`, `catch` que arma el mensaje desde `err.response` y `finally` que apaga `cargando`.
  - L48–L58: Comentario y apertura del `return`: `auth-container`, `auth-card` y `auth-header` con `<h1>🏥 SaludWEB</h1>` y subtítulo.
  - L59–L65: `<form onSubmit={handleSubmit} className="auth-form">`, `<h2>Iniciar Sesión</h2>` y el renderizado condicional del `error-message`.
  - L66–L81: Grupo del campo email: `label htmlFor="email"` e `<input type="email">` controlado con `value={email}`, `onChange`, `required` y `disabled={cargando}`.
  - L82–L96: Grupo del campo contraseña: `label htmlFor="password"` e `<input type="password">` controlado con `value={password}`, `onChange`, `required` y `disabled`.
  - L97–L106: Botón `type="submit"` `btn-primary`, `disabled={cargando}` y texto condicional `'Iniciando sesión...'` / `'Iniciar Sesión'`.
  - L107–L117: Cierre del form, `auth-footer` con el `<Link to="/register">Regístrate aquí</Link>` y cierres de la función.
- **Se conecta con:** `hooks/useAuth` (función `login`), la ruta `/dashboard`, la ruta `/register` y `Auth.css` (compartido con Register).

---

## `src/components/Auth/Register.jsx` (198 líneas)

- **Rol:** Formulario de creación de cuenta. Usa un único objeto de estado para los campos, valida la coincidencia y longitud de la contraseña, registra y hace auto-login para entrar al dashboard.
- **Recorrido línea por línea:**
  - L1–L8: Imports comentados: `useState`, `useNavigate`/`Link`, `useAuth` y el CSS `./Auth.css`.
  - L9–L11: Comentario del componente y firma `export default function Register()`.
  - L12–L19: Estado `formData` con `nombre`, `email`, `password`, `confirmPassword` y `tipo_usuario: 'paciente'`.
  - L20–L23: Estados `error` y `cargando`.
  - L24–L28: `const navigate = useNavigate()` y extracción de `registro` y `login` desde `useAuth()`.
  - L30–L36: `handleChange`: desestructura `{ name, value }` del evento y actualiza con `setFormData((prev) => ({ ...prev, [name]: value }))`.
  - L38–L43: Inicio de `handleSubmit`: `preventDefault` y `setError('')`.
  - L45–L50: Validación de coincidencia de contraseñas: si no coinciden, `setError('Las contraseñas no coinciden')` y `return`.
  - L52–L56: Validación de longitud mínima (6 caracteres): `setError` y `return`.
  - L58–L59: Superadas las validaciones, `setCargando(true)`.
  - L60–L74: `try`: `await registro(email, password, nombre, tipo_usuario)`, luego `await login(...)` (auto-login) y `navigate('/dashboard')`.
  - L75–L82: `catch` que arma el mensaje desde `err.response` y `finally` que apaga `cargando`.
  - L83–L93: Comentario y apertura del `return`: `auth-container`, `auth-card` y `auth-header` con marca y subtítulo.
  - L94–L100: `<form onSubmit={handleSubmit} className="auth-form">`, `<h2>Crear Cuenta</h2>` y el `error-message` condicional.
  - L101–L116: Grupo del campo nombre: `label htmlFor="nombre"` e `<input name="nombre">` controlado con `handleChange`, `required` y `disabled`.
  - L118–L131: Grupo del campo email: `label htmlFor="email"` e `<input type="email" name="email">`.
  - L133–L147: Grupo del selector de rol: `<select name="tipo_usuario">` con las opciones `paciente` y `medico`.
  - L149–L162: Grupo del campo contraseña: `<input type="password" name="password">`.
  - L164–L177: Grupo del campo de confirmación: `<input type="password" name="confirmPassword">`.
  - L179–L188: Botón `type="submit"` `btn-primary`, `disabled={cargando}` y texto condicional `'Registrando...'` / `'Crear Cuenta'`; cierre del form.
  - L189–L198: `auth-footer` con el `<Link to="/login">Inicia sesión</Link>` y cierres de la función.
- **Se conecta con:** `hooks/useAuth` (funciones `registro` y `login`), rutas `/dashboard` y `/login`, y `Auth.css`.

---

## `src/components/Auth/Auth.css` (266 líneas)

- **Rol:** Estilos compartidos por Login y Register: pantalla degradada centrada, tarjeta blanca, encabezado, formularios, mensajes de error, botón principal y pie con enlace.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L3: Comentario de cabecera "AUTENTICACIÓN - Estilos CSS".
  - L5–L19: `.auth-container`: flex centrado, `min-height: 100vh`, `background: var(--degradado-marca)` y la tipografía base del sistema.
  - L21–L35: `.auth-card`: fondo blanco, `border-radius: 16px`, sombra profunda, `max-width: 420px`, `width: 90%` y `overflow: hidden`.
  - L37–L47: `.auth-header`: mismo degradado, texto blanco, `padding: 40px 30px` y `text-align: center`.
  - L49–L57: `.auth-header h1`: sin margen, `font-size: 32px`, `font-weight: 700`.
  - L59–L67: `.auth-header p`: `margin: 8px 0 0 0`, `font-size: 14px`, `opacity: 0.9`.
  - L69–L73: `.auth-form`: `padding: 40px 30px`.
  - L75–L85: `.auth-form h2`: `margin: 0 0 30px 0`, `font-size: 24px`, color `#333`, `font-weight: 600`.
  - L87–L105: `.error-message`: fondo `#fee`, borde `#f88`, texto `#c33`, `padding`, `border-radius` y `margin-bottom`.
  - L107–L111: `.form-group`: `margin-bottom: 20px`.
  - L113–L125: `.form-group label`: `display: block`, `margin-bottom: 8px`, color `#333`, `font-weight: 600`, `font-size: 14px`.
  - L127–L146: `.form-group input, .form-group select`: ancho completo, `padding: 12px 14px`, borde `var(--borde)`, `border-radius: 8px`, `box-sizing: border-box` y transición.
  - L148–L162: `:focus-visible` de input/select: `outline: 3px solid` semitransparente, `outline-offset` y `border-color: var(--primario)`. El comentario explica por qué `:focus-visible` y no `:focus`.
  - L164–L171: `:disabled` de input/select: fondo `#f5f5f5` y `cursor: not-allowed`.
  - L173–L197: `.btn-primary`: ancho completo, `padding: 12px`, degradado, texto blanco, `border-radius: 8px`, `font-size: 16px`, transición y `margin-top`.
  - L199–L205: `.btn-primary:hover:not(:disabled)`: `translateY(-2px)` y sombra acorde.
  - L207–L213: `.btn-primary:disabled`: `opacity: 0.7` y `cursor: not-allowed`.
  - L215–L225: `.auth-footer`: `padding: 0 30px 30px`, centrado, color `#666`, `font-size: 14px`.
  - L227–L237: `.auth-footer a`: color `var(--primario)`, sin subrayado, `font-weight: 600` y transición.
  - L239–L243: `.auth-footer a:hover`: `color: var(--secundario)`.
  - L245–L266: `@media (max-width: 480px)`: achica `.auth-card` (95%), reduce padding de header y form y baja `font-size` del `h2` a 20px; cierra la media query.
- **Se conecta con:** `Login.jsx` y `Register.jsx`, más los tokens `--degradado-marca`, `--primario`, `--secundario` y `--borde` del design system.

---

## `src/components/common/AvisoOffline.jsx` (101 líneas)

- **Rol:** Cartel fijo y global de "sin conexión". Se monta una sola vez en `App.jsx`, por encima de las rutas, y combina dos fuentes de estado: los eventos del navegador y los eventos que dispara el cliente API.
- **Recorrido línea por línea:**
  - L1–L26: Cabecera de comentarios. Explica de dónde sale el estado (eventos online/offline + eventos de `src/api/client.js`) y por qué es un cartel fijo y no un toast.
  - L27–L28: Import de `React`, `useEffect`, `useState` y del CSS `./AvisoOffline.css`.
  - L30–L35: Constantes `EVENTO_SIN_CONEXION` y `EVENTO_CON_CONEXION` (`'saludweb:sin-conexion'` y `'saludweb:con-conexion'`), para no repetir los nombres de los eventos.
  - L37–L44: Firma `export default function AvisoOffline()`, estado `sinConexion` inicializado con `!navigator.onLine` y estado `oculto` (si el usuario cerró el cartel).
  - L46–L58: `useEffect`: define `volverOnline`, `perderOnline`, `falloDeApi` (marca sin conexión y reabre el cartel) y `exitoDeApi` (limpia el estado).
  - L60–L66: `window.addEventListener` para `online`, `offline`, `EVENTO_SIN_CONEXION` y `EVENTO_CON_CONEXION`.
  - L68–L78: Cleanup del `useEffect` que quita los cuatro listeners al desmontar.
  - L80–L81: Guardia: `if (!sinConexion || oculto) return null`.
  - L83–L100: JSX: `<div className="aviso-conexion" role="alert">` con ícono, texto fijo de advertencia y botón `aviso-conexion-cerrar` que hace `setOculto(true)`.
  - L101: Cierre de la función.
- **Se conecta con:** `App.jsx` (montaje global), `src/api/client.js` (emisor de los eventos de conexión), `AvisoOffline.css` y `Toast.jsx` (referenciado en la explicación de por qué no es un toast).

---

## `src/components/common/AvisoOffline.css` (75 líneas)

- **Rol:** Estilos del cartel de "sin conexión": barra fina en el flujo normal, con tokens de aviso (ámbar) y botón de cierre con foco visible.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L12: Cabecera. Explica que el cartel no usa `position`/`z-index` y que usa los tokens de AVISO (`--aviso`, `--aviso-fondo`, `--aviso-texto`).
  - L14–L34: `.aviso-conexion`: `display: flex`, `justify-content: space-between`, `gap: 0.6rem`, `padding: 0.55rem 1rem`, `background: var(--aviso-fondo)`, `border-bottom: 2px solid var(--aviso)`, `color: var(--aviso-texto)` y `font-size: var(--texto-base)`.
  - L36–L42: `.aviso-conexion-icono`: `font-size: var(--texto-md)` y `flex-shrink: 0`.
  - L44–L47: `.aviso-conexion-texto`: `flex: 1` para empujar el botón al borde.
  - L49–L67: `.aviso-conexion-cerrar`: fondo transparente, sin borde, `color: inherit`, `cursor: pointer`, `padding` para llegar al área táctil, `border-radius: var(--radio-sm)` y `margin-left`.
  - L69–L75: `.aviso-conexion-cerrar:focus-visible`: `outline: 2px solid var(--aviso)` y `outline-offset: 2px`.
- **Se conecta con:** `AvisoOffline.jsx` y los tokens `--aviso`, `--aviso-fondo`, `--aviso-texto`, `--texto-base`, `--texto-md` y `--radio-sm`.

---

## `src/components/common/ConfirmarModal.jsx` (64 líneas)

- **Rol:** Modal de confirmación reutilizable. Reemplaza al `confirm()` nativo, muestra qué se va a eliminar y bloquea el botón mientras la petición está en vuelo (prevención de doble clic).
- **Recorrido línea por línea:**
  - L1–L4: Imports de `React`, `useState` y del CSS `./ConfirmarModal.css`.
  - L6–L18: Docblock del componente con la lista de props: `abierto`, `titulo`, `mensaje`, `textoConfirmar` (por defecto "Eliminar"), `onConfirmar` (async) y `onCancelar`.
  - L19: Firma `export default function ConfirmarModal({ ... })` con la desestructuración de props y el valor por defecto.
  - L20–L21: Estado `procesando` con `useState(false)`.
  - L23–L38: `handleConfirmar`: guardia anti doble clic (`if (procesando) return`), `setProcesando(true)`, `await onConfirmar()`, `catch` vacío (el padre ya mostró el error) y `finally` que hace `setProcesando(false)`.
  - L40–L41: Guardia `if (!abierto) return null`.
  - L43–L50: JSX: `modal-fondo` con `onClick` que cancela si no está procesando; `modal` con `role="alertdialog"`, `aria-modal` y `aria-labelledby`, `<h3 id="modal-titulo">` y `<p>{mensaje}</p>`.
  - L51–L63: `modal-acciones`: botón "Cancelar" (`btn-secondary`) y botón de confirmación (`btn-danger`) con texto condicional `'⏳ Procesando…'` / `textoConfirmar`; cierres del JSX.
  - L64: Cierre de la función.
- **Se conecta con:** los listados CRUD (Usuarios, Médicos, Pacientes, Prescripciones) que necesitan confirmar borrados, `ConfirmarModal.css` y las clases globales `btn`, `btn-secondary`, `btn-danger`.

---

## `src/components/common/ConfirmarModal.css` (104 líneas)

- **Rol:** Estilos del modal de confirmación: fondo oscuro que cubre la pantalla, caja centrada con animación de entrada, título, texto y fila de botones con responsive.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L3: Cabecera "ConfirmarModal.css - Modal de confirmación reutilizable".
  - L5–L21: `.modal-fondo`: `position: fixed`, `inset: 0`, fondo `rgba(15,23,42,0.55)`, flex centrado, `z-index: 1000` y `padding: 20px`.
  - L23–L39: `.modal`: fondo blanco, `border-radius: 12px`, `padding: 24px`, `max-width: 420px`, `width: 100%`, sombra y `animation: modal-entrada 0.18s ease-out`.
  - L41–L51: `@keyframes modal-entrada`: de `opacity: 0` con `scale(0.95) translateY(10px)` a `opacity: 1` con `scale(1) translateY(0)`.
  - L53–L61: `.modal h3`: `margin: 0 0 10px 0`, `font-size: 18px`, color `#333`.
  - L63–L73: `.modal p`: `margin: 0 0 22px 0`, `font-size: 14px`, color `#555` y `word-break: break-word`.
  - L75–L83: `.modal-acciones`: flex, `gap: 10px` y `justify-content: flex-end`.
  - L85–L91: `.modal-acciones .btn:disabled`: `opacity: 0.6` y `cursor: not-allowed`.
  - L93–L104: `@media (max-width: 768px)`: `.modal-acciones` pasa a `column-reverse` y `.btn` a `width: 100%`.
- **Se conecta con:** `ConfirmarModal.jsx` y las clases `btn`, `btn-secondary`, `btn-danger` del sistema.

---

## `src/components/common/Paginacion.jsx` (145 líneas)

- **Rol:** Componente reutilizable de paginación para los listados. Calcula el rango visible, colapsa rangos con "…" y adapta la cantidad de páginas mostradas según el ancho de pantalla.
- **Recorrido línea por línea:**
  - L1–L4: Imports de `React`, `useEffect`, `useState` y del CSS `./Paginacion.css`.
  - L6–L34: Docblock del componente: props (`pagina`, `porPagina`, `total`, `totalPaginas`, `onCambiarPagina`) y la justificación de medir el ancho (áreas táctiles de 44px y el desborde en 375px).
  - L35: Firma `export default function Paginacion({ ... })` con la desestructuración de props.
  - L36–L39: Estado `radio` con `useState(2)` (ventana de páginas a cada lado).
  - L41–L53: `useEffect`: `window.matchMedia('(max-width: 768px)')`, función `actualizar` que setea `radio` a 1 o 2, `addEventListener('change', ...)` y cleanup con `removeEventListener`.
  - L55–L61: Guardia `if (totalPaginas <= 1) return null`, con el comentario de por qué el return va después de los hooks.
  - L63–L66: Cálculo de `desde` (0 si no hay registros) y `hasta` (`Math.min(pagina * porPagina, total)`).
  - L68–L79: Generación del arreglo `numeros`: recorre `1..totalPaginas`, incluye primero/última y las que están dentro del `radio`, e inserta `'…'` como separador único.
  - L81–L90: Apertura del `<nav className="paginacion" aria-label="...">` y el `<span>` `paginacion-info` con `aria-live="polite"`: "Mostrando {desde}–{hasta} de {total}".
  - L92–L105: `<div className="paginacion-botones">` y botón "← Anterior" con `disabled={pagina === 1}`, `onClick` a `onCambiarPagina(pagina - 1)` y `aria-label`.
  - L107–L130: `map` de `numeros`: para `'…'` renderiza un `<span>` con `aria-hidden`; para números renderiza un `<button>` que resalta la página actual con `btn-primary` y marca `aria-current`.
  - L131–L142: Botón "Siguiente →" con `disabled={pagina === totalPaginas}` y `onClick` a `onCambiarPagina(pagina + 1)`; cierre de `paginacion-botones`.
  - L143–L145: Cierre de `<nav>`, `);` y `}` de la función.
- **Se conecta con:** todos los listados que paginan (Usuarios, Médicos, Pacientes, Prescripciones, etc.), `Paginacion.css` y las clases globales `btn`, `btn-sm`, `btn-primary`.

---

## `src/components/common/Paginacion.css` (101 líneas)

- **Rol:** Estilos de los controles de paginado: contenedor centrado, texto informativo, fila de botones con área táctil de 44px, separadores y responsive.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L3: Cabecera "Paginacion.css - Controles de paginado de los listados".
  - L5–L16: `.paginacion`: `margin-top: 20px`, flex en columna, centrado y `gap: 12px`.
  - L18–L24: `.paginacion-info`: color `#666`, `font-size: 13px`.
  - L26–L36: `.paginacion-botones`: flex, `flex-wrap: wrap`, `gap: 6px` y `justify-content: center`.
  - L38–L52: `.paginacion-botones .btn`: `border-radius: 6px`, `min-width: 44px`, `min-height: 44px`, `padding: 10px 12px` y centrado (con el comentario del área táctil mínima).
  - L54–L63: `.paginacion-botones .btn:disabled`: `background: var(--borde-tenue)`, `color: var(--texto-deshabilitado)` y `cursor: not-allowed` (con el cálculo de contraste).
  - L65–L75: `.paginacion-ellipsis`: `inline-flex` centrado, `min-width: 24px` y `color: var(--texto-suave)`.
  - L77–L81: `.paginacion-botones .btn-primary`: `pointer-events: none` para que el botón activo no reaccione al hover.
  - L83–L101: `@media (max-width: 768px)`: reduce el `gap` a 4px y ajusta padding/tamaño de fuente de los botones manteniendo `min-width` y `min-height` en 44px.
- **Se conecta con:** `Paginacion.jsx` y los tokens `--borde-tenue`, `--texto-deshabilitado`, `--texto-suave`.

---

## `src/components/common/Toast.jsx` (42 líneas)

- **Rol:** Notificación flotante reutilizable. Es la implementación de `mostrarMensaje(tipo, texto)`: un único componente para el feedback de crear, editar o eliminar. Los toasts de éxito/info se auto-ocultan; los de error permanecen hasta que el usuario los cierre.
- **Recorrido línea por línea:**
  - L1–L4: Imports de `React`, `useEffect` y del CSS `./Toast.css`.
  - L6–L16: Docblock con tipos (`'exito'`, `'error'`, `'info'`), comportamiento de auto-ocultado y props (`tipo`, `texto`, `onCerrar`, `duracion` con default 3000).
  - L17: Firma `export default function Toast({ tipo = 'info', texto = '', onCerrar, duracion = 3000 })`.
  - L18–L28: `useEffect`: si no hay `texto` o el tipo es `'error'` retorna sin temporizador; si no, programa `setTimeout(onCerrar, duracion)` y limpia con `clearTimeout` en el cleanup. Dependencias `[texto, tipo, onCerrar, duracion]`.
  - L30–L31: Guardia `if (!texto) return null`.
  - L33–L42: JSX: `<div className={`toast toast--${tipo}`} role="status">` con `<span className="toast-texto">`, botón `toast-cerrar` (`onClick={onCerrar}`, `aria-label`) y cierre de la función.
- **Se conecta con:** el estado de mensajes de `App.jsx`/contexto, `Toast.css`, y es el contrapunto del cartel persistente `AvisoOffline.jsx`.

---

## `src/components/common/Toast.css` (114 líneas)

- **Rol:** Estilos de los toasts: caja fija arriba a la derecha, variantes de color por tipo, botón de cierre con área táctil de 44px, animación de entrada y responsive.
- **Recorrido línea por línea (bloques por selector):**
  - L1–L3: Cabecera "Toast.css - Notificaciones flotantes (toasts)".
  - L5–L35: `.toast`: `position: fixed`, `top: 20px`, `right: 20px`, `z-index: 1200`, padding, `border-radius: 10px`, texto blanco, flex, `gap: 12px`, sombra, `animation: toast-entrada` y `max-width: 360px`.
  - L37–L43: `.toast--exito`: `background: var(--exito)`, con el comentario del contraste WCAG (4.55:1).
  - L45–L48: `.toast--error`: `background: #dc2626` (permanece hasta cerrarse).
  - L50–L53: `.toast--info`: `background: #2563eb`.
  - L55–L58: `.toast-texto`: `line-height: 1.4`.
  - L60–L86: `.toast-cerrar`: fondo transparente, sin borde, blanco, `cursor: pointer`, `flex-shrink: 0`, `min-width/min-height: 44px`, flex centrado y `border-radius: 8px`.
  - L88–L91: `.toast-cerrar:hover`: `opacity: 0.8`.
  - L93–L103: `@keyframes toast-entrada`: de `opacity: 0` con `translateX(20px)` a `opacity: 1` con `translateX(0)`.
  - L105–L114: `@media (max-width: 768px)`: el toast se apoya en los bordes (`left/right/top: 12px`) y `max-width: none`.
- **Se conecta con:** `Toast.jsx` y el token `--exito`.

---

## `src/components/Configuracion/Configuracion.jsx` (331 líneas)

- **Rol:** Pantalla de configuración de la cuenta. Reúne el cambio de contraseña y la vinculación de la ficha clínica, además de mostrar los datos de la cuenta en modo lectura. La contraseña se cambia vía AuthContext; la ficha se vincula vía la API de turnera.
- **Recorrido línea por línea:**
  - L1–L27: Cabecera. Explica por qué es una pantalla/ruta aparte y qué se puede cambiar (contraseña) y qué no (DNI, nombre, especialidad, por seguridad).
  - L29–L33: Import de `React` y `useState`, con comentario de que no hace falta `useEffect` porque los datos llegan del contexto.
  - L35–L36: Import de `useNavigate` para volver al panel.
  - L38–L39: Import de `useAuth` (sesión, usuario y cambio de contraseña).
  - L41–L44: Import de `mensajeDeError` y `vincularFicha` desde `../../api/turnera`; aclara que el cambio de contraseña no se pide acá.
  - L46–L49: Import de `Cargando` y `Aviso` desde `../Turnera/PiezasTurnera` (piezas reutilizadas).
  - L51–L52: Import del CSS compartido `../Turnera/Turnera.css`.
  - L54–L59: Firma `export default function Configuracion()` y extracción de `usuario`, `cargando`, `recargarSesion` y `cambiarContrasena` de `useAuth()`; `navigate = useNavigate()`.
  - L61–L69: Estados del cambio de contraseña: `actual`, `nueva`, `repetir` con `useState('')`, más el comentario que justifica los tres campos.
  - L70–L73: Estados `errorContrasena`, `exitoContrasena` y `enviandoContrasena`.
  - L74–L79: Estados de la ficha clínica: `documento`, `errorVinculo`, `exitoVinculo` y `vinculando`.
  - L80–L89: Guardia `if (cargando || !usuario)`: renderiza `<div className="turnera"><Cargando texto="Cargando tu configuración..." /></div>` mientras no haya sesión resuelta.
  - L91–L99: Estado derivado `vinculado`: `true` para admin; para médico `Boolean(usuario.id_medico)`; para el resto `Boolean(usuario.id_paciente)`.
  - L100–L101: Comentario: mismo criterio que en la pantalla de reserva, cada rol se vincula a una ficha distinta.
  - L103–L107: `sonFormulariosVacios`: `!actual || !nueva || nueva.length < 8`, con el comentario de la doble validación (cliente + servidor).
  - L108–L111: Comentario de sección "Handlers".
  - L112–L148: `guardarContrasena`: `preventDefault`; guardias de `enviandoContrasena`, `nueva !== repetir` y `sonFormulariosVacios`; `setEnviandoContrasena(true)`; `try` con `await cambiarContrasena(actual, nueva)`, mensaje de éxito y `setTimeout(() => navigate('/login'), 1500)`; `catch` con `mensajeDeError`; `finally` apaga `enviandoContrasena`.
  - L149–L173: `guardarVinculo`: `preventDefault`; guardia `vinculando`; `try` con `await vincularFicha(usuario.tipo_usuario, documento.trim())`, mensaje de éxito y `await recargarSesion()`; `catch` con `mensajeDeError`; `finally` apaga `vinculando`.
  - L174–L177: Comentario de sección "Render".
  - L178–L183: `return` con `<div className="turnera">`, `turnera-header` con `<h1>Configuración</h1>` y subtítulo.
  - L184–L215: Sección "Tu cuenta": comentario, `<section className="config-seccion">`, `<h2>Tu cuenta</h2>` y la `<dl className="resumen-turno">` con las filas Nombre, Correo, Rol y Ficha clínica (esta última con el ternario admin/vinculado/sin vincular).
  - L216–L222: Sección "Cambiar contraseña": `<h2>` y los `Aviso` condicionales de error y éxito.
  - L223–L238: `<form className="turnera-form" onSubmit={guardarContrasena}>` y el campo "Contraseña actual" (`id="config-actual"`, `autoComplete="current-password"`, `required`).
  - L239–L251: Campo "Contraseña nueva" (`id="config-nueva"`, `autoComplete="new-password"`, `minLength="8"`, `required`).
  - L252–L264: Campo "Repetí la contraseña nueva" (`id="config-repetir"`, `autoComplete="new-password"`, `minLength="8"`, `required`).
  - L265–L274: Botón `type="submit"` `btn-turnera btn-primario`, `disabled={enviandoContrasena || sonFormulariosVacios}` y texto condicional `'Guardando...'` / `'Guardar contraseña'`; cierre del form y de la sección.
  - L275–L282: Comentario y apertura de la sección "Ficha clínica" (solo si el rol no es admin) con los `Aviso` de error y éxito.
  - L283–L288: Si `vinculado`, un `Aviso` de éxito indicando que ya está vinculada y que los cambios se piden en recepción.
  - L289–L321: Si no está vinculada: párrafo explicativo y `<form onSubmit={guardarVinculo}>` con el campo documento (label dinámico matrícula/DNI, `id="config-documento"`, `inputMode="numeric"`, `autoComplete="off"`) y el botón `'Vinculando...'` / `'Vincular mi ficha'`.
  - L322: `</section>` que cierra la sección de ficha.
  - L323–L328: Rama `else` para admin: `<Aviso tipo="info" texto="Las cuentas administrativas no se vinculan a una ficha clínica." />`.
  - L329–L331: Cierre del contenedor, `);` y `}` de la función.
- **Se conecta con:** `hooks/useAuth` (usuario, sesión, `cambiarContrasena`, `recargarSesion`), `api/turnera` (`mensajeDeError`, `vincularFicha`), `Turnera/PiezasTurnera` (`Cargando`, `Aviso`), `Turnera/Turnera.css` y la ruta `/login` para el cierre de sesión tras cambiar la contraseña.

---

## Resumen

- Archivos documentados: 14 (los 14 pedidos, en el orden solicitado).
- Ninguno quedó afuera: la lista incluye `Navbar.jsx`, `Navbar.css`, `Auth/Login.jsx`, `Auth/Register.jsx`, `Auth/Auth.css`, `common/AvisoOffline.jsx`, `common/AvisoOffline.css`, `common/ConfirmarModal.jsx`, `common/ConfirmarModal.css`, `common/Paginacion.jsx`, `common/Paginacion.css`, `common/Toast.jsx`, `common/Toast.css` y `Configuracion/Configuracion.jsx`.
