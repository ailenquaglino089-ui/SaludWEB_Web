# Frontend SPA - SaludWEB

Frontend moderno construido con **React + Vite**. Consume la API REST del backend
(`SaludWEB_Backend`) y proporciona la interfaz del sistema de gestión de salud.

## Qué hacemos acá

- **Web app profesional** (SPA) con login y registro JWT.
- **Acceso desde teléfonos y computadoras** por navegador, sin depender de la marca
  del teléfono. En el login, **Ver contraseña** muestra solo lo que se está escribiendo;
  no recupera ni expone contraseñas guardadas.
- **Módulos de gestión**: médicos, pacientes y prescripciones (la app respeta las mismas
  reglas que el backend: un paciente no puede crear médicos, solo los médicos recetan, etc.).
  El paciente tiene además **Mis recetas**, una vista de solo lectura con sus propias recetas.
- **Turnera (citas online)**: catálogo de especialidades → profesionales → reserva de turno;
  mis turnos; agenda del profesional con *polling adaptativo*.
- **Actualización automática del panel**: por defecto consulta cambios cada 15 segundos;
  puede usar **Server-Sent Events** cuando el backend tiene varios workers. No hace falta
  recargar la página. Se explica en [Actualización del panel](#actualización-del-panel).
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

En `SaludWEB_Web\scripts\` están los scripts de arranque y apagado para Windows, además
del router PHP que usa el acceso público:

- **`iniciar_saludweb.bat`** → detecta la IP local; levanta la API PHP en `0.0.0.0:8000`;
  compila los archivos de la web; sirve la web en `0.0.0.0:5173`; y arranca la puerta de
  enlace en `127.0.0.1:8001`. Espera a que respondan los servicios, configura Tailscale
  Funnel hacia la puerta de enlace y abre **Chrome en `http://localhost:5173/turnera`**.
  La ventana del lanzador se cierra sola; quedan hasta **3 ventanas de servicio** (API,
  web local y puerta de enlace). Si volvés a ejecutarlo, detecta los servicios existentes.
- **`servidor_publico.php`** → es el router compartido por los servidores PHP de la web
  local y del Funnel. Si la ruta empieza con `/api`, entrega la solicitud al front
  controller del Backend. Para el resto, busca primero archivos existentes dentro de
  `dist/`; si no existen y la URL es una ruta de la SPA (por ejemplo `/login`), devuelve
  `index.html`. Así una recarga en una pantalla interna no da 404. Las rutas de assets
  inexistentes sí devuelven 404.
- **`detener_saludweb.bat`** → detiene los servicios que escuchan en los puertos 8000,
  5173 y 8001.

Requisito: el repo `SaludWEB_Backend` tiene que estar como carpeta **hermana** de
`SaludWEB_Web` (así vienen en el workspace del proyecto). Si tu PHP no está en la ruta por
defecto, definí la variable de entorno `SALUDWEB_PHP` con la ruta a tu `php.exe`.

#### Acceso desde cualquier red (WiFi o datos móviles)

La URL fija es **`https://saludweb.taileeeb72.ts.net`**. Se publica con
**Tailscale Funnel** y funciona desde cualquier WiFi o datos móviles, sin instalar
Tailscale en el celular:

1. Abrí la URL en el navegador del teléfono e iniciá sesión.
2. En Android: menú de Chrome → **Instalar app** o **Agregar a pantalla de inicio**.
   En iPhone: Compartir → **Agregar a pantalla de inicio**.
3. La PC tiene que quedar **encendida y con Internet**; Tailscale corre como servicio de
   Windows y mantiene la URL. El arranque sigue este recorrido, paso por paso:
   - El servidor local del Backend atiende la API en el puerto `8000`.
   - El servidor web local atiende la versión compilada en el puerto `5173`.
   - Otro servidor PHP escucha solo en `127.0.0.1:8001`; no queda expuesto directamente a
     la red local. Su router entrega `/api/...` al Backend y las demás rutas a la SPA.
   - Tailscale Funnel publica por HTTPS el puerto `8001` bajo el dominio fijo. Como la web
     y la API salen del mismo origen, el navegador puede iniciar sesión sin una URL de API
     separada ni una configuración CORS adicional.
   - Al volver a ejecutar el lanzador, actualiza la regla de Funnel para ese puerto; al
     apagar SaludWEB, `detener_saludweb.bat` cierra los tres servidores.
4. El enlace de Funnel es **público**: cualquiera que lo conozca puede abrir la web y
   alcanzar las rutas públicas de la API. Las operaciones protegidas siguen validando
   autenticación JWT y roles en el Backend; aun así, no compartas cuentas ni contraseñas
   de demostración. Funnel cifra el transporte HTTPS, pero no convierte este equipo de
   desarrollo en un despliegue de producción.
5. El link anterior de `trycloudflare.com` era un túnel temporal y **ya no existe**. La app
   instalada desde ese link hay que desinstalarla y volver a instalarla desde esta URL.

#### Opción 2 — Dos terminales (manual)

```bash
# Terminal 1 - la API (en SaludWEB_Backend)
composer run dev          # equivale a: php -S 0.0.0.0:8000 index.php

# Terminal 2 - la SPA (en SaludWEB_Web)
npm install               # solo la primera vez
npm run dev               # queda en http://localhost:5173 y en la IP local
```

No hace falta **Apache, XAMPP ni MySQL**: la API corre con el **servidor nativo de PHP** y
guarda en un archivo **SQLite** (`SaludWEB_Backend/storage/saludweb.sqlite`) que se crea solo
en el primer request. XAMPP es opcional; si no tenés PHP instalado, el README del backend
explica cómo poner uno portable, paso a paso.

El servidor nativo de PHP atiende una petición a la vez. Por eso el build local usa
actualizaciones periódicas cada 15 segundos en el panel, en lugar de dejar abierto el
canal SSE que podría bloquear las consultas del teléfono. SSE se puede habilitar con
`VITE_REALTIME_SSE=true` únicamente al usar un backend con varios workers.

#### Cómo entrar al sistema

1. Ejecutá `iniciar_saludweb.bat` (o las dos terminales) y esperá a que abra **Chrome** en
   **http://localhost:5173/turnera** (la turnera es pública: se ve sin iniciar sesión).
   Desde un celular en la misma red, abrí la dirección que muestra el script:
   `http://<IP-DE-LA-PC>:5173`. Fuera de casa usá
   `https://saludweb.taileeeb72.ts.net` (ver “Acceso desde cualquier red”).
2. En un clon nuevo **no hay ninguna cuenta**: usá **Registro** (`/register`) y creá una
   (rol `paciente` o `medico`). El alta pública **no** permite crear `admin`. La contraseña
   puede ser la que quieras: solo se exige que no esté vacía (máximo 72 caracteres).
3. Para entrar como **administradora** (con la base de demostración): usuario
   `admin@salud.com`. Si no recordás su clave, en el backend ejecutá
   `php resetear_password.php admin@salud.com MiClaveNueva123` (ver el README del backend,
   "¿Olvidaste la contraseña?").

### Acceso desde el teléfono: flujo explicado paso a paso

1. **Elegir cómo conectarse.** En la misma Wi‑Fi que la PC, usar la dirección local que
   muestra `iniciar_saludweb.bat` (`http://<IP-DE-LA-PC>:5173`); es el camino directo y
   normalmente más rápido. Desde otra Wi‑Fi o con datos móviles, abrir
   <https://saludweb.taileeeb72.ts.net>.
2. **Mantener disponible el servidor.** Para el enlace público, la PC queda encendida,
   conectada a Internet, con la API y la web iniciadas y Tailscale activo. La dirección
   local solo funciona mientras el teléfono y la PC estén en la misma red.
3. **Cada persona crea su propia cuenta.** No hace falta que la administradora le cree una
   cuenta ni que comparta sus credenciales: desde “Regístrate aquí”, cada persona ingresa
   su nombre, email (puede ser Gmail) y la contraseña que elige. El alta pública no concede
   rol de administradora; se debe seleccionar el tipo de cuenta normal correspondiente.
   El email no se verifica con Google: escribir una dirección Gmail no es iniciar sesión
   con Google ni demuestra que la persona controle esa dirección.
4. **Iniciar sesión después del registro.** Usar el mismo email y la misma contraseña
   elegida al crear la cuenta. No se puede poner una contraseña distinta o arbitraria en
   cada acceso: la API comprueba la contraseña contra el hash guardado. Si aparece
   “Email o contraseña inválidos” con un email nuevo, primero hay que registrarse; si ya
   se registró, revisar que esté usando la misma contraseña.
5. **Verificar lo que se escribe.** En `Login.jsx`, `Register.jsx` y
   `Configuracion.jsx`, cada campo de contraseña tiene su propio botón
   **Mostrar/Ocultar**. El botón cambia solo ese campo entre texto oculto y
   visible; `Auth.css` y `Turnera.css` le dan espacio y un área táctil adecuada
   para pantalla chica. El mismo formulario responsive sirve en computadora y
   teléfono.
6. **Entender la conexión con la API.** `src/api/client.js` usa el origen de la página en
   un build publicado para que el navegador del teléfono llame a la API del mismo sitio;
   no intenta conectarse a `127.0.0.1`, que en un teléfono sería el propio teléfono.
   `vite.config.js` conserva el proxy `/api` para desarrollo local.
7. **Evitar bloqueos en el servidor local.** `src/hooks/useEventosRealtime.js` usa por
   defecto sondeo cada 15 segundos. El PHP integrado atiende una petición a la vez; una
   conexión SSE permanente podría dejar esperando el login u otras consultas. SSE se
   habilita solo en servidores configurados con varios workers.
8. **Actualizar un acceso instalado.** “Agregar a pantalla de inicio” crea un acceso web
   (PWA), no instala una app nativa. Si queda una versión anterior en caché, cerrar la
   pestaña/app y volver a abrir el enlace para que el service worker descargue los assets
   nuevos. `/api` nunca se sirve desde caché.

> **Compatibilidad:** se puede usar en navegadores actuales de Android y iPhone, sin
> importar la marca. Un sistema operativo o navegador demasiado antiguo puede no soportar
> los requisitos actuales de HTTPS/PWA. La dirección pública es accesible para cualquiera
> que la conozca: cada persona necesita su propia cuenta y la computadora debe seguir en línea.

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
│   │   ├── Prescripciones/  # listado médico, formulario, estado y Mis recetas
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

## Actualización del panel

Con la configuración predeterminada, el panel consulta si hubo cambios cada 15 segundos.
También se puede usar un canal `EventSource` cuando el backend admite varios workers.

> **Con `php -S` se usa sondeo, también en el build local.** El motivo es del servidor, no
> del canal: `php -S` atiende **una petición por vez** y en
> Windows no admite varios workers. Con el canal SSE abierto, esa única petición quedaría
> ocupada esperando eventos y el resto de la API (login, listados, turnera) se encolaría
> hasta el time-out: la pantalla se vería vacía. Por eso, por defecto el `EventSource` se
> reemplaza por un sondeo cada 15 s —sin bloquear al servidor. Solo se habilita SSE con
> `VITE_REALTIME_SSE=true` cuando el backend usa varios workers (Apache, nginx + PHP-FPM). Ver
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
- ✅ Prescripciones clínicas solo para médicos; el paciente consulta **Mis recetas**
- ✅ Turnera: especialidades → profissionais → reserva, mis turnos y agenda del médico
- ✅ Panel con actualización automática (sondeo cada 15 s por defecto; SSE opcional en servidores multi-worker)
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
- Requiere HTTPS (o `localhost`) para que el navegador active el service worker. La URL de
  Tailscale (`https://saludweb.taileeeb72.ts.net`) cumple ese requisito y sirve el
  build con `npm run preview` en el puerto 5173.
- En desarrollo (`npm run dev`) la app funciona, pero **no es instalable** porque el service
  worker no se registra; para probar la instalación usá el build de producción.

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
   Queda en `http://localhost:5173` y en `http://<IP-DE-LA-PC>:5173`.
3. **Iniciar sesión como admin** en `http://localhost:5173/login`.
4. **Abrir el panel** (`/dashboard`). Arriba tiene que decir **"En vivo"** en verde.
   Si dice "Conectando..." o "Sin canal en vivo", el canal no llegó: recargá con F5.
5. **En una ventana de incógnito (o en otro navegador), iniciar sesión como paciente** y
   reservar un turno desde la turnera.
6. **Volver a la ventana del admin**: el número de "Turnos registrados" tiene que cambiar
   solo, sin recargar la página. Por defecto el cambio llega en un máximo de **15 s** por
   sondeo; con `VITE_REALTIME_SSE=true` y un servidor con varios workers llega al instante.

> Si en el paso 4 no aparece "En vivo", el problema casi siempre es que el backend no está
> levantado o que la sesión venció. El botón de recarga manual que aparece al lado
> reconecta el canal sin cargar toda la página.

> **Por qué con `php -S` se usa sondeo y no SSE.** `php -S` atiende **una petición a la vez**
> (y en Windows no admite varios workers). Si el panel abriera el canal SSE, esa única
> petición quedaría ocupada esperando eventos y **todo el resto de la API** (login, turnera,
> listados) se encolaría hasta el time-out: la pantalla se vería vacía. Por eso, cuando el
> frontend corre en modo desarrollo o se sirve con `php -S`, el canal SSE se reemplaza por
> un sondeo cada 15 s: mismo efecto visible, sin bloquear al servidor. El canal `EventSource`
> se habilita con `VITE_REALTIME_SSE=true` solo en servidores multi-worker (Apache, nginx +
> PHP-FPM). El CRUD, la
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

- **01/11** - **Acceso remoto estable** con **Tailscale Funnel** en
  `https://saludweb.taileeeb72.ts.net`: la web compilada y `/api` salen
  por el mismo origen HTTPS, así funciona desde cualquier WiFi o datos móviles.
  La PWA se sirve en modo producción (`npm run build`) porque el service worker
  solo se registra en ese modo. El lanzador levantó la puerta de enlace en
  `127.0.0.1:8001` y dejó el arranque automático al iniciar Windows.
- **01/11** - **Mostrar/ocultar contraseña** en Login, Registro y Configuración.
  Cada campo tiene su propio estado y su propio botón con `aria-label`,
  `aria-controls` y `aria-pressed`; ver una contraseña no revela las demás.
- **01/11** - **Turnera sin especialidades repetidas**: se eliminó el duplicado
  histórico `Cardiologia` / `Cardiología` y el backend incorporó
  `limpiar_especialidades_duplicadas.php` para fusionar variantes por tildes o
  mayúsculas sin perder médicos asociados.
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
- **01/11** - **Cierre de la iteración de pacientes, prescripciones, usuarios y
  fichas**: se normalizó el estado activo del paciente, el formulario de
  prescripciones pasó a recorrer todas las páginas de la API y a tratar los
  vínculos como datos de solo lectura en edición, y se regeneraron las fichas
  de demostración para que las diez cuentas queden consistentes. El detalle
  línea por línea está en la sección siguiente.
- **02/11** - **Estado activo/inactivo de médicos**: el alta ya respeta el
  checkbox (un médico creado como inactivo queda inactivo), el formulario
  normaliza el `1/0` de SQLite y el payload envía un booleano. Se aplicó el
  mismo criterio en el backend para pacientes y médicos.
- **04/11** - **Turnera con profesionales activos**: el backend sembró médicos en
  Cardiología, Dermatología y Clínica Médica, con agenda de lunes a viernes, y la
  web dejó de ofrecer especialidades con `cantidad_medicos = 0`. Así desaparece el
  caso de elegir una especialidad y ver "No encontramos profesionales...".

## Iteración verificada (02/11/2026)

Esta sección explica **qué cambió, línea por línea**, en los archivos que se
tocaron para cerrar los problemas de pacientes, prescripciones, usuarios,
fichas, estados activo/inactivo, reserva pública, nombres en "Mis turnos" y
rutas profundas de la SPA. Los números de línea corresponden a los archivos de
este repositorio.

### 1. Paciente activo: de `0/1` a booleano

Archivo: `src/components/Pacientes/FormularioPaciente.jsx`.

- **Líneas 43-47** - Al precargar el formulario en edición se lee
  `paciente.activo` y se normaliza:
  - `paciente.activo === undefined || paciente.activo === null ? true` significa
    que un paciente sin el campo (datos viejos) se considera activo, que es el
    valor por defecto del backend.
  - `Boolean(Number(paciente.activo))` convierte el `1`/`0` que devuelve SQLite
    en `true`/`false`. Sin esta conversión el checkbox recibía un número y no
    reflejaba el estado real.
- **Líneas 112-114** - El payload que se envía al guardar ahora incluye
  `activo: Boolean(formData.activo)`. Antes la clave no viajaba en el `PUT`, el
  backend no modificaba la columna y el checkbox parecía no guardar. El valor se
  envía como booleano, no como el string `"true"`.

### 2. Prescripciones: todas las páginas y vínculos de solo lectura

Archivo: `src/components/Prescripciones/FormularioPrescripcion.jsx`.

- **Líneas 58-77** - `cargarListaCompleta(ruta)` recorre la API paginada:
  - `const items = []` acumula los resultados de todas las páginas.
  - `let pagina = 1` y `let totalPaginas = 1` arrancan el recorrido.
  - `do { ... } while (pagina <= totalPaginas)` garantiza al menos una petición
    y sigue mientras queden páginas.
  - `params: { pagina, por_pagina: 100 }` pide el máximo permitido por el
    backend en cada vuelta.
  - `getDatos(response, { items: [], total_paginas: 1 })` desenvuelve la
    respuesta y deja un valor seguro si falta la estructura.
  - `Array.isArray(datos) ? datos : (datos.items || [])` acepta tanto un array
    plano (contrato viejo) como el objeto paginado actual.
  - `items.push(...itemsPagina)` agrega la página al acumulador.
  - `Math.max(1, Number(datos.total_paginas) || 1)` calcula el total de páginas
    y nunca deja un valor menor a 1.
  - `pagina += 1` avanza a la siguiente página.
- **Líneas 82-93** - `Promise.all` pide pacientes y médicos en paralelo y
  guarda **arrays** en el estado. Antes se guardaba el objeto paginado completo
  y la vista lo recorría con `.map()`, lo que producía
  `TypeError: i.map is not a function` y dejaba los selectores vacíos.
- **Líneas 103-105** - `const esEdicion = Boolean(prescripcion)` distingue alta
  de edición una sola vez para no repetir la condición en cada validación y en
  el render.
- **Líneas 112-116** - El paciente se exige siempre; el médico solo en el alta.
  Una receta histórica puede tener `id_medico = null` y aun así debe poder
  editarse sin obligar a inventar un médico.
- **Líneas 184-203** - El payload se arma en dos pasos:
  - Se filtran las filas de medicamento sin nombre y se envía `null` cuando no
    hay fecha, que es lo que espera el backend.
  - Los `id_paciente` e `id_medico` se agregan **solo si `!esEdicion`**. En
    edición se omiten a propósito: `PrescripcionService`/`PrescripcionRepository`
    no actualizan esos campos en el `PUT`, así que enviarlos daría la falsa
    impresión de que la receta se puede reasignar.
- **Líneas 211-241** - Se calculan `pacienteActual` y `medicoActual`. Si la
  ficha ya no está en la lista (dada de baja o fuera de las páginas cargadas),
  se agrega como opción con el nombre que vino en la prescripción. Las listas
  `opcionesPacientes` y `opcionesMedicos` evitan duplicar esa opción.
- **Líneas 258-313** - En edición:
  - Los `<select>` de paciente y médico llevan `disabled={esEdicion}`.
  - El médico deja de ser obligatorio y la opción vacía dice
    "Sin médico asignado".
  - Se muestra un `texto-ayuda` que explica que el vínculo no se puede cambiar.
  - El DNI y la especialidad se imprimen solo si existen
    (`p.dni ? ... : ''`), para que una ficha incompleta no muestre `undefined`.

### 3. Usuarios y fichas

- Se ejecutó `php sembrar_datos_demo.php` en el backend. El script dejó las
  **10 cuentas de demostración** con su rol y su ficha correctos; no borró
  usuarios y no tocó ninguna contraseña.
- La cuenta `alonso.tramposo@saludweb.com` (id `2`) tenía `rol = paciente` y
  `id_medico = 10`. El seeder la pasó a **médico** y la vinculó a la ficha
  `#10`; ahora la pantalla de usuarios la muestra como "Médico".
- La ficha fantasma `pacientes #324` ("Dr. Alonso Tramposo") quedó **apagada**;
  no se eliminó el registro.
- La pantalla `src/components/Usuarios/Usuarios.jsx` lista las cuentas y permite
  cambiar el rol con `PATCH /api/usuarios/{id}/rol`. La cuenta propia se marca
  con "(vos)" y el backend responde **409** si se intenta degradar al último
  admin o a uno mismo.
- La pantalla `src/components/Configuracion/Configuracion.jsx` muestra el estado
  de la ficha y permite vincularla con DNI (paciente) o matrícula (médico). Si
  el DNI del paciente no existe, el backend crea la ficha con el nombre de la
  cuenta. El DNI, el nombre y la especialidad no se editan desde ahí por
  seguridad.

### 4. Médicos activo/inactivo: el alta ya no fuerza `activo = 1`

Archivo: `src/components/Medicos/FormularioMedico.jsx`.

- **Líneas 21-34** - Al precargar un médico en edición, `setFormData` ya no
  copia el objeto crudo de la API. Se arma un objeto con `nombre`, `matricula`,
  `especialidad` y `activo` normalizado:
  - `medico.activo === undefined || medico.activo === null ? true` mantiene el
    comportamiento histórico para registros sin el campo.
  - `Boolean(Number(medico.activo))` convierte el `1`/`0` de SQLite en
    `true`/`false`, para que el checkbox muestre el estado real.
- **Líneas 76-84** - `onGuardar` recibe un payload explícito con
  `activo: Boolean(formData.activo)`. Así el alta y la edición envían un
  booleano, no un número ni un string.
- El backend era la causa principal: `MedicoService::crear` y
  `PacienteService::crear` tenían `'activo' => 1` fijo. Ahora respetan el valor
  enviado (o usan `1` si la clave no viene) y `actualizar` normaliza con
  `filter_var(..., FILTER_VALIDATE_BOOLEAN)`, que también entiende `"false"`.

### 5. Reserva pública: vincular o crear la ficha

Problema: una persona se registraba desde `/register` y quedaba con sesión
iniciada, pero al intentar reservar no tenía `id_paciente`. Si su DNI no estaba
cargado en el consultorio, el vínculo fallaba y no había forma de completar la
reserva desde la web.

Archivos: `src/components/Turnera/ReservarTurno.jsx`,
`src/components/Configuracion/Configuracion.jsx` y
`src/components/Turnera/CatalogoTurnera.jsx`.

- **`ReservarTurno.jsx` líneas 243-268** - `confirmarVinculacion()` envía el
  documento con `vincularFicha(usuario.tipo_usuario, documento.trim())`.
  Después llama a `recargarSesion()` para que `/api/auth/me` traiga el
  `id_paciente` recién creado; sin esa recarga la pantalla seguiría mostrando el
  formulario de vínculo y el paciente tendría que refrescar a mano.
- **`ReservarTurno.jsx` líneas 351-364** - El estado "con sesión pero sin ficha"
  ahora explica que, si la persona todavía no tiene ficha, se crea
  automáticamente con su DNI y el nombre de su cuenta.
- **`ReservarTurno.jsx` líneas 389-395** - El botón dice
  "Vincular o crear mi ficha" en lugar de solo "Vincular": describe las dos
  acciones posibles y evita que el paciente crea que necesita un trámite previo.
- **`Configuracion.jsx` líneas 167-178** - La misma llamada a `vincularFicha()`
  y la misma recarga de sesión desde la pantalla de configuración. El mensaje de
  éxito confirma que la cuenta quedó vinculada.
- **`Configuracion.jsx` líneas 331-336** - El texto avisa que la ficha se crea
  con el DNI y el nombre de la cuenta si todavía no existe.
- **`Configuracion.jsx` líneas 354-360** - El botón usa el mismo texto
  "Vincular o crear mi ficha" para que la acción sea consistente en toda la app.
- **`CatalogoTurnera.jsx` líneas 173-182** - El aviso de cuenta sin ficha se
  muestra antes de elegir un horario y aclara que la ficha se crea
  automáticamente. Antes el paciente descubría el problema recién al final del
  flujo de reserva.

Regla de seguridad: el frontend solo envía el DNI. La decisión de crear la ficha
o rechazar el vínculo queda en el backend, que además compara el nombre cuando
el DNI ya existe. La web no permite editar DNI, nombre ni especialidad desde
"Configuración".

### 6. "Mis turnos": nombres y especialidad con las claves reales de la API

Problema: la API de citas devuelve `nombre_medico`, `nombre_paciente` y
`especialidad`, pero la vista leía `medico_nombre`, `paciente_nombre` y
`especialidad_nombre`. El turno aparecía como `Dr(a).` sin profesional y sin
especialidad, aunque la reserva existía.

- **`src/components/Turnera/MisTurnos.jsx` líneas 238-247** - Se usan
  `turno.nombre_medico`, `turno.especialidad` y `turno.nombre_paciente`. Así el
  paciente ve el profesional, la especialidad y, cuando corresponde, el nombre
  del paciente de la ficha.
- **`src/components/Dashboard/Dashboard.jsx` línea 501** - El panel de inicio
  del paciente usa `turno.nombre_medico`, la misma clave que devuelve
  `listarMisTurnos()`.
- **`src/components/Turnera/AgendaMedico.jsx` líneas 440-442** - La cabecera de
  la agenda usa `medico.especialidad`, que es el campo del médico en la API, en
  lugar de `especialidad_nombre`.

### 7. Rutas profundas y PWA: rutas absolutas

Problema: al entrar directo o refrescar `/turnera/mis-turnos`, la página quedaba
en blanco. El build usaba `base: './'`, así que el HTML pedía
`./assets/index-...js`; el navegador lo resolvía contra `/turnera/` y buscaba
`/turnera/assets/index-...js`, que no existe.

Archivos: `vite.config.js`, `index.html` y `src/main.jsx`.

- **`vite.config.js` líneas 35-44** - `base: '/'` reemplaza a `'./'`. La SPA se
  publica en la raíz del dominio, así que los assets deben pedirse siempre como
  `/assets/...` sin importar la profundidad de la ruta.
- **`index.html` línea 13** - El manifest se pide como
  `/manifest.webmanifest`; con `./manifest.webmanifest` se resolvía contra la
  ruta actual y fallaba en páginas anidadas.
- **`index.html` línea 16** - El ícono de iOS se pide como
  `/apple-touch-icon.png`, por la misma razón.
- **`src/main.jsx` líneas 16-24** - El service worker se registra con
  `navigator.serviceWorker.register('/sw.js')` solo en producción. Con
  `'./sw.js'` el navegador buscaba `/turnera/sw.js` en las rutas profundas y el
  registro fallaba.

Verificación: `npm run build` genera `dist/index.html` con `/assets/...`,
`/manifest.webmanifest` y `/apple-touch-icon.png`; `GET /turnera/mis-turnos`
responde `200` y el navegador carga el JS y el CSS desde la raíz.

### 8. Verificación ejecutada

- `npm test` en Web: **32/32** pruebas OK.
- `npm run build`: **134 módulos** transformados, build OK.
- E2E de pacientes y prescripciones: `PACIENTE_ACTIVO_OK`,
  `PRESC_CRUD_MEDICO_OK`, `PRESC_CRUD_ADMIN_OK`, `ERRORES []`.
  El selector de prescripciones mostró **224** opciones de paciente y **10** de
  médico, es decir que ya no se limita a la primera página.
- E2E de alta inactiva: `MEDICO_ALTA_INACTIVO_OK`,
  `PACIENTE_ALTA_INACTIVO_OK`, `CLEANUP_OK`, `ERRORES []`. Se crearon desde la
  UI con el checkbox desmarcado, se buscaron por matrícula/DNI y la fila mostró
  **Inactivo**; los registros de prueba se borraron al terminar.
- Prueba directa de la API: `POST /api/medicos` y `POST /api/pacientes` con
  `activo: false` devolvieron `activo=0`; luego se eliminaron esos registros.
- E2E de usuarios y configuración: **10** filas en `/usuarios`, Alonso como
  Médico, cuenta propia marcada, filtro de médicos con **4** resultados y ficha
  "Vinculada" para paciente y médico.
- E2E de reserva desde el enlace público: registro, selección de la médica
  Simona, horario `08:00`, vínculo con un DNI sin ficha, creación automática de
  la ficha y reserva confirmada. Luego la pantalla "Mis turnos" mostró
  `Dr(a). Simona — Medicina General`, el paciente y el motivo, y la cancelación
  dejó la cita en estado `cancelada`.
- Casos negativos de la API: DNI existente vinculó la ficha correcta; DNI ajeno
  respondió `422` con "El nombre de la cuenta no coincide con el de la ficha del
  DNI"; una cuenta ya vinculada no pudo crear otra ficha. Los usuarios, fichas y
  citas de prueba se borraron al terminar.
- Rutas profundas: `/turnera/mis-turnos` respondió `200` y cargó
  `/assets/index-0d5d49e8.js` (hash del build de esta iteración) desde la raíz,
  no desde `/turnera/`.
- En el backend: `php tests/run.php` (50/50), `php probar_roles.php` y
  `php probar_vinculacion.php` (15/15) pasaron después del seeder.

## Iteración 04/11/2026: turnera con profesionales activos

La API pública de especialidades devolvía `cantidad_medicos = 0` para Cardiología y
Dermatología. Al elegir esas opciones, `CatalogoTurnera` pedía profesionales y recibía una
lista vacía, entonces mostraba "No encontramos profesionales con esos filtros...". El
backend agregó tres profesionales activos con agenda y la web dejó de ofrecer las
especialidades que no tienen ningún profesional activo.

### `CatalogoTurnera.jsx`, línea por línea

Archivo: `src/components/Turnera/CatalogoTurnera.jsx`, líneas 192-210.

- **Líneas 192-196** - El `<select>` sigue controlado por `especialidad`; el valor elegido
  se guarda con `setEspecialidad(e.target.value)` y dispara la recarga de médicos.
- **Líneas 197-199** - La opción con `value=""` representa "Todas las especialidades" y el
  backend la interpreta como que no hay filtro.
- **Líneas 200-201** - Antes de pintar las opciones, filtra las especialidades cuyo
  `cantidad_medicos` sea mayor que 0. `Number(...)` convierte el valor por si la API lo
  entrega como texto.
- **Líneas 202-203** - Solo las especialidades que pasan el filtro se recorren con
  `.map()` para crear un `<option>` por cada una.
- **Líneas 204-207** - Cada opción muestra `nombre (cantidad_medicos)`, por ejemplo
  `Cardiología (1)`. El número viene del backend y cuenta únicamente médicos activos.
- **Líneas 208-210** - Se cierra el `<option>`, el `.map()`, el bloque del selector y el
  contenedor del filtro. La opción `Prueba` de la base ya no aparece porque tiene 0.

El cambio no toca la carga de médicos ni la navegación a la agenda: cuando se elige una
especialidad con profesionales, `listarMedicos()` sigue enviando `especialidad`, `q` y
`activo: 1`, y la agenda recibe el médico por `state` o por el id de la URL.

### Verificación de esta iteración

- `GET /api/especialidades` devuelve seis especialidades con profesionales:
  Cardiología `1`, Clínica Médica `2`, Dermatología `1`, Medicina General `2`,
  Neurología `1` y Pediatría `1`. `Prueba` queda con `0` y no se muestra.
- Playwright sobre `http://127.0.0.1:5173/turnera` leyó las opciones:
  `Todas las especialidades`, `Cardiología (1)`, `Clínica Médica (2)`,
  `Dermatología (1)`, `Medicina General (2)`, `Neurología (1)` y `Pediatría (1)`.
- Al seleccionar Cardiología, la lista quedó con **Dr. Hernán Rivas** y no apareció el
  mensaje de "No encontramos profesionales".
- `npm test`: **32/32** pruebas OK.
- `npm run build`: **134 módulos** transformados, build OK.
- La URL pública `https://saludweb.taileeeb72.ts.net/turnera` sirve el build nuevo
  `index-7535f6a2.js`; la API pública devuelve los mismos conteos.

## Iteración 05/11/2026: Mis recetas y prescripciones solo para médicos

La pantalla `/prescripciones` se mostraba como un módulo de gestión más y el backend solo
pedía token para leer recetas. En esta iteración el acceso clínico quedó reservado al rol
`medico` y el paciente recibió una pantalla propia, **Mis recetas**, que consume
`GET /api/prescripciones/paciente/{id_paciente}` y no permite crear, editar, cambiar el
estado ni borrar nada.

### Qué ve cada rol

| Elemento | `admin` | `medico` | `paciente` |
|---|---|---|---|
| Enlace y tarjeta “Prescripciones” | No | Sí | No |
| Ruta `/prescripciones` | Redirige a `/dashboard` | Sí | Redirige a `/dashboard` |
| Enlace y tarjeta “Mis recetas” | No | No | Sí |
| Ruta `/mis-recetas` | Redirige a `/dashboard` | Redirige a `/dashboard` | Sí |

La UI oculta o redirige, pero la defensa real sigue siendo el backend: aunque alguien
escriba la URL a mano, `requireRol()` responde `403` y la pantalla no recibe datos.

### `src/App.jsx`, línea por línea

- **Líneas 38-39** — Se importa `ListaPrescripciones` (la vista médica que ya existía) y se
  agrega `MisPrescripciones` desde `components/Prescripciones/`.
- **Líneas 146-173** — `MedicoRoute` replica el patrón de `ProtectedRoute` y agrega una
  condición: mientras `cargando` sea verdadero muestra el spinner; sin sesión redirige a
  `/login`; si `usuario.tipo_usuario` no es `medico`, redirige a `/dashboard`; solo entonces
  devuelve `children`. El comentario deja explícito que el backend ya responde `403`, pero
  la guarda evita que un admin o un paciente lleguen a la pantalla escribiendo la URL.
- **Líneas 175-196** — `PacienteRoute` hace lo mismo para `paciente`. Un médico o un admin
  que intente abrir `/mis-recetas` termina en `/dashboard`.
- **Líneas 286-293** — La ruta `/prescripciones` cambia de `ProtectedRoute` a `MedicoRoute`;
  `ListaPrescripciones` queda envuelta por la guarda médica.
- **Líneas 295-302** — Se agrega `/mis-recetas` con `PacienteRoute` y `MisPrescripciones`.
  La ruta es independiente de `/prescripciones`: no comparte formularios ni acciones de
  escritura.

### `src/context/AuthContext.jsx`, línea por línea

- **Líneas 69-89** — `recargarSesion()` hace `GET /api/auth/me`, guarda los datos frescos en
  el estado global y los devuelve. Si falla, registra el error y devuelve `null` sin borrar
  la sesión: un fallo de red momentáneo no debe expulsar al usuario.
- **Líneas 122-129** — `login()` hace `POST /api/auth/login` y separa `token` del resto del
  payload (`usuarioData`).
- **Línea 133** — El token se guarda en `localStorage` **antes** de llamar a
  `recargarSesion()`. El cliente HTTP lee el token de `localStorage` para armar el
  `Authorization: Bearer`, así que este orden es necesario para que `/api/auth/me` funcione.
- **Líneas 136-137** — Se pide `/api/auth/me` y se usa su resultado (`datosCompletos`) como
  fuente principal. Si la recarga falla, se conserva `usuarioData` del login para no romper
  el acceso.
- **Línea 139** — Se persiste en `localStorage` el usuario completo, ahora con
  `id_paciente`/`id_medico` cuando el backend los devuelve.
- **Líneas 142-147** — Se actualizan `token` y `usuario` en React y se devuelve `datosSesion`
  para que `Login` pueda redirigir. Sin este cambio, el JWT no trae `id_paciente` y
  `MisPrescripciones` no sabría qué id pedir hasta recargar la página.
- **Límite conocido** — Si `/api/auth/me` falla justo después del login, se usa el payload
  del login como respaldo; ese payload puede no incluir `id_paciente`, por lo que la vista
  mostrará “cuenta no vinculada” hasta la próxima verificación de sesión.

### `src/components/Prescripciones/MisPrescripciones.jsx`, línea por línea

- **Líneas 1-5** — Imports de React/hooks, `client` (Axios con JWT), `useAuth`, helpers de
  formato/errores y `Prescripciones.css`.
- **Líneas 7-12** — El componente lee `usuario?.id_paciente`; si no existe, no hay consulta.
  Declara `prescripciones`, `cargando` y `error`.
- **Líneas 14-19** — El `useEffect` define `cargar()`. Si falta `idPaciente`, apaga el
  spinner y devuelve sin llamar a la API: evita un `GET /paciente/null`.
- **Líneas 21-25** — `client.get('/api/prescripciones/paciente/${idPaciente}')` usa el
  interceptor que agrega el token. `getDatos(response, [])` extrae `data` del sobre de la API
  y garantiza un array aunque la respuesta no traiga datos.
- **Líneas 26-30** — `handleApiError` traduce el error para la UI; `finally` apaga el spinner
  pase lo que pase.
- **Línea 34** — La dependencia `[idPaciente]` repite la carga si cambia la ficha vinculada.
- **Líneas 36-44** — Si la cuenta no está vinculada, muestra un aviso y no una tabla vacía.
- **Líneas 46-52** — Encabezado “Mis recetas” y alerta de error.
- **Líneas 54-62** — Spinner mientras carga; si el array está vacío, mensaje “No tenés
  recetas registradas”.
- **Líneas 63-97** — Tabla de solo lectura. `medicamentos` se une como
  `Nombre (dosis), ...`; se muestran médico, fecha formateada y estado con
  `getStatusColor()`/`getStatusBadge()`. No hay botones de alta, edición, cambio de estado
  ni eliminación.

### `src/components/Navbar.jsx` y `Dashboard.jsx`, línea por línea

- **Navbar, líneas 62-70** — El menú `admin` ya no incluye `/prescripciones`; conserva
  Dashboard, Médicos, Pacientes, Usuarios y Configuración. El comentario explica que ocultar
  el enlace no es la defensa: lo es el `requireRol()` del backend.
- **Navbar, líneas 81-87** — El menú `medico` conserva `/prescripciones`, porque es su módulo
  clínico.
- **Navbar, líneas 94-99** — El menú `paciente` agrega `/mis-recetas`, además de Dashboard,
  Mis turnos y Configuración.
- **Dashboard, líneas 326-335** — La tarjeta “Prescripciones” se agrega solo cuando
  `rol === 'medico'`; para admin no se renderiza. Las tarjetas de Turnera, Médicos y
  Pacientes siguen igual para los roles de gestión.
- **Dashboard, líneas 336-341** — La rama del paciente agrega la tarjeta “Mis recetas”, que
  enlaza a `/mis-recetas` y describe “Consultá tus recetas y su estado”.

### Verificación ejecutada

- `npm test`: **32/32** pruebas OK.
- `npm run build`: **135 módulos** transformados, build OK.
- E2E por API del mismo flujo del backend: receta creada por médico `201`; paciente dueño
  leyó la receta `200`; otro paciente recibió `403`; médico `200`; admin `403`; reserva del
  paciente `201`; segundo intento sobre el mismo slot `409`; limpieza `200`.
- No se abrió un navegador para una prueba visual manual en esta iteración. La validación de
  la UI es el build, los tests existentes y el contrato HTTP consumido por la pantalla.

## Iteración 06/11/2026: etiquetas de recetas y corrección de codificación

En **Mis recetas** los encabezados se veían como `MÃ©dico` y `Fecha EmisiÃ³n`. El texto
estaba guardado con mojibake: los bytes UTF-8 se habían interpretado como Latin-1/Windows-1252.
Además, “Fecha Emisión” no incluía la preposición “de”. La corrección es solo de
presentación: no cambian la API, los permisos, las consultas ni los datos.

### `src/components/Prescripciones/MisPrescripciones.jsx`, línea por línea

- **Línea 40** — El aviso de cuenta sin ficha pasa de `Tu cuenta todavÃ­a no estÃ¡ vinculada...`
  a `Tu cuenta todavía no está vinculada...`. Se corrigen las dos palabras dañadas y se
  conserva el mismo mensaje funcional.
- **Línea 61** — El estado vacío pasa de `No tenÃ©s recetas registradas.` a
  `No tenés recetas registradas.`. Es el texto que ve el paciente cuando la API devuelve un
  array vacío, no un error.
- **Líneas 69-70** — Los encabezados de la tabla pasan de `MÃ©dico` y `Fecha EmisiÃ³n` a
  `Médico` y `Fecha de Emisión`. La segunda etiqueta también gana la preposición “de” para
  que se lea como una frase completa y coincida con la lista clínica.
- **Líneas 82-83** — Se corrigen los mismos textos en `data-label`. Ese atributo no es
  decorativo: la tabla responsive lo usa para mostrar el nombre de la columna cuando las
  celdas se apilan en pantallas angostas. Si solo se cambiara el `<th>`, en mobile se
  seguiría viendo el texto viejo.

### `src/components/Prescripciones/ListaPrescripciones.jsx`, línea por línea

- **Línea 321** — El encabezado de la tabla médica pasa de `Fecha Emisión` a
  `Fecha de Emisión`.
- **Línea 338** — Se actualiza el `data-label` de la celda con el mismo texto. Así la vista
  de escritorio, la tabla responsive y “Mis recetas” usan la misma etiqueta.

### Verificación ejecutada

- `npm test`: **32/32** pruebas OK.
- `npm run build`: **135 módulos** transformados, build OK; el bundle servido queda como
  `dist/assets/index-d73867e6.js`.
- Se buscó `MÃ©dico`, `Fecha EmisiÃ³n` y `Fecha Emisión` en `src/`: no quedan coincidencias.
- Se comprobó el bundle compilado: contiene `Médico` y `Fecha de Emisión`, y no contiene las
  cadenas con mojibake.
- No se abrió un navegador para una prueba visual manual; la validación es la suite, el build
  y la inspección del contenido compilado.

## Publicar cambios en GitHub (paso a paso)

Este repositorio se publica en
`https://github.com/ailenquaglino089-ui/SaludWEB_Web.git`. La rama `main` está
protegida: exige un **pull request**, así que no se puede empujar directo con
`git push origin main`. Desde la carpeta `SaludWEB_Web`:

```bash
npm test                           # 1. Pruebas unitarias
npm run build                      # 2. Compilar la SPA
git status                         # 3. Ver qué archivos cambiaron
git diff                           # 4. Revisar el contenido antes de subirlo
git add README.md vite.config.js index.html src/main.jsx          # 5. Preparar archivos
git add src/components/Turnera/ReservarTurno.jsx                  # 6. Preparar archivos
git add src/components/Configuracion/Configuracion.jsx            # 7. Preparar archivos
git add src/components/Turnera/CatalogoTurnera.jsx                # 8. Preparar archivos
git add src/components/Turnera/MisTurnos.jsx                      # 9. Preparar archivos
git add src/components/Turnera/AgendaMedico.jsx                   # 10. Preparar archivos
git add src/components/Dashboard/Dashboard.jsx                    # 11. Preparar archivos
git commit -m "fix: reserva publica con ficha automatica y rutas absolutas"  # 12. Crear commit
git push origin docs/access-connectivity  # 13. Subir la rama de trabajo
gh pr create --repo ailenquaglino089-ui/SaludWEB_Web --base main --head docs/access-connectivity --title "fix: reserva publica con ficha automatica y rutas absolutas" --body "Permite vincular o crear la ficha al reservar y corrige rutas profundas y nombres en Mis turnos."  # 14. Abrir PR
gh pr merge --repo ailenquaglino089-ui/SaludWEB_Web --merge  # 15. Fusionar el PR en main
git fetch origin                   # 16. Traer el merge publicado
git log --oneline -1 origin/main   # 17. Confirmar el merge en main
git status -sb                     # 18. Debe quedar sin cambios pendientes
```

Qué hace cada línea:

1. `npm test`: corre las pruebas de Node antes de tocar el repositorio.
2. `npm run build`: compila `dist/`; verifica que la app compila y que las rutas
   de los assets quedan absolutas.
3. `git status`: lista archivos modificados, nuevos y sin seguimiento.
4. `git diff`: muestra el cambio exacto para revisar que no haya secretos ni archivos ajenos.
5. `git add README.md vite.config.js index.html src/main.jsx`: prepara la
   documentación, la base del build, el manifest/íconos y el registro del service
   worker.
6. `git add ...ReservarTurno.jsx`: prepara el formulario de vínculo dentro de la
   reserva.
7. `git add ...Configuracion.jsx`: prepara el vínculo desde configuración.
8. `git add ...CatalogoTurnera.jsx`: prepara el aviso previo a elegir horario.
9. `git add ...MisTurnos.jsx`: prepara la vista con `nombre_medico` y
   `especialidad`.
10. `git add ...AgendaMedico.jsx`: prepara la cabecera de agenda con
    `medico.especialidad`.
11. `git add ...Dashboard.jsx`: prepara los próximos turnos del paciente.
12. `git commit`: crea el commit local con el mensaje del cambio.
13. `git push`: sube la rama de trabajo (no `main`) a GitHub.
14. `gh pr create`: abre el pull request hacia `main`, que es la única vía
    permitida por la protección de la rama.
15. `gh pr merge`: fusiona el PR en `main`. Sin número porque el PR abierto es el
    de la rama actual.
16. `git fetch`: actualiza las referencias remotas sin cambiar los archivos.
17. `git log origin/main`: confirma el commit de merge publicado.
18. `git status -sb`: confirma que la rama local quedó igual a `origin`.

No subir `node_modules/`, `dist/` ni archivos con secretos; ya están cubiertos
por `.gitignore`. Si el push pide credenciales, iniciar sesión con la cuenta de
GitHub que tiene permiso sobre el repositorio.

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

## Comandos y verificaciones disponibles

Mapa completo de lo que se puede ejecutar en este repositorio, qué hace cada
comando y con qué cuidado.

| Comando | Qué hace | Riesgo / requisito |
|---|---|---|
| `npm run dev` | Levanta Vite en `0.0.0.0:5173` (localhost y red local) | Bloquea la terminal. El panel usa sondeo cada 15 s (sin SSE real). |
| `npm run build` | Compila la SPA a `dist/` | Escribe `dist/` (ignorado por git). Seguro. |
| `npm run preview` | Sirve `dist/` en `127.0.0.1:4173` | Bloquea la terminal. Es lo que necesita la prueba de PWA. |
| `npm test` | 32 pruebas unitarias (logger y correlación) | Ninguno: no necesita backend. |
| `npm run test:watch` | Las mismas pruebas en modo vigilancia | Bloquea hasta Ctrl+C. |
| `php verificar_variables.php` | Busca `var(--x)` sin definir en el CSS | Solo lectura. |
| `php ver_contraste.php` | Audita el contraste WCAG de `tokens.css` | Solo lectura. |
| `php proponer_contraste.php` | Propone ajustes de color que cumplan 4.5:1 | Solo lectura (imprime propuestas). |
| `node verificar_pwa.mjs` | 12 comprobaciones de PWA en Chromium real | Requiere build + `vite preview` + `npx playwright install chromium`. No escribe datos. |
| `node verificar_tiempo_real.mjs` | Dos sesiones aisladas y latencia del canal SSE | Requiere un backend con varios workers (Apache/nginx + PHP-FPM); con `php -S` falla a propósito. Crea y borra un turno. |

Última corrida (19/10/2026): **32/32 pruebas unitarias**, build **OK** (134
módulos), **0 variables CSS rotas**, **12/12 tokens de contraste OK** y PWA
**12/12** (incluye arranque offline y que `/api` no salga del caché).

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
abren desde el navegador, sin instalar nada. Para que eso funcione en cualquier
WiFi a la que se conecte la PC (o en un hotspot del celular):

1. Ejecutá `iniciar_saludweb.bat`. El script ya deja la API en `0.0.0.0:8000`
   y Vite en `0.0.0.0:5173`, detecta la IP local y muestra la dirección exacta.
2. Si lo hacés a mano, usá `php -S 0.0.0.0:8000 index.php` para la API; Vite ya
   escucha en `0.0.0.0` por `vite.config.js`.
3. En el celular o en otra PC de la misma red, abrí `http://<IP-DE-LA-PC>:5173`.
4. La primera vez, ejecutá como administrador
   `SaludWEB_Mobile\scripts\permitir_firewall_saludweb.bat` para habilitar los
   puertos 8000, 5173 y 8081 solo para la subred local.

No hace falta compilar (`npm run build`) para la demo: el servidor de Vite sirve
la SPA directamente.

> **Datos móviles:** el celular y la PC tienen que estar en la misma red. Si la
> PC se conecta al hotspot del celular (los datos móviles del celular), funciona.
> Si el celular usa datos móviles y la PC está en otra red, no se puede acceder
> sin publicar el sistema en Internet. Eso queda descartado: no se usa túnel
> público, Cloudflare, ngrok ni similar. El firewall limita el acceso a la
> subred local.

> Detalle pensado para el celular del médico: con el backend escuchando en la
> red, la app móvil se apunta a `http://<IP-del-servidor>:8000/api` (ver el
> README de Mobile).

### ¿Y en un celular?

Sí: la app móvil de SaludWEB corre en cualquier celular **Android o iPhone**,
sin importar la marca (Redmi, Motorola, Samsung, etc.), con **Expo Go**
escaneando un QR, con un build instalable o en un emulador/simulador, sobre la
misma API. En iPhone, verificá que Expo Go sea compatible con el SDK 53; si no,
usá un development build con EAS o actualizá el SDK. El guion completo, paso a
paso, está en el README de Mobile, sección
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

## Documentar y Publicar: El Camino al Éxito del Proyecto

Guía práctica comentada línea por línea para documentar, limpiar, preparar y publicar el proyecto con calidad profesional y lista para defensa. Incluye objetivos, revisión técnica, README, manual de instalación, arquitectura, diagrama de base de datos, preparación para el deploy, verificación y publicación, con el entregable El Paquete.

- [DOCUMENTAR_Y_PUBLICAR_EL_CAMINO_AL_EXITO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/DOCUMENTAR_Y_PUBLICAR_EL_CAMINO_AL_EXITO.md)

## Arquitectura y Sistemas Operativos aplicada al proyecto

Correspondencia entre las consignas del trabajo práctico de Arquitectura y Sistemas Operativos y la implementación real de SaludWEB, con los ejercicios de planificación corregidos y la bibliografía de referencia.

- [ARQUITECTURA_Y_SISTEMAS_OPERATIVOS_APLICADO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/ARQUITECTURA_Y_SISTEMAS_OPERATIVOS_APLICADO.md)

## Trabajos prácticos 2 e Integrador aplicados al proyecto

Resolución comentada del TP2 (planificación FCFS, SJF, SRTF, Round Robin y prioridad, y Algoritmo del Banquero) y del TP Integrador (19 consignas de arquitectura, sistemas operativos, memoria, archivos, interrupciones y redes), con la aplicación a SaludWEB y las correcciones para la entrega.

- [TRABAJO_PRACTICO_2_E_INTEGRADOR_APLICADO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/TRABAJO_PRACTICO_2_E_INTEGRADOR_APLICADO.md)

## Matemática discreta y lógica aplicadas al proyecto

Aplicación del material de cátedra de Erika R. Aab (sistemas de numeración, lógica proposicional, conjuntos, relaciones, matrices, grafos y árboles) a SaludWEB: bases y conversiones en colores, permisos y trazabilidad; tablas de verdad y reglas de autorización; conjuntos y SQL; relaciones y claves foráneas; matrices, B-tree y árboles. Incluye las actividades resueltas, las correcciones al material y la trazabilidad `archivo:línea`.

- [MATEMATICA_DISCRETA_Y_LOGICA_APLICADAS.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/MATEMATICA_DISCRETA_Y_LOGICA_APLICADAS.md)

## Probabilidad y estadística aplicadas al proyecto

Aplicación del material de cátedra de Probabilidad y Estadística a SaludWEB: estadística descriptiva e inferencial, tablas de frecuencia, medidas de tendencia central y dispersión, boxplot, probabilidad, sucesos, probabilidad condicional, independencia, probabilidad total, Bayes, variables aleatorias y distribuciones binomial, normal y Poisson. Incluye la Guía N°1 verificada, la Guía N°2 resuelta con las 500 respuestas del formulario, el análisis de los datos reales de la base de desarrollo y el segundo recuperatorio, con trazabilidad de las consultas y las limitaciones de los datos.

- [PROBABILIDAD_Y_ESTADISTICA_APLICADAS.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/PROBABILIDAD_Y_ESTADISTICA_APLICADAS.md)

## Organización empresarial aplicada al proyecto

Aplicación del material de Organización Empresarial a SaludWEB: administración como ciencia, técnica y arte; proceso administrativo y previsión; organizaciones, recursos y clasificación; organigramas de Mercería SA y Design & Harmony; documentos comerciales; roles y habilidades del administrador; emprendedor; eficacia, eficiencia y economicidad; diseño de estructuras según Mintzberg; Trabajo Integrador Final y plan de negocios. Incluye la Actividad 1, la Actividad 2 y una propuesta de estructura para la etapa inicial del proyecto.

- [ORGANIZACION_EMPRESARIAL_APLICADA.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/ORGANIZACION_EMPRESARIAL_APLICADA.md)

## Bases de Datos I: gestión de pedidos y stock aplicada al proyecto

Aplicación del Parcial II de Bases de Datos I a SaludWEB: modelo de referencia de rubros, proveedores, clientes, productos, pedidos, ítems y movimientos de stock; DER y diccionario de datos; normalización hasta 3FN; DDL de referencia; trigger que impide stock negativo; índices; vistas `vw_stock_actual` y `vw_reportes_pedidos`; las 15 consultas obligatorias; carga masiva reproducible y verificación. Explica qué tablas actuales de SaludWEB cumplen cada rol y qué extensión de farmacia e insumos haría falta. No incluye el archivo `.sql` ni el PDF de entrega del parcial.

- [BASES_DE_DATOS_I_GESTION_DE_PEDIDOS_APLICADA.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/BASES_DE_DATOS_I_GESTION_DE_PEDIDOS_APLICADA.md)

## Metodología de Sistemas II aplicada al proyecto

Aplicación del material de Metodología de Sistemas II a SaludWEB: calidad de diseño y los diez principios, SOLID, arquitectura en capas, lógica de negocio, acceso a datos, patrones, UML, evaluación heurística, prueba de usabilidad, estrategia de pruebas y resolución de los TP 1 a 3. Incluye diagramas Mermaid, trazabilidad `archivo:línea` y una deuda prioritaria de autorización.

- [METODOLOGIA_DE_SISTEMAS_II_APLICADA.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/METODOLOGIA_DE_SISTEMAS_II_APLICADA.md)

## Análisis de Datos aplicado al proyecto

Aplicación del recorrido de Análisis de Datos a SaludWEB: fuentes, inventario, calidad, estadística descriptiva, probabilidad, indicadores, visualización y límites. Analiza la base real de desarrollo (223 pacientes, 8 médicos, 25 bloques, 1 cita y 17 triages), la Guía N°2 de 500 estudiantes y las precauciones para un tablero honesto.

- [ANALISIS_DE_DATOS_APLICADO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/ANALISIS_DE_DATOS_APLICADO.md)

## Gestión de Desarrollo de Software aplicada al proyecto

Aplicación de Gestión de Desarrollo de Software a SaludWEB: alcance, EDT, fases, interesados, riesgos, calidad, configuración y el TP **Reportes e Indicadores en Proyectos de Software**. Audita el tablero publicado (85 %, 2 días, 1 bug, 9 historias y velocidad 8/10/9), lo contrasta con la evidencia del repositorio y propone un tablero con fórmula, fuente, fecha y dueño.

- [GESTION_DE_DESARROLLO_DE_SOFTWARE_APLICADA.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/GESTION_DE_DESARROLLO_DE_SOFTWARE_APLICADA.md)

## Derecho Aplicado a la Informática aplicado al proyecto

Aplicación de Derecho Aplicado a la Informática a SaludWEB: derecho público y privado, jerarquía normativa, derechos digitales, Ley 25.326, datos sensibles de salud, consentimiento, firma electrónica y digital, responsabilidad civil, prueba digital, trabajo informático, propiedad intelectual, consumidor, ciberdelitos, IA y casos de análisis. Incluye matriz legal y plan de cumplimiento. No constituye asesoramiento jurídico.

La sección **19.5** del documento deja la trazabilidad del material de cátedra: qué aportó cada archivo de la carpeta `LEGISLACIÓN`, los cinco grupos de contenido, los parciales, los trabajos prácticos y el repaso. También aclara que el PDF del Módulo 1 es un duplicado y que el archivo de asistencia es administrativo. Los archivos fuente no se copiaron al repositorio; la aplicación queda en el documento publicado.

| Archivo o grupo | Aplicación en SaludWEB | Secciones |
|---|---|---|
| Módulo 1 | Derecho público y privado, jerarquía normativa y estructura del Estado | 1, 3, 4 y 12 |
| Módulo 2 | Derecho civil y comercial aplicado a la informática | 5, 7, 10 y 11 |
| Unidad 2 | Personas, capacidad, obligaciones, contratos y responsabilidad; familia, sucesiones y derechos reales fuera de alcance | 5.1 a 5.3 y 7 |
| Unidad 3 | Subordinación, principios protectores, teletrabajo, pasantías y propiedad del código | 9.1 a 9.6 |
| Unidades 4 y 5 | Derecho informático, firma, prueba, ciberdelitos, propiedad intelectual, licencias, marcas, comercio electrónico e intermediarios | 2, 4, 6, 8, 10, 11, 12 y 13 |
| Examen conceptual Unidad 4 | Autoevaluación de conceptos | 17 |
| Trabajo áulico Unidad 4 | Libertad de expresión, medidas cautelares, intermediarios y habeas data | 14.4 a 14.6 |
| Caso 3 | IA en el empleo público | 14.2 |
| Caso 4 | Competencias nacionales y provinciales en ciberdelitos | 14.3 |
| Clase 25/09 | Tareas de cuidado, privacidad y reforma laboral Ley 27.742 | 9.2 y 9.3 |
| Actividad CloudNet | Nube, clickwrap, firma electrónica, responsabilidad y ciberseguridad | 14.1 |
| Repaso | Repaso integrador del Módulo 1 y jerarquía normativa | 1, 3, 4, 17 y 19.3 |

`ASISTENCIA Y CRITERIOS DE EVALUACIÓN` es material administrativo y no aporta contenido jurídico. `modulo 1 Alumnos (1).pdf` es el duplicado del Módulo 1.

- [DERECHO_APLICADO_A_LA_INFORMATICA_APLICADO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/DERECHO_APLICADO_A_LA_INFORMATICA_APLICADO.md)

## Cómo defender un proyecto profesional aplicado al proyecto

Guía para preparar la defensa oral de SaludWEB: qué evalúa un tribunal, cómo explicar el problema antes del código, la arquitectura cliente-servidor, la justificación de las tecnologías, la seguridad y la autenticación, la base de datos, la integridad y el tiempo real, las decisiones por pantalla, un guion de 10 minutos, las preguntas difíciles, la lista de verificación, los límites y la deuda técnica, y la trazabilidad de cada afirmación. Incluye diagramas Mermaid, un plan B para la demo y una matriz de evidencia; complementa el discurso no técnico y la demo de 3 minutos del README y la guía de producción y defensa.

- [COMO_DEFENDER_UN_PROYECTO_PROFESIONAL_APLICADO.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/COMO_DEFENDER_UN_PROYECTO_PROFESIONAL_APLICADO.md)

## Simulación de Defensa Final

Guía de ensayo comentada línea por línea para llegar a la defensa con un recorrido probado: tres rondas de práctica, guion cronometrado de 12 minutos, transiciones memorizables, demo por roles, plan B, cuatro fragmentos de código explicados línea por línea, resultados verificados, límites declarados, preguntas técnicas y metodológicas, video de respaldo y checklist final. Se apoya en la evidencia del repositorio y no inventa métricas: distingue lo medido, lo propuesto y la deuda pendiente. Está en la raíz de los tres repositorios:

- [SIMULACION_DE_DEFENSA_FINAL.md](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/SIMULACION_DE_DEFENSA_FINAL.md)

## Resumen del trabajo documental

En esta etapa se agregaron a la raíz de los tres repositorios y se enlazaron desde este README:

- La guía **Documentar y Publicar: El Camino al Éxito del Proyecto**, comentada línea por línea.
- **Arquitectura y Sistemas Operativos aplicada al proyecto**, con las consignas de la cátedra vinculadas al código y las tablas de planificación corregidas.
- **Trabajos prácticos 2 e Integrador aplicados**, con el TP2 resuelto (planificación y Algoritmo del Banquero) y las 19 consignas del TP Integrador corregidas y aplicadas.
- **Matemática discreta y lógica aplicadas**, con los sistemas de numeración, la lógica proposicional, los conjuntos, las relaciones, las matrices, los grafos y los árboles vinculados al código, las actividades resueltas y las correcciones al material.
- **Probabilidad y estadística aplicadas**, con la estadística descriptiva del proyecto, las probabilidades de los pacientes y la agenda, la Guía N°1 verificada, la Guía N°2 resuelta y las distribuciones binomial, normal y Poisson.
- **Organización empresarial aplicada**, con el proceso administrativo, los organigramas de la Actividad 2, los documentos comerciales, el diseño de estructuras, el Trabajo Integrador y el plan de negocios.
- **Bases de Datos I: gestión de pedidos y stock aplicada**, con el modelo relacional de referencia, la normalización, el DDL, las vistas, el control de stock y las 15 consultas del parcial.
- **Metodología de Sistemas II aplicada**, con calidad, SOLID, arquitectura, patrones, UML, UI/UX, pruebas y los TP 1 a 3.
- **Análisis de Datos aplicado**, con inventario, calidad, estadística descriptiva, probabilidad, indicadores y visualización sobre la base real y la Guía N°2.
- **Gestión de Desarrollo de Software aplicada**, con planificación, riesgos, calidad y la auditoría del tablero de reportes e indicadores.
- **Derecho Aplicado a la Informática aplicado**, con protección de datos de salud, consentimiento, firma, responsabilidad, prueba digital, propiedad intelectual, ciberdelitos y matriz de cumplimiento.
- **Cómo defender un proyecto profesional aplicado**, con el guion de 10 minutos, las preguntas difíciles, la matriz de evidencia, el plan B de la demo y la deuda técnica declarada.
- **Simulación de Defensa Final**, con tres rondas de ensayo, guion cronometrado, demo por roles, código explicado línea por línea, preguntas frecuentes y checklist de presentación.

No se modificó el código de la aplicación: los cambios son de documentación. También se corrigieron los acentos de las secciones nuevas de este README y se dejaron marcados los datos del TP2 que conviene confirmar con la tabla original. El detalle cronológico y los números de publicación están en el [registro de cambios](https://github.com/ailenquaglino089-ui/SaludWEB_Web/blob/main/REGISTRO_DE_CAMBIOS.md).
