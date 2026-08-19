/**
 * EES (Execution Efficiency Score) — 하드코딩 88점 제거
 * 4축 100점: 저작30 / 자본25 / 전환20 / 결정25
 * + 4주 연속 C 이하 시 목표 자동 하향 (downgradeGuard)
 */
import { storage } from './storage.js';
import { todayKST, lastNDays, weekStart, minsBetween, sum, clamp, shiftDate } from './utils.js';

export const GRADE = s => s >= 85 ? 'S' : s >= 70 ? 'A' : s >= 55 ? 'B' : s >= 40 ? 'C' : 'D';
const GRADE_COLOR = { S: '#a855f7', A: '#10b981', B: '#f59e0b', C: '#f97316', D: '#f43f5e' };

/** 하루 EES 계산 (자본·전환은 최근 7일 롤링) */
export function computeEES(date = todayKST()) {
  const T = storage.data.targets;
  const day = storage.getDay(date);
  const win = lastNDays(date, 7).map(d => storage.data.days[d]).filter(Boolean);

  /* ① 저작 30점 — 오늘 집필 자수 */
  const chars = sum(day.deepwork, b => b.engineId === 'E1' ? b.chars : 0);
  const authoring = clamp(chars / (T.day.chars || 3600)) * 30;

  /* ② 자본 25점 — 주간 유효접촉(15) + 파이프라인 전진(10)
       유효접촉 정의: 30분+ 대화 AND 차기 일정 확정된 건만 */
  const contacts = win.reduce((a, d) =>
    a + (d.todos || []).filter(t => t.type === 'contact' && t.completed).length, 0);
  const dealMoves = win.reduce((a, d) =>
    a + (d.todos || []).filter(t => t.type === 'deal' && t.completed).length, 0);
  const capital = clamp(contacts / (T.week.contacts || 3)) * 15
                + clamp(dealMoves / 2) * 10;

  /* ③ 전환 20점 — 용역실무(billable) 시간 비중의 역수 */
  const billableH = win.reduce((a, d) =>
    a + sum(d.deepwork, b => b.type === 'billable' ? minsBetween(b.start, b.end) : 0), 0) / 60;
  const transition = clamp(1 - billableH / (T.week.billableHours || 20)) * 20;

  /* ④ 결정 25점 — 기한 내 리뷰 완료율(15) + 오늘 로그 건수(10) */
  const due = storage.data.decisions.filter(d => d.reviewDate && d.reviewDate <= date);
  const reviewed = due.filter(d => d.actualOutcome != null);
  const reviewRate = due.length ? reviewed.length / due.length : 0.6;
  const logged = storage.data.decisions.filter(d => d.date === date).length;
  const decision = reviewRate * 15 + clamp(logged / (T.day.decisions || 3)) * 10;

  const total = Math.round(authoring + capital + transition + decision);
  const result = {
    date,
    authoring: +authoring.toFixed(1), capital: +capital.toFixed(1),
    transition: +transition.toFixed(1), decision: +decision.toFixed(1),
    total, grade: GRADE(total), color: GRADE_COLOR[GRADE(total)],
    raw: { chars, contacts, dealMoves, billableH: +billableH.toFixed(1), logged, reviewRate: +(reviewRate * 100).toFixed(0) }
  };

  storage.getDay(date).ees = result;
  storage.save();
  return result;
}

/** 가장 취약한 축 반환 — '오늘의 커맨드' 자동 생성의 입력 */
export function weakestAxis(ees) {
  const cap = { authoring: 30, capital: 25, transition: 20, decision: 25 };
  return Object.keys(cap).sort((a, b) => (ees[a] / cap[a]) - (ees[b] / cap[b]))[0];
}

/** 주간 평균 + 추세 */
export function weeklyEES(date = todayKST()) {
  const ws = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(ws, i)).filter(d => d <= date);
  const scores = days.map(d => storage.data.days[d]?.ees?.total ?? computeEES(d).total);
  const avg = scores.length ? Math.round(sum(scores) / scores.length) : 0;
  const prev = storage.data.reports.at(-1)?.avg ?? null;
  return { weekStart: ws, days, scores, avg, grade: GRADE(avg), delta: prev == null ? null : avg - prev };
}

/** 주간 결산 스냅샷 저장 + 4주 연속 C 이하 시 목표 자동 하향 */
export function closeWeek(date = todayKST()) {
  const w = weeklyEES(date);
  storage.data.reports = storage.data.reports.filter(r => r.weekStart !== w.weekStart);
  storage.data.reports.push({ weekStart: w.weekStart, avg: w.avg, grade: w.grade, at: Date.now() });
  storage.data.reports.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  let downgraded = null;
  if (storage.data.settings.downgradeGuard) {
    const last4 = storage.data.reports.slice(-4);
    if (last4.length === 4 && last4.every(r => r.avg < 55)) {
      const T = storage.data.targets;
      T.week.chars = Math.round(T.week.chars * 0.75);
      T.day.chars = Math.round(T.week.chars / 5);
      T.week.contacts = Math.max(1, T.week.contacts - 1);
      downgraded = { chars: T.day.chars, contacts: T.week.contacts };
      storage.data.reports.push({ weekStart: w.weekStart, note: 'AUTO_DOWNGRADE', at: Date.now() });
    }
  }
  storage.saveNow();
  return { ...w, downgraded };
}

/** DOM 반영 — 기존 HTML의 하드코딩 88점 자리를 실제 값으로 교체 */
export function paintEES(date = todayKST()) {
  const e = computeEES(date);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const bar = (id, pct, color) => {
    const el = document.getElementById(id);
    if (el) { el.style.width = `${pct}%`; if (color) el.style.background = color; }
  };
  set('eesScoreVal', e.total);
  set('eesGrade', e.grade);
  bar('eesBarFill', e.total, e.color);
  bar('axAuthoring', e.authoring / 30 * 100, '#6366f1');
  bar('axCapital',   e.capital   / 25 * 100, '#f59e0b');
  bar('axTransition',e.transition/ 20 * 100, '#10b981');
  bar('axDecision',  e.decision  / 25 * 100, '#f43f5e');
  return e;
}

export { computeEES as calculateEES };
