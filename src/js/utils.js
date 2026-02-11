// Whispr Utility Functions

const Utils = {
  wordCount(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  },

  charCount(text) {
    return text ? text.length : 0;
  },

  readTime(text) {
    const words = this.wordCount(text);
    const minutes = words / 150;
    if (minutes < 1) return 'under 1 min';
    return `~${Math.round(minutes)} min`;
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  formatDate(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  },

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

  splitSentences(text) {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  },

  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  fontFamilyCSS(name) {
    switch (name) {
      case 'Serif': return 'var(--font-serif)';
      case 'Monospace': return 'var(--font-mono)';
      case 'Rounded': return 'var(--font-rounded)';
      default: return 'var(--font-system)';
    }
  },

  async invoke(cmd, args = {}) {
    if (window.__TAURI__) {
      return window.__TAURI__.core.invoke(cmd, args);
    }
    console.warn(`Tauri not available, cannot invoke: ${cmd}`);
    return null;
  },

  async listen(event, handler) {
    if (window.__TAURI__) {
      return window.__TAURI__.event.listen(event, handler);
    }
    return null;
  },

  async emit(event, payload) {
    if (window.__TAURI__) {
      return window.__TAURI__.event.emit(event, payload);
    }
  },

  async emitTo(target, event, payload) {
    if (window.__TAURI__) {
      return window.__TAURI__.event.emitTo(target, event, payload);
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1');
  },
};
