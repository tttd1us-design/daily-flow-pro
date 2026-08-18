/** Daily Flow Pro v2 — 공통 유틸 (Asia/Seoul 고정) */

const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 오늘 날짜(KST) 'YYYY-MM-DD' */
export function todayKST(d = new Date()) {
  return new Date(d.getTime() + KST_OFFSET).toISOString().split('T')[0];
}

/** 현재 시각(KST) 'HH:MM' */
export function nowHM(d = new Date()) {
  return new Date(d.getTime() + KST_OFFSET).toISOString().substring(11, 16);
}

/** 날짜 문자열 ± n일 (로컬 캘린더 연산, UTC 미개입) */
export function shiftDate(dateStr, delta) {
  const [y, m, dd] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, dd + delta);
  return fmtDate(d);
}

export function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 두 날짜 사이 일수 (b - a) */
export function daysBetween(a, b) {
  const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((p(b) - p(a)) / 86400000);
}

/** 기준일 포함 최근 n일 배열 (오래된 → 최신) */
export function lastNDays(dateStr, n = 7) {
  return Array.from({ length: n }, (_, i) => shiftDate(dateStr, -(n - 1 - i)));
}

/** ISO 주차 시작일(월요일) */
export function weekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = (dt.getDay() + 6) % 7;
  return shiftDate(dateStr, -diff);
}

export function monthKey(dateStr) { return dateStr.substring(0, 7); }

/** 'HH:MM' 두 개 → 분 */
export function minsBetween(start, end) {
  if (!start || !end) return 0;
  const t = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  let v = t(end) - t(start);
  if (v < 0) v += 1440; // 자정 넘김
  return v;
}

export const pad = n => String(n).padStart(2, '0');
export const uid = (p = 'x') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const sum = (arr, f) => (arr || []).reduce((a, x) => a + (f ? f(x) || 0 : x || 0), 0);

/** 원 단위 → 조/억 한글 표기 */
export function fmtKRW(won) {
  const n = Number(won) || 0;
  const jo = 1e12, eok = 1e8;
  if (Math.abs(n) >= jo) return `${(n / jo).toFixed(2)}조`;
  if (Math.abs(n) >= eok) return `${(n / eok).toFixed(1)}억`;
  return n.toLocaleString('ko-KR') + '원';
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function debounce(fn, ms = 400) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function deepMerge(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof base?.[k] === 'object' && !Array.isArray(base?.[k]))
      ? deepMerge(base[k], v) : v;
  }
  return out;
}
