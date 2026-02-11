// Floating Prompter Controller

const FloatingPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  settings: null,
  scriptId: null,

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
      },
      onSpeedChange: (speed) => {
        document.getElementById('speed-indicator').textContent = `${Math.round(speed * 3)} WPM`;
      },
      onEnd: (action) => {
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
    });

    // Cursor auto-hide
    this.setupCursorAutoHide();

    // Speed indicator
    document.getElementById('speed-indicator').textContent =
      `${Math.round((this.settings.floating_scroll_speed || 50) * 3)} WPM`;

    // Sleep prevention
    Utils.invoke('prevent_sleep', { prevent: true });

    // Start countdown
    const countdownSeconds = this.settings.countdown_seconds ?? 3;
    this.countdown = new Countdown(document.body, {
      onComplete: () => {
        this.keyboard.isCountdownActive = false;
        this.engine.start();
      },
    });
    this.keyboard.isCountdownActive = countdownSeconds > 0;
    this.countdown.start(countdownSeconds);
  },

  renderAllWords() {
    const container = document.getElementById('scroll-content');
    const words = this.engine.words;
    container.innerHTML = words
      .map((w, i) => `<span class="word upcoming" data-index="${i}">${Utils.escapeHtml(w.text)} </span>`)
      .join('');
  },

  updateWords(currentIndex) {
    const wordEls = document.getElementById('scroll-content').querySelectorAll('.word');
    wordEls.forEach((el) => {
      const idx = parseInt(el.dataset.index, 10);
      el.classList.remove('spoken', 'current', 'upcoming');
      if (idx < currentIndex) el.classList.add('spoken');
      else if (idx === currentIndex) el.classList.add('current');
      else el.classList.add('upcoming');
    });
  },

  updateScroll(offset) {
    document.getElementById('scroll-content').style.transform = `translateY(${-offset}px)`;
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

  async close() {
    this.engine?.stop();
    this.keyboard?.destroy();
    this.countdown?.destroy();
    Utils.invoke('prevent_sleep', { prevent: false });
    await Utils.invoke('close_prompter');
  },
};

document.addEventListener('DOMContentLoaded', () => FloatingPrompter.init());
