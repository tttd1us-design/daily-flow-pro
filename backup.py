"""
Daily Flow Pro - 자동 백업 스크립트
실행하면:
1. 내 문서/DailyFlowPro_Backup 에 날짜별 스냅샷 저장
2. GitHub에 자동 커밋 & 푸시
"""
import os, sys, shutil, datetime, subprocess

PROJECT = r'C:\Users\tttd1\.gemini\antigravity\scratch\daily-dashboard-journal'
BACKUP_ROOT = os.path.join(os.path.expanduser('~'), 'Documents', 'DailyFlowPro_Backup')
MAX_SNAPSHOTS = 10  # 최근 10개만 보관

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

def run(cmd, cwd=PROJECT):
    result = subprocess.run(cmd, shell=True, capture_output=True, cwd=cwd)
    out = result.stdout.decode('utf-8', errors='replace').strip()
    err = result.stderr.decode('utf-8', errors='replace').strip()
    if out:
        log('  ' + out)
    if err:
        log('  [err] ' + err)
    return result.returncode

# ── 1. 내 문서 스냅샷 백업 ──────────────────────────────────
os.makedirs(BACKUP_ROOT, exist_ok=True)
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
snapshot_dir = os.path.join(BACKUP_ROOT, 'snapshot_' + ts)

log('[1/2] 내 문서 백업 중...')
shutil.copytree(
    PROJECT, snapshot_dir,
    ignore=shutil.ignore_patterns('.git', 'node_modules', '*.log', '__pycache__')
)
log('  → 저장 완료: ' + snapshot_dir)

# 오래된 스냅샷 정리 (MAX_SNAPSHOTS 초과분 삭제)
snapshots = sorted([
    d for d in os.listdir(BACKUP_ROOT) if d.startswith('snapshot_')
])
if len(snapshots) > MAX_SNAPSHOTS:
    for old in snapshots[:len(snapshots) - MAX_SNAPSHOTS]:
        shutil.rmtree(os.path.join(BACKUP_ROOT, old))
        log('  (오래된 스냅샷 삭제: ' + old + ')')

# ── 2. GitHub 자동 커밋 & 푸시 ─────────────────────────────
log('\n[2/2] GitHub 동기화 중...')
run('git add -A')
commit_msg = 'auto-backup: ' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
ret = run('git commit -m "' + commit_msg + '"')
if ret == 0:
    run('git push origin main')
    log('  → GitHub 푸시 완료!')
else:
    log('  → 변경 없음 (커밋 스킵)')

log('\n✅ 백업 완료!')
