// Top Bar Prompter Controller — Full feature parity with Swift

const TopbarPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  voiceScroll: null,
  practiceMode: null,
  settings: null,
  scriptId: null,
  scriptContent: null,

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
      if (this.engine) this.engine.decreaseSpeed();
    });
    document.getElementById('btn-faster').addEventListener('click', () => {
      if (this.engine) this.engine.increaseSpeed();
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
        if (this.voiceScroll) {
          if (paused) this.voiceScroll.pause();
          else this.voiceScroll.resume();
        }
        if (this.practiceMode) {
          if (paused) this.practiceMode.recordPause();
          else this.practiceMode.endPause();
        }
      },
      onEnd: () => this.close(),
    });

    this.engine.loadScript(content);
    this.renderLine(0);

    this.keyboard = new KeyboardHandler(this.engine, {
      onClose: () => this.close(),
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

    // Sleep prevention + content protection
    Utils.invoke('prevent_sleep', { prevent: true });
    if (this.settings.content_protected) {
      Utils.invoke('set_content_protected', { protected: true });
    }

    const countdownSeconds = this.settings.countdown_seconds ?? 3;
    this.countdown = new Countdown(document.body, {
      onComplete: () => {
        this.keyboard.isCountdownActive = false;
        this.engine.start();
        this.practiceMode.start();
        if (this.settings.voice_scroll_enabled) {
          this.toggleVoiceScroll();
        }
      },
    });
    this.keyboard.isCountdownActive = countdownSeconds > 0;
    this.countdown.start(countdownSeconds);
  },

  /**
   * Render windowed word view — shows words around current position
   * Uses MarkdownParser.renderWordSpans for plain word rendering in topbar
   */
  renderLine(wordIndex) {
    const line = document.getElementById('topbar-line');
    const words = this.engine.words;
    const lineCount = this.settings.notch_line_count || 2;
    const wordsPerLine = 8;
    const totalShow = wordsPerLine * lineCount;
    const start = Math.max(0, wordIndex - Math.floor(totalShow / 4));
    const end = Math.min(words.length, start + totalShow);

    line.innerHTML = MarkdownParser.renderWordSpans(words, wordIndex, start, end);
  },

  async toggleVoiceScroll() {
    if (!this.voiceScroll) return;
    if (this.voiceScroll.isListening) {
      this.voiceScroll.stop();
    } else {
      await this.voiceScroll.start();
    }
  },

  async close() {
    this.engine?.stop();
    this.keyboard?.destroy();
    this.countdown?.destroy();
    this.voiceScroll?.stop();
    this.practiceMode?.stop();
    Utils.invoke('prevent_sleep', { prevent: false });
    Utils.invoke('set_content_protected', { protected: false });
    await Utils.invoke('close_prompter');
  },
};

document.addEventListener('DOMContentLoaded', () => TopbarPrompter.init());
