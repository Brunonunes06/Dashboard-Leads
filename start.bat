@echo off
title Gerenciador Fast Leads - Inicializador Automático
echo ===================================================
echo   🚀 INICIANDO ECOSSISTEMA COMPLETO (FRONT + BACK)
echo ===================================================
echo.

echo [1/2] Ligando o Servidor do Robo (Porta 3000)...
start cmd /k "title RODANDO - BACKEND && node backend\server.js"

echo [2/2] Ligando o Painel Visual do Lovable (Porta 3000)...
start cmd /k "title PAINEL - FRONTEND && npm run dev"
echo.
echo ===================================================
echo   🟢 TUDO PRONTO! Pode escanear o QR Code agora.
echo   Mantenha as janelas abertas para o sistema funcionar.
echo ===================================================
echo.
pause