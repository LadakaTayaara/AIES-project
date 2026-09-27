@echo off
echo ===================================================
echo   Hole Lotta Problems (AMD Slingshot Project)
echo   Dependency Installation Setup
echo ===================================================

echo.
echo [1/2] Installing Backend Dependencies (Python)...
echo ---------------------------------------------------
cd backend\Hole-Lotta-Problems
pip install -r requirements.txt
cd ..\..

echo.
echo [2/2] Installing Frontend App Dependencies (Node.js)...
echo ---------------------------------------------------
cd road-intel
call npm install
cd ..

echo.
echo ===================================================
echo All dependencies installed successfully!
echo You can now use run_project.bat to start both servers.
echo ===================================================
pause
