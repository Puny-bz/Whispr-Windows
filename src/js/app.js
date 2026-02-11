// Main Window Controller

const App = {
  scripts: [],
  selectedId: null,

  async init() {
    Editor.init();
    ThemeManager.init('dark');

    // Load settings to get theme
    try {
      const settings = await Utils.invoke('get_settings');
      if (settings) {
        ThemeManager.set(settings.appearance_mode);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }

    await this.loadScripts();
    this.bindEvents();
  },

  async loadScripts() {
    this.scripts = await ScriptManager.getAll();
    this.renderScriptList();
  },

  renderScriptList() {
    const list = document.getElementById('script-list');
    if (this.scripts.length === 0) {
      list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">No scripts yet</div>';
      return;
    }

    list.innerHTML = this.scripts.map(s => `
      <div class="script-item ${s.id === this.selectedId ? 'active' : ''}"
           data-id="${s.id}"
           oncontextmenu="App.showContextMenu(event, '${s.id}')">
        <div class="script-item-title">${this.escapeHtml(s.title)}</div>
        <div class="script-item-meta">${Utils.wordCount(s.content)} words</div>
      </div>
    `).join('');

    // Click handlers
    list.querySelectorAll('.script-item').forEach(el => {
      el.addEventListener('click', () => this.selectScript(el.dataset.id));
    });
  },

  selectScript(id) {
    this.selectedId = id;
    const script = this.scripts.find(s => s.id === id);
    if (script) {
      Editor.load(script);
    }
    this.renderScriptList();
  },

  async createNewScript() {
    const script = await ScriptManager.create();
    if (script) {
      await this.loadScripts();
      this.selectScript(script.id);
    }
  },

  async deleteScript(id) {
    await ScriptManager.delete(id);
    if (this.selectedId === id) {
      Editor.clear();
      this.selectedId = null;
    }
    await this.loadScripts();
  },

  showContextMenu(event, id) {
    event.preventDefault();
    const menu = document.getElementById('context-menu');
    menu.style.display = 'block';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.dataset.targetId = id;
  },

  hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
  },

  async startPrompter() {
    if (!Editor.currentScriptId) return;
    await Editor.save();

    try {
      const settings = await Utils.invoke('get_settings');
      const mode = settings ? settings.prompter_mode : 'floating';

      if (mode === 'notch') {
        await Utils.invoke('open_topbar_prompter');
      } else {
        await Utils.invoke('open_floating_prompter');
      }
    } catch (e) {
      console.error('Failed to start prompter:', e);
    }
  },

  bindEvents() {
    // New script buttons
    document.getElementById('btn-new-script').addEventListener('click', () => this.createNewScript());
    document.getElementById('btn-empty-new').addEventListener('click', () => this.createNewScript());

    // Delete button
    document.getElementById('btn-delete').addEventListener('click', () => {
      if (this.selectedId) this.deleteScript(this.selectedId);
    });

    // Start prompter
    document.getElementById('btn-start-prompter').addEventListener('click', () => this.startPrompter());

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => {
      Utils.invoke('open_settings_window');
    });

    // Import file
    document.getElementById('btn-import').addEventListener('click', () => this.importFile());

    // Context menu actions
    document.getElementById('context-menu').addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      const id = document.getElementById('context-menu').dataset.targetId;
      if (!action || !id) return;

      this.hideContextMenu();

      if (action === 'delete') {
        this.deleteScript(id);
      } else if (action === 'duplicate') {
        const script = this.scripts.find(s => s.id === id);
        if (script) {
          const dup = await ScriptManager.create(`${script.title} (Copy)`, script.content);
          if (dup) {
            await this.loadScripts();
            this.selectScript(dup.id);
          }
        }
      }
    });

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Listen for new-script event from tray
    if (window.__TAURI__) {
      window.__TAURI__.event.listen('new-script', () => this.createNewScript());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.createNewScript();
      }
    });
  },

  async importFile() {
    // Use clipboard as fallback import method
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const script = await ScriptManager.create('Imported Script', text.trim());
        if (script) {
          await this.loadScripts();
          this.selectScript(script.id);
        }
      }
    } catch (e) {
      console.warn('Clipboard import failed:', e);
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
