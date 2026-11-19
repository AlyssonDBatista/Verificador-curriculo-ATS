@echo off
cd /d "%~dp0"
if "%QWEN_MODEL%"=="" set QWEN_MODEL=qwen3:8b
start "" http://localhost:8000
python server.py
pause
