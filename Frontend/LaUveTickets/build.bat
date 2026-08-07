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

echo.
echo LaUveTickets %APP_VERSION% - APK local
echo ----------------------------------------
echo Este proceso conserva la carpeta android y sus ajustes manuales.
echo.

set "DESTINATION=%~1"
if not defined DESTINATION (
  for /f "usebackq delims=" %%D in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Elige la carpeta donde guardar el APK'; $dialog.ShowNewFolderButton = $true; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }"`) do set "DESTINATION=%%D"
)

if not defined DESTINATION (
  set /p "DESTINATION=Escribe la carpeta destino del APK: "
)

if not defined DESTINATION (
  echo [CANCELADO] No se eligio una carpeta destino.
  exit /b 1
)

if not exist "%DESTINATION%" (
  mkdir "%DESTINATION%" 2>nul
  if errorlevel 1 (
    echo [ERROR] No se pudo crear la carpeta "%DESTINATION%".
    exit /b 1
  )
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\set-version.ps1" -VersionFile "%VERSION_FILE%"
if errorlevel 1 (
  echo [ERROR] No se pudo actualizar la version del proyecto.
  exit /b 1
)

echo.
echo Compilando APK release local...
set "NODE_ENV=production"
set "GRADLE_USER_HOME=%CD%\.gradle-user-home"
set "ANDROID_USER_HOME=%CD%\.android-user-home"
pushd "%CD%\android"
call gradlew.bat :app:assembleRelease
set "GRADLE_RESULT=%ERRORLEVEL%"
popd

if not "%GRADLE_RESULT%"=="0" (
  echo [ERROR] Gradle no pudo generar el APK.
  exit /b %GRADLE_RESULT%
)

set "SOURCE_APK=%CD%\android\app\build\outputs\apk\release\app-release.apk"
set "TARGET_APK=%DESTINATION%\LaUveTickets-%APP_VERSION%-local.apk"

if not exist "%SOURCE_APK%" (
  echo [ERROR] Gradle termino, pero no existe "%SOURCE_APK%".
  exit /b 1
)

copy /y "%SOURCE_APK%" "%TARGET_APK%" >nul
if errorlevel 1 (
  echo [ERROR] No se pudo copiar el APK a "%TARGET_APK%".
  exit /b 1
)

echo.
echo [OK] APK generado:
echo %TARGET_APK%
exit /b 0
