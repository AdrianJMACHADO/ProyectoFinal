@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

set "VERSION_FILE=%CD%\version.txt"
if not exist "%VERSION_FILE%" (
  echo [ERROR] No existe version.txt.
  exit /b 1
)

set /p APP_VERSION=<"%VERSION_FILE%"
if "%APP_VERSION%"=="" (
  echo [ERROR] version.txt esta vacio.
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\set-version.ps1" -VersionFile "%VERSION_FILE%"
if errorlevel 1 (
  echo [ERROR] No se pudo actualizar la version del proyecto.
  exit /b 1
)

echo.
echo Publicando LaUveTickets %APP_VERSION% para iPhone...
echo Rama EAS: preview
echo Plataforma: ios
echo.
echo Nota: los cambios nativos de Android o iOS necesitan un nuevo build.
echo.

call eas.cmd update --branch preview --platform ios --message "Version %APP_VERSION% publicada desde subir-expo-go.bat"
if errorlevel 1 (
  echo [ERROR] No se pudo publicar la actualizacion.
  exit /b 1
)

echo.
echo [OK] Actualizacion iOS publicada en la rama preview.
exit /b 0
