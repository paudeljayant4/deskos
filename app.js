// ============================================
// DeskOS — Core System
// ============================================

// ---- Global State (deskState) with Pub/Sub ----
const deskState = {
  mode: 'focus',
  listeners: [],
  
  setMode(newMode) {
    if (this.mode !== newMode) {
      this.mode = newMode;
      document.body.dataset.mode = newMode;
      this.notify();
    }
  },
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },
  
  notify() {
    this.listeners.forEach(cb => cb(this.mode));
  },
  
  getMode() {
    return this.mode;
  }
};

// ---- Welcome / Boot Screen ----
const bootStatusLines = [
  'Initializing system...',
  'Loading modes...',
  'Warming up focus engine...',
  'Calibrating window manager...',
  'Syncing localStorage...',
  'Ready to launch'
];

let bootProgress = 0;
const bootBar = document.getElementById('boot-bar');
const bootStatus = document.getElementById('boot-status');
const welcomeScreen = document.getElementById('welcome-screen');
const desktop = document.getElementById('desktop');

function cycleBootStatus(index = 0) {
  if (bootProgress >= 100) return;
  bootStatus.textContent = bootStatusLines[index % bootStatusLines.length];
  bootStatus.style.opacity = '1';
  setTimeout(() => {
    bootStatus.style.opacity = '0.5';
    setTimeout(() => cycleBootStatus(index + 1), 300);
  }, 800);
}

function animateBootBar() {
  const duration = 2000; // 2 seconds
  const startTime = performance.now();
  
  function updateProgress(now) {
    const elapsed = now - startTime;
    bootProgress = Math.min(100, (elapsed / duration) * 100);
    bootBar.style.width = bootProgress + '%';
    
    if (bootProgress < 100) {
      requestAnimationFrame(updateProgress);
    } else {
      // Boot complete - transition to desktop
      setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
          welcomeScreen.style.display = 'none';
          desktop.style.display = 'flex';
          initializeDesktop();
        }, 600);
      }, 300);
    }
  }
  
  requestAnimationFrame(updateProgress);
}

// Start boot sequence
cycleBootStatus();
animateBootBar();

// ---- Desktop Initialization ----
function initializeDesktop() {
  // Live clock
  const clock = document.getElementById('clock');
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = `${hours}:${minutes}`;
    clock.dateTime = now.toISOString();
  }
  updateClock();
  setInterval(updateClock, 1000);
  
  // Mode switcher
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      deskState.setMode(mode);
      modeButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    });
  });
  
  // Initialize with focus mode
  document.body.dataset.mode = 'focus';
  
  // Create demo windows to show the mode system working
  createWindow('Focus Timer', createTimerApp(), { x: 100, y: 100 });
  createWindow('Stats', createStatsApp(), { x: 450, y: 100 });
  createWindow('Notes', createNotesApp(), { x: 800, y: 100 });
}

// ============================================
// Window System
// ============================================

let highestZIndex = 10;
const openWindows = new Map(); // id -> window element

function createWindow(title, contentBuilder, position = {}) {
  const id = 'window-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const { x = 50 + openWindows.size * 30, y = 50 + openWindows.size * 30 } = position;
  
  const windowEl = document.createElement('div');
  windowEl.className = 'window';
  windowEl.id = id;
  windowEl.style.left = x + 'px';
  windowEl.style.top = y + 'px';
  windowEl.dataset.windowId = id;
  
  windowEl.innerHTML = `
    <div class="window-titlebar" data-window-id="${id}">
      <div class="window-title">
        <span class="window-title-text">${title}</span>
      </div>
      <div class="window-controls">
        <button class="window-btn minimize" aria-label="Minimize" title="Minimize">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="window-btn close" aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="window-content"></div>
  `;
  
  const contentEl = windowEl.querySelector('.window-content');
  contentBuilder(contentEl, windowEl);
  
  const desktopArea = document.getElementById('desktop-area');
  desktopArea.appendChild(windowEl);
  
  // Draggable logic
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  const titlebar = windowEl.querySelector('.window-titlebar');
  
  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-btn')) return;
    
    isDragging = true;
    const rect = windowEl.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    bringToFront(windowEl);
    titlebar.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const desktopRect = desktopArea.getBoundingClientRect();
    let newX = e.clientX - desktopRect.left - dragOffset.x;
    let newY = e.clientY - desktopRect.top - dragOffset.y;
    
    // Constrain to desktop area
    const maxX = desktopArea.clientWidth - windowEl.offsetWidth;
    const maxY = desktopArea.clientHeight - windowEl.offsetHeight;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    windowEl.style.left = newX + 'px';
    windowEl.style.top = newY + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      titlebar.style.cursor = 'grab';
    }
  });
  
  // Focus on click
  windowEl.addEventListener('mousedown', () => bringToFront(windowEl));
  
  // Close button
  windowEl.querySelector('.window-btn.close').addEventListener('click', () => {
    closeWindow(windowEl);
  });
  
  // Minimize button (placeholder)
  windowEl.querySelector('.window-btn.minimize').addEventListener('click', () => {
    windowEl.style.display = 'none';
    // Could add taskbar integration later
  });
  
  // Subscribe to mode changes
  const unsubscribe = deskState.subscribe((mode) => {
    windowEl.style.borderColor = 'var(--window-border)';
    if (windowEl.classList.contains('focused')) {
      windowEl.style.borderColor = 'var(--accent-color)';
    }
  });
  
  // Store cleanup function
  windowEl._unsubscribe = unsubscribe;
  openWindows.set(id, windowEl);
  
  bringToFront(windowEl);
  return windowEl;
}

function bringToFront(windowEl) {
  highestZIndex++;
  windowEl.style.zIndex = highestZIndex;
  
  // Update focused state
  openWindows.forEach(win => win.classList.remove('focused'));
  windowEl.classList.add('focused');
}

function closeWindow(windowEl) {
  const id = windowEl.dataset.windowId;
  if (windowEl._unsubscribe) {
    windowEl._unsubscribe();
  }
  openWindows.delete(id);
  windowEl.remove();
}

// ============================================
// App: Focus Timer
// ============================================

function createTimerApp(contentEl, windowEl) {
  let timerInterval = null;
  let timeRemaining = 25 * 60; // 25 minutes in seconds
  let isRunning = false;
  let currentPreset = 25;
  const presets = [5, 15, 25, 50];
  
  const timerDisplay = document.createElement('div');
  timerDisplay.className = 'timer-display';
  timerDisplay.textContent = formatTime(timeRemaining);
  timerDisplay.setAttribute('role', 'timer');
  timerDisplay.setAttribute('aria-live', 'polite');
  
  const controls = document.createElement('div');
  controls.className = 'timer-controls';
  
  const startBtn = document.createElement('button');
  startBtn.className = 'timer-btn primary';
  startBtn.textContent = 'Start';
  
  const resetBtn = document.createElement('button');
  resetBtn.className = 'timer-btn secondary';
  resetBtn.textContent = 'Reset';
  
  controls.appendChild(startBtn);
  controls.appendChild(resetBtn);
  
  const presetContainer = document.createElement('div');
  presetContainer.className = 'timer-presets';
  
  presets.forEach(minutes => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (minutes === currentPreset ? ' active' : '');
    btn.textContent = `${minutes}m`;
    btn.addEventListener('click', () => {
      if (isRunning) return;
      currentPreset = minutes;
      timeRemaining = minutes * 60;
      timerDisplay.textContent = formatTime(timeRemaining);
      presetContainer.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    presetContainer.appendChild(btn);
  });
  
  contentEl.appendChild(timerDisplay);
  contentEl.appendChild(controls);
  contentEl.appendChild(presetContainer);
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  function saveSession(durationMinutes) {
    const sessions = JSON.parse(localStorage.getItem('deskos-sessions') || '[]');
    sessions.push({
      startTime: Date.now() - (durationMinutes * 60 * 1000),
      duration: durationMinutes,
      mode: deskState.getMode()
    });
    localStorage.setItem('deskos-sessions', JSON.stringify(sessions));
    deskState.notify(); // Trigger stats update
  }
  
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'timer-notification';
    notification.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-color);">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9 12l2 2 4-4"></path>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
  
  function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.textContent = 'Pause';
    deskState.setMode('focus');
    document.querySelectorAll('.mode-btn').forEach(b => 
      b.setAttribute('aria-pressed', b.dataset.mode === 'focus')
    );
    
    timerInterval = setInterval(() => {
      timeRemaining--;
      timerDisplay.textContent = formatTime(timeRemaining);
      
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        startBtn.textContent = 'Start';
        saveSession(currentPreset);
        showNotification(`Focus session complete! ${currentPreset} minutes logged.`);
        // Play a subtle sound
        playChime();
      }
    }, 1000);
  }
  
  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    startBtn.textContent = 'Resume';
  }
  
  function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    timeRemaining = currentPreset * 60;
    timerDisplay.textContent = formatTime(timeRemaining);
    startBtn.textContent = 'Start';
  }
  
  startBtn.addEventListener('click', () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });
  
  resetBtn.addEventListener('click', resetTimer);
  
  // Subscribe to mode changes to update timer display color
  deskState.subscribe((mode) => {
    // Timer display could change color based on mode
    timerDisplay.style.color = 'var(--text-primary)';
  });
  
  // Cleanup on window close
  const originalUnsubscribe = windowEl._unsubscribe;
  windowEl._unsubscribe = () => {
    if (timerInterval) clearInterval(timerInterval);
    if (originalUnsubscribe) originalUnsubscribe();
  };
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
    // Audio not available, silently fail
  }
}

// ============================================
// App: Stats
// ============================================

function createStatsApp(contentEl, windowEl) {
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';
  
  const todayStat = createStatCard('0', 'Minutes Today');
  const totalStat = createStatCard('0', 'Total Sessions');
  const streakStat = createStatCard('0', 'Day Streak');
  const avgStat = createStatCard('0m', 'Avg Session');
  
  statsGrid.appendChild(todayStat);
  statsGrid.appendChild(totalStat);
  statsGrid.appendChild(streakStat);
  statsGrid.appendChild(avgStat);
  
  const progressSection = document.createElement('div');
  progressSection.className = 'progress-section';
  progressSection.innerHTML = `
    <div class="progress-label">
      <span>Daily Goal (4 hours)</span>
      <span class="progress-percent">0%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
  `;
  
  const sessionsList = document.createElement('div');
  sessionsList.className = 'sessions-list';
  
  contentEl.appendChild(statsGrid);
  contentEl.appendChild(progressSection);
  contentEl.appendChild(sessionsList);
  
  function createStatCard(value, label) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    `;
    return card;
  }
  
  function updateStats() {
    const sessions = JSON.parse(localStorage.getItem('deskos-sessions') || '[]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const todaySessions = sessions.filter(s => s.startTime >= todayStart);
    const totalMinutesToday = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    const totalSessions = sessions.length;
    const todayCount = todaySessions.length;
    const avgDuration = totalSessions > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions)
      : 0;
    
    // Calculate streak (consecutive days with at least one session)
    let streak = 0;
    const datesWithSessions = new Set();
    sessions.forEach(s => {
      const d = new Date(s.startTime);
      d.setHours(0, 0, 0, 0);
      datesWithSessions.add(d.getTime());
    });
    const sortedDates = Array.from(datesWithSessions).sort((a, b) => b - a);
    let checkDate = today.getTime();
    for (const date of sortedDates) {
      if (date === checkDate) {
        streak++;
        checkDate -= 86400000;
      } else if (date < checkDate) {
        break;
      }
    }
    
    // Update UI
    todayStat.querySelector('.stat-value').textContent = totalMinutesToday;
    totalStat.querySelector('.stat-value').textContent = totalSessions;
    streakStat.querySelector('.stat-value').textContent = streak;
    avgStat.querySelector('.stat-value').textContent = `${avgDuration}m`;
    
    const goalMinutes = 4 * 60; // 4 hours
    const percent = Math.min(100, Math.round((totalMinutesToday / goalMinutes) * 100));
    progressSection.querySelector('.progress-percent').textContent = `${percent}%`;
    progressSection.querySelector('.progress-fill').style.width = `${percent}%`;
    
    // Update sessions list (show last 10)
    sessionsList.innerHTML = '';
    const recentSessions = [...sessions].reverse().slice(0, 10);
    if (recentSessions.length === 0) {
      sessionsList.innerHTML = '<div class="empty-state">No sessions yet. Start a focus timer!</div>';
    } else {
      recentSessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item';
        const date = new Date(session.startTime);
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const dateStr = date.toLocaleDateString();
        item.innerHTML = `
          <span class="session-time">${session.duration} min</span>
          <span class="session-date">${dateStr} at ${timeStr}</span>
        `;
        sessionsList.appendChild(item);
      });
    }
  }
  
  // Initial update
  updateStats();
  
  // Subscribe to state changes (for live updates when new sessions are added)
  deskState.subscribe(updateStats);
  
  // Also listen for storage events (in case stats updated from another tab/window)
  window.addEventListener('storage', (e) => {
    if (e.key === 'deskos-sessions') {
      updateStats();
    }
  });
  
  const originalUnsubscribe = windowEl._unsubscribe;
  windowEl._unsubscribe = () => {
    window.removeEventListener('storage', updateStats);
    if (originalUnsubscribe) originalUnsubscribe();
  };
}

// ============================================
// App: Notes (simple demo app for Study mode)
// ============================================

function createNotesApp(contentEl, windowEl) {
  const textarea = document.createElement('textarea');
  textarea.style.cssText = `
    width: 100%;
    height: 100%;
    min-height: 200px;
    background: transparent;
    border: 1px solid var(--window-border);
    border-radius: 8px;
    padding: 12px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.6;
    resize: vertical;
    outline: none;
  `;
  textarea.placeholder = 'Study notes... (auto-saves to localStorage)';
  
  // Load saved notes
  const savedNotes = localStorage.getItem('deskos-notes') || '';
  textarea.value = savedNotes;
  
  // Auto-save
  let saveTimeout;
  textarea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem('deskos-notes', textarea.value);
    }, 500);
  });
  
  contentEl.appendChild(textarea);
  
  // Subscribe to mode changes
  deskState.subscribe((mode) => {
    if (mode === 'study') {
      textarea.style.borderColor = 'var(--accent-color)';
    } else {
      textarea.style.borderColor = 'var(--window-border)';
    }
  });
}

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + N: New window (could open app launcher)
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createWindow('New Window', (content) => {
      content.textContent = 'New window content';
    });
  }
  
  // Escape: Close focused window
  if (e.key === 'Escape') {
    const focused = document.querySelector('.window.focused');
    if (focused) {
      closeWindow(focused);
    }
  }
});

console.log('DeskOS initialized! 🖥️');