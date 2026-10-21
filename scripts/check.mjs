#!/usr/bin/env node
/**
 * Pre-deploy checks. Run before every publish.
 *
 *   node scripts/check.mjs
 *
 * Catches the things that actually go wrong in a static site built from
 * data: an internal link that does not resolve, a placeholder number that
 * was published by accident, and a page that renders the word "undefined".
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DIST = path.join(ROOT, 'dist');

const problems = [];
const warnings = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/* ---------------------------------------------------- content sanity --- */

const evidence = JSON.parse(await readFile(path.join(ROOT, 'content', 'evidence.json'), 'utf8'));
const projects = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
const cases = JSON.parse(await readFile(path.join(ROOT, 'content', 'case-studies.json'), 'utf8'));

// Every repository referenced must be a real project in the content layer.
const projectIds = new Set(projects.projects.map((p) => p.id));
for (const cs of cases.caseStudies) {
  if (!projectIds.has(cs.projectId)) {
    problems.push(`case study "${cs.id}" references unknown project "${cs.projectId}"`);
  }
}
for (const p of projects.projects) {
  if (!/^https:\/\/github\.com\//.test(p.repo)) {
    problems.push(`project "${p.id}" has a non-GitHub repository URL: ${p.repo}`);
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(p.repo)) {
    problems.push(`project "${p.id}" repository URL is not a full repo path: ${p.repo}`);
  }
}

// A case study must not be published without a measurement.
for (const cs of cases.caseStudies) {
  if (!cs.results?.before?.length || !cs.results?.after?.length) {
    problems.push(`case study "${cs.id}" has no before/after measurement`);
  }
  if (!cs.results?.notes?.length) {
    warnings.push(`case study "${cs.id}" publishes no notes qualifying its measurements`);
  }
}

// Any figure the site states as measured must be traceable.
if (evidence.snapshot.source === 'manual' && evidence.snapshot.live === false) {
  warnings.push('evidence snapshot is not live — run `npm run metrics` before publishing');
}

// Every criterion and community entry must have the fields the renderers read.
for (const c of evidence.visa?.criteria ?? []) {
  if (!c.label || !c.body) {
    problems.push(`evidence.visa.criteria entry "${c.label ?? '(unnamed)'}" is missing "body"`);
  }
}
for (const c of evidence.community ?? []) {
  if (!c.label || !c.value || !c.detail) {
    problems.push(`evidence.community entry "${c.label ?? '(unnamed)'}" is missing a required field`);
  }
}
for (const c of evidence.verification?.checks ?? []) {
  if (!c.claim || !c.verify || !c.how) {
    problems.push(`evidence.verification.checks entry "${c.claim ?? '(unnamed)'}" is missing a required field`);
  }
}

const unverified = evidence.community.filter((c) => c.verified === false);
if (unverified.length) {
  warnings.push(`${unverified.length} metrics are marked unverified`);
}

/* ---------------------------------------------------------- build ----- */

let files = [];
try {
  await stat(DIST);
  files = await walk(DIST);
} catch {
  problems.push('dist/ does not exist — run `npm run build` first');
}

const htmlFiles = files.filter((f) => f.endsWith('.html'));
const allPaths = new Set(
  files.map((f) => '/' + path.relative(DIST, f).split(path.sep).join('/')),
);

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(DIST, file);

  // Rendering leaks. Compared literally — these are exact strings, not
  // patterns, so a regex would misread "[object Object]" as a character class.
  for (const leak of ['undefined', 'NaN', '[object Object]']) {
    if (html.includes(leak)) {
      problems.push(`${rel} renders the literal value "${leak}"`);
    }
  }

  // Unrendered Markdown. A field that carries inline markup but is written
  // through esc() instead of the Markdown renderer reaches the page with its
  // asterisks and backticks intact.
  const stripped = html.replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '');
  for (const [pattern, label] of [
    [/\*\*[^*\n]{1,80}\*\*/, 'bold'],
    [/`[^`\n]{1,80}`/, 'inline code'],
  ]) {
    const hit = stripped.match(pattern);
    if (hit) {
      problems.push(`${rel} renders unrendered Markdown (${label}): ${hit[0].slice(0, 50)}`);
    }
  }

  // Internal links.
  for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = match[1];
    if (!href || href.startsWith('/partials/')) continue;
    const candidates = [href, `${href}index.html`, `${href.replace(/\/$/, '')}.html`];
    if (!candidates.some((c) => allPaths.has(c))) {
      problems.push(`${rel} links to ${href}, which does not exist in dist/`);
    }
  }

  // htmx targets.
  for (const match of html.matchAll(/hx-get="([^"]+)"/g)) {
    if (!allPaths.has(match[1])) {
      problems.push(`${rel} has hx-get="${match[1]}", which does not exist in dist/`);
    }
  }

  // Basic accessibility and metadata floor. Partials are fragments and are
  // fetched into a page, so they carry no head, title or structured data.
  const isPartial = rel.startsWith('partials' + path.sep);
  if (!isPartial) {
    if (!html.includes('<h1')) problems.push(`${rel} has no <h1>`);
    if (!html.includes('name="description"')) problems.push(`${rel} has no meta description`);
    if (!html.includes('rel="canonical"')) problems.push(`${rel} has no canonical link`);
    if (!html.includes('application/ld+json')) warnings.push(`${rel} has no JSON-LD structured data`);
  }
}

/* ---------------------------------------------------------- report ---- */

for (const w of warnings) console.warn(`  warn  ${w}`);
for (const p of problems) console.error(`  FAIL  ${p}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s) found`);
  process.exit(1);
}

console.log(`\n✓ ${htmlFiles.length} pages checked, no problems`);
if (warnings.length) console.log(`  ${warnings.length} warning(s)`);
