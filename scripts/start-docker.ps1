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
$env:HOST_IP = $ipv4
"EXPO_PUBLIC_API_URL=http://$ipv4`:8080" | Set-Content -Path '.\mobile\.env' -Encoding utf8

$rootEnvPath = '.\.env'
$rootEnv = if (Test-Path $rootEnvPath) {
    Get-Content $rootEnvPath
} else {
    @()
}

$rootEnv = @($rootEnv | Where-Object { $_ -notmatch '^HOST_IP=' })
$rootEnv += "HOST_IP=$ipv4"
$rootEnv | Set-Content -Path $rootEnvPath -Encoding utf8

Write-Host "IP detectado: $ipv4"
docker compose up --build
