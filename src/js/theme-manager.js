// Theme Manager — switches CSS theme on root element

const ThemeManager = {
  current: 'dark',

  init(theme) {
    this.set(theme || 'dark');
  },

  set(theme) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
    return this.current;
  },
};
