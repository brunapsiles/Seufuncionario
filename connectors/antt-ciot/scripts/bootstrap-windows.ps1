param(
  [Parameter(Mandatory=$true)]
  [string]$AnttPackageUrl,

  [string]$DcsUrl = "",
  [string]$EnvironmentName = "Production",
  [string]$InstallRoot = "C:\ToDoGreen\AnttCiotConnector",
  [string]$AnttRoot = "C:\ANTT\CIOT",
  [string]$AnttExecutablePath = "",
  [string]$ListenUrl = "http://127.0.0.1:8088",
  [string]$ServiceName = "ToDoGreenAnttCiotConnector"
)

$ErrorActionPreference = "Stop"

function New-Token {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd("=")
}

function Require-Command($Name, $Message) {
  if (!(Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw $Message
  }
}

Require-Command "dotnet" "Instale o .NET 8 SDK no servidor Windows antes de rodar este script."

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$projectDir = Resolve-Path (Join-Path $repoRoot "connectors\antt-ciot")
$projectFile = Join-Path $projectDir "ToDoGreen.AnttCiotConnector.csproj"
$publishDir = Join-Path $InstallRoot "app"
$officialDir = Join-Path $AnttRoot "official"
$downloadsDir = Join-Path $AnttRoot "downloads"

New-Item -ItemType Directory -Force -Path $publishDir, $officialDir, $downloadsDir | Out-Null

$packageExtension = [System.IO.Path]::GetExtension(([Uri]$AnttPackageUrl).AbsolutePath)
if (!$packageExtension) { $packageExtension = ".bin" }
$packageFile = Join-Path $downloadsDir ("antt-ciot-package-" + (Get-Date -Format "yyyyMMddHHmmss") + $packageExtension)
Write-Host "Baixando pacote oficial ANTT..."
Invoke-WebRequest -Uri $AnttPackageUrl -OutFile $packageFile

if ($DcsUrl) {
  $dcsFile = Join-Path $downloadsDir ("antt-ciot-dcs-" + (Get-Date -Format "yyyyMMddHHmmss") + ".pdf")
  Write-Host "Baixando DCS ANTT..."
  Invoke-WebRequest -Uri $DcsUrl -OutFile $dcsFile
}

if ($packageFile.ToLowerInvariant().EndsWith(".zip")) {
  Expand-Archive -Path $packageFile -DestinationPath $officialDir -Force
} else {
  Copy-Item $packageFile (Join-Path $officialDir (Split-Path $packageFile -Leaf)) -Force
}

if (!$AnttExecutablePath) {
  $candidate = Get-ChildItem -Path $officialDir -Filter "*.exe" -Recurse | Select-Object -First 1
  if (!$candidate) {
    throw "Nenhum executavel foi encontrado no pacote ANTT. Informe -AnttExecutablePath apontando para o EXE/adaptador correto."
  }
  $AnttExecutablePath = $candidate.FullName
}

if (!(Test-Path $AnttExecutablePath)) {
  throw "Executavel ANTT nao encontrado: $AnttExecutablePath"
}

$token = New-Token

Write-Host "Publicando microservico..."
dotnet publish $projectFile -c Release -r win-x64 --self-contained false -o $publishDir

$appsettings = @{
  Connector = @{
    Token = $token
    DryRun = $false
  }
  AnttProcess = @{
    ExecutablePath = $AnttExecutablePath
    WorkingDirectory = Split-Path $AnttExecutablePath -Parent
    ArgumentsTemplate = "--input `"{input}`" --output `"{output}`" --base-url `"{baseUrl}`" --environment `"{environment}`""
  }
  Kestrel = @{
    Endpoints = @{
      Http = @{
        Url = $ListenUrl
      }
    }
  }
  Logging = @{
    LogLevel = @{
      Default = "Information"
      "Microsoft.AspNetCore" = "Warning"
    }
  }
}

$settingsPath = Join-Path $publishDir "appsettings.$EnvironmentName.json"
$appsettings | ConvertTo-Json -Depth 8 | Set-Content -Path $settingsPath -Encoding UTF8

$exe = Join-Path $publishDir "ToDoGreen.AnttCiotConnector.exe"
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
  sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
}

New-Service `
  -Name $ServiceName `
  -BinaryPathName "`"$exe`" --environment $EnvironmentName" `
  -DisplayName "To Do Green ANTT CIOT Connector" `
  -StartupType Automatic

Start-Service -Name $ServiceName

Write-Host ""
Write-Host "Conector instalado."
Write-Host "Listen local: $ListenUrl"
Write-Host "Token do conector, configure no ERP:"
Write-Host $token
Write-Host ""
Write-Host "No ERP, configure a URL HTTPS publica apontando para este servico, por exemplo via IIS/Caddy/Nginx/Cloudflare Tunnel."
