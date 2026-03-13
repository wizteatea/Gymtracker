@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1
title GymTracker - Console
color 0A

:menu
cls
echo.
echo  ========================================
echo         GymTracker - Console
echo  ========================================
echo.
echo   [1]  Lancer l'application
echo   [2]  Arreter l'application
echo   [3]  Installer les dependances
echo   [4]  Build production
echo   [5]  Quitter
echo.
echo  ========================================
echo.
set /p "choix=  Ton choix (1-5) : "

if "%choix%"=="1" goto start
if "%choix%"=="2" goto stop
if "%choix%"=="3" goto install
if "%choix%"=="4" goto build
if "%choix%"=="5" goto quit

echo.
echo  Choix invalide, recommence.
timeout /t 2 >nul
goto menu

:start
cls
echo.
echo  Lancement de GymTracker sur http://localhost:5173 ...
echo.
timeout /t 2 >nul
start "" http://localhost:5173
echo  Pour arreter : ferme cette fenetre ou choix [2] dans le menu.
echo.
call npx.cmd vite --port 5173
goto menu

:stop
cls
echo.
echo  Arret en cours...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo.
echo  Application arretee.
echo.
timeout /t 2 >nul
goto menu

:install
cls
echo.
echo  Installation des dependances...
echo.
call npm.cmd install
echo.
echo  Termine !
echo.
pause
goto menu

:build
cls
echo.
echo  Build de production en cours...
echo.
call npx.cmd vite build
echo.
echo  Termine ! Fichiers dans le dossier dist/
echo.
pause
goto menu

:quit
exit
