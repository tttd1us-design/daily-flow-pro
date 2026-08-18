import os
import sys
import json
import subprocess
import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(DIRECTORY, "data")
JOURNAL_DIR = os.path.join(DATA_DIR, "journals")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(JOURNAL_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

class LifeOSHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/load-data':
            state_file = os.path.join(DATA_DIR, "state.json")
            if os.path.exists(state_file):
                try:
                    with open(state_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(content.encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                    return
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "no_saved_data"}).encode('utf-8'))
                return

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/save-data':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                
                # 1. Save full state.json
                state_file = os.path.join(DATA_DIR, "state.json")
                with open(state_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                # 2. Save goals.json
                if "goals" in data:
                    with open(os.path.join(DATA_DIR, "goals.json"), 'w', encoding='utf-8') as f:
                        json.dump(data["goals"], f, ensure_ascii=False, indent=2)

                # 3. Save principles.json
                if "principles" in data:
                    with open(os.path.join(DATA_DIR, "principles.json"), 'w', encoding='utf-8') as f:
                        json.dump(data["principles"], f, ensure_ascii=False, indent=2)

                # 4. Save memos.json
                if "memos" in data:
                    with open(os.path.join(DATA_DIR, "memos.json"), 'w', encoding='utf-8') as f:
                        json.dump(data["memos"], f, ensure_ascii=False, indent=2)

                # 5. Save decisions.json
                if "decisions" in data:
                    with open(os.path.join(DATA_DIR, "decisions.json"), 'w', encoding='utf-8') as f:
                        json.dump(data["decisions"], f, ensure_ascii=False, indent=2)

                # 6. Save individual Markdown Journals
                days = data.get("days", {})
                for date_str, day_item in days.items():
                    j = day_item.get("journal")
                    if j and (j.get("title") or j.get("content")):
                        title = j.get("title", f"{date_str}의 일기")
                        content = j.get("content", "")
                        tags = j.get("tags", [])
                        mood = day_item.get("mood", "neutral")
                        
                        md_content = f"""---
date: {date_str}
title: "{title}"
mood: {mood}
tags: [{', '.join(tags)}]
updatedAt: {j.get('updatedAt', date_str)}
---

# {title}

{content}
"""
                        j_file = os.path.join(JOURNAL_DIR, f"{date_str}.md")
                        with open(j_file, 'w', encoding='utf-8') as f:
                            f.write(md_content)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "savedAt": datetime.datetime.now().isoformat()}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        if self.path == '/api/sync-github':
            try:
                # Add and commit
                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                subprocess.run(["git", "add", "."], cwd=DIRECTORY, check=True)
                commit_res = subprocess.run(["git", "commit", "-m", f"feat(data): Life OS auto-sync [{now_str}]"], cwd=DIRECTORY, capture_output=True, text=True)
                
                # Push
                push_res = subprocess.run(["git", "push", "origin", "main"], cwd=DIRECTORY, capture_output=True, text=True)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "commit": commit_res.stdout or commit_res.stderr,
                    "push": push_res.stdout or push_res.stderr,
                    "timestamp": now_str
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, LifeOSHandler)
    print("==================================================")
    print(f"  Daily Flow Pro v2.0 API & Data Server Started")
    print(f"  URL: http://127.0.0.1:{PORT}")
    print(f"  Data Directory: {DATA_DIR}")
    print("==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")