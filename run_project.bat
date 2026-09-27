@echo off
echo ===================================================
echo   Hole Lotta Problems (AMD Slingshot Project)
echo   Starting Services...
echo ===================================================

echo.
echo Starting FastAPI Backend API on port 8000 (Local Network)
echo ---------------------------------------------------
start cmd /k "title FastAPI Backend && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo Starting Expo React Native Mobile App
echo ---------------------------------------------------
start cmd /k "title React Native Frontend && cd frontend && if not exist node_modules\ (echo Installing dependencies... && npm install) && npm start"

echo.
echo ===================================================
echo Both services are now booting up in separate windows!
echo 
echo 1. Keep this terminal open if you like.
echo 2. Make sure your phone is on the SAME Wi-Fi as your laptop.
echo 3. Scan the QR code in the React Native window using the Expo Go app.
echo ===================================================
pause
