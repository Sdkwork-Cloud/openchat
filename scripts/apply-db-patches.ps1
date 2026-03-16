# ============================================
# OpenChat 数据库补丁执行脚本 (Windows PowerShell)
# 用法: .\apply-db-patches.ps1 -Environment [development|test|production]
# 兼容别名: dev -> development, prod -> production
# ============================================

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "development"
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Resolve-EnvironmentName {
    param([string]$InputEnv)
    switch ($InputEnv.ToLower()) {
        "dev" { return "development" }
        "development" { return "development" }
        "test" { return "test" }
        "prod" { return "production" }
        "production" { return "production" }
        default { return $null }
    }
}

function Resolve-EnvironmentFile {
    param([string]$CanonicalEnv)
    switch ($CanonicalEnv) {
        "development" {
            if (Test-Path ".env.development") { return ".env.development" }
            if (Test-Path ".env.dev") { return ".env.dev" }
            return $null
        }
        "test" {
            if (Test-Path ".env.test") { return ".env.test" }
            return $null
        }
        "production" {
            if (Test-Path ".env.production") { return ".env.production" }
            if (Test-Path ".env.prod") { return ".env.prod" }
            return $null
        }
        default { return $null }
    }
}

$canonicalEnvironment = Resolve-EnvironmentName -InputEnv $Environment
if (-not $canonicalEnvironment) {
    Write-ColorOutput "错误: 无效环境 '$Environment'" "Red"
    Write-ColorOutput "支持环境: development(dev), test, production(prod)" "Yellow"
    exit 1
}

$envFile = Resolve-EnvironmentFile -CanonicalEnv $canonicalEnvironment
$patchDir = "database\patches"

Write-ColorOutput "============================================" "Cyan"
Write-ColorOutput "  OpenChat 数据库补丁执行脚本" "Cyan"
Write-ColorOutput "  环境: $canonicalEnvironment" "Cyan"
Write-ColorOutput "============================================" "Cyan"

if (-not (Test-Path $envFile)) {
    Write-ColorOutput "错误: 找不到环境配置文件" "Red"
    Write-ColorOutput "当前环境: $canonicalEnvironment" "Yellow"
    Write-ColorOutput "期望文件: development=.env.development(.env.dev), test=.env.test, production=.env.production(.env.prod)" "Yellow"
    exit 1
}

if (-not (Test-Path $patchDir)) {
    Write-ColorOutput "未找到补丁目录 $patchDir，无需执行" "Yellow"
    exit 0
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
            $value = $matches[1]
        }
        Set-Item -Path "env:$name" -Value $value -Force
    }
}

$dbHost = $env:DB_HOST
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbUser = $env:DB_USERNAME
$dbName = $env:DB_NAME
$dbPassword = $env:DB_PASSWORD
$migrationTable = "chat_schema_migrations"
$env:PGPASSWORD = $dbPassword

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-ColorOutput "错误: 找不到 psql 命令" "Red"
    exit 1
}

Write-ColorOutput "测试数据库连接..." "Blue"
& psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT 1" > $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "数据库连接失败" "Red"
    $env:PGPASSWORD = $null
    exit 1
}
Write-ColorOutput "✓ 数据库连接成功" "Green"

& psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c @"
CREATE TABLE IF NOT EXISTS $migrationTable (
    filename TEXT PRIMARY KEY,
    version TEXT,
    checksum TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ > $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "创建迁移记录表失败" "Red"
    $env:PGPASSWORD = $null
    exit 1
}
& psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c @"
ALTER TABLE $migrationTable
    ADD COLUMN IF NOT EXISTS version TEXT,
    ADD COLUMN IF NOT EXISTS checksum TEXT;
"@ > $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "升级迁移记录表失败" "Red"
    $env:PGPASSWORD = $null
    exit 1
}
& psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c @"
UPDATE $migrationTable
SET version = substring(filename from '^([0-9]{8})_')
WHERE version IS NULL
  AND filename ~ '^[0-9]{8}_.+\.sql$';
"@ > $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "回填迁移版本失败" "Red"
    $env:PGPASSWORD = $null
    exit 1
}
& psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c @"
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_schema_migrations_version_uniq
    ON $migrationTable(version)
    WHERE version IS NOT NULL;
"@ > $null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "创建版本唯一索引失败" "Red"
    $env:PGPASSWORD = $null
    exit 1
}

$patches = Get-ChildItem -Path $patchDir -Filter *.sql | Sort-Object Name
if ($patches.Count -eq 0) {
    Write-ColorOutput "补丁目录中没有 SQL 文件，跳过" "Yellow"
    $env:PGPASSWORD = $null
    exit 0
}

$index = 0
$applied = 0
$skipped = 0
$backfilled = 0
$lastPatchVersion = ""
foreach ($patch in $patches) {
    $index++
    $rawPatchName = $patch.Name
    if ($rawPatchName -notmatch '^(?<version>\d{8})_.+\.sql$') {
        Write-ColorOutput "补丁命名不符合标准 (YYYYMMDD_name.sql): $rawPatchName" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    $patchVersion = $Matches['version']
    if ($lastPatchVersion -and ($patchVersion -lt $lastPatchVersion)) {
        Write-ColorOutput "补丁顺序异常: $rawPatchName 早于前一个版本 $lastPatchVersion" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    $lastPatchVersion = $patchVersion
    $patchName = $rawPatchName.Replace("'", "''")
    $patchChecksum = (Get-FileHash -Path $patch.FullName -Algorithm SHA256).Hash.ToLower()
    $versionRow = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -tA -F "|" -c "SELECT filename, checksum FROM $migrationTable WHERE version='$patchVersion' LIMIT 1;"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "检查补丁状态失败: $($patch.Name)" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    $normalizedVersionRow = ($versionRow | Out-String).Trim()
    if ($normalizedVersionRow) {
        $parts = $normalizedVersionRow.Split('|', 2)
        $storedFileName = if ($parts.Length -ge 1) { $parts[0].Trim() } else { "" }
        $normalizedStoredChecksum = if ($parts.Length -eq 2) { $parts[1].Trim().ToLower() } else { "" }
        if ($storedFileName -ne $rawPatchName) {
            Write-ColorOutput "补丁版本冲突: version=$patchVersion" "Red"
            Write-ColorOutput "  已登记文件: $storedFileName" "Red"
            Write-ColorOutput "  当前文件:   $rawPatchName" "Red"
            $env:PGPASSWORD = $null
            exit 1
        }
        if ($normalizedStoredChecksum -ne $patchChecksum) {
            Write-ColorOutput "补丁摘要不匹配: $($patch.Name)" "Red"
            Write-ColorOutput "  记录摘要: $normalizedStoredChecksum" "Red"
            Write-ColorOutput "  当前摘要: $patchChecksum" "Red"
            $env:PGPASSWORD = $null
            exit 1
        }
        $skipped++
        Write-ColorOutput "跳过补丁 [$index/$($patches.Count)]: $($patch.Name) (已执行)" "Yellow"
        continue
    }

    $filenameRow = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -tA -F "|" -c "SELECT version, checksum FROM $migrationTable WHERE filename='$patchName' LIMIT 1;"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "检查补丁状态失败: $($patch.Name)" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    $normalizedFilenameRow = ($filenameRow | Out-String).Trim()
    if ($normalizedFilenameRow) {
        $parts = $normalizedFilenameRow.Split('|', 2)
        $storedVersion = if ($parts.Length -ge 1) { $parts[0].Trim() } else { "" }
        $normalizedStoredChecksum = if ($parts.Length -eq 2) { $parts[1].Trim().ToLower() } else { "" }
        if ($storedVersion -and ($storedVersion -ne $patchVersion)) {
            Write-ColorOutput "补丁版本冲突: $($patch.Name) 已绑定 version=$storedVersion" "Red"
            $env:PGPASSWORD = $null
            exit 1
        }
        if ($normalizedStoredChecksum -and ($normalizedStoredChecksum -ne $patchChecksum)) {
            Write-ColorOutput "补丁摘要不匹配: $($patch.Name)" "Red"
            Write-ColorOutput "  记录摘要: $normalizedStoredChecksum" "Red"
            Write-ColorOutput "  当前摘要: $patchChecksum" "Red"
            $env:PGPASSWORD = $null
            exit 1
        }
        & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c "UPDATE $migrationTable SET version='$patchVersion', checksum='$patchChecksum' WHERE filename='$patchName';" > $null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "回填补丁版本/摘要失败: $($patch.Name)" "Red"
            $env:PGPASSWORD = $null
            exit 1
        }
        $backfilled++
        $skipped++
        Write-ColorOutput "跳过补丁 [$index/$($patches.Count)]: $($patch.Name) (已回填版本/摘要)" "Yellow"
        continue
    }

    Write-ColorOutput "执行补丁 [$index/$($patches.Count)]: $($patch.Name)" "Blue"
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -f $patch.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "补丁执行失败: $($patch.Name)" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c "INSERT INTO $migrationTable (filename, version, checksum) VALUES ('$patchName', '$patchVersion', '$patchChecksum');" > $null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "写入迁移记录失败: $($patch.Name)" "Red"
        $env:PGPASSWORD = $null
        exit 1
    }
    $applied++
    Write-ColorOutput "✓ 完成: $($patch.Name)" "Green"
}

Write-ColorOutput "补丁总数 $($patches.Count)，本次执行 $applied，跳过 $skipped，回填摘要 $backfilled" "Green"
$env:PGPASSWORD = $null
