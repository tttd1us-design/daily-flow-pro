/**
 * 10조 자산가 모듈 — 목표 트리 · 라이브 밸류에이션 · 자동 커맨드 · 결정로그 · 킬링타임
 */
import { storage } from './storage.js';
import { computeEES, weakestAxis, weeklyEES, closeWeek } from './ees.js';
import { todayKST, daysBetween, fmtKRW, escapeHtml, lastNDays, sum, uid, shiftDate } from './utils.js';

const MULT = { bookRoyalty: 3, productArr: 12, dealPromote: 0.15 }; // 보수적 밸류 배수

export class TenTrillion {
  constructor(app) {
    this.app = app;
    this.date = app?.currentDate || todayKST();
    this.mount = this._ensureMount();
    storage.on('entity-changed', () => this.render());
    storage.on('decision-changed', () => this.render());
    storage.on('leak-changed', () => this.render());
    this.render();
  }

  setDate(d) { this.date = d; this.render(); }

  _ensureMount() {
    let el = document.getElementById('ttRoot');
    if (!el) {
      const pane = document.getElementById('pane-ten-trillion')
                || document.querySelector('[id*="ten-trillion"]')
                || document.body;
      el = document.createElement('div');
      el.id = 'ttRoot'; el.className = 'tt-root';
      pane.prepend(el);
    }
    return el;
  }

  /* ───────── 라이브 밸류에이션: 지배자산 현재값 ───────── */
  valuation() {
    const E = storage.data.entities;
    const books = sum(E.books, b => (b.royaltyYTD || 0) * MULT.bookRoyalty);
    const deals = sum(E.deals, d => d.stage === 'dead' ? 0 : (d.gdv || 0) * (d.probability ?? 0.3));
    const promote = sum(E.deals, d => (d.equity || 0) * MULT.dealPromote);
    const products = sum(E.products, p => (p.mrr || 0) * 12 * MULT.productArr * (p.ownership ?? 1));
    const assets = sum(E.assets, a => a.bookValue || 0);
    const ip = sum(E.ip, i => i.valuation || 0);
    const controlled = books + deals + products + assets + ip;
    const target = storage.data.vision.controlledTarget || 10e12;
    return {
      books, deals: deals + promote, products, assets, ip, controlled,
      pct: Math.min(100, controlled / target * 100),
      target
    };
  }

  /* ───────── 오늘의 커맨드 자동 생성 ───────── */
  generateCommands() {
    const ees = computeEES(this.date);
    const weak = weakestAxis(ees);
    const T = storage.data.targets;
    const E = storage.data.entities;
    const cmds = [];

    // 1) 항상 최우선: 활성 도서의 다음 미완성 챕터
    const book = E.books.find(b => b.status === 'writing') || E.books[0];
    if (book) {
      const ch = (book.chapters || []).find(c => (c.writtenChars || 0) < (c.targetChars || 18000));
      cmds.push({
        block: '05:30–07:00', min: 90, engineId: 'E1', type: 'write',
        entityId: book.id,
        text: ch ? `『${book.title}』 Ch.${ch.no} 「${ch.title}」 ${T.day.chars.toLocaleString()}자`
                 : `『${book.title}』 퇴고 90분`,
        why: '기상 직후는 아무도 요구하지 않는 유일한 시간'
      });
    }

    // 2) 취약 축 보정
    const fix = {
      capital: () => {
        const c = E.contacts
          .filter(x => x.nextTouch && x.nextTouch <= this.date)
          .sort((a, b) => (a.nextTouch || '').localeCompare(b.nextTouch || ''))[0];
        return { block: '14:00–14:25', min: 25, engineId: 'E5', type: 'contact', entityId: c?.id,
          text: c ? `${c.name}(${c.org}) 유효접촉 — 먼저 주고 30분 요청`
                  : '신규 유효접촉 1건 아웃리치 발송 (자료 선제공 → 30분 요청)',
          why: '자본 축 최저. 딜플로우는 접촉 수의 함수' };
      },
      transition: () => ({ block: '17:00–17:20', min: 20, engineId: null, type: 'refuse',
        text: '이번 주 들어온 용역 중 1건 거절 또는 외주 이관',
        why: '전환 축 최저. 거절 0건이면 아무것도 안 바뀐 것' }),
      decision: () => ({ block: '22:30–22:40', min: 10, engineId: null, type: 'decision',
        text: `결정 로그 ${T.day.decisions}건 기록 + 리뷰 대기 ${storage.pendingReviews(this.date).length}건 마감`,
        why: '결정 데이터는 A카테고리 10권과 AI코치의 학습 자산' }),
      authoring: () => ({ block: '20:00–20:50', min: 50, engineId: 'E1', type: 'write',
        text: '집필 보충 블록 — 부족분 채우기', why: '저작 축 최저' })
    };
    cmds.push(fix[weak]());

    // 3) 마감 임박 딜
    const urgent = E.deals.filter(d => d.dueDate && daysBetween(this.date, d.dueDate) <= 3 && d.stage !== 'dead');
    urgent.forEach(d => cmds.push({
      block: '10:00–10:30', min: 30, engineId: 'E2', type: 'deal', entityId: d.id,
      text: `[D-${daysBetween(this.date, d.dueDate)}] ${d.name} — ${d.nextAction || '다음 액션 정의'}`,
      why: '마감 임박'
    }));

    // 4) 미리뷰 결정 알림
    const pend = storage.pendingReviews(this.date);
    if (pend.length >= 3) cmds.push({ block: '23:00–23:15', min: 15, type: 'review',
      text: `결정 리뷰 밀림 ${pend.length}건 — 오늘 전부 마감`, why: '리뷰 없는 결정 로그는 일기일 뿐' });

    storage.updateDay(this.date, { commands: cmds });
    return { cmds, ees, weak };
  }

  /* ───────── 렌더 ───────── */
  render() {
    const v = this.valuation();
    const { cmds, ees, weak } = this.generateCommands();
    const w = weeklyEES(this.date);
    const vision = storage.data.vision;
    const dday = daysBetween(vision.startDate, this.date);
    const totalDays = (vision.horizonYears || 20) * 365;
    const leaks7 = storage.leaksIn(lastNDays(this.date, 7));
    const leakMin = sum(leaks7, l => l.minutes);
    const AX = { authoring: '저작', capital: '자본', transition: '전환', decision: '결정' };

    this.mount.innerHTML = `
    <div class="tt-hero">
      <div class="tt-hero-top">
        <div>
          <div class="tt-crown">👑 ${escapeHtml(vision.title)}</div>
          <div class="tt-identity">"${escapeHtml(vision.identity)}"</div>
        </div>
        <div class="tt-dday">
          <div class="tt-dday-num">D+${dday}</div>
          <div class="tt-dday-sub">/ ${totalDays.toLocaleString()}일 (${(dday / totalDays * 100).toFixed(2)}%)</div>
        </div>
      </div>
      <div class="tt-gauge"><div class="tt-gauge-fill" style="width:${Math.max(0.4, v.pct)}%"></div></div>
      <div class="tt-gauge-label">
        <span>현재 지배자산 <b>${fmtKRW(v.controlled)}</b></span>
        <span>목표 ${fmtKRW(v.target)} · 달성률 ${v.pct.toFixed(3)}%</span>
      </div>
      <div class="tt-val-split">
        ${[['IP·저작', v.books], ['개발·시행', v.deals], ['AI 프로덕트', v.products], ['실물자산', v.assets], ['특허·IP', v.ip]]
          .map(([n, x]) => `<div class="tt-val-chip"><span>${n}</span><b>${fmtKRW(x)}</b></div>`).join('')}
      </div>
    </div>

    <div class="tt-grid2">
      <div class="tt-card">
        <div class="tt-card-h">📊 오늘의 1% 실행지수
          <span class="tt-badge" style="background:${ees.color}22;color:${ees.color}">${ees.total}점 · ${ees.grade}</span>
        </div>
        ${[['authoring', 30, '#6366f1'], ['capital', 25, '#f59e0b'], ['transition', 20, '#10b981'], ['decision', 25, '#f43f5e']]
          .map(([k, cap, c]) => `
          <div class="tt-axis ${k === weak ? 'weak' : ''}">
            <div class="tt-axis-l"><span>${AX[k]}${k === weak ? ' ⚠ 최약점' : ''}</span><span>${ees[k]} / ${cap}</span></div>
            <div class="tt-track"><div class="tt-fill" style="width:${ees[k] / cap * 100}%;background:${c}"></div></div>
          </div>`).join('')}
        <div class="tt-raw">
          집필 ${ees.raw.chars.toLocaleString()}자 · 유효접촉 ${ees.raw.contacts}건 ·
          용역 ${ees.raw.billableH}h · 결정 ${ees.raw.logged}건 · 리뷰율 ${ees.raw.reviewRate}%
        </div>
        <div class="tt-week">주간 평균 <b>${w.avg}점 (${w.grade})</b>
          ${w.delta == null ? '' : `<span class="${w.delta >= 0 ? 'up' : 'down'}">${w.delta >= 0 ? '▲' : '▼'} ${Math.abs(w.delta)}</span>`}
          <button class="tt-btn sm" id="ttCloseWeek">주간 결산 발행</button>
        </div>
      </div>

      <div class="tt-card">
        <div class="tt-card-h">⚡ 오늘의 커맨드 <span class="tt-sub">시스템 자동 생성</span></div>
        <div class="tt-cmds">
          ${cmds.map((c, i) => `
            <div class="tt-cmd">
              <div class="tt-cmd-time">${c.block || '—'}</div>
              <div class="tt-cmd-body">
                <div class="tt-cmd-text">${escapeHtml(c.text)}</div>
                <div class="tt-cmd-why">↳ ${escapeHtml(c.why || '')}</div>
              </div>
              <button class="tt-btn xs push" data-cmd="${i}">→ 오늘 할 일</button>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="tt-card">
      <div class="tt-card-h">🌳 목표 트리 <span class="tt-sub">숫자만 관리 · 4주 연속 C면 자동 하향</span></div>
      <div class="tt-tree">
        ${this._treeRow('연간 (Y1)', storage.data.targets.year1, { books: '권', chars: '자', contacts: '명', mrr: '원/월' })}
        ${this._treeRow('분기', storage.data.targets.quarter, { books: '권', chars: '자', contacts: '명', deals: '건' })}
        ${this._treeRow('월간', storage.data.targets.month, { books: '권', chars: '자', contacts: '명', decisions: '건' })}
        ${this._treeRow('주간', storage.data.targets.week, { chars: '자', deepMin: '분', contacts: '명', decisions: '건', billableHours: 'h', workouts: '회' })}
        ${this._treeRow('일간', storage.data.targets.day, { chars: '자', deepMin: '분', decisions: '건', sleepMin: '분' })}
      </div>
    </div>

    <div class="tt-grid2">
      <div class="tt-card">
        <div class="tt-card-h">📚 저작 파이프라인 <button class="tt-btn xs" id="ttAddBook">+ 도서</button></div>
        ${this._books()}
      </div>
      <div class="tt-card">
        <div class="tt-card-h">🏗️ 딜 파이프라인 <button class="tt-btn xs" id="ttAddDeal">+ 딜</button></div>
        ${this._deals()}
      </div>
    </div>

    <div class="tt-grid2">
      <div class="tt-card">
        <div class="tt-card-h">🧭 결정 로그 <span class="tt-sub">리뷰 대기 ${storage.pendingReviews(this.date).length}건</span></div>
        <form id="ttDecForm" class="tt-form">
          <input name="question" placeholder="오늘 내린 결정 (질문 형태로)" required>
          <input name="chosen" placeholder="선택한 안">
          <input name="reasoning" placeholder="선택 이유 한 줄">
          <div class="tt-form-row">
            <label class="tt-chk"><input type="checkbox" name="reversible"> 되돌릴 수 있음</label>
            <select name="stake"><option value="S">S(소)</option><option value="M" selected>M(중)</option><option value="L">L(대)</option></select>
            <input type="date" name="reviewDate" value="${shiftDate(this.date, 30)}">
            <button class="tt-btn sm">기록</button>
          </div>
        </form>
        ${this._decisions()}
      </div>

      <div class="tt-card">
        <div class="tt-card-h">🕳️ 킬링타임 추적 <span class="tt-sub">7일 누수 ${Math.floor(leakMin / 60)}h ${leakMin % 60}m</span></div>
        <form id="ttLeakForm" class="tt-form">
          <div class="tt-form-row">
            <input name="source" placeholder="유출원 (예: 유튜브)" required>
            <input name="minutes" type="number" placeholder="분" min="1" required style="max-width:90px">
          </div>
          <input name="trigger" placeholder="촉발 상황 (예: 저녁 식후 소파)">
          <input name="replacedWith" placeholder="무엇으로 대체했는가 ← 이게 진짜 지표">
          <button class="tt-btn sm">기록</button>
        </form>
        ${this._leaks(leaks7)}
      </div>
    </div>

    <div class="tt-footer">
      <button class="tt-btn" id="ttExport">데이터 내보내기</button>
      <label class="tt-btn file">데이터 가져오기<input type="file" id="ttImport" accept="application/json" hidden></label>
      <span class="tt-usage">저장소 ${storage.usage().mb}MB / 5MB (${storage.usage().pct}%)</span>
    </div>`;

    this.bind(cmds);
  }

  _treeRow(label, obj, units) {
    return `<div class="tt-tree-row"><div class="tt-tree-l">${label}</div><div class="tt-tree-v">
      ${Object.entries(units).map(([k, u]) => `
        <span class="tt-kv"><i>${k}</i>
          <input class="tt-num" data-t="${label}" data-k="${k}" value="${obj[k] ?? 0}">
          <em>${u}</em></span>`).join('')}
    </div></div>`;
  }

  _books() {
    const bs = storage.list('books');
    if (!bs.length) return `<div class="tt-empty">도서를 등록하면 챕터 단위 진척이 EES 저작 축에 자동 반영됩니다.</div>`;
    return bs.map(b => {
      const written = sum(b.chapters, c => c.writtenChars);
      const target = sum(b.chapters, c => c.targetChars) || b.targetChars || 270000;
      const pct = Math.min(100, written / target * 100);
      const eta = written > 0 ? Math.ceil((target - written) / (storage.data.targets.day.chars || 3600)) : '—';
      return `<div class="tt-item">
        <div class="tt-item-h"><b>${escapeHtml(b.title)}</b><span class="tt-tag">${b.cat || ''} · ${b.status || 'idea'}</span></div>
        <div class="tt-track"><div class="tt-fill" style="width:${pct}%;background:#6366f1"></div></div>
        <div class="tt-item-f">${written.toLocaleString()} / ${target.toLocaleString()}자 (${pct.toFixed(1)}%) · 잔여 ${eta}일</div>
      </div>`;
    }).join('');
  }

  _deals() {
    const ds = storage.list('deals');
    if (!ds.length) return `<div class="tt-empty">딜을 등록하면 GDV×확률이 지배자산 게이지에 실시간 반영됩니다.</div>`;
    const STAGE = { lead: '발굴', ld: '실사', term: '조건협의', fin: '금융조달', exec: '실행', exit: '회수', dead: '종결' };
    return ds.map(d => `<div class="tt-item">
      <div class="tt-item-h"><b>${escapeHtml(d.name)}</b><span class="tt-tag">${STAGE[d.stage] || d.stage}</span></div>
      <div class="tt-item-f">GDV ${fmtKRW(d.gdv)} · 지분 ${fmtKRW(d.equity)} · 확률 ${Math.round((d.probability ?? 0.3) * 100)}%
        ${d.dueDate ? ` · D-${daysBetween(this.date, d.dueDate)}` : ''}</div>
      <div class="tt-item-next">▶ ${escapeHtml(d.nextAction || '다음 액션 미정')}</div>
    </div>`).join('');
  }

  _decisions() {
    const recent = storage.data.decisions.slice(-6).reverse();
    if (!recent.length) return `<div class="tt-empty">하루 3건 × 3년 = 3,285건. 이 데이터셋이 도서·SaaS·강의로 분기합니다.</div>`;
    return `<div class="tt-declist">${recent.map(d => `
      <div class="tt-dec ${d.actualOutcome ? 'done' : ''}">
        <div class="tt-dec-q">${escapeHtml(d.question)}</div>
        <div class="tt-dec-m">${d.date} · ${d.reversible ? '가역' : '불가역'} · ${d.stake}
          ${d.reviewDate ? ` · 리뷰 ${d.reviewDate}` : ''}</div>
        ${d.actualOutcome == null && d.reviewDate <= this.date
          ? `<div class="tt-dec-r"><input placeholder="실제 결과" data-rev="${d.id}">
             <select data-score="${d.id}">${[2, 1, 0, -1, -2].map(s => `<option value="${s}">${s > 0 ? '+' : ''}${s}</option>`).join('')}</select>
             <button class="tt-btn xs" data-revbtn="${d.id}">리뷰 완료</button></div>` : ''}
      </div>`).join('')}</div>`;
  }

  _leaks(leaks) {
    if (!leaks.length) return `<div class="tt-empty">7일 베이스라인부터. 참지 말고 기록만 하세요.</div>`;
    const by = {};
    leaks.forEach(l => by[l.source] = (by[l.source] || 0) + l.minutes);
    const max = Math.max(...Object.values(by));
    return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([s, m]) => `
      <div class="tt-axis"><div class="tt-axis-l"><span>${escapeHtml(s)}</span><span>${m}분</span></div>
      <div class="tt-track"><div class="tt-fill" style="width:${m / max * 100}%;background:#f43f5e"></div></div></div>`).join('');
  }

  /* ───────── 이벤트 ───────── */
  bind(cmds) {
    const $ = s => this.mount.querySelector(s);
    const $$ = s => [...this.mount.querySelectorAll(s)];

    // 커맨드 → 오늘 할 일 주입
    $$('[data-cmd]').forEach(b => b.onclick = () => {
      const c = cmds[+b.dataset.cmd];
      storage.pushToDay(this.date, 'todos', {
        text: c.text, engineId: c.engineId || null, entityId: c.entityId || null,
        type: c.type, estMin: c.min || 25, actualMin: 0, completed: false
      });
      b.textContent = '✓ 주입됨'; b.disabled = true;
      this.app?.showToast?.('오늘 할 일에 추가했습니다.', 'success');
      storage.saveNow();
    });

    // 목표 트리 인라인 편집
    $$('.tt-num').forEach(i => i.onchange = () => {
      const map = { '연간 (Y1)': 'year1', '분기': 'quarter', '월간': 'month', '주간': 'week', '일간': 'day' };
      storage.data.targets[map[i.dataset.t]][i.dataset.k] = Number(i.value) || 0;
      storage.saveNow(); this.render();
    });

    // 결정 기록
    $('#ttDecForm').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      storage.addDecision({
        date: this.date, question: f.get('question'), chosen: f.get('chosen'),
        reasoning: f.get('reasoning'), reversible: f.get('reversible') === 'on',
        stake: f.get('stake'), reviewDate: f.get('reviewDate')
      });
      e.target.reset(); storage.saveNow();
    };
    $$('[data-revbtn]').forEach(b => b.onclick = () => {
      const id = b.dataset.revbtn;
      storage.reviewDecision(id,
        this.mount.querySelector(`[data-rev="${id}"]`).value,
        Number(this.mount.querySelector(`[data-score="${id}"]`).value));
      storage.saveNow();
    });

    // 킬링타임
    $('#ttLeakForm').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      storage.addLeak({ date: this.date, source: f.get('source'), minutes: f.get('minutes'),
        trigger: f.get('trigger'), replacedWith: f.get('replacedWith') });
      e.target.reset(); storage.saveNow();
    };

    // 개체 추가
    $('#ttAddBook').onclick = () => {
      const title = prompt('도서 제목'); if (!title) return;
      const n = Number(prompt('챕터 수', '15')) || 15;
      storage.upsert('books', {
        title, cat: prompt('카테고리 코드 (A~J)', 'B') || 'B', status: 'writing', royaltyYTD: 0,
        chapters: Array.from({ length: n }, (_, i) => ({ no: i + 1, title: `Ch.${i + 1}`, targetChars: 18000, writtenChars: 0, status: 'todo' }))
      });
    };
    $('#ttAddDeal').onclick = () => {
      const name = prompt('딜 이름'); if (!name) return;
      storage.upsert('deals', {
        name, type: prompt('유형 (개발/매입/리츠)', '개발'),
        gdv: Number(prompt('GDV(원)', '30000000000')) || 0,
        equity: Number(prompt('내 지분 투입(원)', '0')) || 0,
        probability: Number(prompt('성사 확률 0~1', '0.3')) || 0.3,
        stage: 'lead', nextAction: prompt('다음 액션', '') || '', dueDate: prompt('마감일 YYYY-MM-DD', '') || null
      });
    };

    // 주간 결산 / 백업
    $('#ttCloseWeek').onclick = () => {
      const r = closeWeek(this.date);
      alert(`주간 결산 ${r.weekStart}\n평균 ${r.avg}점 (${r.grade})` +
        (r.downgraded ? `\n\n⚠ 4주 연속 C 이하 — 목표 자동 하향\n일 집필 ${r.downgraded.chars}자 / 주 접촉 ${r.downgraded.contacts}명` : ''));
      this.render();
    };
    $('#ttExport').onclick = () => storage.exportJSON();
    $('#ttImport').onchange = e => e.target.files[0] && storage.importJSON(e.target.files[0]).catch(err => alert(err.message));
  }
}
