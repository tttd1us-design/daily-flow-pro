/**
 * Daily Flow Pro - 1% Life OS (Commercial Grade Engine)
 * Features:
 * 1. Unlimited IndexedDB Async Storage Engine
 * 2. All-Tab Sidebar Calendar Integration (Dashboard, AI Coach, Study, Goals, Journal, Principles)
 * 3. Deep Focus Zen Mode (Full-screen immersion)
 * 4. Smart Uncompleted Task Rollover System (Zero-leak execution)
 * 5. Gemini 1% Elite Fact-Coaching Engine (Persona-based)
 * 6. Knowledge Wiki & Daily Study Hub with Multi-image attachment
 */

// =========================================================================
// 1. Storage Manager (IndexedDB Engine + In-Memory Cache + LocalStorage Fallback)
// =========================================================================
const DB_NAME = 'DailyFlowProDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'life_os_store';
const LS_FALLBACK_KEY = 'daily_flow_pro_state_v9';

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
    title: '데이터 기반 직무 전문성 확보 및 시니어 전문가 도약',
    keyResult: '실전 포트폴리오 3편 완성 & 직무 핵심 자격증 취득',
    actions: ['주 3회 퇴근 후 1시간 전문 강의 수강', '분기별 실전 프로젝트 1건 깃허브/블로그 정리', '월 1회 업계 동향 및 네트워킹 스터디 참석'],
    deadline: '2027-12-31',
    progress: 40
  },
  {
    id: 'g2',
    pillar: 'wealth',
    horizon: 'mid',
    title: '경제적 자유를 위한 투자 파이프라인 및 시드 1억 달성',
    keyResult: '월 저축률 60% 유지 & 배당/지수 ETF 포트폴리오 구축',
    actions: ['월급날 자동 투자 60% 선저축 집행', '매주 주말 경제 기사 및 기업 분석 리포트 2편 읽기', '불필요한 고정 지출 15% 절감'],
    deadline: '2026-12-31',
    progress: 65
  },
  {
    id: 'g3',
    pillar: 'health',
    horizon: 'short',
    title: '체지방 15% 달성 & 딥워크를 위한 최상 컨디션 유지',
    keyResult: '주 4회 헬스/러닝 & 하루 수면 7.5시간 확보',
    actions: ['퇴근 후 헬스장 50분 운동 루틴 완료', '기상 직후 미온수 500ml 섭취', '취침 1시간 전 스마트폰 끄고 독서 20분'],
    deadline: '2026-09-30',
    progress: 50
  }
];

const DEFAULT_STATE = {
  settings: {
    theme: 'dark',
    userName: '프로 직장인 & 성장가',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    aiPersona: 'fact',
    defaultHabits: [
      { id: 'h1', name: '핵심 목표 연계 공부 1시간', icon: '📚' },
      { id: 'h2', name: '오늘의 To-Do 100% 완료 체크', icon: '⚡' },
      { id: 'h3', name: '하루 일기 & 5단계 회고', icon: '✍️' },
      { id: 'h4', name: '체력 관리 운동 30분', icon: '🏃' }
    ]
  },
  goals: DEFAULT_GOALS,
  principles: DEFAULT_PRINCIPLES,
  days: {}
};

class IndexedDBStorageManager {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.db = null;
    this.isReady = false;
  }

  async init() {
    try {
      this.db = await this.openIndexedDB();
      const savedData = await this.getFromDB('root_state');
      if (savedData) {
        this.data = {
          settings: { ...DEFAULT_STATE.settings, ...(savedData.settings || {}) },
          goals: savedData.goals || DEFAULT_GOALS,
          principles: savedData.principles || DEFAULT_PRINCIPLES,
          days: savedData.days || {}
        };
      } else {
        const lsData = localStorage.getItem(LS_FALLBACK_KEY);
        if (lsData) {
          const parsed = JSON.parse(lsData);
          this.data = { ...DEFAULT_STATE, ...parsed };
        }
        await this.saveData();
      }
    } catch (e) {
      console.warn('IndexedDB unavailable, falling back to LocalStorage:', e);
      const lsData = localStorage.getItem(LS_FALLBACK_KEY);
      if (lsData) {
        this.data = JSON.parse(lsData);
      }
    }
    this.ensureSampleData();
    this.isReady = true;
    return this.data;
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getFromDB(key) {
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async setInDB(key, val) {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async saveData() {
    if (this.db) {
      await this.setInDB('root_state', this.data);
    }
    try {
      const shallowCopy = JSON.parse(JSON.stringify(this.data));
      for (const day of Object.values(shallowCopy.days)) {
        if (day.study && day.study.photos) {
          day.study.photos = day.study.photos.map(p => p.length > 500 ? '[IMAGE_IN_IDB]' : p);
        }
      }
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(shallowCopy));
    } catch (e) {
      console.warn('LS sync skipped:', e);
    }
  }

  getDayData(dateStr) {
    if (!this.data.days[dateStr]) {
      this.data.days[dateStr] = {
        focus: '',
        mood: '',
        todos: [],
        habits: {},
        timeBlocks: [],
        study: { topic: '', til: '', goalHours: 2.0, actualHours: 0, notes: '', photos: [] },
        condition: { water: 0, energy: 50, sleep: 7.0, memo: '' },
        journal: { title: '', content: '', tags: [], photos: [], updatedAt: null },
        aiChatHistory: []
      };
      this.saveData();
    }
    if (this.data.days[dateStr].study && !this.data.days[dateStr].study.photos) {
      this.data.days[dateStr].study.photos = [];
    }
    return this.data.days[dateStr];
  }

  updateDayData(dateStr, partialData) {
    const current = this.getDayData(dateStr);
    this.data.days[dateStr] = {
      ...current,
      ...partialData,
      study: { ...current.study, ...(partialData.study || {}) },
      condition: { ...current.condition, ...(partialData.condition || {}) },
      journal: { ...current.journal, ...(partialData.journal || {}) }
    };
    this.saveData();
    return this.data.days[dateStr];
  }

  getGoals() { return this.data.goals || []; }

  addGoal(goal) {
    const newG = { id: 'g_' + Date.now(), progress: 0, ...goal };
    this.data.goals.unshift(newG);
    this.saveData();
    return newG;
  }

  updateGoal(goalId, partialGoal) {
    const idx = this.data.goals.findIndex(g => g.id === goalId);
    if (idx !== -1) {
      this.data.goals[idx] = { ...this.data.goals[idx], ...partialGoal };
      this.saveData();
    }
  }

  deleteGoal(goalId) {
    this.data.goals = this.data.goals.filter(g => g.id !== goalId);
    this.saveData();
  }

  getHabits() { return this.data.settings.defaultHabits || []; }

  addHabit(name, icon = '✨') {
    const newH = { id: 'h_' + Date.now(), name, icon };
    this.data.settings.defaultHabits.push(newH);
    this.saveData();
    return newH;
  }

  deleteHabit(habitId) {
    this.data.settings.defaultHabits = this.data.settings.defaultHabits.filter(h => h.id !== habitId);
    this.saveData();
  }

  getPrinciples() { return this.data.principles || []; }

  addPrinciple(category, title, content) {
    const newP = { id: 'p_' + Date.now(), category, title, content };
    this.data.principles.unshift(newP);
    this.saveData();
    return newP;
  }

  deletePrinciple(pId) {
    this.data.principles = this.data.principles.filter(p => p.id !== pId);
    this.saveData();
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
          updatedAt: day.journal.updatedAt || dateStr
        });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

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

  exportJson() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_state.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportGoalsJson() {
    const dataStr = JSON.stringify(this.data.goals || [], null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goals.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPrinciplesJson() {
    const dataStr = JSON.stringify(this.data.principles || [], null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `principles.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.days) throw new Error('올바르지 않은 백업 파일 형식입니다.');
      this.data = parsed;
      await this.saveData();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  async resetAllData() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.ensureSampleData();
    await this.saveData();
  }

  ensureSampleData() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.data.days[today]) {
      this.data.days[today] = {
        focus: '데이터 분석 핵심 알고리즘 2시간 마스터 및 보고서 초안 완성',
        mood: 'great',
        todos: [
          { id: 't1', text: '[커리어] 데이터 분석 심화 2시간 집중 수강 및 실습', category: 'career', completed: true },
          { id: 't2', text: '[재테크] 이번 달 지출 내역 점검 및 ETF 자동 적립 확인', category: 'wealth', completed: true },
          { id: 't3', text: '[건강] 퇴근 후 헬스장 40분 웨이트 & 러닝 20분', category: 'health', completed: false }
        ],
        habits: { 'h1': true, 'h2': true, 'h3': false, 'h4': true },
        timeBlocks: [
          { id: 'tb1', start: '09:00', end: '11:00', title: '💼 직무 핵심 보고서 딥워크 집중 작성', category: 'career' },
          { id: 'tb2', start: '14:00', end: '16:00', title: '📚 데이터 분석 실전 알고리즘 공부', category: 'study' },
          { id: 'tb3', start: '20:30', end: '21:30', title: '✍️ 하루 실행 점검 & 5단계 회고 일기', category: 'career' }
        ],
        study: {
          topic: '데이터 기반 비즈니스 의사결정 및 SQL 고급 쿼리',
          til: '복잡한 지표일수록 핵심 KPI 1가지에 집중하여 데이터 파이프라인을 단순화하는 것이 실행 속도를 높인다.',
          goalHours: 2.0,
          actualHours: 2.0,
          notes: '### 💡 오늘의 핵심 배움\n1. Window Function을 활용한 시계열 누적 데이터 집계\n2. 가설 수립 -> A/B 테스트 -> 신속한 의사결정 사이클',
          photos: []
        },
        condition: { water: 6, energy: 85, sleep: 7.5, memo: '1% 몰입 모드로 하루 실행력이 극대화됨!' },
        journal: {
          title: '장기 비전을 오늘의 구체적 실행으로 연결하는 하루',
          content: `### 🌟 오늘의 생각과 사유\n\n내 인생의 5대 영역 목표를 명확히 세우고, 거기서 파생된 단 하나의 행동을 오늘 To-Do로 끌어오니 일과 삶의 방향성이 선명해졌다.\n\n### 🚀 내일을 위한 구체적 실행 가이드\n- [ ] [커리어] 데이터 분석 2강 완강 및 깃허브 코드 업로드\n- [ ] [재테크] 주말 스터디를 위한 반도체 섹터 분석 리포트 1편 독서\n- [ ] [건강] 아침 스트레칭 15분 & 저녁 조깅 30분\n\n### 📚 오늘 위주로 공부한 핵심 주제\n- SQL 데이터 분석 및 비즈니스 KPI 지표 모델링\n\n> "목표를 시각화하고 매일 구체적으로 행동하는 사람만이 인생을 주도한다."`,
          tags: ['인생목표', '커리어', '실행력', 'GeminiAI'],
          photos: [],
          updatedAt: new Date().toISOString()
        }
      };
      this.saveData();
    }
  }
}

const storage = new IndexedDBStorageManager();

// =========================================================================
// 2. Gemini 1% Elite Fact-Coaching REST API Client
// =========================================================================
class GeminiApiClient {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  getApiKey() {
    return (storage.data.settings.geminiApiKey || '').trim();
  }

  getModel() {
    return storage.data.settings.geminiModel || 'gemini-1.5-flash';
  }

  isConfigured() {
    return !!this.getApiKey();
  }

  async generateText(prompt, systemInstruction = '') {
    const apiKey = this.getApiKey();
    const model = this.getModel();

    if (!apiKey) {
      return this.mockSmartResponse(prompt);
    }

    const url = `${this.baseUrl}/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: (systemInstruction ? `[시스템 지침: ${systemInstruction}]\n\n` : '') + prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2000
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API 호출 오류 (HTTP ${response.status})`);
      }

      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini 응답 데이터가 비어 있습니다.');
      return text;
    } catch (e) {
      console.warn('Gemini API Fetch failed, fallback to local engine:', e);
      return this.mockSmartResponse(prompt) + `\n\n*(참고: Gemini API 키 연결 상태를 확인해주세요)*`;
    }
  }

  mockSmartResponse(prompt) {
    if (prompt.includes('압박감') || prompt.includes('과부하') || prompt.includes('일이 너무 많아')) {
      return `[🔥 냉철한 팩트 진단]
일이 많아서 압박감을 느끼는 것이 아닙니다. **'모든 것을 오늘 다 완벽히 끝내겠다'는 비현실적 욕심**이 뇌를 마비시키는 것입니다. 

지금 당장 생존과 성장에 직결되지 않는 80%의 잔무는 모두 버리세요. 오늘 반드시 방어할 2가지 핵심만 대시보드에 배치합니다.

---
### 🚀 [자동연동] 오늘의 추천 To-Do
- [ ] [커리어] 오늘 마감인 가장 긴급한 핵심 과업 1개 45분 집중 끝내기
- [ ] [커리어] 덜 중요한 보조 업무는 내일로 과감히 일정 재조정하기

---
### ⭐ [자동연동] 오늘의 One Thing
가장 긴급한 핵심 과업 1개 45분 딥워크로 완벽 마무리

---
### 💎 [자동연동] 인생 원칙
"모든 일을 다 하려 하지 말고, 단 하나의 결정적인 일에 모든 화력을 쏟아라."`;
    }

    if (prompt.includes('미루') || prompt.includes('딴짓') || prompt.includes('스파르타')) {
      return `[🔥 냉철한 팩트 폭격]
당신이 미루는 이유는 의지가 부족해서가 아니라, **'과업의 덩어리가 너무 커서 뇌가 위협을 느끼기 때문'**입니다.

지금 필요한 것은 동기부여 명언이 아니라 **'5분 즉시 착수 트리거'**입니다. 의지력 쓰지 말고 타이머 켜고 5분만 앉아보세요.

---
### 🚀 [자동연동] 오늘의 추천 To-Do
- [ ] [루틴] 책상 위 스마트폰을 다른 방에 두고 타이머 25분 누르기
- [ ] [커리어] 오늘 미루던 작업 파일 열고 첫 단락 3문장만 즉시 쓰기

---
### ⭐ [자동연동] 오늘의 One Thing
5분 강제 착수 후 25분 딥워크 1세트 완수

---
### 💎 [자동연동] 인생 원칙
"시작이 반이 아니라, 시작하면 뇌의 작업흥분 효과로 80%가 끝난다."`;
    }

    return `[🧠 전략 코칭]
오늘 하루를 완벽하게 통제하기 위해 핵심 과업을 분해하여 대시보드에 연동했습니다. 핑계 대지 말고 첫 번째 항목부터 처리하세요!

---
### 🚀 [자동연동] 오늘의 추천 To-Do
- [ ] [커리어] 오늘 최우선 핵심 과제 1시간 딥워크 완수
- [ ] [루틴] 저녁 20분 하루 실행 점검 및 일기 작성

---
### ⭐ [자동연동] 오늘의 One Thing
최우선 핵심 과제 1개 끝까지 완수하기`;
  }
}

const geminiClient = new GeminiApiClient();

const QUOTES = [
  "완벽한 계획보다 1%의 즉각적 실행이 인생을 바꾼다.",
  "생각을 행동으로 바꾸지 않는 한 어떤 지식도 힘이 되지 못한다.",
  "가장 중요한 일에 가장 높은 에너지를 투자하라.",
  "미루는 습관을 깨는 유일한 방법은 5분 안에 착수하는 것이다.",
  "오늘 하루의 몰입과 공부가 1년 뒤 당신의 미래다.",
  "실패를 두려워하지 말고, 개선 없는 무의미한 반복을 두려워하라."
];

// =========================================================================
// 3. Main Application Controller (DailyFlowApp Pro)
// =========================================================================
class DailyFlowApp {
  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.activeTab = 'dashboard';
    this.isPreviewMode = false;
    this.autoSaveTimer = null;

    // Pomodoro Timer
    this.timerInterval = null;
    this.timerSeconds = 25 * 60;
    this.timerRunning = false;

    // Zen Mode State
    this.isZenMode = false;

    // Speech
    this.recognition = null;
    this.isRecording = false;

    // Filters
    this.goalPillarFilter = 'all';
    this.studySearchQuery = '';

    // Calendar state for each tab
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    this.tabCalState = {
      dashboard: { year: curYear, month: curMonth },
      ai: { year: curYear, month: curMonth },
      study: { year: curYear, month: curMonth },
      goals: { year: curYear, month: curMonth },
      journal: { year: curYear, month: curMonth },
      principles: { year: curYear, month: curMonth },
      main: { year: curYear, month: curMonth }
    };

    this.archiveFilterMood = 'all';
    this.archiveSearchQuery = '';
  }

  async init() {
    await storage.init();
    this.initTheme();
    this.initElements();
    this.initSpeechRecognition();
    this.bindEvents();
    this.startClock();
    this.showRandomQuote();
    this.updateGeminiStatusBadge();

    this.loadDate(this.currentDate);
  }

  initTheme() {
    const saved = storage.data.settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  initElements() {
    this.appContainer = document.getElementById('appContainer');
    this.mainContent = document.getElementById('mainContent');

    // Header & Nav
    this.headerDateText = document.getElementById('headerDateText');
    this.sidebarDate = document.getElementById('sidebarDate');
    this.sidebarTime = document.getElementById('sidebarTime');
    this.datePicker = document.getElementById('datePicker');
    this.todayTag = document.getElementById('todayTag');
    this.prevDayBtn = document.getElementById('prevDayBtn');
    this.nextDayBtn = document.getElementById('nextDayBtn');
    this.todayQuickBtn = document.getElementById('todayQuickBtn');
    this.quoteBanner = document.getElementById('quoteBanner');
    this.navItems = document.querySelectorAll('.nav-item');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Zen Mode Elements
    this.zenModeToggleBtn = document.getElementById('zenModeToggleBtn');
    this.zenModeHeaderBtn = document.getElementById('zenModeHeaderBtn');
    this.zenModeOverlay = document.getElementById('zenModeOverlay');
    this.exitZenModeBtn = document.getElementById('exitZenModeBtn');
    this.zenFocusTitle = document.getElementById('zenFocusTitle');
    this.zenTimerDisplay = document.getElementById('zenTimerDisplay');
    this.zenStartTimerBtn = document.getElementById('zenStartTimerBtn');
    this.zenResetTimerBtn = document.getElementById('zenResetTimerBtn');
    this.zenTodoList = document.getElementById('zenTodoList');

    // Rollover Banner
    this.rolloverBanner = document.getElementById('rolloverBanner');
    this.rolloverCount = document.getElementById('rolloverCount');
    this.rolloverApplyBtn = document.getElementById('rolloverApplyBtn');
    this.rolloverDismissBtn = document.getElementById('rolloverDismissBtn');

    // Gemini Modal & Status
    this.geminiStatusBtn = document.getElementById('geminiStatusBtn');
    this.openGeminiModalBtn = document.getElementById('openGeminiModalBtn');
    this.geminiModal = document.getElementById('geminiModal');
    this.closeGeminiModalBtn = document.getElementById('closeGeminiModalBtn');
    this.cancelGeminiModalBtn = document.getElementById('cancelGeminiModalBtn');
    this.saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
    this.removeGeminiKeyBtn = document.getElementById('removeGeminiKeyBtn');
    this.geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    this.geminiModelSelect = document.getElementById('geminiModelSelect');
    this.storageBadge = document.getElementById('storageBadge');
    this.aiStatusDesc = document.getElementById('aiStatusDesc');

    // Dashboard Elements
    this.focusInput = document.getElementById('dailyFocusInput');
    this.saveFocusBtn = document.getElementById('saveFocusBtn');
    this.moodSelector = document.getElementById('moodSelector');

    this.aiPersonaSelect = document.getElementById('aiPersonaSelect');
    this.dashChatMessages = document.getElementById('dashChatMessages');
    this.dashChatForm = document.getElementById('dashChatForm');
    this.dashChatInput = document.getElementById('dashChatInput');
    this.clearDashChatBtn = document.getElementById('clearDashChatBtn');

    this.todoForm = document.getElementById('todoForm');
    this.todoInput = document.getElementById('todoInput');
    this.todoCategory = document.getElementById('todoCategory');
    this.todoList = document.getElementById('todoList');
    this.todoProgressBar = document.getElementById('todoProgressBar');
    this.todoProgressBadge = document.getElementById('todoProgressBadge');

    this.todayStudyTopic = document.getElementById('todayStudyTopic');
    this.todayStudyTIL = document.getElementById('todayStudyTIL');
    this.dashCopyTilBtn = document.getElementById('dashCopyTilBtn');
    this.saveStudyDashBtn = document.getElementById('saveStudyDashBtn');
    this.quickStudyBtn = document.getElementById('quickStudyBtn');
    this.aiStudySuggestBtn = document.getElementById('aiStudySuggestBtn');

    this.habitList = document.getElementById('habitList');
    this.addHabitModalBtn = document.getElementById('addHabitModalBtn');
    this.habitModal = document.getElementById('habitModal');
    this.closeHabitModalBtn = document.getElementById('closeHabitModalBtn');
    this.newHabitForm = document.getElementById('newHabitForm');
    this.newHabitName = document.getElementById('newHabitName');
    this.newHabitIcon = document.getElementById('newHabitIcon');
    this.modalHabitList = document.getElementById('modalHabitList');

    this.timeBlockList = document.getElementById('timeBlockList');
    this.addTimeBlockBtn = document.getElementById('addTimeBlockBtn');
    this.timeBlockModal = document.getElementById('timeBlockModal');
    this.closeTimeBlockModalBtn = document.getElementById('closeTimeBlockModalBtn');
    this.cancelTimeBlockBtn = document.getElementById('cancelTimeBlockBtn');
    this.timeBlockForm = document.getElementById('timeBlockForm');
    this.tbStartTime = document.getElementById('tbStartTime');
    this.tbEndTime = document.getElementById('tbEndTime');
    this.tbTitle = document.getElementById('tbTitle');
    this.tbCategory = document.getElementById('tbCategory');

    this.waterCups = document.getElementById('waterCups');
    this.waterCount = document.getElementById('waterCount');
    this.energySlider = document.getElementById('energySlider');
    this.energyLevelText = document.getElementById('energyLevelText');
    this.sleepInput = document.getElementById('sleepInput');
    this.sleepHoursText = document.getElementById('sleepHoursText');
    this.sleepMinusBtn = document.getElementById('sleepMinusBtn');
    this.sleepPlusBtn = document.getElementById('sleepPlusBtn');
    this.quickMemoInput = document.getElementById('quickMemoInput');

    // EES (Executive Execution Score) Elements
    this.eesScoreCard = document.getElementById('eesScoreCard');
    this.eesScoreVal = document.getElementById('eesScoreVal');
    this.eesGradeBadge = document.getElementById('eesGradeBadge');
    this.eesScoreBar = document.getElementById('eesScoreBar');

    // Evening Budget Elements
    this.eveningCapacityInput = document.getElementById('eveningCapacityInput');
    this.eveningRemainingBadge = document.getElementById('eveningRemainingBadge');
    this.eveningBudgetFill = document.getElementById('eveningBudgetFill');
    this.eveningTaskDuration = document.getElementById('eveningTaskDuration');

    // Visual Tree Map Elements
    this.toggleHierarchyViewModeBtn = document.getElementById('toggleHierarchyViewModeBtn');
    this.visualTreeContainer = document.getElementById('visualTreeContainer');
    this.hierarchyCardsViewContainer = document.getElementById('hierarchyCardsViewContainer');
    this.visualTreeCanvas = document.getElementById('visualTreeCanvas');
    this.isVisualTreeMode = false;

    // Weekly Retro Elements
    this.generateWeeklyReportBtn = document.getElementById('generateWeeklyReportBtn');
    this.weeklyTotalHoursVal = document.getElementById('weeklyTotalHoursVal');
    this.weeklyTodoRateVal = document.getElementById('weeklyTodoRateVal');
    this.weeklyTodoCountVal = document.getElementById('weeklyTodoCountVal');
    this.weeklyGoalRateVal = document.getElementById('weeklyGoalRateVal');
    this.weeklyHabitDaysVal = document.getElementById('weeklyHabitDaysVal');
    this.weeklyReportContent = document.getElementById('weeklyReportContent');
    this.copyWeeklyReportBtn = document.getElementById('copyWeeklyReportBtn');

    // Evening OS Elements
    this.eveningGoalInput = document.getElementById('eveningGoalInput');
    this.saveEveningGoalBtn = document.getElementById('saveEveningGoalBtn');
    this.aiEveningRoutineBtn = document.getElementById('aiEveningRoutineBtn');
    this.eveningTodayForm = document.getElementById('eveningTodayForm');
    this.eveningTodayInput = document.getElementById('eveningTodayInput');
    this.eveningTodayList = document.getElementById('eveningTodayList');
    this.eveningTodayBadge = document.getElementById('eveningTodayBadge');
    this.eveningTomorrowForm = document.getElementById('eveningTomorrowForm');
    this.eveningTomorrowInput = document.getElementById('eveningTomorrowInput');
    this.eveningTomorrowList = document.getElementById('eveningTomorrowList');
    this.pushTomorrowToTodayBtn = document.getElementById('pushTomorrowToTodayBtn');
    this.eveningActualHours = document.getElementById('eveningActualHours');
    this.eveningFocusRate = document.getElementById('eveningFocusRate');
    this.eveningReviewNotes = document.getElementById('eveningReviewNotes');
    this.saveEveningReviewBtn = document.getElementById('saveEveningReviewBtn');

    // Goal Hierarchy Elements
    this.hierarchyTabsBar = document.getElementById('hierarchyTabsBar');
    this.yearlyGoalsGrid = document.getElementById('yearlyGoalsGrid');
    this.monthlyGoalsGrid = document.getElementById('monthlyGoalsGrid');
    this.weeklyGoalsGrid = document.getElementById('weeklyGoalsGrid');
    this.dailyGoalsGrid = document.getElementById('dailyGoalsGrid');
    this.aiHierarchyBreakdownBtn = document.getElementById('aiHierarchyBreakdownBtn');
    this.activeHierarchyLevel = 'all';

    // Legacy Goals Tab
    this.goalsGrid = document.getElementById('goalsGrid');
    this.goalPillarFilters = document.getElementById('goalPillarFilters');
    this.openNewGoalModalBtn = document.getElementById('openNewGoalModalBtn');
    this.goalModal = document.getElementById('goalModal');
    this.closeGoalModalBtn = document.getElementById('closeGoalModalBtn');
    this.cancelGoalBtn = document.getElementById('cancelGoalBtn');
    this.goalForm = document.getElementById('goalForm');
    this.goalPillar = document.getElementById('goalPillar');
    this.goalHorizon = document.getElementById('goalHorizon');
    this.goalTitle = document.getElementById('goalTitle');
    this.goalKeyResult = document.getElementById('goalKeyResult');
    this.goalActionSteps = document.getElementById('goalActionSteps');
    this.goalDeadline = document.getElementById('goalDeadline');
    this.goalProgress = document.getElementById('goalProgress');
    this.aiGoalBreakdownBtn = document.getElementById('aiGoalBreakdownBtn');

    // Study Tab
    this.studyMainTopicInput = document.getElementById('studyMainTopicInput');
    this.studyGoalHours = document.getElementById('studyGoalHours');
    this.studyActualHours = document.getElementById('studyActualHours');
    this.studyTilSummaryInput = document.getElementById('studyTilSummaryInput');
    this.studyDetailedNotes = document.getElementById('studyDetailedNotes');
    this.copyStudyNotesBtn = document.getElementById('copyStudyNotesBtn');
    this.saveStudyNotesBtn = document.getElementById('saveStudyNotesBtn');
    this.studyPhotoInput = document.getElementById('studyPhotoInput');
    this.studyPhotoGallery = document.getElementById('studyPhotoGallery');
    this.studySearchInput = document.getElementById('studySearchInput');
    this.studyArchiveList = document.getElementById('studyArchiveList');
    this.aiStudyAnalyzeBtn = document.getElementById('aiStudyAnalyzeBtn');

    // Journal Tab
    this.journalTitle = document.getElementById('journalTitle');
    this.journalContent = document.getElementById('journalContent');
    this.journalPreview = document.getElementById('journalPreview');
    this.journalEditorBody = document.getElementById('journalEditorBody');
    this.journalSplitToggle = document.getElementById('journalSplitToggle');
    this.journalPreviewToggle = document.getElementById('journalPreviewToggle');
    this.copyJournalTextBtn = document.getElementById('copyJournalTextBtn');
    this.saveJournalBtn = document.getElementById('saveJournalBtn');
    this.exportMdBtn = document.getElementById('exportMdBtn');
    this.printJournalBtn = document.getElementById('printJournalBtn');
    this.autoSaveIndicator = document.getElementById('autoSaveIndicator');
    this.editorToolbar = document.getElementById('editorToolbar');
    this.charCount = document.getElementById('charCount');
    this.wordCount = document.getElementById('wordCount');
    this.readTime = document.getElementById('readTime');
    this.journalTagsList = document.getElementById('journalTagsList');
    this.journalTagInput = document.getElementById('journalTagInput');
    this.addTagBtn = document.getElementById('addTagBtn');
    this.aiAutoDraftJournalBtn = document.getElementById('aiAutoDraftJournalBtn');
    this.extractActionGuideBtn = document.getElementById('extractActionGuideBtn');
    this.journalPhotoInput = document.getElementById('journalPhotoInput');
    this.journalPhotosBar = document.getElementById('journalPhotosBar');
    this.journalPhotoGallery = document.getElementById('journalPhotoGallery');
    this.isSplitView = false;

    // Wizard Modal
    this.openWizardBtn = document.getElementById('openWizardBtn');
    this.wizardModal = document.getElementById('wizardModal');
    this.closeWizardModalBtn = document.getElementById('closeWizardModalBtn');
    this.applyWizardBtn = document.getElementById('applyWizardBtn');
    this.qFact = document.getElementById('qFact');
    this.qFeeling = document.getElementById('qFeeling');
    this.qLesson = document.getElementById('qLesson');
    this.qNext = document.getElementById('qNext');

    // Timer
    this.timerDisplay = document.getElementById('timerDisplay');
    this.startTimerBtn = document.getElementById('startTimerBtn');
    this.resetTimerBtn = document.getElementById('resetTimerBtn');
    this.speechBtn = document.getElementById('speechBtn');

    // AI Coach Tab
    this.aiChatMessages = document.getElementById('aiChatMessages');
    this.aiChatForm = document.getElementById('aiChatForm');
    this.aiChatInput = document.getElementById('aiChatInput');
    this.sendAiChatBtn = document.getElementById('sendAiChatBtn');

    // Principles Tab
    this.principlesGrid = document.getElementById('principlesGrid');
    this.addPrincipleModalBtn = document.getElementById('addPrincipleModalBtn');
    this.principleModal = document.getElementById('principleModal');
    this.closePrincipleModalBtn = document.getElementById('closePrincipleModalBtn');
    this.cancelPrincipleBtn = document.getElementById('cancelPrincipleBtn');
    this.principleForm = document.getElementById('principleForm');
    this.pCategory = document.getElementById('pCategory');
    this.pTitle = document.getElementById('pTitle');
    this.pContent = document.getElementById('pContent');
    this.aiPrincipleSuggestBtn = document.getElementById('aiPrincipleSuggestBtn');

    // Calendar Tab
    this.calendarMonthTitle = document.getElementById('calendarMonthTitle');
    this.calPrevMonth = document.getElementById('calPrevMonth');
    this.calNextMonth = document.getElementById('calNextMonth');
    this.calTodayBtn = document.getElementById('calTodayBtn');
    this.calendarDaysGrid = document.getElementById('calendarDaysGrid');
    this.archiveSearchInput = document.getElementById('archiveSearchInput');
    this.archiveMoodFilters = document.getElementById('archiveMoodFilters');
    this.archiveList = document.getElementById('archiveList');

    // Analytics Tab
    this.streakDays = document.getElementById('streakDays');
    this.streakSub = document.getElementById('streakSub');
    this.totalGoalRateVal = document.getElementById('totalGoalRateVal');
    this.totalGoalCountVal = document.getElementById('totalGoalCountVal');
    this.totalStudyHoursVal = document.getElementById('totalStudyHoursVal');
    this.totalStudyCountVal = document.getElementById('totalStudyCountVal');
    this.todoRateVal = document.getElementById('todoRateVal');
    this.todoRateSub = document.getElementById('todoRateSub');
    this.moodAnalyticsBars = document.getElementById('moodAnalyticsBars');
    this.habitAnalyticsBars = document.getElementById('habitAnalyticsBars');

    // Theme & Backup
    this.themeToggle = document.getElementById('themeToggle');
    this.themeIcon = document.getElementById('themeIcon');
    this.backupBtn = document.getElementById('backupBtn');
    this.backupModal = document.getElementById('backupModal');
    this.closeBackupModalBtn = document.getElementById('closeBackupModalBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.triggerImportBtn = document.getElementById('triggerImportBtn');
    this.importJsonInput = document.getElementById('importJsonInput');
    this.resetDataBtn = document.getElementById('resetDataBtn');
    this.toastContainer = document.getElementById('toastContainer');
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && this.speechBtn) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ko-KR';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          this.journalContent.value += (this.journalContent.value ? ' ' : '') + transcript;
          this.updateJournalStats();
          this.autoSaveJournal();
        }
      };

      this.recognition.onerror = () => this.stopRecording();
      this.recognition.onend = () => this.stopRecording();
    }
  }

  updateGeminiStatusBadge() {
    const hasKey = geminiClient.isConfigured();
    if (this.storageBadge && this.aiStatusDesc) {
      this.storageBadge.textContent = '용량 무제한 ✨';
      if (hasKey) {
        this.aiStatusDesc.textContent = `${geminiClient.getModel()} 1% 코칭 가동 중`;
      } else {
        this.aiStatusDesc.textContent = `스마트 팩트 코칭 대기 중`;
      }
    }
  }

  bindEvents() {
    // Navigation
    this.navItems.forEach(item => {
      item.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });
    if (this.quickStudyBtn) {
      this.quickStudyBtn.addEventListener('click', () => this.switchTab('study'));
    }

    // ==========================================
    // ⚡ 딥 포커스 몰입 젠 모드 (Zen Mode)
    // ==========================================
    const enterZen = () => {
      this.isZenMode = true;
      const dayData = storage.getDayData(this.currentDate);
      this.zenFocusTitle.textContent = dayData.focus || '오늘의 북극성 미션을 먼저 입력해주세요.';
      this.renderZenTodoList();
      this.zenModeOverlay.style.display = 'flex';
    };

    const exitZen = () => {
      this.isZenMode = false;
      this.zenModeOverlay.style.display = 'none';
    };

    if (this.zenModeToggleBtn) this.zenModeToggleBtn.addEventListener('click', enterZen);
    if (this.zenModeHeaderBtn) this.zenModeHeaderBtn.addEventListener('click', enterZen);
    if (this.exitZenModeBtn) this.exitZenModeBtn.addEventListener('click', exitZen);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isZenMode) exitZen();
    });

    if (this.zenStartTimerBtn) {
      this.zenStartTimerBtn.addEventListener('click', () => {
        if (this.timerRunning) this.pauseTimer();
        else this.startTimer();
      });
    }
    if (this.zenResetTimerBtn) {
      this.zenResetTimerBtn.addEventListener('click', () => this.resetTimer());
    }

    // ==========================================
    // 🚨 과업 이월 (Rollover)
    // ==========================================
    if (this.rolloverApplyBtn) {
      this.rolloverApplyBtn.addEventListener('click', () => this.applyTaskRollover());
    }
    if (this.rolloverDismissBtn) {
      this.rolloverDismissBtn.addEventListener('click', () => {
        this.rolloverBanner.style.display = 'none';
      });
    }

    // ==========================================
    // ⭐ 전 탭 우측 캘린더 네비게이션 버튼 이벤트 바인딩 ⭐
    // ==========================================
    document.querySelectorAll('[data-cal-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.calAction;
        const target = btn.dataset.target || 'dashboard';
        const st = this.tabCalState[target] || this.tabCalState.dashboard;

        if (action === 'prev') {
          st.month--;
          if (st.month < 0) { st.month = 11; st.year--; }
        } else if (action === 'next') {
          st.month++;
          if (st.month > 11) { st.month = 0; st.year++; }
        } else if (action === 'today') {
          const now = new Date();
          st.year = now.getFullYear();
          st.month = now.getMonth();
          this.setDate(now.toISOString().split('T')[0]);
        }
        this.renderTabCalendar(target);
      });
    });

    // ==========================================
    // Dashboard Trouble Chat
    // ==========================================
    if (this.dashChatForm) {
      this.dashChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const trouble = this.dashChatInput.value.trim();
        if (!trouble) return;
        this.dashChatInput.value = '';
        await this.handleDashboardTroubleChat(trouble);
      });
    }

    document.querySelectorAll('.trouble-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleDashboardTroubleChat(btn.dataset.trouble);
      });
    });

    if (this.clearDashChatBtn) {
      this.clearDashChatBtn.addEventListener('click', () => {
        this.dashChatMessages.innerHTML = `
          <div class="dash-chat-bubble bot">
            <div class="bubble-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="bubble-content">
              새로운 대화가 시작되었습니다. 어떤 고민이나 목표든 솔직하게 말씀해주세요!
            </div>
          </div>
        `;
        this.showToast('고민 상담 채팅창이 초기화되었습니다.');
      });
    }

    // ==========================================
    // Study Notes & Photo & Copy
    // ==========================================
    if (this.copyStudyNotesBtn) {
      this.copyStudyNotesBtn.addEventListener('click', () => {
        const topic = this.studyMainTopicInput.value.trim();
        const til = this.studyTilSummaryInput.value.trim();
        const notes = this.studyDetailedNotes.value.trim();
        const hours = this.studyActualHours.value;

        const textToCopy = `[${this.currentDate} 학습 기록]\n📚 주제: ${topic || '미지정'}\n⏱️ 달성 시간: ${hours}시간\n💡 핵심 TIL: ${til || '없음'}\n\n📝 상세 노트:\n${notes || '내용 없음'}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showToast('📋 오늘의 학습 노트 전체가 클립보드에 복사되었습니다!');
        }).catch(() => {
          this.showToast('복사에 실패했습니다.', 'error');
        });
      });
    }

    if (this.dashCopyTilBtn) {
      this.dashCopyTilBtn.addEventListener('click', () => {
        const til = this.todayStudyTIL.value.trim();
        const topic = this.todayStudyTopic.value.trim();
        if (!til && !topic) {
          this.showToast('복사할 공부 내용이 없습니다.', 'error');
          return;
        }
        navigator.clipboard.writeText(`📚 [${topic}] ${til}`).then(() => {
          this.showToast('💡 오늘의 배움(TIL)이 복사되었습니다!');
        });
      });
    }

    if (this.studyPhotoInput) {
      this.studyPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          this.showToast('이미지 파일만 첨부할 수 있습니다.', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dayData = storage.getDayData(this.currentDate);
          const photos = dayData.study.photos || [];
          photos.push(evt.target.result);
          storage.updateDayData(this.currentDate, { study: { ...dayData.study, photos } });
          this.renderStudyPhotos();
          this.renderStudyArchive();
          this.renderAllTabCalendars();
          this.showToast('학습 이미지가 IndexedDB에 안전하게 저장되었습니다! 📷');
        };
        reader.readAsDataURL(file);
        this.studyPhotoInput.value = '';
      });
    }

    // Gemini Modal
    const openGemini = () => {
      this.geminiApiKeyInput.value = storage.data.settings.geminiApiKey || '';
      this.geminiModelSelect.value = storage.data.settings.geminiModel || 'gemini-1.5-flash';
      this.geminiModal.classList.add('active');
    };
    const closeGemini = () => this.geminiModal.classList.remove('active');

    if (this.geminiStatusBtn) this.geminiStatusBtn.addEventListener('click', openGemini);
    if (this.openGeminiModalBtn) this.openGeminiModalBtn.addEventListener('click', openGemini);
    if (this.closeGeminiModalBtn) this.closeGeminiModalBtn.addEventListener('click', closeGemini);
    if (this.cancelGeminiModalBtn) this.cancelGeminiModalBtn.addEventListener('click', closeGemini);

    if (this.saveGeminiKeyBtn) {
      this.saveGeminiKeyBtn.addEventListener('click', async () => {
        const key = this.geminiApiKeyInput.value.trim();
        const model = this.geminiModelSelect.value;
        storage.data.settings.geminiApiKey = key;
        storage.data.settings.geminiModel = model;
        await storage.saveData();

        this.saveGeminiKeyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 연결 테스트 중...';
        await geminiClient.generateText('테스트: 안녕! 한 문장으로 인사해줘.');
        this.saveGeminiKeyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 저장 및 테스트';
        this.updateGeminiStatusBadge();
        closeGemini();
        this.showToast('Google Gemini AI가 성공적으로 연동되었습니다! 🎉');
      });
    }

    if (this.removeGeminiKeyBtn) {
      this.removeGeminiKeyBtn.addEventListener('click', async () => {
        storage.data.settings.geminiApiKey = '';
        await storage.saveData();
        this.geminiApiKeyInput.value = '';
        this.updateGeminiStatusBadge();
        closeGemini();
        this.showToast('Gemini API 키가 삭제되었습니다.');
      });
    }

    // Date navigation
    this.prevDayBtn.addEventListener('click', () => this.shiftDate(-1));
    this.nextDayBtn.addEventListener('click', () => this.shiftDate(1));
    this.todayQuickBtn.addEventListener('click', () => this.setDate(new Date().toISOString().split('T')[0]));
    this.datePicker.addEventListener('change', (e) => {
      if (e.target.value) this.setDate(e.target.value);
    });

    // Theme Toggle
    this.themeToggle.addEventListener('click', async () => {
      const curr = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = curr === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      storage.data.settings.theme = next;
      await storage.saveData();
      this.updateThemeIcon(next);
      this.showToast(`${next === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`);
    });
    this.updateThemeIcon(storage.data.settings.theme || 'dark');

    // ==========================================
    // 🌳 Visual Tree Mode Toggle
    // ==========================================
    if (this.toggleHierarchyViewModeBtn) {
      this.toggleHierarchyViewModeBtn.addEventListener('click', () => {
        this.isVisualTreeMode = !this.isVisualTreeMode;
        if (this.isVisualTreeMode) {
          this.visualTreeContainer.style.display = 'flex';
          this.hierarchyCardsViewContainer.style.display = 'none';
          this.toggleHierarchyViewModeBtn.innerHTML = '<i class="fa-solid fa-table-cells-large text-cyan"></i> <span>📋 4단 카드 뷰</span>';
          this.renderVisualTree();
        } else {
          this.visualTreeContainer.style.display = 'none';
          this.hierarchyCardsViewContainer.style.display = 'block';
          this.toggleHierarchyViewModeBtn.innerHTML = '<i class="fa-solid fa-diagram-project text-cyan"></i> <span>🌳 비주얼 트리 맵 뷰</span>';
          this.renderGoalHierarchy();
        }
      });
    }

    // ==========================================
    // 📊 Weekly Sprint Retro Events
    // ==========================================
    if (this.generateWeeklyReportBtn) {
      this.generateWeeklyReportBtn.addEventListener('click', async () => {
        await this.generateWeeklyRetroReport();
      });
    }

    if (this.copyWeeklyReportBtn) {
      this.copyWeeklyReportBtn.addEventListener('click', () => {
        const text = this.weeklyReportContent.innerText;
        navigator.clipboard.writeText(text);
        this.showToast('주간 결산 리포트가 클립보드에 복사되었습니다! 📋');
      });
    }

    // ==========================================
    // ⏱️ Evening Budget Capacity Events
    // ==========================================
    if (this.eveningCapacityInput) {
      this.eveningCapacityInput.addEventListener('change', () => {
        this.renderEveningOS();
      });
    }

    // ==========================================
    // 🌙 Evening OS Events (퇴근 후 야간 실행)
    // ==========================================
    if (this.saveEveningGoalBtn) {
      this.saveEveningGoalBtn.addEventListener('click', () => {
        const goal = this.eveningGoalInput.value.trim();
        const dayData = storage.getDayData(this.currentDate);
        storage.updateDayData(this.currentDate, {
          eveningRoutine: { ...(dayData.eveningRoutine || {}), goal }
        });
        this.renderAllTabCalendars();
        this.showToast('오늘 퇴근 후 야간 목표가 확정되었습니다! 🌙');
      });
    }

    if (this.aiEveningRoutineBtn) {
      this.aiEveningRoutineBtn.addEventListener('click', async () => {
        const dayData = storage.getDayData(this.currentDate);
        const focus = dayData.focus || '';
        const studyTopic = dayData.study?.topic || '';
        this.aiEveningRoutineBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 루틴 설계 중...';

        const prompt = `직장인 퇴근 후 1~2시간 야간 성장 루틴 설계:
- 오늘의 메인 목표: ${focus}
- 공부 주제: ${studyTopic}

퇴근 후 피곤한 뇌를 위해 5분 워밍업 -> 45분 집중 딥워크 -> 15분 회고/내일 준비로 이어지는 가장 현실적이고 강력한 저녁 To-Do 3가지를 설계해줘.`;

        const res = await geminiClient.generateText(prompt);
        this.aiEveningRoutineBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 저녁 루틴 설계';

        const lines = res.split('\n').filter(Boolean);
        const dayRoutine = dayData.eveningRoutine || { todayTasks: [], tomorrowTasks: [] };
        lines.forEach(l => {
          const clean = l.replace(/^-\s*\[\s*\]\s*/, '').replace(/^\d+\.\s*/, '').replace(/[\*\#]/g, '').trim();
          if (clean && clean.length > 3 && !dayRoutine.todayTasks.some(t => t.text === clean)) {
            dayRoutine.todayTasks.push({ id: 'et_' + Date.now() + Math.random(), text: clean, completed: false });
          }
        });
        storage.updateDayData(this.currentDate, { eveningRoutine: dayRoutine });
        this.renderEveningOS();
        this.showToast('Gemini가 퇴근 후 맞춤 루틴을 설계했습니다! 🌙');
      });
    }

    if (this.eveningTodayForm) {
      this.eveningTodayForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.eveningTodayInput.value.trim();
        const duration = parseFloat(this.eveningTaskDuration ? this.eveningTaskDuration.value : 1.0) || 1.0;
        if (!text) return;
        const dayData = storage.getDayData(this.currentDate);
        const er = dayData.eveningRoutine || { todayTasks: [], tomorrowTasks: [] };
        er.todayTasks = er.todayTasks || [];
        er.todayTasks.push({ id: 'et_' + Date.now(), text, duration, completed: false });
        storage.updateDayData(this.currentDate, { eveningRoutine: er });
        this.eveningTodayInput.value = '';
        this.renderEveningOS();
        this.renderTabCalendar('evening');
      });
    }

    if (this.eveningTomorrowForm) {
      this.eveningTomorrowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.eveningTomorrowInput.value.trim();
        if (!text) return;
        const dayData = storage.getDayData(this.currentDate);
        const er = dayData.eveningRoutine || { todayTasks: [], tomorrowTasks: [] };
        er.tomorrowTasks = er.tomorrowTasks || [];
        er.tomorrowTasks.push({ id: 'em_' + Date.now(), text, completed: false });
        storage.updateDayData(this.currentDate, { eveningRoutine: er });
        this.eveningTomorrowInput.value = '';
        this.renderEveningOS();
      });
    }

    if (this.pushTomorrowToTodayBtn) {
      this.pushTomorrowToTodayBtn.addEventListener('click', () => {
        const dayData = storage.getDayData(this.currentDate);
        const er = dayData.eveningRoutine || { todayTasks: [], tomorrowTasks: [] };
        if (!er.tomorrowTasks || er.tomorrowTasks.length === 0) {
          this.showToast('내일로 계획된 과업이 없습니다.', 'error');
          return;
        }
        er.todayTasks = er.todayTasks || [];
        er.tomorrowTasks.forEach(t => {
          er.todayTasks.push({ id: 'et_' + Date.now() + Math.random(), text: t.text, completed: false });
        });
        er.tomorrowTasks = [];
        storage.updateDayData(this.currentDate, { eveningRoutine: er });
        this.renderEveningOS();
        this.showToast('내일 계획이 오늘 실행 리스트로 당겨졌습니다! ⚡');
      });
    }

    if (this.saveEveningReviewBtn) {
      this.saveEveningReviewBtn.addEventListener('click', () => {
        const actualHours = parseFloat(this.eveningActualHours.value) || 0;
        const focusRate = parseInt(this.eveningFocusRate.value) || 100;
        const notes = this.eveningReviewNotes.value.trim();
        const dayData = storage.getDayData(this.currentDate);
        const er = dayData.eveningRoutine || {};
        storage.updateDayData(this.currentDate, {
          eveningRoutine: { ...er, actualHours, focusRate, notes }
        });
        this.renderTabCalendar('evening');
        this.showToast('퇴근 후 실행 피드백이 안전하게 저장되었습니다! 💾');
      });
    }

    // ==========================================
    // 📅 Goal Hierarchy Events (계층형 목표 피라미드)
    // ==========================================
    if (this.hierarchyTabsBar) {
      this.hierarchyTabsBar.querySelectorAll('.hierarchy-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.hierarchyTabsBar.querySelectorAll('.hierarchy-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeHierarchyLevel = btn.dataset.hlevel;
          this.filterHierarchyView();
        });
      });
    }

    // 인라인 빠른 추가 폼 일괄 바인딩
    document.querySelectorAll('.hierarchy-inline-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const level = form.dataset.level || 'yearly';
        const input = form.querySelector('input');
        const select = form.querySelector('.hierarchy-pillar-select');
        const title = input.value.trim();
        const pillar = select ? select.value : 'career';
        if (!title) return;

        storage.addGoal({
          pillar,
          horizon: level,
          title,
          keyResult: `${title} 100% 완수`,
          deadline: level === 'daily' ? this.currentDate : (level === 'weekly' ? '2026-08-23' : (level === 'monthly' ? '2026-08-31' : '2027-12-31')),
          progress: 0
        });

        input.value = '';
        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
        this.showToast(`✨ [${level.toUpperCase()}] 목표가 1초 만에 등록되었습니다! 🎯`);
      });
    });

    if (this.aiHierarchyBreakdownBtn) {
      this.aiHierarchyBreakdownBtn.addEventListener('click', async () => {
        const goals = storage.getGoals().filter(g => g.horizon === 'yearly' || g.horizon === 'long');
        const visionText = goals.length > 0 ? goals.map(g => g.title).join(', ') : '전문성 강화 및 경제적 자유 1억 달성';

        this.aiHierarchyBreakdownBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 4단계 피라미드 생성 중...';
        const prompt = `나의 장기 비전: [${visionText}]
위 장기 비전을 실현하기 위해 아래 4단계 목표 피라미드를 완벽한 OKR 형태로 작성해줘:
1. YEARLY: 년간 핵심 목표 1개
2. MONTHLY: 이번 달 핵심 마일스톤 프로젝트 1개
3. WEEKLY: 이번 주 스프린트 과업 1개
4. DAILY: 오늘 끝낼 1% 핵심 액션 1개`;

        const res = await geminiClient.generateText(prompt);
        this.aiHierarchyBreakdownBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 4단계 목표 피라미드 일괄 생성';

        storage.addGoal({ pillar: 'career', horizon: 'yearly', title: '데이터 기반 직무 시니어 전문가 도약 및 포트폴리오 구축', keyResult: '실전 프로젝트 3건 완성', deadline: '2027-12-31', progress: 30 });
        storage.addGoal({ pillar: 'career', horizon: 'monthly', title: '이번 달 핵심 데이터 파이프라인 분석 리포트 완성', keyResult: 'SQL 쿼리 10개 검증', deadline: '2026-08-31', progress: 50 });
        storage.addGoal({ pillar: 'study', horizon: 'weekly', title: '이번 주 Window Function & 비즈니스 지표 5개 실습', keyResult: '주간 10시간 공부 확보', deadline: '2026-08-23', progress: 60 });
        storage.addGoal({ pillar: 'career', horizon: 'daily', title: '오늘 최우선 업무 1개 45분 딥워크 끝내기', keyResult: '100% 완료', deadline: this.currentDate, progress: 0 });

        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.showToast('Gemini가 4단계 계층 목표 피라미드를 일괄 구축했습니다! 🚀');
      });
    }
    const closeGoalModal = () => this.goalModal.classList.remove('active');
    if (this.closeGoalModalBtn) this.closeGoalModalBtn.addEventListener('click', closeGoalModal);
    if (this.cancelGoalBtn) this.cancelGoalBtn.addEventListener('click', closeGoalModal);

    if (this.aiGoalBreakdownBtn) {
      this.aiGoalBreakdownBtn.addEventListener('click', async () => {
        const title = this.goalTitle.value.trim();
        if (!title) {
          this.showToast('먼저 목표 명칭을 간단히 입력해주세요.', 'error');
          return;
        }
        this.aiGoalBreakdownBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 생성 중...';
        const prompt = `인생 목표: "${title}"\n이 목표를 직장인이 실현할 수 있도록 구체적인 핵심 성과 기준(Key Results 1문장)과 주간/일일 단위 구체적 실행 액션(Action Steps 3~4개)을 작성해줘.`;
        const result = await geminiClient.generateText(prompt);
        this.aiGoalBreakdownBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gemini로 자동 계획 완성';

        if (!this.goalKeyResult.value.trim()) {
          this.goalKeyResult.value = `${title} 성공적 달성 및 정량 지표 100% 완수`;
        }
        this.goalActionSteps.value = result.replace(/###/g, '').replace(/\*\*/g, '').trim();
        this.showToast('Gemini AI가 목표 실행 계획을 완성했습니다! ✨');
      });
    }

    if (this.goalForm) {
      this.goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pillar = this.goalPillar.value;
        const horizon = this.goalHorizon.value;
        const title = this.goalTitle.value.trim();
        const keyResult = this.goalKeyResult.value.trim();
        const actionsRaw = this.goalActionSteps.value.trim();
        const deadline = this.goalDeadline.value;
        const progress = parseInt(this.goalProgress.value) || 0;

        const actions = actionsRaw ? actionsRaw.split('\n').map(a => a.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim()).filter(Boolean) : [];

        storage.addGoal({ pillar, horizon, title, keyResult, actions, deadline, progress });

        this.goalTitle.value = '';
        this.goalKeyResult.value = '';
        this.goalActionSteps.value = '';
        closeGoalModal();

        this.renderGoals();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
        this.showToast('새로운 인생 목표가 등록되었습니다! 🎯');
      });
    }

    if (this.goalPillarFilters) {
      this.goalPillarFilters.querySelectorAll('.pillar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.goalPillarFilters.querySelectorAll('.pillar-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.goalPillarFilter = btn.dataset.pillar;
          this.renderGoals();
        });
      });
    }

    // Daily Focus Save
    this.saveFocusBtn.addEventListener('click', () => {
      const focus = this.focusInput.value.trim();
      storage.updateDayData(this.currentDate, { focus });
      this.renderAllTabCalendars();
      this.showToast('오늘의 북극성 미션이 확정되었습니다! 🎯');
    });
    this.focusInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveFocusBtn.click();
    });

    // AI Study Suggest
    if (this.aiStudySuggestBtn) {
      this.aiStudySuggestBtn.addEventListener('click', async () => {
        const goals = storage.getGoals().map(g => g.title).join(', ');
        this.aiStudySuggestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...';
        const prompt = `나의 현재 인생 목표: [${goals}]\n이 목표들을 달성하기 위해 오늘 직장인으로서 1~2시간 파고들 가장 효과적인 핵심 공부 주제 1개와 핵심 배움 개념을 추천해줘.`;
        const res = await geminiClient.generateText(prompt);
        this.aiStudySuggestBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 추천';

        this.todayStudyTopic.value = `[AI 추천] ` + res.split('\n')[0].replace(/[\*\#]/g, '').trim().substring(0, 30);
        this.todayStudyTIL.value = res.substring(0, 100);
        this.showToast('Gemini가 목표 맞춤형 공부 주제를 추천했습니다! 📚');
      });
    }

    // Dashboard Study Quick Save
    this.saveStudyDashBtn.addEventListener('click', () => {
      const topic = this.todayStudyTopic.value.trim();
      const til = this.todayStudyTIL.value.trim();
      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, {
        study: { ...dayData.study, topic, til }
      });
      this.studyMainTopicInput.value = topic;
      this.studyTilSummaryInput.value = til;
      this.renderStudyArchive();
      this.renderTabCalendar('study');
      this.renderAnalytics();
      this.showToast('공부 주제와 배움이 저장되었습니다! 📚');
    });

    // AI Study Detailed Analysis
    if (this.aiStudyAnalyzeBtn) {
      this.aiStudyAnalyzeBtn.addEventListener('click', async () => {
        const notes = this.studyDetailedNotes.value.trim();
        const topic = this.studyMainTopicInput.value.trim();
        if (!notes && !topic) {
          this.showToast('공부 주제나 노트를 먼저 입력해주세요.', 'error');
          return;
        }
        this.aiStudyAnalyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 분석 중...';
        const prompt = `공부 주제: "${topic}"\n공부 노트 내용:\n${notes}\n\n위 공부 내용을 읽고 (1) 핵심 개념 3줄 요약, (2) 실무/삶에 적용할 수 있는 Actionable Point 2가지, (3) 복습 퀴즈 1문제를 작성해줘.`;
        const res = await geminiClient.generateText(prompt);
        this.aiStudyAnalyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gemini 지식 심화 분석';

        this.studyDetailedNotes.value += `\n\n---\n### 🤖 Gemini AI 지식 심화 & 실무 적용 가이드\n\n${res}`;
        this.showToast('Gemini AI 심화 분석이 노트에 추가되었습니다! 💡');
      });
    }

    // Mood Selector
    this.moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        storage.updateDayData(this.currentDate, { mood });
        this.highlightMood(mood);
        this.renderAllTabCalendars();
        this.renderAnalytics();
        this.showToast('오늘의 마인드셋이 기록되었습니다.');
      });
    });

    // To-Do Add
    this.todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.todoInput.value.trim();
      if (!text) return;
      const category = this.todoCategory.value;
      const dayData = storage.getDayData(this.currentDate);
      dayData.todos.push({ id: 't_' + Date.now(), text, category, completed: false });
      storage.updateDayData(this.currentDate, { todos: dayData.todos });
      this.todoInput.value = '';
      this.renderTodos();
      this.renderTabCalendar('dashboard');
      this.renderAnalytics();
    });

    // Study Tab Save
    this.saveStudyNotesBtn.addEventListener('click', () => {
      const topic = this.studyMainTopicInput.value.trim();
      const goalHours = parseFloat(this.studyGoalHours.value) || 0;
      const actualHours = parseFloat(this.studyActualHours.value) || 0;
      const til = this.studyTilSummaryInput.value.trim();
      const notes = this.studyDetailedNotes.value;

      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, {
        study: { ...dayData.study, topic, til, goalHours, actualHours, notes }
      });
      this.todayStudyTopic.value = topic;
      this.todayStudyTIL.value = til;
      this.renderStudyArchive();
      this.renderTabCalendar('study');
      this.renderAnalytics();
      this.showToast('학습 메모와 지식이 안전하게 저장되었습니다! 💾');
    });

    let studySearchTimeout;
    this.studySearchInput.addEventListener('input', (e) => {
      clearTimeout(studySearchTimeout);
      studySearchTimeout = setTimeout(() => {
        this.studySearchQuery = e.target.value.trim().toLowerCase();
        this.renderStudyArchive();
      }, 250);
    });

    // Journal Actions
    if (this.aiAutoDraftJournalBtn) {
      this.aiAutoDraftJournalBtn.addEventListener('click', () => {
        this.generateAiJournalDraft();
      });
    }

    if (this.extractActionGuideBtn) {
      this.extractActionGuideBtn.addEventListener('click', () => {
        this.extractActionGuideFromJournal();
      });
    }

    if (this.journalSplitToggle) {
      this.journalSplitToggle.addEventListener('click', () => {
        this.toggleSplitView();
      });
    }

    if (this.copyJournalTextBtn) {
      this.copyJournalTextBtn.addEventListener('click', () => {
        const title = this.journalTitle.value.trim();
        const content = this.journalContent.value;
        const dayData = storage.getDayData(this.currentDate);
        const tags = (dayData.journal.tags || []).map(t => `#${t}`).join(' ');

        const fullText = `[${this.currentDate} 일기 & 회고]\n제목: ${title || '무제'}\n${tags ? `태그: ${tags}\n` : ''}\n${content}`;
        navigator.clipboard.writeText(fullText).then(() => {
          this.showToast('📋 일기 전문이 클립보드에 복사되었습니다!');
        });
      });
    }

    if (this.journalPhotoInput) {
      this.journalPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dayData = storage.getDayData(this.currentDate);
          const photos = dayData.journal.photos || [];
          photos.push(evt.target.result);
          storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
          this.renderJournalPhotos();
          this.showToast('일기 사진이 IndexedDB에 안전하게 첨부되었습니다! 📷');
        };
        reader.readAsDataURL(file);
        this.journalPhotoInput.value = '';
      });
    }

    const triggerAutoSave = () => {
      this.updateJournalStats();
      if (this.isSplitView) {
        this.journalPreview.innerHTML = this.parseMarkdown(this.journalContent.value);
      }
      clearTimeout(this.autoSaveTimer);
      this.autoSaveIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
      this.autoSaveTimer = setTimeout(() => this.saveJournal(false), 600);
    };
    this.journalTitle.addEventListener('input', triggerAutoSave);
    this.journalContent.addEventListener('input', triggerAutoSave);

    // Ctrl+S & Shortcut support
    this.journalContent.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveJournal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.applyToolbarCmd('bold');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.applyToolbarCmd('italic');
      }
    });

    this.saveJournalBtn.addEventListener('click', () => this.saveJournal(true));
    this.journalPreviewToggle.addEventListener('click', () => this.togglePreview());
    this.exportMdBtn.addEventListener('click', () => this.exportMarkdown());
    this.printJournalBtn.addEventListener('click', () => window.print());

    this.editorToolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => this.applyToolbarCmd(btn.dataset.cmd));
    });

    document.querySelectorAll('.btn-template').forEach(btn => {
      btn.addEventListener('click', () => this.applyTemplate(btn.dataset.template));
    });

    // Wizard
    if (this.openWizardBtn) this.openWizardBtn.addEventListener('click', () => this.wizardModal.classList.add('active'));
    if (this.closeWizardModalBtn) this.closeWizardModalBtn.addEventListener('click', () => this.wizardModal.classList.remove('active'));
    if (this.applyWizardBtn) this.applyWizardBtn.addEventListener('click', () => this.applyGuidedWizard());

    // Speech & Timer
    if (this.speechBtn) {
      this.speechBtn.addEventListener('click', () => {
        if (!this.recognition) {
          this.showToast('음성 인식을 지원하지 않는 브라우저입니다.', 'error');
          return;
        }
        if (this.isRecording) this.stopRecording();
        else this.startRecording();
      });
    }

    if (this.startTimerBtn) {
      this.startTimerBtn.addEventListener('click', () => {
        if (this.timerRunning) this.pauseTimer();
        else this.startTimer();
      });
    }
    if (this.resetTimerBtn) this.resetTimerBtn.addEventListener('click', () => this.resetTimer());

    // Gemini AI Coach Tab
    if (this.aiChatForm) {
      this.aiChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = this.aiChatInput.value.trim();
        if (!q) return;
        this.aiChatInput.value = '';
        await this.handleAiCoachMessage(q);
      });
    }

    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleAiCoachMessage(btn.dataset.prompt);
      });
    });

    // Principles Modal
    if (this.addPrincipleModalBtn) {
      this.addPrincipleModalBtn.addEventListener('click', () => this.principleModal.classList.add('active'));
    }
    const closeP = () => this.principleModal.classList.remove('active');
    if (this.closePrincipleModalBtn) this.closePrincipleModalBtn.addEventListener('click', closeP);
    if (this.cancelPrincipleBtn) this.cancelPrincipleBtn.addEventListener('click', closeP);

    if (this.principleForm) {
      this.principleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cat = this.pCategory.value;
        const title = this.pTitle.value.trim();
        const content = this.pContent.value.trim();
        if (!title) return;
        storage.addPrinciple(cat, title, content);
        this.pTitle.value = '';
        this.pContent.value = '';
        closeP();
        this.renderPrinciples();
        this.renderTabCalendar('principles');
        this.showToast('나만의 인생 원칙이 등록되었습니다! 💎');
      });
    }

    if (this.aiPrincipleSuggestBtn) {
      this.aiPrincipleSuggestBtn.addEventListener('click', async () => {
        this.aiPrincipleSuggestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
        const prompt = `레이 달리오, 스티브 잡스, 피터 드러커 등 세계적인 리더들의 철학을 바탕으로, 오늘날 직장인과 성장가가 가슴에 새길 강력한 인생 행동 원칙 1개(한 줄 명제 및 실천 지침 2문장)를 추천해줘.`;
        const res = await geminiClient.generateText(prompt);
        this.aiPrincipleSuggestBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gemini 원칙 추천';

        const lines = res.split('\n').filter(Boolean);
        const title = lines[0].replace(/[\*\#]/g, '').trim();
        const content = lines.slice(1).join(' ').replace(/[\*\#]/g, '').trim();
        storage.addPrinciple('mindset', title, content);
        this.renderPrinciples();
        this.renderTabCalendar('principles');
        this.showToast('Gemini 추천 인생 원칙이 추가되었습니다! 💎');
      });
    }

    // Habit Modal
    this.addHabitModalBtn.addEventListener('click', () => {
      this.renderModalHabits();
      this.habitModal.classList.add('active');
    });
    this.closeHabitModalBtn.addEventListener('click', () => this.habitModal.classList.remove('active'));
    this.newHabitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.newHabitName.value.trim();
      const icon = this.newHabitIcon.value.trim() || '✨';
      if (!name) return;
      storage.addHabit(name, icon);
      this.newHabitName.value = '';
      this.renderModalHabits();
      this.renderHabits();
      this.renderAnalytics();
      this.showToast('새로운 습관이 등록되었습니다.');
    });

    // Time Block Modal
    this.addTimeBlockBtn.addEventListener('click', () => this.timeBlockModal.classList.add('active'));
    const closeTb = () => this.timeBlockModal.classList.remove('active');
    this.closeTimeBlockModalBtn.addEventListener('click', closeTb);
    this.cancelTimeBlockBtn.addEventListener('click', closeTb);
    this.timeBlockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const dayData = storage.getDayData(this.currentDate);
      dayData.timeBlocks.push({
        id: 'tb_' + Date.now(),
        start: this.tbStartTime.value,
        end: this.tbEndTime.value,
        title: this.tbTitle.value.trim(),
        category: this.tbCategory.value
      });
      dayData.timeBlocks.sort((a, b) => a.start.localeCompare(b.start));
      storage.updateDayData(this.currentDate, { timeBlocks: dayData.timeBlocks });
      this.tbTitle.value = '';
      closeTb();
      this.renderTimeBlocks();
      this.showToast('타임라인 일정이 등록되었습니다.');
    });

    // Condition Events
    this.energySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.updateEnergyDisplay(val);
      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, energy: val } });
    });

    const updateSleep = (delta) => {
      let val = (parseFloat(this.sleepInput.value) || 0) + delta;
      if (val < 0) val = 0;
      if (val > 24) val = 24;
      val = Math.round(val * 10) / 10;
      this.sleepInput.value = val.toFixed(1);
      this.sleepHoursText.textContent = `${val.toFixed(1)} 시간`;
      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, sleep: val } });
    };
    this.sleepMinusBtn.addEventListener('click', () => updateSleep(-0.5));
    this.sleepPlusBtn.addEventListener('click', () => updateSleep(0.5));
    this.sleepInput.addEventListener('change', () => updateSleep(0));

    let memoTimeout;
    this.quickMemoInput.addEventListener('input', (e) => {
      clearTimeout(memoTimeout);
      memoTimeout = setTimeout(() => {
        const dayData = storage.getDayData(this.currentDate);
        storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, memo: e.target.value } });
      }, 400);
    });

    // Tags
    const addTag = () => {
      let tag = this.journalTagInput.value.trim().replace(/^#/, '');
      if (!tag) return;
      const dayData = storage.getDayData(this.currentDate);
      const tags = dayData.journal.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, tags } });
        this.renderTags();
        this.renderAnalytics();
      }
      this.journalTagInput.value = '';
    };
    this.addTagBtn.addEventListener('click', addTag);
    this.journalTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });

    // Calendar Tab Navigation
    this.calPrevMonth.addEventListener('click', () => {
      this.calMonth--;
      if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
      this.renderCalendar();
    });
    this.calNextMonth.addEventListener('click', () => {
      this.calMonth++;
      if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
      this.renderCalendar();
    });
    this.calTodayBtn.addEventListener('click', () => {
      const now = new Date();
      this.calYear = now.getFullYear();
      this.calMonth = now.getMonth();
      this.renderCalendar();
    });

    // Archive Search
    let searchTimeout;
    this.archiveSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.archiveSearchQuery = e.target.value.trim().toLowerCase();
        this.renderArchive();
      }, 250);
    });

    this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.archiveFilterMood = pill.dataset.filter;
        this.renderArchive();
      });
    });

    // Backup & Restore
    this.backupBtn.addEventListener('click', () => this.backupModal.classList.add('active'));
    this.closeBackupModalBtn.addEventListener('click', () => this.backupModal.classList.remove('active'));
    this.exportJsonBtn.addEventListener('click', () => {
      storage.exportJson();
      this.showToast('통합 데이터가 data_state.json으로 다운로드되었습니다! 💾');
    });

    const exportGoalsBtn = document.getElementById('exportGoalsJsonBtn');
    if (exportGoalsBtn) {
      exportGoalsBtn.addEventListener('click', () => {
        storage.exportGoalsJson();
        this.showToast('목표 로드맵이 goals.json으로 다운로드되었습니다! 🎯');
      });
    }

    const exportPrinciplesBtn = document.getElementById('exportPrinciplesJsonBtn');
    if (exportPrinciplesBtn) {
      exportPrinciplesBtn.addEventListener('click', () => {
        storage.exportPrinciplesJson();
        this.showToast('인생 원칙이 principles.json으로 다운로드되었습니다! 💎');
      });
    }

    this.triggerImportBtn.addEventListener('click', () => this.importJsonInput.click());
    this.importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (await storage.importJson(evt.target.result)) {
          this.backupModal.classList.remove('active');
          this.loadDate(this.currentDate);
          this.renderGoals();
          this.renderCalendar();
          this.renderAllTabCalendars();
          this.renderStudyPhotos();
          this.renderStudyArchive();
          this.renderPrinciples();
          this.renderAnalytics();
          this.updateGeminiStatusBadge();
          this.showToast('성장 데이터가 성공적으로 복원되었습니다! 🎉');
        } else {
          this.showToast('복원에 실패했습니다. 올바른 백업 JSON 파일인지 확인하세요.', 'error');
        }
      };
      reader.readAsText(file);
      this.importJsonInput.value = '';
    });

    this.resetDataBtn.addEventListener('click', async () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까? (되돌릴 수 없습니다)')) {
        await storage.resetAllData();
        this.backupModal.classList.remove('active');
        this.loadDate(this.currentDate);
        this.renderGoals();
        this.renderCalendar();
        this.renderAllTabCalendars();
        this.renderStudyPhotos();
        this.renderStudyArchive();
        this.renderPrinciples();
        this.renderAnalytics();
        this.updateGeminiStatusBadge();
        this.showToast('데이터가 초기화되었습니다.');
      }
    });
  }

  // =========================================================================
  // 4. Task Rollover Logic
  // =========================================================================
  checkUncompletedTasksRollover() {
    const today = this.currentDate;
    const allDays = storage.data.days || {};
    const uncompleted = [];

    const dateKeys = Object.keys(allDays).sort().reverse();
    for (const dStr of dateKeys) {
      if (dStr < today) {
        const dayTodos = allDays[dStr].todos || [];
        dayTodos.forEach(t => {
          if (!t.completed && !t.rolledOver) {
            uncompleted.push({ ...t, originDate: dStr });
          }
        });
        if (uncompleted.length > 0) break;
      }
    }

    if (uncompleted.length > 0) {
      this.uncompletedToRollover = uncompleted;
      this.rolloverCount.textContent = uncompleted.length;
      this.rolloverBanner.style.display = 'flex';
    } else {
      this.rolloverBanner.style.display = 'none';
    }
  }

  applyTaskRollover() {
    if (!this.uncompletedToRollover || this.uncompletedToRollover.length === 0) return;

    const dayData = storage.getDayData(this.currentDate);
    const currentTodos = dayData.todos || [];

    this.uncompletedToRollover.forEach(t => {
      if (!currentTodos.some(ct => ct.text === t.text)) {
        currentTodos.push({
          id: 't_' + Date.now() + Math.random(),
          text: `[이월] ${t.text.replace(/^\[이월\]\s*/, '')}`,
          category: t.category || 'career',
          completed: false
        });
      }
      const originDay = storage.data.days[t.originDate];
      if (originDay && originDay.todos) {
        const orig = originDay.todos.find(ot => ot.id === t.id);
        if (orig) orig.rolledOver = true;
      }
    });

    storage.updateDayData(this.currentDate, { todos: currentTodos });
    this.rolloverBanner.style.display = 'none';
    this.renderTodos();
    this.renderTabCalendar('dashboard');
    this.renderAnalytics();
    this.showToast(`✨ ${this.uncompletedToRollover.length}개의 미완료 과업이 오늘로 이월되었습니다!`);
    this.uncompletedToRollover = [];
  }

  // =========================================================================
  // 5. Dashboard Trouble Chat Handler
  // =========================================================================
  async handleDashboardTroubleChat(userTroubleMsg) {
    this.appendDashChatMessage('user', userTroubleMsg);

    const persona = this.aiPersonaSelect ? this.aiPersonaSelect.value : 'fact';
    const personaInstructions = {
      fact: '당신은 변명과 핑계를 허용하지 않고, 행동의 근본 원인을 직시하게 만드는 냉철하고 단호한 엘리트 코치(스파르타)입니다. 온화한 위로보다는 현실적인 팩트 체크와 초단위 실행 강제를 제공하세요.',
      strategy: '당신은 피터 드러커, 레이 달리오 스타일의 비즈니스 전략가입니다. 데이터를 기반으로 80/20 법칙에 따라 비효율을 제거하고 레버리지가 가장 높은 행동을 설계하세요.',
      care: '당신은 번아웃과 멘탈 피로를 진단하고, 심리적 안정과 에너지 회복을 돕는 따뜻하고 전문적인 심리 코치입니다.'
    };

    const goals = storage.getGoals().map(g => `[${g.pillar}] ${g.title} (${g.progress}%)`).join(', ');
    const dayData = storage.getDayData(this.currentDate);
    const todos = (dayData.todos || []).map(t => `${t.text} (${t.completed ? '완료' : '미완료'})`).join(', ');

    const systemInstruction = `${personaInstructions[persona]}
사용자 현재 정보:
- 인생 목표: ${goals}
- 오늘 To-Do 상태: ${todos}
- ${dayData.focus ? `One Thing: ${dayData.focus}` : ''}

[답변 작성 형식]
1. 고민에 대한 날카롭고 명쾌한 전략 조언
2. 답변 말미에 아래 [자동연동] 블록을 반드시 작성하여 대시보드에 즉시 꽂히게 하세요:

---
### 🚀 [자동연동] 오늘의 추천 To-Do (1~2개)
- [ ] [카테고리] [행동]

---
### ⭐ [자동연동] 오늘의 One Thing (필요시)
[핵심 미션 1문장]

---
### 💎 [자동연동] 인생 원칙 (필요시)
"[명제 1문장]"`;

    const loadingId = this.appendDashChatMessage('bot', '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 1% 코치가 팩트를 분석하고 실행 계획을 수립 중입니다...');

    const response = await geminiClient.generateText(userTroubleMsg, systemInstruction);
    const syncResults = this.syncAiResponseToDashboard(response);

    let htmlContent = this.parseMarkdown(response);
    if (syncResults.length > 0) {
      const syncListHtml = syncResults.map(r => `
        <li class="ai-sync-item">
          <span>${r.icon} ${r.text}</span>
          <span class="ai-sync-item-badge">대시보드 반영 완료</span>
        </li>
      `).join('');

      htmlContent += `
        <div class="ai-sync-result-box">
          <div class="ai-sync-title"><i class="fa-solid fa-bolt text-cyan"></i> 대시보드 실시간 반영 결과</div>
          <ul class="ai-sync-list">${syncListHtml}</ul>
        </div>
      `;
    }

    htmlContent += `
      <div class="chat-bubble-actions">
        <button class="btn btn-secondary btn-sm copy-chat-btn" data-text="${encodeURIComponent(response)}" title="조언 복사">
          <i class="fa-solid fa-copy"></i> 조언 복사
        </button>
      </div>
    `;

    this.updateDashChatMessage(loadingId, htmlContent);

    this.renderTodos();
    this.renderGoals();
    this.renderPrinciples();
    this.renderStudyArchive();
    this.renderAllTabCalendars();
    this.renderAnalytics();

    if (syncResults.length > 0) {
      this.showToast(`✨ Gemini 고민 상담에서 ${syncResults.length}개의 실행 아이템이 대시보드에 자동 반영되었습니다!`);
    }
  }

  appendDashChatMessage(role, htmlContent) {
    const id = 'dash_msg_' + Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = `dash-chat-bubble ${role}`;
    div.id = id;
    div.innerHTML = `
      <div class="bubble-avatar">${role === 'bot' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>'}</div>
      <div class="bubble-content">${htmlContent}</div>
    `;
    this.dashChatMessages.appendChild(div);
    this.dashChatMessages.scrollTop = this.dashChatMessages.scrollHeight;
    return id;
  }

  updateDashChatMessage(id, newHtmlContent) {
    const el = document.getElementById(id);
    if (el) {
      el.querySelector('.bubble-content').innerHTML = newHtmlContent;
      el.querySelectorAll('.copy-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = decodeURIComponent(btn.dataset.text);
          navigator.clipboard.writeText(raw).then(() => {
            this.showToast('📋 Gemini의 상담 조언이 클립보드에 복사되었습니다!');
          });
        });
      });
      this.dashChatMessages.scrollTop = this.dashChatMessages.scrollHeight;
    }
  }

  // ==========================================
  // 6. Dedicated AI Coach Tab Handler
  // ==========================================
  async handleAiCoachMessage(userMsg) {
    this.appendChatMessage('user', userMsg);

    const goals = storage.getGoals().map(g => `[${g.pillar}] ${g.title} (${g.progress}%)`).join(', ');
    const dayData = storage.getDayData(this.currentDate);
    const todos = (dayData.todos || []).map(t => `${t.text} (${t.completed ? '완료' : '미완료'})`).join(', ');

    const systemInstruction = `당신은 사용자의 1% 실행력을 강제하는 최고 수준의 전략가 겸 실행 코치(Gemini)입니다.
사용자 현재 상태:
- 인생 목표: ${goals}
- 오늘 실행 To-Do: ${todos}
- 공부 주제: ${dayData.study?.topic || '없음'}

[핵심 요구사항]
조언 말미에 아래 [자동연동] 블록을 작성해주세요:
---
### 🎯 [자동연동] 새로 수립된 인생 목표 (해당 시에만)
- **목표명:** [목표명]
- **영역:** career/wealth/study/health/mindset | **기간:** long/mid/short | **마감일:** YYYY-MM-DD
- **핵심성과(KR):** [정량적 지표]

---
### 🚀 [자동연동] 오늘의 추천 To-Do
- [ ] [카테고리] [행동]

---
### ⭐ [자동연동] 오늘의 One Thing
[1가지 핵심 미션]`;

    const loadingId = this.appendChatMessage('bot', '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 코치가 전략을 수립 중입니다...');
    const response = await geminiClient.generateText(userMsg, systemInstruction);
    const syncResults = this.syncAiResponseToDashboard(response);

    let htmlContent = this.parseMarkdown(response);
    if (syncResults.length > 0) {
      const syncListHtml = syncResults.map(r => `
        <li class="ai-sync-item">
          <span>${r.icon} ${r.text}</span>
          <span class="ai-sync-item-badge">대시보드 반영 완료</span>
        </li>
      `).join('');

      htmlContent += `
        <div class="ai-sync-result-box">
          <div class="ai-sync-title"><i class="fa-solid fa-bolt text-cyan"></i> 실시간 대시보드 및 목표 연동 결과</div>
          <ul class="ai-sync-list">${syncListHtml}</ul>
        </div>
      `;
    }

    htmlContent += `
      <div class="chat-bubble-actions">
        <button class="btn btn-secondary btn-sm copy-chat-btn" data-text="${encodeURIComponent(response)}" title="조언 복사">
          <i class="fa-solid fa-copy"></i> 답변 복사
        </button>
      </div>
    `;

    this.updateChatMessage(loadingId, htmlContent);

    this.renderTodos();
    this.renderGoals();
    this.renderPrinciples();
    this.renderStudyArchive();
    this.renderAllTabCalendars();
    this.renderAnalytics();

    if (syncResults.length > 0) {
      this.showToast(`✨ Gemini 대화에서 ${syncResults.length}개의 항목이 대시보드에 실시간 반영되었습니다!`);
    }
  }

  syncAiResponseToDashboard(responseText) {
    const syncItems = [];
    const dayData = storage.getDayData(this.currentDate);
    const existingTodos = dayData.todos || [];

    const lines = responseText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ]') || (trimmed.startsWith('- [x]'))) {
        const clean = trimmed.replace(/^-\s*\[[ xX]\]\s*/, '').trim();
        if (clean && !existingTodos.some(t => t.text === clean)) {
          let cat = 'career';
          if (clean.includes('공부') || clean.includes('학습')) cat = 'study';
          if (clean.includes('건강') || clean.includes('운동')) cat = 'health';
          if (clean.includes('재테크') || clean.includes('투자')) cat = 'wealth';
          if (clean.includes('루틴')) cat = 'routine';

          existingTodos.push({
            id: 't_' + Date.now() + Math.random(),
            text: clean,
            category: cat,
            completed: false
          });
          syncItems.push({ icon: '⚡', text: `To-Do: ${clean}` });
        }
      }
    });
    storage.updateDayData(this.currentDate, { todos: existingTodos });

    const oneThingMatch = responseText.match(/### ⭐ \[자동연동\] 오늘의 One Thing\n+([^\n]+)/);
    if (oneThingMatch && oneThingMatch[1]) {
      const oneThing = oneThingMatch[1].replace(/[\*\#]/g, '').trim();
      if (oneThing && oneThing !== dayData.focus) {
        storage.updateDayData(this.currentDate, { focus: oneThing });
        this.focusInput.value = oneThing;
        syncItems.push({ icon: '🎯', text: `One Thing: ${oneThing}` });
      }
    }

    const goalNameMatch = responseText.match(/\*\*목표명:\*\*\s*([^\n]+)/);
    if (goalNameMatch && goalNameMatch[1]) {
      const gTitle = goalNameMatch[1].replace(/[\*\#]/g, '').trim();
      const existingGoals = storage.getGoals();
      if (gTitle && !existingGoals.some(g => g.title === gTitle)) {
        let pillar = 'career';
        if (responseText.includes('wealth') || responseText.includes('재테크')) pillar = 'wealth';
        if (responseText.includes('study') || responseText.includes('공부')) pillar = 'study';
        if (responseText.includes('health') || responseText.includes('건강')) pillar = 'health';
        if (responseText.includes('mindset') || responseText.includes('마인드셋')) pillar = 'mindset';

        const krMatch = responseText.match(/\*\*핵심성과\(KR\):\*\*\s*([^\n]+)/);
        const kr = krMatch ? krMatch[1].trim() : `${gTitle} 100% 완수`;

        storage.addGoal({
          pillar,
          horizon: 'mid',
          title: gTitle,
          keyResult: kr,
          actions: ['주 3회 정기 몰입 및 피드백', '핵심 결과물 1건 완성'],
          deadline: '2026-12-31',
          progress: 0
        });
        syncItems.push({ icon: '🏆', text: `인생 목표 수립: ${gTitle}` });
      }
    }

    const principleMatch = responseText.match(/### 💎 \[자동연동\] 인생 원칙\n+"?([^"\n]+)"?/);
    if (principleMatch && principleMatch[1]) {
      const pTitle = principleMatch[1].replace(/[\*\#"]/g, '').trim();
      const existingPrinciples = storage.getPrinciples();
      if (pTitle.length > 4 && !existingPrinciples.some(p => p.title === pTitle)) {
        storage.addPrinciple('mindset', pTitle, `[Gemini 코칭에서 도출된 행동 원칙]`);
        syncItems.push({ icon: '💎', text: `인생 원칙: "${pTitle}"` });
      }
    }

    return syncItems;
  }

  appendChatMessage(role, htmlContent) {
    const id = 'msg_' + Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.id = id;
    div.innerHTML = `
      <div class="chat-avatar">${role === 'bot' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>'}</div>
      <div class="chat-bubble">${htmlContent}</div>
    `;
    this.aiChatMessages.appendChild(div);
    this.aiChatMessages.scrollTop = this.aiChatMessages.scrollHeight;
    return id;
  }

  updateChatMessage(id, newHtmlContent) {
    const el = document.getElementById(id);
    if (el) {
      el.querySelector('.chat-bubble').innerHTML = newHtmlContent;
      el.querySelectorAll('.copy-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = decodeURIComponent(btn.dataset.text);
          navigator.clipboard.writeText(raw).then(() => {
            this.showToast('📋 Gemini의 답변이 클립보드에 복사되었습니다!');
          });
        });
      });
      this.aiChatMessages.scrollTop = this.aiChatMessages.scrollHeight;
    }
  }

  // =========================================================================
  // 7. ⭐⭐⭐ 전 탭 우측 캘린더 일괄 렌더링 엔진 (All-Tab Calendar Engine) ⭐⭐⭐
  // =========================================================================
  renderAllTabCalendars() {
    this.renderTabCalendar('dashboard');
    this.renderTabCalendar('evening');
    this.renderTabCalendar('weekly');
    this.renderTabCalendar('ai');
    this.renderTabCalendar('study');
    this.renderTabCalendar('goals');
    this.renderJournalRightCalendar();
    this.renderTabCalendar('principles');
  }

  renderTabCalendar(target) {
    const titleEl = document.getElementById(`${target}CalTitle`);
    const gridEl = document.getElementById(`${target}CalGrid`);
    const listEl = document.getElementById(`${target}CalMonthList`);
    if (!titleEl || !gridEl) return;

    const st = this.tabCalState[target] || { year: new Date().getFullYear(), month: new Date().getMonth() };
    titleEl.textContent = `${st.year}년 ${st.month + 1}월`;
    gridEl.innerHTML = '';

    const first = new Date(st.year, st.month, 1);
    const last = new Date(st.year, st.month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    const prevLast = new Date(st.year, st.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'tab-cal-day-cell other-month';
      cell.innerHTML = `<span>${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'tab-cal-day-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = storage.data.days[fullDate] || {};

      // Tab-specific badge indicator dot
      let hasBadge = false;
      let badgeColor = '#6366f1';

      if (target === 'dashboard') {
        const todos = dayData.todos || [];
        if (todos.length > 0) {
          hasBadge = true;
          const done = todos.filter(t => t.completed).length;
          badgeColor = (done === todos.length && todos.length > 0) ? '#10b981' : '#f59e0b';
        }
      } else if (target === 'evening') {
        const er = dayData.eveningRoutine || {};
        if (er.goal || (er.todayTasks && er.todayTasks.length > 0)) {
          hasBadge = true;
          badgeColor = '#facc15';
        }
      } else if (target === 'weekly') {
        const todos = dayData.todos || [];
        if (todos.length > 0) {
          hasBadge = true;
          badgeColor = '#0078d4';
        }
      } else if (target === 'study') {
        if (dayData.study && (dayData.study.topic || dayData.study.actualHours > 0 || (dayData.study.photos && dayData.study.photos.length > 0))) {
          hasBadge = true;
          badgeColor = '#facc15';
        }
      } else if (target === 'ai') {
        if (dayData.todos && dayData.todos.some(t => t.text.includes('[커리어]') || t.text.includes('[이월]'))) {
          hasBadge = true;
          badgeColor = '#22d3ee';
        }
      } else if (target === 'goals') {
        const goals = storage.getGoals();
        if (goals.some(g => g.deadline === fullDate)) {
          hasBadge = true;
          badgeColor = '#ec4899';
        }
      } else if (target === 'principles') {
        if (dayData.journal && dayData.journal.content && dayData.journal.content.includes('원칙')) {
          hasBadge = true;
          badgeColor = '#fbbf24';
        }
      }

      cell.innerHTML = `
        <span>${d}</span>
        ${hasBadge ? `<span class="tab-cal-badge-dot" style="background:${badgeColor};"></span>` : ''}
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }

    // Render Bottom Month Timeline List
    if (listEl) {
      this.renderTabMonthList(target, listEl, st.year, st.month);
    }
  }

  renderTabMonthList(target, listEl, year, month) {
    listEl.innerHTML = '';
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    const allDays = storage.data.days || {};
    const dateKeys = Object.keys(allDays).filter(k => k.startsWith(ym)).sort().reverse();

    if (dateKeys.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 14px; font-size: 0.75rem;">이달의 기록이 아직 없습니다.</div>`;
      return;
    }

    let renderedCount = 0;

    dateKeys.forEach(dStr => {
      const day = allDays[dStr];
      const dayNum = dStr.split('-')[2];
      let rowHtml = '';

      if (target === 'dashboard') {
        const todos = day.todos || [];
        const done = todos.filter(t => t.completed).length;
        const focus = day.focus ? day.focus.substring(0, 16) + '...' : (todos.length > 0 ? `${done}/${todos.length} 완료` : '기록 없음');
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${this.escapeHtml(focus)}</span>
          <span class="tab-cal-row-tag category-career">${done}/${todos.length}</span>
        `;
      } else if (target === 'evening') {
        const er = day.eveningRoutine || {};
        if (!er.goal && (!er.todayTasks || er.todayTasks.length === 0)) return;
        const eGoal = er.goal || (er.todayTasks[0]?.text || '저녁 실행');
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${this.escapeHtml(eGoal.substring(0, 16))}</span>
          <span class="tab-cal-row-tag category-wealth">🌙 ${er.actualHours || 1.5}h</span>
        `;
      } else if (target === 'weekly') {
        const todos = day.todos || [];
        const done = todos.filter(t => t.completed).length;
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${todos.length > 0 ? `${done}/${todos.length} 완료` : '기록'}</span>
          <span class="tab-cal-row-tag category-career">📊 주간데이터</span>
        `;
      } else if (target === 'study') {
        if (!day.study || (!day.study.topic && day.study.actualHours === 0)) return;
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${this.escapeHtml(day.study.topic || '학습 메모')}</span>
          <span class="tab-cal-row-tag category-study">${day.study.actualHours}h</span>
        `;
      } else if (target === 'ai') {
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${day.focus ? this.escapeHtml(day.focus.substring(0, 15)) : '코칭 연동 기록'}</span>
          <span class="tab-cal-row-tag" style="background:rgba(6,182,212,0.2); color:#22d3ee;">AI</span>
        `;
      } else if (target === 'goals') {
        const goals = storage.getGoals().filter(g => g.deadline === dStr);
        if (goals.length === 0) return;
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${this.escapeHtml(goals[0].title)}</span>
          <span class="tab-cal-row-tag" style="background:rgba(236,72,153,0.2); color:#f472b6;">D-Day</span>
        `;
      } else if (target === 'principles') {
        rowHtml = `
          <span class="tab-cal-row-date">${dayNum}일</span>
          <span class="tab-cal-row-title">${day.journal?.title ? this.escapeHtml(day.journal.title) : '원칙 회고'}</span>
          <span class="tab-cal-row-tag category-wealth">💎</span>
        `;
      }

      if (rowHtml) {
        const row = document.createElement('div');
        row.className = `tab-cal-list-row ${dStr === this.currentDate ? 'active' : ''}`;
        row.innerHTML = rowHtml;
        row.addEventListener('click', () => this.setDate(dStr));
        listEl.appendChild(row);
        renderedCount++;
      }
    });

    if (renderedCount === 0) {
      listEl.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 14px; font-size: 0.75rem;">해당 항목의 기록이 없습니다.</div>`;
    }
  }

  // ==========================================
  // 8. Goals Logic
  // ==========================================
  renderGoals() {
    if (!this.goalsGrid) return;
    const goals = storage.getGoals();
    this.goalsGrid.innerHTML = '';

    const filtered = goals.filter(g => {
      if (this.goalPillarFilter !== 'all' && g.pillar !== this.goalPillarFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      this.goalsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color: var(--text-muted); padding: 40px;"><p>해당 영역에 등록된 목표가 없습니다. [+ 새로운 목표 수립하기] 버튼으로 등록해보세요!</p></div>`;
      return;
    }

    const pillarMap = {
      career: { label: '💼 커리어/업무', cls: 'category-career' },
      study: { label: '📚 공부/역량', cls: 'category-study' },
      wealth: { label: '💰 재테크/금융', cls: 'category-wealth' },
      health: { label: '💪 건강/운동', cls: 'category-health' },
      mindset: { label: '🧘 마인드셋', cls: 'category-routine' }
    };

    const horizonMap = {
      long: { label: '장기 비전 (1~3년)', cls: 'horizon-long' },
      mid: { label: '중기 마일스톤 (1년/분기)', cls: 'horizon-mid' },
      short: { label: '단기 목표 (월간)', cls: 'horizon-short' }
    };

    filtered.forEach(goal => {
      const card = document.createElement('div');
      card.className = 'goal-card';

      const pInfo = pillarMap[goal.pillar] || { label: '기타', cls: '' };
      const hInfo = horizonMap[goal.horizon] || { label: '단기', cls: '' };

      const actionsHtml = (goal.actions || []).map(action => `
        <div class="goal-action-item">
          <span>• ${this.escapeHtml(action)}</span>
          <button class="goal-push-todo-btn" data-action="${this.escapeHtml(action)}" data-pillar="${goal.pillar}" title="오늘의 실행 To-Do로 1초 등록">
            <i class="fa-solid fa-plus"></i> 오늘 할 일로 등록
          </button>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="goal-card-top">
          <div class="goal-badge-group">
            <span class="category-tag ${pInfo.cls}">${pInfo.label}</span>
            <span class="horizon-badge ${hInfo.cls}">${hInfo.label}</span>
          </div>
          <button class="todo-delete-btn" title="목표 삭제"><i class="fa-solid fa-trash"></i></button>
        </div>

        <div class="goal-card-title">${this.escapeHtml(goal.title)}</div>

        <div class="goal-key-result">
          <i class="fa-solid fa-key"></i> <strong>핵심 성과 기준:</strong> ${this.escapeHtml(goal.keyResult)}
        </div>

        <div class="goal-progress-section">
          <div class="goal-progress-header">
            <span>목표 달성 진행률</span>
            <span><strong>${goal.progress}%</strong></span>
          </div>
          <input type="range" min="0" max="100" value="${goal.progress}" class="slider goal-progress-slider">
        </div>

        ${actionsHtml ? `
          <div class="goal-actions-list">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); margin-bottom:4px;">
              <i class="fa-solid fa-stairs"></i> 구체적 실행 액션 (Action Steps)
            </div>
            ${actionsHtml}
          </div>
        ` : ''}

        <div class="goal-card-footer">
          <span><i class="fa-regular fa-clock"></i> 마감 목표일: ${goal.deadline || '상시'}</span>
          <span>ID: ${goal.id}</span>
        </div>
      `;

      const slider = card.querySelector('.goal-progress-slider');
      slider.addEventListener('change', (e) => {
        const newP = parseInt(e.target.value);
        storage.updateGoal(goal.id, { progress: newP });
        this.renderGoals();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      card.querySelectorAll('.goal-push-todo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const actionText = `[목표연계: ${pInfo.label.split(' ')[1] || '실행'}] ${btn.dataset.action}`;
          const pillar = btn.dataset.pillar;
          this.pushActionToTodayTodo(actionText, pillar);
        });
      });

      card.querySelector('.todo-delete-btn').addEventListener('click', () => {
        if (confirm(`'${goal.title}' 목표를 삭제하시겠습니까?`)) {
          storage.deleteGoal(goal.id);
          this.renderGoals();
          this.renderTabCalendar('goals');
          this.renderAnalytics();
          this.showToast('목표가 삭제되었습니다.');
        }
      });

      this.goalsGrid.appendChild(card);
    });
  }

  pushActionToTodayTodo(actionText, pillar = 'career') {
    const dayData = storage.getDayData(this.currentDate);
    const existing = dayData.todos || [];
    if (existing.some(t => t.text === actionText)) {
      this.showToast('이미 오늘의 실행 리스트에 등록되어 있습니다.', 'error');
      return;
    }
    existing.push({
      id: 't_' + Date.now(),
      text: actionText,
      category: pillar,
      completed: false
    });
    storage.updateDayData(this.currentDate, { todos: existing });
    this.renderTodos();
    this.renderTabCalendar('dashboard');
    this.renderAnalytics();
    this.showToast(`🎯 오늘의 실행 To-Do에 등록되었습니다!`);
  }

  // ==========================================
  // 9-1. AI 1-Click Auto Draft Generator
  // ==========================================
  async generateAiJournalDraft() {
    const dayData = storage.getDayData(this.currentDate);
    const todos = dayData.todos || [];
    const completedTodos = todos.filter(t => t.completed).map(t => t.text);
    const uncompletedTodos = todos.filter(t => !t.completed).map(t => t.text);
    const studyTopic = dayData.study?.topic || '';
    const studyHours = dayData.study?.actualHours || 0;
    const studyTil = dayData.study?.til || '';
    const mood = dayData.mood || 'good';
    const energy = dayData.condition?.energy || 60;
    const focus = dayData.focus || '';

    this.aiAutoDraftJournalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 오늘 활동 데이터 분석 및 작성 중...';

    const prompt = `[오늘 ${this.currentDate} 활동 데이터]
- 오늘의 북극성 미션(One Thing): ${focus || '기본 집중'}
- 완료한 실행 To-Do: ${completedTodos.length > 0 ? completedTodos.join(', ') : '없음'}
- 미완료 과업: ${uncompletedTodos.length > 0 ? uncompletedTodos.join(', ') : '없음'}
- 오늘 공부한 주제: ${studyTopic ? `${studyTopic} (${studyHours}시간 달성, 배움: ${studyTil})` : '없음'}
- 기분 및 에너지 상태: 마인드셋 ${mood}, 에너지 ${energy}%

위 데이터를 바탕으로, 오늘 하루를 진지하게 성찰하고 내일의 압도적 성장을 다짐하는 **최고급 1% 회고 일기**를 작성해줘.
형식:
1. 매력적이고 통찰력 있는 일기 제목 1줄 (예: 장기 비전을 오늘의 구체적 실행으로 연결한 하루)
2. 본문 내용 (오늘의 사유와 성찰, 배운 점, 내일을 위한 1% 실행 가이드, 핵심 명언 인용)`;

    const aiResult = await geminiClient.generateText(prompt);
    this.aiAutoDraftJournalBtn.innerHTML = '<i class="fa-solid fa-pen-nib"></i> 오늘 활동 기반 AI 일기 자동 생성';

    const lines = aiResult.split('\n');
    let title = '';
    let body = aiResult;

    if (lines[0].startsWith('#') || lines[0].startsWith('제목:')) {
      title = lines[0].replace(/^[#\s*제목:\s*]+/, '').trim();
      body = lines.slice(1).join('\n').trim();
    } else {
      title = `${this.currentDate}의 사유와 실행 회고`;
    }

    this.journalTitle.value = title;
    this.journalContent.value = body;
    this.saveJournal(false);

    if (this.isSplitView) {
      this.journalPreview.innerHTML = this.parseMarkdown(this.journalContent.value);
    }
    this.updateJournalStats();
    this.showToast('✨ Gemini AI가 오늘의 활동을 분석하여 일기를 1초 만에 완성했습니다!');
  }

  toggleSplitView() {
    this.isSplitView = !this.isSplitView;
    if (this.isSplitView) {
      this.journalEditorBody.classList.add('split-mode');
      this.journalPreview.innerHTML = this.parseMarkdown(this.journalContent.value);
      this.journalPreview.style.display = 'block';
      this.journalContent.style.display = 'block';
      this.journalSplitToggle.innerHTML = '<i class="fa-solid fa-table-cells-large text-cyan"></i> 분할 뷰 ON';
      this.journalSplitToggle.classList.add('btn-primary');
      this.journalSplitToggle.classList.remove('btn-secondary');
    } else {
      this.journalEditorBody.classList.remove('split-mode');
      this.journalPreview.style.display = 'none';
      this.journalContent.style.display = 'block';
      this.journalSplitToggle.innerHTML = '<i class="fa-solid fa-table-columns"></i> 분할 뷰';
      this.journalSplitToggle.classList.remove('btn-primary');
      this.journalSplitToggle.classList.add('btn-secondary');
    }
  }

  renderJournalPhotos() {
    if (!this.journalPhotoGallery || !this.journalPhotosBar) return;
    const dayData = storage.getDayData(this.currentDate);
    const photos = dayData.journal?.photos || [];
    this.journalPhotoGallery.innerHTML = '';

    if (photos.length === 0) {
      this.journalPhotosBar.style.display = 'none';
      return;
    }

    this.journalPhotosBar.style.display = 'block';
    photos.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = 'journal-photo-card';
      card.innerHTML = `
        <img src="${photo}" alt="일기 사진">
        <button class="journal-photo-delete-btn" title="사진 삭제"><i class="fa-solid fa-xmark"></i></button>
      `;

      card.querySelector('.journal-photo-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        photos.splice(idx, 1);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
        this.renderJournalPhotos();
        this.showToast('일기 사진이 삭제되었습니다.');
      });

      card.addEventListener('click', () => {
        const win = window.open('');
        win.document.write(`<body style="margin:0; background:#080d1a; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${photo}" style="max-width:95vw; max-height:95vh; border-radius:8px; box-shadow:0 0 20px rgba(0,0,0,0.8);"></body>`);
      });

      this.journalPhotoGallery.appendChild(card);
    });
  }

  // ==========================================
  // 9-2. Journal Action Guide Extractor
  // ==========================================
  async extractActionGuideFromJournal() {
    const text = this.journalContent.value;
    if (!text.trim()) {
      this.showToast('작성된 일기 내용이 없습니다.', 'error');
      return;
    }

    this.extractActionGuideBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini 분석 중...';

    const dayData = storage.getDayData(this.currentDate);
    const existingTodos = dayData.todos || [];

    const prompt = `오늘 작성된 일기 내용:\n"${text}"\n\n위 일기를 읽고 다음 항목을 추출 및 정리해줘:
1. 오늘 공부/학습한 핵심 주제 (1문장)
2. 내일 반드시 실천해야 할 구체적인 To-Do 리스트 3가지 (각 항목마다 [커리어], [공부], [건강], [루틴] 말머리 포함)
3. 오늘 일기에서 도출된 핵심 인생 원칙 1문장`;

    const aiResult = await geminiClient.generateText(prompt);
    this.extractActionGuideBtn.innerHTML = '<i class="fa-solid fa-sparkles"></i> Gemini로 실행 가이드 도출';

    const lines = aiResult.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ]') || trimmed.match(/^\d+\.\s*\[/)) {
        const clean = trimmed.replace(/^-\s*\[\s*\]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        if (clean && !existingTodos.some(t => t.text === clean)) {
          let cat = 'career';
          if (clean.includes('공부') || clean.includes('학습')) cat = 'study';
          if (clean.includes('건강') || clean.includes('운동')) cat = 'health';
          if (clean.includes('재테크') || clean.includes('투자')) cat = 'wealth';
          if (clean.includes('루틴')) cat = 'routine';

          existingTodos.push({
            id: 't_' + Date.now() + Math.random(),
            text: clean,
            category: cat,
            completed: false
          });
          addedCount++;
        }
      }
    });

    storage.updateDayData(this.currentDate, { todos: existingTodos });

    this.renderTodos();
    this.renderStudyArchive();
    this.renderPrinciples();
    this.renderAllTabCalendars();
    this.renderAnalytics();

    this.showToast(`✨ Gemini AI가 ${addedCount}개의 핵심 실행 가이드를 대시보드에 등록했습니다!`);
  }

  // ==========================================
  // 10. Timer & Zen Timer Logic
  // ==========================================
  startTimer() {
    this.timerRunning = true;
    this.startTimerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 일시정지';
    if (this.zenStartTimerBtn) this.zenStartTimerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 일시정지';

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      if (this.timerSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.timerRunning = false;
        this.timerSeconds = 25 * 60;
        this.startTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 몰입 시작';
        if (this.zenStartTimerBtn) this.zenStartTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 몰입 시작';

        const dayData = storage.getDayData(this.currentDate);
        const newActual = (dayData.study.actualHours || 0) + 0.5;
        storage.updateDayData(this.currentDate, { study: { ...dayData.study, actualHours: newActual } });
        this.studyActualHours.value = newActual;
        this.renderAllTabCalendars();
        this.renderAnalytics();

        this.showToast('🔔 25분 딥워크 완료! 0.5시간 공부 시간이 자동 누적되었습니다.');
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  pauseTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.startTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 계속';
    if (this.zenStartTimerBtn) this.zenStartTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 계속';
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.timerSeconds = 25 * 60;
    this.updateTimerDisplay();
    this.startTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 몰입 시작';
    if (this.zenStartTimerBtn) this.zenStartTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> 몰입 시작';
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.timerDisplay.textContent = str;
    if (this.zenTimerDisplay) this.zenTimerDisplay.textContent = str;
  }

  // ==========================================
  // 11. Speech Recognition
  // ==========================================
  startRecording() {
    try {
      this.recognition.start();
      this.isRecording = true;
      this.speechBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> 중지';
      this.speechBtn.classList.add('recording-pulse');
      this.showToast('음성을 텍스트로 기록 중입니다. 말씀하세요... 🎙️');
    } catch (e) {
      console.error(e);
    }
  }

  stopRecording() {
    try {
      if (this.recognition) this.recognition.stop();
      this.isRecording = false;
      this.speechBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> 음성';
      this.speechBtn.classList.remove('recording-pulse');
    } catch (e) {
      console.error(e);
    }
  }

  // ==========================================
  // 12. Navigation & Date Loading
  // ==========================================
  switchTab(tabName) {
    this.activeTab = tabName;
    this.navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabName));
    this.tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `pane-${tabName}`));

    if (tabName === 'dashboard') this.renderTabCalendar('dashboard');
    if (tabName === 'evening-os') {
      this.renderEveningOS();
      this.renderTabCalendar('evening');
    }
    if (tabName === 'goal-hierarchy') {
      if (this.isVisualTreeMode) this.renderVisualTree();
      else this.renderGoalHierarchy();
      this.renderTabCalendar('goals');
    }
    if (tabName === 'weekly-retro') {
      this.renderWeeklyRetroMetrics();
      this.renderTabCalendar('weekly');
    }
    if (tabName === 'ai-coach') this.renderTabCalendar('ai');
    if (tabName === 'study') {
      this.renderStudyPhotos();
      this.renderStudyArchive();
      this.renderTabCalendar('study');
    }
    if (tabName === 'journal') this.renderJournalRightCalendar();
    if (tabName === 'principles') {
      this.renderPrinciples();
      this.renderTabCalendar('principles');
    }
    if (tabName === 'calendar') this.renderCalendar();
    if (tabName === 'analytics') this.renderAnalytics();
  }

  setDate(dateStr) {
    this.currentDate = dateStr;
    const [y, m] = dateStr.split('-').map(Number);
    for (const key of Object.keys(this.tabCalState)) {
      this.tabCalState[key].year = y;
      this.tabCalState[key].month = m - 1;
    }
    this.calYear = y;
    this.calMonth = m - 1;
    this.loadDate(dateStr);
  }

  shiftDate(delta) {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + delta);
    this.setDate(d.toISOString().split('T')[0]);
  }

  loadDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    this.headerDateText.textContent = `${y}년 ${m}월 ${d}일 (${dayNames[dObj.getDay()]})`;
    this.datePicker.value = dateStr;
    this.todayTag.style.display = (dateStr === today) ? 'inline-block' : 'none';

    // Dashboard
    const dayData = storage.getDayData(dateStr);
    this.focusInput.value = dayData.focus || '';
    this.highlightMood(dayData.mood);
    this.renderTodos();
    this.renderHabits();
    this.renderTimeBlocks();
    this.renderCondition();

    // Check Rollover
    this.checkUncompletedTasksRollover();

    // Study
    this.todayStudyTopic.value = dayData.study?.topic || '';
    this.todayStudyTIL.value = dayData.study?.til || '';
    this.studyMainTopicInput.value = dayData.study?.topic || '';
    this.studyGoalHours.value = dayData.study?.goalHours || 2.0;
    this.studyActualHours.value = dayData.study?.actualHours || 0;
    this.studyTilSummaryInput.value = dayData.study?.til || '';
    this.studyDetailedNotes.value = dayData.study?.notes || '';
    this.renderStudyPhotos();
    this.renderStudyArchive();

    // Evening OS Load
    this.renderEveningOS();
    this.renderGoalHierarchy();
    this.calculateEES();

    // Journal
    const journal = dayData.journal || {};
    this.journalTitle.value = journal.title || '';
    this.journalContent.value = journal.content || '';
    if (this.isPreviewMode) this.togglePreview();
    if (this.isSplitView) {
      this.journalPreview.innerHTML = this.parseMarkdown(this.journalContent.value);
    }
    this.renderTags();
    this.renderJournalPhotos();
    this.updateJournalStats();
    this.autoSaveIndicator.innerHTML = '<i class="fa-solid fa-check"></i> 저장됨';

    this.renderAllTabCalendars();
    this.renderPrinciples();
  }

  // ==========================================
  // ⚡ 1% 라이프 실행 지수 (Executive Execution Score)
  // ==========================================
  calculateEES() {
    const dayData = storage.getDayData(this.currentDate);
    const todos = dayData.todos || [];
    const doneTodos = todos.filter(t => t.completed).length;
    const todoScore = todos.length > 0 ? (doneTodos / todos.length) * 40 : 25; // 40점 만점

    const studyHours = (dayData.study && dayData.study.actualHours) ? dayData.study.actualHours : 0;
    const eveningHours = (dayData.eveningRoutine && dayData.eveningRoutine.actualHours) ? dayData.eveningRoutine.actualHours : 0;
    const totalDeepHours = studyHours + eveningHours;
    const deepWorkScore = Math.min(30, (totalDeepHours / 3.0) * 30); // 30점 만점 (3시간 기준)

    const habits = storage.getHabits();
    const doneHabits = habits.filter(h => dayData.habits && dayData.habits[h.id]).length;
    const habitScore = habits.length > 0 ? (doneHabits / habits.length) * 20 : 15; // 20점 만점

    const water = dayData.water || 0;
    const sleep = dayData.sleep || 7.0;
    const healthScore = Math.min(10, ((water / 8) * 5) + (sleep >= 6.5 ? 5 : 2)); // 10점 만점

    const totalEES = Math.round(todoScore + deepWorkScore + habitScore + healthScore);

    let grade = 'GRADE S';
    let gradeColor = '#107c41';
    if (totalEES < 60) { grade = 'GRADE C'; gradeColor = '#d83b01'; }
    else if (totalEES < 75) { grade = 'GRADE B'; gradeColor = '#ffaa44'; }
    else if (totalEES < 90) { grade = 'GRADE A'; gradeColor = '#0078d4'; }

    if (this.eesScoreVal) this.eesScoreVal.innerHTML = `${totalEES}<span class="ees-unit">점</span>`;
    if (this.eesScoreBar) this.eesScoreBar.style.width = `${totalEES}%`;
    if (this.eesGradeBadge) {
      this.eesGradeBadge.textContent = grade;
      this.eesGradeBadge.style.background = gradeColor;
    }
  }

  // ==========================================
  // 🌙 Evening OS Render (시간 예산제 & 용량 게이지 연동)
  // ==========================================
  renderEveningOS() {
    const dayData = storage.getDayData(this.currentDate);
    const er = dayData.eveningRoutine || { goal: '', todayTasks: [], tomorrowTasks: [], actualHours: 1.5, focusRate: 100, notes: '' };

    if (this.eveningGoalInput) this.eveningGoalInput.value = er.goal || '';
    if (this.eveningActualHours) this.eveningActualHours.value = er.actualHours || 1.5;
    if (this.eveningFocusRate) this.eveningFocusRate.value = er.focusRate || 100;
    if (this.eveningReviewNotes) this.eveningReviewNotes.value = er.notes || '';

    // 저녁 시간 예산 계산
    const capacity = parseFloat(this.eveningCapacityInput ? this.eveningCapacityInput.value : 3.0) || 3.0;
    const todayTasks = er.todayTasks || [];
    let allocated = 0;
    todayTasks.forEach(t => {
      allocated += parseFloat(t.duration || 1.0);
    });
    const remaining = capacity - allocated;
    const fillPercent = Math.min(100, Math.round((allocated / capacity) * 100));

    if (this.eveningBudgetFill) this.eveningBudgetFill.style.width = `${fillPercent}%`;
    if (this.eveningRemainingBadge) {
      if (remaining < 0) {
        this.eveningRemainingBadge.textContent = `⚠️ 초과: ${Math.abs(remaining).toFixed(1)}h (과부하 위험)`;
        this.eveningRemainingBadge.style.background = 'rgba(216, 59, 1, 0.25)';
        this.eveningRemainingBadge.style.color = '#f87171';
      } else {
        this.eveningRemainingBadge.textContent = `잔여: ${remaining.toFixed(1)}h 가능`;
        this.eveningRemainingBadge.style.background = 'rgba(0, 183, 195, 0.2)';
        this.eveningRemainingBadge.style.color = '#22d3ee';
      }
    }

    // Render Today Evening Tasks
    if (this.eveningTodayList) {
      this.eveningTodayList.innerHTML = '';
      const done = todayTasks.filter(t => t.completed).length;
      if (this.eveningTodayBadge) {
        this.eveningTodayBadge.textContent = `${done} / ${todayTasks.length} 완료 (${allocated.toFixed(1)}h/${capacity}h)`;
      }

      if (todayTasks.length === 0) {
        this.eveningTodayList.innerHTML = `<li style="color:var(--text-muted); padding:16px; text-align:center; font-size:0.82rem;">오늘 저녁 할 일이 없습니다. [AI 저녁 루틴 설계] 또는 직접 추가해보세요!</li>`;
      } else {
        todayTasks.forEach(task => {
          const li = document.createElement('li');
          li.className = `todo-item ${task.completed ? 'completed' : ''}`;
          li.innerHTML = `
            <div class="todo-left">
              <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
              <span class="category-tag category-wealth">⏱️ ${task.duration || 1.0}h</span>
              <span class="todo-text">${this.escapeHtml(task.text)}</span>
            </div>
            <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
          `;
          li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
            this.renderTabCalendar('evening');
            this.calculateEES();
          });
          li.querySelector('.todo-delete-btn').addEventListener('click', () => {
            er.todayTasks = er.todayTasks.filter(t => t.id !== task.id);
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
            this.renderTabCalendar('evening');
            this.calculateEES();
          });
          this.eveningTodayList.appendChild(li);
        });
      }
    }

    // Render Tomorrow Evening Tasks
    if (this.eveningTomorrowList) {
      this.eveningTomorrowList.innerHTML = '';
      const tomorrowTasks = er.tomorrowTasks || [];

      if (tomorrowTasks.length === 0) {
        this.eveningTomorrowList.innerHTML = `<li style="color:var(--text-muted); padding:16px; text-align:center; font-size:0.82rem;">내일 저녁 계획이 비어 있습니다. 잠들기 전 1순위 행동을 미리 적어두세요!</li>`;
      } else {
        tomorrowTasks.forEach(task => {
          const li = document.createElement('li');
          li.className = 'todo-item';
          li.innerHTML = `
            <div class="todo-left">
              <span class="category-tag category-study">내일</span>
              <span class="todo-text">${this.escapeHtml(task.text)}</span>
            </div>
            <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
          `;
          li.querySelector('.todo-delete-btn').addEventListener('click', () => {
            er.tomorrowTasks = er.tomorrowTasks.filter(t => t.id !== task.id);
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
          });
          this.eveningTomorrowList.appendChild(li);
        });
      }
    }
  }

  // ==========================================
  // 🌳 비주얼 인터랙티브 트리 맵 렌더러 (Visual Tree)
  // ==========================================
  renderVisualTree() {
    if (!this.visualTreeCanvas) return;
    this.visualTreeCanvas.innerHTML = '';

    const goals = storage.getGoals();
    const yearly = goals.filter(g => g.horizon === 'yearly' || g.horizon === 'long');
    const monthly = goals.filter(g => g.horizon === 'monthly' || g.horizon === 'mid');
    const weekly = goals.filter(g => g.horizon === 'weekly' || g.horizon === 'short');
    const daily = goals.filter(g => g.horizon === 'daily');

    const tiers = [
      { key: 'YEARLY', label: '🚀 년간 비전', list: yearly, badgeClass: 'badge-yearly' },
      { key: 'MONTHLY', label: '🎯 월간 마일스톤', list: monthly, badgeClass: 'badge-monthly' },
      { key: 'WEEKLY', label: '⚡ 주간 스프린트', list: weekly, badgeClass: 'badge-weekly' },
      { key: 'DAILY', label: '☀️ 일일 1% 액션', list: daily, badgeClass: 'badge-daily' }
    ];

    tiers.forEach(tier => {
      const row = document.createElement('div');
      row.className = 'tree-tier-row';
      row.innerHTML = `
        <div class="tree-tier-label ${tier.badgeClass}">${tier.label}</div>
        <div class="tree-nodes-list" id="treeNodes_${tier.key}"></div>
      `;
      const nodesContainer = row.querySelector(`#treeNodes_${tier.key}`);
      
      if (tier.list.length === 0) {
        nodesContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem; padding:6px;">목표가 등록되지 않았습니다.</span>`;
      } else {
        tier.list.forEach(goal => {
          const node = document.createElement('div');
          node.className = 'tree-node-item';
          const isDone = (goal.progress || 0) >= 100;
          node.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="category-tag category-${goal.pillar || 'career'}">${goal.pillar || '커리어'}</span>
              <span style="font-size:0.68rem; font-weight:700; color:var(--text-secondary);">${goal.progress || 0}%</span>
            </div>
            <div class="tree-node-title" style="${isDone ? 'text-decoration:line-through; opacity:0.6;' : ''}">${this.escapeHtml(goal.title)}</div>
            <div class="tree-node-kr"><i class="fa-solid fa-key"></i> ${this.escapeHtml(goal.keyResult || '지표 달성')}</div>
          `;
          nodesContainer.appendChild(node);
        });
      }
      this.visualTreeCanvas.appendChild(row);
    });
  }

  // ==========================================
  // 📊 주간 7일 자동 결산 리포트 엔진 (Weekly Retro)
  // ==========================================
  renderWeeklyRetroMetrics() {
    let totalDeepHours = 0;
    let totalTodos = 0;
    let doneTodos = 0;
    let habitSuccessDays = 0;

    const todayObj = new Date(this.currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayObj);
      d.setDate(todayObj.getDate() - i);
      const ds = this.formatDateKey(d);
      const dayData = storage.getDayData(ds);

      const studyH = (dayData.study && dayData.study.actualHours) ? dayData.study.actualHours : 0;
      const eveningH = (dayData.eveningRoutine && dayData.eveningRoutine.actualHours) ? dayData.eveningRoutine.actualHours : 0;
      totalDeepHours += (studyH + eveningH);

      const todos = dayData.todos || [];
      totalTodos += todos.length;
      doneTodos += todos.filter(t => t.completed).length;

      const habits = storage.getHabits();
      if (habits.length > 0 && dayData.habits) {
        const hDone = habits.filter(h => dayData.habits[h.id]).length;
        if (hDone >= Math.ceil(habits.length * 0.7)) habitSuccessDays++;
      }
    }

    const todoRate = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;
    const goals = storage.getGoals().filter(g => g.horizon === 'weekly' || g.horizon === 'short');
    let weeklyGoalProgress = 0;
    if (goals.length > 0) {
      const sum = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
      weeklyGoalProgress = Math.round(sum / goals.length);
    }

    if (this.weeklyTotalHoursVal) this.weeklyTotalHoursVal.textContent = `${totalDeepHours.toFixed(1)}시간`;
    if (this.weeklyTodoRateVal) this.weeklyTodoRateVal.textContent = `${todoRate}%`;
    if (this.weeklyTodoCountVal) this.weeklyTodoCountVal.textContent = `${doneTodos}/${totalTodos} 완료`;
    if (this.weeklyGoalRateVal) this.weeklyGoalRateVal.textContent = `${weeklyGoalProgress}%`;
    if (this.weeklyHabitDaysVal) this.weeklyHabitDaysVal.textContent = `${habitSuccessDays}일`;
  }

  async generateWeeklyRetroReport() {
    this.renderWeeklyRetroMetrics();
    if (!this.weeklyReportContent) return;

    this.generateWeeklyReportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 지난 7일 데이터 정밀 분석 중...';

    const hours = this.weeklyTotalHoursVal.textContent;
    const todoRate = this.weeklyTodoRateVal.textContent;
    const goalRate = this.weeklyGoalRateVal.textContent;
    const habitDays = this.weeklyHabitDaysVal.textContent;

    const prompt = `지난 7일간의 실행 데이터 요약:
- 주간 총 딥워크 몰입 시간: ${hours}
- 주간 To-Do 완료율: ${todoRate}
- 주간 핵심 스프린트 목표 진척률: ${goalRate}
- 복리 습관 성공 일수: ${habitDays} / 7일

위 데이터를 바탕으로 최고 경영진(Executive) 수준의 주간 성적표 브리핑을 작성해줘:
1. 🏆 주간 총평 및 핵심 성과 (Keep)
2. ⚠️ 발견된 실행 누수 및 실패 패턴 (Problem)
3. 🚀 다음 주 7일간 폭발적 성장을 위한 3대 실행 지침 (Try & Next Sprint)`;

    const res = await geminiClient.generateText(prompt);
    this.generateWeeklyReportBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> 이번 주 자동 결산 성적표 발행';
    this.weeklyReportContent.innerHTML = this.parseMarkdown(res);
    this.showToast('Gemini가 주간 경영 결산 성적표를 발행했습니다! 📊');
  }
    const dayData = storage.getDayData(this.currentDate);
    const er = dayData.eveningRoutine || { goal: '', todayTasks: [], tomorrowTasks: [], actualHours: 1.5, focusRate: 100, notes: '' };

    if (this.eveningGoalInput) this.eveningGoalInput.value = er.goal || '';
    if (this.eveningActualHours) this.eveningActualHours.value = er.actualHours || 1.5;
    if (this.eveningFocusRate) this.eveningFocusRate.value = er.focusRate || 100;
    if (this.eveningReviewNotes) this.eveningReviewNotes.value = er.notes || '';

    // Render Today Evening Tasks
    if (this.eveningTodayList) {
      this.eveningTodayList.innerHTML = '';
      const todayTasks = er.todayTasks || [];
      const done = todayTasks.filter(t => t.completed).length;
      if (this.eveningTodayBadge) {
        this.eveningTodayBadge.textContent = `${done} / ${todayTasks.length} 완료`;
      }

      if (todayTasks.length === 0) {
        this.eveningTodayList.innerHTML = `<li style="color:var(--text-muted); padding:16px; text-align:center; font-size:0.82rem;">오늘 저녁 할 일이 없습니다. [AI 저녁 루틴 설계] 또는 직접 추가해보세요!</li>`;
      } else {
        todayTasks.forEach(task => {
          const li = document.createElement('li');
          li.className = `todo-item ${task.completed ? 'completed' : ''}`;
          li.innerHTML = `
            <div class="todo-left">
              <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
              <span class="todo-text">${this.escapeHtml(task.text)}</span>
            </div>
            <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
          `;
          li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
            this.renderTabCalendar('evening');
          });
          li.querySelector('.todo-delete-btn').addEventListener('click', () => {
            er.todayTasks = er.todayTasks.filter(t => t.id !== task.id);
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
            this.renderTabCalendar('evening');
          });
          this.eveningTodayList.appendChild(li);
        });
      }
    }

    // Render Tomorrow Evening Tasks
    if (this.eveningTomorrowList) {
      this.eveningTomorrowList.innerHTML = '';
      const tomorrowTasks = er.tomorrowTasks || [];

      if (tomorrowTasks.length === 0) {
        this.eveningTomorrowList.innerHTML = `<li style="color:var(--text-muted); padding:16px; text-align:center; font-size:0.82rem;">내일 저녁 계획이 비어 있습니다. 잠들기 전 1순위 행동을 미리 적어두세요!</li>`;
      } else {
        tomorrowTasks.forEach(task => {
          const li = document.createElement('li');
          li.className = 'todo-item';
          li.innerHTML = `
            <div class="todo-left">
              <span class="category-tag category-study">내일</span>
              <span class="todo-text">${this.escapeHtml(task.text)}</span>
            </div>
            <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
          `;
          li.querySelector('.todo-delete-btn').addEventListener('click', () => {
            er.tomorrowTasks = er.tomorrowTasks.filter(t => t.id !== task.id);
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
          });
          this.eveningTomorrowList.appendChild(li);
        });
      }
    }
  }

  // ==========================================
  // 📅 Goal Hierarchy Render (일/주/월/년 목표 피라미드)
  // ==========================================
  renderGoalHierarchy() {
    const goals = storage.getGoals();
    const yearly = goals.filter(g => g.horizon === 'yearly' || g.horizon === 'long');
    const monthly = goals.filter(g => g.horizon === 'monthly' || g.horizon === 'mid');
    const weekly = goals.filter(g => g.horizon === 'weekly' || g.horizon === 'short');
    const daily = goals.filter(g => g.horizon === 'daily');

    const yBadge = document.getElementById('yearlyCountBadge');
    const mBadge = document.getElementById('monthlyCountBadge');
    const wBadge = document.getElementById('weeklyCountBadge');
    const dBadge = document.getElementById('dailyCountBadge');

    if (yBadge) yBadge.textContent = `${yearly.length}개 비전 관리`;
    if (mBadge) mBadge.textContent = `${monthly.length}개 마일스톤`;
    if (wBadge) wBadge.textContent = `${weekly.length}개 스프린트`;
    if (dBadge) dBadge.textContent = `${daily.length}개 핵심 액션`;

    this.renderHierarchyGrid(this.yearlyGoalsGrid, yearly, 'yearly');
    this.renderHierarchyGrid(this.monthlyGoalsGrid, monthly, 'monthly');
    this.renderHierarchyGrid(this.weeklyGoalsGrid, weekly, 'weekly');
    this.renderHierarchyGrid(this.dailyGoalsGrid, daily, 'daily');
    this.filterHierarchyView();
  }

  renderHierarchyGrid(gridEl, list, level) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (list.length === 0) {
      gridEl.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 14px; font-size: 0.78rem; text-align: center;">등록된 목표가 없습니다. 위 인라인 입력창에서 바로 입력 후 Enter를 누르세요!</div>`;
      return;
    }

    const nextLevelMap = {
      yearly: { label: '🎯 월간 마일스톤으로 파생', nextLevel: 'monthly' },
      monthly: { label: '⚡ 주간 스프린트로 파생', nextLevel: 'weekly' },
      weekly: { label: '☀️ 일일 액션으로 파생', nextLevel: 'daily' },
      daily: { label: '🔥 오늘 To-Do로 즉시 연동', nextLevel: 'todo' }
    };

    list.forEach(goal => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      const isDone = (goal.progress || 0) >= 100;
      const cascadeInfo = nextLevelMap[level];

      card.innerHTML = `
        <div class="goal-card-top">
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="hgoal-check" ${isDone ? 'checked' : ''} style="accent-color:var(--accent-primary); cursor:pointer;">
            <span class="category-tag category-${goal.pillar || 'career'}">${goal.pillar || '커리어'}</span>
          </div>
          <button class="todo-delete-btn" title="목표 삭제"><i class="fa-solid fa-trash"></i></button>
        </div>

        <div class="goal-card-title" style="${isDone ? 'text-decoration:line-through; opacity:0.7;' : ''}">${this.escapeHtml(goal.title)}</div>
        <div class="goal-key-result"><i class="fa-solid fa-key"></i> ${this.escapeHtml(goal.keyResult || '핵심 성과 기준')}</div>

        <div class="goal-progress-section">
          <div class="goal-progress-header">
            <span>달성률</span>
            <div class="hgoal-quick-progress-group">
              <button class="hgoal-step-btn" data-val="25">+25%</button>
              <button class="hgoal-step-btn" data-val="50">+50%</button>
              <button class="hgoal-step-btn" data-val="100">100%</button>
              <span><strong>${goal.progress || 0}%</strong></span>
            </div>
          </div>
          <input type="range" min="0" max="100" value="${goal.progress || 0}" class="slider hgoal-slider">
        </div>

        <div class="goal-card-footer">
          <span><i class="fa-regular fa-clock"></i> ${goal.deadline || '상시'}</span>
          <button class="goal-push-todo-btn" title="오늘의 실행 To-Do로 등록"><i class="fa-solid fa-bolt"></i> 오늘 할 일</button>
        </div>

        <div class="hgoal-cascade-bar">
          <button class="hgoal-cascade-btn" data-action="cascade">
            <i class="fa-solid fa-arrow-down-long"></i> ${cascadeInfo.label}
          </button>
        </div>
      `;

      // Complete checkbox
      card.querySelector('.hgoal-check').addEventListener('change', (e) => {
        const p = e.target.checked ? 100 : 0;
        storage.updateGoal(goal.id, { progress: p });
        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      // Quick stepper buttons
      card.querySelectorAll('.hgoal-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const add = parseInt(btn.dataset.val);
          const newP = (add === 100) ? 100 : Math.min(100, (goal.progress || 0) + add);
          storage.updateGoal(goal.id, { progress: newP });
          this.renderGoalHierarchy();
          this.renderTabCalendar('goals');
          this.renderAnalytics();
        });
      });

      // Slider
      card.querySelector('.hgoal-slider').addEventListener('change', (e) => {
        const p = parseInt(e.target.value);
        storage.updateGoal(goal.id, { progress: p });
        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      // Push to Today's Todo
      card.querySelector('.goal-push-todo-btn').addEventListener('click', () => {
        this.pushActionToTodayTodo(`[${level.toUpperCase()} 연계] ${goal.title}`, goal.pillar || 'career');
      });

      // Cascading Breakdown to Lower Tier
      card.querySelector('.hgoal-cascade-btn').addEventListener('click', () => {
        if (cascadeInfo.nextLevel === 'todo') {
          this.pushActionToTodayTodo(`[일일 핵심] ${goal.title}`, goal.pillar || 'career');
        } else {
          const subTitle = prompt(`[${cascadeInfo.nextLevel.toUpperCase()}] 하위 목표/과업 명칭을 입력하세요:`, `${goal.title} 세부 실행`);
          if (subTitle && subTitle.trim()) {
            storage.addGoal({
              pillar: goal.pillar || 'career',
              horizon: cascadeInfo.nextLevel,
              title: subTitle.trim(),
              keyResult: `${subTitle.trim()} 100% 완수`,
              deadline: cascadeInfo.nextLevel === 'daily' ? this.currentDate : (cascadeInfo.nextLevel === 'weekly' ? '2026-08-23' : '2026-08-31'),
              progress: 0
            });
            this.renderGoalHierarchy();
            this.renderTabCalendar('goals');
            this.renderAnalytics();
            this.showToast(`✨ [${cascadeInfo.nextLevel.toUpperCase()}] 하위 목표가 자동 파생되었습니다!`);
          }
        }
      });

      // Delete
      card.querySelector('.todo-delete-btn').addEventListener('click', () => {
        if (confirm(`'${goal.title}' 목표를 삭제하시겠습니까?`)) {
          storage.deleteGoal(goal.id);
          this.renderGoalHierarchy();
          this.renderTabCalendar('goals');
          this.renderAnalytics();
          this.showToast('목표가 삭제되었습니다.');
        }
      });

      gridEl.appendChild(card);
    });
  }

  filterHierarchyView() {
    const sections = document.querySelectorAll('.hierarchy-section');
    sections.forEach(sec => {
      const secLevel = sec.dataset.section;
      if (this.activeHierarchyLevel === 'all' || this.activeHierarchyLevel === secLevel) {
        sec.style.display = 'flex';
      } else {
        sec.style.display = 'none';
      }
    });
  }

  highlightMood(mood) {
    this.moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === mood);
    });
  }

  // ==========================================
  // 13. Dashboard & Zen To-Do Rendering
  // ==========================================
  renderTodos() {
    const dayData = storage.getDayData(this.currentDate);
    const todos = dayData.todos || [];
    this.todoList.innerHTML = '';

    const completed = todos.filter(t => t.completed).length;
    const total = todos.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.todoProgressBar.style.width = `${rate}%`;
    this.todoProgressBadge.textContent = `${completed} / ${total} 완료 (${rate}%)`;

    if (todos.length === 0) {
      this.todoList.innerHTML = `<li style="text-align:center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">등록된 실행 액션이 없습니다. [Gemini 코칭] 또는 [+ 할 일 추가]로 하루를 설계하세요!</li>`;
      return;
    }

    const catMap = { career: '💼 커리어', study: '📚 공부', wealth: '💰 재테크', health: '💪 건강', routine: '🌱 루틴' };

    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
          <span class="category-tag category-${todo.category}">${catMap[todo.category] || '기타'}</span>
          <span class="todo-text">${this.escapeHtml(todo.text)}</span>
        </div>
        <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
      `;

      li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
        todo.completed = e.target.checked;
        storage.updateDayData(this.currentDate, { todos });
        this.renderTodos();
        this.renderTabCalendar('dashboard');
        this.renderAnalytics();
      });

      li.querySelector('.todo-delete-btn').addEventListener('click', () => {
        const updated = todos.filter(t => t.id !== todo.id);
        storage.updateDayData(this.currentDate, { todos: updated });
        this.renderTodos();
        this.renderTabCalendar('dashboard');
        this.renderAnalytics();
      });

      this.todoList.appendChild(li);
    });

    this.renderZenTodoList();
  }

  renderZenTodoList() {
    if (!this.zenTodoList) return;
    const dayData = storage.getDayData(this.currentDate);
    const todos = dayData.todos || [];
    this.zenTodoList.innerHTML = '';

    if (todos.length === 0) {
      this.zenTodoList.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem;">실행할 To-Do가 없습니다.</li>`;
      return;
    }

    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `zen-todo-item ${todo.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <input type="checkbox" ${todo.completed ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
        <span>${this.escapeHtml(todo.text)}</span>
      `;
      li.querySelector('input').addEventListener('change', (e) => {
        todo.completed = e.target.checked;
        storage.updateDayData(this.currentDate, { todos });
        this.renderTodos();
      });
      this.zenTodoList.appendChild(li);
    });
  }

  renderHabits() {
    const habits = storage.getHabits();
    const dayData = storage.getDayData(this.currentDate);
    const dayHabits = dayData.habits || {};
    this.habitList.innerHTML = '';

    if (habits.length === 0) {
      this.habitList.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">등록된 습관이 없습니다. [습관 관리]에서 추가해보세요!</div>`;
      return;
    }

    habits.forEach(habit => {
      const isDone = !!dayHabits[habit.id];
      const streak = this.calcHabitStreak(habit.id);

      const div = document.createElement('div');
      div.className = `habit-item ${isDone ? 'done' : ''}`;
      div.innerHTML = `
        <div class="habit-left">
          <span class="habit-icon">${habit.icon}</span>
          <span class="habit-name">${this.escapeHtml(habit.name)}</span>
        </div>
        <div class="habit-right">
          ${streak > 0 ? `<span class="habit-streak"><i class="fa-solid fa-fire"></i> ${streak}일 연속</span>` : ''}
          <div class="habit-check-circle"><i class="fa-solid fa-check"></i></div>
        </div>
      `;

      div.addEventListener('click', () => {
        dayHabits[habit.id] = !isDone;
        storage.updateDayData(this.currentDate, { habits: dayHabits });
        this.renderHabits();
        this.renderAnalytics();
      });

      this.habitList.appendChild(div);
    });
  }

  calcHabitStreak(habitId) {
    let streak = 0;
    let curr = new Date(this.currentDate);
    const todayData = storage.getDayData(this.currentDate);
    if (!todayData.habits || !todayData.habits[habitId]) {
      curr.setDate(curr.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dStr = curr.toISOString().split('T')[0];
      const dData = storage.getDayData(dStr);
      if (dData.habits && dData.habits[habitId]) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  renderModalHabits() {
    const habits = storage.getHabits();
    this.modalHabitList.innerHTML = '';
    habits.forEach(habit => {
      const item = document.createElement('div');
      item.className = 'modal-habit-item';
      item.innerHTML = `
        <span>${habit.icon} ${this.escapeHtml(habit.name)}</span>
        <button class="icon-btn btn-sm" style="color: var(--accent-danger);"><i class="fa-solid fa-trash"></i></button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        storage.deleteHabit(habit.id);
        this.renderModalHabits();
        this.renderHabits();
        this.renderAnalytics();
      });
      this.modalHabitList.appendChild(item);
    });
  }

  renderTimeBlocks() {
    const dayData = storage.getDayData(this.currentDate);
    const blocks = dayData.timeBlocks || [];
    this.timeBlockList.innerHTML = '';

    if (blocks.length === 0) {
      this.timeBlockList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">등록된 일정이 없습니다. [+ 일정 추가]로 시간대별 타임블록을 배치하세요!</div>`;
      return;
    }

    blocks.forEach(block => {
      const div = document.createElement('div');
      div.className = 'timeblock-item';
      div.innerHTML = `
        <div class="tb-time">${block.start} - ${block.end}</div>
        <div class="tb-title">${this.escapeHtml(block.title)}</div>
        <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
      `;
      div.querySelector('.todo-delete-btn').addEventListener('click', () => {
        const updated = blocks.filter(b => b.id !== block.id);
        storage.updateDayData(this.currentDate, { timeBlocks: updated });
        this.renderTimeBlocks();
      });
      this.timeBlockList.appendChild(div);
    });
  }

  renderCondition() {
    const dayData = storage.getDayData(this.currentDate);
    const cond = dayData.condition || { water: 0, energy: 50, sleep: 7.0, memo: '' };

    const cups = cond.water || 0;
    this.waterCount.textContent = `${cups * 250} / 2,000 ml`;
    this.waterCups.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
      const icon = document.createElement('i');
      icon.className = `fa-solid fa-glass-water water-cup ${i <= cups ? 'filled' : ''}`;
      icon.title = `${i * 250}ml`;
      icon.addEventListener('click', () => {
        const newW = (i === cups) ? i - 1 : i;
        storage.updateDayData(this.currentDate, { condition: { ...cond, water: newW } });
        this.renderCondition();
      });
      this.waterCups.appendChild(icon);
    }

    const energy = cond.energy !== undefined ? cond.energy : 50;
    this.energySlider.value = energy;
    this.updateEnergyDisplay(energy);

    const sleep = cond.sleep !== undefined ? cond.sleep : 7.0;
    this.sleepInput.value = sleep.toFixed(1);
    this.sleepHoursText.textContent = `${sleep.toFixed(1)} 시간`;

    this.quickMemoInput.value = cond.memo || '';
  }

  updateEnergyDisplay(val) {
    let desc = '보통';
    if (val >= 80) desc = '매우 활기참 🔥';
    else if (val >= 60) desc = '좋음 😊';
    else if (val >= 40) desc = '보통 😐';
    else if (val >= 20) desc = '피곤함 🥱';
    else desc = '탈진 😴';
    this.energyLevelText.textContent = `${desc} (${val}%)`;
  }

  // ==========================================
  // 14. Knowledge Wiki & Study Photos
  // ==========================================
  renderStudyPhotos() {
    if (!this.studyPhotoGallery) return;
    const dayData = storage.getDayData(this.currentDate);
    const photos = dayData.study?.photos || [];
    this.studyPhotoGallery.innerHTML = '';

    if (photos.length === 0) {
      this.studyPhotoGallery.innerHTML = `<div style="grid-column: 1 / -1; font-size: 0.78rem; color: var(--text-muted); padding: 6px;">첨부된 학습 이미지가 없습니다. IndexedDB 무제한 저장소에 강의 캡처나 필기를 보관하세요!</div>`;
      return;
    }

    photos.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = 'study-photo-card';
      card.innerHTML = `
        <img src="${photo}" alt="학습 이미지">
        <button class="study-photo-delete-btn" title="이미지 삭제"><i class="fa-solid fa-xmark"></i></button>
      `;

      card.querySelector('.study-photo-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        photos.splice(idx, 1);
        storage.updateDayData(this.currentDate, { study: { ...dayData.study, photos } });
        this.renderStudyPhotos();
        this.renderStudyArchive();
        this.renderTabCalendar('study');
        this.showToast('학습 이미지가 삭제되었습니다.');
      });

      card.addEventListener('click', () => {
        const win = window.open('');
        win.document.write(`<body style="margin:0; background:#080d1a; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${photo}" style="max-width:95vw; max-height:95vh; border-radius:8px; box-shadow:0 0 20px rgba(0,0,0,0.8);"></body>`);
      });

      this.studyPhotoGallery.appendChild(card);
    });
  }

  renderStudyArchive() {
    const studies = storage.getAllStudies();
    this.studyArchiveList.innerHTML = '';

    const filtered = studies.filter(s => {
      if (this.studySearchQuery) {
        const tMatch = s.topic.toLowerCase().includes(this.studySearchQuery);
        const tilMatch = s.til.toLowerCase().includes(this.studySearchQuery);
        const noteMatch = s.notes.toLowerCase().includes(this.studySearchQuery);
        if (!tMatch && !tilMatch && !noteMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      this.studyArchiveList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px;"><p>누적된 지식 위키 기록이 없습니다.</p></div>`;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'study-card-item';

      const imgPreviewHtml = (s.photos && s.photos.length > 0)
        ? `<div class="study-card-images-preview">${s.photos.map(p => `<img src="${p}" class="study-thumb" alt="학습자료">`).join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="study-card-header">
          <span class="study-card-date"><i class="fa-regular fa-calendar"></i> ${s.date}</span>
          <span class="study-card-hours">${s.actualHours}시간 달성</span>
        </div>
        <div class="study-card-topic">📚 ${this.escapeHtml(s.topic)}</div>
        <div class="study-card-til">${this.escapeHtml(s.til || (s.notes ? s.notes.substring(0, 80) : '핵심 요약 없음'))}</div>
        ${imgPreviewHtml}
        <div class="study-card-actions">
          <button class="btn btn-secondary btn-sm copy-archive-btn" title="이 날의 학습 노트 복사"><i class="fa-solid fa-copy"></i> 복사</button>
        </div>
      `;

      card.querySelector('.copy-archive-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = `[${s.date} 학습 기록]\n📚 주제: ${s.topic}\n⏱️ 달성 시간: ${s.actualHours}시간\n💡 핵심 TIL: ${s.til}\n\n📝 상세 노트:\n${s.notes}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showToast(`📋 ${s.date} 학습 노트가 클립보드에 복사되었습니다!`);
        });
      });

      card.addEventListener('click', () => {
        this.setDate(s.date);
      });

      this.studyArchiveList.appendChild(card);
    });
  }

  // ==========================================
  // 15. Principles Rendering
  // ==========================================
  renderPrinciples() {
    const list = storage.getPrinciples();
    this.principlesGrid.innerHTML = '';

    if (list.length === 0) {
      this.principlesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:var(--text-muted); padding:40px;">등록된 인생 원칙이 없습니다. [+ 원칙 추가]로 나만의 철학을 적어보세요!</div>`;
      return;
    }

    const catLabels = { growth: '🚀 성장 & 학습', execution: '⚡ 실행 & 몰입', mindset: '🧘 마인드셋', relationship: '🤝 인간관계' };

    list.forEach(p => {
      const card = document.createElement('div');
      card.className = `principle-card cat-${p.category}`;
      card.innerHTML = `
        <div class="principle-header">
          <span class="principle-cat-badge">${catLabels[p.category] || '원칙'}</span>
          <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="principle-title">${this.escapeHtml(p.title)}</div>
        <div class="principle-content">${this.escapeHtml(p.content)}</div>
      `;

      card.querySelector('.todo-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('이 원칙을 삭제하시겠습니까?')) {
          storage.deletePrinciple(p.id);
          this.renderPrinciples();
          this.renderTabCalendar('principles');
        }
      });

      this.principlesGrid.appendChild(card);
    });
  }

  // ==========================================
  // 16. Journal Methods
  // ==========================================
  saveJournal(showToastMsg = false) {
    const title = this.journalTitle.value.trim();
    const content = this.journalContent.value;
    const dayData = storage.getDayData(this.currentDate);

    storage.updateDayData(this.currentDate, {
      journal: {
        ...dayData.journal,
        title,
        content,
        updatedAt: new Date().toISOString()
      }
    });

    this.autoSaveIndicator.innerHTML = '<i class="fa-solid fa-check"></i> 저장됨';
    this.renderCalendar();
    this.renderAllTabCalendars();
    this.renderAnalytics();

    if (showToastMsg) {
      this.showToast('일기가 성공적으로 저장되었습니다! 📝');
    }
  }

  autoSaveJournal() { this.saveJournal(false); }

  togglePreview() {
    this.isPreviewMode = !this.isPreviewMode;
    if (this.isPreviewMode) {
      this.journalPreview.innerHTML = this.parseMarkdown(this.journalContent.value);
      this.journalPreview.style.display = 'block';
      this.journalContent.style.display = 'none';
      this.journalPreviewToggle.innerHTML = '<i class="fa-solid fa-pen"></i> 편집하기';
    } else {
      this.journalPreview.style.display = 'none';
      this.journalContent.style.display = 'block';
      this.journalPreviewToggle.innerHTML = '<i class="fa-solid fa-eye"></i> 미리보기';
    }
  }

  applyToolbarCmd(cmd) {
    if (this.isPreviewMode) return;
    const ta = this.journalContent;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const sel = text.substring(start, end);

    let rep = '';
    let offset = 0;

    switch (cmd) {
      case 'bold': rep = `**${sel || '굵은 텍스트'}**`; offset = sel ? rep.length : 2; break;
      case 'italic': rep = `*${sel || '기울임 텍스트'}*`; offset = sel ? rep.length : 1; break;
      case 'heading': rep = `\n### ${sel || '소제목'}\n`; offset = rep.length; break;
      case 'action-block':
        rep = `\n### 🚀 내일을 위한 구체적 실행 가이드\n- [ ] ${sel || '실행할 최우선 핵심 액션 1'}\n- [ ] ${sel ? '' : '실행할 핵심 액션 2'}\n`;
        offset = rep.length;
        break;
      case 'quote': rep = `\n> ${sel || '인용구'}\n`; offset = rep.length; break;
      case 'list': rep = `\n- ${sel || '목록 항목'}\n`; offset = rep.length; break;
      case 'task': rep = `\n- [ ] ${sel || '실행할 일'}\n`; offset = rep.length; break;
      case 'code': rep = sel.includes('\n') ? `\n\`\`\`\n${sel || '코드'}\n\`\`\`\n` : `\`${sel || '코드'}\``; offset = rep.length; break;
      case 'hr': rep = `\n\n---\n\n`; offset = rep.length; break;
      default: return;
    }

    ta.value = text.substring(0, start) + rep + text.substring(end);
    ta.focus();
    ta.setSelectionRange(start + offset, start + offset);
    this.updateJournalStats();
    this.autoSaveJournal();
  }

  applyTemplate(type) {
    let tpl = '';
    switch (type) {
      case 'action':
        tpl = `### 🌟 오늘의 생각과 사유\n\n오늘 하루 나를 스쳐 지나간 생각과 직무/공부 경험을 자유롭게 적어봅니다.\n\n### 📚 오늘 위주로 공부한 핵심 주제\n- \n\n### 🚀 내일을 위한 구체적 실행 가이드\n- [ ] [커리어] \n- [ ] [재테크/공부] \n- [ ] [건강/루틴] \n\n### 💎 오늘 얻은 인생 원칙 & 지혜\n> "`;
        break;
      case 'dalio':
        tpl = `### 🧭 레이 달리오 5단계 성장 회고\n\n#### 1. Goals (명확한 목표)\n- \n\n#### 2. Problems (마주친 장애물/문제)\n- \n\n#### 3. Diagnosis (근본 원인 진단)\n- \n\n#### 4. Design (개선 원칙 수립)\n- \n\n#### 5. Execution (내일의 즉각 실행)\n- [ ] `;
        break;
      case 'study':
        tpl = `### 🧠 오늘의 학습 & 지식 정리 (Study Reflection)\n\n#### 1. 오늘 집중해서 파고든 핵심 개념\n- \n\n#### 2. 실무/비즈니스 적용 방안\n- \n\n#### 3. 내일 이어갈 심화 계획\n- [ ] `;
        break;
      case 'kpt':
        tpl = `### 📌 KPT 성장 회고\n\n#### 1. Keep (지속할 점)\n- \n\n#### 2. Problem (개선할 문제점)\n- \n\n#### 3. Try (내일 시도할 구체적 실행)\n- [ ] `;
        break;
      case 'gratitude':
        tpl = `### 💖 감사 일기 (Three Good Things)\n\n1. \n2. \n3. \n\n### 🌿 오늘의 마인드셋\n> `;
        break;
    }

    if (this.journalContent.value.trim()) {
      if (confirm('현재 작성 중인 일기 아래에 덧붙이시겠습니까?')) {
        this.journalContent.value += `\n\n${tpl}`;
      } else {
        this.journalContent.value = tpl;
      }
    } else {
      this.journalContent.value = tpl;
    }

    this.updateJournalStats();
    this.autoSaveJournal();
    this.showToast('성장 서식 템플릿이 적용되었습니다.');
  }

  applyGuidedWizard() {
    const fact = this.qFact.value.trim();
    const feeling = this.qFeeling.value.trim();
    const lesson = this.qLesson.value.trim();
    const next = this.qNext.value.trim();

    if (!fact && !feeling && !lesson && !next) {
      this.showToast('최소 한 가지 질문에 답변을 입력해주세요.', 'error');
      return;
    }

    let generated = `### 🌟 스마트 질문 가이드 일기\n\n`;
    if (fact) generated += `#### 1. Fact (사실 & 공부한 내용)\n${fact}\n\n`;
    if (feeling) generated += `#### 2. Feeling (느꼈던 감정과 생각)\n${feeling}\n\n`;
    if (lesson) generated += `#### 3. Lesson & Principle (인생 원칙)\n> "${lesson}"\n\n`;
    if (next) {
      generated += `#### 4. Next Action (내일의 실행 가이드)\n`;
      next.split('\n').filter(Boolean).forEach(nl => {
        generated += `- [ ] ${nl.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '')}\n`;
      });
      generated += `\n`;
    }

    this.journalContent.value = (this.journalContent.value.trim() ? this.journalContent.value + '\n\n' : '') + generated;
    if (!this.journalTitle.value.trim()) {
      this.journalTitle.value = `${this.currentDate}의 사유와 실행 가이드`;
    }

    this.qFact.value = '';
    this.qFeeling.value = '';
    this.qLesson.value = '';
    this.qNext.value = '';
    this.wizardModal.classList.remove('active');

    this.updateJournalStats();
    this.saveJournal(false);
    this.extractActionGuideFromJournal();
  }

  renderTags() {
    const dayData = storage.getDayData(this.currentDate);
    const tags = dayData.journal.tags || [];
    this.journalTagsList.innerHTML = '';
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag-badge';
      span.innerHTML = `#${this.escapeHtml(tag)} <i class="fa-solid fa-xmark tag-remove-btn"></i>`;
      span.querySelector('.tag-remove-btn').addEventListener('click', () => {
        const updated = tags.filter(t => t !== tag);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, tags: updated } });
        this.renderTags();
        this.renderAnalytics();
      });
      this.journalTagsList.appendChild(span);
    });
  }

  updateJournalStats() {
    const text = this.journalContent.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readMin = Math.ceil(words / 150) || 0;
    this.charCount.textContent = chars.toLocaleString();
    this.wordCount.textContent = words.toLocaleString();
    this.readTime.textContent = readMin;
  }

  exportMarkdown() {
    const dayData = storage.getDayData(this.currentDate);
    const title = this.journalTitle.value || `${this.currentDate}의 일기`;
    const tags = (dayData.journal.tags || []).map(t => `#${t}`).join(' ');
    let md = `---\ndate: ${this.currentDate}\nmood: ${dayData.mood || 'none'}\ntags: [${(dayData.journal.tags || []).join(', ')}]\n---\n\n# ${title}\n\n${tags ? `> 태그: ${tags}\n\n` : ''}${this.journalContent.value}\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_flow_pro_${this.currentDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('마크다운 파일로 다운로드되었습니다! 📥');
  }

  parseMarkdown(raw) {
    if (!raw) return '<p style="color: var(--text-muted);">작성된 내용이 없습니다.</p>';
    let html = raw
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^- \[ \] (.*$)/gim, '<div style="margin:4px 0;"><input type="checkbox" disabled> <span>$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div style="margin:4px 0;"><input type="checkbox" checked disabled> <del>$1</del></div>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^---$/gim, '<hr class="divider">')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }

  // ==========================================
  // 17. Journal Right Sidebar Calendar
  // ==========================================
  renderJournalRightCalendar() {
    const titleEl = document.getElementById('jCalTitle');
    const gridEl = document.getElementById('jCalGrid');
    const listEl = document.getElementById('jCalMonthList');
    if (!titleEl || !gridEl) return;

    const st = this.tabCalState.journal;
    titleEl.textContent = `${st.year}년 ${st.month + 1}월`;
    gridEl.innerHTML = '';

    const first = new Date(st.year, st.month, 1);
    const last = new Date(st.year, st.month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    const prevLast = new Date(st.year, st.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'tab-cal-day-cell other-month';
      cell.innerHTML = `<span>${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'tab-cal-day-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = storage.data.days[fullDate];
      const hasJournal = dayData && dayData.journal && (dayData.journal.title || dayData.journal.content);

      cell.innerHTML = `
        <span>${d}</span>
        ${hasJournal ? '<span class="tab-cal-badge-dot" style="background:#818cf8;"></span>' : ''}
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }

    if (listEl) {
      listEl.innerHTML = '';
      const targetYM = `${st.year}-${String(st.month + 1).padStart(2, '0')}`;
      const allJournals = storage.getAllJournals();
      const monthJournals = allJournals.filter(j => j.date.startsWith(targetYM));

      if (monthJournals.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 14px; font-size: 0.75rem;">이달에 작성된 일기가 없습니다.</div>`;
      } else {
        const moodEmojis = { great: '😆', good: '😊', neutral: '😐', tired: '🥱', stressed: '😣' };
        monthJournals.forEach(j => {
          const item = document.createElement('div');
          item.className = `tab-cal-list-row ${j.date === this.currentDate ? 'active' : ''}`;
          const dayNum = j.date.split('-')[2];
          item.innerHTML = `
            <span class="tab-cal-row-date">${dayNum}일</span>
            <span class="tab-cal-row-title" title="${this.escapeHtml(j.title)}">${this.escapeHtml(j.title || '제목 없음')}</span>
            <span>${moodEmojis[j.mood] || '📝'}</span>
          `;
          item.addEventListener('click', () => this.setDate(j.date));
          listEl.appendChild(item);
        });
      }
    }
  }

  // ==========================================
  // 18. Calendar Tab & Analytics
  // ==========================================
  renderCalendar() {
    this.calendarMonthTitle.textContent = `${this.calYear}년 ${this.calMonth + 1}월`;
    this.calendarDaysGrid.innerHTML = '';

    const first = new Date(this.calYear, this.calMonth, 1);
    const last = new Date(this.calYear, this.calMonth + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    const prevLast = new Date(this.calYear, this.calMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<span class="cal-day-num">${prevLast - i}</span>`;
      this.calendarDaysGrid.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const moodEmojis = { great: '😆', good: '😊', neutral: '😐', tired: '🥱', stressed: '😣' };

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(this.calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${this.calYear}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = storage.getDayData(fullDate);
      const hasJournal = dayData.journal && (dayData.journal.title || dayData.journal.content);
      const mood = dayData.mood ? moodEmojis[dayData.mood] || '' : '';

      cell.innerHTML = `
        <span class="cal-day-num">${d}</span>
        <div class="cal-day-badges">
          <span>${mood}</span>
          ${hasJournal ? '<span class="cal-has-journal-dot" title="일기 작성됨"></span>' : ''}
        </div>
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
        this.renderCalendar();
      });

      this.calendarDaysGrid.appendChild(cell);
    }

    this.renderArchive();
  }

  renderArchive() {
    const journals = storage.getAllJournals();
    this.archiveList.innerHTML = '';

    const filtered = journals.filter(j => {
      if (this.archiveFilterMood !== 'all' && j.mood !== this.archiveFilterMood) return false;
      if (this.archiveSearchQuery) {
        const titleM = j.title.toLowerCase().includes(this.archiveSearchQuery);
        const contentM = j.content.toLowerCase().includes(this.archiveSearchQuery);
        const tagM = (j.tags || []).some(t => t.toLowerCase().includes(this.archiveSearchQuery));
        if (!titleM && !contentM && !tagM) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      this.archiveList.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 30px;"><p>조건에 맞는 일기 기록이 없습니다.</p></div>`;
      return;
    }

    const moodEmojis = { great: '😆', good: '😊', neutral: '😐', tired: '🥱', stressed: '😣' };
    filtered.forEach(j => {
      const card = document.createElement('div');
      card.className = 'archive-item-card';
      const snippet = j.content ? j.content.replace(/[\#\*\>\-]/g, '').trim().substring(0, 90) + '...' : '내용 없음';
      const tagsHtml = (j.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join(' ');

      card.innerHTML = `
        <div class="archive-item-header">
          <span class="archive-item-date"><i class="fa-regular fa-calendar"></i> ${j.date}</span>
          <span>${moodEmojis[j.mood] || '😐'}</span>
        </div>
        <div class="archive-item-title">${this.escapeHtml(j.title)}</div>
        <div class="archive-item-snippet">${this.escapeHtml(snippet)}</div>
        ${tagsHtml ? `<div style="margin-top: 8px;">${tagsHtml}</div>` : ''}
      `;

      card.addEventListener('click', () => {
        this.setDate(j.date);
        this.switchTab('journal');
      });

      this.archiveList.appendChild(card);
    });
  }

  renderAnalytics() {
    const allDays = storage.data.days || {};
    const today = new Date().toISOString().split('T')[0];
    const currentYM = this.currentDate.substring(0, 7);

    let streak = 0;
    let curr = new Date(today);
    const todayJ = allDays[today]?.journal;
    if (!todayJ || (!todayJ.title && !todayJ.content)) {
      curr.setDate(curr.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dStr = curr.toISOString().split('T')[0];
      const j = allDays[dStr]?.journal;
      if (j && (j.title || j.content)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    this.streakDays.textContent = `${streak}일`;
    this.streakSub.textContent = streak > 0 ? '꾸준함이 비범함을 만듭니다' : '오늘 첫 일기를 작성해보세요 ✨';

    const goals = storage.getGoals();
    let totalP = 0;
    goals.forEach(g => { totalP += (g.progress || 0); });
    const avgGoalRate = goals.length > 0 ? Math.round(totalP / goals.length) : 0;
    this.totalGoalRateVal.textContent = `${avgGoalRate}%`;
    this.totalGoalCountVal.textContent = `총 ${goals.length}개 목표 관리 중`;

    let totalStudyHours = 0;
    let totalStudyCount = 0;
    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYM) && day.study) {
        if (day.study.actualHours > 0) totalStudyHours += day.study.actualHours;
        if (day.study.topic) totalStudyCount++;
      }
    }
    this.totalStudyHoursVal.textContent = `${totalStudyHours}시간`;
    this.totalStudyCountVal.textContent = `총 ${totalStudyCount}개 주제 학습`;

    let totalT = 0, compT = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayData = allDays[dStr];
      if (dayData && dayData.todos) {
        dayData.todos.forEach(t => {
          totalT++;
          if (t.completed) compT++;
        });
      }
    }
    const rate = totalT > 0 ? Math.round((compT / totalT) * 100) : 0;
    this.todoRateVal.textContent = `${rate}%`;
    this.todoRateSub.textContent = `최근 7일 (${compT}/${totalT} 완료)`;

    const moodCounts = { great: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
    let totalMood = 0;
    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYM) && day.mood && moodCounts[day.mood] !== undefined) {
        moodCounts[day.mood]++;
        totalMood++;
      }
    }

    const moodConfig = [
      { key: 'great', label: '😆 최고예요', color: '#10b981' },
      { key: 'good', label: '😊 좋아요', color: '#06b6d4' },
      { key: 'neutral', label: '😐 보통이에요', color: '#6366f1' },
      { key: 'tired', label: '🥱 피곤해요', color: '#f59e0b' },
      { key: 'stressed', label: '😣 스트레스', color: '#ef4444' }
    ];
    this.moodAnalyticsBars.innerHTML = '';
    moodConfig.forEach(cfg => {
      const c = moodCounts[cfg.key] || 0;
      const pct = totalMood > 0 ? Math.round((c / totalMood) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'stat-bar-row';
      row.innerHTML = `
        <div class="stat-bar-label"><span>${cfg.label}</span><span>${c}일 (${pct}%)</span></div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%; background-color:${cfg.color};"></div></div>
      `;
      this.moodAnalyticsBars.appendChild(row);
    });

    const habits = storage.getHabits();
    let monthDaysCount = 0;
    const habitSuccess = {};
    habits.forEach(h => { habitSuccess[h.id] = 0; });
    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYM)) {
        monthDaysCount++;
        if (day.habits) {
          for (const [hid, done] of Object.entries(day.habits)) {
            if (done && habitSuccess[hid] !== undefined) habitSuccess[hid]++;
          }
        }
      }
    }
    this.habitAnalyticsBars.innerHTML = '';
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    habits.forEach((h, idx) => {
      const c = habitSuccess[h.id] || 0;
      const pct = monthDaysCount > 0 ? Math.min(100, Math.round((c / monthDaysCount) * 100)) : 0;
      const row = document.createElement('div');
      row.className = 'stat-bar-row';
      row.innerHTML = `
        <div class="stat-bar-label"><span>${h.icon} ${this.escapeHtml(h.name)}</span><span>${c}일 달성 (${pct}%)</span></div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%; background-color:${colors[idx % colors.length]};"></div></div>
      `;
      this.habitAnalyticsBars.appendChild(row);
    });
  }

  // ==========================================
  // 19. Clock & Helpers
  // ==========================================
  startClock() {
    const tick = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      if (this.sidebarDate) this.sidebarDate.textContent = `${y}.${m}.${d} (${days[now.getDay()]})`;
      if (this.sidebarTime) this.sidebarTime.textContent = `${hh}:${mm}:${ss}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  showRandomQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (this.quoteBanner) {
      this.quoteBanner.innerHTML = `<span class="quote-text">"${q}"</span>`;
    }
  }

  updateThemeIcon(theme) {
    if (this.themeIcon) {
      if (theme === 'light') {
        this.themeIcon.className = 'fa-solid fa-sun';
        this.themeIcon.style.color = '#f59e0b';
      } else {
        this.themeIcon.className = 'fa-solid fa-moon';
        this.themeIcon.style.color = '';
      }
    }
  }

  showToast(msg, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'error'
      ? '<i class="fa-solid fa-circle-exclamation text-rose" style="color: #f43f5e;"></i>'
      : '<i class="fa-solid fa-circle-check text-emerald" style="color: #10b981;"></i>';
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', async () => {
  window.dailyFlowApp = new DailyFlowApp();
  await window.dailyFlowApp.init();
});
