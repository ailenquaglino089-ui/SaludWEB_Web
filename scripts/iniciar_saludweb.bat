@echo off
setlocal EnableExtensions

set "AUTOSTART=0"
if /I "%~1"=="/autostart" set "AUTOSTART=1"
set "START_MIN="
if "%AUTOSTART%"=="1" set "START_MIN=/MIN"

REM ============================================================================
REM  iniciar_saludweb.bat  -  Levanta TODO SaludWEB en Windows (API + web)
REM ============================================================================
REM  Que hace:
REM    1) detecta la IP local de la PC (WiFi, cable o hotspot);
REM    2) arranca la API (backend PHP) en 0.0.0.0:8000;
REM    3) arranca la web (SPA de Vite) en 0.0.0.0:5173;
REM    4) espera a que AMBOS respondan y abre Chrome en /turnera.
REM
REM  Con 0.0.0.0 la API y la web aceptan conexiones desde cualquier celular
REM  conectado a la MISMA red que la PC. Para acceso desde cualquier red se
REM  usa Tailscale Funnel: https://desktop-5f7743f.taileeeb72.ts.net
REM
REM  Cada servidor vive en su propia ventana ("SaludWEB API" y "SaludWEB Web").
REM  Esta ventana de arranque se CIERRA SOLA cuando termina.
REM
REM  Como se usa:
REM    - Doble clic, o
REM    - Desde una terminal:  SaludWEB_Web\scripts\iniciar_saludweb.bat
REM
REM  Requisito: el repo SaludWEB_Backend tiene que estar como carpeta HERMANA
REM  de SaludWEB_Web (asi vienen en el workspace del proyecto).
REM ============================================================================

REM --- 1) Rutas base ----------------------------------------------------------
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

REM --- 3) Detectar la IP local (WiFi, cable o hotspot) -----------------------
set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|VirtualBox|VMware|Bluetooth|Tailscale|ZeroTier|Hamachi' } | Sort-Object { if ($_.InterfaceAlias -like '*Wi-Fi*') { 0 } elseif ($_.InterfaceAlias -like '*Ethernet*') { 1 } else { 2 } } | Select-Object -First 1 -ExpandProperty IPAddress; $ip"`) do set "LAN_IP=%%I"

if not defined LAN_IP (
  echo [AVISO] No se pudo detectar una IP de red local.
  echo         La PC puede seguir usando http://localhost:5173, pero el
  echo         celular no va a poder conectarse hasta que estes en una red.
  set "LAN_IP=127.0.0.1"
)

echo IP local detectada: %LAN_IP%

REM --- 4) Levantar la API (servidor nativo de PHP) ----------------------------
REM  Antes de arrancar se pregunta si ya esta arriba. Asi, si haces doble clic
REM  dos veces seguidas, NO se abren ventanas de mas ni choca el puerto.
set "API_BIND="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $c.LocalAddress }"`) do set "API_BIND=%%I"

if defined API_BIND (
  if "%API_BIND%"=="127.0.0.1" set "API_BIND=LOCALHOST"
  if "%API_BIND%"=="::1" set "API_BIND=LOCALHOST"
)

if "%API_BIND%"=="LOCALHOST" (
  echo [ERROR] La API esta escuchando SOLO para esta PC en 127.0.0.1:8000.
  echo         Cierra la ventana "SaludWEB API" o ejecuta:
  echo         scripts\detener_saludweb.bat
  echo         y volve a abrir este script.
  pause
  exit /b 1
)

if defined API_BIND (
  echo La API ya estaba corriendo en %API_BIND%:8000
) else (
  echo Levantando la API en 0.0.0.0:8000 ...
  start "SaludWEB API" %START_MIN% /D "%BACKEND_DIR%" "%PHP%" -S 0.0.0.0:8000 index.php
)

REM --- 5) Levantar la web (Vite) ----------------------------------------------
set "WEB_BIND="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $c.LocalAddress }"`) do set "WEB_BIND=%%I"

if defined WEB_BIND (
  if "%WEB_BIND%"=="127.0.0.1" set "WEB_BIND=LOCALHOST"
  if "%WEB_BIND%"=="::1" set "WEB_BIND=LOCALHOST"
)

if "%WEB_BIND%"=="LOCALHOST" (
  echo [ERROR] La web esta escuchando SOLO para esta PC en 127.0.0.1:5173.
  echo         Cierra la ventana "SaludWEB Web" o ejecuta:
  echo         scripts\detener_saludweb.bat
  echo         y volve a abrir este script.
  pause
  exit /b 1
)

if defined WEB_BIND (
  echo La web ya estaba corriendo en %WEB_BIND%:5173
) else (
  echo Levantando la web en 0.0.0.0:5173 ...
  start "SaludWEB Web" %START_MIN% /D "%WEB_DIR%" cmd /k "npm run build && npm run preview -- --host 0.0.0.0 --port 5173 --strictPort"
)

REM --- 6) Esperar a que la API y la web respondan -----------------------------
call :esperar "http://127.0.0.1:8000/api/health" 30
call :esperar "http://127.0.0.1:5173/" 30

REM --- 7) Avisar si falta la regla de firewall --------------------------------
netsh advfirewall firewall show rule name="SaludWEB API 8000" >nul 2>&1
if errorlevel 1 (
  echo.
  echo [AVISO] Windows Firewall no tiene la regla para el puerto 8000.
  echo         Ejecuta como administrador:
  echo         ..\SaludWEB_Mobile\scripts\permitir_firewall_saludweb.bat
)

netsh advfirewall firewall show rule name="SaludWEB Web 5173" >nul 2>&1
if errorlevel 1 (
  echo.
  echo [AVISO] Windows Firewall no tiene la regla para el puerto 5173.
  echo         Ejecuta como administrador:
  echo         ..\SaludWEB_Mobile\scripts\permitir_firewall_saludweb.bat
)

REM --- 8) Abrir Chrome en la turnera ------------------------------------------
if "%AUTOSTART%"=="1" goto :saltar_navegador
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "http://localhost:5173/turnera"
) else (
  start "" "http://localhost:5173/turnera"
)

:saltar_navegador
echo.
echo ============================================================================
echo  En esta PC:      http://localhost:5173
echo  Desde el celu:   http://%LAN_IP%:5173
echo  API para el celu: http://%LAN_IP%:8000/api/health
echo  Desde cualquier red (WiFi o datos móviles):
echo                   https://desktop-5f7743f.taileeeb72.ts.net
echo.
echo  En la misma red usá la IP local. Fuera de casa usá la URL de Tailscale;
echo  la PC tiene que quedar encendida y con Internet.
echo  Si la PC usa los datos del celular como hotspot, tambien funciona:
echo  el celular y la PC quedan en la misma red local.
echo.
echo  Para apagar todo: scripts\detener_saludweb.bat
echo ============================================================================
ping -n 6 127.0.0.1 >nul
exit /b 0

REM --- Subrutina :esperar -----------------------------------------------------
REM  Uso:  call :esperar "URL" intentos
:esperar
set "ESP_URL=%~1"
for /L %%i in (1,1,%~2) do (
  curl.exe -s -f -o NUL "%ESP_URL%"
  if not errorlevel 1 exit /b 0
  ping -n 2 127.0.0.1 >nul
)
exit /b 1
