// Script Editor — title input, textarea, stats, auto-save

const Editor = {
  currentScriptId: null,
  saveTimer: null,

  init() {
    this.titleInput = document.getElementById('title-input');
    this.textarea = document.getElementById('editor-textarea');
    this.wordCountEl = document.getElementById('word-count');
    this.charCountEl = document.getElementById('char-count');
    this.readTimeEl = document.getElementById('read-time');
    this.editorView = document.getElementById('editor-view');
    this.emptyState = document.getElementById('empty-state');

    // Auto-save on typing
    const debouncedSave = Utils.debounce(() => this.save(), 800);
    this.titleInput.addEventListener('input', debouncedSave);
    this.textarea.addEventListener('input', () => {
      this.updateStats();
      debouncedSave();
    });
  },

  load(script) {
    this.currentScriptId = script.id;
    this.titleInput.value = script.title;
    this.textarea.value = script.content;
    this.updateStats();
    this.showEditor();
  },

  clear() {
    this.currentScriptId = null;
    this.titleInput.value = '';
    this.textarea.value = '';
    this.updateStats();
    this.showEmpty();
  },

  showEditor() {
    this.emptyState.style.display = 'none';
    this.editorView.style.display = 'flex';
  },

  showEmpty() {
    this.emptyState.style.display = 'flex';
    this.editorView.style.display = 'none';
  },

  updateStats() {
    const text = this.textarea.value;
    const words = Utils.wordCount(text);
    this.wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    this.charCountEl.textContent = `${text.length} chars`;
    this.readTimeEl.textContent = Utils.readTime(text);
  },

  async save() {
    if (!this.currentScriptId) return;
    await ScriptManager.update(
      this.currentScriptId,
      this.titleInput.value || 'Untitled Script',
      this.textarea.value
    );
  },

  getContent() {
    return this.textarea.value;
  },

  getTitle() {
    return this.titleInput.value;
  },
};
