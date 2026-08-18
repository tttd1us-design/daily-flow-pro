/**
 * Life OS v2 — Storage Manager
 * 다이어리(days) + 엔티티(entities) + 결정(decisions) + 킬링타임(leaks) + 밸류에이션 + BPI + 목표/메모/원칙/학습 통합 매니저
 */
import { todayKST, uid, deepMerge, sum } from './utils.js';
import { controlAssets, netWorth, LEDGER_RULES } from './valuation.js';

const KEY = 'life_os_v2';
const LEGACY = 'daily_flow_data_v1';
const SCHEMA = 2;

const DEFAULT_PRINCIPLES = [
  { id: 'p1', category: 'execution', title: '완벽주의를 버리고 가장 작은 행동부터 즉각 실행한다', content: '생각이 길어지면 뇌는 핑계를 찾는다. 5분 안에 착수할 수 있는 가장 단순한 행동으로 몰입을 유도한다.' },
  { id: 'p2', category: 'growth', title: '하루 1시간 복리 지식은 1년 뒤 압도적 격차를 만든다', content: '단순히 일만 하는 것이 아니라, 매일 배운 지식을 기록하고 실무에 적용하여 나만의 지식 자산을 구축한다.' },
  { id: 'p3', category: 'mindset', title: '통제할 수 없는 환경에 불평하지 않고 내 행동에만 집중한다', content: '외부 변수는 내가 바꿀 수 없다. 오늘 내가 선택하고 실행할 수 있는 단 하나의 우선순위에 모든 에너지를 쏟는다.' }
];

const DEFAULT_GOALS = [
  {
    id: 'g1',
    pillar: 'career',
    horizon: 'long',
    title: '데이터 기반 부동산 금융 및 디벨로퍼 시스템 구축',
    keyResult: '『건축사가 읽는 돈의 도면』 1호 완간 & BPI 접촉 48명 달성',
    actions: ['매일 아침 05:30 90분 집필 3,600자', '주 1회 BPI 타깃 의사결정권자 아웃리치', '월 60건 결정 로그 축적'],
    deadline: '2027-08-17',
    progress: 35
  },
  {
    id: 'g2',
    pillar: 'wealth',
    horizon: 'mid',
    title: '지배자산 10조 및 지주회사 설립 아키텍처',
    keyResult: 'SPV 1호 소액 LP 참여 및 SaaS MRR 300만원 달성',
    actions: ['개발 GDV 착공 100% / 인허가 30% 보수적 계상', '현금성 자산 고정비 18개월분 상시 유지'],
    deadline: '2028-08-17',
    progress: 20
  },
  {
    id: 'g3',
    pillar: 'health',
    horizon: 'short',
    title: '최상위 신체 자산 방어 (수면 7시간 & 주 4회 운동)',
    keyResult: '월 16회 운동 완료 및 23:00 취침 준수',
    actions: ['기상 직후 미온수 500ml', '운동 45분 루틴 완료', '취침 1시간 전 스마트폰 끄기'],
    deadline: '2026-09-30',
    progress: 60
  }
];

const DEFAULT_STATE = () => ({
  meta: { schema: SCHEMA, tz: 'Asia/Seoul', createdAt: todayKST(), lastBackup: null },

  vision: {
    title: '지배자산 10조 / 순자산 8,000억~1.2조',
    controlledTarget: 10e12,
    netWorthTarget: 800e9,
    startDate: '2026-08-18',
    horizonYears: 20,
    identity: '나는 부동산 의사결정 시스템을 만드는 사람이고, 설계는 그 일부다.',
    principles: [
      '거절이 전략이다 (월 2건 이상 거절)',
      '가역성을 먼저 본다 (가역은 빠르게, 불가역은 신중하게)',
      '비대칭에만 베팅한다 (하방 제한, 상방 무한대)',
      '먼저 준다 (자료·통찰·소개 선제공 후 요청)',
      '복리에만 시간을 쓴다 (3년 뒤 가치 창출 여부)',
      '기록의 무결성은 타협하지 않는다',
      '신체가 최상위 자산이다 (수면 7시간 & 주 4회 운동)'
    ],
    phases: [
      { id: 'P1', name: '증명', yr: [0, 2], net: 3e9, ctrl: 3e10, question: '내 지식이 돈을 내는 제품이 되는가', guard: '용역 비중 상한, 금지 목록' },
      { id: 'P2', name: '증폭', yr: [2, 5], net: 2e10, ctrl: 2e11, question: '나 없이도 돌아가는 구조가 되는가', guard: '채용 전 3개월 프로젝트 동행 원칙' },
      { id: 'P3', name: '자본화', yr: [5, 10], net: 2e11, ctrl: 1.5e12, question: '남의 돈을 책임지고 운용할 자격을 갖췄는가', guard: '인가 요건 역산 5년 준비표' },
      { id: 'P4', name: '구조화', yr: [10, 15], net: 7e11, ctrl: 5e12, question: '유동성을 영구 자산으로 전환했는가', guard: '사전 확정 매각 트리거' },
      { id: 'P5', name: '지배', yr: [15, 20], net: 1.2e12, ctrl: 1e13, question: '내가 없어도 100년 가는가', guard: '경영진 승계 및 재단 구조' }
    ],
    milestones: [
      { id: 'M1', due: '2027-08-17', name: 'Y1 증명 완료', gate: ['books>=3', 'mrr>=3000000', 'retention>=0.4'] },
      { id: 'M2', due: '2028-02-01', name: '첫 채용 3인 완료', gate: ['team>=3', 'mrr>=20000000'] },
      { id: 'M3', due: '2028-08-17', name: 'Y2 증폭 완료', gate: ['books>=6', 'mrr>=30000000', 'net>=3e9'] },
      { id: 'M4', due: '2029-02-01', name: 'SPV 1호 착공', gate: ['gdv>=4e10', 'equity>=5e8'] },
      { id: 'M5', due: '2029-08-17', name: 'Y3 ARR 10억', gate: ['arr>=1e9', 'books>=10'] },
      { id: 'M6', due: '2032-08-17', name: 'AMC 인가 신청', gate: ['capital>=7e9', 'experts>=5'] }
    ],
    stopRules: {
      deal: [
        '인허가 예상 기간 최초 대비 6개월 이상 지연 조짐 시 중단',
        '공사비 견적 초기 대비 15% 이상 상승 시 중단',
        'FI 모집 90일 내 목표 70% 미달 시 진행 불가',
        '기준금리 진입 시점 대비 150bp 이상 상승 시 보류'
      ],
      hiring: [
        '과제(1주 유상) 기한 미준수 시 즉시 탈락',
        '동행(4주) 중 질문의 질이 낮으면 채용 중단',
        '시범(3개월) 명시적 목표 3개 중 2개 미달 시 정규 미전환'
      ],
      saas: [
        '월 이탈률 6% 초과 2개월 연속 시 신규 마케팅 전면 중단 및 제품 재점검',
        '순매출유지율(NRR) 2분기 연속 100% 미만 시 전략적 매각 프로세스 개시'
      ],
      self: [
        'EES 4주 연속 55점 미만 시 회복일 월 8회로 자동 확대 및 목표 하향'
      ]
    },
    forbiddenListYear1: [
      '유튜브 채널 개설 (Y2 Q1 도서 3권+유료 15명 달성 전 금지)',
      '대학 출강 지원 (Q3 8주 유료강의 검증 전 금지)',
      '신규 카테고리 도서 착수 (우선 5권 외 신규 기획 금지)',
      '시행 직접 참여 (소액 LP 참여 1건 외 자체시행 금지)',
      '자산운용사·리스사 설립 (Y3 이전 법인 설립 금지)',
      '오프라인 사무실 임차',
      '직원 정규 채용 (Y2 이전 1인 체제 유지)',
      '신규 자격증 취득',
      '무료 강연·세미나 연사',
      '지분 없는 자문 활동'
    ],
    assetBridge: [
      { axis: 'amc', y10: 5e11, y15: 1.5e12, y20: 3e12, net: 8.5e10 },
      { axis: 'devGDV', y10: 1e12, y15: 3e12, y20: 6e12, net: 2.5e11 },
      { axis: 'platform', y10: 2e11, y15: 6e11, y20: 1e12, net: 1.6e11 },
      { axis: 'realAsset', y10: 5e10, y15: 2e11, y20: 5e11, net: 2.5e11 },
      { axis: 'ip', y10: 1e10, y15: 3e10, y20: 5e10, net: 3e10 }
    ],
    criticalGate: 'AMC 인가 또는 대체경로(공동운용/전문사모/M&A) 확보 — 실패 시 현실적 상한 4~5조'
  },

  engines: [
    { id: 'E1', name: 'IP·저작',     weight: 0.30, kpi: 'chars',     color: '#6366f1' },
    { id: 'E2', name: '개발·시행',   weight: 0.25, kpi: 'gdv',       color: '#f59e0b' },
    { id: 'E3', name: '금융·운용',   weight: 0.20, kpi: 'aum',       color: '#10b981' },
    { id: 'E4', name: 'AI 프로덕트', weight: 0.15, kpi: 'mrr',       color: '#06b6d4' },
    { id: 'E5', name: '자본·인맥',   weight: 0.10, kpi: 'contacts',  color: '#f43f5e' }
  ],

  entities: {
    books: [
      {
        id: 'bk_1',
        title: '건축사가 읽는 돈의 도면',
        cat: 'B',
        status: 'writing',
        targetPersona: '연 GDV 300억~1,000억 규모 시행사 대표와, 그 딜을 심사하는 PF 심사역',
        bpi_target: 12,
        royaltyYTD: 0,
        targetChars: 270000,
        chapters: [
          { no: 1, title: '도면에는 가격표가 붙어 있다', targetChars: 18000, writtenChars: 0, status: 'writing' },
          { no: 2, title: '건축사는 왜 돈을 못 버는가', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 3, title: '땅을 처음 볼 때 봐야 할 7가지', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 4, title: '용적률은 숫자가 아니라 돈이다', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 5, title: '첫 수지분석 30분 컷', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 6, title: '공사비가 흔들릴 때 지켜야 할 선', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 7, title: '인허가는 시간이고 시간은 이자다', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 8, title: '브릿지론이라는 외줄', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 9, title: '본PF의 문턱을 넘는 조건', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 10, title: '신탁, 안전장치인가 족쇄인가', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 11, title: '분양과 임대, 출구의 갈림길', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 12, title: '실패한 현장 6곳의 부검', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 13, title: '설계자에서 시행자로', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 14, title: 'AI가 수지분석을 대신할 때', targetChars: 18000, writtenChars: 0, status: 'todo' },
          { no: 15, title: '다음 10년, 어떤 건물이 돈이 되는가', targetChars: 18000, writtenChars: 0, status: 'todo' }
        ]
      }
    ],
    deals: [],
    contacts: [],
    products: [
      { id: 'prd_1', name: 'Daily Flow Pro (1% Life OS)', mrr: 0, arr: 0, ownership: 1.0, stage: 'beta' }
    ],
    assets: [],
    ip: [],
    skills: [],
    prompts: []
  },

  goals: DEFAULT_GOALS,
  principles: DEFAULT_PRINCIPLES,
  memos: [],
  trillionMastery: {
    vision: '지배자산 10조 / 순자산 8,000억~1.2조',
    val1: '거절이 전략이다',
    val2: '비대칭에만 베팅한다',
    val3: '기록의 무결성은 타협하지 않는다',
    ideas: [
      {
        id: 'tidea_1',
        title: '부동산 수지분석 AI 프롭테크 SaaS (Daily Flow Pro)',
        content: '수지분석 30분 컷 및 딜 파이프라인 관리 B2B 솔루션. ARR 800억 플랫폼 구축.',
        category: 'business',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tidea_2',
        title: '100권 저작 기반 1,200인 BPI 앵커 LP 네트워크',
        content: '책을 읽고 유입된 의사결정권자 DB를 AUM 3조 운용 자본으로 조직화.',
        category: 'invest',
        createdAt: new Date().toISOString()
      }
    ]
  },

  targets: {
    year1:   { books: 3, chars: 900000, contacts: 48, mrr: 3000000, billableRatio: 0.8, decisions: 700 },
    quarter: { books: 1, chars: 225000, contacts: 12, deals: 0, decisions: 180 },
    month:   { books: 0, chars: 75000,  contacts: 4,  decisions: 60, refusals: 2, workouts: 16 },
    week:    { chars: 18000, deepMin: 900, contacts: 1, decisions: 15, billableHours: 40, workouts: 4, refusals: 1 },
    day:     { chars: 3600,  deepMin: 90,  decisions: 3, sleepMin: 420 }
  },

  days: {},
  decisions: [],
  leaks: [],
  reports: [],
  settings: {
    theme: 'dark', userName: '결정디자이너', geminiApiKey: '', geminiModel: 'gemini-1.5-flash',
    aiPersona: 'fact', autoBackupDays: 7, downgradeGuard: true, recoveryDaysPerMonth: 4,
    defaultHabits: [
      { id: 'h1', name: '기상 후 90분 집필 (3,600자)', icon: '✍️', engineId: 'E1', target: 1 },
      { id: 'h2', name: '운동 45분 (주 4회)',           icon: '🏃', engineId: null, target: 1 },
      { id: 'h3', name: '결정 로그 3건 기록',          icon: '🧭', engineId: null, target: 1 },
      { id: 'h4', name: '수면 7시간 확보',             icon: '😴', engineId: null, target: 1 }
    ]
  }
});

const dayShape = () => ({
  focus: '', mood: null,
  condition: { water: 0, energy: 50, sleep: 7.0, sleepMin: 420, workout: false, memo: '', isRecoveryDay: false },
  todos: [],
  deepwork: [],
  timeBlocks: [],
  habits: {},
  study: { topic: '', goalHours: 2.0, actualHours: 0, til: '', notes: '', photos: [] },
  eveningRoutine: { goal: '', actualHours: 0, focusRate: 100, review: '', todayTasks: [], tomorrowTasks: [] },
  journal: { title: '', content: '', tags: [], photos: [], photoIds: [], updatedAt: null },
  ees: null,
  commands: []
});

/* ─────────────── 사진 전용 IndexedDB ─────────────── */
const PhotoDB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    if (typeof indexedDB === 'undefined') return null;
    try {
      this._db = await new Promise((res, rej) => {
        const r = indexedDB.open('life_os_photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch (e) { console.warn('PhotoDB open failed', e); }
    return this._db;
  },
  async put(dataUrl) {
    const db = await this.open(); const id = uid('ph');
    if (!db) return id;
    await new Promise((res, rej) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ id, dataUrl, at: Date.now() });
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    return id;
  },
  async get(id) {
    const db = await this.open();
    if (!db) return null;
    return new Promise(res => {
      const r = db.transaction('photos').objectStore('photos').get(id);
      r.onsuccess = () => res(r.result?.dataUrl || null);
      r.onerror = () => res(null);
    });
  },
  async del(id) {
    const db = await this.open();
    if (!db) return;
    return new Promise(res => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id); tx.oncomplete = res;
    });
  }
};

/* ─────────────── 매니저 ─────────────── */
class StorageManager {
  constructor() {
    this._subs = {};
    this._dirty = false;
    this.data = this._load();
    this._autoBackupCheck();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this._dirty && this.saveNow());
      setInterval(() => this._dirty && this.saveNow(), 15000);
    }
  }

  async init() {
    return Promise.resolve(this.data);
  }

  _load() {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_STATE();
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this._normalize(parsed);
      }
      const legacy = localStorage.getItem(LEGACY);
      if (legacy) {
        const migrated = this._migrateV1(JSON.parse(legacy));
        localStorage.setItem(KEY, JSON.stringify(migrated));
        localStorage.setItem(LEGACY + '_backup', legacy);
        console.info('[LifeOS] v1 → v2 마이그레이션 완료');
        return migrated;
      }
    } catch (e) { console.error('[LifeOS] load 실패, 기본값 사용', e); }
    return DEFAULT_STATE();
  }

  _normalize(parsed) {
    const base = DEFAULT_STATE();
    const merged = deepMerge(base, parsed);
    merged.entities = deepMerge(base.entities, parsed.entities || {});
    merged.days = parsed.days || {};
    merged.goals = parsed.goals || DEFAULT_GOALS;
    merged.principles = parsed.principles || DEFAULT_PRINCIPLES;
    merged.memos = parsed.memos || [];
    merged.trillionMastery = parsed.trillionMastery || base.trillionMastery;
    merged.meta.schema = SCHEMA;

    if (merged.entities.books) {
      merged.entities.books.forEach(b => {
        if (!b.targetPersona && b.title === '건축사가 읽는 돈의 도면') {
          b.targetPersona = '연 GDV 300억~1,000억 규모 시행사 대표와, 그 딜을 심사하는 PF 심사역';
        }
        b.bpi_target = b.bpi_target || 12;
      });
    }

    return merged;
  }

  _migrateV1(v1) {
    const s = DEFAULT_STATE();
    s.meta.migratedFrom = LEGACY;
    s.settings.userName = v1?.settings?.userName || s.settings.userName;
    s.settings.theme = v1?.settings?.theme || 'dark';

    for (const [date, d] of Object.entries(v1?.days || {})) {
      const nd = dayShape();
      nd.focus = d.focus || '';
      nd.mood = d.mood ?? null;
      nd.condition = {
        water: d.condition?.water ?? 0,
        energy: d.condition?.energy ?? 50,
        sleep: d.condition?.sleep ?? 7.0,
        sleepMin: Math.round((d.condition?.sleep ?? 7) * 60),
        workout: false,
        memo: d.condition?.memo || '',
        isRecoveryDay: false
      };
      nd.todos = (d.todos || []).map(t => ({
        id: t.id || uid('td'), text: t.text || '',
        engineId: mapCat(t.category), entityId: null, type: 'task',
        estMin: 25, actualMin: 0, completed: !!t.completed,
        category: t.category || 'work'
      }));
      nd.deepwork = (d.timeBlocks || []).map(b => ({
        id: uid('dw'), start: b.start || '', end: b.end || '',
        engineId: mapCat(b.category), entityId: null, chapterNo: null,
        chars: 0, quality: 3, type: 'deep',
        title: b.title || '', category: b.category || 'work'
      }));
      nd.timeBlocks = d.timeBlocks || [];
      nd.habits = d.habits || {};
      nd.study = d.study || nd.study;
      nd.eveningRoutine = d.eveningRoutine || nd.eveningRoutine;
      nd.journal = {
        title: d.journal?.title || '', content: d.journal?.content || '',
        tags: d.journal?.tags || [], photos: d.journal?.photos || [],
        photoIds: [],
        updatedAt: d.journal?.updatedAt || null
      };
      nd.legacyHabits = d.habits || {};
      s.days[date] = nd;
    }
    return s;

    function mapCat(c) {
      return ({ work: 'E2', study: 'E1', personal: null, health: null })[c] ?? null;
    }
  }

  async init() {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/load-data');
        if (res.ok) {
          const diskData = await res.json();
          if (diskData && (diskData.meta || diskData.days)) {
            this.data = this._normalize(diskData);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(KEY, JSON.stringify(this.data));
            }
            console.info('[LifeOS] Local disk data synchronized successfully (data/state.json)');
          }
        }
      } catch (e) {
        // Offline or static server
      }
    }
    return Promise.resolve(this.data);
  }

  save() { this._dirty = true; }

  saveNow() {
    if (typeof localStorage === 'undefined') return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this._dirty = false;
      this.emit('saved', { at: Date.now() });

      // Save to disk asynchronously
      if (typeof fetch !== 'undefined') {
        fetch('/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        }).catch(e => {});
      }

      return true;
    } catch (e) {
      const quota = e?.name === 'QuotaExceededError' || e?.code === 22;
      this.emit('save-error', { quota, error: e });
      if (typeof alert !== 'undefined') {
        alert(quota
          ? '⚠️ 저장 공간이 가득 찼습니다. [데이터 내보내기]로 백업 후 오래된 사진을 정리하세요.'
          : '⚠️ 저장에 실패했습니다: ' + e.message);
      }
      return false;
    }
  }

  async syncGitHub() {
    this.saveNow();
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/sync-github', { method: 'POST' });
        return await res.json();
      } catch (e) {
        return { status: 'error', message: e.message };
      }
    }
    return { status: 'error', message: '오프라인 환경입니다.' };
  }

  on(evt, cb) { (this._subs[evt] ||= []).push(cb); return () => this.off(evt, cb); }
  off(evt, cb) { this._subs[evt] = (this._subs[evt] || []).filter(f => f !== cb); }
  emit(evt, payload) { (this._subs[evt] || []).forEach(f => { try { f(payload); } catch (e) { console.error(e); } }); }

  getDay(date = todayKST()) {
    if (!this.data.days[date]) this.data.days[date] = dayShape();
    return this.data.days[date];
  }
  updateDay(date, patch) {
    const current = this.getDay(date);
    if (patch.condition && patch.condition.sleep !== undefined && patch.condition.sleepMin === undefined) {
      patch.condition.sleepMin = Math.round(patch.condition.sleep * 60);
    }
    this.data.days[date] = deepMerge(current, patch);
    if (patch.timeBlocks && (!patch.deepwork || !patch.deepwork.length)) {
      this.data.days[date].deepwork = patch.timeBlocks.map(b => ({
        id: b.id || uid('dw'), start: b.start || '', end: b.end || '',
        engineId: null, entityId: null, chapterNo: null, chars: 0, quality: 3, type: 'deep',
        title: b.title || '', category: b.category || 'work'
      }));
    }
    this.save(); this.emit('day-changed', { date });
    return this.data.days[date];
  }
  pushToDay(date, field, obj) {
    const day = this.getDay(date);
    const item = { id: uid(field.slice(0, 2)), ...obj };
    (day[field] ||= []).push(item);
    this.save(); this.emit('day-changed', { date });
    return item;
  }

  /* ── v1 & App Bundle 호환 어댑터 ── */
  getDayData(date) { return this.getDay(date); }
  updateDayData(date, patch) { return this.updateDay(date, patch); }
  async saveData() { return Promise.resolve(this.saveNow()); }
  getHabits() { return this.data.settings.defaultHabits || []; }
  addHabit(name, icon = '✨') {
    const newHabit = { id: 'h_' + Date.now(), name, icon, target: 1 };
    (this.data.settings.defaultHabits ||= []).push(newHabit);
    this.saveNow();
    return newHabit;
  }
  deleteHabit(habitId) {
    this.data.settings.defaultHabits = (this.data.settings.defaultHabits || []).filter(h => h.id !== habitId);
    this.saveNow();
  }

  /* Goals */
  getGoals() { return this.data.goals ||= DEFAULT_GOALS; }
  addGoal(goal) {
    const g = { id: 'g_' + Date.now(), progress: 0, ...goal };
    (this.data.goals ||= []).unshift(g);
    this.saveNow();
    return g;
  }
  updateGoal(id, patch) {
    const g = (this.data.goals || []).find(x => x.id === id);
    if (g) { Object.assign(g, patch); this.saveNow(); }
  }
  deleteGoal(id) {
    this.data.goals = (this.data.goals || []).filter(x => x.id !== id);
    this.saveNow();
  }

  /* Principles */
  getPrinciples() { return this.data.principles ||= DEFAULT_PRINCIPLES; }
  addPrinciple(p) {
    const item = { id: 'p_' + Date.now(), ...p };
    (this.data.principles ||= []).unshift(item);
    this.saveNow();
    return item;
  }
  deletePrinciple(id) {
    this.data.principles = (this.data.principles || []).filter(x => x.id !== id);
    this.saveNow();
  }

  /* Memos */
  getMemos() { return this.data.memos ||= []; }
  addMemo(memo) {
    const m = {
      id: 'memo_' + Date.now(),
      title: memo.title || '새로운 아이디어',
      content: memo.content || '',
      category: memo.category || 'idea',
      pinned: memo.pinned || false,
      date: memo.date || todayKST(),
      createdAt: new Date().toISOString()
    };
    (this.data.memos ||= []).unshift(m);
    this.saveNow();
    return m;
  }
  updateMemo(id, patch) {
    const m = (this.data.memos || []).find(x => x.id === id);
    if (m) { Object.assign(m, patch); this.saveNow(); }
  }
  deleteMemo(id) {
    this.data.memos = (this.data.memos || []).filter(x => x.id !== id);
    this.saveNow();
  }

  /* Trillion Mastery */
  getTrillionMastery() { return this.data.trillionMastery ||= DEFAULT_STATE().trillionMastery; }
  updateTrillionMastery(patch) {
    this.data.trillionMastery = { ...this.getTrillionMastery(), ...patch };
    this.saveNow();
    return this.data.trillionMastery;
  }
  addTrillionIdea(idea) {
    const mastery = this.getTrillionMastery();
    const newIdea = {
      id: 'tidea_' + Date.now(),
      title: idea.title || '10조 아이디어',
      content: idea.content || '',
      category: idea.category || 'business',
      createdAt: new Date().toISOString()
    };
    (mastery.ideas ||= []).unshift(newIdea);
    this.saveNow();
    return newIdea;
  }
  deleteTrillionIdea(id) {
    const mastery = this.getTrillionMastery();
    mastery.ideas = (mastery.ideas || []).filter(i => i.id !== id);
    this.saveNow();
  }

  /* Studies & Journals */
  getAllStudies() {
    const list = [];
    for (const [dateStr, day] of Object.entries(this.data.days)) {
      if (day.study && (day.study.topic || day.study.til || day.study.notes || day.study.actualHours > 0 || (day.study.photos && day.study.photos.length > 0))) {
        list.push({
          date: dateStr,
          topic: day.study.topic || '공부 주제 미지정',
          til: day.study.til || '',
          actualHours: day.study.actualHours || 0,
          goalHours: day.study.goalHours || 2.0,
          notes: day.study.notes || '',
          photos: day.study.photos || []
        });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  getAllJournals() {
    const list = [];
    for (const [dateStr, day] of Object.entries(this.data.days)) {
      if (day.journal && (day.journal.title || day.journal.content)) {
        list.push({
          date: dateStr,
          mood: day.mood || 'neutral',
          title: day.journal.title || `${dateStr}의 일기`,
          content: day.journal.content || '',
          tags: day.journal.tags || [],
          photos: day.journal.photos || [],
          photoIds: day.journal.photoIds || [],
          updatedAt: day.journal.updatedAt || dateStr
        });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  exportJson() { return this.exportJSON(); }
  exportGoalsJson() {
    const dataStr = JSON.stringify(this.data.goals || [], null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `goals.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  exportPrinciplesJson() {
    const dataStr = JSON.stringify(this.data.principles || [], null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `principles.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async importJson(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed.meta && !parsed.days) throw new Error('올바른 백업 파일이 아닙니다.');
      this.data = this._normalize(parsed);
      this.saveNow();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  async resetAllData() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    this.data = DEFAULT_STATE();
    this.saveNow();
  }

  /* ── Entity CRUD ── */
  list(type) { return this.data.entities[type] ||= []; }
  find(type, id) { return this.list(type).find(x => x.id === id) || null; }
  upsert(type, obj) {
    const arr = this.list(type);
    if (obj.id) {
      const i = arr.findIndex(x => x.id === obj.id);
      if (i >= 0) { arr[i] = { ...arr[i], ...obj, updatedAt: Date.now() }; this.save(); this.emit('entity-changed', { type }); return arr[i]; }
    }
    const created = { id: uid(type.slice(0, 2)), createdAt: Date.now(), updatedAt: Date.now(), ...obj };
    arr.push(created); this.save(); this.emit('entity-changed', { type });
    return created;
  }
  remove(type, id) {
    this.data.entities[type] = this.list(type).filter(x => x.id !== id);
    this.save(); this.emit('entity-changed', { type });
  }

  /* BPI */
  getBookBPI(bookIdOrTitle) {
    const contacts = this.list('contacts');
    const matched = contacts.filter(c => c.sourceBook === bookIdOrTitle || (c.sourceBook && c.sourceBook.includes(bookIdOrTitle)));
    const deals = this.list('deals');
    const dealCount = matched.filter(c => deals.some(d => d.contactId === c.id || d.leadSource === c.name)).length;
    return { contactsCount: matched.length, dealsCount: dealCount, contacts: matched };
  }

  getValuation() {
    const ctrl = controlAssets(this.data.entities);
    const nw = netWorth(this.data.entities, this.data.settings);
    const target = this.data.vision.controlledTarget || 10e12;
    const nwTarget = this.data.vision.netWorthTarget || 800e9;
    return {
      controlled: ctrl.total,
      controlledSplit: ctrl,
      netWorth: nw.total,
      netWorthSplit: nw,
      target,
      nwTarget,
      pct: Math.min(100, ctrl.total / target * 100),
      nwPct: Math.min(100, nw.total / nwTarget * 100)
    };
  }

  /* 결정 로그 */
  addDecision(d) {
    const rec = {
      id: uid('dc'), date: d.date || todayKST(),
      question: d.question || '', options: d.options || [], chosen: d.chosen || '',
      reasoning: d.reasoning || '', reversible: !!d.reversible,
      engineId: d.engineId || null, stake: d.stake || 'M',
      expected: d.expected || '', reviewDate: d.reviewDate || null,
      actualOutcome: null, score: null
    };
    this.data.decisions.push(rec); this.save(); this.emit('decision-changed', {});
    return rec;
  }
  reviewDecision(id, actualOutcome, score) {
    const d = this.data.decisions.find(x => x.id === id);
    if (!d) return null;
    d.actualOutcome = actualOutcome; d.score = score; d.reviewedAt = todayKST();
    this.save(); this.emit('decision-changed', {});
    return d;
  }
  pendingReviews(date = todayKST()) {
    return this.data.decisions.filter(d => d.reviewDate && d.reviewDate <= date && d.actualOutcome == null);
  }

  /* 킬링타임 */
  addLeak({ date, source, minutes, trigger, replacedWith }) {
    const rec = { id: uid('lk'), date: date || todayKST(), source, minutes: Number(minutes) || 0, trigger: trigger || '', replacedWith: replacedWith || '' };
    this.data.leaks.push(rec); this.save(); this.emit('leak-changed', {});
    return rec;
  }
  leaksIn(dates) { return this.data.leaks.filter(l => dates.includes(l.date)); }

  /* 사진 */
  async addPhoto(dataUrl, date = todayKST()) {
    const id = await PhotoDB.put(dataUrl);
    const day = this.getDay(date);
    (day.journal.photoIds ||= []).push(id);
    this.save(); return id;
  }
  getPhoto(id) { return PhotoDB.get(id); }
  async delPhoto(id, date = todayKST()) {
    await PhotoDB.del(id);
    const day = this.getDay(date);
    day.journal.photoIds = (day.journal.photoIds || []).filter(x => x !== id);
    this.save();
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lifeos_backup_${todayKST()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    this.data.meta.lastBackup = todayKST(); this.saveNow();
  }
  async importJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.meta) throw new Error('올바른 백업 파일이 아닙니다.');
    this.data = this._normalize(parsed); this.saveNow();
    this.emit('imported', {}); location.reload();
  }
  _autoBackupCheck() {
    const last = this.data.meta.lastBackup;
    const days = this.data.settings.autoBackupDays || 7;
    if (!last) { this.data.meta.lastBackup = todayKST(); return; }
    const gap = (new Date(todayKST()) - new Date(last)) / 86400000;
    if (gap >= days && typeof setTimeout !== 'undefined') {
      setTimeout(() => this.emit('backup-due', { gap }), 1500);
    }
  }

  usage() {
    const bytes = new Blob([JSON.stringify(this.data)]).size;
    return { bytes, mb: (bytes / 1048576).toFixed(2), pct: Math.round(bytes / 5242880 * 100) };
  }
}

export const storage = new StorageManager();
export { PhotoDB, dayShape, LEDGER_RULES };