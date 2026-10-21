/**
 * Static site builder.
 *
 *   content/*.json  ->  dist/**\*.html
 *
 * No framework, no bundler, no runtime dependencies. The JSON content layer
 * is the only source of truth; this script only decides how it is laid out.
 *
 *   node src/build.mjs          build to dist/
 *   node src/build.mjs --watch  rebuild on change
 *   node src/build.mjs --serve  build and serve on :4321
 */

import { mkdir, rm, writeFile, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadContent, ROOT, ASSETS_DIR } from './lib/data.mjs';
import { layout } from './lib/layout.mjs';
import { esc, attr, formatDate, join } from './lib/html.mjs';
import {
  renderLanding,
  renderProducts,
  renderProjectFilter,
  renderCaseStudy,
  renderBlogIndex,
  renderPostList,
  renderPost,
  renderEvidence,
  renderMetrics,
  renderMediaKit,
  renderArchive,
  renderArchivePost,
  renderHowIHelp,
  renderGlossary,
  renderWhy,
  renderRecord,
  renderNotFound,
} from './lib/pages.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const casePath = (cs) => `/products/${cs.id}/`;
const slugifyTag = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');

async function write(relPath, contents) {
  const full = path.join(DIST, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents, 'utf8');
  return full;
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await copyFile(src, dest);
  }
}

/** Collect the URLs that should appear in the sitemap. */
function sitemapUrls() {
  return [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/products/', priority: '0.9', changefreq: 'monthly' },
    { loc: '/products/ci-kit/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/products/api-mock-services/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog/', priority: '0.9', changefreq: 'weekly' },
    { loc: '/archive/', priority: '0.6', changefreq: 'monthly' },
    { loc: '/evidence/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/why/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/how-i-help/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/glossary/', priority: '0.5', changefreq: 'monthly' },
    { loc: '/record/', priority: '0.7', changefreq: 'monthly' },
    { loc: '/media-kit/', priority: '0.6', changefreq: 'monthly' },
    { loc: '/products/automation-gateway/', priority: '0.8', changefreq: 'monthly' },
  ];
}

function renderSitemap(site, extra = []) {
  const entries = [...sitemapUrls(), ...extra];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${esc(new URL(e.loc, site.url).toString())}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
}

function renderFeed(site, posts) {
  const items = posts
    .map((p) => {
      const url = new URL(`/blog/${p.slug}/`, site.url).toString();
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.dek)}</description>
      <content:encoded><![CDATA[${p.body.replace(/]]>/g, ']]&gt;')}]]></content:encoded>
      ${p.tags.map((t) => `<category>${esc(t)}</category>`).join('\n      ')}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(site.name)} — Build in Public</title>
    <link>${esc(new URL('/blog/', site.url).toString())}</link>
    <atom:link href="${esc(new URL('/feed.xml', site.url).toString())}" rel="self" type="application/rss+xml" />
    <description>${esc(site.seo.defaultDescription)}</description>
    <language>en-gb</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>${esc(site.footer.columns.length ? 'okuta.omeiza@gmail.com' : '')}</managingEditor>
${items}
  </channel>
</rss>
`;
}

const ROBOTS = `User-agent: *
Allow: /

Sitemap: https://omeiza-workspace.github.io/sitemap.xml
`;

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

export async function build() {
  const started = Date.now();
  const content = await loadContent();
  const site = content.site;
  const profile = content.profile;
  const projects = content.projects;
  const posts = content.posts.posts;
  const evidence = content.evidence;
  const social = content.social;
  const archive = content.archive;
  const plain = content.plain;
  const why = content.why;
  const caseStudies = content['case-studies'].caseStudies;

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // static assets
  await copyDir(ASSETS_DIR, path.join(DIST, 'assets'));

  const written = [];
  const page = async (relPath, html) => {
    await write(relPath, html);
    written.push(relPath);
  };

  /* ---- landing ---- */
  await page(
    'index.html',
    layout({
      title: site.name,
      description: site.seo.defaultDescription,
      path: '/',
      body: renderLanding({ site, profile, projects, caseStudies, posts, evidence, social, plain, why }),
      site,
      active: '/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.name,
        jobTitle: profile.role,
        email: `mailto:${profile.contact.email}`,
        url: site.url,
        sameAs: social.channels.map((c) => c.url),
        knowsAbout: profile.specialisms.map((s) => s.title),
        worksFor: { '@type': 'Organization', name: 'Independent' },
        description: profile.hero.headline,
      },
    }),
  );

  /* ---- products ---- */
  await page(
    'products/index.html',
    layout({
      title: 'Products',
      description:
        'CI Kit and SaaS-LocalStack: two open-source developer tooling projects for deterministic CI runs and zero-config offline mocks of third-party payment APIs.',
      path: '/products/',
      body: renderProducts({ site, profile, projects, caseStudies }),
      site,
      active: '/products/',
      scripts: ['/assets/vendor/htmx.min.js'],
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Products',
        description:
          'CI Kit and api-mock-services — two open-source developer tooling projects for deterministic CI runs and zero-dependency offline mocks of third-party APIs.',
        url: new URL('/products/', site.url).toString(),
        isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
        author: { '@type': 'Person', name: profile.name },
        hasPart: projects.projects.map((p) => ({
          '@type': 'SoftwareSourceCode',
          name: p.name,
          description: p.shortDescription,
          codeRepository: p.repo,
          programmingLanguage: p.language,
          license: p.license,
          author: { '@type': 'Person', name: profile.name },
        })),
      },
    }),
  );

  /* ---- case studies ---- */
  for (const [index, cs] of caseStudies.entries()) {
    const project = projects.projects.find((p) => p.id === cs.projectId);
    const next = caseStudies[index + 1] ?? null;
    await page(
      `products/${cs.id}/index.html`,
      layout({
        title: cs.hero.headline,
        description: cs.subtitle,
        path: casePath(cs),
        body: renderCaseStudy({ cs, project, next, site, plain: plain.plainTerms[cs.id] }),
        site,
        active: '/products/',
        ogType: 'article',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: cs.hero.headline,
          description: cs.subtitle,
          author: { '@type': 'Person', name: profile.name, url: site.url },
          publisher: { '@type': 'Person', name: profile.name, url: site.url },
          keywords: cs.stack.join(', '),
          datePublished: posts.find((p) => cs.links?.some((l) => l.href.includes(p.slug)))?.date ?? '2026-01-01',
        },
      }),
    );
  }

  /* ---- blog ---- */
  await page(
    'blog/index.html',
    layout({
      title: 'Build in Public',
      description:
        'Deep technical write-ups on CI/CD reproducibility, offline-first integration testing, developer experience and the hidden cost of slow feedback loops.',
      path: '/blog/',
      body: renderBlogIndex({ posts, social }),
      site,
      active: '/blog/',
      scripts: ['/assets/vendor/htmx.min.js'],
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${site.name} — Build in Public`,
        description:
          'Deep technical write-ups on CI/CD reproducibility, offline-first integration testing and developer experience.',
        url: new URL('/blog/', site.url).toString(),
        author: { '@type': 'Person', name: profile.name, url: site.url },
        blogPost: posts.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: new URL(`/blog/${p.slug}/`, site.url).toString(),
          datePublished: p.date,
        })),
      },
    }),
  );

  for (const [index, post] of posts.entries()) {
    const related = caseStudies.find((cs) => cs.links?.some((l) => l.href.includes(post.slug)));
    const project = related ? projects.projects.find((p) => p.id === related.projectId) : null;
    const nextPost = posts[index + 1] ?? null;
    await page(
      `blog/${post.slug}/index.html`,
      layout({
        title: post.title,
        description: post.dek,
        path: `/blog/${post.slug}/`,
        body: renderPost({ post, related, project, nextPost }),
        site,
        active: '/blog/',
        ogType: 'article',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.dek,
          datePublished: post.date,
          dateModified: post.updated ?? post.date,
          author: { '@type': 'Person', name: profile.name, url: site.url },
          publisher: { '@type': 'Person', name: profile.name, url: site.url },
          keywords: post.tags.join(', '),
          mainEntityOfPage: new URL(`/blog/${post.slug}/`, site.url).toString(),
        },
      }),
    );
  }

  /* ---- earlier archive: the index, and every post at its own permalink ---- */
  await page(
    'archive/index.html',
    layout({
      title: 'The earlier archive',
      description:
        `The earlier body of published work, ${archive.counts.from}–${archive.counts.to}: ${archive.counts.total} articles on application support, infrastructure, delivery and data, kept public with their original dates.`,
      path: '/archive/',
      body: renderArchive({ archive }),
      site,
      active: '/blog/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'The earlier archive',
        description: `${archive.counts.total} articles published between ${archive.counts.from} and ${archive.counts.to}, kept public with their original dates.`,
        url: new URL('/archive/', site.url).toString(),
        isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
        author: { '@type': 'Person', name: profile.name },
      },
    }),
  );

  for (const post of archive.posts) {
    const era = archive.eras.find((e) => e.id === post.era);
    await page(
      `blog/${post.slug}/index.html`,
      layout({
        title: post.title,
        description: post.dek,
        path: `/blog/${post.slug}/`,
        body: renderArchivePost({ post, era }),
        site,
        active: '/blog/',
        ogType: 'article',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.dek,
          datePublished: post.date,
          author: { '@type': 'Person', name: profile.name, url: site.url },
          publisher: { '@type': 'Person', name: profile.name, url: site.url },
          mainEntityOfPage: new URL(`/blog/${post.slug}/`, site.url).toString(),
        },
      }),
    );
  }

  /* ---- why ---- */
  await page(
    'why/index.html',
    layout({
      title: 'The ideas behind the work',
      description:
        'Five convictions the tools were built from — with the evidence that I act on each one, and what I would do differently.',
      path: '/why/',
      body: renderWhy({ why, profile, social }),
      site,
      active: '/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'The ideas behind the work',
        description:
          'Five convictions the tools were built from, with the evidence for each.',
        url: new URL('/why/', site.url).toString(),
        author: { '@type': 'Person', name: profile.name, url: site.url },
      },
    }),
  );

  /* ---- how I can help ---- */
  await page(
    'how-i-help/index.html',
    layout({
      title: 'How I can help',
      description:
        'Three problems I fix, in plain English: engineers waiting for builds, code that cannot be tested without a third-party account, and automation that stops when the network does.',
      path: '/how-i-help/',
      body: renderHowIHelp({ plain, profile, social }),
      site,
      active: '/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'How I can help',
        description:
          'Three problems I fix, in plain English, with the measured outcome of each.',
        url: new URL('/how-i-help/', site.url).toString(),
        author: { '@type': 'Person', name: profile.name, url: site.url },
      },
    }),
  );

  /* ---- glossary ---- */
  await page(
    'glossary/index.html',
    layout({
      title: 'Glossary',
      description:
        'The engineering terms this site uses, defined in plain English for a reader who does not build software for a living.',
      path: '/glossary/',
      body: renderGlossary({ plain }),
      site,
      active: '/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Glossary',
        description:
          'The engineering terms this site uses, defined in plain English.',
        url: new URL('/glossary/', site.url).toString(),
      },
    }),
  );

  /* ---- verification index ---- */
  await page(
    'record/index.html',
    layout({
      title: 'Verification index',
      description:
        'Every claim on this site, mapped to the artefact that supports it, with a stated document list and an honest account of the gaps.',
      path: '/record/',
      body: renderRecord({ evidence, profile, projects, posts, archive }),
      site,
      active: '/evidence/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Verification index',
        description:
          'Every claim mapped to the artefact that supports it, a stated document list, and an honest account of the gaps.',
        url: new URL('/record/', site.url).toString(),
        author: { '@type': 'Person', name: profile.name, url: site.url },
      },
    }),
  );

  /* ---- evidence hub ---- */
  await page(
    'evidence/index.html',
    layout({
      title: 'Open Source Impact',
      description:
        'A consolidated, printable evidence base: GitHub metrics, community growth, published writing, external recognition and a continuous activity log.',
      path: '/evidence/',
      body: renderEvidence({ evidence, projects, social, plain }),
      site,
      active: '/evidence/',
      scripts: ['/assets/vendor/htmx.min.js', '/assets/gh-metrics.js'],
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Open Source Impact',
        description:
          'A consolidated, printable evidence base: GitHub metrics, published tools, external recognition, public writing and a continuous activity log.',
        url: new URL('/evidence/', site.url).toString(),
        dateModified: evidence.snapshot.generatedAt,
        author: { '@type': 'Person', name: profile.name, url: site.url },
      },
    }),
  );

  /* ---- media kit ---- */
  await page(
    'media-kit/index.html',
    layout({
      title: 'Media Kit',
      description:
        'A printable one-pager, copy-ready bios for every channel, the LinkedIn Featured setup and a weekly posting calendar.',
      path: '/media-kit/',
      body: renderMediaKit({ profile, social, projects, posts, evidence, site }),
      site,
      active: '/evidence/',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: 'Media kit',
        description:
          'A printable one-pager, copy-ready bios for every channel, the LinkedIn Featured setup and a weekly posting calendar.',
        url: new URL('/media-kit/', site.url).toString(),
        mainEntity: { '@type': 'Person', name: profile.name, jobTitle: profile.role, url: site.url },
      },
    }),
  );

  /* ---- 404 ---- */
  await page(
    '404.html',
    layout({
      title: 'Page not found',
      description: 'That page does not exist.',
      path: '/404.html',
      body: renderNotFound({ site }),
      site,
      noindex: true,
    }),
  );

  /* ---- htmx partials ---- */
  await write('partials/metrics.html', renderMetrics(evidence));

  const allTags = [...new Set(projects.projects.flatMap((p) => p.tags))];
  await write('partials/projects/all.html', renderProjectFilter(projects, null));
  for (const tag of allTags) {
    const slug = slugifyTag(tag);
    await write(`partials/projects/${slug}.html`, renderProjectFilter(projects, slug));
  }

  const allTopics = [...new Set(posts.flatMap((p) => p.tags))];
  await write('partials/posts/all.html', renderPostList(posts, null));
  for (const topic of allTopics) {
    const slug = slugifyTag(topic);
    await write(`partials/posts/${slug}.html`, renderPostList(posts, slug));
  }

  /* ---- feeds and metadata ---- */
  await write(
    'sitemap.xml',
    renderSitemap(site, [
      ...posts.map((p) => ({ loc: `/blog/${p.slug}/`, priority: '0.7', changefreq: 'monthly' })),
      ...archive.posts.map((p) => ({ loc: `/blog/${p.slug}/`, priority: '0.4', changefreq: 'yearly' })),
    ]),
  );
  await write('feed.xml', renderFeed(site, posts));
  await write('robots.txt', ROBOTS);
  // GitHub Pages serves this directory with Jekyll disabled.
  await write('.nojekyll', '');

  const elapsed = Date.now() - started;
  console.log(`✓ built ${written.length} pages in ${elapsed}ms`);
  console.log(`  ${written.map((w) => `/${w}`).join('\n  ')}`);
  console.log(`  /sitemap.xml, /feed.xml, /robots.txt, /partials/*`);

  return { written, content };
}

/* ------------------------------------------------------------------ */
/* cli                                                                 */
/* ------------------------------------------------------------------ */

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const watch = process.argv.includes('--watch');
  const serve = process.argv.includes('--serve');

  await build();

  if (watch) {
    const { watch: fsWatch } = await import('node:fs');
    let timer = null;
    const rebuild = async () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await build();
        } catch (err) {
          console.error('✗ build failed:', err.message);
        }
      }, 80);
    };
    fsWatch(path.join(ROOT, 'content'), { recursive: true }, rebuild);
    fsWatch(path.join(ROOT, 'src'), { recursive: true }, rebuild);
    console.log('↻ watching content/ and src/ for changes…');
  }

  if (serve) {
    const { createServer } = await import('node:http');
    const { readFile: rf } = await import('node:fs/promises');
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json',
      '.xml': 'application/xml; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8',
    };
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      let file = path.join(DIST, rel);
      try {
        const s = await stat(file);
        if (s.isDirectory()) file = path.join(file, 'index.html');
      } catch {
        file = path.join(DIST, '404.html');
        res.statusCode = 404;
      }
      try {
        const body = await rf(file);
        res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
        res.end(body);
      } catch {
        res.statusCode = 500;
        res.end('build error');
      }
    });
    server.listen(4321, () => console.log('→ http://localhost:4321'));
  }
}
