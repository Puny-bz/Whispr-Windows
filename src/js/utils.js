// Whispr Utility Functions

const Utils = {
  /**
   * Count words in text
   */
  wordCount(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  },

  /**
   * Estimated read time at 150 WPM
   */
  readTime(text) {
    const words = this.wordCount(text);
    const minutes = words / 150;
    if (minutes < 1) return 'under 1 min';
    return `~${Math.round(minutes)} min`;
  },

  /**
   * Format seconds as M:SS
   */
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  /**
   * Simple markdown to HTML (bold, italic, headers)
   */
  markdownToHtml(text) {
    if (!text) return '';
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  },

  /**
   * Split text into words preserving whitespace info
   */
  tokenize(text) {
    if (!text) return [];
    const words = [];
    const regex = /(\S+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push({
        text: match[1],
        index: match.index,
        lower: match[1].toLowerCase().replace(/[^\w]/g, ''),
      });
    }
    return words;
  },

  /**
   * Split text into sentences (for jump navigation)
   */
  splitSentences(text) {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  },

  /**
   * Debounce function calls
   */
  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  /**
   * Map font family name to CSS
   */
  fontFamilyCSS(name) {
    switch (name) {
      case 'Serif': return 'var(--font-serif)';
      case 'Monospace': return 'var(--font-mono)';
      case 'Rounded': return 'var(--font-rounded)';
      default: return 'var(--font-system)';
    }
  },

  /**
   * Invoke a Tauri command
   */
  async invoke(cmd, args = {}) {
    if (window.__TAURI__) {
      return window.__TAURI__.core.invoke(cmd, args);
    }
    console.warn(`Tauri not available, cannot invoke: ${cmd}`);
    return null;
  },
};
