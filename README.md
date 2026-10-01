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
turno. Comprueba que los números cambian **sin recargar** y que, con la pantalla quieta, no se
dispara ninguna petición a `/api/estadisticas` — que es la prueba de que el polling se fue.

## 📚 Más información

- [Guía de tiempo real (por qué SSE y cómo está hecho)](../SaludWEB_Backend/GUIA_TIEMPO_REAL.md)
- [Backend README](../SaludWEB_Backend/README.md)
- [AGENDA de trabajo (planificación y pasos)](../SaludWEB_Backend/AGENDA_DE_TRABAJO.md)
- [PROJECT_BRIEF](../SaludWEB_Backend/PROJECT_BRIEF.md)