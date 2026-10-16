@echo off
REM ============================================================================
REM  detener_saludweb.bat  -  Apaga los servidores de SaludWEB (8000 y 5173)
REM ============================================================================
REM  Que hace:
REM    Cierra lo que este escuchando en el puerto 8000 (API PHP) y en el
REM    puerto 5173 (web Vite). Sirve para liberar los puertos despues de
REM    ejecutar iniciar_saludweb.bat.
REM
REM  Usa PowerShell (Get-NetTCPConnection) porque es mas confiable que parsear
REM  la salida de "netstat".
REM ============================================================================

echo Deteniendo los servidores de SaludWEB...

REM  Get-NetTCPConnection -State Listen -LocalPort 8000,5173
REM     -> busca las conexiones EN ESCUCHA de esos dos puertos.
REM  Select-Object -Expand OwningProcess -Unique
REM     -> de cada una saca el PID del proceso dueño, sin repetidos.
REM  ForEach-Object { Stop-Process -Id $_ -Force }
REM     -> mata ese proceso a la fuerza.
REM  -ErrorAction SilentlyContinue en todo: si un puerto ya estaba libre, no rompe.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "Get-NetTCPConnection -State Listen -LocalPort 8000,5173 -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Listo. Los puertos 8000 y 5173 quedaron libres.
REM  Pequena pausa para poder leer el mensaje antes de que se cierre la ventana.
ping -n 4 127.0.0.1 >nul
