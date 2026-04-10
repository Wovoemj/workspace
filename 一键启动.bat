@echo off REM  
chcp 65001 >nul REM  第2行
title 旅游助手 - 启动中... REM  

echo ======================================== REM  第5行
echo    旅游助手 - 一键启动 REM  
echo ======================================== REM  
echo. REM  第8行

cd /d "%~dp0" REM  第10行

REM 检查端口占用并清理 REM  
echo [1/3] 检查端口占用... REM  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING') do ( REM  
    echo 清理 5001 端口 (PID: %%a)... REM  
    taskkill /F /PID %%a >nul 2>&1 REM  第16行
) REM  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do ( REM  第18行
    echo 清理 3000 端口 (PID: %%a)... REM  
    taskkill /F /PID %%a >nul 2>&1 REM  
) REM  

REM 启动后端 REM  
echo. REM  第24行
echo [2/3] 启动后端服务 (端口 5001)... REM  
start "TravelAssistant-Backend" cmd /k "python app.py" REM  

REM 等待后端启动 REM  第28行
timeout /t 3 /nobreak >nul REM  第29行

REM 检查后端是否启动成功 REM  
curl -s http://localhost:5001/api/health >nul 2>&1 REM  第32行
if %errorlevel% neq 0 ( REM  
    echo    警告: 后端可能启动较慢，稍后请刷新页面 REM  
) REM  第35行

REM 启动前端 REM  第37行
echo. REM  第38行
echo [3/3] 启动前端服务 (端口 3000)... REM  第39行
cd frontend\user-web REM  第40行
start "TravelAssistant-Frontend" cmd /k "npm run dev" REM  第41行

echo. REM  第43行
echo ======================================== REM  第44行
echo    启动完成! REM  第45行
echo ======================================== REM  第46行
echo. REM  第47行
echo  后端: http://localhost:5001 REM  第48行
echo  前端: http://localhost:3000 REM  第49行
echo. REM  第50行
echo  按任意键打开浏览器... REM  第51行
pause >nul REM  第52行
start http://localhost:3000 REM  第53行
