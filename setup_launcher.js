const fs = require('fs');
const path = require('path');

const projectPath = 'C:\\Users\\tttd1\\.gemini\\antigravity\�cratch\\daily-dashboard-journal';
const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');

const vbsLines = [
  'Set WshShell = CreateObject("WScript.Shell")',
  'Dim http',
  'On Error Resume Next',
  'Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")',
  'http.open "GET", "http://localhost:3005/index.html", False',
  'http.send',
  '',
  'If Err.Number <> 0 Then',
  '    WshShell.Run "powershell.exe -WindowStyle Hidden -Command cd ''' + projectPath + '''; node server.js", 0, False',
  '    WScript.Sleep 800',
  'End If',
  '',
  'WshShell.Run "http://localhost:3005"'
].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10);

fs.writeFileSync(path.join(projectPath, 'start.vbs'), vbsLines, 'utf8');
fs.writeFileSync(path.join(desktopPath, '10조 Daily Flow Pro 실행".vbs'), vbsLines, 'utf8');

const batLines = [
  '@echo off',
  'title 10조 Daily Flow Pro Launcher',
  'cd /d "' + projectPath + '"',
  'start wscript.exe "' + projectPath + '\\start.vbs"',
  'exit'
].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10);

fs.writeFileSync(path.join(desktopPath, '10�l Daily Flow Pro 실행".bat'), batLines, 'utf8');

console.log('SUCCESS! Desktop launchers deployed!');
