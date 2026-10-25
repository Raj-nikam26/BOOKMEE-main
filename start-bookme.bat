@echo off
rem Starts the BookMe backend (port 5000) and frontend (port 5173) in two windows.
cd /d "%~dp0"
start "BookMe Backend" cmd /k "cd backend && npm run dev"
start "BookMe Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
