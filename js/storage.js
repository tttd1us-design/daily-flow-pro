/**
 * Storage Manager for Daily Flow
 * Handles LocalStorage persistence, data migrations, exports and imports.
 */

const STORAGE_KEY = 'daily_flow_data_v1';

// Default initial state & sample data
const DEFAULT_STATE = {
  settings: {
    theme: 'dark',
    userName: '사용자',
    defaultHabits: [
      { id: 'h1', name: '물 2L 마시기', icon: '💧', target: 1 },
      { id: 'h2', name: '아침 독서 30분', icon: '📖', target: 1 },
      { id: 'h3', name: '스트레칭 & 운동', icon: '🏃', target: 1 },
      { id: 'h4', name: '하루 감사일기 쓰기', icon: '✨', target: 1 }
    ]
  },
  days: {
    // Format: 'YYYY-MM-DD': { focus, mood, todos, habits, timeBlocks, condition, journal }
  }
};

class StorageManager {
  constructor() {
    this.data = this.loadData();
    this.ensureSampleData();
  }

  loadData() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      const parsed = JSON.parse(serialized);
      return {
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        days: parsed.days || {}
      };
    } catch (e) {
      console.error('Failed to load data from storage:', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save data to storage:', e);
    }
  }

  // Get or initialize data for a specific date (YYYY-MM-DD)
  getDayData(dateStr) {
    if (!this.data.days[dateStr]) {
      this.data.days[dateStr] = {
        focus: '',
        mood: '',
        todos: [],
        habits: {}, // { habitId: boolean }
        timeBlocks: [],
        condition: {
          water: 0,
          energy: 50,
          sleep: 7.0,
          memo: ''
        },
        journal: {
          title: '',
          content: '',
          tags: [],
          photos: [],
          updatedAt: null
        }
      };
      this.saveData();
    }
    return this.data.days[dateStr];
  }

  updateDayData(dateStr, partialData) {
    const current = this.getDayData(dateStr);
    this.data.days[dateStr] = {
      ...current,
      ...partialData,
      condition: { ...current.condition, ...(partialData.condition || {}) },
      journal: { ...current.journal, ...(partialData.journal || {}) }
    };
    this.saveData();
    return this.data.days[dateStr];
  }

  getHabits() {
    return this.data.settings.defaultHabits || [];
  }

  addHabit(name, icon = '✨') {
    const newHabit = {
      id: 'h_' + Date.now(),
      name,
      icon,
      target: 1
    };
    this.data.settings.defaultHabits.push(newHabit);
    this.saveData();
    return newHabit;
  }

  deleteHabit(habitId) {
    this.data.settings.defaultHabits = this.data.settings.defaultHabits.filter(h => h.id !== habitId);
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

  exportJson() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `daily_flow_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.days) {
        throw new Error('유효한 백업 파일 형식이 아닙니다.');
      }
      this.data = parsed;
      this.saveData();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.ensureSampleData();
    this.saveData();
  }

  ensureSampleData() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.data.days[today]) {
      this.data.days[today] = {
        focus: '핵심 업무 완료 및 저녁 독서 1시간 집중하기',
        mood: 'great',
        todos: [
          { id: 't1', text: '주간 기획안 리뷰 및 피드백 정리', category: 'work', completed: true },
          { id: 't2', text: 'Daily Flow 일기 앱 기능 테스트', category: 'work', completed: true },
          { id: 't3', text: '저녁 가벼운 조깅 30분', category: 'health', completed: false },
          { id: 't4', text: '취침 전 책 20페이지 읽기', category: 'study', completed: false }
        ],
        habits: {
          'h1': true,
          'h2': true,
          'h3': false,
          'h4': false
        },
        timeBlocks: [
          { id: 'tb1', start: '09:30', end: '11:00', title: '오전 딥워크 & 핵심 업무 처리', category: 'work' },
          { id: 'tb2', start: '14:00', end: '15:30', title: '팀 미팅 및 일정 조율', category: 'meeting' },
          { id: 'tb3', start: '20:00', end: '21:00', title: '개인 공부 및 일기 작성', category: 'study' }
        ],
        condition: {
          water: 5,
          energy: 80,
          sleep: 7.5,
          memo: '오늘 컨디션이 매우 좋음! 집중력 최고.'
        },
        journal: {
          title: '새로운 하루의 시작과 몰입의 즐거움',
          content: `### 🌟 오늘 하루를 돌아보며\n\n오늘은 아침부터 집중력이 높아서 계획했던 중요한 업무들을 빠르게 끝낼 수 있었다. 작은 성취감들이 모여 하루 전체를 긍정적인 에너지로 채워주는 느낌이다.\n\n### 💡 감사한 일 3가지\n1. 상쾌한 아침 공기를 마시며 시작한 하루\n2. 동료와의 원활한 협업과 따뜻한 대화\n3. 온전히 나 자신에게 집중할 수 있는 저녁 시간\n\n> "성공은 매일 반복되는 작은 노력들의 합이다."`,
          tags: ['성장', '몰입', '감사'],
          photos: [],
          updatedAt: new Date().toISOString()
        }
      };
      this.saveData();
    }
  }
}

export const storage = new StorageManager();
