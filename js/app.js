/**
 * Main Application Entry Point - Daily Flow
 * Coordinates state, tabs, date changes, themes, and modals.
 */

import { storage } from './storage.js';
import { Dashboard } from './dashboard.js';
import { Journal } from './journal.js';
import { Calendar } from './calendar.js';
import { Analytics } from './analytics.js';
import { todayKST, shiftDate } from './utils.js';
import { TenTrillion } from './ten-trillion.js';
import { paintEES } from './ees.js';

const QUOTES = [
  "작은 진전이 모여 큰 성취를 이룬다.",
  "오늘 하루의 충실함이 내일의 기적을 만든다.",
  "생각하는 대로 살지 않으면 사는 대로 생각하게 된다.",
  "지금 이 순간에 온전히 몰입하라.",
  "기록하지 않는 기억은 사라진다.",
  "성공은 매일 반복되는 작은 노력들의 합이다.",
  "가장 어두운 밤도 언젠가는 끝나고 해가 뜬다.",
  "자신을 믿어라. 당신은 생각보다 훨씬 강하다."
];

class App {
  constructor() {
    this.currentDate = todayKST(); // YYYY-MM-DD
    this.activeTab = 'dashboard';

    this.initTheme();
    this.initElements();
    this.initModules();
    this.bindEvents();
    this.startClock();
    this.showRandomQuote();

    // Initial load
    this.loadDateData(this.currentDate);
  }

  initElements() {
    // Top Date Navigation
    this.headerDateText = document.getElementById('headerDateText');
    this.sidebarDate = document.getElementById('sidebarDate');
    this.sidebarTime = document.getElementById('sidebarTime');
    this.datePicker = document.getElementById('datePicker');
    this.todayTag = document.getElementById('todayTag');
    this.prevDayBtn = document.getElementById('prevDayBtn');
    this.nextDayBtn = document.getElementById('nextDayBtn');
    this.todayQuickBtn = document.getElementById('todayQuickBtn');
    this.quoteBanner = document.getElementById('quoteBanner');

    // Navigation & Tabs
    this.navItems = document.querySelectorAll('.nav-item');
    this.tabPanes = document.querySelectorAll('.tab-pane');

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

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  initModules() {
    this.dashboard = new Dashboard(this);
    this.journal = new Journal(this);
    this.calendar = new Calendar(this);
    this.analytics = new Analytics(this);
    this.tenTrillion = new TenTrillion(this);
    paintEES(this.currentDate);
  }

  bindEvents() {
    // Tab Switching
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Date Navigation
    this.prevDayBtn.addEventListener('click', () => this.shiftDate(-1));
    this.nextDayBtn.addEventListener('click', () => this.shiftDate(1));
    this.todayQuickBtn.addEventListener('click', () => this.setDate(todayKST()));

    this.datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        this.setDate(e.target.value);
      }
    });

    // Theme Toggle
    this.themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    });

    // Backup Modal
    this.backupBtn.addEventListener('click', () => {
      this.backupModal.classList.add('active');
    });

    this.closeBackupModalBtn.addEventListener('click', () => {
      this.backupModal.classList.remove('active');
    });

    this.exportJsonBtn.addEventListener('click', () => {
      storage.exportJson();
      this.showToast('백업 파일이 생성되어 다운로드되었습니다! 💾');
    });

    this.triggerImportBtn.addEventListener('click', () => {
      this.importJsonInput.click();
    });

    this.importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (readEvt) => {
        const success = storage.importJson(readEvt.target.result);
        if (success) {
          this.backupModal.classList.remove('active');
          this.loadDateData(this.currentDate);
          this.calendar.render();
          this.analytics.render();
          this.showToast('데이터가 성공적으로 복원되었습니다! 🎉');
        } else {
          this.showToast('파일 복원에 실패했습니다. 올바른 JSON 파일인지 확인하세요.', 'error');
        }
      };
      reader.readAsText(file);
      this.importJsonInput.value = '';
    });

    this.resetDataBtn.addEventListener('click', () => {
      if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        storage.resetAllData();
        this.backupModal.classList.remove('active');
        this.loadDateData(this.currentDate);
        this.calendar.render();
        this.analytics.render();
        this.showToast('데이터가 초기화되었습니다.');
      }
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    this.navItems.forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.tabPanes.forEach(pane => {
      if (pane.id === `pane-${tabName}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Refresh views on tab change
    if (tabName === 'calendar') {
      this.calendar.render();
    } else if (tabName === 'analytics') {
      this.analytics.render();
    }
  }

  setDate(dateStr) {
    this.currentDate = dateStr;
    this.loadDateData(dateStr);
  }

  shiftDate(deltaDays) {
    const newDateStr = shiftDate(this.currentDate, deltaDays);
    this.setDate(newDateStr);
  }

  loadDateData(dateStr) {
    this.updateDateDisplay(dateStr);
    this.dashboard.loadForDate(dateStr);
    this.journal.loadForDate(dateStr);
    this.tenTrillion?.setDate(dateStr);
    paintEES(dateStr);
  }

  updateDateDisplay(dateStr) {
    const today = todayKST();
    const [year, month, day] = dateStr.split('-').map(Number);
    const dObj = new Date(year, month - 1, day);
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dObj.getDay()];

    this.headerDateText.textContent = `${year}년 ${month}월 ${day}일 (${dayName})`;
    this.datePicker.value = dateStr;

    if (dateStr === today) {
      this.todayTag.style.display = 'inline-block';
    } else {
      this.todayTag.style.display = 'none';
    }
  }

  startClock() {
    const update = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = dayNames[now.getDay()];

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      if (this.sidebarDate) {
        this.sidebarDate.textContent = `${year}.${month}.${day} (${dayName})`;
      }
      if (this.sidebarTime) {
        this.sidebarTime.textContent = `${hours}:${minutes}:${seconds}`;
      }
    };

    update();
    setInterval(update, 1000);
  }

  showRandomQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (this.quoteBanner) {
      this.quoteBanner.innerHTML = `<span class="quote-text">"${q}"</span>`;
    }
  }

  initTheme() {
    const saved = storage.data.settings.theme || 'dark';
    this.setTheme(saved);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storage.data.settings.theme = theme;
    storage.saveData();

    if (theme === 'light') {
      this.themeIcon.className = 'fa-solid fa-sun';
      this.themeIcon.style.color = '#f59e0b';
    } else {
      this.themeIcon.className = 'fa-solid fa-moon';
      this.themeIcon.style.color = '';
    }
  }

  refreshCalendar() {
    if (this.calendar) {
      this.calendar.render();
    }
  }

  refreshAnalytics() {
    if (this.analytics) {
      this.analytics.render();
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '<i class="fa-solid fa-circle-check text-emerald" style="color: #10b981;"></i>';
    if (type === 'error') {
      icon = '<i class="fa-solid fa-circle-exclamation text-rose" style="color: #f43f5e;"></i>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.dailyFlowApp = new App();
});
