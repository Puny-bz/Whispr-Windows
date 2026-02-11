// Prompter Engine — Core scroll & karaoke engine
// Port of PrompterViewModel.swift

class PrompterEngine {
  constructor(options = {}) {
    // State
    this.words = [];
    this.currentWordIndex = 0;
    this.scrollOffset = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isReversed = false;
    this.elapsedSeconds = 0;
    this.startTime = null;
    this.pauseStart = null;
    this.totalPauseTime = 0;

    // Settings
    this.scrollSpeed = options.scrollSpeed || 50;
    this.fontSize = options.fontSize || 32;
    this.endAction = options.endAction || 'stop';

    // Callbacks
    this.onWordChange = options.onWordChange || null;
    this.onScroll = options.onScroll || null;
    this.onTimerUpdate = options.onTimerUpdate || null;
    this.onEnd = options.onEnd || null;
    this.onPauseChange = options.onPauseChange || null;
    this.onSpeedChange = options.onSpeedChange || null;

    // Internal
    this._animFrame = null;
    this._lastTimestamp = null;
    this._timerInterval = null;
  }

  /**
   * Load script text and prepare words
   */
  loadScript(text) {
    this.words = Utils.tokenize(text);
    this.currentWordIndex = 0;
    this.scrollOffset = 0;
  }

  /**
   * Begin scrolling (called after countdown)
   */
  start() {
    if (this.words.length === 0) return;
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.totalPauseTime = 0;
    this._lastTimestamp = performance.now();

    // Start animation loop
    this._animFrame = requestAnimationFrame((t) => this._tick(t));

    // Start timer
    this._timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds = (Date.now() - this.startTime - this.totalPauseTime) / 1000;
        if (this.onTimerUpdate) this.onTimerUpdate(this.elapsedSeconds);
      }
    }, 1000);
  }

  /**
   * Main animation loop — 60fps scroll
   */
  _tick(timestamp) {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const delta = (timestamp - this._lastTimestamp) / 1000; // seconds

      // Calculate pixels per second from scroll speed
      const displaySpeed = this.scrollSpeed * 3.0; // WPM
      const wordsPerSecond = displaySpeed / 60.0;
      const lineHeight = this.fontSize * 1.2 + 16;
      const totalWords = this.words.length;
      const avgWordsPerLine = Math.max(totalWords > 0 ? totalWords / Math.max(totalWords / 8, 1) : 8, 1);
      const linesPerSecond = wordsPerSecond / avgWordsPerLine;
      const pixelsPerSecond = linesPerSecond * lineHeight;

      const direction = this.isReversed ? -1 : 1;
      this.scrollOffset += pixelsPerSecond * delta * direction;

      // Advance word index based on scroll position
      if (!this.isReversed) {
        const targetIndex = Math.floor(this.scrollOffset / (lineHeight / avgWordsPerLine));
        if (targetIndex > this.currentWordIndex && targetIndex < this.words.length) {
          this.currentWordIndex = targetIndex;
          if (this.onWordChange) this.onWordChange(this.currentWordIndex);
        }

        // Check end of script
        if (this.currentWordIndex >= this.words.length - 1) {
          this._handleEnd();
          return;
        }
      } else {
        const targetIndex = Math.floor(this.scrollOffset / (lineHeight / avgWordsPerLine));
        if (targetIndex < this.currentWordIndex && targetIndex >= 0) {
          this.currentWordIndex = targetIndex;
          if (this.onWordChange) this.onWordChange(this.currentWordIndex);
        }
      }

      if (this.onScroll) this.onScroll(this.scrollOffset);
    }

    this._lastTimestamp = timestamp;
    this._animFrame = requestAnimationFrame((t) => this._tick(t));
  }

  /**
   * Handle end of script
   */
  _handleEnd() {
    switch (this.endAction) {
      case 'loop':
        this.currentWordIndex = 0;
        this.scrollOffset = 0;
        if (this.onWordChange) this.onWordChange(0);
        if (this.onScroll) this.onScroll(0);
        break;
      case 'close':
        this.stop();
        if (this.onEnd) this.onEnd('close');
        break;
      default: // 'stop'
        this.pause();
        if (this.onEnd) this.onEnd('stop');
        break;
    }
  }

  /**
   * Pause/resume toggle
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pauseStart = Date.now();
    if (this.onPauseChange) this.onPauseChange(true);
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.pauseStart) {
      this.totalPauseTime += Date.now() - this.pauseStart;
      this.pauseStart = null;
    }
    this._lastTimestamp = performance.now();
    if (this.onPauseChange) this.onPauseChange(false);
  }

  /**
   * Stop and clean up
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  /**
   * Speed adjustment
   */
  increaseSpeed(amount = 10) {
    this.scrollSpeed = Math.min(200, this.scrollSpeed + amount);
    if (this.onSpeedChange) this.onSpeedChange(this.scrollSpeed);
  }

  decreaseSpeed(amount = 10) {
    this.scrollSpeed = Math.max(10, this.scrollSpeed - amount);
    if (this.onSpeedChange) this.onSpeedChange(this.scrollSpeed);
  }

  /**
   * Jump forward/back by sentence
   */
  jumpForward() {
    const targetIndex = Math.min(this.words.length - 1, this.currentWordIndex + 20);
    this.currentWordIndex = targetIndex;
    if (this.onWordChange) this.onWordChange(this.currentWordIndex);
  }

  jumpBack() {
    const targetIndex = Math.max(0, this.currentWordIndex - 20);
    this.currentWordIndex = targetIndex;
    if (this.onWordChange) this.onWordChange(this.currentWordIndex);
  }

  /**
   * Toggle reverse direction
   */
  toggleReverse() {
    this.isReversed = !this.isReversed;
  }

  /**
   * Get current WPM based on elapsed time
   */
  getCurrentWPM() {
    if (this.elapsedSeconds <= 0) return 0;
    return (this.currentWordIndex / this.elapsedSeconds) * 60;
  }

  /**
   * Advance to specific word (used by voice scroll)
   */
  advanceToWord(index) {
    if (index >= 0 && index < this.words.length) {
      this.currentWordIndex = index;
      if (this.onWordChange) this.onWordChange(this.currentWordIndex);
    }
  }
}
