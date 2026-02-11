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
   * Create from template — matches Swift's ScriptTemplate enum exactly
   */
  async createFromTemplate(name) {
    const templates = {
      'YouTube Intro': `# YouTube Intro

Hey everyone, welcome back to the channel!

In today's video, we're going to be talking about **something really exciting**.

Before we get started, make sure to *like* and *subscribe* — it really helps out the channel.

Let's dive right in.

...

And that's it for today! If you enjoyed this video, drop a comment below and let me know what you want to see next.

See you in the next one!`,

      'Product Demo': `# Product Demo

Welcome everyone, thank you for joining us today.

I'm excited to show you **our latest product** and how it can help you.

## Key Features

First, let me walk you through the *main features*.

Feature one...

Feature two...

Feature three...

## How It Works

Let me show you a quick demo.

...

## Wrap Up

That's everything for today. If you have any questions, feel free to reach out.

Thank you!`,

      'Presentation Opener': `# Presentation

Good morning everyone. Thank you for being here.

Today I want to talk about **an important topic** that affects all of us.

## The Problem

Let me start by describing the challenge we're facing.

...

## The Solution

Here's what we propose.

...

## Next Steps

So what can we do about it?

...

## Conclusion

In summary, the key takeaways are:

One...

Two...

Three...

Thank you for your attention. I'm happy to take questions.`,

      'Pitch Deck': `# Pitch Deck

Good afternoon. My name is **[Name]** and I'm the founder of **[Company]**.

## The Problem

Every day, millions of people struggle with...

## Our Solution

We've built a platform that...

## Market Size

The total addressable market is...

## Traction

Since our launch, we've achieved...

## Business Model

We generate revenue through...

## The Team

Our team brings together experience from...

## The Ask

We're raising **$[Amount]** to...

Thank you. I'm happy to answer any questions.`,

      'Blank': '',
    };

    const content = templates[name] || '';
    const title = name === 'Blank' ? 'Untitled Script' : name;
    return this.create(title, content);
  },

  /**
   * Get template names (for UI menu)
   */
  getTemplateNames() {
    return ['YouTube Intro', 'Product Demo', 'Presentation Opener', 'Pitch Deck', 'Blank'];
  },
};
