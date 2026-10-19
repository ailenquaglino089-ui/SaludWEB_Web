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

> El backend tiene que estar corriendo en `http://127.0.0.1:8000` (en
> `SaludWEB_Backend`: `composer run dev`). El proxy de Vite ya apunta ahí por
> defecto, así que no hace falta configurar nada.

### Cómo abrir todo el proyecto (backend + frontend)

La SPA sola no alcanza: necesita la API. Hay **dos formas** de levantar todo.

#### Opción 1 — Un solo doble clic (recomendada)

En `SaludWEB_Web\scripts\` hay dos scripts para Windows, comentados línea por línea:

- **`iniciar_saludweb.bat`** → levanta la API (PHP) y la web (Vite), **espera a que las dos
  respondan** y abre **Chrome en `http://localhost:5173/turnera`**. Detecta el PHP solo,
  **sin necesitar XAMPP ni MySQL**. Deja **2 ventanas** abiertas (una por servidor); la
  ventana del lanzador se cierra sola. Si volvés a hacer doble clic, no duplica servidores.
- **`detener_saludweb.bat`** → apaga los dos servidores (libera los puertos 8000 y 5173).

Requisito: el repo `SaludWEB_Backend` tiene que estar como carpeta **hermana** de
`SaludWEB_Web` (así vienen en el workspace del proyecto). Si tu PHP no está en la ruta por
defecto, definí la variable de entorno `SALUDWEB_PHP` con la ruta a tu `php.exe`.

#### Opción 2 — Dos terminales (manual)

```bash
# Terminal 1 - la API (en SaludWEB_Backend)
composer run dev          # equivale a: php -S 127.0.0.1:8000 index.php

# Terminal 2 - la SPA (en SaludWEB_Web)
npm install               # solo la primera vez
npm run dev               # queda en http://localhost:5173
```

No hace falta **Apache, XAMPP ni MySQL**: la API corre con el **servidor nativo de PHP** y
guarda en un archivo **SQLite** (`SaludWEB_Backend/storage/saludweb.sqlite`) que se crea solo
en el primer request. XAMPP es opcional; si no tenés PHP instalado, el README del backend
explica cómo poner uno portable, paso a paso.

#### Cómo entrar al sistema

1. Ejecutá `iniciar_saludweb.bat` (o las dos terminales) y esperá a que abra **Chrome** en
   **http://localhost:5173/turnera** (la turnera es pública: se ve sin iniciar sesión).
2. En un clon nuevo **no hay ninguna cuenta**: usá **Registro** (`/register`) y creá una
   (rol `paciente` o `medico`). El alta pública **no** permite crear `admin`.
3. Para entrar como **administradora** (con la base de demostración): usuario
   `admin@salud.com`. Si no recordás su clave, en el backend ejecutá
   `php resetear_password.php admin@salud.com MiClaveNueva123` (ver el README del backend,
   "¿Olvidaste la contraseña?").

### Si ves el aviso "Sin conexión"

> Sin conexión. Los datos podrían no actualizarse y los cambios no llegan al servidor.

Ese cartel lo muestra `src/components/common/AvisoOffline.jsx` y aparece por una de dos causas:
el navegador está **offline**, o **una petición a `/api` salió y no recibió respuesta** (el
backend está caído o el proxy no llega a él). Ojo: **que la página se vea NO significa que la
API esté arriba** — el HTML lo sirve Vite, no el backend. Checklist, en orden:

1. **¿Responde la API?** Abrí `http://127.0.0.1:8000/api/health`. Tiene que devolver
   `{"ok":true,...}`. Si no responde, el problema es el backend (ver su README); `npm run dev`
   solo levanta la SPA, no la API.
2. **¿Responde a través del proxy?** Abrí `http://localhost:5173/api/health`. Si el paso 1 anda
   pero este no, el dev server de Vite no está corriendo, o el `.env` cambió
   `VITE_PROXY_TARGET`.
3. **¿Sigue levantado `npm run dev`?** Si cerraste esa terminal, el servidor se apagó y el
   navegador no puede pedir nada. Volvé a ejecutarlo.
4. **Cerrá el cartel** con la ✕: vuelve a ocultarse solo en cuanto una petición responde bien.

> El cartel es un aviso de red, no un error del código: si `curl http://127.0.0.1:8000/api/health`
> contesta `200`, el backend está bien y el problema estaba en que Vite no estaba corriendo.

### Variables de entorno (opcional)

```bash
copy .env.example .env
```

Vite levanta solo el `.env` de la raíz y solo expone al código las variables que
arrancan con `VITE_`. **Sin `.env` todo funciona igual**: los defaults del código ya
apuntan al backend nativo en `http://127.0.0.1:8000`. Crearlo hace falta solo cuando
el backend corre en otra dirección (otro puerto u otra máquina). Detalle completo en
[Configuración API](#-configuración-api).

> El `.env` real no se sube al repo (`.gitignore`); lo que se versiona es `.env.example`.
> Nunca pongas secretos acá: `VITE_*` se embeben en el JavaScript que baja el navegador.

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
├── scripts/
│   ├── iniciar_saludweb.bat # levanta API + web y abre Chrome en /turnera (Windows, sin XAMPP)
│   └── detener_saludweb.bat # apaga los servidores (libera 8000 y 5173)
├── verificar_pwa.mjs        # verificación E2E de la PWA (Playwright)
├── verificar_tiempo_real.mjs # verificación E2E del canal en vivo
├── package.json
└── vite.config.js
```

## 🔧 Configuración API

La URL del backend **no se edita en el código**: sale de las variables de entorno
que Vite levanta desde los archivos `.env` de la raíz.

```bash
copy .env.example .env
```

| Variable | Dónde la lee | Qué hace |
|---|---|---|
| `VITE_PROXY_TARGET` | `vite.config.js` | A dónde reenvía el dev server todo lo que empiece con `/api`. Solo existe en `npm run dev`. |
| `VITE_API_URL` | `src/api/client.js` | URL base de axios. En **dev** conviene vacía (para que mande el proxy y no haya CORS); en **producción** es la URL absoluta del backend. |

Si no hay `.env`, ambos toman los mismos valores que siempre estuvieron escritos en
el código, así que crear el archivo es opcional:

```javascript
// src/api/client.js
const API_URL =
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.DEV ? '' : 'http://127.0.0.1:8000');
```

**Tipos de despliegue y qué poner en cada uno**

| Cómo corrés | Backend | `VITE_API_URL` | `VITE_PROXY_TARGET` |
|---|---|---|---|
| `npm run dev` | `composer run dev` en `127.0.0.1:8000` | *(vacía)* | `http://127.0.0.1:8000` |
| `npm run build` en otro host/puerto | backend en otra dirección | `http://127.0.0.1:8000` | *(no existe)* |

Dos detalles que ya están resueltos y conviene no reabrir:

- En **desarrollo** `VITE_API_URL` queda vacía a propósito: así las llamadas salen como
  `/api/...` relativas, las toma el proxy de Vite y no hay CORS ni preflight. Si en dev
  pusieras la URL absoluta, el navegador mandaría un `OPTIONS` previo que puede ser
  rechazado y el login fallaría sin ningún mensaje visible.
- En **producción** no hay proxy de Vite: el `dist/` se sirve como archivos estáticos y
  `API_URL` tiene que ser absoluta.

Para verificar desde la consola, sin mirar el código:

```javascript
import.meta.env.VITE_API_URL
```

## Tiempo real (sin polling)

El panel **no pregunta al backend cada cierto tiempo**: abre un canal con `EventSource` y
espera a que le avisen que algo cambió.

> **En desarrollo el canal se simula con un sondeo cada 5 s.** El motivo es del servidor, no
> del canal: `php -S` (el backend de desarrollo) atiende **una petición por vez** y en
> Windows no admite varios workers. Con el canal SSE abierto, esa única petición quedaría
> ocupada esperando eventos y el resto de la API (login, listados, turnera) se encolaría
> hasta el time-out: la pantalla se vería vacía. Por eso, cuando el frontend corre en modo
> desarrollo (`npm run dev`), el `EventSource` real se reemplaza por un sondeo cada 5 s —
> mismo efecto visible, sin bloquear al servidor. El canal SSE de verdad se usa en el build
> de producción, que va a un servidor con varios workers (Apache, nginx + PHP-FPM). Ver
> [`src/hooks/useEventosRealtime.js`](src/hooks/useEventosRealtime.js).

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
- ✅ Panel en vivo por SSE: se actualiza solo al reservar o cancelar, sin polling (SSE real en un servidor con varios workers; sondeo cada 5 s en desarrollo)
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

> Estas cuentas existen si migraste la base MySQL vieja. **En un clon nuevo no hay
> ninguna**: creá tu cuenta con la pantalla de **Registro** (`/register`).
> Las fichas de demo se regeneran con `php sembrar_datos_demo.php` en el backend, pero ese
> script no crea usuarios ni contraseñas.
>
> **¿No recordás la clave de `admin@salud.com`?** En el backend:
> `php resetear_password.php admin@salud.com MiClaveNueva123` (solo consola/desarrollo).

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

> Esta prueba verifica el canal **SSE real**, así que necesita un backend con **varios
> workers** (Apache, nginx + PHP-FPM). Con el backend de desarrollo (`php -S`, un solo hilo)
> el panel usa sondeo, así que los pasos 4 y 7 no se cumplen y la prueba reportará
> peticiones periódicas. El resto del proyecto (CRUD, turnera, suites REST) se prueba igual
> con `php -S`.

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

1. **Levantar el backend** en una terminal (servidor nativo de PHP, sin base de datos aparte):
   ```bash
   cd SaludWEB_Backend
   composer run dev      # queda en http://127.0.0.1:8000
   ```
2. **En otra terminal, levantar el frontend**:
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
   solo, sin recargar la página. En desarrollo el cambio llega en unos segundos, porque el
   panel se refresca por **sondeo cada 5 s**; con un servidor con varios workers llega al
   instante por el canal SSE.

> Si en el paso 4 no aparece "En vivo", el problema casi siempre es que el backend no está
> levantado o que la sesión venció. El botón de recarga manual que aparece al lado
> reconecta el canal sin cargar toda la página.

> **Por qué en desarrollo se usa sondeo y no SSE.** `php -S` atiende **una petición a la vez**
> (y en Windows no admite varios workers). Si el panel abriera el canal SSE, esa única
> petición quedaría ocupada esperando eventos y **todo el resto de la API** (login, turnera,
> listados) se encolaría hasta el time-out: la pantalla se vería vacía. Por eso, cuando el
> frontend corre en modo desarrollo, el canal SSE se reemplaza por un sondeo cada 5 s: mismo
> efecto visible, sin bloquear el servidor. El canal `EventSource` real se usa en el build de
> producción, que va a un servidor con varios workers (Apache, nginx + PHP-FPM). El CRUD, la
> turnera y las suites REST andan perfecto con `composer run dev` y con el lanzador
> `scripts/iniciar_saludweb.bat`.

> Para la versión exacta que se midió (9/9, 541 ms), ver
> [la guía del módulo en el backend](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/GUIA_TIEMPO_REAL.md).

## 📚 Más información

- [Guía de código (archivo por archivo)](GUIA_DE_CODIGO.md)
- [Guía de tiempo real (por qué SSE y cómo está hecho)](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/GUIA_TIEMPO_REAL.md)
- [Backend README](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/README.md)
- [AGENDA de trabajo (planificación y pasos)](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/AGENDA_DE_TRABAJO.md)
- [PROJECT_BRIEF](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/PROJECT_BRIEF.md)
- [Revisar y probar el proyecto: de checklist a evidencia](REVISAR_Y_PROBAR_EL_PROYECTO.md)
  (los cinco entregables de evidencia están en `QA/`)
- [Registro de cambios y pasos del proyecto](REGISTRO_DE_CAMBIOS.md)

## Registro de cambios (pasos del proyecto)

La cronología completa del trabajo está en
**[`REGISTRO_DE_CAMBIOS.md`](REGISTRO_DE_CAMBIOS.md)**, con el detalle de qué se
hizo, por qué y en qué Pull Request de cada repositorio quedó publicado. Resumen:

- **15/10** - Corrección de los incidentes de seguridad **INC-001** (`GET
  /api/pacientes` respondía sin sesión) e **INC-004** (el registro público
  aceptaba el rol `admin`). Backend #19, Web #17, Mobile #14.
- **14-15/10** - Se dejó de depender de **XAMPP/MySQL**: base **SQLite** y
  **servidor nativo de PHP**; Web y Mobile apuntan a `127.0.0.1:8000`.
  Backend #16, Web #14, Mobile #11.
- **14-15/10** - Documentación: **guía de código** archivo por archivo y
  **guía de QA** ("de checklist a evidencia"). Backend #17/#18, Web #15/#16,
  Mobile #12/#13.
- **16/10** - Puesta en marcha sin XAMPP + sección **"Si ves el aviso Sin
  conexión"** + `resetear_password.php`. Backend #20, Web #18, Mobile #15.
- **16/10** - **Lanzador de escritorio**: `scripts/iniciar_saludweb.bat` y
  `detener_saludweb.bat` (esperan respuesta real, abren **Chrome en `/turnera`**
  y dejan **2 ventanas**). Web #19 y Web #20.
- **16/10** - **Arreglo del panel "En vivo"**: el **SSE** bloqueaba la API (el
  servidor de PHP atiende una petición por vez), así que en **desarrollo** el
  canal se simula con **sondeo cada 5 s**; el SSE real queda para producción.
  Web #21.

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

## Cómo presentar el proyecto a alguien que no entiende de tecnología

Discurso armado sin jerga, para una demo, una defensa o una charla con alguien del
rubro salud que no programa. La regla: hablar de problemas y beneficios, nunca de
tecnologías. Esta web es la cara visible de SaludWEB.

**En una frase:** SaludWEB es un sistema para gestionar turnos médicos en línea:
el paciente reserva desde el celular o la computadora, y la pantalla del
consultorio se actualiza sola en cuanto alguien reserva o cancela.

**El problema que resuelve:**

- Turnos tomados por teléfono, en horarios limitados.
- Agenda en papel o en Excel, con riesgo de turnos dobles y olvidos.
- El paciente espera sin saber si le quedó el turno.

**Qué gana cada persona:**

| Quién | Qué gana |
|---|---|
| Paciente | Reserva su turno las 24 horas desde el celular, sin llamar, y puede ver o cancelar los suyos. |
| Médico | Ve su agenda del día actualizada sola, sin llamadas ni anotaciones manuales. |
| Administrador | Controla usuarios, profesionales y turnos desde una sola pantalla, con estadísticas de gestión. |

**Respuestas a las preguntas típicas, en criollo:**

| Pregunta | Respuesta |
|---|---|
| ¿Hay que instalar algo? | No. Para el usuario es como entrar a cualquier página web: solo necesita un navegador y conexión. |
| ¿Es una web o una app? | Las dos: se usa desde cualquier navegador y también desde la app de celular. |
| ¿Dónde están los datos? | Guardados en el servidor del sistema, en una base de datos propia, sin depender de servicios de terceros. |
| ¿Es seguro? | Cada persona entra con su usuario y contraseña, y el sistema respeta el rol de cada una: un paciente solo ve sus propios turnos. |
| ¿Cuánto cuesta? | El software no tiene licencias: está hecho con tecnología libre (PHP, SQLite, React) y corre en una computadora común. |

**Demo de 3 minutos (guion para mostrarlo en vivo):**

1. Abrir la turnera (`/turnera`) sin iniciar sesión: es pública y se ve de entrada.
2. Registrarse como paciente y reservar un turno (elegir especialidad, profesional y horario).
3. Entrar como administrador y abrir el panel (`/dashboard`): el contador de
   turnos cambia solo, sin recargar la página.
4. Si hay un celular a mano, repetir la reserva desde la app móvil y verla
   aparecer en la web.

**Analogía que funciona:** para el paciente, SaludWEB es como reservar un asiento
de cine en línea: elige la sala (el profesional), el día y la hora, y listo.
Nadie tiene que aprender a usar el sistema.

## ¿Se puede usar en otras computadoras?

**Sí.** Vale la pena distinguir dos situaciones distintas:

### Otra computadora para desarrollo o demostración

Se levanta igual que esta: se clonan los repositorios y se siguen los mismos pasos
(`composer install` + `composer run dev` en el backend; `npm install` +
`npm run dev` en la web, o el lanzador `scripts\iniciar_saludweb.bat`). Cada
computadora queda con su propia base de datos —un archivo que se crea solo—, así
que no hay que instalar MySQL ni compartir configuración.

Requisitos de esa máquina: Windows (para los scripts `.bat`; en macOS o Linux se
usan los mismos comandos manuales), PHP 8, Composer y Node.js.

### Usuarios finales desde otras computadoras o celulares

El sistema corre en una sola computadora (que hace de servidor) y los demás la
abren desde el navegador, sin instalar nada. Para que eso funcione en una red:

1. El backend tiene que escuchar en la red local, no solo en la máquina:
   `php -S 0.0.0.0:8000 index.php` (en vez de `127.0.0.1`).
2. La web tiene que estar compilada (`npm run build`) y servida como archivos
   estáticos desde el servidor; el `dist/` usa rutas relativas y puede vivir en
   cualquier carpeta.
3. Cada dispositivo abre la dirección del servidor en su navegador.

> Detalle pensado para el celular del médico: con el backend escuchando en la
> red, la app móvil se apunta a `http://<IP-del-servidor>:8000/api` (ver el
> README de Mobile).

### ¿Y en un celular?

Sí: la app móvil de SaludWEB corre en un celular real (con **Expo Go**
escaneando un QR) o en un emulador, sobre la misma API. El guion completo, paso
a paso, está en el README de Mobile, sección
["Cómo usarlo en teléfonos"](https://github.com/ailenquaglino089-ui/SaludWEB_Mobile/blob/main/README.md#cómo-usarlo-en-teléfonos-paso-a-paso).

### Lo que NO hace falta

- MySQL u otro servidor de bases de datos: la base es un archivo SQLite que se crea solo.
- Instalar algo en la PC del usuario final: solo navegador.
- Licencias de software: PHP, SQLite, React y Expo son libres.

## Base de datos de desarrollo

La web **no guarda datos en la PC del usuario**: todo lo pide y lo recibe del
backend. La base de desarrollo del proyecto es un archivo **SQLite** del backend,
en `SaludWEB_Backend/storage/saludweb.sqlite`, que se crea solo en el primer
arranque de la API y **no se sube a GitHub** (cada clone genera el suyo, vacío de
cuentas). Detalle completo —qué contiene, cómo regenerar los datos de demo y
cómo moverla— en la sección **"Base de datos de desarrollo"** del
[README del Backend](https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/README.md).

## Guía para preparar el sistema para producción y defensa

Guía práctica, comentada línea por línea, para llevar un proyecto al entorno de producción
con garantías de calidad y defenderlo con solidez: ambientes (desarrollo, prueba y
producción), variables de configuración, deploy, CI/CD, backups, README profesional,
documentación funcional y técnica, y los diagramas necesarios (ER, casos de uso,
arquitectura y flujo), con una lista de verificación final para la defensa. Está en la raíz
de los tres repositorios del proyecto (Backend, Web y Mobile):

- [PREPARAR_SISTEMA_PARA_PRODUCCION_Y_DEFENSA.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/PREPARAR_SISTEMA_PARA_PRODUCCION_Y_DEFENSA.md)
