@echo off
REM OneLLM Deployment Script for Windows
REM This script sets up and runs both frontend and backend servers

echo.
echo 🚀 OneLLM Deployment Script
echo ================================

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found!
    echo Please create a .env file with the following variables:
    echo   DATABASE_URL=your_neon_db_connection_string
    echo   JWT_SECRET=your_jwt_secret
    echo   SERVER_PORT=3001
    echo   FRONTEND_URL=http://localhost:5173
    exit /b 1
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

REM Generate Prisma client
echo.
echo 🔧 Generating Prisma client...
call npm run db:generate

REM Start servers
echo.
echo 🌐 Starting servers...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3001
echo ================================

REM Start backend server in background
start "OneLLM Server" cmd /c "npm run dev:server"

REM Start frontend (foreground)
npm run dev:client
