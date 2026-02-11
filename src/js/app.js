// Main Window Controller

const App = {
  scripts: [],
  selectedId: null,
  searchQuery: '',

  async init() {
    Editor.init();

    // Load settings to get theme
    try {
      const settings = await Utils.invoke('get_settings');
      if (settings) {
        ThemeManager.set(settings.appearance_mode);
        const picker = document.getElementById('mode-picker');
        if (picker) picker.value = settings.prompter_mode || 'floating';
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }

    await this.loadScripts();
    this.bindEvents();
    this.bindTauriEvents();
  },

  async loadScripts() {
    this.scripts = await ScriptManager.getAll();
    this.renderScriptList();
  },

  renderScriptList() {
    const list = document.getElementById('script-list');
    let filtered = this.scripts;

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = this.scripts.filter(
        s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      const msg = this.searchQuery ? 'No matches' : 'No scripts yet';
      list.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">${msg}</div>`;
      return;
    }

    list.innerHTML = filtered
      .map(s => {
        const words = Utils.wordCount(s.content);
        const date = Utils.formatDate(s.updated_at);
        const preview = Utils.stripMarkdown(s.content).substring(0, 60).trim();
        return `
      <div class="script-item ${s.id === this.selectedId ? 'active' : ''}" data-id="${s.id}">
        <div class="script-item-title">${Utils.escapeHtml(s.title)}</div>
        <div class="script-item-meta">${words} words &middot; ${date}</div>
        ${preview ? `<div class="script-item-preview">${Utils.escapeHtml(preview)}</div>` : ''}
      </div>`;
      })
      .join('');

    list.querySelectorAll('.script-item').forEach(el => {
      el.addEventListener('click', () => this.selectScript(el.dataset.id));
      el.addEventListener('contextmenu', (e) => this.showContextMenu(e, el.dataset.id));
    });
  },

  selectScript(id) {
    this.selectedId = id;
    const script = this.scripts.find(s => s.id === id);
    if (script) Editor.load(script);
    this.renderScriptList();
  },

  async createNewScript() {
    const script = await ScriptManager.create();
    if (script) {
      await this.loadScripts();
      this.selectScript(script.id);
      // Focus the title input
      setTimeout(() => document.getElementById('title-input')?.focus(), 50);
    }
  },

  async createFromTemplate(name) {
    const script = await ScriptManager.createFromTemplate(name);
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

  async duplicateScript(id) {
    const script = this.scripts.find(s => s.id === id);
    if (script) {
      const dup = await ScriptManager.create(`${script.title} (Copy)`, script.content);
      if (dup) {
        await this.loadScripts();
        this.selectScript(dup.id);
      }
    }
  },

  showContextMenu(event, id) {
    event.preventDefault();
    const menu = document.getElementById('context-menu');
    menu.style.display = 'block';
    menu.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(event.clientY, window.innerHeight - 120)}px`;
    menu.dataset.targetId = id;
  },

  hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
  },

  async startPrompter(modeOverride) {
    if (!Editor.currentScriptId) return;
    await Editor.save();

    try {
      const mode = modeOverride || document.getElementById('mode-picker')?.value
        || (await Utils.invoke('get_settings'))?.prompter_mode || 'floating';

      if (mode === 'notch') {
        await Utils.invoke('open_topbar_prompter', { scriptId: Editor.currentScriptId });
      } else {
        await Utils.invoke('open_floating_prompter', { scriptId: Editor.currentScriptId });
      }
    } catch (e) {
      console.error('Failed to start prompter:', e);
    }
  },

  async importFile() {
    try {
      if (window.__TAURI__) {
        const result = await window.__TAURI__.dialog.open({
          multiple: false,
          filters: [
            { name: 'Text Files', extensions: ['txt', 'md', 'text', 'rtf', 'srt', 'vtt', 'csv'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (result) {
          const text = await Utils.invoke('read_file_content', { path: result });
          if (text && text.trim()) {
            // Derive title from filename
            const parts = result.replace(/\\/g, '/').split('/');
            const filename = parts[parts.length - 1].replace(/\.[^.]+$/, '');
            const title = filename || 'Imported Script';
            const script = await ScriptManager.create(title, text.trim());
            if (script) {
              await this.loadScripts();
              this.selectScript(script.id);
            }
          }
        }
      }
    } catch (e) {
      // Try clipboard fallback
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const script = await ScriptManager.create('Pasted Script', text.trim());
          if (script) {
            await this.loadScripts();
            this.selectScript(script.id);
          }
        }
      } catch (e2) {
        console.warn('Import failed:', e2);
      }
    }
  },

  showTemplateMenu(event) {
    const menu = document.getElementById('template-menu');
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
  },

  hideTemplateMenu() {
    document.getElementById('template-menu').style.display = 'none';
  },

  bindEvents() {
    // New script
    document.getElementById('btn-new-script').addEventListener('click', () => this.createNewScript());
    document.getElementById('btn-empty-new').addEventListener('click', () => this.createNewScript());

    // Import
    document.getElementById('btn-import').addEventListener('click', () => this.importFile());

    // Templates
    document.getElementById('btn-templates').addEventListener('click', (e) => this.showTemplateMenu(e));
    document.getElementById('template-menu').addEventListener('click', (e) => {
      const name = e.target.dataset.template;
      if (name) {
        this.createFromTemplate(name);
        this.hideTemplateMenu();
      }
    });

    // Delete
    document.getElementById('btn-delete').addEventListener('click', () => {
      if (this.selectedId && confirm('Delete this script?')) {
        this.deleteScript(this.selectedId);
      }
    });

    // Start prompter
    document.getElementById('btn-start-prompter').addEventListener('click', () => this.startPrompter());

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => {
      Utils.invoke('open_settings_window');
    });

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderScriptList();
    });

    // Context menu actions
    document.getElementById('context-menu').addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      const id = document.getElementById('context-menu').dataset.targetId;
      if (!action || !id) return;
      this.hideContextMenu();

      if (action === 'delete') {
        if (confirm('Delete this script?')) this.deleteScript(id);
      } else if (action === 'duplicate') {
        this.duplicateScript(id);
      } else if (action === 'export') {
        const script = this.scripts.find(s => s.id === id);
        if (script) {
          try {
            await navigator.clipboard.writeText(script.content);
          } catch (e) {
            console.warn('Export to clipboard failed');
          }
        }
      }
    });

    // Close menus on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu') && !e.target.closest('[data-action]')) {
        this.hideContextMenu();
      }
      if (!e.target.closest('#template-menu') && !e.target.closest('#btn-templates')) {
        this.hideTemplateMenu();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.createNewScript();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (e.key === 'Escape') {
        this.hideContextMenu();
        this.hideTemplateMenu();
      }
    });
  },

  bindTauriEvents() {
    // From tray
    Utils.listen('new-script', () => this.createNewScript());
    Utils.listen('open-script', (event) => {
      const id = event.payload;
      if (id) this.selectScript(id);
    });

    // Global shortcut: toggle prompter
    Utils.listen('global-toggle-prompter', () => {
      if (this.selectedId) this.startPrompter();
    });

    // Settings changed — refresh theme
    Utils.listen('settings-changed', async () => {
      try {
        const settings = await Utils.invoke('get_settings');
        if (settings) ThemeManager.set(settings.appearance_mode);
      } catch (e) {}
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
