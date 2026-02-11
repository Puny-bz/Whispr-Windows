// Markdown Parser — Port of MarkdownParser.swift (173 lines)
// Renders markdown to styled HTML spans for karaoke word highlighting

const MarkdownParser = {
  /**
   * Parse markdown text to HTML with styled spans
   * Supports: # H1, ## H2, **bold**, *italic*
   * Each word gets its own <span> for karaoke highlighting
   */
  parseToWordSpans(text, currentWordIndex) {
    if (!text) return '';
    const words = Utils.tokenize(text);
    const lines = text.split('\n');
    let html = '';
    let globalWordIdx = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        html += '<br>';
        continue;
      }

      // Detect headers
      let headerClass = '';
      let lineText = trimmed;
      if (trimmed.startsWith('### ')) {
        headerClass = 'md-h3';
        lineText = trimmed.substring(4);
      } else if (trimmed.startsWith('## ')) {
        headerClass = 'md-h2';
        lineText = trimmed.substring(3);
      } else if (trimmed.startsWith('# ')) {
        headerClass = 'md-h1';
        lineText = trimmed.substring(2);
      }

      const lineWords = lineText.split(/\s+/).filter(Boolean);

      if (headerClass) html += `<span class="${headerClass}">`;

      for (const word of lineWords) {
        // Detect inline formatting
        let displayWord = word;
        let inlineClass = '';

        if (/^\*\*(.+)\*\*$/.test(word)) {
          displayWord = word.replace(/^\*\*|\*\*$/g, '');
          inlineClass = 'md-bold';
        } else if (/^\*(.+)\*$/.test(word)) {
          displayWord = word.replace(/^\*|\*$/g, '');
          inlineClass = 'md-italic';
        }

        // Word state class
        let stateClass = 'word upcoming';
        if (globalWordIdx < currentWordIndex) stateClass = 'word spoken';
        else if (globalWordIdx === currentWordIndex) stateClass = 'word current';

        const classes = [stateClass, inlineClass].filter(Boolean).join(' ');
        html += `<span class="${classes}" data-index="${globalWordIdx}">${Utils.escapeHtml(displayWord)} </span>`;
        globalWordIdx++;
      }

      if (headerClass) html += '</span>';
      html += '<br>';
    }

    return html;
  },

  /**
   * Strip all markdown formatting — returns plain text
   * Matches Swift's stripMarkdown()
   */
  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1');
  },

  /**
   * Render plain word spans (no markdown, for topbar mode)
   */
  renderWordSpans(words, currentWordIndex, startIdx, endIdx) {
    let html = '';
    for (let i = startIdx; i < endIdx; i++) {
      let cls = 'word';
      if (i < currentWordIndex) cls += ' spoken';
      else if (i === currentWordIndex) cls += ' current';
      else cls += ' upcoming';
      html += `<span class="${cls}">${words[i].text} </span>`;
    }
    return html;
  },
};
