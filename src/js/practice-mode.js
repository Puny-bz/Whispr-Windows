// Practice Mode — WPM tracking & pace indicator

class PracticeMode {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.targetMinWPM = options.targetMinWPM || 130;
    this.targetMaxWPM = options.targetMaxWPM || 170;
    this.maxWPM = 250;

    this.wpmReadings = [];
    this.pauseCount = 0;
    this.totalPauseTime = 0;
    this.pauseStartTime = null;
    this.isActive = false;
    this._interval = null;
  }

  start() {
    this.isActive = true;
    this.wpmReadings = [];
    this.pauseCount = 0;
    this.totalPauseTime = 0;

    // Sample WPM every 2 seconds
    this._interval = setInterval(() => {
      const wpm = this.engine.getCurrentWPM();
      if (wpm > 0) {
        this.wpmReadings.push(wpm);
      }
    }, 2000);
  }

  recordPause() {
    this.pauseCount++;
    this.pauseStartTime = Date.now();
  }

  endPause() {
    if (this.pauseStartTime) {
      this.totalPauseTime += (Date.now() - this.pauseStartTime) / 1000;
      this.pauseStartTime = null;
    }
  }

  /**
   * Get pace zone: 'slow', 'optimal', or 'fast'
   */
  getPaceZone(wpm) {
    if (wpm < this.targetMinWPM) return 'slow';
    if (wpm > this.targetMaxWPM) return 'fast';
    return 'optimal';
  }

  /**
   * Get pace marker position (0–1)
   */
  getPacePosition(wpm) {
    return Math.max(0, Math.min(1, wpm / this.maxWPM));
  }

  /**
   * Get average WPM
   */
  getAverageWPM() {
    if (this.wpmReadings.length === 0) return 0;
    const sum = this.wpmReadings.reduce((a, b) => a + b, 0);
    return sum / this.wpmReadings.length;
  }

  /**
   * Get practice summary
   */
  getSummary() {
    return {
      averageWPM: Math.round(this.getAverageWPM()),
      pauseCount: this.pauseCount,
      totalPauseTime: Math.round(this.totalPauseTime),
      totalDuration: Math.round(this.engine.elapsedSeconds),
      readingsCount: this.wpmReadings.length,
    };
  }

  /**
   * Save stats to script
   */
  async finish(scriptId) {
    const avg = this.getAverageWPM();
    const duration = this.engine.elapsedSeconds;
    if (scriptId && avg > 0) {
      await Utils.invoke('update_practice_stats', {
        id: scriptId,
        wpm: avg,
        duration,
      });
    }
  }

  stop() {
    this.isActive = false;
    clearInterval(this._interval);
  }
}
