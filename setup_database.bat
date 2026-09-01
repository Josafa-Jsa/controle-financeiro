@echo off
chcp 65001 > nul
title JSA Gestao Financeira - Setup do Banco de Dados

echo ================================================================
echo    JSA SOLUCOES TECNOLOGICAS - SETUP BANCO DE DADOS MYSQL
echo ================================================================
echo.
echo [*] Verificando ambiente Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado no PATH do sistema.
    echo Favor instalar o Node.js em https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [*] Executando script de migracao e criacao de tabelas...
echo.

node src\scripts\migrate.js

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo [SUCESSO] Banco de dados e tabelas configurados com exito!
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo [ERRO] Ocorreu uma falha ao conectar ou criar as tabelas.
    echo Verifique se o servico MySQL (XAMPP, Wamp, Docker) esta ativo.
    echo ================================================================
)

echo.
pause
