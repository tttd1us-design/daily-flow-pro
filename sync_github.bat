@echo off
chcp 65001 > nul
cd /d "C:\Users\tttd1\.gemini\antigravity\scratch\daily-dashboard-journal"
echo ===================================================
echo   Daily Flow Pro - GitHub Auto Sync & Data Backup
echo ===================================================
echo [1/3] Adding files and data...
git add .
echo [2/3] Committing changes...
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set dt=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set tm=%%a:%%b
git commit -m "feat(sync): Auto data backup and system sync [%dt% %tm%]"
echo [3/3] Pushing to GitHub (origin/main)...
git push origin main
echo ===================================================
echo   Sync Complete!
echo ===================================================
pause