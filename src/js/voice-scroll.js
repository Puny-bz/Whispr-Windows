// Voice Scroll — Full port of VoiceScrollEngine.swift (238 lines)
// Web Speech API with forward-only word matching, 50-word lookahead,
// auto-restart on timeout, silence detection

class VoiceScroll {
  constructor(engine) {
    this.engine = engine;
    this.recognition = null;
    this.isListening = false;
    this.lastMatchedIndex = -1;
    this.wordsSpoken = 0;
    this.startTime = null;
    this.silenceTimer = null;
    this.silenceThreshold = 1500; // 1.5s — matches Swift
    this.lookaheadWindow = 50; // matches Swift's matchWordPosition range
    this.onStatusChange = null;
    this.onWPMUpdate = null;
  }

  /**
   * Request microphone permission and start listening
   */
  async start() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      if (this.onStatusChange) this.onStatusChange('unsupported');
      return false;
    }

    // Request microphone permission explicitly
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn('Microphone permission denied:', e);
      if (this.onStatusChange) this.onStatusChange('denied');
      return false;
    }

    this.startTime = Date.now();
    this.wordsSpoken = 0;
    this.lastMatchedIndex = -1;
    this._createRecognition();

    try {
      this.recognition.start();
      this.isListening = true;
      this._resetSilenceTimer();
      if (this.onStatusChange) this.onStatusChange('listening');
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      if (this.onStatusChange) this.onStatusChange('error');
      return false;
    }
  }

  _createRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      this._resetSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        // Extract last 3 words from transcript (matches Swift's bestTranscription approach)
        const transcriptWords = transcript.split(/\s+/);
        const recentWords = transcriptWords.slice(-3);

        for (const word of recentWords) {
          const matched = this._matchForward(word);
          if (matched) {
            this.wordsSpoken++;
            this._updateWPM();
          }
        }
      }
    };

    this.recognition.onend = () => {
      // Auto-restart on timeout — matches Swift's handleRecognitionTimeout()
      // Preserves: lastMatchedIndex, wordsSpoken, startTime
      if (this.isListening) {
        if (this.onStatusChange) this.onStatusChange('restarting');
        setTimeout(() => {
          if (this.isListening) {
            try {
              this._createRecognition();
              this.recognition.start();
              if (this.onStatusChange) this.onStatusChange('listening');
            } catch (e) {
              console.warn('Failed to restart recognition:', e);
            }
          }
        }, 100);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Expected — will auto-restart via onend
      } else if (event.error === 'not-allowed') {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('denied');
      } else {
        console.warn('Speech recognition error:', event.error);
      }
    };
  }

  /**
   * Forward-only word matching with 50-word lookahead
   * Port of Swift's matchWordPosition() algorithm
   * Strips punctuation, case-insensitive comparison
   */
  _matchForward(spoken) {
    const cleanSpoken = this._normalize(spoken);
    if (!cleanSpoken || cleanSpoken.length < 2) return false;

    const words = this.engine.words;
    const searchStart = this.lastMatchedIndex + 1;
    const searchEnd = Math.min(words.length, searchStart + this.lookaheadWindow);

    for (let i = searchStart; i < searchEnd; i++) {
      if (words[i].lower === cleanSpoken) {
        this.lastMatchedIndex = i;
        this.engine.advanceToWord(i);
        return true;
      }
    }
    return false;
  }

  /**
   * Normalize word: lowercase, strip punctuation
   * Matches Swift's lowercased().replacingOccurrences(of: "[^a-z0-9]")
   */
  _normalize(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  _updateWPM() {
    if (!this.startTime) return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed > 0) {
      const wpm = (this.wordsSpoken / elapsed) * 60;
      if (this.onWPMUpdate) this.onWPMUpdate(Math.round(wpm));
    }
  }

  _resetSilenceTimer() {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.onStatusChange) this.onStatusChange('silence');
    }, this.silenceThreshold);
  }

  pause() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  resume() {
    if (this.isListening) {
      try {
        this._createRecognition();
        this.recognition.start();
      } catch (e) {}
    }
  }

  stop() {
    this.isListening = false;
    clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    if (this.onStatusChange) this.onStatusChange('stopped');
  }
}
