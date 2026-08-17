/**
 * Dashboard Module for Daily Flow
 * Manages daily focus, to-dos, habits, timeblocks, and condition tracking.
 */

import { storage } from './storage.js';

export class Dashboard {
  constructor(app) {
    this.app = app;
    this.currentDate = app.currentDate;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Focus & Mood
    this.focusInput = document.getElementById('dailyFocusInput');
    this.saveFocusBtn = document.getElementById('saveFocusBtn');
    this.moodSelector = document.getElementById('moodSelector');

    // To-Do
    this.todoForm = document.getElementById('todoForm');
    this.todoInput = document.getElementById('todoInput');
    this.todoCategory = document.getElementById('todoCategory');
    this.todoList = document.getElementById('todoList');
    this.todoProgressBar = document.getElementById('todoProgressBar');
    this.todoProgressBadge = document.getElementById('todoProgressBadge');

    // Habit
    this.habitList = document.getElementById('habitList');
    this.addHabitModalBtn = document.getElementById('addHabitModalBtn');
    this.habitModal = document.getElementById('habitModal');
    this.closeHabitModalBtn = document.getElementById('closeHabitModalBtn');
    this.newHabitForm = document.getElementById('newHabitForm');
    this.newHabitName = document.getElementById('newHabitName');
    this.newHabitIcon = document.getElementById('newHabitIcon');
    this.modalHabitList = document.getElementById('modalHabitList');

    // TimeBlock
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

    // Condition
    this.waterCups = document.getElementById('waterCups');
    this.waterCount = document.getElementById('waterCount');
    this.energySlider = document.getElementById('energySlider');
    this.energyLevelText = document.getElementById('energyLevelText');
    this.sleepInput = document.getElementById('sleepInput');
    this.sleepHoursText = document.getElementById('sleepHoursText');
    this.sleepMinusBtn = document.getElementById('sleepMinusBtn');
    this.sleepPlusBtn = document.getElementById('sleepPlusBtn');
    this.quickMemoInput = document.getElementById('quickMemoInput');
  }

  bindEvents() {
    // Focus Save
    this.saveFocusBtn.addEventListener('click', () => {
      const focus = this.focusInput.value.trim();
      storage.updateDayData(this.currentDate, { focus });
      this.app.showToast('오늘의 핵심 목표가 저장되었습니다! 🎯');
    });

    this.focusInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveFocusBtn.click();
      }
    });

    // Mood Click
    this.moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        this.setMood(mood);
      });
    });

    // To-Do Form
    this.todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.todoInput.value.trim();
      const category = this.todoCategory.value;
      if (!text) return;

      const dayData = storage.getDayData(this.currentDate);
      const newTodo = {
        id: 't_' + Date.now(),
        text,
        category,
        completed: false
      };
      dayData.todos.push(newTodo);
      storage.updateDayData(this.currentDate, { todos: dayData.todos });
      this.todoInput.value = '';
      this.renderTodos();
      this.app.refreshAnalytics();
    });

    // Habit Modal
    this.addHabitModalBtn.addEventListener('click', () => {
      this.renderModalHabits();
      this.habitModal.classList.add('active');
    });

    this.closeHabitModalBtn.addEventListener('click', () => {
      this.habitModal.classList.remove('active');
    });

    this.newHabitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.newHabitName.value.trim();
      const icon = this.newHabitIcon.value.trim() || '✨';
      if (!name) return;
      storage.addHabit(name, icon);
      this.newHabitName.value = '';
      this.renderModalHabits();
      this.renderHabits();
      this.app.refreshAnalytics();
      this.app.showToast('새로운 습관이 등록되었습니다.');
    });

    // TimeBlock Modal
    this.addTimeBlockBtn.addEventListener('click', () => {
      this.timeBlockModal.classList.add('active');
    });

    const closeTb = () => this.timeBlockModal.classList.remove('active');
    this.closeTimeBlockModalBtn.addEventListener('click', closeTb);
    this.cancelTimeBlockBtn.addEventListener('click', closeTb);

    this.timeBlockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const dayData = storage.getDayData(this.currentDate);
      const newBlock = {
        id: 'tb_' + Date.now(),
        start: this.tbStartTime.value,
        end: this.tbEndTime.value,
        title: this.tbTitle.value.trim(),
        category: this.tbCategory.value
      };
      dayData.timeBlocks.push(newBlock);
      // Sort by start time
      dayData.timeBlocks.sort((a, b) => a.start.localeCompare(b.start));
      storage.updateDayData(this.currentDate, { timeBlocks: dayData.timeBlocks });
      this.tbTitle.value = '';
      closeTb();
      this.renderTimeBlocks();
      this.app.showToast('일정이 타임 블록에 추가되었습니다.');
    });

    // Condition Events
    this.energySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.updateEnergyDisplay(val);
      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, energy: val } });
    });

    const updateSleep = (delta) => {
      let val = parseFloat(this.sleepInput.value) + delta;
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
    this.sleepInput.addEventListener('change', () => {
      let val = parseFloat(this.sleepInput.value) || 0;
      if (val < 0) val = 0;
      if (val > 24) val = 24;
      val = Math.round(val * 10) / 10;
      this.sleepInput.value = val.toFixed(1);
      this.sleepHoursText.textContent = `${val.toFixed(1)} 시간`;
      const dayData = storage.getDayData(this.currentDate);
      storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, sleep: val } });
    });

    // Quick Memo
    let memoTimeout;
    this.quickMemoInput.addEventListener('input', (e) => {
      clearTimeout(memoTimeout);
      memoTimeout = setTimeout(() => {
        const dayData = storage.getDayData(this.currentDate);
        storage.updateDayData(this.currentDate, { condition: { ...dayData.condition, memo: e.target.value } });
      }, 400);
    });
  }

  loadForDate(dateStr) {
    this.currentDate = dateStr;
    const data = storage.getDayData(dateStr);

    // Focus
    this.focusInput.value = data.focus || '';

    // Mood
    this.highlightMood(data.mood);

    // Render Subcomponents
    this.renderTodos();
    this.renderHabits();
    this.renderTimeBlocks();
    this.renderCondition();
  }

  setMood(mood) {
    storage.updateDayData(this.currentDate, { mood });
    this.highlightMood(mood);
    this.app.refreshCalendar();
    this.app.refreshAnalytics();
    this.app.showToast('오늘의 기분이 기록되었습니다.');
  }

  highlightMood(mood) {
    this.moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
      if (btn.dataset.mood === mood) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  renderTodos() {
    const data = storage.getDayData(this.currentDate);
    const todos = data.todos || [];
    this.todoList.innerHTML = '';

    const completedCount = todos.filter(t => t.completed).length;
    const totalCount = todos.length;
    const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    this.todoProgressBar.style.width = `${rate}%`;
    this.todoProgressBadge.textContent = `${completedCount} / ${totalCount} 완료 (${rate}%)`;

    if (todos.length === 0) {
      this.todoList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">등록된 할 일이 없습니다. 새로운 할 일을 추가해보세요!</li>`;
      return;
    }

    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      
      const categoryLabels = {
        work: '업무',
        personal: '개인',
        health: '건강',
        study: '학습'
      };

      li.innerHTML = `
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
          <span class="category-tag category-${todo.category}">${categoryLabels[todo.category] || '기타'}</span>
          <span class="todo-text">${this.escapeHtml(todo.text)}</span>
        </div>
        <button class="todo-delete-btn" title="삭제"><i class="fa-solid fa-trash"></i></button>
      `;

      // Checkbox event
      li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
        todo.completed = e.target.checked;
        storage.updateDayData(this.currentDate, { todos });
        this.renderTodos();
        this.app.refreshAnalytics();
      });

      // Delete event
      li.querySelector('.todo-delete-btn').addEventListener('click', () => {
        const updated = todos.filter(t => t.id !== todo.id);
        storage.updateDayData(this.currentDate, { todos: updated });
        this.renderTodos();
        this.app.refreshAnalytics();
      });

      this.todoList.appendChild(li);
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
      const streak = this.calculateHabitStreak(habit.id);

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
        this.app.refreshAnalytics();
      });

      this.habitList.appendChild(div);
    });
  }

  calculateHabitStreak(habitId) {
    let streak = 0;
    let curr = new Date(this.currentDate);

    // If today is not checked, start checking from yesterday to preserve previous streak, or if today checked count today
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
        this.app.refreshAnalytics();
      });
      this.modalHabitList.appendChild(item);
    });
  }

  renderTimeBlocks() {
    const dayData = storage.getDayData(this.currentDate);
    const blocks = dayData.timeBlocks || [];

    this.timeBlockList.innerHTML = '';

    if (blocks.length === 0) {
      this.timeBlockList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">등록된 일정이 없습니다. [+ 일정 추가]로 하루 타임라인을 채워보세요!</div>`;
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
    const condition = dayData.condition || { water: 0, energy: 50, sleep: 7.0, memo: '' };

    // Water cups (8 cups = 2000ml)
    const currentCups = condition.water || 0;
    this.waterCount.textContent = `${currentCups * 250} / 2,000 ml`;
    this.waterCups.innerHTML = '';

    for (let i = 1; i <= 8; i++) {
      const icon = document.createElement('i');
      icon.className = `fa-solid fa-glass-water water-cup ${i <= currentCups ? 'filled' : ''}`;
      icon.title = `${i * 250}ml`;
      icon.addEventListener('click', () => {
        const newWater = i === currentCups ? i - 1 : i;
        storage.updateDayData(this.currentDate, { condition: { ...condition, water: newWater } });
        this.renderCondition();
      });
      this.waterCups.appendChild(icon);
    }

    // Energy
    const energy = condition.energy !== undefined ? condition.energy : 50;
    this.energySlider.value = energy;
    this.updateEnergyDisplay(energy);

    // Sleep
    const sleep = condition.sleep !== undefined ? condition.sleep : 7.0;
    this.sleepInput.value = sleep.toFixed(1);
    this.sleepHoursText.textContent = `${sleep.toFixed(1)} 시간`;

    // Memo
    this.quickMemoInput.value = condition.memo || '';
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

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
