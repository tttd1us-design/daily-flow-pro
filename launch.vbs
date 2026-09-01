Set WshShell = CreateObject("WScript.Shell")
Dim http
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.open "GET", "http://localhost:3005", False
http.send
If Err.Number <> 0 Then
    WshShell.Run "powershell.exe -WindowStyle Hidden -Command cd "C:/Users/tttd1/.gemini/antigravity/scratch/daily-dashboard-journal"; npx serve -s . -l 3005", 0, False
    WScript.Sleep 1500
End If
WshShell.Run "http://localhost:3005"