/**
 * HTML primitives. Every value that reaches a template goes through `esc()`
 * unless it was produced by our own renderers, which are trusted.
 */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}

/** Escape a value for use inside a double-quoted attribute. */
export function attr(value) {
  return esc(value);
}

/** Build an attribute map into a string. Falsy values are omitted entirely. */
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== false && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

/** Render a list of { label, href, external? } links. */
export function linkList(links, { className = 'link-list' } = {}) {
  if (!links?.length) return '';
  const items = links
    .map((l) => {
      const external = l.external ?? /^https?:\/\//.test(l.href);
      return `<li><a href="${attr(l.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(l.label)}${
        external ? '<span class="ext" aria-hidden="true">↗</span>' : ''
      }</a></li>`;
    })
    .join('');
  return `<ul class="${className}">${items}</ul>`;
}

/** Join a list of HTML fragments with a separator. */
export function join(items, separator = '\n') {
  return items.filter(Boolean).join(separator);
}

/** Format an ISO date as e.g. "18 September 2026". */
export function formatDate(iso, locale = 'en-GB') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Format an ISO date as e.g. "Sep 2026" for dense lists. */
export function formatMonth(iso, locale = 'en-GB') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

/** A number with thin thousands separators, or an em dash when zero/unset. */
export function num(value, { dash = '—' } = {}) {
  if (value === null || value === undefined || value === '') return dash;
  const n = Number(value);
  if (!Number.isFinite(n)) return esc(value);
  if (n === 0) return dash;
  return new Intl.NumberFormat('en-GB').format(n);
}

/** Turn a heading or label into a URL-safe slug. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A short excerpt from a long body, cut on a word boundary. */
export function excerpt(text, length = 180) {
  const clean = String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= length) return clean;
  const cut = clean.slice(0, length);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
