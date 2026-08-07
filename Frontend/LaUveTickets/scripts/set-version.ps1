param(
    [string]$VersionFile = (Join-Path (Split-Path $PSScriptRoot -Parent) "version.txt"),
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path -LiteralPath $VersionFile -PathType Leaf)) {
    throw "No existe el archivo de version: $VersionFile"
}

$requestedVersion = ([System.IO.File]::ReadAllText($VersionFile)).Trim()
if ($requestedVersion -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') {
    throw "La version '$requestedVersion' no es valida. Usa un formato como 1.2.5."
}

$buildGradlePath = Join-Path $projectRoot "android\app\build.gradle"
$buildGradle = [System.IO.File]::ReadAllText($buildGradlePath)
$currentVersionMatch = [regex]::Match($buildGradle, 'versionName\s+"([^"]+)"')
$currentCodeMatch = [regex]::Match($buildGradle, 'versionCode\s+(\d+)')

if (-not $currentVersionMatch.Success -or -not $currentCodeMatch.Success) {
    throw "No se pudieron leer versionName y versionCode de android/app/build.gradle."
}

$currentVersion = $currentVersionMatch.Groups[1].Value
$currentVersionCode = [int]$currentCodeMatch.Groups[1].Value
$nextVersionCode = if ($requestedVersion -eq $currentVersion) {
    $currentVersionCode
} else {
    $currentVersionCode + 1
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    if (-not $CheckOnly) {
        [System.IO.File]::WriteAllText($Path, $Content, $utf8WithoutBom)
    }
}

function Replace-Required {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$Replacement,
        [Parameter(Mandatory = $true)][string]$Description
    )

    if (-not [regex]::IsMatch($Content, $Pattern)) {
        throw "No se encontro $Description."
    }

    return [regex]::Replace($Content, $Pattern, $Replacement, 1)
}

$appJsonPath = Join-Path $projectRoot "app.json"
$appJson = [System.IO.File]::ReadAllText($appJsonPath)
$appJson = Replace-Required $appJson '("version"\s*:\s*")[^"]+(")' "`${1}$requestedVersion`${2}" "expo.version en app.json"
$appJson = Replace-Required $appJson '("runtimeVersion"\s*:\s*")[^"]+(")' "`${1}$requestedVersion`${2}" "expo.runtimeVersion en app.json"
$appJson = Replace-Required $appJson '("versionCode"\s*:\s*)\d+' "`${1}$nextVersionCode" "android.versionCode en app.json"
Write-Utf8File -Path $appJsonPath -Content $appJson

$packageJsonPath = Join-Path $projectRoot "package.json"
$packageJson = [System.IO.File]::ReadAllText($packageJsonPath)
$packageJson = Replace-Required $packageJson '("version"\s*:\s*")[^"]+(")' "`${1}$requestedVersion`${2}" "version en package.json"
Write-Utf8File -Path $packageJsonPath -Content $packageJson

$packageLockPath = Join-Path $projectRoot "package-lock.json"
$packageLock = [System.IO.File]::ReadAllText($packageLockPath)
$versionReplacementCount = 0
$packageLock = [regex]::Replace(
    $packageLock,
    '("version"\s*:\s*")[^"]+(")',
    {
        param($match)
        if ($versionReplacementCount -lt 2) {
            $script:versionReplacementCount++
            return $match.Groups[1].Value + $requestedVersion + $match.Groups[2].Value
        }
        return $match.Value
    }
)
if ($versionReplacementCount -ne 2) {
    throw "No se pudieron actualizar las dos versiones principales de package-lock.json."
}
Write-Utf8File -Path $packageLockPath -Content $packageLock

$buildGradle = Replace-Required $buildGradle 'versionCode\s+\d+' "versionCode $nextVersionCode" "versionCode en build.gradle"
$buildGradle = Replace-Required $buildGradle 'versionName\s+"[^"]+"' "versionName `"$requestedVersion`"" "versionName en build.gradle"
Write-Utf8File -Path $buildGradlePath -Content $buildGradle

$stringsPath = Join-Path $projectRoot "android\app\src\main\res\values\strings.xml"
$stringsXml = [System.IO.File]::ReadAllText($stringsPath)
$stringsXml = Replace-Required `
    $stringsXml `
    '(<string name="expo_runtime_version">)[^<]+(</string>)' `
    "`${1}$requestedVersion`${2}" `
    "expo_runtime_version en strings.xml"
Write-Utf8File -Path $stringsPath -Content $stringsXml

$mode = if ($CheckOnly) { "COMPROBACION" } else { "ACTUALIZADO" }
Write-Host "[$mode] Version: $requestedVersion"
Write-Host "[$mode] Android versionCode: $nextVersionCode"
Write-Host "[$mode] Archivos: app.json, package.json, package-lock.json, build.gradle y strings.xml"
