/**
 * Calendar & Archive Module for Daily Flow
 * Manages monthly calendar view, date navigation, search and archive filtering.
 */

import { storage } from './storage.js';

export class Calendar {
  constructor(app) {
    this.app = app;
    const now = new Date(app.currentDate);
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth(); // 0-indexed

    this.selectedMoodFilter = 'all';
    this.searchQuery = '';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Calendar Header
    this.calendarMonthTitle = document.getElementById('calendarMonthTitle');
    this.calPrevMonth = document.getElementById('calPrevMonth');
    this.calNextMonth = document.getElementById('calNextMonth');
    this.calTodayBtn = document.getElementById('calTodayBtn');
    this.calendarDaysGrid = document.getElementById('calendarDaysGrid');

    // Archive & Search
    this.archiveSearchInput = document.getElementById('archiveSearchInput');
    this.archiveMoodFilters = document.getElementById('archiveMoodFilters');
    this.archiveList = document.getElementById('archiveList');
  }

  bindEvents() {
    this.calPrevMonth.addEventListener('click', () => {
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.renderCalendar();
    });

    this.calNextMonth.addEventListener('click', () => {
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.renderCalendar();
    });

    this.calTodayBtn.addEventListener('click', () => {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
      this.renderCalendar();
    });

    // Search
    let searchTimeout;
    this.archiveSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderArchive();
      }, 250);
    });

    // Mood Filters
    this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.archiveMoodFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedMoodFilter = pill.dataset.filter;
        this.renderArchive();
      });
    });
  }

  render() {
    this.renderCalendar();
    this.renderArchive();
  }

  renderCalendar() {
    this.calendarMonthTitle.textContent = `${this.viewYear}년 ${this.viewMonth + 1}월`;
    this.calendarDaysGrid.innerHTML = '';

    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sun
    const totalDays = lastDay.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(this.viewYear, this.viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cell = this.createDayCell(dayNum, true);
      this.calendarDaysGrid.appendChild(cell);
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(this.viewMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${this.viewYear}-${monthStr}-${dayStr}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';

      if (dateStr === todayStr) {
        cell.classList.add('today');
      }
      if (dateStr === this.app.currentDate) {
        cell.classList.add('selected');
      }

      const dayData = storage.getDayData(dateStr);
      const moodEmojis = {
        great: '😆',
        good: '😊',
        neutral: '😐',
        tired: '🥱',
        stressed: '😣'
      };

      const hasJournal = dayData.journal && (dayData.journal.title || dayData.journal.content);
      const moodEmoji = dayData.mood && moodEmojis[dayData.mood] ? moodEmojis[dayData.mood] : '';

      cell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        <div class="cal-day-badges">
          <span>${moodEmoji}</span>
          ${hasJournal ? '<span class="cal-has-journal-dot" title="일기 작성됨"></span>' : ''}
        </div>
      `;

      cell.addEventListener('click', () => {
        this.app.setDate(dateStr);
        this.renderCalendar();
      });

      this.calendarDaysGrid.appendChild(cell);
    }
  }

  createDayCell(dayNum, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''}`;
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    return cell;
  }

  renderArchive() {
    const journals = storage.getAllJournals();
    this.archiveList.innerHTML = '';

    const filtered = journals.filter(j => {
      // Mood filter
      if (this.selectedMoodFilter !== 'all' && j.mood !== this.selectedMoodFilter) {
        return false;
      }
      // Query filter
      if (this.searchQuery) {
        const titleMatch = j.title.toLowerCase().includes(this.searchQuery);
        const contentMatch = j.content.toLowerCase().includes(this.searchQuery);
        const tagMatch = (j.tags || []).some(t => t.toLowerCase().includes(this.searchQuery));
        if (!titleMatch && !contentMatch && !tagMatch) {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      this.archiveList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px;">
          <i class="fa-regular fa-folder-open" style="font-size: 2rem; margin-bottom: 10px;"></i>
          <p>조건에 맞는 일기 기록이 없습니다.</p>
        </div>
      `;
      return;
    }

    const moodEmojis = {
      great: '😆',
      good: '😊',
      neutral: '😐',
      tired: '🥱',
      stressed: '😣'
    };

    filtered.forEach(j => {
      const card = document.createElement('div');
      card.className = 'archive-item-card';

      const snippet = j.content
        ? j.content.replace(/[\#\*\>\-]/g, '').trim().substring(0, 90) + '...'
        : '내용 없음';

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
        this.app.setDate(j.date);
        this.app.switchTab('journal');
      });

      this.archiveList.appendChild(card);
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
