/**
 * Daily Flow Pro - 1% Life OS (Commercial Grade Engine v2.0)
 * Integrated with KST Engine, TenTrillion Mastery, EES 4-Axis Realtime Calculator & Valuation Ledger
 */
import { todayKST, nowHM, shiftDate, fmtKRW, daysBetween, lastNDays, sum } from './utils.js';
import { storage } from './storage.js';
import { computeEES, paintEES, weeklyEES, closeWeek } from './ees.js';
import { TenTrillion } from './ten-trillion.js';
import { controlAssets, netWorth, LEDGER_RULES } from './valuation.js';
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

const QUOTES_TRILLION = [
  "시간을 돈으로 바꾸지 말고, 4대 레버리지(자본, 시스템, 지식, 미디어)를 통해 영구 복리 자산 시스템을 구축하라.",
  "10조 자산가의 하루는 단순한 노동이 아니라, 독점적 해자(Moat)를 파고 복리 시스템을 구축하는 시간이다.",
  "신체 에너지와 맑은 정신이 무너지면 어떤 자본도 의미가 없다. 최고의 1순위 자산은 건강이다.",
  "무의미한 술자리와 인맥을 거절하는 용기가 매일 2시간의 독점적 딥워크 복리 시간을 선물한다.",
  "완벽주의를 버리고, 매일 지식과 직무 통찰을 1장의 도면이나 글로 기록하여 시스템 자본화하라."
];

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
    this.currentDate = todayKST();
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
    this.initModeSwitcher();
    this.bindSimpleModeEvents();
    this.startClock();
    this.showRandomQuote();
    this.updateGeminiStatusBadge();

    window.app = this;
    window.dailyFlowApp = this;
    this.tenTrillion = new TenTrillion(this);
    paintEES(this.currentDate);

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

    // Memo Elements
    this.sidebarQuickMemoForm = document.getElementById('sidebarQuickMemoForm');
    this.sidebarQuickMemoInput = document.getElementById('sidebarQuickMemoInput');
    this.memoAddForm = document.getElementById('memoAddForm');
    this.memoTitleInput = document.getElementById('memoTitleInput');
    this.memoContentInput = document.getElementById('memoContentInput');
    this.memoPinCheck = document.getElementById('memoPinCheck');
    this.memoCategoryPills = document.getElementById('memoCategoryPills');
    this.memoSearchInput = document.getElementById('memoSearchInput');
    this.memoFilterList = document.getElementById('memoFilterList');
    this.memoCardsGrid = document.getElementById('memoCardsGrid');
    this.aiIdeaBrainstormBtn = document.getElementById('aiIdeaBrainstormBtn');
    this.selectedMemoCategory = 'idea';
    this.activeMemoFilter = 'all';

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
      item?.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });
    if (this.quickStudyBtn) {
      this.quickStudyBtn?.addEventListener('click', () => this.switchTab('study'));
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

    if (this.zenModeToggleBtn) this.zenModeToggleBtn?.addEventListener('click', enterZen);
    if (this.zenModeHeaderBtn) this.zenModeHeaderBtn?.addEventListener('click', enterZen);
    if (this.exitZenModeBtn) this.exitZenModeBtn?.addEventListener('click', exitZen);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isZenMode) exitZen();
    });

    if (this.zenStartTimerBtn) {
      this.zenStartTimerBtn?.addEventListener('click', () => {
        if (this.timerRunning) this.pauseTimer();
        else this.startTimer();
      });
    }
    if (this.zenResetTimerBtn) {
      this.zenResetTimerBtn?.addEventListener('click', () => this.resetTimer());
    }

    // ==========================================
    // 🚨 과업 이월 (Rollover)
    // ==========================================
    if (this.rolloverApplyBtn) {
      this.rolloverApplyBtn?.addEventListener('click', () => this.applyTaskRollover());
    }
    if (this.rolloverDismissBtn) {
      this.rolloverDismissBtn?.addEventListener('click', () => {
        this.rolloverBanner.style.display = 'none';
      });
    }

    // ==========================================
    // ⭐ 전 탭 우측 캘린더 네비게이션 버튼 이벤트 바인딩 ⭐
    // ==========================================
    document.querySelectorAll('[data-cal-action]').forEach(btn => {
      btn?.addEventListener('click', () => {
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
      this.dashChatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const trouble = this.dashChatInput.value.trim();
        if (!trouble) return;
        this.dashChatInput.value = '';
        await this.handleDashboardTroubleChat(trouble);
      });
    }

    document.querySelectorAll('.trouble-chip').forEach(btn => {
      btn?.addEventListener('click', () => {
        this.handleDashboardTroubleChat(btn.dataset.trouble);
      });
    });

    if (this.clearDashChatBtn) {
      this.clearDashChatBtn?.addEventListener('click', () => {
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
      this.copyStudyNotesBtn?.addEventListener('click', () => {
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
      this.dashCopyTilBtn?.addEventListener('click', () => {
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
      this.studyPhotoInput?.addEventListener('change', (e) => {
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

    if (this.geminiStatusBtn) this.geminiStatusBtn?.addEventListener('click', openGemini);
    if (this.openGeminiModalBtn) this.openGeminiModalBtn?.addEventListener('click', openGemini);
    if (this.closeGeminiModalBtn) this.closeGeminiModalBtn?.addEventListener('click', closeGemini);
    if (this.cancelGeminiModalBtn) this.cancelGeminiModalBtn?.addEventListener('click', closeGemini);

    if (this.saveGeminiKeyBtn) {
      this.saveGeminiKeyBtn?.addEventListener('click', async () => {
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
      this.removeGeminiKeyBtn?.addEventListener('click', async () => {
        storage.data.settings.geminiApiKey = '';
        await storage.saveData();
        this.geminiApiKeyInput.value = '';
        this.updateGeminiStatusBadge();
        closeGemini();
        this.showToast('Gemini API 키가 삭제되었습니다.');
      });
    }

    // Date navigation
    this.prevDayBtn?.addEventListener('click', () => this.shiftDate(-1));
    this.nextDayBtn?.addEventListener('click', () => this.shiftDate(1));
    this.todayQuickBtn?.addEventListener('click', () => this.setDate(todayKST()));
    this.datePicker?.addEventListener('change', (e) => {
      if (e.target.value) this.setDate(e.target.value);
    });

    // Theme Toggle
    this.themeToggle?.addEventListener('click', async () => {
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
    // 📱 iPhone / iPad Mobile Drawer & Bottom Tab Bar Events
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const mobileMenuToggleBtn = document.getElementById('mobileMenuToggleBtn');
    const closeSidebarDrawerBtn = document.getElementById('closeSidebarDrawerBtn');
    const mobileMoreMenuBtn = document.getElementById('mobileMoreMenuBtn');
    const mobileBottomNav = document.getElementById('mobileBottomNav');

    const openDrawer = () => {
      if (sidebar) sidebar.classList.add('drawer-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    };

    const closeDrawer = () => {
      if (sidebar) sidebar.classList.remove('drawer-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    };

    if (mobileMenuToggleBtn) mobileMenuToggleBtn?.addEventListener('click', openDrawer);
    if (mobileMoreMenuBtn) mobileMoreMenuBtn?.addEventListener('click', openDrawer);
    if (closeSidebarDrawerBtn) closeSidebarDrawerBtn?.addEventListener('click', closeDrawer);
    if (sidebarBackdrop) sidebarBackdrop?.addEventListener('click', closeDrawer);

    // 모바일 하단 탭 바 연동
    if (mobileBottomNav) {
      mobileBottomNav.querySelectorAll('.mbottom-item[data-tab]').forEach(btn => {
        btn?.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab);
          closeDrawer();
        });
      });
    }

    // 사이드바 메뉴 클릭 시 모바일이면 자동 닫힘
    this.navItems.forEach(item => {
      item?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeDrawer();
        }
      });
    });

    // 10조 복리 모멘텀 퀵 진단 버튼
    const quickCompoundBriefBtn = document.getElementById('quickCompoundBriefBtn');
    if (quickCompoundBriefBtn) {
      quickCompoundBriefBtn?.addEventListener('click', async () => {
        const score = this.calculateCompoundMomentum();
        const prompt = `[오늘의 10조 복리 모멘텀 지수 실시간 진단]
오늘 복리 점수: ${score}점 (100점 만점)
오늘 날짜: ${this.currentDate}

현재 사용자의 10조 복리 모멘텀 점수를 바탕으로, 오늘 남은 시간 동안 점수를 100%로 끌어올리고 인생의 복리 격차를 벌리기 위한 3단계 즉각 행동 처방전을 내려줘.`;

        const res = await geminiClient.generateText(prompt);
        this.openGlobalAiModal('👑 10조 복리 모멘텀 실시간 처방전', this.parseMarkdown(res));
      });
    }
    const aiTrillionCoachBtn = document.getElementById('aiTrillionCoachBtn');
    const trillionAiBox = document.getElementById('trillionAiResponseBox');
    const pushAllTrillionTodosBtn = document.getElementById('pushAllTrillionTodosBtn');
    const trillionSubnavBar = document.getElementById('trillionSubnavBar');
    const ai5YearSimulateBtn = document.getElementById('ai5YearSimulateBtn');
    const fiveYearResultBox = document.getElementById('fiveYearSimulateResultBox');

    // 제미나이 5개년 10조 시뮬레이터
    if (ai5YearSimulateBtn) {
      ai5YearSimulateBtn?.addEventListener('click', async () => {
        if (!fiveYearResultBox) return;
        fiveYearResultBox.innerHTML = '<div style="text-align:center; padding:16px;"><i class="fa-solid fa-spinner fa-spin text-amber" style="font-size:1.5rem;"></i><p style="margin-top:6px; color:var(--text-secondary); font-weight:700;">제미나이가 5개년 10조 초고속 기하급수 시뮬레이션을 연산 중입니다...</p></div>';

        const mastery = storage.getTrillionMastery();
        const vision = mastery.vision || '글로벌 AI/소프트웨어 인프라 및 자산 구축';
        const dayData = storage.getDayData(this.currentDate);
        const focus = dayData.focus || '자립형 비즈니스 파이프라인 구축';

        const prompt = `[제미나이 5개년 10조 초고속 기하급수 성장 시뮬레이션]
사용자 비전: "${vision}"
현재 핵심 과업: "${focus}"

당신은 글로벌 10조 자산가/유니콘 육성 최고전략고문 AI입니다.
사용자가 앞으로 5년 안에 10조 자산가에 도달하기 위한 연차별 핵심 성공 경로(Critical Path)와 기하급수적 성장 공식을 브리핑해 주세요:

1. 🚀 **Year 1 (100억 PMF):** 1차원 노동 100% 제거 & 자립형 프로토타입 핵심 성공 기준
2. 📈 **Year 2 (1,000억 스케일업):** 글로벌 시장 침투 및 네트워크 효과 폭발 전략
3. 🏰 **Year 3 (1조 데카콘 진입):** 대체 불가능한 독점 해자(Moat) 완성 & 자본 유치
4. 💰 **Year 4 (5조 자본화):** 글로벌 IPO/M&A 및 유동성의 글로벌 복리 자산 배분
5. 👑 **Year 5 (10조 완성):** 10조 글로벌 복리 포트폴리오 완성 & 영구 현금흐름 운영
6. ⚠️ **가장 경계해야 할 단 1가지 치명적 병목(Bottleneck) 및 해결책:**

단호하고 명쾌하며 실행 가능한 전략으로 작성해줘.`;

        const res = await geminiClient.generateText(prompt);
        fiveYearResultBox.innerHTML = this.parseMarkdown(res);
        this.showToast('제미나이 5개년 10조 시뮬레이션 진단이 완료되었습니다! 🚀');
      });
    }

    // 10조 서브탭 전환
    if (trillionSubnavBar) {
      trillionSubnavBar.querySelectorAll('.tsub-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          trillionSubnavBar.querySelectorAll('.tsub-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const sub = btn.dataset.sub;
          document.querySelectorAll('.trillion-subview').forEach(view => {
            view.style.display = view.id === `tsub-view-${sub}` ? 'block' : 'none';
          });
          if (sub === 'ideabank') this.renderTrillionIdeas();
          if (sub === 'vision') this.loadTrillionVision();
        });
      });
    }

    // 비전 캔버스 저장
    const saveTrillionVisionBtn = document.getElementById('saveTrillionVisionBtn');
    if (saveTrillionVisionBtn) {
      saveTrillionVisionBtn?.addEventListener('click', () => {
        const vision = document.getElementById('trillionVisionInput')?.value.trim() || '';
        const val1 = document.getElementById('trillionVal1')?.value.trim() || '';
        const val2 = document.getElementById('trillionVal2')?.value.trim() || '';
        const val3 = document.getElementById('trillionVal3')?.value.trim() || '';

        storage.updateTrillionMastery({ vision, val1, val2, val3 });
        this.showToast('나의 평생 10조 비전과 핵심가치가 안전하게 저장되었습니다! 🏛️');
      });
    }

    // 10조 아이디어 뱅크 폼 제출
    const trillionIdeaForm = document.getElementById('trillionIdeaForm');
    if (trillionIdeaForm) {
      trillionIdeaForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('tideaTitle')?.value.trim();
        const content = document.getElementById('tideaContent')?.value.trim();
        const category = document.getElementById('tideaCategory')?.value || 'business';
        if (!title) return;

        storage.addTrillionIdea({ title, content, category });
        document.getElementById('tideaTitle').value = '';
        document.getElementById('tideaContent').value = '';
        this.renderTrillionIdeas();
        this.showToast('10조 스케일업 아이디어가 아이디어 뱅크에 저장되었습니다! 💡');
      });
    }

    // AI 10조 아이디어 발굴 브레인스토밍
    const aiTrillionBrainstormBtn = document.getElementById('aiTrillionBrainstormBtn');
    if (aiTrillionBrainstormBtn) {
      aiTrillionBrainstormBtn?.addEventListener('click', async () => {
        aiTrillionBrainstormBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 발굴 중...';
        const mastery = storage.getTrillionMastery();
        const vision = mastery.vision || '글로벌 초격차 복리 비즈니스 시스템 구축';

        const prompt = `나의 10조 비전: [${vision}]
위 비전에 부합하는 10조 규모 잠재력을 가진 차세대 비즈니스/소프트웨어 아이디어 2가지를 제안해줘. (아이디어 제목, 독점적 해자 Moat, 4대 레버리지 적용 방안).`;

        const res = await geminiClient.generateText(prompt);
        aiTrillionBrainstormBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 10조 아이디어 발굴';

        storage.addTrillionIdea({
          title: '🤖 [AI 제안] 글로벌 복리 스케일업 비즈니스',
          content: res,
          category: 'business'
        });

        this.renderTrillionIdeas();
        this.showToast('Gemini가 10조 아이디어를 아이디어 뱅크에 꽂아드렸습니다! 💡');
      });
    }

    // 일일 행동 감사 (Action Audit) 실행
    const runActionAuditBtn = document.getElementById('runActionAuditBtn');
    const auditResultBox = document.getElementById('auditResultBox');
    if (runActionAuditBtn) {
      runActionAuditBtn?.addEventListener('click', async () => {
        if (!auditResultBox) return;
        auditResultBox.innerHTML = '<div style="text-align:center; padding:16px;"><i class="fa-solid fa-spinner fa-spin text-emerald" style="font-size:1.5rem;"></i><p style="margin-top:6px; color:var(--text-secondary);">제미나이 행동 감사관이 오늘 하루를 냉정하게 판정 중입니다...</p></div>';

        const userRef = document.getElementById('dailyAuditUserReflection')?.value.trim() || '자가 성찰 미입력';
        const dayData = storage.getDayData(this.currentDate);
        const todos = dayData.todos || [];
        const done = todos.filter(t => t.completed).length;

        const prompt = `[10조 자산가 일일 행동 냉정 감사(Audit) 리포트]
오늘 날짜: ${this.currentDate}
완료한 과업: ${done}/${todos.length}개 (${todos.map(t => (t.completed ? '✅' : '❌') + ' ' + t.text).join(', ')})
사용자의 오늘 행동 자가 검증: "${userRef}"

당신은 10조 자산가의 냉정한 행동 감사관 AI입니다.
아래 포맷으로 단호하게 평가해 주세요:
1. ⚖️ **10조 적합도 등급:** (Grade S / Grade A / Grade B / Grade C 중 택1)
2. 🎯 **오늘 가장 칭찬할 10조급 행동:**
3. ⚠️ **반드시 제거해야 할 1차원적 시간 낭비 요소:**
4. 🚀 **내일 아침 즉시 실행할 10조 레버리지 수정 지침:**`;

        const res = await geminiClient.generateText(prompt);
        auditResultBox.innerHTML = this.parseMarkdown(res);
        this.showToast('제미나이 10조 행동 감사 결과가 도착했습니다! ⚖️');
      });
    }

    const updateQuestScore = () => {
      const checks = ['tquest_mindset', 'tquest_habit', 'tquest_ability', 'tquest_learning', 'tquest_action'];
      let done = 0;
      const questData = {};
      checks.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) {
          done++;
          questData[id] = true;
        } else {
          questData[id] = false;
        }
      });
      const badge = document.getElementById('trillionQuestScoreBadge');
      if (badge) {
        badge.textContent = `${done}/5 달성`;
        badge.className = `badge ${done === 5 ? 'badge-success' : 'badge-warning'}`;
      }
      storage.updateDayData(this.currentDate, { trillionQuests: questData });
      this.calculateCompoundMomentum();
    };

    ['tquest_mindset', 'tquest_habit', 'tquest_ability', 'tquest_learning', 'tquest_action'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el?.addEventListener('change', updateQuestScore);
    });

    if (pushAllTrillionTodosBtn) {
      pushAllTrillionTodosBtn?.addEventListener('click', () => {
        const tasks = [
          { text: '[1열 마인드셋] 오늘 내가 직접 하지 않고 시스템화/자동화할 1가지 정의', category: 'career' },
          { text: '[2열 초격차습관] 방해 없는 2시간 딥워크로 핵심 복리 비즈니스 시스템 구축', category: 'career' },
          { text: '[3열 핵심능력] 내 비즈니스의 독보적 경쟁력(해자)과 확장성 1페이지 설계', category: 'career' },
          { text: '[4열 매일학습] 10조급 자산가들의 의사결정 원칙 도서 1챕터 요약 및 적용', category: 'study' },
          { text: '[5열 즉각행동] 월급 외 자립형 파이프라인 1호 프로토타입 런칭/실행', category: 'wealth' }
        ];
        tasks.forEach(t => this.pushActionToTodayTodo(t.text, t.category));
        this.showToast('👑 10조 자산가 5대 혁신 지침이 오늘의 To-Do로 일괄 등록되었습니다! ⚡');
      });
    }

    const requestTrillionCoaching = async (topicType = 'daily') => {
      if (!trillionAiBox) return;
      trillionAiBox.innerHTML = '<div style="text-align:center; padding:24px;"><i class="fa-solid fa-spinner fa-spin text-amber" style="font-size:1.6rem;"></i><p style="margin-top:10px; color:var(--text-secondary); font-weight:700;">Gemini 10조 자산가 최고전략고문이 5열 과학적 분석을 수행 중입니다...</p></div>';

      const dayData = storage.getDayData(this.currentDate);
      const focus = dayData.focus || '비즈니스 자동화 및 자산 증식';

      let promptText = '';
      if (topicType === 'daily') {
        promptText = `[Gemini 10조 자산가 5열 통합 최고전략 지침서]
오늘 날짜: ${this.currentDate}
오늘 사용자 핵심 관심사: "${focus}"

당신은 사용자가 '10조 자산가'로 도약할 수 있도록 돕는 과학적 최고전략고문 AI입니다.
아래 5대 핵심 영역에 대해 오늘 당장 실천할 수 있는 날카롭고 구체적인 1일 1지침을 내려주세요:
1. 🧠 **[1열. 마인드셋 지침]:** (1차원 노동 탈피 & 4대 레버리지 전환 사고)
2. 💎 **[2열. 초격차 습관 지침]:** (4시간 딥워크 블록 & 인지 에너지 최적화)
3. 🚀 **[3열. 핵심 능력 지침]:** (자본 배분 Capital Allocation & 비즈니스 해자 설계 훈련)
4. 📚 **[4열. 매일 학습 지침]:** (오늘 반드시 파고들 글로벌 메가트렌드/비즈니스 분석)
5. ⚡ **[5열. 즉각 행동 지침]:** (월급 외 독자적 가치를 창출하는 오늘 퇴근 후 1% 실전 액션)

군더더기 없이 단호하고 지혜로운 어조로 작성해줘.`;
      } else if (topicType === 'mindset') {
        promptText = `[10조 자산가 1열: 마인드셋 & 레버리지 심층 코칭]
오늘 목표: "${focus}"
질문: 10조 자산가의 극단적 장기 시계(Extreme Long-term Horizon)와 비대칭 베팅 원칙을 바탕으로, 오늘 하루 나의 생각을 어떻게 혁신해야 하는지 3가지 마인드셋 행동 지침을 제시해줘.`;
      } else if (topicType === 'habit') {
        promptText = `[10조 자산가 2열: 초격차 습관 최적화 코칭]
질문: 10조 자산가들이 매일 실천하는 4시간 딥워크, 양질의 수면/신체 관리, 불필요한 결정 제거 루틴을 오늘 내 하루 스케줄에 어떻게 이식할 수 있는지 구체적인 시간표 가이드를 제시해줘.`;
      } else if (topicType === 'ability') {
        promptText = `[10조 자산가 3열: 핵심 능력 & 자본 배분 훈련]
질문: 10조 자산가의 가장 중요한 2대 역량인 '자본 배분(Capital Allocation)'과 '해자(Moat) 있는 비즈니스 설계' 능력을 오늘 실전에서 훈련하기 위한 3가지 워크북 질문을 던져줘.`;
      } else if (topicType === 'learning') {
        promptText = `[10조 자산가 4열: 매일 1시간 심층 학습 추천]
질문: 현재 글로벌 경제와 기술 지형도(AI, 로보틱스, 에너지 등)에서 10조 규모로 성장할 수 있는 핵심 메가트렌드 1가지를 브리핑하고, 오늘 분석해야 할 핵심 학습 주제를 추천해줘.`;
      } else if (topicType === 'action') {
        promptText = `[10조 자산가 5열: 오늘 당장 실행할 1% 즉각 행동]
질문: 월급 외에 1달러를 스스로 벌어들이는 자립형 파이프라인 1호를 오늘 퇴근 후 당장 착수할 수 있는 3단계 실천 행동을 제시해줘.`;
      } else if (topicType === 'leverage') {
        promptText = `[10조 자산가 4대 레버리지 전환 진단]
나의 오늘 핵심 과업: "${focus}"
질문: 이 과업에서 나의 1차원적 시간 노동을 덜어내고, 자본/시스템/코드/미디어 4대 레버리지를 극대화하여 100배의 결과물을 낼 수 있는 3단계 레버리지 전환 전략을 제시해줘.`;
      } else if (topicType === 'pipeline') {
        promptText = `[자립형 비즈니스 파이프라인 3단계 설계]
직장인/개인이 월급을 넘어 10조 자산가로 향하는 첫 번째 독자적 현금흐름 파이프라인 구축 3단계(1단계 프로토타입 검증, 2단계 수익화 시스템, 3단계 스케일업 및 자본화)를 현실적이고 날카롭게 설계해줘.`;
      } else if (topicType === 'allocation') {
        promptText = `[자본 배분 & 복리 재투자 원칙]
10조 자산가(워런 버핏, 레이 달리오 등)가 지키는 최고의 자본 배분(Capital Allocation) 및 복리 법칙 4가지를 알려주고, 오늘 하루 벌어들인 자원(시간, 돈, 에너지)을 어떻게 재투자해야 하는지 구체적인 행동 가이드를 제시해줘.`;
      }

      const res = await geminiClient.generateText(promptText);
      trillionAiBox.innerHTML = this.parseMarkdown(res);
      this.showToast('Gemini 10조 자산가 전략 지침이 도착했습니다! 👑');
    };

    if (aiTrillionCoachBtn) {
      aiTrillionCoachBtn?.addEventListener('click', () => requestTrillionCoaching('daily'));
    }

    document.querySelectorAll('.trillion-prompt-btn').forEach(btn => {
      btn?.addEventListener('click', () => {
        requestTrillionCoaching(btn.dataset.type);
      });
    });

    document.querySelectorAll('.trillion-action-btn').forEach(btn => {
      btn?.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.pushActionToTodayTodo(action, 'career');
        this.showToast('10조 자산가 실행 행동이 오늘의 To-Do로 등록되었습니다! ⚡');
      });
    });

    // ==========================================
    // 💡 Idea Quick Memo Events (사이드바 & 탭)
    // ==========================================
    if (this.sidebarQuickMemoForm) {
      this.sidebarQuickMemoForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.sidebarQuickMemoInput.value.trim();
        if (!text) return;
        storage.addMemo({
          title: text,
          content: '사이드바에서 1초 퀵 캡처된 아이디어입니다.',
          category: 'idea',
          pinned: false,
          date: this.currentDate
        });
        this.sidebarQuickMemoInput.value = '';
        this.renderMemos();
        this.renderTabCalendar('memo');
        this.showToast('⚡ 아이디어가 1초 만에 캡처되어 메모장에 저장되었습니다! 💡');
      });
    }

    if (this.memoCategoryPills) {
      this.memoCategoryPills.querySelectorAll('.mcat-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          this.memoCategoryPills.querySelectorAll('.mcat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedMemoCategory = btn.dataset.cat;
        });
      });
    }

    if (this.memoAddForm) {
      this.memoAddForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.memoTitleInput.value.trim();
        const content = this.memoContentInput.value.trim();
        const pinned = this.memoPinCheck ? this.memoPinCheck.checked : false;
        if (!title) return;

        storage.addMemo({
          title,
          content,
          category: this.selectedMemoCategory || 'idea',
          pinned,
          date: this.currentDate
        });

        this.memoTitleInput.value = '';
        this.memoContentInput.value = '';
        if (this.memoPinCheck) this.memoPinCheck.checked = false;
        this.renderMemos();
        this.renderTabCalendar('memo');
        this.showToast('아이디어 메모가 성공적으로 등록되었습니다! 📝');
      });
    }

    if (this.memoFilterList) {
      this.memoFilterList.querySelectorAll('.filter-pill').forEach(btn => {
        btn?.addEventListener('click', () => {
          this.memoFilterList.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeMemoFilter = btn.dataset.filter;
          this.renderMemos();
        });
      });
    }

    if (this.memoSearchInput) {
      this.memoSearchInput?.addEventListener('input', () => this.renderMemos());
    }

    if (this.aiIdeaBrainstormBtn) {
      this.aiIdeaBrainstormBtn?.addEventListener('click', async () => {
        this.aiIdeaBrainstormBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 브레인스토밍 중...';
        const dayData = storage.getDayData(this.currentDate);
        const focus = dayData.focus || '커리어 성장 및 생산성 극대화';

        const prompt = `나의 현재 핵심 관심사: [${focus}]
위 주제를 바탕으로 직장인이 당장 실험해볼 수 있는 신선하고 강력한 1% 아이디어 3가지를 도출해줘 (아이디어 제목과 2줄 실행 힌트).`;

        const res = await geminiClient.generateText(prompt);
        this.aiIdeaBrainstormBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Gemini 아이디어 브레인스토밍';

        storage.addMemo({
          title: '🤖 [AI 추천] ' + focus + ' 혁신 아이디어',
          content: res,
          category: 'idea',
          pinned: true,
          date: this.currentDate
        });

        this.renderMemos();
        this.renderTabCalendar('memo');
        this.showToast('Gemini가 새로운 아이디어를 메모장에 꽂아드렸습니다! 💡');
      });
    }

    // ==========================================
    // 🌳 Visual Tree Mode Toggle
    // ==========================================
    if (this.toggleHierarchyViewModeBtn) {
      this.toggleHierarchyViewModeBtn?.addEventListener('click', () => {
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
      this.generateWeeklyReportBtn?.addEventListener('click', async () => {
        await this.generateWeeklyRetroReport();
      });
    }

    if (this.copyWeeklyReportBtn) {
      this.copyWeeklyReportBtn?.addEventListener('click', () => {
        const text = this.weeklyReportContent.innerText;
        navigator.clipboard.writeText(text);
        this.showToast('주간 결산 리포트가 클립보드에 복사되었습니다! 📋');
      });
    }

    // ==========================================
    // ⏱️ Evening Budget Capacity Events
    // ==========================================
    if (this.eveningCapacityInput) {
      this.eveningCapacityInput?.addEventListener('change', () => {
        this.renderEveningOS();
      });
    }

    // ==========================================
    // 🌙 Evening OS Events (퇴근 후 야간 실행)
    // ==========================================
    if (this.saveEveningGoalBtn) {
      this.saveEveningGoalBtn?.addEventListener('click', () => {
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
      this.aiEveningRoutineBtn?.addEventListener('click', async () => {
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
      this.eveningTodayForm?.addEventListener('submit', (e) => {
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
      this.eveningTomorrowForm?.addEventListener('submit', (e) => {
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
      this.pushTomorrowToTodayBtn?.addEventListener('click', () => {
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
      this.saveEveningReviewBtn?.addEventListener('click', () => {
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
        btn?.addEventListener('click', () => {
          this.hierarchyTabsBar.querySelectorAll('.hierarchy-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeHierarchyLevel = btn.dataset.hlevel;
          this.filterHierarchyView();
        });
      });
    }

    // 인라인 빠른 추가 폼 일괄 바인딩
    document.querySelectorAll('.hierarchy-inline-form').forEach(form => {
      form?.addEventListener('submit', (e) => {
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

    const aiBottomUpCascadeBtn = document.getElementById('aiBottomUpCascadeBtn');
    if (aiBottomUpCascadeBtn) {
      aiBottomUpCascadeBtn?.addEventListener('click', async () => {
        const dayData = storage.getDayData(this.currentDate);
        const todos = dayData.todos || [];
        const dailyGoals = storage.getGoals().filter(g => g.horizon === 'daily');

        const items = [...dailyGoals.map(g => g.title), ...todos.map(t => t.text)].slice(0, 5);
        const contextText = items.length > 0 ? items.join(', ') : '오늘의 핵심 딥워크 및 비즈니스 실행';

        aiBottomUpCascadeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 상향 연계 연산 중...';

        const prompt = `[일일 실행 기반 상향식(Bottom-Up) 목표 피라미드 자동 연계]
오늘 나의 핵심 실행 항목: [${contextText}]

위 일일 행동들을 바탕으로, 이 행동들이 궁극적으로 어떤 주간 스프린트, 월간 마일스톤, 년간 장기 비전으로 수렴해야 하는지 완벽한 상향식 계층 피라미드를 구성해줘:
1. ☀️ DAILY: 일일 핵심 실행 과업 (현재 행동 최적화)
2. ⚡ WEEKLY: 이번 주 완수할 주간 스프린트 목표
3. 🎯 MONTHLY: 이번 달 도달할 월간 정량적 마일스톤
4. 🚀 YEARLY: 1~3년 내 달성할 년간 북극성 비전`;

        const res = await geminiClient.generateText(prompt);
        aiBottomUpCascadeBtn.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> 일일 ➔ 년간 상향 연계';

        this.openGlobalAiModal('🚀 일일 실행 ➔ 년간 비전 상향 연계 피라미드 리포트', this.parseMarkdown(res));
      });
    }

    if (this.aiHierarchyBreakdownBtn) {
      this.aiHierarchyBreakdownBtn?.addEventListener('click', async () => {
        const goals = storage.getGoals().filter(g => g.horizon === 'yearly' || g.horizon === 'long');
        const visionText = goals.length > 0 ? goals.map(g => g.title).join(', ') : '10조 자산가 도약 및 글로벌 비즈니스 인프라 구축';

        this.aiHierarchyBreakdownBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 4단계 피라미드 생성 중...';
        const prompt = `나의 장기 비전: [${visionText}]
위 장기 비전을 실현하기 위해 일일 ➔ 주간 ➔ 월간 ➔ 년간 4단계 목표 피라미드를 완벽한 OKR 형태로 작성해줘:
1. DAILY: 오늘 끝낼 1% 핵심 액션 1개
2. WEEKLY: 이번 주 스프린트 과업 1개
3. MONTHLY: 이번 달 핵심 마일스톤 프로젝트 1개
4. YEARLY: 년간 핵심 목표 1개`;

        const res = await geminiClient.generateText(prompt);
        this.aiHierarchyBreakdownBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> 🤖 AI 4단계 목표 피라미드 분해 & 정렬';

        storage.addGoal({ pillar: 'career', horizon: 'daily', title: '오늘 최우선 비즈니스 자동화 1개 딥워크 끝내기', keyResult: '100% 완료', deadline: this.currentDate, progress: 0 });
        storage.addGoal({ pillar: 'study', horizon: 'weekly', title: '이번 주 10조 자산가 의사결정 모델 분석 및 실무 적용', keyResult: '주간 10시간 연구 확보', deadline: '2026-08-23', progress: 50 });
        storage.addGoal({ pillar: 'career', horizon: 'monthly', title: '이번 달 글로벌 AI SaaS 파이프라인 분석 리포트 완성', keyResult: '초기 유료 전환 검증', deadline: '2026-08-31', progress: 40 });
        storage.addGoal({ pillar: 'wealth', horizon: 'yearly', title: '자립형 비즈니스 파이프라인 구축 및 100억 PMF 달성', keyResult: '독점적 해자 확보', deadline: '2027-12-31', progress: 20 });

        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.showToast('Gemini가 일일 ➔ 년간 4단계 계층 목표 피라미드를 구축했습니다! 🚀');
      });
    }
    const closeGoalModal = () => this.goalModal.classList.remove('active');
    if (this.closeGoalModalBtn) this.closeGoalModalBtn?.addEventListener('click', closeGoalModal);
    if (this.cancelGoalBtn) this.cancelGoalBtn?.addEventListener('click', closeGoalModal);

    if (this.aiGoalBreakdownBtn) {
      this.aiGoalBreakdownBtn?.addEventListener('click', async () => {
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
      this.goalForm?.addEventListener('submit', (e) => {
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
        btn?.addEventListener('click', () => {
          this.goalPillarFilters.querySelectorAll('.pillar-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.goalPillarFilter = btn.dataset.pillar;
          this.renderGoals();
        });
      });
    }

    // Daily Focus Save
    this.saveFocusBtn?.addEventListener('click', () => {
      const focus = this.focusInput.value.trim();
      storage.updateDayData(this.currentDate, { focus });
      this.renderAllTabCalendars();
      this.showToast('오늘의 북극성 미션이 확정되었습니다! 🎯');
    });
    this.focusInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveFocusBtn.click();
    });

    // AI Study Suggest
    if (this.aiStudySuggestBtn) {
      this.aiStudySuggestBtn?.addEventListener('click', async () => {
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
    this.saveStudyDashBtn?.addEventListener('click', () => {
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
      this.aiStudyAnalyzeBtn?.addEventListener('click', async () => {
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
      btn?.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        storage.updateDayData(this.currentDate, { mood });
        this.highlightMood(mood);
        this.renderAllTabCalendars();
        this.renderAnalytics();
        this.showToast('오늘의 마인드셋이 기록되었습니다.');
      });
    });

    // To-Do Add
    this.todoForm?.addEventListener('submit', (e) => {
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
    this.saveStudyNotesBtn?.addEventListener('click', () => {
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
    this.studySearchInput?.addEventListener('input', (e) => {
      clearTimeout(studySearchTimeout);
      studySearchTimeout = setTimeout(() => {
        this.studySearchQuery = e.target.value.trim().toLowerCase();
        this.renderStudyArchive();
      }, 250);
    });

    // Journal Actions
    if (this.aiAutoDraftJournalBtn) {
      this.aiAutoDraftJournalBtn?.addEventListener('click', () => {
        this.generateAiJournalDraft();
      });
    }

    if (this.extractActionGuideBtn) {
      this.extractActionGuideBtn?.addEventListener('click', () => {
        this.extractActionGuideFromJournal();
      });
    }

    if (this.journalSplitToggle) {
      this.journalSplitToggle?.addEventListener('click', () => {
        this.toggleSplitView();
      });
    }

    // ==========================================
    // 📖 Journal Aesthetic & Quick Mood/Weather Events
    // ==========================================
    const weatherBar = document.getElementById('journalWeatherBar');
    if (weatherBar) {
      weatherBar.querySelectorAll('.weather-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          weatherBar.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const dayData = storage.getDayData(this.currentDate);
          storage.updateDayData(this.currentDate, {
            journal: { ...dayData.journal, weather: btn.dataset.weather }
          });
          this.renderJournalRightCalendar();
          this.showToast(`날씨가 [${btn.dataset.weather}]로 설정되었습니다!`);
        });
      });
    }

    const jMoodBar = document.getElementById('journalMoodBar');
    if (jMoodBar) {
      jMoodBar.querySelectorAll('.jmood-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          jMoodBar.querySelectorAll('.jmood-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mood = btn.dataset.mood;
          this.setMood(mood);
          this.renderJournalRightCalendar();
          this.showToast(`오늘의 기분이 [${btn.innerText}]으로 기록되었습니다! ✨`);
        });
      });
    }

    // Ctrl+V 클립보드 이미지 붙여넣기 지원
    this.journalContent?.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            const dayData = storage.getDayData(this.currentDate);
            const photos = dayData.journal.photos || [];
            photos.push(evt.target.result);
            storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
            this.renderJournalPhotos();
            this.renderJournalRightCalendar();
            this.showToast('클립보드 이미지가 일기에 즉시 첨부되었습니다! 📸');
          };
          reader.readAsDataURL(blob);
        }
      }
    });

    if (this.copyJournalTextBtn) {
      this.copyJournalTextBtn?.addEventListener('click', () => {
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
      this.journalPhotoInput?.addEventListener('change', (e) => {
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
    this.journalTitle?.addEventListener('input', triggerAutoSave);
    this.journalContent?.addEventListener('input', triggerAutoSave);

    // Ctrl+S & Shortcut support
    this.journalContent?.addEventListener('keydown', (e) => {
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

    this.saveJournalBtn?.addEventListener('click', () => this.saveJournal(true));
    this.journalPreviewToggle?.addEventListener('click', () => this.togglePreview());
    this.exportMdBtn?.addEventListener('click', () => this.exportMarkdown());
    this.printJournalBtn?.addEventListener('click', () => window.print());

    this.editorToolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn?.addEventListener('click', () => this.applyToolbarCmd(btn.dataset.cmd));
    });

    document.querySelectorAll('.btn-template').forEach(btn => {
      btn?.addEventListener('click', () => this.applyTemplate(btn.dataset.template));
    });

    // Wizard
    if (this.openWizardBtn) this.openWizardBtn?.addEventListener('click', () => this.wizardModal.classList.add('active'));
    if (this.closeWizardModalBtn) this.closeWizardModalBtn?.addEventListener('click', () => this.wizardModal.classList.remove('active'));
    if (this.applyWizardBtn) this.applyWizardBtn?.addEventListener('click', () => this.applyGuidedWizard());

    // Speech & Timer
    if (this.speechBtn) {
      this.speechBtn?.addEventListener('click', () => {
        if (!this.recognition) {
          this.showToast('음성 인식을 지원하지 않는 브라우저입니다.', 'error');
          return;
        }
        if (this.isRecording) this.stopRecording();
        else this.startRecording();
      });
    }

    if (this.startTimerBtn) {
      this.startTimerBtn?.addEventListener('click', () => {
        if (this.timerRunning) this.pauseTimer();
        else this.startTimer();
      });
    }
    if (this.resetTimerBtn) this.resetTimerBtn?.addEventListener('click', () => this.resetTimer());

    // Gemini AI Coach Tab
    if (this.aiChatForm) {
      this.aiChatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = this.aiChatInput.value.trim();
        if (!q) return;
        this.aiChatInput.value = '';
        await this.handleAiCoachMessage(q);
      });
    }

    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn?.addEventListener('click', () => {
        this.handleAiCoachMessage(btn.dataset.prompt);
      });
    });

    // Principles Modal
    if (this.addPrincipleModalBtn) {
      this.addPrincipleModalBtn?.addEventListener('click', () => this.principleModal.classList.add('active'));
    }
    const closeP = () => this.principleModal.classList.remove('active');
    if (this.closePrincipleModalBtn) this.closePrincipleModalBtn?.addEventListener('click', closeP);
    if (this.cancelPrincipleBtn) this.cancelPrincipleBtn?.addEventListener('click', closeP);

    if (this.principleForm) {
      this.principleForm?.addEventListener('submit', (e) => {
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
      this.aiPrincipleSuggestBtn?.addEventListener('click', async () => {
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
    this.addHabitModalBtn?.addEventListener('click', () => {
      this.renderModalHabits();
      this.habitModal.classList.add('active');
    });
    this.closeHabitModalBtn?.addEventListener('click', () => this.habitModal.classList.remove('active'));
    this.newHabitForm?.addEventListener('submit', (e) => {
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
    this.addTimeBlockBtn?.addEventListener('click', () => this.timeBlockModal.classList.add('active'));
    const closeTb = () => this.timeBlockModal.classList.remove('active');
    this.closeTimeBlockModalBtn?.addEventListener('click', closeTb);
    this.cancelTimeBlockBtn?.addEventListener('click', closeTb);
    this.timeBlockForm?.addEventListener('submit', (e) => {
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
    this.energySlider?.addEventListener('input', (e) => {
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
    this.sleepMinusBtn?.addEventListener('click', () => updateSleep(-0.5));
    this.sleepPlusBtn?.addEventListener('click', () => updateSleep(0.5));
    this.sleepInput?.addEventListener('change', () => updateSleep(0));

    let memoTimeout;
    this.quickMemoInput?.addEventListener('input', (e) => {
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
    this.addTagBtn?.addEventListener('click', addTag);
    this.journalTagInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });

    // Calendar Tab Navigation
    this.calPrevMonth?.addEventListener('click', () => {
      this.calMonth--;
      if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
      this.renderCalendar();
    });
    this.calNextMonth?.addEventListener('click', () => {
      this.calMonth++;
      if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
      this.renderCalendar();
    });
    this.calTodayBtn?.addEventListener('click', () => {
      const now = new Date();
      this.calYear = now.getFullYear();
      this.calMonth = now.getMonth();
      this.renderCalendar();
    });

    // Archive Search
    let searchTimeout;
    this.archiveSearchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.archiveSearchQuery = e.target.value.trim().toLowerCase();
        this.renderArchive();
      }, 250);
    });

    this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(pill => {
      pill?.addEventListener('click', () => {
        this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.archiveFilterMood = pill.dataset.filter;
        this.renderArchive();
      });
    });

    // GitHub Cloud Sync
    const syncGitHubBtn = document.getElementById('syncGitHubBtn');
    syncGitHubBtn?.addEventListener('click', async () => {
      syncGitHubBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> GitHub에 동기화 중...';
      const res = await storage.syncGitHub();
      syncGitHubBtn.innerHTML = '<i class="fa-brands fa-github"></i> 지금 GitHub에 즉시 동기화';
      if (res.status === 'success') {
        this.showToast('🚀 GitHub에 모든 데이터가 안전하게 동기화 및 백업되었습니다!');
      } else {
        this.showToast('동기화 실패: ' + (res.message || '오류 발생'), 'error');
      }
    });

    // Backup & Restore
    this.backupBtn?.addEventListener('click', () => this.backupModal.classList.add('active'));
    this.closeBackupModalBtn?.addEventListener('click', () => this.backupModal.classList.remove('active'));
    this.exportJsonBtn?.addEventListener('click', () => {
      storage.exportJson();
      this.showToast('통합 데이터가 data_state.json으로 다운로드되었습니다! 💾');
    });

    const exportGoalsBtn = document.getElementById('exportGoalsJsonBtn');
    if (exportGoalsBtn) {
      exportGoalsBtn?.addEventListener('click', () => {
        storage.exportGoalsJson();
        this.showToast('목표 로드맵이 goals.json으로 다운로드되었습니다! 🎯');
      });
    }

    const exportPrinciplesBtn = document.getElementById('exportPrinciplesJsonBtn');
    if (exportPrinciplesBtn) {
      exportPrinciplesBtn?.addEventListener('click', () => {
        storage.exportPrinciplesJson();
        this.showToast('인생 원칙이 principles.json으로 다운로드되었습니다! 💎');
      });
    }

    const exportMemosBtn = document.getElementById('exportMemosJsonBtn');
    if (exportMemosBtn) {
      exportMemosBtn?.addEventListener('click', () => {
        const memos = storage.getMemos();
        const blob = new Blob([JSON.stringify(memos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memos.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('아이디어 메모가 memos.json으로 다운로드되었습니다! 💡');
      });
    }

    const exportWeeklyBtn = document.getElementById('exportWeeklyJsonBtn');
    if (exportWeeklyBtn) {
      exportWeeklyBtn?.addEventListener('click', () => {
        const data = { '2026-W34': { totalDeepHours: 14.5, todoCompletionRate: 85, sprintGoalRate: 80, habitSuccessDays: 6 } };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'weekly_retros.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('주간 결산 리포트가 weekly_retros.json으로 다운로드되었습니다! 📊');
      });
    }

    this.triggerImportBtn?.addEventListener('click', () => this.importJsonInput.click());
    this.importJsonInput?.addEventListener('change', (e) => {
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

    this.resetDataBtn?.addEventListener('click', async () => {
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
        btn?.addEventListener('click', () => {
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
        btn?.addEventListener('click', () => {
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
    this.renderTabCalendar('trillion');
    this.renderTabCalendar('memo');
    this.renderTabCalendar('evening');
    this.renderTabCalendar('weekly');
    this.renderTabCalendar('ai');
    this.renderTabCalendar('study');
    this.renderTabCalendar('goals');
    this.renderJournalRightCalendar();
    this.renderTabCalendar('principles');
  }

  renderDashboardRightCalendar() {
    const titleEl = document.getElementById('dashCalTitle');
    const subtitleEl = document.getElementById('dashCalSubtitle');
    const gridEl = document.getElementById('dashCalGrid');
    const listEl = document.getElementById('dashCalMonthList');
    const summaryBadge = document.getElementById('dashCalMonthSummaryBadge');
    if (!titleEl || !gridEl) return;

    const st = this.tabCalState.dashboard || { year: new Date().getFullYear(), month: new Date().getMonth() };
    titleEl.textContent = `${st.year}년 ${st.month + 1}월`;
    gridEl.innerHTML = '';

    const first = new Date(st.year, st.month, 1);
    const last = new Date(st.year, st.month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    // Previous month filler
    const prevLast = new Date(st.year, st.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell other-month';
      cell.innerHTML = `<span class="dash-cal-num">${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const allDays = storage.data.days || {};
    const ymPrefix = `${st.year}-${String(st.month + 1).padStart(2, '0')}`;

    let monthRecordedDays = 0;
    let monthTotalTodos = 0;
    let monthDoneTodos = 0;
    let monthEesSum = 0;
    let monthEesCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = allDays[fullDate] || {};
      const todos = dayData.todos || [];
      const done = todos.filter(t => t.completed).length;
      const hasFocus = !!dayData.focus;
      const hasJournal = dayData.journal && (dayData.journal.title || dayData.journal.content);
      const isComplete = (todos.length > 0 && done === todos.length);
      const isPartial = (todos.length > 0 && done > 0 && !isComplete);

      if (todos.length > 0 || hasFocus || hasJournal) {
        monthRecordedDays++;
        monthTotalTodos += todos.length;
        monthDoneTodos += done;
        if (dayData.ees && dayData.ees.total) {
          monthEesSum += dayData.ees.total;
          monthEesCount++;
        }
      }

      // Tooltip
      const tooltipParts = [`[${fullDate}]`];
      if (hasFocus) tooltipParts.push(`🎯 북극성: ${dayData.focus}`);
      if (todos.length > 0) tooltipParts.push(`⚡ 할 일: ${done}/${todos.length} (${Math.round((done / todos.length) * 100)}%)`);
      if (hasJournal) tooltipParts.push(`📝 일기 작성됨`);
      cell.title = tooltipParts.join('\n');

      let dotHtml = '';
      if (isComplete) {
        dotHtml += `<span class="dash-cal-dot complete" title="100% 완료"></span>`;
      } else if (isPartial) {
        dotHtml += `<span class="dash-cal-dot progress" title="진행 중"></span>`;
      } else if (todos.length > 0) {
        dotHtml += `<span class="dash-cal-dot" style="background:#64748b;" title="대기 중"></span>`;
      }

      if (hasFocus) {
        dotHtml += `<span style="font-size:0.62rem; color:var(--accent-gold); line-height:1;" title="북극성 미션">👑</span>`;
      }
      if (hasJournal) {
        dotHtml += `<span class="dash-cal-dot journal" title="일기"></span>`;
      }

      cell.innerHTML = `
        <span class="dash-cal-num">${d}</span>
        <div class="dash-cal-badges">${dotHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }

    // Monthly Subtitle Stats
    if (subtitleEl) {
      const avgRate = monthTotalTodos > 0 ? Math.round((monthDoneTodos / monthTotalTodos) * 100) : 0;
      const avgEes = monthEesCount > 0 ? Math.round(monthEesSum / monthEesCount) : null;
      subtitleEl.innerHTML = `🎯 To-Do ${avgRate}% 달성 · ${monthRecordedDays}일 실천${avgEes ? ` · EES 평균 ${avgEes}점` : ''}`;
    }

    if (summaryBadge) {
      summaryBadge.textContent = `${monthRecordedDays}일 기록`;
    }

    // Render Timeline Feed List
    if (listEl) {
      listEl.innerHTML = '';
      const monthKeys = Object.keys(allDays).filter(k => k.startsWith(ymPrefix)).sort().reverse();

      if (monthKeys.length === 0) {
        listEl.innerHTML = `
          <div style="text-align:center; color:var(--text-muted); padding:24px 10px; font-size:0.75rem;">
            <i class="fa-solid fa-calendar-plus" style="font-size:1.5rem; margin-bottom:6px; opacity:0.5;"></i>
            <p>이달에 작성된 실행 기록이 없습니다.<br>오늘의 첫 북극성 미션과 To-Do를 시작해보세요! 🚀</p>
          </div>
        `;
        return;
      }

      const moodEmojis = { great: '😆', good: '😊', neutral: '😐', tired: '🥱', stressed: '😣' };
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

      monthKeys.forEach(dStr => {
        const day = allDays[dStr];
        const dayDate = new Date(dStr);
        const dayOfWeek = dayNames[dayDate.getDay()] || '';
        const dayNum = dStr.split('-')[2];
        const todos = day.todos || [];
        const done = todos.filter(t => t.completed).length;
        const total = todos.length;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;
        const mood = day.mood ? moodEmojis[day.mood] || '✨' : '✨';
        const focusText = day.focus || (todos.length > 0 ? todos[0].text : '기록 없음');
        const isCurrent = (dStr === this.currentDate);

        const card = document.createElement('div');
        card.className = `dash-feed-card ${isCurrent ? 'active' : ''}`;
        card.innerHTML = `
          <div class="dash-feed-top">
            <span class="dash-feed-date">
              <i class="fa-regular fa-calendar" style="color:var(--accent-primary);"></i>
              ${dayNum}일 (${dayOfWeek}) ${mood}
            </span>
            <span class="badge ${rate === 100 && total > 0 ? 'badge-success' : (rate >= 50 ? 'badge-warning' : 'badge-secondary')}" style="font-size:0.68rem; padding:1px 5px;">
              ${done}/${total} 완료 (${rate}%)
            </span>
          </div>
          <div class="dash-feed-focus">
            ${day.focus ? '🎯 ' : '⚡ '}${this.escapeHtml(focusText)}
          </div>
          <div class="dash-feed-progress-bar">
            <div class="dash-feed-progress-fill" style="width: ${rate}%;"></div>
          </div>
        `;

        card.addEventListener('click', () => {
          this.setDate(dStr);
        });

        listEl.appendChild(card);
      });
    }
  }

  renderTabCalendar(target) {
    if (target === 'dashboard') {
      this.renderDashboardRightCalendar();
      return;
    }
    if (target === 'journal') {
      this.renderJournalRightCalendar();
      return;
    }

    const titleEl = document.getElementById(`${target}CalTitle`);
    const subtitleEl = document.getElementById(`${target}CalSubtitle`);
    const gridEl = document.getElementById(`${target}CalGrid`);
    const listEl = document.getElementById(`${target}CalMonthList`);
    const countBadge = document.getElementById(`${target}MonthCountBadge`);
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
      cell.className = 'dash-cal-cell other-month';
      cell.innerHTML = `<span class="dash-cal-num">${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const allDays = storage.data.days || {};
    let recordedCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = allDays[fullDate] || {};
      let dotsHtml = '';
      let tooltipLines = [`[${fullDate}]`];

      if (target === 'trillion') {
        const todos = (dayData.todos || []).filter(t => t.text && (t.text.includes('[레버리지') || t.text.includes('[초격차') || t.text.includes('[자립') || t.text.includes('[역량') || t.text.includes('10조') || t.text.includes('도면') || t.text.includes('집필')));
        const dw = dayData.deepwork || [];
        if (todos.length > 0 || dw.length > 0) {
          recordedCount++;
          const done = todos.filter(t => t.completed).length;
          if (done === todos.length && todos.length > 0) {
            dotsHtml += '<span class="dash-cal-dot complete" title="10조 과업 완수"></span>';
          } else {
            dotsHtml += '<span class="dash-cal-dot" style="background:#f59e0b;" title="10조 과업 진행"></span>';
          }
          tooltipLines.push(`👑 10조 과업: ${done}/${todos.length} 완료`);
        }
      } else if (target === 'memo') {
        const memos = storage.getMemos().filter(m => m.date === fullDate);
        if (memos.length > 0) {
          recordedCount += memos.length;
          dotsHtml += '<span class="dash-cal-dot" style="background:#facc15;" title="아이디어 메모"></span>';
          tooltipLines.push(`💡 메모 ${memos.length}개: ${memos[0].title}`);
        }
      } else if (target === 'evening') {
        const er = dayData.eveningRoutine || {};
        const hasER = er.goal || (er.todayTasks && er.todayTasks.length > 0);
        if (hasER) {
          recordedCount++;
          const done = (er.todayTasks || []).filter(t => t.completed).length;
          dotsHtml += '<span class="dash-cal-dot" style="background:#a855f7;" title="야간 루틴"></span>';
          tooltipLines.push(`🌙 저녁 몰입: ${er.goal || '루틴'} (${done}/${(er.todayTasks||[]).length})`);
        }
      } else if (target === 'goals') {
        const goals = storage.getGoals().filter(g => g.deadline === fullDate);
        if (goals.length > 0) {
          recordedCount += goals.length;
          dotsHtml += '<span class="dash-cal-dot" style="background:#ec4899;" title="목표 D-Day"></span>';
          tooltipLines.push(`🎯 D-Day: ${goals.map(g => g.title).join(', ')}`);
        }
      } else if (target === 'weekly') {
        const todos = dayData.todos || [];
        if (todos.length > 0) {
          recordedCount++;
          const done = todos.filter(t => t.completed).length;
          dotsHtml += `<span class="dash-cal-dot" style="background:${done === todos.length ? '#10b981' : '#3b82f6'};"></span>`;
          tooltipLines.push(`📊 실행 To-Do ${done}/${todos.length} 완료`);
        }
      } else if (target === 'ai') {
        if (dayData.focus || (dayData.todos && dayData.todos.length > 0)) {
          recordedCount++;
          dotsHtml += '<span class="dash-cal-dot" style="background:#06b6d4;" title="AI 코칭"></span>';
          tooltipLines.push(`🤖 포커스: ${dayData.focus || '실행 중'}`);
        }
      } else if (target === 'study') {
        const study = dayData.study || {};
        const hasStudy = study.topic || (study.actualHours > 0) || (study.photos && study.photos.length > 0);
        if (hasStudy) {
          recordedCount++;
          dotsHtml += '<span class="dash-cal-dot" style="background:#facc15;" title="학습 기록"></span>';
          if (study.photos && study.photos.length > 0) dotsHtml += '<span class="dash-cal-dot" style="background:#38bdf8;" title="학습 캡처"></span>';
          tooltipLines.push(`📚 학습: ${study.topic || '학습'} (${study.actualHours || 0}h)`);
        }
      } else if (target === 'principles') {
        if (dayData.journal && dayData.journal.title) {
          recordedCount++;
          dotsHtml += '<span class="dash-cal-dot" style="background:#f59e0b;" title="원칙 회고"></span>';
          tooltipLines.push(`💎 일기/원칙: ${dayData.journal.title}`);
        }
      }

      cell.title = tooltipLines.join('\n');
      cell.innerHTML = `
        <span class="dash-cal-num">${d}</span>
        <div class="dash-cal-dots">${dotsHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }

    if (subtitleEl) {
      if (target === 'trillion') subtitleEl.innerHTML = `👑 실천 기록 ${recordedCount}일`;
      else if (target === 'memo') subtitleEl.innerHTML = `💡 아이디어 ${recordedCount}개`;
      else if (target === 'evening') subtitleEl.innerHTML = `🌙 야간 몰입 ${recordedCount}일`;
      else if (target === 'goals') subtitleEl.innerHTML = `🎯 마감 목표 ${recordedCount}개`;
      else if (target === 'weekly') subtitleEl.innerHTML = `📊 기록 ${recordedCount}일`;
      else if (target === 'ai') subtitleEl.innerHTML = `🤖 코칭 ${recordedCount}일`;
      else if (target === 'study') subtitleEl.innerHTML = `📚 학습 ${recordedCount}일`;
      else if (target === 'principles') subtitleEl.innerHTML = `💎 회고 ${recordedCount}일`;
    }

    if (countBadge) {
      countBadge.textContent = `${recordedCount}건`;
    }

    if (listEl) {
      this.renderTabMonthList(target, listEl, st.year, st.month);
    }
  }

  renderTabMonthList(target, listEl, year, month) {
    listEl.innerHTML = '';
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    const allDays = storage.data.days || {};
    const dateKeys = Object.keys(allDays).filter(k => k.startsWith(ym)).sort().reverse();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    let renderedCount = 0;

    dateKeys.forEach(dStr => {
      const day = allDays[dStr];
      const dayDate = new Date(dStr);
      const dayOfWeek = dayNames[dayDate.getDay()] || '';
      const dayNum = dStr.split('-')[2];
      const isCurrent = (dStr === this.currentDate);

      let cardHtml = '';

      if (target === 'trillion') {
        const todos = (day.todos || []).filter(t => t.text && (t.text.includes('[레버리지') || t.text.includes('[초격차') || t.text.includes('[자립') || t.text.includes('[역량') || t.text.includes('10조') || t.text.includes('도면') || t.text.includes('집필')));
        if (todos.length === 0) return;
        const done = todos.filter(t => t.completed).length;
        const pct = Math.round((done / todos.length) * 100);
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-crown text-yellow"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge ${pct === 100 ? 'badge-primary' : 'badge-warning'}" style="font-size:0.68rem; padding:1px 5px;">${done}/${todos.length} 완료</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(todos[0].text)}</div>
          <div class="dash-feed-progress-bar"><div class="dash-feed-progress-fill" style="width:${pct}%;"></div></div>
        `;
      } else if (target === 'memo') {
        const dayMemos = storage.getMemos().filter(m => m.date === dStr);
        if (dayMemos.length === 0) return;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-lightbulb text-yellow"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge badge-warning" style="font-size:0.68rem; padding:1px 5px;">${dayMemos.length}개</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(dayMemos[0].title)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml((dayMemos[0].content || '').substring(0, 50))}</div>
        `;
      } else if (target === 'evening') {
        const er = day.eveningRoutine || {};
        if (!er.goal && (!er.todayTasks || er.todayTasks.length === 0)) return;
        const tasks = er.todayTasks || [];
        const done = tasks.filter(t => t.completed).length;
        const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 100;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-moon text-purple"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge badge-primary" style="font-size:0.68rem; padding:1px 5px;">${er.actualHours || 2.0}h (${pct}%)</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(er.goal || tasks[0]?.text || '야간 몰입 루틴')}</div>
          <div class="dash-feed-progress-bar"><div class="dash-feed-progress-fill" style="width:${pct}%;"></div></div>
        `;
      } else if (target === 'weekly') {
        const todos = day.todos || [];
        if (todos.length === 0) return;
        const done = todos.filter(t => t.completed).length;
        const pct = Math.round((done / todos.length) * 100);
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-chart-line text-blue"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge ${pct === 100 ? 'badge-primary' : 'badge-warning'}" style="font-size:0.68rem; padding:1px 5px;">${done}/${todos.length} (${pct}%)</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(day.focus || '일일 결산 완료')}</div>
          <div class="dash-feed-progress-bar"><div class="dash-feed-progress-fill" style="width:${pct}%;"></div></div>
        `;
      } else if (target === 'study') {
        const study = day.study || {};
        if (!study.topic && study.actualHours === 0 && (!study.photos || study.photos.length === 0)) return;
        const photoCount = study.photos ? study.photos.length : 0;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-book-open text-yellow"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge badge-primary" style="font-size:0.68rem; padding:1px 5px;">${study.actualHours || 1.0}h ${photoCount > 0 ? `📷 ${photoCount}` : ''}</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(study.topic || '학습 아카이브')}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml((study.til || study.notes || '').substring(0, 50))}</div>
        `;
      } else if (target === 'ai') {
        if (!day.focus && (!day.todos || day.todos.length === 0)) return;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge" style="background:rgba(6,182,212,0.2); color:#22d3ee; font-size:0.68rem; padding:1px 5px;">AI 지침</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(day.focus || '코칭 실행')}</div>
        `;
      } else if (target === 'goals') {
        const goals = storage.getGoals().filter(g => g.deadline === dStr);
        if (goals.length === 0) return;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-bullseye text-pink"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge badge-danger" style="font-size:0.68rem; padding:1px 5px;">D-Day</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(goals[0].title)}</div>
          <div class="dash-feed-progress-bar"><div class="dash-feed-progress-fill" style="width:${goals[0].progress || 0}%;"></div></div>
        `;
      } else if (target === 'principles') {
        if (!day.journal?.title) return;
        cardHtml = `
          <div class="dash-feed-top">
            <span class="dash-feed-date"><i class="fa-solid fa-gem text-amber"></i> ${dayNum}일 (${dayOfWeek})</span>
            <span class="badge badge-warning" style="font-size:0.68rem; padding:1px 5px;">원칙</span>
          </div>
          <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(day.journal.title)}</div>
        `;
      }

      if (cardHtml) {
        const card = document.createElement('div');
        card.className = `dash-feed-card ${isCurrent ? 'active' : ''}`;
        card.innerHTML = cardHtml;
        card.addEventListener('click', () => this.setDate(dStr));
        listEl.appendChild(card);
        renderedCount++;
      }
    });

    if (renderedCount === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color: var(--text-muted); padding: 20px 10px; font-size: 0.76rem;">
          <i class="fa-regular fa-calendar-check" style="font-size:1.4rem; opacity:0.4; margin-bottom:4px;"></i>
          <p>이달에 기록된 실천 데이터가 없습니다.<br>오늘의 실천을 기록해보세요! 🚀</p>
        </div>
      `;
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
      slider?.addEventListener('change', (e) => {
        const newP = parseInt(e.target.value);
        storage.updateGoal(goal.id, { progress: newP });
        this.renderGoals();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      card.querySelectorAll('.goal-push-todo-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          const actionText = `[목표연계: ${pInfo.label.split(' ')[1] || '실행'}] ${btn.dataset.action}`;
          const pillar = btn.dataset.pillar;
          this.pushActionToTodayTodo(actionText, pillar);
        });
      });

      card.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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

      card.querySelector('.journal-photo-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        photos.splice(idx, 1);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
        this.renderJournalPhotos();
        this.showToast('일기 사진이 삭제되었습니다.');
      });

      card?.addEventListener('click', () => {
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
    if (!this.navItems || !this.navItems.length) this.navItems = document.querySelectorAll('.nav-item');
    if (!this.tabPanes || !this.tabPanes.length) this.tabPanes = document.querySelectorAll('.tab-pane');

    (this.navItems || []).forEach(item => item?.classList?.toggle('active', item?.dataset?.tab === tabName));
    (this.tabPanes || []).forEach(pane => pane?.classList?.toggle('active', pane?.id === `pane-${tabName}`));

    // 모바일 하단 탭 바 동기화
    const mNav = document.getElementById('mobileBottomNav');
    if (mNav) {
      mNav.querySelectorAll('.mbottom-item[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
    }

    if (tabName === 'dashboard') this.renderTabCalendar('dashboard');
        if (tabName === 'ten-trillion') {
      this.tenTrillion?.setDate(this.currentDate);
      this.tenTrillion?.render();
      this.loadTrillionVision();
      this.renderTrillionIdeas();
      this.renderTabCalendar('trillion');
    }
    if (tabName === 'quick-memo') {
      this.renderMemos();
      this.renderTabCalendar('memo');
    }
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

  // ==========================================
  // 🏛️ 10조 자산가 비전 & 아이디어 뱅크 렌더러
  // ==========================================
  loadTrillionVision() {
    const mastery = storage.getTrillionMastery();
    const visInput = document.getElementById('trillionVisionInput');
    const val1 = document.getElementById('trillionVal1');
    const val2 = document.getElementById('trillionVal2');
    const val3 = document.getElementById('trillionVal3');

    if (visInput) visInput.value = mastery.vision || '';
    if (val1) val1.value = mastery.val1 || '';
    if (val2) val2.value = mastery.val2 || '';
    if (val3) val3.value = mastery.val3 || '';
  }

  renderTrillionIdeas() {
    const grid = document.getElementById('trillionIdeaGrid');
    if (!grid) return;
    const mastery = storage.getTrillionMastery();
    const ideas = mastery.ideas || [];
    grid.innerHTML = '';

    if (ideas.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color: var(--text-muted); padding: 30px;">
        <i class="fa-solid fa-lightbulb" style="font-size: 2rem; opacity: 0.5; margin-bottom: 8px;"></i>
        <p>아이디어 뱅크가 비어있습니다. 상단 입력창이나 [AI 10조 아이디어 발굴]로 첫 아이디어를 등록해보세요!</p>
      </div>`;
      return;
    }

    const catMap = {
      business: { label: '🏗️ 비즈니스/SaaS', cls: 'category-career' },
      invest: { label: '💰 자본/자산 인수', cls: 'category-wealth' },
      automation: { label: '⚡ 시스템/자동화', cls: 'category-study' },
      network: { label: '🌐 미디어/네트워크', cls: 'category-routine' }
    };

    ideas.forEach(idea => {
      const card = document.createElement('div');
      card.className = 'memo-card';
      const cat = catMap[idea.category] || { label: '아이디어', cls: 'category-career' };

      card.innerHTML = `
        <div class="memo-card-header">
          <span class="category-tag ${cat.cls}">${cat.label}</span>
          <button class="todo-delete-btn delete-tidea-btn" title="아이디어 삭제"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="memo-card-title">${this.escapeHtml(idea.title)}</div>
        <div class="memo-card-content">${this.escapeHtml(idea.content || '내용 없음')}</div>
        <div class="memo-card-footer">
          <span><i class="fa-regular fa-clock"></i> ${new Date(idea.createdAt).toLocaleDateString()}</span>
          <div class="memo-actions-group">
            <button class="memo-action-btn ai-scale-tidea-btn" title="Gemini 10조 스케일업 및 해자(Moat) 심화 분석">
              <i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> 10조 스케일업
            </button>
            <button class="memo-action-btn push-tidea-todo-btn" title="오늘의 실행 To-Do로 즉시 등록">
              <i class="fa-solid fa-bolt text-yellow"></i> To-Do 등록
            </button>
          </div>
        </div>
      `;

      // Push to Todo
      card.querySelector('.push-tidea-todo-btn')?.addEventListener('click', () => {
        this.pushActionToTodayTodo(`[10조 파이프라인] ${idea.title}`, 'wealth');
        this.showToast('10조 아이디어가 오늘의 실행 To-Do로 등록되었습니다! ⚡');
      });

      // AI Scale-up Analysis
      card.querySelector('.ai-scale-tidea-btn')?.addEventListener('click', async () => {
        const btn = card.querySelector('.ai-scale-tidea-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...';

        const prompt = `10조 아이디어: [${idea.title}]
내용: [${idea.content}]

위 아이디어를 10조 규모로 스케일업하기 위한 3대 핵심 전략을 날카롭게 기획해줘:
1. 🏰 **독점적 해자(Moat) 구축 방안:**
2. 🚀 **4대 레버리지(자본, 시스템, 코드, 미디어) 적용 계획:**
3. ⚡ **오늘 퇴근 후 1시간 만에 만들 수 있는 1단계 프로토타입 액션:**`;

        const res = await geminiClient.generateText(prompt);
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> 10조 스케일업';

        idea.content = `${idea.content}\n\n---\n### 🤖 Gemini 10조 스케일업 기획서\n${res}`;
        storage.saveData();
        this.renderTrillionIdeas();
        this.showToast('Gemini가 10조 스케일업 기획서를 아이디어에 추가했습니다! 🚀');
      });

      // Delete
      card.querySelector('.delete-tidea-btn')?.addEventListener('click', () => {
        if (confirm(`'${idea.title}' 아이디어를 삭제하시겠습니까?`)) {
          storage.deleteTrillionIdea(idea.id);
          this.renderTrillionIdeas();
          this.showToast('아이디어가 삭제되었습니다.');
        }
      });

      grid.appendChild(card);
    });
  }

  // ==========================================
  // 👑 10조 복리 모멘텀 지수 계산기 (Compound Momentum Index)
  // ==========================================
  calculateCompoundMomentum() {
    const dayData = storage.getDayData(this.currentDate);
    const todos = dayData.todos || [];
    const tQuests = dayData.trillionQuests || {};

    // 1. 10조 5대 퀘스트 점수 (30점 만점)
    let questDone = 0;
    ['tquest_mindset', 'tquest_habit', 'tquest_ability', 'tquest_learning', 'tquest_action'].forEach(id => {
      if (tQuests[id]) questDone++;
    });
    const questScore = (questDone / 5) * 30;

    // 2. To-Do 완료율 (30점 만점)
    let todoScore = 0;
    if (todos.length > 0) {
      const doneCount = todos.filter(t => t.completed).length;
      todoScore = (doneCount / todos.length) * 30;
    } else {
      todoScore = 15; // 기본 점수
    }

    // 3. 딥워크 몰입 시간 (20점 만점: 2시간 기준)
    const deepworkSec = dayData.deepworkSeconds || 0;
    const deepworkScore = Math.min(20, (deepworkSec / 7200) * 20);

    // 4. 일기 & 회고 작성 (20점 만점)
    let retroScore = 0;
    const jContent = typeof dayData.journal === 'string' ? dayData.journal : (dayData.journal?.content || '');
    if (jContent.trim().length > 10) retroScore += 10;
    const eveContent = typeof dayData.eveningOS === 'string' ? dayData.eveningOS : (dayData.eveningRoutine?.review || '');
    if (eveContent.trim().length > 10) retroScore += 10;

    const total = Math.round(questScore + todoScore + deepworkScore + retroScore);

    const badge = document.getElementById('compoundScoreBadge');
    const bar = document.getElementById('compoundProgressBar');

    if (badge) {
      badge.textContent = `${total}% 달성`;
      if (total >= 80) badge.className = 'badge badge-success';
      else if (total >= 40) badge.className = 'badge badge-warning';
      else badge.className = 'badge badge-danger';
    }
    if (bar) {
      bar.style.width = `${total}%`;
    }

    return total;
  }
  renderMemos() {
    if (!this.memoCardsGrid) return;
    const memos = storage.getMemos();
    this.memoCardsGrid.innerHTML = '';

    const query = this.memoSearchInput ? this.memoSearchInput.value.toLowerCase().trim() : '';

    const filtered = memos.filter(m => {
      if (this.activeMemoFilter !== 'all' && m.category !== this.activeMemoFilter) return false;
      if (query && !m.title.toLowerCase().includes(query) && !m.content.toLowerCase().includes(query)) return false;
      return true;
    });

    // 핀 고정 우선 정렬
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    if (filtered.length === 0) {
      this.memoCardsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">
        <i class="fa-solid fa-lightbulb" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;"></i>
        <p>등록된 아이디어 메모가 없습니다. 상단 입력창이나 사이드바에서 1초 만에 생각을 기록해보세요!</p>
      </div>`;
      return;
    }

    const catMap = {
      idea: { label: '💡 영감', cls: 'category-career' },
      work: { label: '💼 업무', cls: 'category-career' },
      study: { label: '📚 지식', cls: 'category-study' },
      wealth: { label: '💰 재테크', cls: 'category-wealth' },
      misc: { label: '🛒 일상', cls: 'category-routine' }
    };

    filtered.forEach(memo => {
      const card = document.createElement('div');
      card.className = `memo-card ${memo.pinned ? 'pinned' : ''}`;
      const cat = catMap[memo.category] || { label: '메모', cls: 'category-career' };

      card.innerHTML = `
        <div class="memo-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="category-tag ${cat.cls}">${cat.label}</span>
            ${memo.pinned ? '<span style="color:var(--accent-gold); font-size:0.75rem;"><i class="fa-solid fa-thumbtack"></i> 핀고정</span>' : ''}
          </div>
          <button class="todo-delete-btn delete-memo-btn" title="메모 삭제"><i class="fa-solid fa-trash"></i></button>
        </div>

        <div class="memo-card-title">${this.escapeHtml(memo.title)}</div>
        <div class="memo-card-content">${this.escapeHtml(memo.content || '내용 없음')}</div>

        <div class="memo-card-footer">
          <span><i class="fa-regular fa-clock"></i> ${memo.date || '오늘'}</span>
          <div class="memo-actions-group">
            <button class="memo-action-btn pin-memo-btn" title="${memo.pinned ? '핀 해제' : '상단 핀 고정'}">
              <i class="fa-solid fa-thumbtack"></i>
            </button>
            <button class="memo-action-btn ai-expand-memo-btn" title="Gemini AI로 아이디어 구체화 기획서 발전">
              <i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> AI 기획
            </button>
            <button class="memo-action-btn push-memo-todo-btn" title="오늘의 실행 To-Do로 즉시 전환">
              <i class="fa-solid fa-bolt text-yellow"></i> To-Do 전환
            </button>
          </div>
        </div>
      `;

      // Pin toggle
      card.querySelector('.pin-memo-btn')?.addEventListener('click', () => {
        storage.updateMemo(memo.id, { pinned: !memo.pinned });
        this.renderMemos();
        this.showToast(memo.pinned ? '핀 고정이 해제되었습니다.' : '상단에 핀 고정되었습니다! 📌');
      });

      // Push to Todo
      card.querySelector('.push-memo-todo-btn')?.addEventListener('click', () => {
        this.pushActionToTodayTodo(`[아이디어 실행] ${memo.title}`, memo.category || 'career');
        this.showToast('아이디어가 오늘의 To-Do로 즉시 전환되었습니다! ⚡');
      });

      // AI Expand
      card.querySelector('.ai-expand-memo-btn')?.addEventListener('click', async () => {
        const btn = card.querySelector('.ai-expand-memo-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 기획 중...';

        const prompt = `아이디어 메모: [${memo.title}]
내용: [${memo.content}]

위 아이디어를 실전에 바로 적용할 수 있도록 3단계 구체적 실행 기획서(1. 핵심 가치, 2. 프로토타입/실험 1단계, 3. 당장 착수할 구체적 행동 2개)로 확장 발전시켜줘.`;

        const res = await geminiClient.generateText(prompt);
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> AI 기획';

        storage.updateMemo(memo.id, { content: `${memo.content}\n\n---\n### 🤖 Gemini AI 심화 기획\n${res}` });
        this.renderMemos();
        this.showToast('Gemini가 아이디어를 실행 기획서로 발전시켰습니다! 🚀');
      });

      // Delete
      card.querySelector('.delete-memo-btn')?.addEventListener('click', () => {
        if (confirm(`'${memo.title}' 메모를 삭제하시겠습니까?`)) {
          storage.deleteMemo(memo.id);
          this.renderMemos();
          this.renderTabCalendar('memo');
          this.showToast('메모가 삭제되었습니다.');
        }
      });

      this.memoCardsGrid.appendChild(card);
    });
  }

  loadDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    this.headerDateText.textContent = `${y}년 ${m}월 ${d}일 (${dayNames[dObj.getDay()]})`;
    this.datePicker.value = dateStr;
        this.todayTag.style.display = (dateStr === todayKST()) ? 'inline-block' : 'none';
    this.tenTrillion?.setDate(dateStr);
    paintEES(dateStr);

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

    // 10조 자산가 5대 퀘스트 체크리스트 복원
    const tQuests = dayData.trillionQuests || {};
    let tDone = 0;
    ['tquest_mindset', 'tquest_habit', 'tquest_ability', 'tquest_learning', 'tquest_action'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = !!tQuests[id];
        if (el.checked) tDone++;
      }
    });
    const tBadge = document.getElementById('trillionQuestScoreBadge');
    if (tBadge) {
      tBadge.textContent = `${tDone}/5 달성`;
      tBadge.className = `badge ${tDone === 5 ? 'badge-success' : 'badge-warning'}`;
    }
    this.calculateCompoundMomentum();

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

    // Weather & Mood Bar Sync
    const weather = journal.weather || '☀️ 맑음';
    const weatherBar = document.getElementById('journalWeatherBar');
    if (weatherBar) {
      weatherBar.querySelectorAll('.weather-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.weather === weather);
      });
    }

    const jMoodBar = document.getElementById('journalMoodBar');
    if (jMoodBar) {
      const mood = dayData.mood || 'good';
      jMoodBar.querySelectorAll('.jmood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === mood);
      });
    }

    this.renderAllTabCalendars();
    this.renderPrinciples();
    this.renderSimpleMode();
  }


  // =========================================================================
  // ⚡ 20. Simple Mode Engine (심플 & 이지 에디션)
  // =========================================================================
  initModeSwitcher() {
    this.appMode = localStorage.getItem('daily_flow_mode') || 'simple';
    
    const simpleBtn = document.getElementById('simpleModeBtn');
    const proBtn = document.getElementById('proModeBtn');

    simpleBtn?.addEventListener('click', () => {
      this.setAppMode('simple');
      this.showToast('⚡ 심플 모드로 전환되었습니다. (핵심 기능 집중)');
    });

    proBtn?.addEventListener('click', () => {
      this.setAppMode('pro');
      this.showToast('👑 프로 모드로 전환되었습니다. (전체 OS 기능 활성화)');
    });

    this.setAppMode(this.appMode);
  }

  setAppMode(mode) {
    this.appMode = mode;
    localStorage.setItem('daily_flow_mode', mode);

    document.body.classList.remove('mode-simple', 'mode-pro');
    document.body.classList.add('mode-' + mode);

    const simpleBtn = document.getElementById('simpleModeBtn');
    const proBtn = document.getElementById('proModeBtn');
    if (simpleBtn) simpleBtn.classList.toggle('active', mode === 'simple');
    if (proBtn) proBtn.classList.toggle('active', mode === 'pro');

    if (mode === 'simple') {
      this.renderSimpleMode();
    } else {
      this.loadDate(this.currentDate);
    }
  }

  renderSimpleMode() {
    const dayData = storage.getDayData(this.currentDate);

    // 1. One Thing
    const oneThingInput = document.getElementById('simpleOneThingInput');
    if (oneThingInput) {
      oneThingInput.value = dayData.oneThing || dayData.focus || '';
    }

    // 2. To-Do List with Filter & Priority
    const todoListEl = document.getElementById('simpleTodoList');
    const badgeEl = document.getElementById('simpleTaskCountBadge');
    if (todoListEl) {
      todoListEl.innerHTML = '';
      const todos = dayData.todos || [];
      const completedCount = todos.filter(t => t.completed).length;
      const activeCount = todos.length - completedCount;

      // Update Filter counts
      const countAllEl = document.getElementById('simpleTodoCountAll');
      const countActiveEl = document.getElementById('simpleTodoCountActive');
      const countDoneEl = document.getElementById('simpleTodoCountDone');
      if (countAllEl) countAllEl.textContent = todos.length;
      if (countActiveEl) countActiveEl.textContent = activeCount;
      if (countDoneEl) countDoneEl.textContent = completedCount;

      if (badgeEl) {
        badgeEl.textContent = `${completedCount}/${todos.length} 완료`;
        if (todos.length > 0 && completedCount === todos.length) {
          badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
          badgeEl.style.color = '#34d399';
          badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          badgeEl.style.background = 'rgba(59, 130, 246, 0.18)';
          badgeEl.style.color = '#60a5fa';
          badgeEl.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        }
      }

      this.simpleTodoFilter = this.simpleTodoFilter || 'all';
      const filteredTodos = todos.filter(t => {
        if (this.simpleTodoFilter === 'active') return !t.completed;
        if (this.simpleTodoFilter === 'done') return !!t.completed;
        return true;
      });

      if (filteredTodos.length === 0) {
        todoListEl.innerHTML = `
          <div style="text-align:center; color:var(--text-muted); padding:24px 10px; font-size:0.8rem;">
            ${todos.length === 0 ? '등록된 과업이 없습니다.<br>오늘의 첫 실행 과업을 위에 입력해보세요! ✨' : '해당 필터에 맞는 과업이 없습니다.'}
          </div>
        `;
      } else {
        filteredTodos.forEach(todo => {
          const item = document.createElement('div');
          item.className = `simple-todo-item ${todo.completed ? 'completed' : ''}`;
          const catMap = {
            career: { label: '💼 지식', color: 'rgba(99, 102, 241, 0.2)', text: '#818cf8' },
            wealth: { label: '💰 자본', color: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' },
            health: { label: '💪 건강', color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
            routine: { label: '⚡ 루틴', color: 'rgba(6, 182, 212, 0.2)', text: '#22d3ee' }
          };
          const cInfo = catMap[todo.category] || catMap.career;

          let priBadge = '';
          if (todo.priority === 'high') {
            priBadge = `<span class="simple-priority-badge high">⭐ 1순위</span>`;
          } else if (todo.priority === 'urgent') {
            priBadge = `<span class="simple-priority-badge urgent">🔥 중요</span>`;
          }

          item.innerHTML = `
            <div class="simple-todo-left">
              <div class="simple-todo-checkbox">
                <i class="fa-solid fa-check"></i>
              </div>
              <span class="simple-todo-cat-tag" style="background:${cInfo.color}; color:${cInfo.text};">${cInfo.label}</span>
              ${priBadge}
              <span class="simple-todo-text">${this.escapeHtml(todo.text)}</span>
            </div>
            <button class="simple-todo-del-btn" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
          `;

          item.querySelector('.simple-todo-left')?.addEventListener('click', () => {
            const currentDayData = storage.getDayData(this.currentDate);
            const currentTodos = currentDayData.todos || [];
            const target = currentTodos.find(t => t.id === todo.id);
            if (target) target.completed = !target.completed;
            storage.updateDayData(this.currentDate, { todos: currentTodos });
            this.renderSimpleMode();
            this.renderTodos();
            this.renderTabCalendar('dashboard');
            paintEES(this.currentDate);
          });

          item.querySelector('.simple-todo-del-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentDayData = storage.getDayData(this.currentDate);
            const currentTodos = (currentDayData.todos || []).filter(t => t.id !== todo.id);
            storage.updateDayData(this.currentDate, { todos: currentTodos });
            this.renderSimpleMode();
            this.renderTodos();
            this.renderTabCalendar('dashboard');
            paintEES(this.currentDate);
          });

          todoListEl.appendChild(item);
        });
      }
    }

    // 3. Journal & Mood
    const journalTitleInput = document.getElementById('simpleJournalTitle');
    const journalContentInput = document.getElementById('simpleJournalContent');
    const charCountEl = document.getElementById('simpleCharCount');
    const moodBtns = document.querySelectorAll('#simpleMoodSelector .simple-mood-btn');

    if (journalTitleInput) {
      journalTitleInput.value = dayData.journal?.title || '';
    }
    if (journalContentInput) {
      const content = dayData.journal?.content || '';
      journalContentInput.value = content;
      if (charCountEl) charCountEl.textContent = content.length.toLocaleString();
    }

    moodBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === dayData.mood);
    });

    // 4. Render Thought & Idea Notepad Cards
    this.renderSimpleMemos();

    // 5. 10조 자산가 복리 습관 & 격언
    const quote50sEl = document.getElementById('simple50sQuote');
    if (quote50sEl) {
      const q = QUOTES_TRILLION[Math.floor(Math.random() * QUOTES_TRILLION.length)];
      quote50sEl.textContent = `"${q}"`;
    }
    this.renderSimple50sHabits();

    // 6. Simple Mini-Calendar
    this.renderSimpleMiniCalendar();
  }


  // =========================================================================
  // 👑 50대 10조 자산가 5대 황금 습관 & AI 인생 코칭 엔진
  // =========================================================================
  // =========================================================================
  // 💡 생각 & 10조 아이디어 메모장 관리 엔진
  // =========================================================================
  renderSimpleMemos() {
    const gridEl = document.getElementById('simpleMemoCardsGrid');
    const badgeEl = document.getElementById('simpleMemoCountBadge');
    if (!gridEl) return;

    let memos = storage.getMemos() || [];
    if (memos.length === 0) {
      // Initialize default high-value sample memos if totally empty
      memos = [
        {
          id: 'memo_sample_1',
          title: 'AI 기반 직무 지식 자산화 전자책 & SaaS 파이프라인',
          content: '30년간 축적된 산업 도면/엔지니어링/기획 데이터를 체계화하여 구독형 노하우 플랫폼으로 전환. 주말 2시간씩 모듈화 집필.',
          category: 'business',
          pinned: true,
          date: this.currentDate,
          time: '09:00'
        },
        {
          id: 'memo_sample_2',
          title: '글로벌 지주사 배당 및 복리 재투자 모델',
          content: '현금흐름 창출 자산을 우량 글로벌 ETF 및 독점 기술주로 분산하여 배당 복리 엔진 구축.',
          category: 'wealth',
          pinned: false,
          date: this.currentDate,
          time: '14:30'
        }
      ];
      storage.data.memos = memos;
      storage.saveData();
    }

    if (badgeEl) badgeEl.textContent = `${memos.length}개 아이디어`;

    const q = (this.simpleMemoSearchQuery || '').toLowerCase().trim();
    let displayMemos = memos.filter(m => {
      if (!q) return true;
      return (m.title || '').toLowerCase().includes(q) || (m.content || '').toLowerCase().includes(q);
    });

    // Pinned first, then newest
    displayMemos.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.id || '').localeCompare(a.id || '');
    });

    gridEl.innerHTML = '';
    if (displayMemos.length === 0) {
      gridEl.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:0.8rem;">검색된 아이디어가 없습니다.</div>`;
      return;
    }

    const catMap = {
      idea: { label: '💡 영감', color: 'rgba(234, 179, 8, 0.2)', text: '#fde047' },
      business: { label: '💼 비즈니스', color: 'rgba(99, 102, 241, 0.2)', text: '#818cf8' },
      wealth: { label: '💰 자본', color: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
      misc: { label: '📝 메모', color: 'rgba(148, 163, 184, 0.2)', text: '#cbd5e1' }
    };

    displayMemos.forEach(memo => {
      const card = document.createElement('div');
      card.className = `simple-memo-card ${memo.pinned ? 'pinned' : ''}`;
      const cInfo = catMap[memo.category] || catMap.idea;

      card.innerHTML = `
        <div class="simple-memo-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="simple-todo-cat-tag" style="background:${cInfo.color}; color:${cInfo.text};">${cInfo.label}</span>
            <span class="simple-memo-card-title">${this.escapeHtml(memo.title || '무제 메모')}</span>
          </div>
          <button class="simple-memo-action-btn" data-action="pin" title="${memo.pinned ? '핀 고정 해제' : '상단 핀 고정'}">
            <i class="fa-solid fa-thumbtack ${memo.pinned ? 'text-yellow' : ''}"></i>
          </button>
        </div>
        <div class="simple-memo-card-content">${this.escapeHtml(memo.content || '')}</div>
        <div class="simple-memo-card-footer">
          <span>${memo.date || ''} ${memo.time || ''}</span>
          <div class="simple-memo-actions-group">
            <button class="simple-memo-action-btn" data-action="push-todo" title="오늘의 To-Do로 등록"><i class="fa-solid fa-bolt text-cyan"></i> To-Do</button>
            <button class="simple-memo-action-btn" data-action="ai-scale" title="10조 AI 스케일업 기획"><i class="fa-solid fa-wand-magic-sparkles text-yellow"></i> AI기획</button>
            <button class="simple-memo-action-btn" data-action="delete" title="메모 삭제"><i class="fa-solid fa-trash-can text-rose"></i></button>
          </div>
        </div>
      `;

      // Event bindings
      card.querySelector('[data-action="pin"]')?.addEventListener('click', () => {
        memo.pinned = !memo.pinned;
        storage.saveData();
        this.renderSimpleMemos();
      });

      card.querySelector('[data-action="push-todo"]')?.addEventListener('click', () => {
        const currentDayData = storage.getDayData(this.currentDate);
        currentDayData.todos = currentDayData.todos || [];
        currentDayData.todos.push({
          id: 't_' + Date.now(),
          text: `[아이디어] ${memo.title}`,
          category: memo.category === 'wealth' ? 'wealth' : 'career',
          priority: 'high',
          completed: false
        });
        storage.updateDayData(this.currentDate, { todos: currentDayData.todos });
        this.renderSimpleMode();
        this.renderTodos();
        this.renderTabCalendar('dashboard');
        this.showToast(`✨ [${memo.title}] 과업이 오늘 To-Do로 등록되었습니다!`);
      });

      card.querySelector('[data-action="ai-scale"]')?.addEventListener('click', async () => {
        const resultBox = document.getElementById('simple50sCoachResultBox');
        const contentEl = document.getElementById('simple50sCoachContent');
        if (!resultBox || !contentEl) return;
        resultBox.style.display = 'block';
        contentEl.innerHTML = '<div style="text-align:center; padding:18px;"><i class="fa-solid fa-spinner fa-spin text-cyan" style="font-size:1.4rem;"></i><p style="margin-top:8px; color:var(--text-secondary);">10조 규모의 비즈니스 모델로 스케일업 분석 중...</p></div>';

        const prompt = `[👑 10조 자산가 아이디어 스케일업 & SaaS 비즈니스 도면 기획]
- 아이디어 제목: "${memo.title}"
- 아이디어 상세: "${memo.content}"
- 분류: ${memo.category}

위 아이디어를 글로벌 10조 자산가/지주사 오너 수준의 비즈니스 아키텍처로 스케일업해줘.
1. 💎 **[10조 규모 시장 정의 & 독점적 해자(Moat)]**
2. ⚙️ **[자동화 시스템 & 레버리지 설계]** (코드/노코드, SaaS, 글로벌 위탁 운영)
3. 💰 **[현금흐름 복리화 & 투자 구조]**
4. 🚀 **[이번 주말 2시간 안에 끝낼 MVP 1단계 실행 과업 3가지]**`;

        try {
          const res = await geminiClient.generateText(prompt);
          contentEl.innerHTML = this.parseMarkdown(res);
          this.showToast('10조 스케일업 기획안이 생성되었습니다! 💡');
        } catch (e) {
          contentEl.innerHTML = `<p style="color:var(--accent-danger);">기획안 생성 실패: ${e.message}</p>`;
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        storage.data.memos = storage.getMemos().filter(m => m.id !== memo.id);
        storage.saveData();
        this.renderSimpleMemos();
        this.showToast('메모가 삭제되었습니다.');
      });

      gridEl.appendChild(card);
    });
  }

  addSimpleMemo() {
    const titleInput = document.getElementById('simpleMemoTitleInput');
    const contentInput = document.getElementById('simpleMemoContentInput');
    const catSelect = document.getElementById('simpleMemoCategory');
    if (!titleInput || !contentInput) return;

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = catSelect ? catSelect.value : 'idea';

    if (!title && !content) {
      this.showToast('메모 제목 또는 내용을 입력해주세요.');
      return;
    }

    const newMemo = {
      id: 'memo_' + Date.now(),
      title: title || '새로운 아이디어',
      content: content,
      category: category,
      pinned: false,
      date: this.currentDate,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    const memos = storage.getMemos() || [];
    memos.unshift(newMemo);
    storage.data.memos = memos;
    storage.saveData();

    titleInput.value = '';
    contentInput.value = '';
    this.renderSimpleMemos();
    this.showToast('💡 생각 & 아이디어가 안전하게 기록되었습니다!');
  }

  applySimpleJournalFormat(cmd) {
    const el = document.getElementById('simpleJournalContent');
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const selected = val.substring(start, end);

    let insert = '';
    if (cmd === 'bold') insert = `**${selected || '굵은 텍스트'}**`;
    else if (cmd === 'heading') insert = `
### ${selected || '소제목'}
`;
    else if (cmd === 'task') insert = `
- [ ] ${selected || '실천 과업'}
`;
    else if (cmd === 'quote') insert = `
> ${selected || '중요한 통찰 및 격언'}
`;

    el.value = val.substring(0, start) + insert + val.substring(end);
    el.focus();
    const charCountEl = document.getElementById('simpleCharCount');
    if (charCountEl) charCountEl.textContent = el.value.length.toLocaleString();
  }

  applySimpleJournalTemplate(type) {
    const el = document.getElementById('simpleJournalContent');
    const titleEl = document.getElementById('simpleJournalTitle');
    if (!el) return;

    const tpls = {
      quick1min: {
        title: '⚡ 오늘의 1분 성장 회고',
        content: `⚡ [1분 핵심 회고]
1. 오늘 가장 보람찼던 1가지:
- 

2. 오늘 감사했던 1가지:
- 

3. 내일 실행할 1% 개선 액션:
- `
      },
      trillion: {
        title: '👑 10조 자산가 관점의 결정과 사유',
        content: `👑 [10조 자산가 복리 회고]
1. 오늘의 핵심 의사결정 및 통찰:
- 

2. 노동 소득을 시스템/자산으로 전환한 활동:
- 

3. 내일 구축할 독점적 해자(Moat) & 복리 레버리지:
- `
      },
      gratitude: {
        title: '💖 감사와 평온의 하루 기록',
        content: `💖 [감사 & 웰빙 일기]
1. 오늘 내 신체와 건강을 위해 감사한 점:
- 

2. 오늘 만난 사람과 가족에게 감사한 점:
- 

3. 평온하고 풍요로운 일상에 감사한 점:
- `
      }
    };

    const target = tpls[type];
    if (!target) return;

    if (titleEl && !titleEl.value) titleEl.value = target.title;
    if (el.value.trim()) {
      el.value = el.value + '\n\n' + target.content;
    } else {
      el.value = target.content;
    }
    el.focus();
    const charCountEl = document.getElementById('simpleCharCount');
    if (charCountEl) charCountEl.textContent = el.value.length.toLocaleString();
    this.showToast(`'${target.title}' 템플릿이 적용되었습니다.`);
  }

  async extractActionGuideFromSimpleJournal() {
    const content = document.getElementById('simpleJournalContent')?.value || '';
    if (!content.trim()) {
      this.showToast('먼저 일기 내용을 작성해주세요.');
      return;
    }

    const btn = document.getElementById('simpleExtractTodoFromJournalBtn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-yellow"></i> 추출 중...';

    const prompt = `다음 일기/회고 글을 분석하여, 사용자가 내일 즉시 실행해야 할 가장 중요한 핵심 To-Do 3가지를 간결한 문장으로 추출해줘:

[일기 내용]
${content}

형식:
- [할일1]
- [할일2]
- [할일3]`;

    try {
      const res = await geminiClient.generateText(prompt);
      const lines = res.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()));
      const currentDayData = storage.getDayData(this.currentDate);
      currentDayData.todos = currentDayData.todos || [];

      lines.forEach(l => {
        const cleanText = l.replace(/^[-*\d.]+\s*/, '').trim();
        if (cleanText) {
          currentDayData.todos.push({
            id: 't_' + Date.now() + Math.random().toString(36).substr(2, 4),
            text: cleanText,
            category: 'career',
            priority: 'high',
            completed: false
          });
        }
      });

      storage.updateDayData(this.currentDate, { todos: currentDayData.todos });
      this.renderSimpleMode();
      this.renderTodos();
      this.showToast('✨ 일기에서 핵심 To-Do가 성공적으로 추출되어 등록되었습니다!');
    } catch (e) {
      this.showToast(`To-Do 추출 실패: ${e.message}`);
    } finally {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-bolt text-yellow"></i> To-Do 추출';
    }
  }

  renderSimple50sHabits() {
    const dayData = storage.getDayData(this.currentDate);
    const habits50s = dayData.habits50s || {};
    const habitKeys = ['h_health', 'h_knowledge', 'h_deepwork', 'h_capital', 'h_elimination'];
    
    let doneCount = 0;
    habitKeys.forEach(k => {
      const isDone = !!habits50s[k];
      if (isDone) doneCount++;

      const itemEl = document.querySelector(`.simple-50s-habit-item[data-habit="${k}"]`);
      if (itemEl) {
        itemEl.classList.toggle('done', isDone);
      }

      // Calculate streak
      const streak = this.calc50sHabitStreak(k);
      const streakEl = document.getElementById(`streak_${k}`);
      if (streakEl) {
        streakEl.innerHTML = `<i class="fa-solid fa-fire"></i> ${streak}일`;
        if (streak > 0) {
          streakEl.style.color = '#f59e0b';
          streakEl.style.background = 'rgba(245, 158, 11, 0.2)';
        } else {
          streakEl.style.color = 'var(--text-muted)';
          streakEl.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }
    });

    const badgeEl = document.getElementById('simple50sHabitBadge');
    const fillEl = document.getElementById('simple50sHabitProgressFill');
    const pct = Math.round((doneCount / habitKeys.length) * 100);

    if (badgeEl) {
      badgeEl.textContent = `${doneCount}/5 실천 (${pct}%)`;
      if (doneCount === 5) {
        badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
        badgeEl.style.color = '#34d399';
        badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        badgeEl.style.background = 'rgba(245, 158, 11, 0.18)';
        badgeEl.style.color = '#fbbf24';
        badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      }
    }
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
    }
  }

  calc50sHabitStreak(habitKey) {
    let streak = 0;
    let curr = new Date(this.currentDate);
    const todayData = storage.getDayData(this.currentDate);
    if (!todayData.habits50s || !todayData.habits50s[habitKey]) {
      curr.setDate(curr.getDate() - 1);
    }
    const allDays = storage.data.days || {};
    for (let i = 0; i < 365; i++) {
      const dStr = curr.toISOString().split('T')[0];
      const dData = allDays[dStr];
      if (dData && dData.habits50s && dData.habits50s[habitKey]) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  toggle50sHabit(habitKey) {
    const dayData = storage.getDayData(this.currentDate);
    dayData.habits50s = dayData.habits50s || {};
    dayData.habits50s[habitKey] = !dayData.habits50s[habitKey];
    storage.updateDayData(this.currentDate, { habits50s: dayData.habits50s });
    this.renderSimple50sHabits();
    this.renderTabCalendar('dashboard');
    paintEES(this.currentDate);
    const habitNames = {
      h_health: '💪 신체 자산 방어',
      h_knowledge: '🧠 지식의 자본화',
      h_deepwork: '⚡ 퇴근 후 1시간 딥워크',
      h_capital: '💰 자본 & 레버리지 공부',
      h_elimination: '🚫 낭비 차단 & 거절의 미학'
    };
    if (dayData.habits50s[habitKey]) {
      this.showToast(`✨ [${habitNames[habitKey]}] 10조 습관을 실천하셨습니다! 🔥`);
    } else {
      this.showToast(`[${habitNames[habitKey]}] 습관 체크가 해제되었습니다.`);
    }
  }

  async run50sLifeCoach() {
    const btn = document.getElementById('simple50sCoachBtn');
    const resultBox = document.getElementById('simple50sCoachResultBox');
    const contentEl = document.getElementById('simple50sCoachContent');
    if (!contentEl || !resultBox) return;

    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan"></i> 10조 최고전략 연산 중...';
    resultBox.style.display = 'block';
    contentEl.innerHTML = '<div style="text-align:center; padding:18px;"><i class="fa-solid fa-spinner fa-spin text-cyan" style="font-size:1.4rem;"></i><p style="margin-top:8px; color:var(--text-secondary); font-weight:600;">10조 자산가 4대 레버리지(자본, 시스템, 지식, 미디어)와 오늘의 실행 데이터를 분석하여 1% 즉각 처방전을 작성 중입니다...</p></div>';

    const dayData = storage.getDayData(this.currentDate);
    const oneThing = dayData.oneThing || dayData.focus || '자립형 비즈니스 파이프라인 구축';
    const habits50s = dayData.habits50s || {};
    const doneHabits = Object.values(habits50s).filter(Boolean).length;
    const mood = dayData.mood || 'good';

    const prompt = `[👑 10조 자산가 복리 경영 시스템 - 실시간 최고전략 처방전]
- 기준 날짜: ${this.currentDate}
- 오늘의 단 하나의 결정적 목표 (One Thing): "${oneThing}"
- 10조 자산가 5대 복리 황금 습관 달성 현황: ${doneHabits}/5개 완료
- 현재 컨디션 및 무드: ${mood}

당신은 사용자를 글로벌 10조 자산가/지주사 오너로 도약시키는 최고전략고문 AI입니다.
10조 자산가로 도약하기 위한 유일한 승리 공식은 '신체 자산 방어', '독점적 지식의 자본화', '4대 레버리지(자본, 시스템, 지식, 미디어)를 통한 복리 구축'입니다.

사용자가 오늘 밤 퇴근 후 의지력을 낭비하지 않고 즉각 실천할 수 있는 4단계 명쾌하고 강력한 처방전을 작성해줘:

1. 🛡️ **[오늘 밤 5분 체력 & 뇌 피로 회복 루틴]** (미온수, 스트레칭, 수면 7시간 방어)
2. 💎 **[독점 지식을 10조 복리 자산으로 바꿀 오늘 밤 30분 액션]** (비즈니스 도면 1장, SaaS 기획, 지식 자산 집필)
3. 🚀 **[내일 출근길 실천할 1% 복리 사고 루틴]** (잡담 대신 자본 구조 및 M&A/투자 분석)
4. 🧭 **[10조 자산가로 도약하기 위한 레이 달리오/워런 버핏 급 한 줄 원칙]**`;

    try {
      const response = await geminiClient.generateText(prompt);
      contentEl.innerHTML = this.parseMarkdown(response);
      if (btn) btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> <span>⚡ 10조 자산가 1% 즉각 처방</span>';
      this.showToast('10조 자산가 맞춤 처방전이 발행되었습니다! 👑');
    } catch (e) {
      contentEl.innerHTML = `<p style="color:var(--accent-danger);">처방전 생성 중 오류가 발생했습니다: ${e.message}</p>`;
      if (btn) btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-cyan"></i> <span>⚡ 10조 자산가 1% 즉각 처방</span>';
    }
  }

  renderSimpleMiniCalendar() {
    const gridEl = document.getElementById('simpleCalGrid');
    const titleEl = document.getElementById('simpleCalTitle');
    if (!gridEl || !titleEl) return;

    const st = this.tabCalState.dashboard || { year: new Date().getFullYear(), month: new Date().getMonth() };
    titleEl.textContent = `${st.year}년 ${st.month + 1}월`;
    gridEl.innerHTML = '';

    const first = new Date(st.year, st.month, 1);
    const last = new Date(st.year, st.month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    const prevLast = new Date(st.year, st.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'simple-cal-cell other-month';
      cell.innerHTML = `<span>${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const allDays = storage.data.days || {};

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'simple-cal-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dData = allDays[fullDate] || {};
      const todos = dData.todos || [];
      const done = todos.filter(t => t.completed).length;
      const hasJournal = dData.journal && (dData.journal.title || dData.journal.content);

      let dotsHtml = '';
      if (todos.length > 0 && done === todos.length) {
        dotsHtml += `<span class="simple-cal-dot" style="background:#10b981;" title="100% 완료"></span>`;
      } else if (done > 0) {
        dotsHtml += `<span class="simple-cal-dot" style="background:#f59e0b;" title="진행 중"></span>`;
      }
      if (hasJournal) {
        dotsHtml += `<span class="simple-cal-dot" style="background:#c084fc;" title="일기"></span>`;
      }

      cell.innerHTML = `
        <span>${d}</span>
        <div class="simple-cal-dots">${dotsHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }
  }

  bindSimpleModeEvents() {
    // 1. One Thing Save
    const saveOneThing = () => {
      const input = document.getElementById('simpleOneThingInput');
      if (!input) return;
      const val = input.value.trim();
      storage.updateDayData(this.currentDate, { oneThing: val, focus: val });
      if (this.focusInput) this.focusInput.value = val;
      this.renderAllTabCalendars();
      this.showToast('🎯 오늘의 One Thing이 저장되었습니다!');
    };
    document.getElementById('simpleSaveOneThingBtn')?.addEventListener('click', saveOneThing);
    document.getElementById('simpleOneThingInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveOneThing();
    });

    // 2. Add To-Do with Priority & Category
    const addTodo = () => {
      const input = document.getElementById('simpleTodoInput');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      const catSelect = document.getElementById('simpleTodoCat');
      const priSelect = document.getElementById('simpleTodoPriority');
      const cat = catSelect ? catSelect.value : 'career';
      const pri = priSelect ? priSelect.value : 'normal';

      const currentDayData = storage.getDayData(this.currentDate);
      const currentTodos = currentDayData.todos || [];
      currentTodos.push({ id: 't_' + Date.now(), text, category: cat, priority: pri, completed: false });
      storage.updateDayData(this.currentDate, { todos: currentTodos });
      input.value = '';
      this.renderSimpleMode();
      this.renderTodos();
      this.renderTabCalendar('dashboard');
      paintEES(this.currentDate);
      this.showToast('10조 핵심 과업이 등록되었습니다! 🎯');
    };
    document.getElementById('simpleAddTodoBtn')?.addEventListener('click', addTodo);
    document.getElementById('simpleTodoInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo();
    });

    // 2-1. To-Do Filter Buttons
    document.querySelectorAll('#simpleTodoFilterBar .simple-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.simpleTodoFilter = btn.dataset.filter || 'all';
        document.querySelectorAll('#simpleTodoFilterBar .simple-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderSimpleMode();
      });
    });

    // 2-2. Clear Completed Todos
    document.getElementById('simpleClearCompletedTodosBtn')?.addEventListener('click', () => {
      const currentDayData = storage.getDayData(this.currentDate);
      const currentTodos = (currentDayData.todos || []).filter(t => !t.completed);
      storage.updateDayData(this.currentDate, { todos: currentTodos });
      this.renderSimpleMode();
      this.renderTodos();
      this.showToast('완료된 과업이 모두 정리되었습니다. 🧹');
    });

    // 2-3. Rollover Yesterday's unfinished tasks
    document.getElementById('simpleRolloverTasksBtn')?.addEventListener('click', () => {
      this.rolloverUnfinishedTasks();
      this.renderSimpleMode();
    });

    // 3. Mood Selection
    document.querySelectorAll('#simpleMoodSelector .simple-mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        storage.updateDayData(this.currentDate, { mood });
        document.querySelectorAll('#simpleMoodSelector .simple-mood-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.mood === mood);
        });
        this.highlightMood(mood);
        this.renderJournalRightCalendar();
        this.showToast(`오늘의 기분이 [${btn.title}]로 설정되었습니다.`);
      });
    });

    // 4. Save Journal
    const saveJournal = () => {
      const title = document.getElementById('simpleJournalTitle')?.value || '';
      const content = document.getElementById('simpleJournalContent')?.value || '';
      const dayData = storage.getDayData(this.currentDate);
      const existing = dayData.journal || {};
      storage.updateDayData(this.currentDate, {
        journal: { ...existing, title, content }
      });
      if (this.journalTitle) this.journalTitle.value = title;
      if (this.journalContent) this.journalContent.value = content;
      this.renderJournalRightCalendar();
      this.showToast('일기가 안전하게 저장되었습니다! 💾');
    };
    document.getElementById('simpleSaveJournalBtn')?.addEventListener('click', saveJournal);

    const journalContent = document.getElementById('simpleJournalContent');
    if (journalContent) {
      journalContent.addEventListener('input', () => {
        const charCountEl = document.getElementById('simpleCharCount');
        if (charCountEl) charCountEl.textContent = journalContent.value.length.toLocaleString();
      });
      journalContent.addEventListener('blur', () => {
        saveJournal();
      });
    }

    // 4-1. Journal Format Buttons
    document.querySelectorAll('.simple-fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (cmd) this.applySimpleJournalFormat(cmd);
      });
    });

    // 4-2. Journal Template Buttons
    document.querySelectorAll('.simple-tpl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = btn.dataset.tpl;
        if (tpl) this.applySimpleJournalTemplate(tpl);
      });
    });

    // 4-3. Extract To-Do from Journal
    document.getElementById('simpleExtractTodoFromJournalBtn')?.addEventListener('click', () => {
      this.extractActionGuideFromSimpleJournal();
    });

    // 4-4. Idea Notepad Form & Search
    document.getElementById('simpleAddMemoBtn')?.addEventListener('click', () => {
      this.addSimpleMemo();
    });
    document.getElementById('simpleMemoSearchInput')?.addEventListener('input', (e) => {
      this.simpleMemoSearchQuery = e.target.value;
      this.renderSimpleMemos();
    });

    // 5. AI Journal Draft in Simple Mode
    document.getElementById('simpleAiJournalBtn')?.addEventListener('click', async () => {
      await this.generateAiJournalDraft();
      const dayData = storage.getDayData(this.currentDate);
      if (document.getElementById('simpleJournalContent')) {
        document.getElementById('simpleJournalContent').value = dayData.journal?.content || this.journalContent?.value || '';
        const charCountEl = document.getElementById('simpleCharCount');
        if (charCountEl) charCountEl.textContent = (document.getElementById('simpleJournalContent').value.length).toLocaleString();
      }
    });

    // 6. Save Quick Memo
    const saveMemo = () => {
      const val = document.getElementById('simpleQuickMemo')?.value || '';
      const dayData = storage.getDayData(this.currentDate);
      const cond = dayData.condition || {};
      storage.updateDayData(this.currentDate, { condition: { ...cond, memo: val }, quickMemo: val });
      if (this.quickMemoInput) this.quickMemoInput.value = val;
      this.showToast('아이디어 메모가 저장되었습니다.');
    };
    document.getElementById('simpleSaveMemoBtn')?.addEventListener('click', saveMemo);
    document.getElementById('simpleQuickMemo')?.addEventListener('blur', saveMemo);

    // 7. Simple Mini-Calendar Nav
    document.getElementById('simpleCalPrev')?.addEventListener('click', () => {
      this.tabCalState.dashboard.month--;
      if (this.tabCalState.dashboard.month < 0) {
        this.tabCalState.dashboard.month = 11;
        this.tabCalState.dashboard.year--;
      }
      this.renderSimpleMiniCalendar();
    });

    document.getElementById('simpleCalNext')?.addEventListener('click', () => {
      this.tabCalState.dashboard.month++;
      if (this.tabCalState.dashboard.month > 11) {
        this.tabCalState.dashboard.month = 0;
        this.tabCalState.dashboard.year++;
      }
      this.renderSimpleMiniCalendar();
    });

    document.getElementById('simpleCalToday')?.addEventListener('click', () => {
      const now = new Date();
      this.tabCalState.dashboard.year = now.getFullYear();
      this.tabCalState.dashboard.month = now.getMonth();
      this.renderSimpleMiniCalendar();
    });

    // 8. 50대 5대 황금 습관 클릭 이벤트
    document.querySelectorAll('.simple-50s-habit-item').forEach(item => {
      item.addEventListener('click', () => {
        const habitKey = item.dataset.habit;
        if (habitKey) this.toggle50sHabit(habitKey);
      });
    });

    // 9. 50대 AI 인생 코치 버튼 & 닫기
    document.getElementById('simple50sCoachBtn')?.addEventListener('click', () => {
      this.run50sLifeCoach();
    });
    document.getElementById('close50sCoachBoxBtn')?.addEventListener('click', () => {
      const box = document.getElementById('simple50sCoachResultBox');
      if (box) box.style.display = 'none';
    });
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
          li.querySelector('.todo-checkbox')?.addEventListener('change', (e) => {
            task.completed = e.target.checked;
            storage.updateDayData(this.currentDate, { eveningRoutine: er });
            this.renderEveningOS();
            this.renderTabCalendar('evening');
            this.calculateEES();
          });
          li.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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
          li.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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
  // 🌳 비주얼 인터랙티브 트리 맵 렌더러 (Visual Tree - Daily to Yearly)
  // ==========================================
  renderVisualTree() {
    if (!this.visualTreeCanvas) return;
    this.visualTreeCanvas.innerHTML = '';

    const goals = storage.getGoals();
    const daily = goals.filter(g => g.horizon === 'daily');
    const weekly = goals.filter(g => g.horizon === 'weekly' || g.horizon === 'short');
    const monthly = goals.filter(g => g.horizon === 'monthly' || g.horizon === 'mid');
    const yearly = goals.filter(g => g.horizon === 'yearly' || g.horizon === 'long');

    const tiers = [
      { key: 'DAILY', label: '☀️ 1. 일일 핵심 실행 (Daily)', list: daily, badgeClass: 'badge-daily' },
      { key: 'WEEKLY', label: '⚡ 2. 주간 스프린트 (Weekly)', list: weekly, badgeClass: 'badge-weekly' },
      { key: 'MONTHLY', label: '🎯 3. 월간 마일스톤 (Monthly)', list: monthly, badgeClass: 'badge-monthly' },
      { key: 'YEARLY', label: '🚀 4. 년간 장기 비전 (Yearly)', list: yearly, badgeClass: 'badge-yearly' }
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
        nodesContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem; padding:6px;">등록된 목표가 없습니다.</span>`;
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

  // ==========================================
  // 📅 Goal Hierarchy Render (일일 ➔ 주간 ➔ 월간 ➔ 년간 순서)
  // ==========================================
  renderGoalHierarchy() {
    const goals = storage.getGoals();
    const daily = goals.filter(g => g.horizon === 'daily');
    const weekly = goals.filter(g => g.horizon === 'weekly' || g.horizon === 'short');
    const monthly = goals.filter(g => g.horizon === 'monthly' || g.horizon === 'mid');
    const yearly = goals.filter(g => g.horizon === 'yearly' || g.horizon === 'long');

    const dBadge = document.getElementById('dailyCountBadge');
    const wBadge = document.getElementById('weeklyCountBadge');
    const mBadge = document.getElementById('monthlyCountBadge');
    const yBadge = document.getElementById('yearlyCountBadge');

    if (dBadge) dBadge.textContent = `${daily.length}개 핵심 실행`;
    if (wBadge) wBadge.textContent = `${weekly.length}개 스프린트`;
    if (mBadge) mBadge.textContent = `${monthly.length}개 마일스톤`;
    if (yBadge) yBadge.textContent = `${yearly.length}개 년간 비전`;

    this.renderHierarchyGrid(this.dailyGoalsGrid, daily, 'daily');
    this.renderHierarchyGrid(this.weeklyGoalsGrid, weekly, 'weekly');
    this.renderHierarchyGrid(this.monthlyGoalsGrid, monthly, 'monthly');
    this.renderHierarchyGrid(this.yearlyGoalsGrid, yearly, 'yearly');
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
      daily: { label: '⚡ 주간 스프린트로 상향 연계', nextLevel: 'weekly' },
      weekly: { label: '🎯 월간 마일스톤으로 상향 연계', nextLevel: 'monthly' },
      monthly: { label: '🚀 년간 장기 비전으로 상향 연계', nextLevel: 'yearly' },
      yearly: { label: '👑 10조 자산가 로드맵으로 연동', nextLevel: 'trillion' }
    };

    list.forEach(goal => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      const isDone = (goal.progress || 0) >= 100;
      const cascadeInfo = nextLevelMap[level] || { label: '연계', nextLevel: 'daily' };

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
            <i class="fa-solid fa-arrow-up-long"></i> ${cascadeInfo.label}
          </button>
        </div>
      `;

      // Complete checkbox
      card.querySelector('.hgoal-check')?.addEventListener('change', (e) => {
        const p = e.target.checked ? 100 : 0;
        storage.updateGoal(goal.id, { progress: p });
        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      // Quick stepper buttons
      card.querySelectorAll('.hgoal-step-btn').forEach(btn => {
        btn?.addEventListener('click', () => {
          const add = parseInt(btn.dataset.val);
          const newP = (add === 100) ? 100 : Math.min(100, (goal.progress || 0) + add);
          storage.updateGoal(goal.id, { progress: newP });
          this.renderGoalHierarchy();
          this.renderTabCalendar('goals');
          this.renderAnalytics();
        });
      });

      // Slider
      card.querySelector('.hgoal-slider')?.addEventListener('change', (e) => {
        const p = parseInt(e.target.value);
        storage.updateGoal(goal.id, { progress: p });
        this.renderGoalHierarchy();
        this.renderTabCalendar('goals');
        this.renderAnalytics();
      });

      // Cascade button
      card.querySelector('.hgoal-cascade-btn')?.addEventListener('click', () => {
        if (cascadeInfo.nextLevel === 'trillion') {
          this.switchTab('ten-trillion');
          this.showToast('10조 자산가 로드맵으로 연결되었습니다! 👑');
        } else {
          const newTitle = `[연계] ${goal.title}`;
          storage.addGoal({
            title: newTitle,
            pillar: goal.pillar || 'career',
            horizon: cascadeInfo.nextLevel,
            keyResult: `상위 목표 연계: ${goal.title}`,
            actions: [`실행 단계 1: ${goal.title} 완수`]
          });
          this.renderGoalHierarchy();
          this.showToast(`상위 단계(${cascadeInfo.nextLevel})로 성공적으로 연계되었습니다! 🚀`);
        }
      });

      // Push to Todo
      card.querySelector('.goal-push-todo-btn')?.addEventListener('click', () => {
        this.pushActionToTodayTodo(`[${level.toUpperCase()} 목표실행] ${goal.title}`, goal.pillar || 'career');
      });

      // Delete
      card.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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

      li.querySelector('.todo-checkbox')?.addEventListener('change', (e) => {
        todo.completed = e.target.checked;
        storage.updateDayData(this.currentDate, { todos });
        this.renderTodos();
        this.renderTabCalendar('dashboard');
        this.renderAnalytics();
      });

      li.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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
      li.querySelector('input')?.addEventListener('change', (e) => {
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

      div?.addEventListener('click', () => {
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
      item.querySelector('button')?.addEventListener('click', () => {
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
      div.querySelector('.todo-delete-btn')?.addEventListener('click', () => {
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
      icon?.addEventListener('click', () => {
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

      card.querySelector('.study-photo-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        photos.splice(idx, 1);
        storage.updateDayData(this.currentDate, { study: { ...dayData.study, photos } });
        this.renderStudyPhotos();
        this.renderStudyArchive();
        this.renderTabCalendar('study');
        this.showToast('학습 이미지가 삭제되었습니다.');
      });

      card?.addEventListener('click', () => {
        const win = window.open('');
        win.document.write(`<body style="margin:0; background:#080d1a; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${photo}" style="max-width:95vw; max-height:95vh; border-radius:8px; box-shadow:0 0 20px rgba(0,0,0,0.8);"></body>`);
      });

      this.studyPhotoGallery.appendChild(card);
    });
  }

  renderStudyArchive() {
    if (!this.studyArchiveList) this.studyArchiveList = document.getElementById('studyArchiveList');
    if (!this.studyArchiveList) return;
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

      card.querySelector('.copy-archive-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = `[${s.date} 학습 기록]\n📚 주제: ${s.topic}\n⏱️ 달성 시간: ${s.actualHours}시간\n💡 핵심 TIL: ${s.til}\n\n📝 상세 노트:\n${s.notes}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showToast(`📋 ${s.date} 학습 노트가 클립보드에 복사되었습니다!`);
        });
      });

      card?.addEventListener('click', () => {
        this.setDate(s.date);
      });

      this.studyArchiveList.appendChild(card);
    });
  }

  // ==========================================
  // 15. Principles Rendering
  // ==========================================
  renderPrinciples() {
    if (!this.principlesGrid) this.principlesGrid = document.getElementById('principlesGrid');
    if (!this.principlesGrid) return;
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

      card.querySelector('.todo-delete-btn')?.addEventListener('click', (e) => {
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
      case 'quick1min':
        tpl = `### ⚡ 1분 초간단 핵심 회고 (3문장)
1. 💡 **오늘 가장 보람찼던 1가지:** 
2. 🧘 **오늘 나에게 가장 고마웠던 순간:** 
3. 🚀 **내일 퇴근 후 반드시 끝낼 1% 행동:** `;
        break;
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
      span.querySelector('.tag-remove-btn')?.addEventListener('click', () => {
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
  // 17. Journal Right Sidebar Calendar (고화질 감성 캘린더)
  // ==========================================
  renderJournalRightCalendar() {
    const titleEl = document.getElementById('jCalTitle');
    const subtitleEl = document.getElementById('jCalSubtitle');
    const gridEl = document.getElementById('jCalGrid');
    const listEl = document.getElementById('jCalMonthList');
    const countBadge = document.getElementById('journalMonthCountBadge');
    if (!titleEl || !gridEl) return;

    const st = this.tabCalState.journal || { year: new Date().getFullYear(), month: new Date().getMonth() };
    titleEl.textContent = `${st.year}년 ${st.month + 1}월`;
    gridEl.innerHTML = '';

    const first = new Date(st.year, st.month, 1);
    const last = new Date(st.year, st.month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();

    const prevLast = new Date(st.year, st.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell other-month';
      cell.innerHTML = `<span class="dash-cal-num">${prevLast - i}</span>`;
      gridEl.appendChild(cell);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const moodEmojis = { great: '😆', good: '😊', neutral: '😐', tired: '🥱', stressed: '😣' };
    const allDays = storage.data.days || {};
    const ymPrefix = `${st.year}-${String(st.month + 1).padStart(2, '0')}`;

    let monthJournalCount = 0;
    let monthPhotoCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(st.month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullDate = `${st.year}-${mStr}-${dStr}`;

      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === this.currentDate) cell.classList.add('selected');

      const dayData = allDays[fullDate] || {};
      const journal = dayData.journal || {};
      const hasJournal = journal && (journal.title || journal.content);
      const photoCount = (journal.photos ? journal.photos.length : 0) + (journal.photoIds ? journal.photoIds.length : 0);
      const mood = dayData.mood ? moodEmojis[dayData.mood] || '' : '';

      if (hasJournal) {
        monthJournalCount++;
        monthPhotoCount += photoCount;
      }

      // Rich tooltip
      const tooltip = [
        `[${fullDate}]`,
        hasJournal ? `📝 ${journal.title || '제목 없는 일기'}` : '일기 미작성',
        mood ? `기분: ${mood}` : '',
        photoCount > 0 ? `📷 사진 ${photoCount}장` : ''
      ].filter(Boolean).join('\n');
      cell.title = tooltip;

      let badgesHtml = '';
      if (mood) badgesHtml += `<span style="font-size:0.75rem; line-height:1;">${mood}</span>`;
      else if (hasJournal) badgesHtml += `<span style="font-size:0.75rem; line-height:1;">📝</span>`;
      if (photoCount > 0) badgesHtml += `<span class="dash-cal-dot" style="background:#38bdf8;" title="사진 포함"></span>`;

      cell.innerHTML = `
        <span class="dash-cal-num">${d}</span>
        <div class="dash-cal-badges">${badgesHtml}</div>
      `;

      cell.addEventListener('click', () => {
        this.setDate(fullDate);
      });

      gridEl.appendChild(cell);
    }

    // Subtitle summary
    if (subtitleEl) {
      subtitleEl.innerHTML = `✍️ ${monthJournalCount}편 작성${monthPhotoCount > 0 ? ` · 📷 ${monthPhotoCount}장` : ''}`;
    }

    if (listEl) {
      listEl.innerHTML = '';
      const allJournals = storage.getAllJournals();
      const monthJournals = allJournals.filter(j => j.date && j.date.startsWith(ymPrefix));

      if (countBadge) countBadge.textContent = `${monthJournals.length}편`;

      if (monthJournals.length === 0) {
        listEl.innerHTML = `
          <div style="text-align:center; color: var(--text-muted); padding: 24px 10px; font-size: 0.78rem;">
            <i class="fa-solid fa-feather-pointed" style="font-size:1.5rem; margin-bottom:6px; opacity:0.5; color:#c084fc;"></i>
            <p>이달에 작성된 일기가 아직 없습니다.<br>[오늘 활동 기반 AI 일기 자동 생성]으로 하루를 남겨보세요! ✨</p>
          </div>
        `;
      } else {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        monthJournals.forEach(j => {
          const card = document.createElement('div');
          const isCurrent = (j.date === this.currentDate);
          card.className = `dash-feed-card ${isCurrent ? 'active' : ''}`;

          const dayDate = new Date(j.date);
          const dayOfWeek = dayNames[dayDate.getDay()] || '';
          const dayNum = j.date.split('-')[2];
          const mood = moodEmojis[j.mood] || '📝';
          const weather = j.weather || '☀️';
          const snippet = (j.content || '').replace(/[#*`_>]/g, '').trim().substring(0, 80);
          const tags = j.tags || [];
          const tagsHtml = tags.length > 0 ? `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${tags.map(t => `<span class="badge" style="background:rgba(192,132,252,0.18); color:#c084fc; font-size:0.65rem; padding:1px 4px;">#${this.escapeHtml(t)}</span>`).join('')}</div>` : '';

          card.innerHTML = `
            <div class="dash-feed-top">
              <span class="dash-feed-date"><i class="fa-regular fa-calendar" style="color:#c084fc;"></i> ${dayNum}일 (${dayOfWeek})</span>
              <span>${weather} ${mood}</span>
            </div>
            <div class="dash-feed-focus" style="color:var(--text-primary); margin-top:2px;">${this.escapeHtml(j.title || `${j.date}의 일기`)}</div>
            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${this.escapeHtml(snippet || '내용 없음...')}</div>
            ${tagsHtml}
          `;

          card.addEventListener('click', () => {
            this.setDate(j.date);
          });

          listEl.appendChild(card);
        });
      }
    }
  }

  // ==========================================
  // 18. Calendar Tab & Analytics
  // ==========================================
  renderCalendar() {
    if (!this.calendarDaysGrid) this.calendarDaysGrid = document.getElementById('calendarDaysGrid');
    if (!this.calendarMonthTitle) this.calendarMonthTitle = document.getElementById('calendarMonthTitle');
    if (!this.calendarDaysGrid) return;
    if (this.calendarMonthTitle) this.calendarMonthTitle.textContent = `${this.calYear}년 ${this.calMonth + 1}월`;
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

      cell?.addEventListener('click', () => {
        this.setDate(fullDate);
        this.renderCalendar();
      });

      this.calendarDaysGrid.appendChild(cell);
    }

    this.renderArchive();
  }

  renderArchive() {
    if (!this.archiveList) this.archiveList = document.getElementById('archiveList');
    if (!this.archiveList) return;
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

      card?.addEventListener('click', () => {
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
    if (this.streakDays) this.streakDays.textContent = `${streak}일`;
    if (this.streakSub) this.streakSub.textContent = streak > 0 ? '꾸준함이 비범함을 만듭니다' : '오늘 첫 일기를 작성해보세요 ✨';

    const goals = storage.getGoals();
    let totalP = 0;
    goals.forEach(g => { totalP += (g.progress || 0); });
    const avgGoalRate = goals.length > 0 ? Math.round(totalP / goals.length) : 0;
    if (this.totalGoalRateVal) this.totalGoalRateVal.textContent = `${avgGoalRate}%`;
    if (this.totalGoalCountVal) this.totalGoalCountVal.textContent = `총 ${goals.length}개 목표 관리 중`;

    let totalStudyHours = 0;
    let totalStudyCount = 0;
    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYM) && day.study) {
        if (day.study.actualHours > 0) totalStudyHours += day.study.actualHours;
        if (day.study.topic) totalStudyCount++;
      }
    }
    if (this.totalStudyHoursVal) this.totalStudyHoursVal.textContent = `${totalStudyHours}시간`;
    if (this.totalStudyCountVal) this.totalStudyCountVal.textContent = `총 ${totalStudyCount}개 주제 학습`;

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
    if (this.todoRateVal) this.todoRateVal.textContent = `${rate}%`;
    if (this.todoRateSub) this.todoRateSub.textContent = `최근 7일 (${compT}/${totalT} 완료)`;

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
    if (!this.moodAnalyticsBars) this.moodAnalyticsBars = document.getElementById('moodAnalyticsBars');
    if (this.moodAnalyticsBars) {
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
    }

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
    if (!this.habitAnalyticsBars) this.habitAnalyticsBars = document.getElementById('habitAnalyticsBars');
    if (this.habitAnalyticsBars) {
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

  // ==========================================
  // 🛠️ 추가된 필수 헬퍼 & AI 연동 메서드
  // ==========================================
  formatDateKey(d) {
    if (!d) return todayKST();
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  setMood(mood) {
    const dayData = storage.getDayData(this.currentDate);
    storage.updateDayData(this.currentDate, { mood });
    this.highlightMood(mood);
    this.showToast(`오늘의 기분이 '${mood}'(으)로 기록되었습니다.`);
  }

  async handleDashboardTroubleChat(trouble) {
    if (!trouble) return;
    this.appendDashChatMessage('user', trouble);
    const bubbleId = 'dash_bot_' + Date.now();
    this.appendDashChatMessage('bot', '<i class="fa-solid fa-spinner fa-spin"></i> 1% AI 코치가 분석 중입니다...', bubbleId);
    
    const dayData = storage.getDayData(this.currentDate);
    const focus = dayData.focus || '목표 미설정';
    const prompt = `[Daily Flow 1% 실행 코칭]\n오늘 북극성 목표: ${focus}\n사용자 질문/고민: "${trouble}"\n\n상황을 꿰뚫는 명쾌하고 실행 가능한 1% 실행 지침 3가지를 제시해줘.`;
    
    try {
      const res = await geminiClient.generateText(prompt);
      this.updateDashChatMessage(bubbleId, this.parseMarkdown(res));
    } catch (e) {
      this.updateDashChatMessage(bubbleId, 'AI 응답을 생성하지 못했습니다. 설정을 확인해주세요.');
    }
  }

  openGlobalAiModal(prompt) {
    if (this.geminiModal) {
      this.geminiModal.classList.add('active');
    }
  }

  async generateWeeklyRetroReport() {
    if (!this.weeklyReportContent) return;
    this.weeklyReportContent.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin text-emerald" style="font-size:2rem;"></i><p style="margin-top:10px;">Gemini가 지난 7일간의 실행 데이터를 종합 결산 분석 중입니다...</p></div>';
    
    const ws = weeklyEES(this.currentDate);
    const win = lastNDays(this.currentDate, 7);
    const allDays = storage.data.days || {};
    let totalChars = 0;
    let totalTodos = 0;
    let doneTodos = 0;
    win.forEach(dStr => {
      const d = allDays[dStr];
      if (d) {
        (d.todos || []).forEach(t => { totalTodos++; if (t.completed) doneTodos++; });
        (d.deepwork || []).forEach(b => { totalChars += (Number(b.chars) || 0); });
      }
    });

    const prompt = `[주간 자동 결산 리포트]
기준일: ${this.currentDate}
주간 EES 평균: ${ws.avg}점 (${ws.grade})
7일간 총 집필 자수: ${totalChars.toLocaleString()}자
To-Do 완료율: ${doneTodos}/${totalTodos} (${totalTodos > 0 ? Math.round(doneTodos/totalTodos*100) : 0}%)
결정 로그: ${storage.data.decisions.length}건

위 데이터를 기반으로 다음 항목으로 주간 결산 리포트를 작성해줘:
1. 🏆 **이번 주 핵심 성과 & 1% 실행 하이라이트**
2. ⚠️ **가장 취약했던 지점 및 병목 원인 분석**
3. 🚀 **다음 주 단 하나의 돌파 과업 및 실행 시간표**`;

    try {
      const res = await geminiClient.generateText(prompt);
      this.weeklyReportContent.innerHTML = this.parseMarkdown(res);
      this.showToast('주간 자동 결산 리포트가 생성되었습니다! 📊');
    } catch (e) {
      this.weeklyReportContent.innerHTML = '<p style="color:var(--accent-rose);">리포트 생성 중 오류가 발생했습니다.</p>';
    }
  }

  async generateAiJournalDraft() {
    const dayData = storage.getDayData(this.currentDate);
    const todos = (dayData.todos || []).filter(t => t.completed).map(t => t.text).join(', ');
    const focus = dayData.focus || '오늘의 집중 목표';
    
    this.showToast('AI가 오늘의 실행 데이터를 바탕으로 일기 초안을 작성 중입니다...');
    const prompt = `오늘의 날짜: ${this.currentDate}\n오늘의 집중: ${focus}\n완료한 주요 과업: ${todos || '기본 업무 완료'}\n\n위 실행 내역을 바탕으로 1% 성장 관점의 진솔하고 깊이 있는 하루 일기 초안을 작성해줘. (사실-느낌-교훈-실행 4단계 포함)`;
    
    try {
      const draft = await geminiClient.generateText(prompt);
      if (this.journalContent) {
        this.journalContent.value = draft;
        this.updateJournalStats();
        this.autoSaveJournal();
        this.showToast('AI 일기 초안이 작성되었습니다! ✨');
      }
    } catch (e) {
      this.showToast('일기 생성에 실패했습니다.', 'error');
    }
  }

  async extractActionGuideFromJournal() {
    const content = this.journalContent?.value?.trim();
    if (!content) {
      this.showToast('일기 본문 내용이 없습니다.', 'error');
      return;
    }
    this.showToast('일기에서 핵심 실행 지침을 추출 중입니다...');
    const prompt = `[일기 내용]\n${content}\n\n위 일기에서 내일 즉시 행동으로 옮겨야 할 [핵심 실행 액션 3가지]를 명확한 할 일 형태로 뽑아줘.`;
    try {
      const res = await geminiClient.generateText(prompt);
      const firstLine = res.split('\n')[0].replace(/^[-*0-9.\s]+/, '') || '일기 피드백 액션 실행';
      this.pushActionToTodayTodo(`[일기 피드백] ${firstLine}`, 'career');
      this.showToast('일기에서 추출된 실행 지침이 오늘의 To-Do로 등록되었습니다! ⚡');
    } catch (e) {
      this.showToast('추출에 실패했습니다.', 'error');
    }
  }

  async handleAiCoachMessage(msg) {
    if (!msg) return;
    this.appendChatMessage('user', msg);
    const bubbleId = 'ai_bot_' + Date.now();
    this.appendChatMessage('bot', '<i class="fa-solid fa-spinner fa-spin"></i> 제미나이 1% 코치가 분석 중입니다...', bubbleId);
    
    const dayData = storage.getDayData(this.currentDate);
    const prompt = `당신은 최고 수준의 1% Life OS 전략 코치입니다.\n현재 날짜: ${this.currentDate}\n오늘의 포커스: ${dayData.focus || '미정'}\n질문: "${msg}"\n\n직설적이고 냉철하며 실질적인 지침을 제시해주세요.`;
    
    try {
      const res = await geminiClient.generateText(prompt);
      this.updateChatMessage(bubbleId, this.parseMarkdown(res));
    } catch (e) {
      this.updateChatMessage(bubbleId, '코칭 응답 생성 중 오류가 발생했습니다.');
    }
  }
}

// Global initialization
async function initDailyFlow() {
  if (!window.dailyFlowApp) {
    window.dailyFlowApp = new DailyFlowApp();
    window.app = window.dailyFlowApp;
    await window.dailyFlowApp.init();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initDailyFlow);
} else {
  initDailyFlow();
}
