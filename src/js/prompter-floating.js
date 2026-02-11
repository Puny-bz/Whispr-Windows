// Floating Prompter Controller — Full feature parity with Swift

const FloatingPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  voiceScroll: null,
  practiceMode: null,
  settings: null,
  scriptId: null,
  scriptContent: null,
  cursorTimer: null,
  useMarkdown: true,

  async init() {
    this.settings = await Utils.invoke('get_settings');
    if (!this.settings) this.settings = {};

    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.floating_theme || 'dark');

    // Apply font
    const textEl = document.getElementById('floating-text');
    textEl.style.fontSize = `${this.settings.floating_font_size || 32}px`;
    textEl.style.fontFamily = Utils.fontFamilyCSS(this.settings.floating_font_family);

    // Mirror mode
    if (this.settings.mirror_mode) {
      document.getElementById('floating-container').classList.add('mirrored');
    }

    // Listen for script from Rust backend
    Utils.listen('load-script', (event) => {
      const data = event.payload;
      this.scriptId = data.id;
      this.scriptContent = data.content;
      this.startWithCountdown(data.content);
    });

    // Global pause shortcut
    Utils.listen('global-pause-prompter', () => {
      if (this.engine && this.engine.isRunning) {
        this.engine.togglePause();
      }
    });

    // Settings changed (live update)
    Utils.listen('settings-changed', (event) => {
      const s = event.payload;
      if (s) {
        this.settings = s;
        document.documentElement.setAttribute('data-theme', s.floating_theme || 'dark');
        const textEl = document.getElementById('floating-text');
        textEl.style.fontSize = `${s.floating_font_size || 32}px`;
        textEl.style.fontFamily = Utils.fontFamilyCSS(s.floating_font_family);
      }
    });

    // Button handlers
    document.getElementById('btn-close').addEventListener('click', () => this.close());
    document.getElementById('btn-minimize').addEventListener('click', async () => {
      if (window.__TAURI__) {
        const win = window.__TAURI__.window.getCurrentWindow();
        win.minimize();
      }
    });

    // Click pause overlay to resume
    document.getElementById('pause-overlay').addEventListener('click', () => {
      if (this.engine) this.engine.resume();
    });
  },

  startWithCountdown(content) {
    // Create engine
    this.engine = new PrompterEngine({
      scrollSpeed: this.settings.floating_scroll_speed || 50,
      fontSize: this.settings.floating_font_size || 32,
      endAction: this.settings.end_action || 'stop',
      onWordChange: (index) => this.updateWords(index),
      onScroll: (offset) => this.updateScroll(offset),
      onTimerUpdate: (s) => {
        document.getElementById('floating-timer').textContent = Utils.formatTime(s);
      },
      onPauseChange: (paused) => {
        document.getElementById('pause-overlay').classList.toggle('visible', paused);
        if (this.voiceScroll) {
          if (paused) this.voiceScroll.pause();
          else this.voiceScroll.resume();
        }
        if (this.practiceMode) {
          if (paused) this.practiceMode.recordPause();
          else this.practiceMode.endPause();
        }
      },
      onSpeedChange: (speed) => {
        document.getElementById('speed-indicator').textContent = `${Math.round(speed * 3)} WPM`;
      },
      onEnd: (action) => {
        if (this.voiceScroll) this.voiceScroll.stop();
        if (this.practiceMode) {
          this.showPracticeSummary();
        }
        if (action === 'close') this.close();
      },
    });

    this.engine.loadScript(content);
    this.renderAllWords();

    // Keyboard handler
    const container = document.getElementById('floating-container');
    this.keyboard = new KeyboardHandler(this.engine, {
      onClose: () => this.close(),
      onMirrorToggle: () => container.classList.toggle('mirrored'),
      onFullscreenToggle: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      },
      onSkipCountdown: () => this.countdown?.skip(),
      onVoiceToggle: () => this.toggleVoiceScroll(),
    });

    // Practice mode
    this.practiceMode = new PracticeMode(this.engine, {
      targetMinWPM: this.settings.target_min_wpm || 130,
      targetMaxWPM: this.settings.target_max_wpm || 170,
    });

    // Voice scroll
    this.voiceScroll = new VoiceScroll(this.engine);
    this.voiceScroll.onStatusChange = (status) => this.updateVoiceStatus(status);
    this.voiceScroll.onWPMUpdate = (wpm) => {
      // Voice-driven WPM can update pace indicator
    };

    // Cursor auto-hide
    this.setupCursorAutoHide();

    // Speed indicator
    document.getElementById('speed-indicator').textContent =
      `${Math.round((this.settings.floating_scroll_speed || 50) * 3)} WPM`;

    // Pace indicator zone widths
    const paceBar = document.getElementById('pace-bar');
    if (paceBar) {
      paceBar.style.display = 'none'; // Hidden until practice starts
    }

    // Sleep prevention + content protection
    Utils.invoke('prevent_sleep', { prevent: true });
    if (this.settings.content_protected) {
      Utils.invoke('set_content_protected', { protected: true });
    }

    // Start countdown
    const countdownSeconds = this.settings.countdown_seconds ?? 3;
    this.countdown = new Countdown(document.body, {
      onComplete: () => {
        this.keyboard.isCountdownActive = false;
        this.engine.start();
        this.practiceMode.start();
        // Auto-start voice scroll if enabled in settings
        if (this.settings.voice_scroll_enabled) {
          this.toggleVoiceScroll();
        }
      },
    });
    this.keyboard.isCountdownActive = countdownSeconds > 0;
    this.countdown.start(countdownSeconds);
  },

  /**
   * Render all words using MarkdownParser for proper formatting
   */
  renderAllWords() {
    const container = document.getElementById('scroll-content');
    if (this.useMarkdown && this.scriptContent) {
      container.innerHTML = MarkdownParser.parseToWordSpans(this.scriptContent, -1);
    } else {
      const words = this.engine.words;
      container.innerHTML = words
        .map((w, i) => `<span class="word upcoming" data-index="${i}">${Utils.escapeHtml(w.text)} </span>`)
        .join('');
    }
  },

  /**
   * Update word highlighting (karaoke) — matches Swift's three-state system
   */
  updateWords(currentIndex) {
    if (this.useMarkdown && this.scriptContent) {
      // Re-render with markdown + current word index
      const container = document.getElementById('scroll-content');
      container.innerHTML = MarkdownParser.parseToWordSpans(this.scriptContent, currentIndex);
    } else {
      const wordEls = document.getElementById('scroll-content').querySelectorAll('.word');
      wordEls.forEach((el) => {
        const idx = parseInt(el.dataset.index, 10);
        el.classList.remove('spoken', 'current', 'upcoming');
        if (idx < currentIndex) el.classList.add('spoken');
        else if (idx === currentIndex) el.classList.add('current');
        else el.classList.add('upcoming');
      });
    }

    // Update pace indicator
    if (this.practiceMode?.isActive) {
      const wpm = this.engine.getCurrentWPM();
      const pos = this.practiceMode.getPacePosition(wpm);
      document.getElementById('pace-bar').style.display = 'flex';
      document.getElementById('pace-marker').style.left = `${pos * 100}%`;
    }
  },

  updateScroll(offset) {
    document.getElementById('scroll-content').style.transform = `translateY(${-offset}px)`;
  },

  /**
   * Toggle voice scroll on/off (V key)
   */
  async toggleVoiceScroll() {
    if (!this.voiceScroll) return;

    if (this.voiceScroll.isListening) {
      this.voiceScroll.stop();
      document.getElementById('voice-status').style.display = 'none';
    } else {
      const started = await this.voiceScroll.start();
      if (started) {
        document.getElementById('voice-status').style.display = 'flex';
      }
    }
  },

  /**
   * Update voice scroll status indicator
   */
  updateVoiceStatus(status) {
    const statusEl = document.getElementById('voice-status');
    const dot = document.getElementById('voice-dot');
    const label = document.getElementById('voice-label');

    dot.className = 'voice-status-dot';
    switch (status) {
      case 'listening':
        dot.classList.add('listening');
        label.textContent = 'Listening';
        statusEl.style.display = 'flex';
        break;
      case 'restarting':
        label.textContent = 'Restarting...';
        break;
      case 'silence':
        dot.classList.add('silence');
        label.textContent = 'Silence';
        break;
      case 'denied':
        dot.classList.add('denied');
        label.textContent = 'Mic denied';
        break;
      case 'unsupported':
        dot.classList.add('denied');
        label.textContent = 'Not supported';
        break;
      case 'stopped':
        statusEl.style.display = 'none';
        break;
      case 'error':
        dot.classList.add('denied');
        label.textContent = 'Error';
        break;
    }
  },

  setupCursorAutoHide() {
    const container = document.getElementById('floating-container');
    let timeout;
    container.addEventListener('mousemove', () => {
      container.style.cursor = 'default';
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (this.engine?.isRunning && !this.engine?.isPaused) {
          container.style.cursor = 'none';
        }
      }, 2000);
    });
  },

  showPracticeSummary() {
    if (!this.practiceMode) return;
    this.practiceMode.stop();
    this.practiceMode.finish(this.scriptId);
    const summary = this.practiceMode.getSummary();

    const overlay = document.createElement('div');
    overlay.className = 'practice-summary-overlay';
    overlay.innerHTML = `
      <div class="practice-summary">
        <h2>Practice Complete</h2>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-value">${summary.averageWPM}</span>
            <span class="summary-label">Avg WPM</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">${Utils.formatTime(summary.totalDuration)}</span>
            <span class="summary-label">Duration</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">${summary.pauseCount}</span>
            <span class="summary-label">Pauses</span>
          </div>
        </div>
        <button class="btn-primary" id="btn-close-summary">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('btn-close-summary').addEventListener('click', () => {
      overlay.remove();
      this.close();
    });
  },

  async close() {
    this.engine?.stop();
    this.keyboard?.destroy();
    this.countdown?.destroy();
    this.voiceScroll?.stop();
    this.practiceMode?.stop();
    // Restore sleep and content protection
    Utils.invoke('prevent_sleep', { prevent: false });
    Utils.invoke('set_content_protected', { protected: false });
    await Utils.invoke('close_prompter');
  },
};

document.addEventListener('DOMContentLoaded', () => FloatingPrompter.init());
