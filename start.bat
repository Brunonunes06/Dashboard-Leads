@echo off
title Gerenciador Fast Leads - Inicializador Automático
echo ===================================================
echo   🚀 INICIANDO ECOSSISTEMA COMPLETO (FRONT + BACK)
echo ===================================================
echo.

echo [1/3] Ligando o Servidor do Robo (Porta 3000)...
start cmd /k "title ROBO - BACKEND && node server.js"

echo [2/3] Ligando o Painel Visual do Lovable (Porta 5173)...
start cmd /k "title PAINEL - FRONTEND && npm run dev"

echo [3/3] Abrindo o Tunel do Ngrok com Dominio Personalizado...
timeout /t 3 >nul
start cmd /k "title TUNEL - NGROK && ngrok http 127.0.0.1:5173 --domain=lattermost-nonindependently-alvera.ngrok-free.dev"

echo.
echo ===================================================
echo   🟢 TUDO PRONTO! Pode escanear o QR Code agora.
echo   Mantenha as janelas abertas para o sistema funcionar.
echo ===================================================
echo.
pause