#!/usr/bin/env node
/**
 * Checks the external links in the built site.
 *
 *   node scripts/check-links.mjs            check dist/
 *   node scripts/check-links.mjs --live     check the published site
 *
 * Internal links are checked by scripts/check.mjs, which runs on every
 * build. This one is slower — it makes a request per distinct URL — so it
 * is a separate step, run by hand or from a scheduled workflow.
 *
 * Some hosts answer automated requests with a challenge rather than the
 * page. LinkedIn returns 999, and Substack serves its shell to anything
 * that is not a browser. Those are listed as unverifiable rather than
 * broken, because the difference is the server's bot policy, not the
 * link.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

/** Hosts that answer bots with a challenge instead of the page. */
const UNVERIFIABLE = [
  { host: 'linkedin.com', reason: 'answers automated requests with 999' },
  { host: 'substack.com', reason: 'serves the page shell to non-browsers' },
  { host: 'x.com', reason: 'answers automated requests with a challenge' },
  { host: 'twitter.com', reason: 'answers automated requests with a challenge' },
];

const live = process.argv.includes('--live');
const origin = live ? 'https://omeiza-workspace.github.io' : null;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const urls = new Map();
const pages = live
  ? null
  : (await walk(path.join(ROOT, 'dist'))).filter((f) => f.endsWith('.html'));

if (live) {
  const paths = [
    '/',
    '/products/',
    '/products/ci-kit/',
    '/products/api-mock-services/',
    '/products/automation-gateway/',
    '/blog/',
    '/archive/',
    '/evidence/',
    '/record/',
    '/media-kit/',
  ];
  for (const p of paths) {
    const res = await fetch(origin + p);
    const html = await res.text();
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (!urls.has(m[1])) urls.set(m[1], new Set());
      urls.get(m[1]).add(p);
    }
  }
} else {
  for (const file of pages) {
    const html = await readFile(file, 'utf8');
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (!urls.has(m[1])) urls.set(m[1], new Set());
      urls.get(m[1]).add(path.relative(path.join(ROOT, 'dist'), file));
    }
  }
}

const broken = [];
const unverifiable = [];

for (const [url, where] of urls) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const unv = UNVERIFIABLE.find((u) => host === u.host || host.endsWith(`.${u.host}`));
  if (unv) {
    unverifiable.push([url, unv.reason]);
    continue;
  }
  let code = 'ERR';
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    code = String(res.status);
  } catch (err) {
    code = 'ERR';
  }
  if (code !== '200') broken.push([code, url, [...where].slice(0, 2).join(', ')]);
}

console.log(`\n${urls.size} distinct external links checked`);
if (unverifiable.length) {
  console.log(`\n${unverifiable.length} not verifiable from here (bot policy, not a broken link):`);
  for (const [url, reason] of unverifiable) console.log(`  · ${url}\n      ${reason}`);
}
if (broken.length) {
  console.log(`\n${broken.length} broken:`);
  for (const [code, url, where] of broken) console.log(`  ${code}  ${url}\n      in ${where}`);
  process.exit(1);
}
console.log('\n✓ every external link resolves');
