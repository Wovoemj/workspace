# Step 1: Start services
Write-Host "Starting services..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"D:\项目\travel-assistant`" && python start.py" -PassThru -WindowStyle Hidden

# Step 2: Wait for frontend to be ready
$maxWait = 120
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    try {
        $conn = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -ErrorAction Stop
        if ($conn.TcpTestSucceeded) {
            Write-Host "Frontend ready after ${waited}s"
            break
        }
    } catch {}
    Write-Host "Waiting... ${waited}s"
}

if ($waited -ge $maxWait) {
    Write-Host "TIMEOUT: Frontend not ready"
    exit 1
}

# Step 3: Take screenshots with Edge headless
$outputDir = "D:\项目\travel-assistant\paper-output\screenshots"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$urls = @(
    @{url="http://localhost:3000/"; file="01-homepage.png"},
    @{url="http://localhost:3000/assistant"; file="02-ai-assistant.png"},
    @{url="http://localhost:3000/destinations"; file="03-destinations.png"},
    @{url="http://localhost:3000/itineraries"; file="04-itineraries.png"}
)

foreach ($item in $urls) {
    $outPath = "$outputDir\$($item.file)"
    Write-Host "Screenshotting: $($item.url) -> $outPath"
    & $edgePath --headless=new --disable-gpu --screenshot="$outPath" --window-size=1280,800 --hide-scrollbars $item.url 2>$null
    Start-Sleep -Seconds 2
    if (Test-Path $outPath) {
        $size = (Get-Item $outPath).Length
        Write-Host "  OK: $($item.file) ($size bytes)"
    } else {
        Write-Host "  FAIL: $($item.file)"
    }
}

Write-Host "`nAll done! Screenshots in $outputDir"

# Step 4: Stop services
Write-Host "Stopping services..."
try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
# Kill any leftover processes on our ports
foreach ($port in @(3000, 5001, 8084)) {
    $pids = netstat -ano | Select-String ":$port " | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$') {
            try { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}
Write-Host "Services stopped."
