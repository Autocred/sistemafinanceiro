@echo off
echo ========================================================
echo   FinanceAI - Sistema Financeiro Pessoal
echo ========================================================
echo.
echo Iniciando o servidor, por favor aguarde...
echo O navegador abrira automaticamente em instantes.
echo.
echo DICA: Para fechar o sistema, feche esta janela.
echo ========================================================

:: Mata qualquer instancia anterior na porta 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)

:: Abre o navegador após 5 segundos
start cmd /c "timeout /t 5 >nul && start http://localhost:3000"

:: Inicia o servidor Next.js
cmd /c npm run dev

pause
