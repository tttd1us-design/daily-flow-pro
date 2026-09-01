@echo off
chcp 65001 > nul
cd /d "C:\Users\tttd1\.gemini\antigravity\scratch\daily-dashboard-journal"
netstat -an | find ":3005" | find "LISTENING" > nul 2>&1
if %errorlevel% == 0 (
    start "" "http://localhost:3005"
    exit
)
start /B /MIN "" node server.js
timeout /t 1 /nobreak > nul
start "" "http://localhost:3005"
exit
