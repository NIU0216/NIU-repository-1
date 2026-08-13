$ErrorActionPreference = "Stop"

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $python) {
  throw "未找到 Python。也可以使用 VS Code 的 Live Server 打开本目录。"
}

Write-Host "本地预览：http://127.0.0.1:8080/"
if ($python.Name -eq "py.exe") {
  & $python.Source -m http.server 8080 --bind 127.0.0.1
} else {
  & $python.Source -m http.server 8080 --bind 127.0.0.1
}

