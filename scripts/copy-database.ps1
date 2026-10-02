<#
.SYNOPSIS
  Replace the target database's app data (the "public" schema) with an exact copy of the source database.

.DESCRIPTION
  Uses pg_dump and pg_restore. Connection strings are read from SOURCE_DATABASE_URL and
  TARGET_DATABASE_URL if set, otherwise prompted for without echoing. Use the direct
  (unpooled) Neon connection strings. Everything in the target's public schema is
  dropped and replaced, including _prisma_migrations. Other schemas (such as neon_auth)
  are left alone. The temporary dump holds personal data and is deleted afterwards.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/copy-database.ps1
#>
param(
  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Read-Secret([string]$prompt) {
  $secure = Read-Host -Prompt $prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Remove-PrismaParams([string]$url) {
  $parts = $url -split '\?', 2
  if ($parts.Count -eq 1) { return $url }
  $prismaOnly = 'schema', 'pgbouncer', 'connection_limit', 'pool_timeout', 'socket_timeout', 'statement_cache_size'
  $kept = $parts[1] -split '&' | Where-Object { $_ -and ($prismaOnly -notcontains ($_ -split '=', 2)[0]) }
  if ($kept) { return "$($parts[0])?$($kept -join '&')" }
  return $parts[0]
}

function Describe([string]$url) {
  $uri = [Uri]($url -replace '^postgres(ql)?://', 'http://')
  return "$($uri.Host)$($uri.AbsolutePath)"
}

function Count-Rows([string]$url) {
  $ErrorActionPreference = "Continue"
  $sql = 'SELECT (SELECT count(*) FROM "User") || '' users, '' || (SELECT count(*) FROM "FeedPost") || '' feed posts'''
  $out = $sql | & $psql --dbname=$url --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 2>$null
  if ($LASTEXITCODE -ne 0) { return "no app tables yet" }
  return ($out -join " ").Trim()
}

$pgDump = Join-Path $PgBin "pg_dump.exe"
$pgRestore = Join-Path $PgBin "pg_restore.exe"
$psql = Join-Path $PgBin "psql.exe"
foreach ($tool in $pgDump, $pgRestore, $psql) {
  if (-not (Test-Path $tool)) { throw "Not found: $tool. Pass -PgBin with your PostgreSQL bin folder." }
}

$source = if ($env:SOURCE_DATABASE_URL) { $env:SOURCE_DATABASE_URL } else { Read-Secret "SOURCE connection string (copy FROM)" }
$target = if ($env:TARGET_DATABASE_URL) { $env:TARGET_DATABASE_URL } else { Read-Secret "TARGET connection string (copy TO, will be overwritten)" }
if (-not $source -or -not $target) { throw "Both connection strings are required." }
$source = Remove-PrismaParams $source.Trim()
$target = Remove-PrismaParams $target.Trim()
if ($source -eq $target) { throw "Source and target are the same database." }

Write-Host ""
Write-Host "Source: $(Describe $source)  ($(Count-Rows $source))"
Write-Host "Target: $(Describe $target)  ($(Count-Rows $target))"
Write-Host "All app data in the TARGET will be deleted and replaced with the source's data."
if (-not $Force) {
  if ((Read-Host "Type COPY to continue") -cne "COPY") { Write-Host "Cancelled."; exit 1 }
}

$dump = Join-Path $env:TEMP ("inrcliq-db-" + [Guid]::NewGuid().ToString("N") + ".dump")
try {
  Write-Host "Dumping source..."
  & $pgDump --dbname=$source --schema=public --format=custom --no-owner --no-acl --file=$dump
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed." }

  Write-Host "Restoring into target..."
  & $pgRestore --dbname=$target --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error $dump
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed. The target was left unchanged." }

  Write-Host ""
  Write-Host "Done. Target now has: $(Count-Rows $target)"
}
finally {
  if (Test-Path $dump) { Remove-Item $dump -Force }
}
