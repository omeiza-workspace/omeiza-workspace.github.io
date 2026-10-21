#!/usr/bin/env node
/**
 * Refreshes the GitHub section of content/evidence.json from the public API.
 *
 *   node scripts/refresh-metrics.mjs            # unauthenticated (60 req/hr)
 *   GITHUB_TOKEN=ghp_xxx node scripts/...       # authenticated (5000 req/hr)
 *
 * Only the numbers change. Nothing is invented: if a repo has no stars, the
 * snapshot says zero. The site publishes that number rather than hiding it,
 * because an endorsement panel can check it in one click.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const EVIDENCE = path.join(ROOT, 'content', 'evidence.json');

const token = process.env.GITHUB_TOKEN ?? '';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'omeiza-portfolio-metrics',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function api(pathname) {
  const res = await fetch(`https://api.github.com${pathname}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} for ${pathname}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

const evidence = JSON.parse(await readFile(EVIDENCE, 'utf8'));
const g = evidence.github;

console.log(`→ fetching ${g.username}'s public repositories…`);
const repos = await api(`/users/${g.username}/repos?per_page=100&sort=updated&type=owner`);

const byName = new Map(repos.map((r) => [r.name, r]));
const tracked = g.repos.map((r) => {
  const live = byName.get(r.name);
  if (!live) {
    console.warn(`  ! ${r.name} is not a public repository of ${g.username} — leaving the snapshot as-is`);
    return r;
  }
  return {
    ...r,
    stars: live.stargazers_count,
    forks: live.forks_count,
    watchers: live.subscribers_count ?? live.watchers_count ?? 0,
    openIssues: live.open_issues_count,
    lastPush: live.pushed_at ? live.pushed_at.slice(0, 10) : r.lastPush,
    description: live.description ?? r.description,
  };
});

const trackedNames = new Set(tracked.map((r) => r.name));
const totals = tracked.reduce(
  (acc, r) => ({
    stars: acc.stars + (r.stars ?? 0),
    forks: acc.forks + (r.forks ?? 0),
    watchers: acc.watchers + (r.watchers ?? 0),
  }),
  { stars: 0, forks: 0, watchers: 0 },
);

g.repos = tracked;
g.totals = { ...g.totals, ...totals };
g.followers = (await api(`/users/${g.username}`)).followers;
g.publicRepos = repos.filter((r) => !r.fork).length;

evidence.snapshot = {
  generatedAt: new Date().toISOString(),
  source: 'GitHub API',
  live: true,
};

await writeFile(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(`✓ updated content/evidence.json`);
console.log(`  ${g.publicRepos} public repositories, ${totals.stars} stars, ${totals.forks} forks, ${g.followers} followers`);
const untracked = repos.filter((r) => !r.fork && !trackedNames.has(r.name)).map((r) => r.name);
if (untracked.length) {
  console.log(`  repositories not tracked in the snapshot: ${untracked.join(', ')}`);
}
