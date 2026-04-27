@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo cloudflared が PATH にある前提です。
echo 先に別ウィンドウで npm.cmd start してください。
echo.
cloudflared tunnel --url http://127.0.0.1:3333
pause
