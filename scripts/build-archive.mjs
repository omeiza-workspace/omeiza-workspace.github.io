#!/usr/bin/env node
/**
 * Regenerates content/archive.json from the TechLiaison repository.
 *
 *   node scripts/build-archive.mjs [path-to-TechLiaison-checkout]
 *
 * The archive is the earlier body of published work. It is generated rather
 * than hand-written so that the titles, dates and excerpts on this site come
 * from the same source the blog was published from, and cannot drift.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const repo = process.argv[2] ?? path.join(ROOT, '..', '..', 'TechLiaison');
const postsDir = path.join(repo, 'content', 'posts');
const outFile = path.join(ROOT, 'content', 'archive.json');

/** Era groupings, by publication year. The arc is the point of the archive. */
const ERAS = [
  {
    id: 'support',
    label: 'Application support & the service desk',
    from: 2013,
    to: 2016,
    note: 'The years of reading logs, reproducing faults and learning what an outage actually costs a business.',
  },
  {
    id: 'translation',
    label: 'Translating between engineering and the business',
    from: 2017,
    to: 2021,
    note: 'Requirements, migration, monitoring and the discipline of writing things other people can act on.',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure, delivery and the move to DevOps',
    from: 2022,
    to: 2025,
    note: 'Containers, infrastructure as code, observability and leading teams — the point where the tooling work started.',
  },
];

function eraFor(year) {
  return ERAS.find((e) => year >= e.from && year <= e.to) ?? ERAS[ERAS.length - 1];
}

function parseFrontMatter(raw) {
  const match = raw.match(/^\s*---\s*\n([\s\S]*?)\n---\s*\n/) ?? raw.match(/^\s*\+\+\+\s*\n([\s\S]*?)\n\+\+\+\s*\n/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+)\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (kv) data[kv[1]] = kv[2];
  }
  return data;
}

function extractDek(body) {
  // First paragraph of real prose, skipping the title line and any rule.
  const withoutHeadings = body
    .split('\n')
    .filter((line) => !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('**Published'))
    .join('\n');
  const paragraphs = withoutHeadings.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const para = paragraphs.find((p) => !p.startsWith('|') && p.length > 60) ?? paragraphs[0] ?? '';
  return para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * The body of a post, ready to render.
 *
 * The old posts open with a level-one title and a "Published:" line, both of
 * which the page template renders itself — so they are stripped here rather
 * than duplicated on every page.
 */
function extractBody(raw) {
  const body = raw.replace(/^\s*(---|\+\+\+)\s*\n[\s\S]*?\n(---|\+\+\+)\s*\n/, '');
  return body
    .split('\n')
    .filter((line) => !/^#\s+/.test(line) && !/^\*\*Published:/.test(line))
    .join('\n')
    .replace(/^\s*---\s*$/, '')
    .trim();
}

/** Scaffolding and boilerplate that is not part of the body of work. */
const EXCLUDE = new Set([
  'first-post', // the Hugo starter post
]);

const files = (await readdir(postsDir)).filter((f) => f.endsWith('.md'));
const posts = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  if (EXCLUDE.has(slug)) continue;

  const raw = await readFile(path.join(postsDir, file), 'utf8');
  const fm = parseFrontMatter(raw);
  const body = raw.replace(/^\s*(---|\+\+\+)\s*\n[\s\S]*?\n(---|\+\+\+)\s*\n/, '');

  const title = fm.title ?? body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file.replace(/\.md$/, '');
  const date = (fm.date ?? '').slice(0, 10);
  if (!date) continue;

  const year = Number(date.slice(0, 4));

  posts.push({
    slug,
    title,
    date,
    year,
    readingTime: fm.readingTime ?? null,
    dek: extractDek(body),
    body: extractBody(raw),
    era: eraFor(year).id,
    sourceUrl: `https://techliaison.netlify.app/posts/${slug}/`,
    repoUrl: `https://github.com/omeiza-workspace/TechLiaison/blob/main/content/posts/${file}`,
  });
}

posts.sort((a, b) => (a.date < b.date ? 1 : -1));

const archive = {
  source: {
    name: 'TechLiaison',
    site: 'https://techliaison.netlify.app/',
    repo: 'https://github.com/omeiza-workspace/TechLiaison',
    note: 'Originally published on a Hugo site hosted on Netlify. Migrated here so that the whole body of published work sits on the same domain as the repositories and the evidence hub.',
  },
  eras: ERAS,
  counts: {
    total: posts.length,
    from: posts[posts.length - 1]?.date?.slice(0, 4) ?? null,
    to: posts[0]?.date?.slice(0, 4) ?? null,
  },
  posts,
};

await writeFile(outFile, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
console.log(`✓ wrote ${outFile} — ${posts.length} posts, ${archive.counts.from}–${archive.counts.to}`);
