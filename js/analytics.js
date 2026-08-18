/**
 * Analytics Module for Daily Flow
 * Computes streaks, journal frequencies, mood distributions, and habit completion stats.
 */

import { storage } from './storage.js';
import { todayKST, lastNDays, sum } from './utils.js';

export class Analytics {
  constructor(app) {
    this.app = app;
    this.initElements();
  }

  initElements() {
    this.streakDays = document.getElementById('streakDays');
    this.streakSub = document.getElementById('streakSub');
    this.totalJournalCount = document.getElementById('totalJournalCount');
    this.monthJournalCount = document.getElementById('monthJournalCount');
    this.todoRateVal = document.getElementById('todoRateVal');
    this.todoRateSub = document.getElementById('todoRateSub');
    this.totalGoalRateVal = document.getElementById('totalGoalRateVal');
    this.totalGoalCountVal = document.getElementById('totalGoalCountVal');
    this.totalStudyHoursVal = document.getElementById('totalStudyHoursVal');
    this.totalStudyCountVal = document.getElementById('totalStudyCountVal');
    this.primaryMoodVal = document.getElementById('primaryMoodVal');
    this.primaryMoodSub = document.getElementById('primaryMoodSub');

    this.moodAnalyticsBars = document.getElementById('moodAnalyticsBars');
    this.habitAnalyticsBars = document.getElementById('habitAnalyticsBars');
  }

  render() {
    this.renderTopMetrics();
    this.renderMoodBars();
    this.renderHabitBars();
  }

  renderTopMetrics() {
    const allDays = storage.data.days || {};
    const today = todayKST();
    const currentYearMonth = (this.app?.currentDate || today).substring(0, 7);

    // 1. Calculate Journal Streak
    let streak = 0;
    let curr = new Date(today);

    const todayJournal = allDays[today]?.journal;
    const hasToday = todayJournal && (todayJournal.title || todayJournal.content);
    if (!hasToday) {
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
    if (this.streakSub) {
      if (streak > 7) {
        this.streakSub.textContent = '대단해요! 습관이 잘 정착되고 있어요 🔥';
      } else if (streak > 0) {
        this.streakSub.textContent = '꾸준한 기록으로 하루를 채워가세요!';
      } else {
        this.streakSub.textContent = '오늘 첫 일기를 작성해보세요 ✨';
      }
    }

    // 2. Total & This Month Journal Count
    const allJournals = storage.getAllJournals();
    if (this.totalJournalCount) this.totalJournalCount.textContent = `${allJournals.length}편`;
    const thisMonthJournals = allJournals.filter(j => j.date.startsWith(currentYearMonth));
    if (this.monthJournalCount) this.monthJournalCount.textContent = `이번 달 ${thisMonthJournals.length}편 작성`;

    // 3. Todo Completion Rate (Last 7 days)
    let totalTodos = 0;
    let completedTodos = 0;
    const l7 = lastNDays(today, 7);
    l7.forEach(dStr => {
      const dayData = allDays[dStr];
      if (dayData && dayData.todos) {
        dayData.todos.forEach(t => {
          totalTodos++;
          if (t.completed) completedTodos++;
        });
      }
    });
    const todoRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
    if (this.todoRateVal) this.todoRateVal.textContent = `${todoRate}%`;
    if (this.todoRateSub) this.todoRateSub.textContent = `최근 7일 (${completedTodos}/${totalTodos} 완료)`;

    // 4. Goals & Study Metrics
    const books = storage.list('books');
    const totalChars = sum(books, b => sum(b.chapters, c => c.writtenChars || 0));
    const targetChars = sum(books, b => sum(b.chapters, c => c.targetChars || 18000)) || 270000;
    const goalRate = targetChars > 0 ? Math.min(100, Math.round((totalChars / targetChars) * 100)) : 0;
    if (this.totalGoalRateVal) this.totalGoalRateVal.textContent = `${goalRate}%`;
    if (this.totalGoalCountVal) this.totalGoalCountVal.textContent = `도서 ${books.length}권 집필 중 (${totalChars.toLocaleString()}자)`;

    const totalDeepMin = sum(Object.values(allDays), d => sum(d.deepwork || [], b => (Number(b.chars) || 0) > 0 ? 90 : 0));
    if (this.totalStudyHoursVal) this.totalStudyHoursVal.textContent = `${Math.round(totalDeepMin / 60)}시간`;
    if (this.totalStudyCountVal) this.totalStudyCountVal.textContent = `결정 로그 ${storage.data.decisions.length}건 축적`;

    // 5. Primary Mood This Month
    const moodCounts = { great: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
    let totalMoodDays = 0;

    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYearMonth) && day.mood && moodCounts[day.mood] !== undefined) {
        moodCounts[day.mood]++;
        totalMoodDays++;
      }
    }

    let maxMood = null;
    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxMood = mood;
      }
    }

    const moodNames = {
      great: '😆 최고예요',
      good: '😊 좋아요',
      neutral: '😐 보통이에요',
      tired: '🥱 피곤해요',
      stressed: '😣 스트레스'
    };

    if (this.primaryMoodVal) {
      if (maxMood && maxCount > 0) {
        this.primaryMoodVal.textContent = moodNames[maxMood];
        const pct = Math.round((maxCount / totalMoodDays) * 100);
        if (this.primaryMoodSub) this.primaryMoodSub.textContent = `이번 달 기록의 ${pct}% 차지`;
      } else {
        this.primaryMoodVal.textContent = '-';
        if (this.primaryMoodSub) this.primaryMoodSub.textContent = '기분을 기록해보세요';
      }
    }
  }

  renderMoodBars() {
    if (!this.moodAnalyticsBars) return;
    const allDays = storage.data.days || {};
    const currentYearMonth = (this.app?.currentDate || todayKST()).substring(0, 7);
    const moodCounts = { great: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
    let total = 0;

    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYearMonth) && day.mood && moodCounts[day.mood] !== undefined) {
        moodCounts[day.mood]++;
        total++;
      }
    }

    const moodConfig = [
      { key: 'great', label: '😆 최고', color: '#10b981' },
      { key: 'good', label: '😊 좋음', color: '#6366f1' },
      { key: 'neutral', label: '😐 보통', color: '#f59e0b' },
      { key: 'tired', label: '🥱 피곤', color: '#94a3b8' },
      { key: 'stressed', label: '😣 스트레스', color: '#f43f5e' }
    ];

    let html = '';
    moodConfig.forEach(m => {
      const count = moodCounts[m.key];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="mood-bar-item">
          <div class="mood-bar-label">
            <span>${m.label}</span>
            <span>${count}일 (${pct}%)</span>
          </div>
          <div class="mood-bar-track">
            <div class="mood-bar-fill" style="width: ${pct}%; background-color: ${m.color};"></div>
          </div>
        </div>
      `;
    });

    this.moodAnalyticsBars.innerHTML = html;
  }

  renderHabitBars() {
    if (!this.habitAnalyticsBars) return;
    const habits = storage.getHabits();
    const allDays = storage.data.days || {};
    const currentYearMonth = (this.app?.currentDate || todayKST()).substring(0, 7);

    let daysInMonth = 0;
    for (const dateStr of Object.keys(allDays)) {
      if (dateStr.startsWith(currentYearMonth)) daysInMonth++;
    }
    daysInMonth = Math.max(daysInMonth, 1);

    let html = '';
    habits.forEach(h => {
      let completedCount = 0;
      for (const [dateStr, day] of Object.entries(allDays)) {
        if (dateStr.startsWith(currentYearMonth)) {
          if (day.habits && day.habits[h.id]) {
            completedCount++;
          }
        }
      }

      const rate = Math.min(100, Math.round((completedCount / daysInMonth) * 100));
      html += `
        <div class="habit-stat-item">
          <div class="habit-stat-header">
            <span class="habit-stat-name">${h.icon || '✨'} ${h.name}</span>
            <span class="habit-stat-val">${completedCount}일 달성 (${rate}%)</span>
          </div>
          <div class="habit-stat-bar">
            <div class="habit-stat-fill" style="width: ${rate}%;"></div>
          </div>
        </div>
      `;
    });

    this.habitAnalyticsBars.innerHTML = html || '<div class="empty-state-text">등록된 습관이 없습니다.</div>';
  }
}