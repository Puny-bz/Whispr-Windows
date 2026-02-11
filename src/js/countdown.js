// Countdown Overlay — Glass circle with animated number pop

class Countdown {
  constructor(container, options = {}) {
    this.container = container;
    this.onComplete = options.onComplete || null;
    this.value = 0;
    this._timer = null;
    this._overlay = null;
  }

  /**
   * Start countdown from given value
   */
  start(seconds) {
    if (seconds <= 0) {
      if (this.onComplete) this.onComplete();
      return;
    }

    this.value = seconds;
    this._createOverlay();
    this._updateDisplay();
    this._scheduleNext();
  }

  _createOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'countdown-overlay';
    this._overlay.innerHTML = `
      <div class="countdown-backdrop"></div>
      <div class="countdown-circle">
        <span class="countdown-number"></span>
      </div>
      <div class="countdown-hint">Press Space to skip</div>
    `;
    this._overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 100;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    `;

    // Backdrop
    const backdrop = this._overlay.querySelector('.countdown-backdrop');
    backdrop.style.cssText = `
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    `;

    // Circle
    const circle = this._overlay.querySelector('.countdown-circle');
    circle.style.cssText = `
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 0 20px rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      z-index: 1;
    `;

    // Number
    const number = this._overlay.querySelector('.countdown-number');
    number.style.cssText = `
      font-size: 80px; font-weight: 700; color: #fff;
      font-family: var(--font-system);
    `;

    // Hint
    const hint = this._overlay.querySelector('.countdown-hint');
    hint.style.cssText = `
      position: absolute; bottom: 32px;
      font-size: 14px; color: rgba(255,255,255,0.5);
      z-index: 1;
    `;

    this.container.appendChild(this._overlay);
  }

  _updateDisplay() {
    if (!this._overlay) return;
    const number = this._overlay.querySelector('.countdown-number');
    number.textContent = this.value;

    // Pop animation
    number.style.transform = 'scale(0.5)';
    number.style.opacity = '0.3';
    number.style.transition = 'none';

    requestAnimationFrame(() => {
      number.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease';
      number.style.transform = 'scale(1)';
      number.style.opacity = '1';
    });
  }

  _scheduleNext() {
    this._timer = setTimeout(() => {
      this.value--;
      if (this.value <= 0) {
        this._finish();
      } else {
        this._updateDisplay();
        this._scheduleNext();
      }
    }, 1000);
  }

  skip() {
    this._finish();
  }

  _finish() {
    clearTimeout(this._timer);
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    if (this.onComplete) this.onComplete();
  }

  destroy() {
    clearTimeout(this._timer);
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }
}
