@echo off
chcp 65001 >nul

echo =============================================
echo   FlexiKit One-Click Start
echo =============================================
echo.

cd /d "%~dp0"


echo [1/2] Starting backend...
start "FlexiKit Backend" cmd /c "cd /d backend && pnpm start:dev"
echo   OK Backend starting (http://localhost:3000)
echo.

echo [2/2] Starting frontend...
start "FlexiKit Frontend" cmd /c "cd /d apps\web && npm run dev"
echo   OK Frontend starting (http://localhost:5173)
echo.

echo =============================================
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo   API:      http://localhost:3000/tools
echo =============================================
echo.
pause
