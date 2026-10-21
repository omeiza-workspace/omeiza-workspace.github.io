/**
 * The HTML shell. Every page is wrapped in `layout()`.
 */

import { esc, attr, join } from './html.mjs';

const NAV_ICONS = {
  '/': 'M3 12l9-8 9 8M5 10v10h14V10',
  '/products/': 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10',
  '/blog/': 'M4 5h16M4 10h16M4 15h10M4 20h7',
  '/evidence/': 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z M9 12l2 2 4-4',
};

function icon(pathData) {
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${pathData}"/></svg>`;
}

function navItem(item, active) {
  const isActive = active === item.href || (item.href !== '/' && active?.startsWith(item.href));
  const iconMarkup = NAV_ICONS[item.href] ? icon(NAV_ICONS[item.href]) : '';
  return `<li><a href="${attr(item.href)}"${isActive ? ' aria-current="page" class="is-active"' : ''}>${iconMarkup}<span>${esc(item.label)}</span></a></li>`;
}

/**
 * @param {object} options
 * @param {string} options.title       document title (without site suffix)
 * @param {string} options.description meta description
 * @param {string} options.path        site-relative path, e.g. "/blog/"
 * @param {string} options.body        page HTML
 * @param {object} options.site        site.json
 * @param {string} [options.active]     active nav href
 * @param {object} [options.schema]     JSON-LD object
 * @param {string[]} [options.scripts]  extra script srcs
 * @param {boolean} [options.noindex]
 */
export function layout({
  title,
  description,
  path: pagePath,
  body,
  site,
  active,
  schema,
  scripts = [],
  noindex = false,
  ogType = 'website',
}) {
  const fullTitle = pagePath === '/' ? site.seo.defaultDescription : `${title} — ${site.name}`;
  const url = new URL(pagePath, site.url).toString();
  const ogImage = new URL(site.seo.ogImage, site.url).toString();

  const schemaBlock = schema
    ? `<script type="application/ld+json">${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}</script>`
    : '';

  const head = join([
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${attr(description)}" />`,
    `<meta name="keywords" content="${attr(site.seo.keywords.join(', '))}" />`,
    `<meta name="author" content="${attr(site.name)}" />`,
    noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${attr(url)}" />`,
    `<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml" />`,
    '<link rel="alternate" type="application/rss+xml" title="Omeiza Okuta — Build in Public" href="/feed.xml" />',
    '<meta name="theme-color" content="' + attr(site.themeColor) + '" />',
    // Open Graph
    `<meta property="og:type" content="${attr(ogType)}" />`,
    `<meta property="og:title" content="${attr(pagePath === '/' ? site.name : title)}" />`,
    `<meta property="og:description" content="${attr(description)}" />`,
    `<meta property="og:url" content="${attr(url)}" />`,
    `<meta property="og:image" content="${attr(ogImage)}" />`,
    `<meta property="og:site_name" content="${attr(site.name)}" />`,
    // Twitter
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="${attr(site.seo.twitter)}" />`,
    `<meta name="twitter:title" content="${attr(pagePath === '/' ? site.name : title)}" />`,
    `<meta name="twitter:description" content="${attr(description)}" />`,
    `<meta name="twitter:image" content="${attr(ogImage)}" />`,
    schemaBlock,
    // Theme bootstrap: applied before first paint to avoid a flash of the wrong theme.
    `<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}</script>`,
  ]);

  const nav = `<nav class="site-nav" aria-label="Primary"><div class="nav-inner"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">${esc(
    site.name
      .split(' ')
      .map((w) => w[0])
      .join(''),
  )}</span><span class="brand-text">${esc(site.name)}</span></a><ul class="nav-links">${site.nav
    .map((item) => navItem(item, active))
    .join('')}</ul><div class="nav-actions"><button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle colour theme"><span class="theme-toggle-icon" aria-hidden="true"></span></button><a class="nav-cta" href="${attr(
    site.footer.columns.find((c) => c.title === 'Code')?.links?.[0]?.href ?? '#',
  )}" target="_blank" rel="noopener noreferrer">GitHub<span class="ext" aria-hidden="true">↗</span></a></div></div></nav>`;

  const footer = `<footer class="site-footer"><div class="footer-inner"><div class="footer-top"><div class="footer-brand"><p class="footer-blurb">${esc(
    site.footer.blurb,
  )}</p><p class="footer-note">${esc(site.footer.note)}</p></div><div class="footer-columns">${site.footer.columns
    .map(
      (col) => `<div class="footer-col"><h2>${esc(col.title)}</h2><ul>${col.links
        .map(
          (l) =>
            `<li><a href="${attr(l.href)}"${
              l.external ?? /^https?:\/\//.test(l.href)
                ? ' target="_blank" rel="noopener noreferrer"'
                : ''
            }>${esc(l.label)}${
              l.external ?? /^https?:\/\//.test(l.href) ? '<span class="ext" aria-hidden="true">↗</span>' : ''
            }</a></li>`,
        )
        .join('')}</ul></div>`,
    )
    .join('')}</div></div><div class="footer-bottom"><p>${esc(site.footer.legal)}</p><p><a href="/feed.xml">RSS</a> · <a href="/sitemap.xml">Sitemap</a> · <a href="/media-kit/">Media kit</a></p></div></div></footer>`;

  const scriptTags = join([
    '<script src="/assets/app.js" defer></script>',
    ...scripts.map((s) => `<script src="${attr(s)}" defer></script>`),
  ]);

  return `<!doctype html>
<html lang="${attr(site.lang)}">
<head>
${head}
<link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${nav}
<main id="main">
${body}
</main>
${footer}
${scriptTags}
</body>
</html>
`;
}
