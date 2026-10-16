@echo off
REM ============================================================================
REM  iniciar_saludweb.bat  -  Levanta TODO SaludWEB en Windows (API + web)
REM ============================================================================
REM  Que hace:
REM    1) arranca la API (backend PHP) en http://127.0.0.1:8000
REM    2) arranca la web (SPA de Vite) en http://localhost:5173
REM    3) espera a que AMBOS respondan y abre CHROME en /turnera
REM
REM  Cada servidor vive en su propia ventana ("SaludWEB API" y "SaludWEB Web").
REM  Esta ventana de arranque se CIERRA SOLA cuando termina: por eso quedan
REM  exactamente 2 ventanas abiertas (mas el navegador).
REM
REM  NO requiere XAMPP ni MySQL: busca un PHP propio y la base es un archivo
REM  SQLite que se crea solo.
REM
REM  Como se usa:
REM    - Doble clic, o
REM    - Desde una terminal:  SaludWEB_Web\scripts\iniciar_saludweb.bat
REM
REM  Requisito: el repo SaludWEB_Backend tiene que estar como carpeta HERMANA
REM  de SaludWEB_Web (asi vienen en el workspace del proyecto).
REM ============================================================================

REM --- 1) Rutas base ----------------------------------------------------------
REM  %~dp0 es la carpeta de ESTE .bat (con barra final).
REM  for %%~fI normaliza la ruta (resuelve los ".." a una ruta absoluta limpia).
for %%I in ("%~dp0..") do set "WEB_DIR=%%~fI"
for %%I in ("%~dp0..\..\SaludWEB_Backend") do set "BACKEND_DIR=%%~fI"

REM --- 2) Elegir el interprete de PHP -----------------------------------------
REM  Orden de preferencia:
REM    a) la variable de entorno SALUDWEB_PHP (por si la queres fijar a mano);
REM    b) la instalacion portable documentada en el README (sin XAMPP);
REM    c) el comando "php" que este en el PATH.
set "PHP=%SALUDWEB_PHP%"
if not defined PHP if exist "C:\Users\AILEN\php83\php.exe" set "PHP=C:\Users\AILEN\php83\php.exe"
if not defined PHP set "PHP=php"

REM  Comprobar que PHP responde antes de intentar levantar la API.
"%PHP%" -v >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro PHP.
  echo         Instalalo ^(ver el README^) o defini la variable SALUDWEB_PHP.
  pause
  exit /b 1
)

REM  Comprobar que el repo hermano del backend exista.
if not exist "%BACKEND_DIR%\index.php" (
  echo [ERROR] No encuentro el backend en: "%BACKEND_DIR%"
  echo         Clona SaludWEB_Backend como carpeta hermana de SaludWEB_Web.
  pause
  exit /b 1
)

REM --- 3) Levantar la API (servidor nativo de PHP) ----------------------------
REM  Antes de arrancar se pregunta si ya esta arriba. Asi, si haces doble clic
REM  dos veces seguidas, NO se abren ventanas de mas ni choca el puerto.
REM  -s -f -o NUL: modo silencioso, y devuelve error si la respuesta es 4xx/5xx.
curl.exe -s -f -o NUL "http://127.0.0.1:8000/api/health"
if not errorlevel 1 (
  echo La API ya estaba corriendo en http://127.0.0.1:8000
) else (
  REM  php -S 127.0.0.1:8000 index.php -> servidor de desarrollo con index.php
  REM  como front controller (equivale a "composer run dev").
  echo Levantando la API en http://127.0.0.1:8000 ...
  start "SaludWEB API" /D "%BACKEND_DIR%" "%PHP%" -S 127.0.0.1:8000 index.php
)

REM --- 4) Levantar la web (Vite) ----------------------------------------------
REM  cmd /k mantiene la ventana abierta para poder ver los logs de Vite.
curl.exe -s -f -o NUL "http://localhost:5173/"
if not errorlevel 1 (
  echo La web ya estaba corriendo en http://localhost:5173
) else (
  echo Levantando la web en http://localhost:5173 ...
  start "SaludWEB Web" /D "%WEB_DIR%" cmd /k "npm run dev"
)

REM --- 5) Esperar a que la API y la web respondan -----------------------------
REM  Antes se esperaba un tiempo FIJO y el navegador se abria aunque Vite
REM  todavia no estuviera listo: la pagina quedaba en blanco. Ahora se consultan
REM  los dos servidores hasta que contesten (o hasta agotar los intentos).
REM  La subrutina :esperar esta definida al final del archivo.
call :esperar "http://127.0.0.1:8000/api/health" 30
call :esperar "http://localhost:5173/" 30

REM --- 6) Abrir CHROME en la turnera ------------------------------------------
REM  Se busca Chrome en las tres ubicaciones habituales. Si esta, se abre ahi
REM  directo en /turnera (la pagina publica para sacar turno). Si no, se abre el
REM  navegador por defecto. En ningun caso se abre Edge a proposito.
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "http://localhost:5173/turnera"
) else (
  start "" "http://localhost:5173/turnera"
)

REM  Esta ventana se cierra sola. Quedan abiertas SOLO "SaludWEB API" y
REM  "SaludWEB Web". Para apagar todo:  scripts\detener_saludweb.bat
exit /b 0

REM --- Subrutina :esperar -----------------------------------------------------
REM  Uso:  call :esperar "URL" intentos
REM  Prueba la URL cada ~1 segundo y devuelve 0 apenas responde, o 1 si se
REM  agotan los intentos. "errorlevel 0" significa que el servidor contesto.
:esperar
set "ESP_URL=%~1"
for /L %%i in (1,1,%~2) do (
  curl.exe -s -f -o NUL "%ESP_URL%"
  if not errorlevel 1 exit /b 0
  ping -n 2 127.0.0.1 >nul
)
exit /b 1
