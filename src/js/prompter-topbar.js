// Top Bar Prompter Controller

const TopbarPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  settings: null,
  scriptContent: '',

  async init() {
    // Load settings
    this.settings = await Utils.invoke('get_settings');
    if (!this.settings) return;

    // Apply theme & font
    document.documentElement.setAttribute('data-theme', this.settings.appearance_mode);
    const textEl = document.getElementById('topbar-text');
    textEl.style.fontSize = `${this.settings.notch_font_size}px`;
    textEl.style.fontFamily = Utils.fontFamilyCSS(this.settings.notch_font_family);

    // Set opacity
    const container = document.getElementById('topbar-container');
    container.style.opacity = this.settings.notch_opacity;

    // Set glow style
    const glow = document.getElementById('topbar-glow');
    glow.className = `topbar-glow ${this.settings.notch_glow_style}`;

    // Timer visibility
    const timer = document.getElementById('topbar-timer');
    timer.style.display = this.settings.notch_show_timer ? 'block' : 'none';

    // Get script content from main window via event
    if (window.__TAURI__) {
      window.__TAURI__.event.listen('load-script', (event) => {
        this.scriptContent = event.payload;
        this.startWithCountdown();
      });

      // Request script from main window
      window.__TAURI__.event.emit('request-script');
    }

    // Create engine
    this.engine = new PrompterEngine({
      scrollSpeed: this.settings.notch_scroll_speed,
      fontSize: this.settings.notch_font_size,
      endAction: this.settings.end_action,
      onWordChange: (index) => this.renderLine(index),
      onTimerUpdate: (s) => {
        timer.textContent = Utils.formatTime(s);
      },
      onEnd: () => this.close(),
    });

    // Keyboard handler
    this.keyboard = new KeyboardHandler(this.engine, {
      onClose: () => this.close(),
      onSkipCountdown: () => this.countdown?.skip(),
    });

    // Button handlers
    document.getElementById('btn-pause').addEventListener('click', () => this.engine.togglePause());
    document.getElementById('btn-slower').addEventListener('click', () => this.engine.decreaseSpeed());
    document.getElementById('btn-faster').addEventListener('click', () => this.engine.increaseSpeed());
    document.getElementById('btn-close').addEventListener('click', () => this.close());
  },

  startWithCountdown() {
    this.engine.loadScript(this.scriptContent);
    this.renderLine(0);

    this.countdown = new Countdown(document.body, {
      onComplete: () => {
        this.keyboard.isCountdownActive = false;
        this.engine.start();
      },
    });
    this.keyboard.isCountdownActive = true;
    this.countdown.start(this.settings.countdown_seconds);
  },

  renderLine(wordIndex) {
    const line = document.getElementById('topbar-line');
    const words = this.engine.words;
    const lineCount = this.settings.notch_line_count || 2;

    // Show a window of words around current index
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
      html += `<span class="${cls}">${words[i].text} </span>`;
    }
    line.innerHTML = html;
  },

  async close() {
    this.engine.stop();
    this.keyboard?.destroy();
    this.countdown?.destroy();
    await Utils.invoke('close_prompter');
  },
};

document.addEventListener('DOMContentLoaded', () => TopbarPrompter.init());
