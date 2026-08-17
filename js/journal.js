/**
 * Journal Module for Daily Flow
 * Provides rich markdown editing, templates, tags, photos, and export capabilities.
 */

import { storage } from './storage.js';

export class Journal {
  constructor(app) {
    this.app = app;
    this.currentDate = app.currentDate;
    this.isPreviewMode = false;
    this.autoSaveTimer = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.journalTitle = document.getElementById('journalTitle');
    this.journalContent = document.getElementById('journalContent');
    this.journalPreview = document.getElementById('journalPreview');
    this.journalPreviewToggle = document.getElementById('journalPreviewToggle');
    this.saveJournalBtn = document.getElementById('saveJournalBtn');
    this.exportMdBtn = document.getElementById('exportMdBtn');
    this.printJournalBtn = document.getElementById('printJournalBtn');
    this.autoSaveIndicator = document.getElementById('autoSaveIndicator');
    this.editorToolbar = document.getElementById('editorToolbar');

    // Stats
    this.charCount = document.getElementById('charCount');
    this.wordCount = document.getElementById('wordCount');
    this.readTime = document.getElementById('readTime');

    // Tags & Photos
    this.journalTagsList = document.getElementById('journalTagsList');
    this.journalTagInput = document.getElementById('journalTagInput');
    this.addTagBtn = document.getElementById('addTagBtn');
    this.journalPhotoInput = document.getElementById('journalPhotoInput');
    this.journalPhotoPreview = document.getElementById('journalPhotoPreview');

    // Templates
    this.templateBtns = document.querySelectorAll('.btn-template');
  }

  bindEvents() {
    // Title & Content Auto-save
    const triggerAutoSave = () => {
      this.updateStats();
      clearTimeout(this.autoSaveTimer);
      this.autoSaveIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
      this.autoSaveTimer = setTimeout(() => {
        this.saveCurrentJournal(false);
      }, 800);
    };

    this.journalTitle.addEventListener('input', triggerAutoSave);
    this.journalContent.addEventListener('input', triggerAutoSave);

    // Save Button
    this.saveJournalBtn.addEventListener('click', () => {
      this.saveCurrentJournal(true);
    });

    // Preview Toggle
    this.journalPreviewToggle.addEventListener('click', () => {
      this.togglePreview();
    });

    // Export MD
    this.exportMdBtn.addEventListener('click', () => {
      this.exportMarkdownFile();
    });

    // Print
    this.printJournalBtn.addEventListener('click', () => {
      window.print();
    });

    // Toolbar Buttons
    this.editorToolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        this.applyToolbarCommand(cmd);
      });
    });

    // Template Buttons
    this.templateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const templateType = btn.dataset.template;
        this.applyTemplate(templateType);
      });
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
        this.app.refreshAnalytics();
      }
      this.journalTagInput.value = '';
    };

    this.addTagBtn.addEventListener('click', addTag);
    this.journalTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });

    // Photo Upload
    this.journalPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        this.app.showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target.result;
        const dayData = storage.getDayData(this.currentDate);
        const photos = dayData.journal.photos || [];
        photos.push(base64);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
        this.renderPhotos();
        this.app.showToast('사진이 첨부되었습니다. 📷');
      };
      reader.readAsDataURL(file);
      this.journalPhotoInput.value = '';
    });
  }

  loadForDate(dateStr) {
    this.currentDate = dateStr;
    const dayData = storage.getDayData(dateStr);
    const journal = dayData.journal || {};

    this.journalTitle.value = journal.title || '';
    this.journalContent.value = journal.content || '';

    // Switch back to edit mode if in preview
    if (this.isPreviewMode) {
      this.togglePreview();
    }

    this.renderTags();
    this.renderPhotos();
    this.updateStats();
    this.autoSaveIndicator.innerHTML = '<i class="fa-solid fa-check"></i> 저장됨';
  }

  saveCurrentJournal(showToastMessage = false) {
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
    this.app.refreshCalendar();
    this.app.refreshAnalytics();

    if (showToastMessage) {
      this.app.showToast('일기가 성공적으로 저장되었습니다! 📝');
    }
  }

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

  applyToolbarCommand(cmd) {
    if (this.isPreviewMode) return;
    const textarea = this.journalContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (cmd) {
      case 'bold':
        replacement = `**${selection || '굵은 텍스트'}**`;
        cursorOffset = selection ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selection || '기울임 텍스트'}*`;
        cursorOffset = selection ? replacement.length : 1;
        break;
      case 'heading':
        replacement = `\n### ${selection || '소제목'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'quote':
        replacement = `\n> ${selection || '인용구를 입력하세요.'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'list':
        replacement = `\n- ${selection || '목록 항목'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'task':
        replacement = `\n- [ ] ${selection || '할 일 항목'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        replacement = selection.includes('\n') 
          ? `\n\`\`\`\n${selection || '코드 블록'}\n\`\`\`\n` 
          : `\`${selection || '코드'}\``;
        cursorOffset = replacement.length;
        break;
      case 'hr':
        replacement = `\n\n---\n\n`;
        cursorOffset = replacement.length;
        break;
      default:
        return;
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    this.updateStats();
    this.saveCurrentJournal(false);
  }

  applyTemplate(type) {
    let templateText = '';
    switch (type) {
      case 'gratitude':
        templateText = `### 💖 감사 일기 (Three Good Things)\n\n오늘 감사하고 기뻤던 세 가지 순간을 기록해보세요.\n\n1. \n2. \n3. \n\n### 🌿 오늘의 한 줄 느낌\n> `;
        break;
      case 'kpt':
        templateText = `### 📌 KPT 회고\n\n#### 1. Keep (잘한 점, 유지할 점)\n- \n\n#### 2. Problem (아쉬운 점, 문제점)\n- \n\n#### 3. Try (내일 시도해 볼 실천 방안)\n- `;
        break;
      case 'morning':
        templateText = `### ☀️ 모닝 저널 (Morning Pages)\n\n#### 🎯 오늘 하루의 핵심 의도 & 마음가짐\n- \n\n#### 💫 오늘 완수하고 싶은 가장 중요한 일\n- \n\n#### 💭 아침의 떠오르는 생각들\n- `;
        break;
      case 'evening':
        templateText = `### 🌙 이브닝 저널 (Evening Reflection)\n\n#### 🏆 오늘 이룬 작고 큰 성과들\n- \n\n#### 💡 오늘 배우거나 깨달은 점\n- \n\n#### 😴 내일을 편안하게 맞이하기 위한 준비\n- `;
        break;
      case 'freewrite':
        templateText = `### 📖 자유 일기\n\n오늘 있었던 특별한 일, 마음에 남은 감정이나 생각들을 자유롭게 적어보세요.\n\n`;
        break;
    }

    if (this.journalContent.value.trim()) {
      if (confirm('현재 작성 중인 내용 아래에 템플릿을 추가하시겠습니까? (취소 시 기존 내용이 대체됩니다)')) {
        this.journalContent.value += `\n\n${templateText}`;
      } else {
        this.journalContent.value = templateText;
      }
    } else {
      this.journalContent.value = templateText;
    }

    this.updateStats();
    this.saveCurrentJournal(false);
    this.app.showToast('템플릿이 적용되었습니다.');
  }

  renderTags() {
    const dayData = storage.getDayData(this.currentDate);
    const tags = dayData.journal.tags || [];
    this.journalTagsList.innerHTML = '';

    tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.innerHTML = `#${this.escapeHtml(tag)} <i class="fa-solid fa-xmark tag-remove-btn"></i>`;
      badge.querySelector('.tag-remove-btn').addEventListener('click', () => {
        const updatedTags = tags.filter(t => t !== tag);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, tags: updatedTags } });
        this.renderTags();
        this.app.refreshAnalytics();
      });
      this.journalTagsList.appendChild(badge);
    });
  }

  renderPhotos() {
    const dayData = storage.getDayData(this.currentDate);
    const photos = dayData.journal.photos || [];
    this.journalPhotoPreview.innerHTML = '';

    photos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'photo-preview-item';
      item.innerHTML = `
        <img src="${photo}" alt="일기 첨부 사진">
        <button class="photo-delete-btn" title="사진 삭제"><i class="fa-solid fa-xmark"></i></button>
      `;

      item.querySelector('.photo-delete-btn').addEventListener('click', () => {
        photos.splice(idx, 1);
        storage.updateDayData(this.currentDate, { journal: { ...dayData.journal, photos } });
        this.renderPhotos();
        this.app.showToast('사진이 삭제되었습니다.');
      });

      this.journalPhotoPreview.appendChild(item);
    });
  }

  updateStats() {
    const text = this.journalContent.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readMin = Math.ceil(words / 150) || 0;

    this.charCount.textContent = chars.toLocaleString();
    this.wordCount.textContent = words.toLocaleString();
    this.readTime.textContent = readMin;
  }

  exportMarkdownFile() {
    const dayData = storage.getDayData(this.currentDate);
    const title = this.journalTitle.value || `${this.currentDate}의 일기`;
    const tags = (dayData.journal.tags || []).map(t => `#${t}`).join(' ');
    
    let md = `---
date: ${this.currentDate}
mood: ${dayData.mood || 'none'}
tags: [${(dayData.journal.tags || []).join(', ')}]
---

# ${title}

${tags ? `> 태그: ${tags}\n\n` : ''}${this.journalContent.value}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_${this.currentDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.app.showToast('마크다운 파일로 다운로드되었습니다! 📥');
  }

  parseMarkdown(rawText) {
    if (!rawText) return '<p style="color: var(--text-muted);">작성된 일기 내용이 없습니다.</p>';

    let html = rawText
      // Escape basic tags to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Task lists
      .replace(/^- \[ \] (.*$)/gim, '<div class="todo-preview-item"><input type="checkbox" disabled> <span>$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div class="todo-preview-item"><input type="checkbox" checked disabled> <del>$1</del></div>')
      // Unordered List
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // HR
      .replace(/^---$/gim, '<hr class="divider">')
      // Paragraphs & Linebreaks
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
