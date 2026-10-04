
$content = Get-Content "d:\tricareer\fullstack old tricareer\tri360-career-api\tri360-career-api\Services\Session\SessionService.cs"
$level = 0
for ($i = 0; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $opens = $line.ToCharArray() | Where-Object { $_ -eq '{' } | Measure-Object | Select-Object -ExpandProperty Count
    $closes = $line.ToCharArray() | Where-Object { $_ -eq '}' } | Measure-Object | Select-Object -ExpandProperty Count
    $level += ($opens - $closes)
    if ($level -lt 0) {
        Write-Host "Brace mismatch at line $($i + 1): $line (Level: $level)"
        break
    }
    if (($i + 1) % 100 -eq 0) {
        Write-Host "Line $($i + 1): Level $level"
    }
}
Write-Host "Final level: $level"
