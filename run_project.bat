@echo off
echo ═══════════════════════════════════════════════════════════
echo   Hole Lotta Problems — AI Road Intelligence Platform
echo   Starting Services...
echo ═══════════════════════════════════════════════════════════

echo.
echo [1/2] Starting FastAPI Backend + Web Dashboard on port 8000
echo ───────────────────────────────────────────────────────────
start cmd /k "title [HLP] FastAPI Backend && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2/2] Starting React Native Mobile App (Expo)
echo ───────────────────────────────────────────────────────────
start cmd /k "title [HLP] React Native Frontend && cd frontend && npx expo start -c"

echo.
echo ═══════════════════════════════════════════════════════════
echo   Both services are now starting in separate windows!
echo.
echo   Web Dashboard:  http://localhost:8000
echo   API Docs:       http://localhost:8000/docs
echo   API Health:     http://localhost:8000/api/health
echo.
echo   For Mobile App:
echo   1. Ensure phone and PC are on the same Wi-Fi
echo   2. Open Expo Go and scan the QR code
echo ═══════════════════════════════════════════════════════════
pause
