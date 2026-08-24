@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set PORT=5000

echo Buscando proceso en puerto %PORT%...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    echo Puerto %PORT% ocupado por PID %%p. Terminando...
    taskkill /F /PID %%p >nul 2>&1
)

if not exist ".env" (
    echo AVISO: no existe .env, copiando desde .env.example
    copy /y ".env.example" ".env" >nul
)

echo Iniciando servidor web y bot de Telegram...
call npm run dev:all
