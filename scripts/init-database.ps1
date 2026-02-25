# ============================================
# OpenChat 数据库初始化脚本 (Windows PowerShell)
# 用法: .\init-database.ps1 -Environment [dev|test|prod]
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment = "dev"
)

# 错误时停止
$ErrorActionPreference = "Stop"

# 颜色函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 显示标题
Write-ColorOutput "============================================" "Cyan"
Write-ColorOutput "  OpenChat 数据库初始化脚本" "Cyan"
Write-ColorOutput "  环境: $Environment" "Cyan"
Write-ColorOutput "============================================" "Cyan"

# 检查环境文件
$envFile = ".env.$Environment"
if (-not (Test-Path $envFile)) {
    Write-ColorOutput "错误: 找不到环境配置文件 $envFile" "Red"
    Write-ColorOutput "请先复制模板文件:" "Yellow"
    Write-ColorOutput "  Copy-Item .env.development .env.dev"
    Write-ColorOutput "  Copy-Item .env.test .env.test"
    Write-ColorOutput "  Copy-Item .env.production .env.prod"
    exit 1
}

# 加载环境变量
Write-ColorOutput "加载环境配置..." "Blue"
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        # 移除引号
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
            $value = $matches[1]
        }
        Set-Item -Path "env:$name" -Value $value -Force
    }
}

# 显示配置信息
$dbHost = $env:DB_HOST
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbUser = $env:DB_USERNAME
$dbName = $env:DB_NAME
$dbPassword = $env:DB_PASSWORD

Write-ColorOutput "数据库配置:" "Green"
Write-Host "  主机: $dbHost"
Write-Host "  端口: $dbPort"
Write-Host "  用户: $dbUser"
Write-Host "  数据库: $dbName"
Write-Host ""

# 确认操作
$confirm = Read-Host "确认要初始化数据库吗? 这将删除所有现有数据! (yes/no)"
if ($confirm -ne "yes") {
    Write-ColorOutput "操作已取消" "Yellow"
    exit 0
}

# 设置 PGPASSWORD 环境变量
$env:PGPASSWORD = $dbPassword

# 检查 psql 命令
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-ColorOutput "错误: 找不到 psql 命令" "Red"
    Write-ColorOutput "请确保 PostgreSQL 已安装并添加到 PATH" "Yellow"
    Write-ColorOutput "常见路径:" "Yellow"
    Write-Host "  C:\Program Files\PostgreSQL\14\bin"
    Write-Host "  C:\Program Files\PostgreSQL\15\bin"
    Write-Host "  C:\Program Files\PostgreSQL\16\bin"
    exit 1
}

# 步骤 1: 测试连接
Write-ColorOutput "步骤 1/5: 测试数据库连接..." "Blue"
try {
    $result = & psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ 数据库连接成功" "Green"
    } else {
        throw "连接失败"
    }
} catch {
    Write-ColorOutput "✗ 数据库连接失败" "Red"
    Write-ColorOutput "请检查数据库配置和网络连接" "Yellow"
    exit 1
}

# 步骤 2: 创建数据库
Write-ColorOutput "步骤 2/5: 创建数据库（如果不存在）..." "Blue"
& psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c "CREATE DATABASE $dbName;" 2>$null
Write-ColorOutput "✓ 数据库已就绪" "Green"

# 步骤 3: 执行架构
Write-ColorOutput "步骤 3/5: 执行数据库架构..." "Blue"
if (Test-Path "database\schema.sql") {
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f database\schema.sql
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ 数据库架构已创建" "Green"
    } else {
        Write-ColorOutput "✗ 数据库架构执行失败" "Red"
        exit 1
    }
} else {
    Write-ColorOutput "✗ 找不到 database\schema.sql" "Red"
    exit 1
}

# 步骤 4: 执行迁移
Write-ColorOutput "步骤 4/5: 执行数据库迁移..." "Blue"
if (Test-Path "database\migrations") {
    $migrations = Get-ChildItem -Path "database\migrations" -Filter "*.sql" | Sort-Object Name
    foreach ($migration in $migrations) {
        Write-Host "  执行: $($migration.Name)"
        & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migration.FullName
    }
    Write-ColorOutput "✓ 数据库迁移已完成" "Green"
} else {
    Write-ColorOutput "! 没有迁移文件" "Yellow"
}

# 步骤 5: 插入种子数据
Write-ColorOutput "步骤 5/5: 插入种子数据..." "Blue"
if ($Environment -ne "prod") {
    if (Test-Path "database\seed.sql") {
        $seedConfirm = Read-Host "是否插入测试数据? (yes/no)"
        if ($seedConfirm -eq "yes") {
            & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f database\seed.sql
            Write-ColorOutput "✓ 测试数据已插入" "Green"
        } else {
            Write-ColorOutput "! 跳过测试数据" "Yellow"
        }
    }
} else {
    Write-ColorOutput "! 生产环境跳过测试数据" "Yellow"
}

# 执行索引优化
if (Test-Path "database\indexes-optimization.sql") {
    Write-ColorOutput "执行索引优化..." "Blue"
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f database\indexes-optimization.sql
    Write-ColorOutput "✓ 索引优化完成" "Green"
}

# 清理
$env:PGPASSWORD = $null

Write-Host ""
Write-ColorOutput "============================================" "Green"
Write-ColorOutput "  数据库初始化完成!" "Green"
Write-ColorOutput "============================================" "Green"
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. 检查数据库: psql -h $dbHost -U $dbUser -d $dbName"
Write-Host "  2. 启动服务: pnpm start:$Environment"
Write-Host ""
