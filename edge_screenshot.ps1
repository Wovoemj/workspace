$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "D:\项目\travel-assistant\paper-output\screenshots"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$pages = @(
    @{url="http://localhost:3000/"; name="01-homepage"},
    @{url="http://localhost:3000/assistant"; name="02-ai-assistant"},
    @{url="http://localhost:3000/destinations"; name="03-destinations"},
    @{url="http://localhost:3000/itineraries"; name="04-itineraries"}
)

foreach ($p in $pages) {
    $outPath = "$outDir\$($p.name).png"
    Write-Host "Taking: $($p.url)"
    $tmpDir = "$env:TEMP\edge-$($p.name)"
    $proc = Start-Process -FilePath $edge -ArgumentList "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--screenshot=$outPath","--window-size=1280,800","--hide-scrollbars","--user-data-dir=$tmpDir","--virtual-time-budget=10000",$p.url -PassThru -NoNewWindow -Wait
    Write-Host "  Exit: $($proc.ExitCode)"
    if (Test-Path $outPath) {
        $sz = (Get-Item $outPath).Length
        Write-Host "  OK: $sz bytes"
    } else {
        Write-Host "  FAIL"
    }
    Start-Sleep -Seconds 2
}
Write-Host "DONE"
