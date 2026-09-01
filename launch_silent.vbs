Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\tttd1\.gemini\antigravity\scratch\daily-dashboard-journal"
WshShell.Run "cmd /c start_app.bat", 0, False
