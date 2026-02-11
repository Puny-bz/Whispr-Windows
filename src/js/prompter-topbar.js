// Top Bar Prompter Controller

const TopbarPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  settings: null,
  isHoverPaused: false,

  async init() {
    this.settings = await Utils.invoke('get_settings');
    if (!this.settings) this.settings = {};

    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.appearance_mode || 'dark');

    // Apply font
    const textEl = document.getElementById('topbar-text');
    textEl.style.fontSize = `${this.settings.notch_font_size || 20}px`;
    textEl.style.fontFamily = Utils.fontFamilyCSS(this.settings.notch_font_family);

    // Opacity
    document.getElementById('topbar-container').style.opacity = this.settings.notch_opacity || 0.92;

    // Glow style
    const glow = document.getElementById('topbar-glow');
    glow.className = `topbar-glow ${this.settings.notch_glow_style || 'rainbow'}`;

    // Timer visibility
    const timer = document.getElementById('topbar-timer');
    timer.style.display = (this.settings.notch_show_timer !== false) ? 'block' : 'none';

    // Listen for script from Rust backend
    Utils.listen('load-script', (event) => {
      const data = event.payload;
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
        const glow = document.getElementById('topbar-glow');
        glow.className = `topbar-glow ${s.notch_glow_style || 'rainbow'}`;
        document.getElementById('topbar-container').style.opacity = s.notch_opacity || 0.92;
      }
    });

    // Button handlers
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (this.engine) this.engine.togglePause();
    });
    document.getElementById('btn-slower').addEventListener('click', () => {
      if (this.engine) this.engine.decreaseSpeed(5);
    });
    document.getElementById('btn-faster').addEventListener('click', () => {
      if (this.engine) this.engine.increaseSpeed(5);
    });
    document.getElementById('btn-close').addEventListener('click', () => this.close());
  },

  startWithCountdown(content) {
    const timer = document.getElementById('topbar-timer');

    this.engine = new PrompterEngine({
      scrollSpeed: this.settings.notch_scroll_speed || 50,
      fontSize: this.settings.notch_font_size || 20,
      endAction: this.settings.end_action || 'stop',
      onWordChange: (index) => this.renderLine(index),
      onTimerUpdate: (s) => { timer.textContent = Utils.formatTime(s); },
      onPauseChange: (paused) => {
        const btn = document.getElementById('btn-pause');
        btn.innerHTML = paused ? '&#9654;' : '&#10074;&#10074;';
      },
      onEnd: () => this.close(),
    });

    this.engine.loadScript(content);
    this.renderLine(0);

    this.keyboard = new KeyboardHandler(this.engine, {
      onClose: () => this.close(),
      onSkipCountdown: () => this.countdown?.skip(),
    });

    // Hover-pause
    this.setupHoverPause();

    // Cursor auto-hide
    this.setupCursorAutoHide();

    // Sleep prevention
    Utils.invoke('prevent_sleep', { prevent: true });

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

  renderLine(wordIndex) {
    const line = document.getElementById('topbar-line');
    const words = this.engine.words;
    const lineCount = this.settings.notch_line_count || 2;
    const wordsPerLine = 8;
    const totalShow = wordsPerLine * lineCount;
    const start = Math.max(0, wordIndex - Math.floor(totalShow / 4));
    const end = Math.min(words.length, start + totalShow);

    let html = '';
    for (let i = start; i < end; i++) {
      let cls = 'word';
      if (i < wordIndex) cls += ' spoken';
      else if (i === wordIndex) cls += ' current';
      else cls += ' upcoming';
      html += `<span class="${cls}">${Utils.escapeHtml(words[i].text)} </span>`;
    }
    line.innerHTML = html;
  },

  setupHoverPause() {
    const textEl = document.getElementById('topbar-text');
    textEl.addEventListener('mouseenter', () => {
      if (this.engine?.isRunning && !this.engine?.isPaused) {
        this.isHoverPaused = true;
        this.engine.pause();
      }
    });
    textEl.addEventListener('mouseleave', () => {
      if (this.isHoverPaused && this.engine?.isPaused) {
        this.isHoverPaused = false;
        this.engine.resume();
      }
    });
  },

  setupCursorAutoHide() {
    const container = document.getElementById('topbar-container');
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

document.addEventListener('DOMContentLoaded', () => TopbarPrompter.init());
