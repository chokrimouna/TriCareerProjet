Write-Host "Stopping all Quizback processes..." -ForegroundColor Yellow
Stop-Process -Name "Quizback" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting backend on port 5145..." -ForegroundColor Green
dotnet run
