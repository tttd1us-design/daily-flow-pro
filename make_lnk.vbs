Set WshShell = CreateObject("WScript.Shell")
desktop = WshShell.SpecialFolders("Desktop")
Set s = WshShell.CreateShortcut(desktop & "\Daily Flow Pro (10조 Life OS).lnk")
s.TargetPath = "wscript.exe"
s.Arguments = """ & C:\\Users\\tttd1\\.gemini\\antigravity\\scratch\\daily-dashboard-journal\\launch.vbs & """
s.WorkingDirectory = "C:/Users/tttd1/.gemini/antigravity/scratch/daily-dashboard-journal"
s.Description = "Daily Flow Pro 10읜 Life OS 원키릭 실행기"
s.IconLocation = "C:\Windows\System32\shell32.dll,220"
s.Save