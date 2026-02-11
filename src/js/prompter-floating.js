// Floating Prompter Controller

const FloatingPrompter = {
  engine: null,
  keyboard: null,
  countdown: null,
  voiceScroll: null,
  practiceMode: null,
  settings: null,
  scriptContent: '',
  scriptId: null,

  async init() {
    // Load settings
    this.settings = await Utils.invoke('get_settings');
    if (!this.settings) return;

    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.floating_theme);

    // Apply font
    const textEl = document.getElementById('floating-text');
    textEl.style.fontSize = `${this.settings.floating_font_size}px`;
    textEl.style.fontFamily = Utils.fontFamilyCSS(this.settings.floating_font_family);

    // Mirror mode
    const container = document.getElementById('floating-container');
    if (this.settings.mirror_mode) {
      container.classList.add('mirrored');
    }

    // Get script content from main window via event
    if (window.__TAURI__) {
      window.__TAURI__.event.listen('load-script', (event) => {
        this.scriptContent = event.payload.content || event.payload;
        this.scriptId = event.payload.id || null;
        this.startWithCountdown();
      });

      window.__TAURI__.event.emit('request-script');
    }

    // Create engine
    this.engine = new PrompterEngine({
      scrollSpeed: this.settings.floating_scroll_speed,
      fontSize: this.settings.floating_font_size,
      endAction: this.settings.end_action,
      onWordChange: (index) => this.updateWords(index),
      onScroll: (offset) => this.updateScroll(offset),
      onTimerUpdate: (s) => {
        document.getElementById('floating-timer').textContent = Utils.formatTime(s);
      },
      onPauseChange: (paused) => {
        document.getElementById('pause-overlay').classList.toggle('visible', paused);
        if (paused && this.practiceMode) this.practiceMode.recordPause();
        if (!paused && this.practiceMode) this.practiceMode.endPause();
      },
      onSpeedChange: (speed) => {
        document.getElementById('speed-indicator').textContent = `${Math.round(speed * 3)} WPM`;
      },
      onEnd: (action) => {
        if (action === 'close') this.close();
        if (this.practiceMode) {
          this.practiceMode.finish(this.scriptId);
          this.practiceMode.stop();
        }
      },
    });

    // Keyboard handler
    this.keyboard = new KeyboardHandler(this.engine, {
      onClose: () => this.close(),
      onMirrorToggle: () => container.classList.toggle('mirrored'),
      onFullscreenToggle: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(),
      onSkipCountdown: () => this.countdown?.skip(),
    });

    // Practice mode
    this.practiceMode = new PracticeMode(this.engine, {
      targetMinWPM: this.settings.target_min_wpm,
      targetMaxWPM: this.settings.target_max_wpm,
    });

    // Button handlers
    document.getElementById('btn-close').addEventListener('click', () => this.close());
    document.getElementById('btn-minimize').addEventListener('click', async () => {
      if (window.__TAURI__) {
        const win = window.__TAURI__.window.getCurrentWindow();
        win.minimize();
      }
    });

    // Pause on hover
    const pauseOverlay = document.getElementById('pause-overlay');
    pauseOverlay.addEventListener('click', () => this.engine.resume());
  },

  startWithCountdown() {
    this.engine.loadScript(this.scriptContent);
    this.renderAllWords();

    this.countdown = new Countdown(document.body, {
      onComplete: () => {
        this.keyboard.isCountdownActive = false;
        this.engine.start();
        this.practiceMode.start();
      },
    });
    this.keyboard.isCountdownActive = true;
    this.countdown.start(this.settings.countdown_seconds);
  },

  renderAllWords() {
    const container = document.getElementById('scroll-content');
    const words = this.engine.words;
    container.innerHTML = words
      .map((w, i) => `<span class="word upcoming" data-index="${i}">${w.text} </span>`)
      .join('');
  },

  updateWords(currentIndex) {
    const container = document.getElementById('scroll-content');
    const wordEls = container.querySelectorAll('.word');
    wordEls.forEach((el, i) => {
      el.className = 'word';
      if (i < currentIndex) el.classList.add('spoken');
      else if (i === currentIndex) el.classList.add('current');
      else el.classList.add('upcoming');
    });

    // Update pace indicator
    if (this.practiceMode && this.practiceMode.isActive) {
      const wpm = this.engine.getCurrentWPM();
      const pos = this.practiceMode.getPacePosition(wpm);
      const marker = document.getElementById('pace-marker');
      const bar = document.getElementById('pace-bar');
      bar.style.display = 'flex';
      marker.style.left = `${pos * 100}%`;
    }
  },

  updateScroll(offset) {
    const content = document.getElementById('scroll-content');
    content.style.transform = `translateY(${-offset}px)`;
  },

  async close() {
    this.engine.stop();
    this.keyboard?.destroy();
    this.countdown?.destroy();
    this.voiceScroll?.stop();
    this.practiceMode?.stop();
    await Utils.invoke('close_prompter');
  },
};

document.addEventListener('DOMContentLoaded', () => FloatingPrompter.init());
