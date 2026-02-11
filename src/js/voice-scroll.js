// Voice Scroll — Web Speech API with forward-only word matching
// Port of VoiceScrollEngine.swift algorithm

class VoiceScroll {
  constructor(engine) {
    this.engine = engine;
    this.recognition = null;
    this.isListening = false;
    this.lastMatchedIndex = -1;
    this.silenceTimer = null;
    this.silenceThreshold = 1500; // 1.5s silence detection
  }

  /**
   * Start listening for speech
   */
  start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      this._resetSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        const spokenWords = transcript.split(/\s+/);

        for (const spoken of spokenWords) {
          this._matchForward(spoken);
        }
      }
    };

    this.recognition.onend = () => {
      // Auto-restart on timeout
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        // Expected, will auto-restart
      } else {
        console.warn('Speech recognition error:', event.error);
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
      this._resetSilenceTimer();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      return false;
    }
  }

  /**
   * Forward-only word matching — finds next matching word after lastMatchedIndex
   */
  _matchForward(spoken) {
    const cleanSpoken = spoken.replace(/[^\w]/g, '').toLowerCase();
    if (!cleanSpoken) return;

    const words = this.engine.words;
    // Search forward only, within a window of 10 words ahead
    const searchStart = this.lastMatchedIndex + 1;
    const searchEnd = Math.min(words.length, searchStart + 10);

    for (let i = searchStart; i < searchEnd; i++) {
      if (words[i].lower === cleanSpoken) {
        this.lastMatchedIndex = i;
        this.engine.advanceToWord(i);
        break;
      }
    }
  }

  _resetSilenceTimer() {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      // Silence detected — could pause or just continue waiting
    }, this.silenceThreshold);
  }

  /**
   * Stop listening
   */
  stop() {
    this.isListening = false;
    clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Already stopped
      }
      this.recognition = null;
    }
  }
}
