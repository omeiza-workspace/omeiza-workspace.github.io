/**
 * A small, dependency-free Markdown renderer.
 *
 * Supports the subset this site actually uses:
 *   ATX headings, paragraphs, unordered + ordered lists, fenced code blocks,
 *   blockquotes, horizontal rules, GFM tables, and inline formatting
 *   (bold, italic, inline code, links, autolinks).
 *
 * Output is HTML-escaped before any markup is applied, so a post body can
 * never inject markup into the page.
 */

import { esc } from './html.mjs';

const INLINE_RULES = [
  // inline code first — its contents must not be reinterpreted
  { re: /`([^`]+)`/g, to: (_m, code) => `<code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>` },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/g,
    to: (_m, label, href) => {
      const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : '#';
      const external = /^https?:\/\//.test(safe);
      return `<a href="${esc(safe)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    },
  },
  { re: /\*\*([^*]+)\*\*/g, to: (_m, t) => `<strong>${t}</strong>` },
  { re: /(?<!\*)\*([^*\n]+)\*(?!\*)/g, to: (_m, t) => `<em>${t}</em>` },
  { re: /_([^_\n]+)_/g, to: (_m, t) => `<em>${t}</em>` },
  { re: /~~([^~]+)~~/g, to: (_m, t) => `<del>${t}</del>` },
];

function inline(text) {
  let out = esc(text);
  for (const { re, to } of INLINE_RULES) out = out.replace(re, to);
  // bare URLs that were not already linked
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) => {
    return `${pre}<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  return out;
}

function slugFor(text) {
  return String(text)
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderTable(rows) {
  const cells = (line) =>
    line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());

  const header = cells(rows[0]);
  const aligns = cells(rows[1]).map((c) => {
    if (/^:-+:$/.test(c)) return 'center';
    if (/^-+:$/.test(c)) return 'right';
    return 'left';
  });
  const body = rows.slice(2).map(cells);

  const th = header
    .map((c, i) => `<th style="text-align:${aligns[i] ?? 'left'}">${inline(c)}</th>`)
    .join('');
  const tr = body
    .map(
      (row) =>
        `<tr>${row.map((c, i) => `<td style="text-align:${aligns[i] ?? 'left'}">${inline(c)}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

/**
 * Renders inline Markdown only — bold, italic, inline code and links — with
 * no block-level wrapping. Use this for short fields that carry inline
 * markup, so a backtick or a `**bold**` never reaches the page literally.
 *
 * @param {string} text
 * @returns {string} HTML fragment
 */
export function inlineMarkdown(text) {
  if (!text) return '';
  return inline(String(text));
}

/**
 * @param {string} source
 * @returns {string} rendered HTML
 */
export function markdown(source) {
  if (!source) return '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushParagraph = (buffer) => {
    if (buffer.length) out.push(`<p>${inline(buffer.join(' '))}</p>`);
    buffer.length = 0;
  };

  const para = [];

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushParagraph(para);
      const lang = fence[1] || '';
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      const cls = lang ? ` class="language-${esc(lang)}"` : '';
      out.push(`<pre class="code-block"${cls}><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // blank line
    if (!line.trim()) {
      flushParagraph(para);
      i += 1;
      continue;
    }

    // horizontal rule
    if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(line.trim())) {
      flushParagraph(para);
      out.push('<hr />');
      i += 1;
      continue;
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(para);
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugFor(text);
      out.push(`<h${level} id="${esc(id)}">${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${markdown(body.join('\n'))}</blockquote>`);
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      flushParagraph(para);
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(lines[i].trim());
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    // unordered list
    if (/^[-*+]\s+/.test(line)) {
      flushParagraph(para);
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph(para);
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ''));
        i += 1;
      }
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
      continue;
    }

    para.push(line.trim());
    i += 1;
  }

  flushParagraph(para);
  return out.join('\n');
}
