# Frontend SPA - SaludWEB

Frontend moderno construido con **React + Vite**. Consume la API REST del backend
(`SaludWEB_Backend`) y proporciona la interfaz del sistema de gestión de salud.

## Qué hacemos acá

- **Web app profesional** (SPA) con login y registro JWT.
- **Módulos de gestión**: médicos, pacientes y prescripciones (la app respeta las mismas
  reglas que el backend: un paciente no puede crear médicos, solo los médicos recetan, etc.).
- **Turnera (citas online)**: catálogo de especialidades → profesionales → reserva de turno;
  mis turnos; agenda del profesional con *polling adaptativo*.
- **Tiempo real en el panel**: los indicadores del consultorio se actualizan por
  **Server-Sent Events** cuando alguien reserva o cancela un turno, sin polling y sin recargar.
  Se ve el detalle en [Tiempo real](#tiempo-real-sin-polling).
- **Roles y permisos en la UI**: cada usuario ve y hace solo lo que su rol permite
  (`admin | medico | paciente`), usando `tipo_usuario` de `/api/auth/me`.
- **Manejo de errores de red**: aviso global **"Sin conexión"** cuando el navegador queda
  offline o una petición a la API muere sin respuesta.
- **PWA instalable y arranque offline** (ver sección abajo).
- **Regresión visual/estructural verificada**: `verificar_pwa.mjs` con Playwright
  (vease "Verificar la PWA").

## 🚀 Inicio Rápido

### Requisitos
- Node.js 16+
- npm o yarn

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
# http://localhost:5173
```

### Build para producción

```bash
npm run build
```

## 📁 Estructura del Proyecto

```
SaludWEB_Web/
├── public/                  # assets servidos tal cual
│   ├── manifest.webmanifest # PWA: nombre, iconos, tema, display
│   ├── sw.js                # service worker (offline)
│   ├── icono-192.png        # icono PWA
│   ├── icono-512.png        # icono PWA
│   ├── apple-touch-icon.png # icono iOS
│   └── .htaccess
├── src/
│   ├── api/
│   │   ├── client.js        # cliente HTTP con JWT y manejo de red
│   │   ├── turnera.js       # cliente API del módulo turnera
│   │   └── realtime.js      # canal SSE: suscribirse, reconectar, cerrar
│   ├── components/
│   │   ├── Auth/            # Login y Registro
│   │   ├── Dashboard/       # panel en vivo por SSE (muestra el rol propio)
│   │   ├── Medicos/         # listado/formulario/detalle
│   │   ├── Pacientes/       # listado/formulario
│   │   ├── Prescripciones/  # listado/formulario/cambio de estado
│   │   ├── Turnera/         # catálogo, reservar, mis turnos, agenda
│   │   ├── Usuarios/        # gestión de usuarios y roles (solo admin)
│   │   ├── Configuracion/   # panel de configuración
│   │   ├── Navbar.jsx       # barra de navegación superior
│   │   └── common/          # Toast, Paginacion, ConfirmarModal, AvisoOffline
│   ├── hooks/               # useAuth, usePolling, useEventosRealtime
│   ├── context/AuthContext.jsx
│   ├── utils/crudHelpers.js
│   ├── App.jsx              # componente raíz
│   ├── App.css
│   └── main.jsx             # registra el SW solo en producción
├── index.html               # meta + theme-color de la marca
├── verificar_pwa.mjs        # verificación E2E de la PWA (Playwright)
├── verificar_tiempo_real.mjs # verificación E2E del canal en vivo
├── package.json
└── vite.config.js
```

## 🔧 Configuración API

En `src/api/client.js`, configura la URL del backend:

```javascript
const API_URL = 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend';
```

## Tiempo real (sin polling)

El panel **no pregunta al backend cada cierto tiempo**: abre un canal con `EventSource` y
espera a que le avisen que algo cambió.

```
src/api/realtime.js             → suscribirse, reconectar y cerrar el canal
src/hooks/useEventosRealtime.js → estado del canal + eventos, sin dejar conexiones abiertas
src/components/Dashboard/       → al recibir un aviso vuelve a pedir los datos por REST
```

El flujo completo es este:

1. Alguien reserva o cancela un turno → el backend publica un aviso.
2. El panel abierto recibe el aviso. **El aviso no lleva los datos**, solo dice "esto cambió".
3. El panel vuelve a pedir `/api/estadisticas` por REST y repinta los números.

El token viaja en la URL del canal porque `EventSource` no admite cabeceras personalizadas.
El backend valida ese token y decide a qué canal puede acceder cada rol, de modo que un
paciente nunca recibe avisos de otro.

## 🎨 Características

- ✅ Autenticación con JWT (login/registro), misma API que la app móvil
- ✅ CRUD de Médicos / Pacientes / Prescripciones con gating por rol
- ✅ Turnera: especialidades → profissionais → reserva, mis turnos y agenda del médico
- ✅ Panel en vivo por SSE: se actualiza solo al reservar o cancelar, sin polling
- ✅ Indicador del estado del canal (conectado / reconectando / sin conexión)
- ✅ Gestión de usuarios y roles (solo admin)
- ✅ Cambio de estado de prescripciones y cancelación de turnos
- ✅ Dashboard interactivo que muestra el rol propio
- ✅ Aviso global "Sin conexión" (AvisoOffline)
- ✅ PWA instalable + arranque offline (sin tocar los datos de `/api`)
- ✅ Validaciones de formularios y manejo de errores
- ✅ Responsive design

## 📦 Dependencias Principales

- **React** - Librería UI
- **React Router** - Enrutamiento
- **Axios** - Cliente HTTP
- **Vite** - Build tool
- **React Context** - Gestión de estado (autenticación)
- **Playwright** (dev) - Verificación E2E de la PWA y del canal en vivo

## 🔐 Autenticación

La autenticación se maneja a través de `AuthContext`:

```javascript
// Hook para usar autenticación
const { usuario, login, logout, registro } = useAuth();

// El token se almacena en localStorage
// Se envía en cada request como Authorization header
```

## Credenciales de demostración

| Rol | Usuario | Contraseña |
|---|---|---|
| Médico | `medico@prueba.com` | `medico123` |
| Paciente | `paciente@prueba.com` | `paciente123` |
| Administradora | `admin@salud.com` | (contraseña personal, no está en el repo) |

> Las fichas de demo se regeneran con `php sembrar_datos_demo.php` en el backend.

## PWA y arranque offline

La SPA es instalable y abre sin red cuando ya se visitó una vez:

- `public/manifest.webmanifest` describe la app (nombre, iconos, tema, display).
- `public/sw.js` cachea el caparazón (HTML + assets compilados con hash) y sirve la
  navegación con **red primero / copia local de respaldo**. Los datos de `/api` **nunca**
  se cachean: turnos y prescripciones siempre se piden a la red con autorización.
- El service worker se registra **solo en el build de producción** (`npm run build`), en
  `src/main.jsx`.
- Requiere HTTPS (o `localhost`) para que el navegador active el service worker.

### Verificar la PWA (E2E en navegador real)

```bash
npm run build
npx playwright install chromium    # primera vez, descarga el navegador
npx vite preview                   # sirve dist/ en http://localhost:4173
node verificar_pwa.mjs             # corre las 12 comprobaciones
```

`verificar_pwa.mjs` abre un Chromium real y comprueba: manifest instalable, íconos
192/512, service worker activo y controlador, **arranque offline** desde el caparazón en
caché, aviso "sin conexión" visible y que **`/api` nunca salga del caché** (los datos
clínicos no se sirven viejos). Resultado esperado: `Pasos OK: 12 / Fallos: 0`.

### Verificar el canal en vivo (E2E)

```bash
npx vite --port 5173      # en una terminal
node verificar_tiempo_real.mjs   # en otra
```

`verificar_tiempo_real.mjs` abre dos sesiones aisladas: una mira el panel y otra reserva un
turno. Comprueba 9 cosas:

1. Las dos sesiones inician sesión.
2. El panel del observador queda "En vivo".
3. El paciente reserva un turno y eso dispara el evento.
4. **El panel cambia solo, sin recargar**: el contador pasa de "1" a "2" en ~540 ms.
5. La latencia está dentro de lo esperado.
6. El canal sigue conectado después del evento (no se cae al entregar el primero).
7. **Con la pantalla quieta no se hace ninguna petición** a `/api/estadisticas` en 12 s: esa
   es la prueba de que el polling se fue de verdad.
8. El canal se cierra al salir del panel (sin procesos colgados en el servidor).
9. La prueba borra el turno que creó, así que se puede correr las veces que haga falta.

> El paso 7 es el importante. Los pasos 1 a 6 pasarían igual con el polling puesto: un panel
> que refresca cada 5 s también mostraría el número nuevo. Lo que distingue el tiempo real
> es que **no consulta cuando no tiene nada nuevo**.

La prueba elige sola la fecha y la hora: busca un día hábil dentro de la ventana que cuenta
`/api/estadisticas` y un horario libre. Se puede forzar con `MEDICO_ID`, `FECHA_CITA`,
`HORA_CITA`, `WEB_URL` y `API_URL`.

### Ver el tiempo real funcionando, paso a paso

Para verlo de verdad hacen falta **dos ventanas del navegador**, porque el efecto es "el panel
de A se actualiza porque B reservó":

1. **Levantar MySQL y Apache** desde el Control Panel de XAMPP.
2. **En una terminal, levantar el frontend**:
   ```bash
   cd SaludWEB_Web
   npm install      # solo la primera vez
   npm run dev
   ```
   Queda en `http://127.0.0.1:5173`.
3. **Iniciar sesión como admin** en `http://127.0.0.1:5173/login`.
4. **Abrir el panel** (`/dashboard`). Arriba tiene que decir **"En vivo"** en verde.
   Si dice "Conectando..." o "Sin canal en vivo", el canal no llegó: recargá con F5.
5. **En una ventana de incógnito (o en otro navegador), iniciar sesión como paciente** y
   reservar un turno desde la turnera.
6. **Volver a la ventana del admin**: el número de "Turnos registrados" tiene que cambiar
   solo, sin recargar la página.
7. **Comprobar que no hay polling**: con el panel del admin quieto durante 12 segundos, el
   contador de peticiones a `/api/estadisticas` tiene que quedar en cero.

> Si en el paso 4 no aparece "En vivo", el problema casi siempre es que el backend no está
> levantado o que la sesión venció. El botón de recarga manual que aparece al lado
> reconecta el canal sin cargar toda la página.

> Para la versión exacta que se midió (9/9, 541 ms), ver
> [la guía del módulo en el backend](../SaludWEB_Backend/GUIA_TIEMPO_REAL.md).

## 📚 Más información

- [Guía de tiempo real (por qué SSE y cómo está hecho)](../SaludWEB_Backend/GUIA_TIEMPO_REAL.md)
- [Backend README](../SaludWEB_Backend/README.md)
- [AGENDA de trabajo (planificación y pasos)](../SaludWEB_Backend/AGENDA_DE_TRABAJO.md)
- [PROJECT_BRIEF](../SaludWEB_Backend/PROJECT_BRIEF.md)

## Calidad del software

Aplicacion de "Calidad Profesional del Software": logging estructurado, identificador de
correlacion de punta a punta con el backend y pruebas unitarias del codigo propio. El detalle
completo esta en **`CALIDAD_PROFESIONAL_SOFTWARE.md`**.

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `src/utils/correlationId.js` | Genera y conserva el `X-Correlation-Id` de la sesion. |
| `src/utils/logger.js` | Logs en JSON con niveles, redaccion de secretos y correlacion. |
| `src/utils/logger.test.js` | 17 pruebas del logger. |
| `src/utils/correlationId.test.js` | 15 pruebas del identificador de correlacion. |

`src/api/client.js` ahora envia el identificador en cada peticion y registra los fallos con
metodo, ruta, estado y motivo, antes de reaccionar a ellos.

### Correr las pruebas

```bash
npm test            # 32 pruebas con el runner nativo de Node (sin dependencias nuevas)
npm run test:watch  # en modo vigilancia
```

No hace falta levantar el backend ni la base de datos: las pruebas cubren el logger y el
identificador de correlacion, que son los dos modulos que se pueden verificar de forma aislada.
Las verificaciones E2E con Playwright siguen aparte (`verificar_pwa.mjs`,
`verificar_tiempo_real.mjs`).

### Correlacion con el backend

1. `client.js` manda `X-Correlation-Id` en cada peticion.
2. El backend lo copia en todas sus lineas de log.
3. Los errores del navegador se registran con ese mismo identificador.

Un error reportado por el usuario se localiza buscando el identificador en los logs del
servidor, en lugar de depender de la memoria de quien lo reporta.

### Reglas fijadas

- Ningun secreto en la consola: la redaccion vive en el logger, no en los componentes, para que
  no se pueda olvidar. El token viaja en `config.headers.authorization` de un error de axios y
  la redaccion es recursiva justamente por eso.
- Los datos personales (email, DNI, telefono, nombre) se enmascaran dejando cuatro caracteres.
- El destino del log se pasa por parametro: asi las pruebas pueden comprobar que un token NO se
  escribe.
