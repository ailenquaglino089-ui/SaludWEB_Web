# Registro de cambios y pasos del proyecto - SaludWEB

Este documento es la **cronología del trabajo** sobre el proyecto "SaludWEB"
(Sistema de gestión de citas online). Reúne, en orden, **qué se fue haciendo,
por qué y dónde quedó**, para poder revisarlo como evidencia del proceso.

Cubre los tres repositorios del proyecto:

| Repositorio | Qué es |
|---|---|
| `SaludWEB_Backend` | API REST en PHP + base SQLite |
| `SaludWEB_Web` | Aplicación web (SPA en React con Vite) |
| `SaludWEB_Mobile` | Aplicación móvil (Expo / React Native) |

Las fases anteriores (A a I: base del proyecto, CRUD, roles, PWA, tiempo real)
están en la **Agenda de Trabajo** del backend:
<https://github.com/ailenquaglino089-ui/SaludWEB_Backend/blob/main/AGENDA_DE_TRABAJO.md>

> Cómo se publica: cada cambio se hace en la rama `dev`, se abre un **Pull
> Request** y se mergea a `main`. Al día de hoy, `main` contiene **todo** lo de
> `dev` en los tres repositorios.

---

## 1. Corrección de los incidentes de seguridad (15/10/2026)

Se resolvieron dos hallazgos de la revisión de seguridad:

- **INC-001 - `GET /api/pacientes` respondía sin sesión.** Exponía datos de
  pacientes a cualquiera que llamara al endpoint. Se pasó a exigir token: sin
  sesión válida responde `401`.
- **INC-004 - el registro público aceptaba el rol `admin`.** Cualquiera podía
  crearse una cuenta de administrador. Se restringió el registro a `paciente` y
  `medico`; pedir `admin` ahora responde `422`.

Evidencia: `probar_seguridad.php` da **9/9** y la suite `tests/run.php` da
**17/17**. Los documentos de QA se actualizaron al estado "resuelto".

Dónde: `SaludWEB_Backend/routes.php`, `services/AuthService.php`,
`probar_seguridad.php`, `QA/03_reporte_de_incidentes.md`; y en Web/Mobile los
comentarios sobre protección de rutas.

Publicado en: **Backend #19**, **Web #17**, **Mobile #14**.

## 2. De XAMPP/MySQL a PHP nativo + SQLite (14-15/10/2026)

Se dejó de depender de XAMPP y MySQL:

- La base pasó a **SQLite**: es un archivo que se crea solo, sin motor aparte.
- El backend corre con el **servidor nativo de PHP** (`php -S`), sin Apache.
- El frontend (Web y Mobile) pasó a apuntar a `http://127.0.0.1:8000`.

Dónde: `SaludWEB_Backend/db.php`, `migrar_mysql_a_sqlite.php`; `vite.config.js`
y `.env.example` en la Web; `src/config.js` en Mobile.

Publicado en: **Backend #16**, **Web #14**, **Mobile #11**.

## 3. Documentación de código y de calidad (14-15/10/2026)

- **Guía de código archivo por archivo**: `GUIA_DE_CODIGO.md` y la carpeta
  `GUIA_CODIGO/` con la explicación de cada carpeta.
- **Guía de QA "de checklist a evidencia"**: `REVISAR_Y_PROBAR_EL_PROYECTO.md`
  y la carpeta `QA/` con los cinco entregables (checklist, matriz de cobertura,
  reporte de incidentes, registro de resultados y confirmación).
- **Calidad profesional del software**: `CALIDAD_PROFESIONAL_SOFTWARE.md`
  (logging estructurado y correlación de peticiones).

Publicado en: **Backend #17/#18**, **Web #15/#16**, **Mobile #12/#13**.

## 4. Puesta en marcha sin XAMPP y accesos (16/10/2026)

- Los README de los tres repos explican **cómo levantar el proyecto sin XAMPP
  ni MySQL** (backend + web).
- Se agregó la sección **"Si ves el aviso Sin conexión"** con un checklist de
  diagnóstico.
- Se documentó el **PHP propio** (portable) y se agregó `resetear_password.php`
  para recuperar la contraseña del administrador desde la consola.

Publicado en: **Backend #20**, **Web #18**, **Mobile #15**.

## 5. Lanzador de escritorio (doble clic) (16/10/2026)

Para arrancar todo sin escribir comandos:

- **`SaludWEB_Web/scripts/iniciar_saludweb.bat`**: levanta la API y la web,
  **espera a que las dos respondan de verdad** (consulta con `curl` hasta que
  contestan, sin tiempos fijos), abre **Chrome** en
  `http://localhost:5173/turnera` y deja **2 ventanas**. Si ya estaba corriendo,
  no duplica nada. Está comentado línea por línea.
- **`SaludWEB_Web/scripts/detener_saludweb.bat`**: apaga los dos servidores.
- En el **Escritorio** hay tres archivos de acceso (no carpetas): `Iniciar
  SaludWEB.bat`, `Detener SaludWEB.bat` y `COMO_USAR_SaludWEB.txt`. Son accesos
  directos que llaman a los scripts del repositorio: **no duplican el proyecto**
  y no ensucian Git (por eso no están versionados).

Publicado en: **Web #19** y **Web #20**.

## 6. Arreglo del panel "En vivo" (16/10/2026)

- **Síntoma:** "la turnera y todo lo que está adentro no funciona". Las pantallas
  se veían vacías y la sesión parecía caerse sola (redirigía a `/login`).
- **Causa:** el panel abría un canal **SSE** (`EventSource` a `/api/eventos`) que
  queda abierto hasta **5 minutos**. El servidor nativo de PHP (`php -S`) atiende
  **una petición por vez**, así que esa conexión dejaba ocupado el único hilo y
  **el resto de la API se encolaba** hasta el time-out.
- **Arreglo:** cuando el frontend corre en **modo desarrollo**, el canal se
  simula con un **sondeo cada 5 segundos** (`src/hooks/useEventosRealtime.js`).
  El canal **SSE real** se sigue usando en el build de producción, que va a un
  servidor con varios workers (Apache, nginx + PHP-FPM).
- **Verificado:** con el navegador real (Playwright), el login y las pantallas
  `/dashboard`, `/pacientes`, `/medicos`, `/prescripciones`, `/usuarios`,
  `/configuracion` y la turnera cargan con datos, sin redirigir a `/login`;
  el cartel "En vivo" queda verde y el panel se refresca solo. `npm test` 32/32
  y `npm run build` OK.

Publicado en: **Web #21**.

## 7. Guía para preparar el sistema para producción y defensa (16/10/2026)

Se agregó **`PREPARAR_SISTEMA_PARA_PRODUCCION_Y_DEFENSA.md`** a la raíz de los
tres repositorios, comentada línea por línea. Es una guía práctica para llevar un
proyecto al entorno de producción con garantías de calidad y defenderlo con
solidez. Cubre:

- **Ambientes**: desarrollo, prueba (staging/QA) y producción, con qué rol cumple
  cada uno y por qué nunca se trabaja directamente en producción.
- **Variables de configuración**: qué son los `.env`, cómo se gestionan y las
  buenas prácticas (nunca subir el archivo con secretos).
- **Deploy**: preparación del repositorio, configuración del servidor, ejecución
  del despliegue y verificación en producción; opciones de hosting (PaaS, VPS)
  y automatización con CI/CD.
- **Backups**: qué respaldar, frecuencia y retención, regla 3-2-1, herramientas
  y la importancia de probar la restauración.
- **README profesional**: estructura mínima (qué hace, cómo se instala, cómo se
  usa) y buenas prácticas.
- **Documentación funcional y técnica**: roles, casos de uso, reglas de negocio;
  arquitectura, modelo de datos, API y estructura del código.
- **Diagramas necesarios para la defensa**: Entidad-Relación, casos de uso,
  arquitectura y flujo/secuencia, con herramientas sugeridas.
- **Lista de verificación final** para la defensa del proyecto.

Cada README de Backend, Web y Mobile enlaza la guía en su sección
"Guía para preparar el sistema para producción y defensa".

Publicado en: **Backend #23/#24**, **Web #24/#25**, **Mobile #19/#20**.

## 8. Cómo presentar el proyecto y usarlo en otras computadoras (19/10/2026)

Los README de los tres repos ahora incluyen dos secciones nuevas:

- **"Cómo presentar el proyecto a alguien que no entiende de tecnología"**: el
  discurso en criollo —en una frase qué es, qué problema resuelve, qué gana cada
  persona, las preguntas típicas respondidas sin jerga y una demo de 3 minutos
  para mostrarlo en vivo—, más una analogía por repositorio (la API como caja
  registradora, la web como mostrador, la app como la app del banco).
- **"¿Se puede usar en otras computadoras?"**: qué necesita cada máquina según
  su rol (usar el sistema = solo navegador; levantarlo = PHP + Composer + Node),
  los pasos en una PC nueva, cómo atender desde la red local (`php -S
  0.0.0.0:8000` + `CORS_ORIGINS`) y lo que no hace falta (MySQL, XAMPP,
  licencias). En Mobile se agrega cómo probarla en otro celular (Expo Go / IP
  local) y qué falta para distribuirla como app instalable (EAS Build).

Publicado en: **Backend #26**, **Web #28**, **Mobile #22**.

## 9. Base de datos de desarrollo: dónde está guardada (19/10/2026)

Quedó documentado en los README que el proyecto tiene **base de datos propia desde
el desarrollo**: un archivo **SQLite** (`SaludWEB_Backend/storage/saludweb.sqlite`)
que se crea solo en el primer arranque de la API, con el esquema y los datos de
ejemplo. **No se sube a GitHub**: `storage/` está entero en `.gitignore` (más los
patrones `*.sqlite`), así que cada clone arranca con una base nueva, sin cuentas.

- El README del Backend lleva la tabla completa: qué contiene, cómo regenerar los
  datos de demo (`php sembrar_datos_demo.php`), cómo moverla (`DB_DATABASE` en el
  `.env`) y qué más guarda esa carpeta (secreto JWT, logs, rate limiting).
- Los README de Web y Mobile aclaran que esas apps no guardan datos locales
  (ni en la PC ni en el celular) y enlazan el detalle del Backend.

Publicado en: **Backend #27**, **Web #30**, **Mobile #23**.

## 10. Cómo usar la app en teléfonos (19/10/2026)

Quedó grabado en el README de Mobile la sección **"Cómo usarlo en teléfonos
(paso a paso)"**, con los tres caminos para llevar la app a un dispositivo:

- **Celular físico con Expo Go**: backend en `0.0.0.0`, IP de la PC por
  `ipconfig`, `.env` con `EXPO_PUBLIC_API_URL`, `npm start --clear`, escanear
  el QR y entrar (registro o credenciales de prueba).
- **Emulador Android** (`10.0.2.2`) e **iOS simulator** (`127.0.0.1`).
- **App instalable** con EAS Build (link de descarga; requiere cuenta de Expo).

Los README de Backend y Web agregan la sección **"¿Y en un celular?"** que
enlaza esa guía.

Publicado en: **Backend #28**, **Web #32**, **Mobile #24**.

## 11. Publicación en GitHub

| Repositorio | URL | Último merge a `main` |
|---|---|---|
| Backend | <https://github.com/ailenquaglino089-ui/SaludWEB_Backend> | `0a716c9` (PR #28) |
| Web | <https://github.com/ailenquaglino089-ui/SaludWEB_Web> | `f8b60af` (PR #32) |
| Mobile | <https://github.com/ailenquaglino089-ui/SaludWEB_Mobile> | `3064a0a` (PR #24) |

---

## Dónde mirar para revisar

- README de cada repositorio.
- Web: secciones **"Cómo abrir todo el proyecto"** y **"Ver el tiempo real
  funcionando, paso a paso"**.
- `SaludWEB_Web/scripts/iniciar_saludweb.bat` (comentado línea por línea).
- `COMO_USAR_SaludWEB.txt` (en el Escritorio).
- Documentos de QA: `QA/` y `REVISAR_Y_PROBAR_EL_PROYECTO.md`.
- Guía de producción y defensa: `PREPARAR_SISTEMA_PARA_PRODUCCION_Y_DEFENSA.md`
  (en los tres repositorios).
