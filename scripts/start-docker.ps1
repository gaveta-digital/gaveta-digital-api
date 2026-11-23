# Sobe a API e o aplicativo mobile juntos com Docker Compose.
# Detecta o IPv4 da rede local (o celular precisa estar na mesma rede) e o repassa
# ao compose pela variável HOST_IP. Não altera nenhum arquivo .env.
$ErrorActionPreference = 'Stop'

$ipv4 = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.InterfaceAlias -notmatch 'WSL|Loopback|Docker|vEthernet'
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ipv4) {
    throw 'Nenhum endereço IPv4 ativo foi encontrado.'
}

Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path 'api\.env')) {
    throw 'Arquivo api\.env não encontrado. Copie api\.env.example para api\.env e preencha IA_API_KEY e JWT_SECRET.'
}

$env:HOST_IP = $ipv4
Write-Host "IP detectado: $ipv4"
Write-Host "API: http://${ipv4}:8080  |  Expo: http://${ipv4}:8081"
docker compose up --build
