@echo off
REM ============================================================================
REM  iniciar_saludweb.bat  -  Levanta TODO SaludWEB en Windows (API + web)
REM ============================================================================
REM  Que hace:
REM    1) arranca la API (backend PHP) en http://127.0.0.1:8000
REM    2) arranca la web (SPA de Vite) en http://localhost:5173
REM    3) espera unos segundos y abre el navegador
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
REM  php -S 127.0.0.1:8000 index.php  ->  servidor de desarrollo con index.php
REM  como front controller (equivalente a "composer run dev").
REM  Se abre en una VENTANA NUEVA titulada "SaludWEB API" que hay que dejar abierta.
echo Levantando la API en http://127.0.0.1:8000 ...
start "SaludWEB API" /D "%BACKEND_DIR%" "%PHP%" -S 127.0.0.1:8000 index.php

REM --- 4) Levantar la web (Vite) ----------------------------------------------
REM  cmd /k mantiene la ventana abierta para ver los logs de Vite.
echo Levantando la web en http://localhost:5173 ...
start "SaludWEB Web" /D "%WEB_DIR%" cmd /k "npm run dev"

REM --- 5) Esperar y abrir el navegador ----------------------------------------
REM  "ping" se usa como pausa porque "timeout" falla cuando la entrada esta
REM  redirigida. -n 8 equivale a ~7 segundos, tiempo de sobra para que Vite arranque.
ping -n 8 127.0.0.1 >nul
start "" "http://localhost:5173"

echo.
echo Listo. Si ves el cartel "Sin conexion", revisa que la ventana
echo "SaludWEB API" siga abierta y que http://127.0.0.1:8000/api/health responda.
echo Para apagar todo, ejecuta: scripts\detener_saludweb.bat
echo.
pause
