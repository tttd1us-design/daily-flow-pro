/**
 * Analytics Module for Daily Flow
 * Computes streaks, journal frequencies, mood distributions, and habit completion stats.
 */

import { storage } from './storage.js';

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
    const today = new Date().toISOString().split('T')[0];
    const currentYearMonth = this.app.currentDate.substring(0, 7);

    // 1. Calculate Journal Streak
    let streak = 0;
    let curr = new Date(today);

    // Check today first, if not written check yesterday
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

    this.streakDays.textContent = `${streak}일`;
    if (streak > 7) {
      this.streakSub.textContent = '대단해요! 습관이 잘 정착되고 있어요 🔥';
    } else if (streak > 0) {
      this.streakSub.textContent = '꾸준한 기록으로 하루를 채워가세요!';
    } else {
      this.streakSub.textContent = '오늘 첫 일기를 작성해보세요 ✨';
    }

    // 2. Total & This Month Journal Count
    const allJournals = storage.getAllJournals();
    this.totalJournalCount.textContent = `${allJournals.length}편`;
    const thisMonthJournals = allJournals.filter(j => j.date.startsWith(currentYearMonth));
    this.monthJournalCount.textContent = `이번 달 ${thisMonthJournals.length}편 작성`;

    // 3. Todo Completion Rate (Last 7 days)
    let totalTodos = 0;
    let completedTodos = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayData = allDays[dStr];
      if (dayData && dayData.todos) {
        dayData.todos.forEach(t => {
          totalTodos++;
          if (t.completed) completedTodos++;
        });
      }
    }
    const todoRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
    this.todoRateVal.textContent = `${todoRate}%`;
    this.todoRateSub.textContent = `최근 7일 (${completedTodos}/${totalTodos} 완료)`;

    // 4. Primary Mood This Month
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

    if (maxMood && maxCount > 0) {
      this.primaryMoodVal.textContent = moodNames[maxMood];
      const pct = Math.round((maxCount / totalMoodDays) * 100);
      this.primaryMoodSub.textContent = `이번 달 기록의 ${pct}% 차지`;
    } else {
      this.primaryMoodVal.textContent = '-';
      this.primaryMoodSub.textContent = '기분을 기록해보세요';
    }
  }

  renderMoodBars() {
    const allDays = storage.data.days || {};
    const currentYearMonth = this.app.currentDate.substring(0, 7);
    const moodCounts = { great: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
    let total = 0;

    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYearMonth) && day.mood && moodCounts[day.mood] !== undefined) {
        moodCounts[day.mood]++;
        total++;
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

    if (total === 0) {
      this.moodAnalyticsBars.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 16px;">이번 달 기록된 기분 데이터가 아직 없습니다.</div>`;
      return;
    }

    moodConfig.forEach(cfg => {
      const count = moodCounts[cfg.key] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'stat-bar-row';
      row.innerHTML = `
        <div class="stat-bar-label">
          <span>${cfg.label}</span>
          <span>${count}일 (${pct}%)</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%; background-color: ${cfg.color};"></div>
        </div>
      `;
      this.moodAnalyticsBars.appendChild(row);
    });
  }

  renderHabitBars() {
    const habits = storage.getHabits();
    const allDays = storage.data.days || {};
    const currentYearMonth = this.app.currentDate.substring(0, 7);

    // Days in current month up to today
    let monthDaysCount = 0;
    const habitSuccessCounts = {};
    habits.forEach(h => { habitSuccessCounts[h.id] = 0; });

    for (const [dateStr, day] of Object.entries(allDays)) {
      if (dateStr.startsWith(currentYearMonth)) {
        monthDaysCount++;
        if (day.habits) {
          for (const [hid, done] of Object.entries(day.habits)) {
            if (done && habitSuccessCounts[hid] !== undefined) {
              habitSuccessCounts[hid]++;
            }
          }
        }
      }
    }

    this.habitAnalyticsBars.innerHTML = '';

    if (habits.length === 0) {
      this.habitAnalyticsBars.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 16px;">등록된 습관이 없습니다.</div>`;
      return;
    }

    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

    habits.forEach((habit, idx) => {
      const count = habitSuccessCounts[habit.id] || 0;
      const pct = monthDaysCount > 0 ? Math.min(100, Math.round((count / monthDaysCount) * 100)) : 0;
      const color = colors[idx % colors.length];

      const row = document.createElement('div');
      row.className = 'stat-bar-row';
      row.innerHTML = `
        <div class="stat-bar-label">
          <span>${habit.icon} ${this.escapeHtml(habit.name)}</span>
          <span>${count}일 달성 (${pct}%)</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
        </div>
      `;
      this.habitAnalyticsBars.appendChild(row);
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
