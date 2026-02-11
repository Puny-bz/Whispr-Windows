// Script CRUD via Tauri commands

const ScriptManager = {
  async getAll() {
    const scripts = await Utils.invoke('get_all_scripts');
    return scripts || [];
  },

  async create(title = 'Untitled Script', content = '') {
    return Utils.invoke('create_script', { title, content });
  },

  async update(id, title, content) {
    return Utils.invoke('update_script', { id, title, content });
  },

  async delete(id) {
    return Utils.invoke('delete_script', { id });
  },

  async getRecent(limit = 5) {
    const scripts = await Utils.invoke('get_recent_scripts', { limit });
    return scripts || [];
  },

  async updatePracticeStats(id, wpm, duration) {
    return Utils.invoke('update_practice_stats', { id, wpm, duration });
  },

  /**
   * Create from template
   */
  async createFromTemplate(name) {
    const templates = {
      'Keynote': 'Welcome everyone.\n\nToday I want to talk about...\n\nFirst, let me start with...\n\nSecond...\n\nIn conclusion...\n\nThank you.',
      'YouTube Video': 'Hey everyone, welcome back to the channel!\n\nIn today\'s video, we\'re going to...\n\nBefore we get started, make sure to like and subscribe.\n\nLet\'s dive in.\n\n...\n\nThat\'s all for today. See you in the next one!',
      'News Broadcast': 'Good evening. I\'m [Name] and this is [Show].\n\nTonight\'s top story...\n\nIn other news...\n\nWeather update...\n\nThat\'s all for tonight. Good night.',
      'Podcast': 'Welcome to [Podcast Name], episode [#].\n\nI\'m your host [Name] and today we\'re discussing...\n\nSegment 1...\n\nSegment 2...\n\nBefore we wrap up...\n\nThanks for listening. Until next time!',
    };

    const content = templates[name] || '';
    return this.create(name, content);
  },
};
