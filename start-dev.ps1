# Travel Assistant - 一键启动（PowerShell）
# 用法: 在项目根目录执行: .\start-dev.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "============================================"
Write-Host " Travel Assistant - 一键启动（导入 + 后端 + 前端）"
Write-Host "============================================`n"

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env" -Force
        Write-Host "[提示] 已从 .env.example 生成 .env，请按需修改 SCENIC_IMAGES_ROOT、DESTINATIONS_JSON_PATH、PORT`n"
    } else {
        throw "缺少 .env.example，无法生成 .env"
    }
}

$localEnv = "frontend\user-web\.env.local"
$localEx = "frontend\user-web\.env.local.example"
if (-not (Test-Path $localEnv) -and (Test-Path $localEx)) {
    Copy-Item $localEx $localEnv -Force
    Write-Host "[提示] 已生成 $localEnv`n"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "未找到 python" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "未找到 node" }

Write-Host "[1/4] pip install ..."
python -m pip install -r requirements.txt -q

Write-Host "[2/4] 导入 destinations.json ..."
python scripts\import_destinations_from_json.py

Write-Host "[3/4] 启动后端（新窗口）..."
Start-Process cmd -ArgumentList @("/k", "cd /d `"$Root`" && python app.py") -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "[4/4] 启动前端（新窗口）..."
$uw = Join-Path $Root "frontend\user-web"
if (-not (Test-Path (Join-Path $uw "node_modules"))) {
    Set-Location $uw
    npm install
    Set-Location $Root
}
Start-Process cmd -ArgumentList @("/k", "cd /d `"$uw`" && npm run dev") -WindowStyle Normal

Write-Host "`n后端默认: http://127.0.0.1:5001 （以 .env 中 PORT 为准）"
Write-Host "前端默认: http://localhost:3000`n"
