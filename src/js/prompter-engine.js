// Prompter Engine — Full port of PrompterViewModel.swift (405 lines)
// Timer-based scrolling with word/line tracking and pixel offset calculation

class PrompterEngine {
  constructor(options = {}) {
    // State
    this.words = [];
    this.lines = [];
    this.currentWordIndex = 0;
    this.currentLineIndex = 0;
    this.scrollOffset = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isReversed = false;
    this.elapsedSeconds = 0;

    // Time tracking (matches Swift's scrollStartDate pattern)
    this.scrollStartDate = null;
    this.scrollStartWordIndex = 0;
    this.scrollStartPixelOffset = 0;
    this.pauseStartTime = null;
    this.totalPauseTime = 0;

    // Settings
    this.scrollSpeed = options.scrollSpeed || 50;
    this.fontSize = options.fontSize || 32;
    this.endAction = options.endAction || 'stop';

    // Derived (matches Swift calculation)
    this.wordsPerSecond = 0;
    this.pixelsPerSecond = 0;
    this.lineHeight = 0;
    this.avgWordsPerLine = 1;

    // Callbacks
    this.onWordChange = options.onWordChange || null;
    this.onScroll = options.onScroll || null;
    this.onTimerUpdate = options.onTimerUpdate || null;
    this.onEnd = options.onEnd || null;
    this.onPauseChange = options.onPauseChange || null;
    this.onSpeedChange = options.onSpeedChange || null;

    // Internal (30fps timer matching Swift's 1/30 interval)
    this._timer = null;
    this._timerInterval = null;
  }

  loadScript(text) {
    this.words = Utils.tokenize(text);
    // Split into lines for accurate scroll calculation
    this.lines = text.split('\n').filter(l => l.trim());
    this.currentWordIndex = 0;
    this.currentLineIndex = 0;
    this.scrollOffset = 0;
    this._recalculateSpeed();
  }

  /**
   * Recalculate speed — exact port of Swift's recalculateSpeed()
   * displaySpeed = scrollSpeed * 3.0 (WPM)
   * wordsPerSecond = displaySpeed / 60.0
   * lineHeight = fontSize * 1.2 + 16.0
   * avgWordsPerLine = max(1, totalWords / totalLines)
   * linesPerSecond = wordsPerSecond / avgWordsPerLine
   * pixelsPerSecond = linesPerSecond * lineHeight
   */
  _recalculateSpeed() {
    const displaySpeed = this.scrollSpeed * 3.0; // WPM
    this.wordsPerSecond = displaySpeed / 60.0;
    this.lineHeight = this.fontSize * 1.2 + 16.0;
    this.avgWordsPerLine = Math.max(
      1.0,
      this.words.length / Math.max(1.0, this.lines.length)
    );
    const linesPerSecond = this.wordsPerSecond / this.avgWordsPerLine;
    this.pixelsPerSecond = linesPerSecond * this.lineHeight;
  }

  start() {
    if (this.words.length === 0) return;
    this.isRunning = true;
    this.isPaused = false;
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = 0;
    this.scrollStartPixelOffset = 0;
    this.totalPauseTime = 0;

    // 30fps timer matching Swift's Timer.scheduledTimer(1.0/30.0)
    this._timer = setInterval(() => this._tick(), 1000 / 30);

    // Elapsed time timer (1s interval)
    this._timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds =
          (Date.now() - this.scrollStartDate - this.totalPauseTime) / 1000;
        if (this.onTimerUpdate) this.onTimerUpdate(this.elapsedSeconds);
      }
    }, 1000);
  }

  /**
   * Main tick — time-based calculation matching Swift's scrollTick()
   * elapsed = now - scrollStartDate - totalPauseTime
   * wordIndex = scrollStartWordIndex + elapsed * wordsPerSecond
   * pixelOffset = scrollStartPixelOffset + elapsed * pixelsPerSecond
   */
  _tick() {
    if (!this.isRunning || this.isPaused) return;

    const now = Date.now();
    const elapsed = (now - this.scrollStartDate - this.totalPauseTime) / 1000;

    const direction = this.isReversed ? -1 : 1;

    // Calculate word index from time
    const wordDelta = elapsed * this.wordsPerSecond * direction;
    const newWordIndex = Math.floor(
      Math.max(0, Math.min(this.words.length - 1, this.scrollStartWordIndex + wordDelta))
    );

    // Calculate pixel offset from time
    const pixelDelta = elapsed * this.pixelsPerSecond * direction;
    this.scrollOffset = this.scrollStartPixelOffset + pixelDelta;

    // Update word index
    if (newWordIndex !== this.currentWordIndex) {
      this.currentWordIndex = newWordIndex;

      // Calculate line index
      let wordsSoFar = 0;
      for (let i = 0; i < this.lines.length; i++) {
        wordsSoFar += this.lines[i].split(/\s+/).filter(Boolean).length;
        if (wordsSoFar > this.currentWordIndex) {
          this.currentLineIndex = i;
          break;
        }
      }

      if (this.onWordChange) this.onWordChange(this.currentWordIndex);
    }

    if (this.onScroll) this.onScroll(this.scrollOffset);

    // Check end of script
    if (!this.isReversed && this.currentWordIndex >= this.words.length - 1) {
      this._handleEnd();
    }
  }

  _handleEnd() {
    switch (this.endAction) {
      case 'loop':
        this.currentWordIndex = 0;
        this.currentLineIndex = 0;
        this.scrollOffset = 0;
        this.scrollStartDate = Date.now();
        this.scrollStartWordIndex = 0;
        this.scrollStartPixelOffset = 0;
        this.totalPauseTime = 0;
        if (this.onWordChange) this.onWordChange(0);
        if (this.onScroll) this.onScroll(0);
        break;
      case 'close':
        this.stop();
        if (this.onEnd) this.onEnd('close');
        break;
      default:
        this.pause();
        if (this.onEnd) this.onEnd('stop');
        break;
    }
  }

  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    if (this.onPauseChange) this.onPauseChange(true);
  }

  /**
   * Resume — resets scroll anchor (matches Swift's lines 300-303)
   */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (this.pauseStartTime) {
      this.totalPauseTime += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }
    // Reset scroll anchor to current position
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
    if (this.onPauseChange) this.onPauseChange(false);
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this._timer) clearInterval(this._timer);
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  increaseSpeed(amount = 10) {
    this.scrollSpeed = Math.min(200, this.scrollSpeed + amount);
    // Reset anchor before recalculating
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
    this._recalculateSpeed();
    if (this.onSpeedChange) this.onSpeedChange(this.scrollSpeed);
  }

  decreaseSpeed(amount = 10) {
    this.scrollSpeed = Math.max(10, this.scrollSpeed - amount);
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
    this._recalculateSpeed();
    if (this.onSpeedChange) this.onSpeedChange(this.scrollSpeed);
  }

  jumpForward() {
    // Jump one line forward (matches Swift's jumpSentence)
    if (this.currentLineIndex < this.lines.length - 1) {
      this.currentLineIndex++;
      let wordsSoFar = 0;
      for (let i = 0; i < this.currentLineIndex; i++) {
        wordsSoFar += this.lines[i].split(/\s+/).filter(Boolean).length;
      }
      this.currentWordIndex = Math.min(wordsSoFar, this.words.length - 1);
      this.scrollOffset = this.currentLineIndex * this.lineHeight;
    }
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
    if (this.onWordChange) this.onWordChange(this.currentWordIndex);
    if (this.onScroll) this.onScroll(this.scrollOffset);
  }

  jumpBack() {
    // Jump one line back (matches Swift's jumpSentence reverse)
    if (this.currentLineIndex > 0) {
      this.currentLineIndex--;
      let wordsSoFar = 0;
      for (let i = 0; i < this.currentLineIndex; i++) {
        wordsSoFar += this.lines[i].split(/\s+/).filter(Boolean).length;
      }
      this.currentWordIndex = Math.max(0, wordsSoFar);
      this.scrollOffset = Math.max(0, this.currentLineIndex * this.lineHeight);
    } else {
      this.currentWordIndex = 0;
      this.scrollOffset = 0;
    }
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
    if (this.onWordChange) this.onWordChange(this.currentWordIndex);
    if (this.onScroll) this.onScroll(this.scrollOffset);
  }

  toggleReverse() {
    this.isReversed = !this.isReversed;
    // Reset anchor for new direction
    this.scrollStartDate = Date.now();
    this.scrollStartWordIndex = this.currentWordIndex;
    this.scrollStartPixelOffset = this.scrollOffset;
    this.totalPauseTime = 0;
  }

  getCurrentWPM() {
    if (this.elapsedSeconds <= 0) return 0;
    return (this.currentWordIndex / this.elapsedSeconds) * 60;
  }

  getDisplayWPM() {
    return Math.round(this.scrollSpeed * 3);
  }

  getProgress() {
    if (this.words.length <= 1) return 0;
    return this.currentWordIndex / (this.words.length - 1);
  }

  getRemainingSeconds() {
    if (this.wordsPerSecond <= 0) return 0;
    const remaining = this.words.length - 1 - this.currentWordIndex;
    return remaining / this.wordsPerSecond;
  }

  advanceToWord(index) {
    if (index >= 0 && index < this.words.length) {
      this.currentWordIndex = index;
      // Recalculate scroll offset for the new word position
      this.scrollOffset =
        (index / this.avgWordsPerLine) * this.lineHeight;
      this.scrollStartDate = Date.now();
      this.scrollStartWordIndex = index;
      this.scrollStartPixelOffset = this.scrollOffset;
      this.totalPauseTime = 0;
      if (this.onWordChange) this.onWordChange(this.currentWordIndex);
      if (this.onScroll) this.onScroll(this.scrollOffset);
    }
  }
}
