@echo off REM  
chcp 65001 >nul REM  第2行
setlocal EnableExtensions REM  

REM 项目根目录（本脚本所在目录） REM  第5行
set "ROOT=%~dp0" REM  
cd /d "%ROOT%" || exit /b 1 REM  

echo ============================================ REM  
echo  Travel Assistant - 一键启动（导入 + 后端 + 前端） REM  第10行
echo ============================================ REM  
echo. REM  

REM ---------- 环境文件 ---------- REM  
if not exist ".env" ( REM  
    if exist ".env.example" ( REM  第16行
        copy /Y ".env.example" ".env" >nul REM  
        echo [提示] 已从 .env.example 生成 .env，请按需修改： REM  第18行
        echo        SCENIC_IMAGES_ROOT、DESTINATIONS_JSON_PATH、PORT REM  
        echo. REM  
    ) else ( REM  
        echo [错误] 缺少 .env.example，无法生成 .env REM  第22行
        pause REM  
        exit /b 1 REM  第24行
    ) REM  
) REM  

if not exist "frontend\user-web\.env.local" ( REM  第28行
    if exist "frontend\user-web\.env.local.example" ( REM  第29行
        copy /Y "frontend\user-web\.env.local.example" "frontend\user-web\.env.local" >nul REM  
        echo [提示] 已生成 frontend\user-web\.env.local（与后端端口对齐） REM  
        echo. REM  第32行
    ) REM  
) REM  

where python >nul 2>&1 || ( REM  第36行
    echo [错误] 未找到 python，请先安装 Python 3.9+ REM  第37行
    pause REM  第38行
    exit /b 1 REM  第39行
) REM  第40行
where node >nul 2>&1 || ( REM  第41行
    echo [错误] 未找到 node，请先安装 Node.js 18+ REM  第42行
    pause REM  第43行
    exit /b 1 REM  第44行
) REM  第45行

REM ---------- 依赖 ---------- REM  第47行
echo [1/4] pip install -r requirements.txt ... REM  第48行
python -m pip install -r requirements.txt -q REM  第49行
if errorlevel 1 ( REM  第50行
    echo [错误] pip 安装失败 REM  第51行
    pause REM  第52行
    exit /b 1 REM  第53行
) REM  第54行

REM ---------- 导入景点 JSON ---------- REM  第56行
echo [2/4] 导入 destinations.json 到 SQLite ... REM  第57行
python scripts\import_destinations_from_json.py REM  第58行
if errorlevel 1 ( REM  第59行
    echo [错误] 导入失败，请检查 .env 中 DESTINATIONS_JSON_PATH 与文件是否存在 REM  第60行
    pause REM  第61行
    exit /b 1 REM  第62行
) REM  第63行

REM ---------- 后端（新窗口，工作目录为项目根，以加载根目录 .env）---------- REM  第65行
echo [3/4] 启动 Flask 后端（新窗口）... REM  第66行
start "Travel-Assistant-Backend" cmd /k "cd /d %ROOT% && python app.py" REM  第67行

echo      等待后端进程就绪（约 2 秒）... REM  第69行
timeout /t 2 /nobreak >nul REM  第70行

REM ---------- 前端（新窗口）---------- REM  第72行
echo [4/4] 启动 Next.js 前端（新窗口）... REM  第73行
if not exist "frontend\user-web\node_modules" ( REM  第74行
    echo      首次运行：npm install ... REM  第75行
    pushd "frontend\user-web" REM  第76行
    call npm install REM  第77行
    if errorlevel 1 ( REM  第78行
        echo [错误] npm install 失败 REM  第79行
        popd REM  第80行
        pause REM  第81行
        exit /b 1 REM  第82行
    ) REM  第83行
    popd REM  第84行
) REM  第85行

start "Travel-Assistant-Frontend" cmd /k "cd /d %ROOT%frontend\user-web && npm run dev" REM  第87行

echo. REM  第89行
echo -------------------------------------------- REM  第90行
echo  后端默认: http://127.0.0.1:5001  （以 .env 中 PORT 为准） REM  第91行
echo  前端默认: http://localhost:3000 （若占用则 Next 会自动换端口） REM  第92行
echo  目的地页: http://localhost:3000/destinations REM  第93行
echo -------------------------------------------- REM  第94行
echo  关闭对应标题窗口即可停止后端或前端。 REM  第95行
echo. REM  第96行
pause REM  第97行
endlocal REM  第98行
