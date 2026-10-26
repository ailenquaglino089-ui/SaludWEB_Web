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

## 11. Mapa de comandos, riesgos y verificaciones ejecutadas (19/10/2026)

Los tres README agregaron la sección **"Comandos y verificaciones
disponibles"**: cada comando con qué hace y qué riesgo o requisito tiene (qué
bloquea la terminal, qué escribe la base, qué necesita servidor o navegador).

Ese mismo día se ejecutaron en esta máquina:

| Repo | Verificación | Resultado |
|---|---|---|
| Backend | `php -l` sobre 80 archivos | 0 errores de sintaxis |
| Backend | `php tests/run.php` | 50/50 pruebas (5 clases) |
| Backend | `verificar_turnera`, `probar_vinculacion`, `probar_roles`, `probar_seguridad`, `probar_turnera`, `probar_tiempo_real`, `probar_roles_http` | todo `EXIT=0`; los datos temporales se borraron |
| Web | `npm test` | 32/32 |
| Web | `verificar_variables.php` | 0 variables CSS rotas |
| Web | `ver_contraste.php` | 12/12 tokens OK |
| Web | `npm run build` | OK, 134 módulos |
| Web | `verificar_pwa.mjs` | 12/12 (offline y caché de `/api`) |
| Mobile | `npm test` | 27/27 |
| Mobile | `npm run export` | OK (iOS 633 / Android 636 módulos) |

Riesgos que quedaron documentados: `npm run dev` y `composer run dev` bloquean
la terminal (y `php -S` no sostiene SSE); `verificar_tiempo_real.mjs` necesita
Apache/nginx + PHP-FPM; `npm run web` de Mobile requiere `react-native-web` y
`react-dom`; `seed_pacientes`, `resetear_password`, `sembrar_datos_demo` y
`migrar_mysql_a_sqlite` escriben la base; `listar_usuarios.php` no debe
desplegarse en producción.

Publicado en: **Backend #29**, **Web #34**, **Mobile #25**.

## 12. Documentar y Publicar: El Camino al Éxito del Proyecto (19/10/2026)

Se agregó DOCUMENTAR_Y_PUBLICAR_EL_CAMINO_AL_EXITO.md a la raíz de los tres repositorios, comentada línea por línea. La guía cubre objetivos, revisión técnica, README, manual de instalación, arquitectura, diagrama de base de datos, preparación para el deploy, verificación y publicación, y el entregable El Paquete. Cada README enlaza la guía en su nueva sección.

Publicado en: Backend #30, Web #36, Mobile #26.

## 13. Arquitectura y Sistemas Operativos aplicada al proyecto (19/10/2026)

Se agregó ARQUITECTURA_Y_SISTEMAS_OPERATIVOS_APLICADO.md a la raíz de los tres repositorios. El documento vincula las consignas del trabajo práctico de Arquitectura y Sistemas Operativos con evidencia real del proyecto (ciclo de una petición, modelo de capas, llamadas al sistema, jerarquía de memoria, modelos de ejecución, PCB, estados, concurrencia y deadlock), y corrige el ejercicio de planificación: las tablas de FCFS, SJF, SRTF, Round Robin con quantum 2 y prioridad expropiativa y no expropiativa se rehicieron respetando los tiempos de llegada. La conclusión corregida indica que SRTF obtiene el mejor tiempo de espera y de retorno promedio, Round Robin el mejor tiempo de respuesta, y que la inanición no es exclusiva de la planificación por prioridad. También se corrigieron los acentos de la sección de la guía anterior en los tres README.

Publicado en: Backend #31, Web #37, Mobile #27.

## 14. TP2 y TP Integrador de Sistemas Operativos aplicados (19/10/2026)

Se agregó TRABAJO_PRACTICO_2_E_INTEGRADOR_APLICADO.md a la raíz de los tres repositorios, con la carátula de ambos trabajos. Incluye la resolución del TP2 (FCFS, SJF, SRTF, Round Robin con quantum 2 y prioridad expropiativa, con los tiempos de llegada respetados) y el método del Algoritmo del Banquero con un ejemplo propio de workers, además de las 19 consignas del TP Integrador corregidas y aplicadas al proyecto (memoria virtual, reemplazo de páginas, archivos, sistemas de archivos, interrupciones, topologías, OSI/TCP-IP, IPv4/IPv6 y clases de IP). Quedó señalado que la tabla del TP2 se interpretó y que la del Banquero debe confirmarse con la tabla original.

Publicado en: Backend #32, Web #39, Mobile #28.

Los tres README incluyen, además, un resumen del trabajo documental realizado, con el alcance de los cambios y el enlace a este registro.

## 15. Publicación en GitHub

| Repositorio | URL | Merge que publicó este documento |
|---|---|---|
| Backend | <https://github.com/ailenquaglino089-ui/SaludWEB_Backend> | `da4ac5c` (PR #34) |
| Web | <https://github.com/ailenquaglino089-ui/SaludWEB_Web> | `df6bd70` (PR #42) |
| Mobile | <https://github.com/ailenquaglino089-ui/SaludWEB_Mobile> | `8a2b774` (PR #30) |

## 16. Matemática discreta y lógica aplicadas al proyecto (25/10/2026)

Se agregó MATEMATICA_DISCRETA_Y_LOGICA_APLICADAS.md a la raíz de los tres repositorios. El documento aplica el material de cátedra de Erika R. Aab: sistemas de numeración (conversiones, complemento a dos, permisos en octal, colores hexadecimales, IDs y JWT), lógica proposicional (tablas de verdad, De Morgan, condicional y contrapositivo, falacias y demostraciones), conjuntos (operaciones y su traducción a SQL), relaciones (equivalencia, orden y la función parcial de turnos), matrices y grafos (adyacencia, B-tree, claves foráneas y árboles).

Resuelve las actividades del material, corrige el error de la suma `1101 + 1101` y las deformaciones de símbolos, y agrega una tabla de trazabilidad `archivo:línea`. Los tres README enlazan el documento.

Publicado en: **Backend #34**, **Web #42**, **Mobile #30**.

La corrección de las tablas de conjuntos se publicó en: **Backend #35**, **Web #44**, **Mobile #31**.

## 17. Probabilidad y estadística aplicadas al proyecto (25/10/2026)

Se agregó PROBABILIDAD_Y_ESTADISTICA_APLICADAS.md a la raíz de los tres repositorios. El documento aplica el material de cátedra de Probabilidad y Estadística a SaludWEB: estadística descriptiva e inferencial, tablas de frecuencia, medidas de tendencia central y dispersión, boxplot, probabilidad, sucesos, probabilidad condicional, independencia, probabilidad total, Bayes, variables aleatorias y distribuciones binomial, normal y Poisson. Incluye la Guía N°1 verificada, la Guía N°2 resuelta con las 500 respuestas del formulario, el análisis de los datos reales de la base de desarrollo y el segundo recuperatorio, con trazabilidad de las consultas y las limitaciones de los datos. Los tres README enlazan el documento.

Publicado en: **Backend #36**, **Web #46**, **Mobile #32**.

## 18. Organización empresarial aplicada al proyecto (25/10/2026)

Se agregó ORGANIZACION_EMPRESARIAL_APLICADA.md a la raíz de los tres repositorios. El documento aplica el material de cátedra de Organización Empresarial a SaludWEB: la administración como ciencia, técnica y arte; el proceso administrativo y la previsión; las organizaciones, sus recursos y su clasificación; la Actividad 1 resuelta; los organigramas de Mercería SA y Design & Harmony de la Actividad 2, con sus errores y propuestas de mejora; los documentos comerciales; los roles y las habilidades del administrador; el emprendedor; eficacia, eficiencia y economicidad; el diseño de la estructura organizativa según Mintzberg; el Trabajo Integrador Final y el plan de negocios. Aclara que SaludWEB no es una empresa constituida, que la estructura y el plan son propuestas para la etapa inicial y que los importes del plan son un ejemplo didáctico. Los tres README enlazan el documento.

Publicado en: **Backend #36**, **Web #46**, **Mobile #32**.

## 19. Bases de Datos I: gestión de pedidos y stock aplicada al proyecto (25/10/2026)

Se agregó BASES_DE_DATOS_I_GESTION_DE_PEDIDOS_APLICADA.md a la raíz de los tres repositorios. El documento aplica el Parcial II de Bases de Datos I a SaludWEB: modelo de referencia de rubros, proveedores, clientes, productos, pedidos, ítems y movimientos de stock; equivalencias con las tablas actuales del proyecto; DER y diccionario de datos; normalización hasta 3FN; DDL de referencia para MySQL 8/MariaDB; integridad referencial y trigger que impide stock negativo; índices y criterios de rendimiento; vistas `vw_stock_actual` y `vw_reportes_pedidos`; las 15 consultas obligatorias con explicación; carga masiva reproducible; verificación y límites. Aclara que no incluye el archivo `.sql` ni el PDF de entrega y que el módulo de farmacia e insumos es una propuesta, no una funcionalidad implementada. Los tres README enlazan el documento.

Publicado en: **Backend #37**, **Web #47**, **Mobile #33**.

## 20. Metodología de Sistemas II aplicada al proyecto (25/10/2026)

Se agregó METODOLOGIA_DE_SISTEMAS_II_APLICADA.md a la raíz de los tres repositorios. Aplica calidad de diseño y los diez principios, SOLID, arquitectura en capas, lógica de negocio, acceso a datos, patrones, UML, representación lógica, documentación, evaluación heurística, prueba de usabilidad, estrategia de pruebas y los TP 1 a 3. Incluye diagramas Mermaid, trazabilidad `archivo:línea`, hallazgos priorizados y una deuda alta de autorización en pacientes y prescripciones. Los tres README enlazan el documento.

Publicado en: **Backend #38**, **Web #48**, **Mobile #34**.

## 21. Análisis de Datos aplicado al proyecto (25/10/2026)

Se agregó ANALISIS_DE_DATOS_APLICADO.md a la raíz de los tres repositorios. Aplica fuentes, inventario, diccionario, calidad de datos, estadística descriptiva, probabilidad, indicadores, visualización y límites. Analiza la base real de desarrollo (223 pacientes, 8 médicos, 25 bloques, 1 cita y 17 triages), la Guía N°2 de 500 estudiantes y las precauciones para un tablero honesto; incluye consultas de reproducción y recomendaciones priorizadas. Los tres README enlazan el documento.

Publicado en: **Backend #38**, **Web #48**, **Mobile #34**.

## 22. Gestión de Desarrollo de Software aplicada al proyecto (25/10/2026)

Se agregó GESTION_DE_DESARROLLO_DE_SOFTWARE_APLICADA.md a la raíz de los tres repositorios. Aplica alcance, EDT, fases, equipo, interesados, cronograma, riesgos, calidad, configuración, cambios y el TP **Reportes e Indicadores en Proyectos de Software**. Audita el tablero publicado (85 %, 2 días, 1 bug, 9 historias y velocidad 8/10/9), lo contrasta con la evidencia del repositorio, corrige la referencia a XAMPP/MySQL y propone un tablero con fórmula, fuente, fecha y dueño. Los tres README enlazan el documento.

Publicado en: **Backend #38**, **Web #48**, **Mobile #34**.

## 23. Derecho Aplicado a la Informática aplicado al proyecto (25/10/2026)

Se agregó DERECHO_APLICADO_A_LA_INFORMATICA_APLICADO.md a la raíz de los tres repositorios. Aplica derecho público y privado, jerarquía normativa, derechos digitales, Ley 25.326, datos sensibles de salud, consentimiento, derechos del titular, firma electrónica y digital, Ley 27.553 de receta electrónica, responsabilidad civil, prueba digital, derecho laboral, propiedad intelectual, licencias, consumidor, ciberdelitos, IA y casos de análisis. Incluye matriz legal y plan de cumplimiento para SaludWEB. Aclara que no constituye asesoramiento jurídico. Los tres README enlazan el documento.

Publicado en: **Backend #38**, **Web #48**, **Mobile #34**.

## 24. Cómo defender un proyecto profesional aplicado al proyecto (25/10/2026)

Se agregó COMO_DEFENDER_UN_PROYECTO_PROFESIONAL_APLICADO.md a la raíz de los tres repositorios. Prepara la defensa oral de SaludWEB: qué evalúa un tribunal, el problema antes del código, la arquitectura cliente-servidor, la justificación de las tecnologías, la seguridad y la autenticación, la base de datos, la integridad y el tiempo real, las decisiones por pantalla, un guion de 10 minutos, las preguntas difíciles, la lista de verificación, los límites y la deuda técnica, y la trazabilidad de cada afirmación. Incluye diagramas Mermaid, un plan B para la demo y una matriz de evidencia; complementa el discurso no técnico y la demo de 3 minutos del README, y la guía de producción y defensa. Los tres README enlazan el documento.

Publicado en: **Backend #38**, **Web #48**, **Mobile #34**.

## 25. Trazabilidad del material de legislación aplicado (26/10/2026)

Se agregó la sección **19.5 Material de cátedra aplicado** a `DERECHO_APLICADO_A_LA_INFORMATICA_APLICADO.md` en los tres repositorios. Documenta qué aportó cada archivo de la carpeta `LEGISLACIÓN` y en qué sección del documento se aplicó: los cinco grupos de contenido (módulos y unidades), los parciales, los trabajos prácticos y el material de repaso. También aclara que el PDF del Módulo 1 es un duplicado y que el archivo de asistencia y criterios es administrativo. No se copiaron los archivos fuente al repositorio; la aplicación queda trazada en el documento publicado.

Publicado en: **Backend #39**, **Web #50**, **Mobile #35**.

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
- Trabajo práctico de Sistemas Operativos aplicado:
  `ARQUITECTURA_Y_SISTEMAS_OPERATIVOS_APLICADO.md` (en los tres repositorios).
- TP2 y TP Integrador aplicados:
  `TRABAJO_PRACTICO_2_E_INTEGRADOR_APLICADO.md` (en los tres repositorios).
- Matemática discreta y lógica aplicadas:
  `MATEMATICA_DISCRETA_Y_LOGICA_APLICADAS.md` (en los tres repositorios).
- Probabilidad y estadística aplicadas:
  `PROBABILIDAD_Y_ESTADISTICA_APLICADAS.md` (en los tres repositorios).
- Organización empresarial aplicada:
  `ORGANIZACION_EMPRESARIAL_APLICADA.md` (en los tres repositorios).
- Bases de Datos I: gestión de pedidos y stock aplicada:
  `BASES_DE_DATOS_I_GESTION_DE_PEDIDOS_APLICADA.md` (en los tres repositorios).
- Cómo defender un proyecto profesional aplicado:
  `COMO_DEFENDER_UN_PROYECTO_PROFESIONAL_APLICADO.md` (en los tres repositorios).
