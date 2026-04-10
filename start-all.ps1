$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "============================================"
Write-Host " Travel Assistant - 一键启动全部服务"
Write-Host "============================================`n"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "未找到 python" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "未找到 node" }

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env" -Force
        Write-Host "[提示] 已生成 .env，请确认 SCENIC_IMAGES_ROOT / DESTINATIONS_JSON_PATH`n"
    } else {
        throw "缺少 .env.example，无法生成 .env"
    }
}

$userWebEnv = "frontend\user-web\.env.local"
$userWebEnvEx = "frontend\user-web\.env.local.example"
if (-not (Test-Path $userWebEnv) -and (Test-Path $userWebEnvEx)) {
    Copy-Item $userWebEnvEx $userWebEnv -Force
}

Write-Host "[1/6] 安装 Python 依赖..."
python -m pip install -r requirements.txt

Write-Host "[2/6] 导入景点数据（含自动补图）..."
python -c "from app import app,db,import_destinations_from_json; app.app_context().push(); db.create_all(); import_destinations_from_json(); print('import done')"

Write-Host "[3/6] 启动数据服务管理器..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root'; python data_services_manager.py start")

Write-Host "[4/6] 启动后端 Flask..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root'; python app.py")

$userWebDir = Join-Path $Root "frontend\user-web"
if (-not (Test-Path (Join-Path $userWebDir "node_modules"))) {
    Write-Host "[5/6] 安装 user-web 依赖..."
    Start-Process powershell -Wait -ArgumentList @("-NoExit", "-Command", "cd '$userWebDir'; npm install")
}
Write-Host "[5/6] 启动 user-web..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$userWebDir'; npm run dev")

$adminWebDir = Join-Path $Root "frontend\admin-web"
if (Test-Path $adminWebDir) {
    if (-not (Test-Path (Join-Path $adminWebDir "node_modules"))) {
        Write-Host "[6/6] 安装 admin-web 依赖..."
        Start-Process powershell -Wait -ArgumentList @("-NoExit", "-Command", "cd '$adminWebDir'; npm install")
    }
    Write-Host "[6/6] 启动 admin-web..."
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$adminWebDir'; npm run dev")
} else {
    Write-Host "[6/6] 未发现 admin-web，已跳过"
}

Write-Host "`n全部启动命令已发出："
Write-Host "- 后端: http://127.0.0.1:5001"
Write-Host "- 用户前端: http://localhost:3000"
Write-Host "- 管理前端: http://localhost:3001 (若已启动)"
Write-Host "- 目的地: http://localhost:3000/destinations"
