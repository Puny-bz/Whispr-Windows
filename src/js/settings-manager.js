// Settings Manager — UI bindings for settings.html

const SettingsManager = {
  settings: null,

  async init() {
    this.settings = await Utils.invoke('get_settings');
    if (!this.settings) return;

    this.applyToUI();
    this.bindEvents();
  },

  applyToUI() {
    const s = this.settings;

    // General tab
    document.getElementById('daynight-toggle').dataset.mode = s.appearance_mode;
    document.getElementById('setting-prompter-mode').value = s.prompter_mode;
    document.getElementById('setting-countdown').value = s.countdown_seconds;
    document.getElementById('setting-end-action').value = s.end_action;
    document.getElementById('setting-min-wpm').value = s.target_min_wpm;
    document.getElementById('setting-max-wpm').value = s.target_max_wpm;

    // Top bar tab
    this._setSlider('setting-notch-font-size', s.notch_font_size, 'val-notch-font-size', 'pt');
    this._setSlider('setting-notch-scroll-speed', s.notch_scroll_speed, 'val-notch-scroll-speed', '');
    this._setSlider('setting-notch-width', s.notch_width_percent, 'val-notch-width', '%');
    this._setSlider('setting-notch-height', s.notch_height, 'val-notch-height', 'pt');
    this._setSlider('setting-notch-opacity', s.notch_opacity * 100, 'val-notch-opacity', '%');
    document.getElementById('setting-notch-font-family').value = s.notch_font_family;
    document.getElementById('setting-notch-line-count').value = s.notch_line_count;
    document.getElementById('setting-notch-show-timer').checked = s.notch_show_timer;

    // Glow cards
    document.querySelectorAll('[data-glow]').forEach(card => {
      card.classList.toggle('selected', card.dataset.glow === s.notch_glow_style);
    });

    // Floating tab
    this._setSlider('setting-float-font-size', s.floating_font_size, 'val-float-font-size', 'pt');
    this._setSlider('setting-float-scroll-speed', s.floating_scroll_speed, 'val-float-scroll-speed', '');
    document.getElementById('setting-float-font-family').value = s.floating_font_family;
    document.getElementById('setting-mirror-mode').checked = s.mirror_mode;

    // Theme cards
    document.querySelectorAll('[data-floating-theme]').forEach(card => {
      card.classList.toggle('selected', card.dataset.floatingTheme === s.floating_theme);
    });

    // Apply theme
    document.documentElement.setAttribute('data-theme', s.appearance_mode);
  },

  _setSlider(sliderId, value, labelId, suffix) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (slider) slider.value = value;
    if (label) label.textContent = `${Math.round(value)}${suffix}`;
  },

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
      });
    });

    // Day/night toggle
    document.getElementById('daynight-toggle').addEventListener('click', () => {
      const toggle = document.getElementById('daynight-toggle');
      const mode = toggle.dataset.mode === 'dark' ? 'light' : 'dark';
      toggle.dataset.mode = mode;
      document.documentElement.setAttribute('data-theme', mode);
      this._update('appearance_mode', mode);
    });

    // Selects
    this._bindSelect('setting-prompter-mode', 'prompter_mode');
    this._bindSelect('setting-countdown', 'countdown_seconds');
    this._bindSelect('setting-end-action', 'end_action');
    this._bindSelect('setting-notch-font-family', 'notch_font_family');
    this._bindSelect('setting-notch-line-count', 'notch_line_count');
    this._bindSelect('setting-float-font-family', 'floating_font_family');

    // Sliders
    this._bindSlider('setting-notch-font-size', 'notch_font_size', 'val-notch-font-size', 'pt');
    this._bindSlider('setting-notch-scroll-speed', 'notch_scroll_speed', 'val-notch-scroll-speed', '');
    this._bindSlider('setting-notch-width', 'notch_width_percent', 'val-notch-width', '%');
    this._bindSlider('setting-notch-height', 'notch_height', 'val-notch-height', 'pt');
    this._bindSlider('setting-notch-opacity', 'notch_opacity', 'val-notch-opacity', '%', v => (v / 100).toString());
    this._bindSlider('setting-float-font-size', 'floating_font_size', 'val-float-font-size', 'pt');
    this._bindSlider('setting-float-scroll-speed', 'floating_scroll_speed', 'val-float-scroll-speed', '');

    // Toggles
    this._bindToggle('setting-notch-show-timer', 'notch_show_timer');
    this._bindToggle('setting-mirror-mode', 'mirror_mode');

    // Number inputs
    const debouncedMinWPM = Utils.debounce((v) => this._update('target_min_wpm', v), 500);
    const debouncedMaxWPM = Utils.debounce((v) => this._update('target_max_wpm', v), 500);
    document.getElementById('setting-min-wpm').addEventListener('input', (e) => debouncedMinWPM(e.target.value));
    document.getElementById('setting-max-wpm').addEventListener('input', (e) => debouncedMaxWPM(e.target.value));

    // Glow cards
    document.querySelectorAll('[data-glow]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-glow]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._update('notch_glow_style', card.dataset.glow);
      });
    });

    // Theme cards
    document.querySelectorAll('[data-floating-theme]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-floating-theme]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._update('floating_theme', card.dataset.floatingTheme);
      });
    });
  },

  _bindSelect(id, key) {
    document.getElementById(id).addEventListener('change', (e) => {
      this._update(key, e.target.value);
    });
  },

  _bindSlider(sliderId, key, labelId, suffix, transform) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}${suffix}`;
    });
    slider.addEventListener('change', () => {
      const value = transform ? transform(slider.value) : slider.value;
      this._update(key, value);
    });
  },

  _bindToggle(id, key) {
    document.getElementById(id).addEventListener('change', (e) => {
      this._update(key, e.target.checked.toString());
    });
  },

  async _update(key, value) {
    const updated = await Utils.invoke('update_setting', { key, value: value.toString() });
    if (updated) {
      this.settings = updated;
      Utils.emit('settings-changed', updated);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => SettingsManager.init());
