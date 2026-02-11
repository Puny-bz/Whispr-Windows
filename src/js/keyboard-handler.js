// Keyboard Handler for Prompter Windows
// Matches Swift's keyboard shortcuts exactly

class KeyboardHandler {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.onClose = options.onClose || null;
    this.onMirrorToggle = options.onMirrorToggle || null;
    this.onFullscreenToggle = options.onFullscreenToggle || null;
    this.onSkipCountdown = options.onSkipCountdown || null;
    this.onVoiceToggle = options.onVoiceToggle || null;
    this.isCountdownActive = false;

    this._handler = (e) => this._handleKey(e);
    document.addEventListener('keydown', this._handler);
  }

  _handleKey(e) {
    // During countdown, only Space works (to skip)
    if (this.isCountdownActive) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.onSkipCountdown) this.onSkipCountdown();
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.engine.togglePause();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.engine.increaseSpeed();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.engine.decreaseSpeed();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.engine.jumpForward();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.engine.jumpBack();
        break;
      case 'Escape':
        e.preventDefault();
        this.engine.stop();
        if (this.onClose) this.onClose();
        break;
      case 'KeyM':
        e.preventDefault();
        if (this.onMirrorToggle) this.onMirrorToggle();
        break;
      case 'KeyR':
        e.preventDefault();
        this.engine.toggleReverse();
        break;
      case 'KeyF':
        e.preventDefault();
        if (this.onFullscreenToggle) this.onFullscreenToggle();
        break;
      case 'KeyV':
        e.preventDefault();
        if (this.onVoiceToggle) this.onVoiceToggle();
        break;
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._handler);
  }
}
