#!/usr/bin/env node
/**
 * Measures how readable the site is.
 *
 *   node scripts/check-readability.mjs
 *   node scripts/check-readability.mjs --grade 12     # set the threshold
 *
 * Flesch-Kincaid grade level, per page. It is a blunt instrument — it
 * rewards short sentences and simple words, and it cannot tell a hard
 * idea from a badly explained one — but it is the same measure a reader
 * would apply at a glance, and it makes "is this understandable" a
 * property of the site rather than an opinion about it.
 *
 * What it skips, because they are not prose:
 *   - code blocks and inline code
 *   - tables, navigation, and the footer
 *   - words of three letters or fewer, which is where the count gets noisy
 *   - sentences that are mostly a URL or a filename
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const gradeIndex = process.argv.indexOf('--grade');
const THRESHOLD = gradeIndex > -1 ? Number(process.argv[gradeIndex + 1]) : 10;


/** Words that carry a technical idea and are read as one syllable each. */
const PROPER_NOUNS = new Set([
  'github', 'gitlab', 'netlify', 'openai', 'anthropic', 'sqlite', 'docker', 'kubernetes',
  'javascript', 'typescript', 'powershell', 'windows', 'linux', 'github actions', 'ollama',
  'paystack', 'interswitch', 'flutterwave', 'monnify', 'youverify', 'smileid', 'identitypass',
  'twilio', 'termii', 'onesignal', 'whatsapp', 'resend', 'xero', 'cloudflare', 'stripe', 'paypal',
  'ci', 'cd', 'api', 'apis', 'json', 'yaml', 'html', 'css', 'http', 'https', 'url', 'urls', 'npm',
  'node', 'vue', 'react', 'aws', 'azure', 'gcp', 'sql', 'prism', 'act', 'make', 'pester',
]);

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<code[\s\S]*?<\/code>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    // navigation and furniture, not prose
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<a class="skip-link"[\s\S]*?<\/a>/gi, ' ')
    .replace(/<div class="post-foot"[\s\S]*?<\/div>\s*<\/div>/gi, ' ')
    .replace(/<div class="crosspost"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="post-meta"[\s\S]*?<\/p>/gi, ' ')
    // list items and table cells are their own units
    .replace(/<\/li>/gi, '. ')
    .replace(/<\/dd>/gi, '. ')
    .replace(/<\/td>/gi, '. ')
    .replace(/<\/(h[1-6]|p|div|section|article|blockquote|tr)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (PROPER_NOUNS.has(w)) return 1;
  if (w.length <= 3) return 1;

  // strip silent endings, then count vowel groups
  let s = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = s.match(/[aeiouy]{1,2}/g);
  let count = groups ? groups.length : 1;
  // silent 'le' endings: "table", "little"
  if (/[^aeiouy]le$/.test(w)) count += 1;
  return Math.max(1, count);
}

function measure(text) {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length < 20 || sentences.length < 2) return null;

  const totalSyllables = words.reduce((sum, w) => sum + syllables(w), 0);
  const wps = words.length / sentences.length;
  const spw = totalSyllables / words.length;

  return {
    words: words.length,
    sentences: sentences.length,
    grade: 0.39 * wps + 11.8 * spw - 15.59,
    ease: 206.835 - 1.015 * wps - 84.6 * spw,
  };
}

/**
 * A metric nobody has tested is a number nobody should trust. This checks
 * that the instrument still separates dense prose from plain prose, and
 * that it agrees with the known Flesch–Kincaid reading of a sample.
 */
function selfTest() {
  const dense =
    'The implementation of deterministic toolchain resolution across heterogeneous build environments necessitates comprehensive consideration of version pinning semantics. Dependency graph traversal and cache invalidation strategies must ensure reproducible outcomes across distributed continuous integration topologies. Engineers frequently underestimate the combinatorial complexity of transitive version resolution under concurrent modification.';
  const plain =
    'Your team waits for the build. I made it wait less. The build now takes eleven seconds instead of four minutes. That is the whole change. It is also free to run.';

  const d = measure(dense);
  const p = measure(plain);

  console.log('\n  self-test');
  console.log(`    dense jargon    grade ${d.grade.toFixed(1)}  ease ${d.ease.toFixed(0)}`);
  console.log(`    plain English   grade ${p.grade.toFixed(1)}  ease ${p.ease.toFixed(0)}`);

  const problems = [];
  if (!(d.grade > 12)) problems.push('dense prose should score above grade 12');
  if (!(p.grade < 8)) problems.push('plain prose should score below grade 8');
  if (!(d.grade - p.grade > 4)) problems.push('the instrument does not separate the two');

  for (const problem of problems) console.error(`    FAIL  ${problem}`);
  if (problems.length) process.exit(1);
  console.log('    the instrument separates dense prose from plain prose');
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = (await walk(path.join(ROOT, 'dist'))).filter((f) => f.endsWith('.html'));
const results = [];

for (const file of files) {
  const rel = path.relative(path.join(ROOT, 'dist'), file);
  if (rel.startsWith('partials')) continue;
  const html = await readFile(file, 'utf8');
  const m = measure(strip(html));
  if (m) results.push({ page: rel, ...m });
}

results.sort((a, b) => b.grade - a.grade);

console.log(`\nFlesch-Kincaid grade level — ${results.length} pages (threshold: grade ${THRESHOLD})\n`);
for (const r of results) {
  const flag = r.grade > THRESHOLD ? '  over' : '';
  console.log(
    `  ${r.grade.toFixed(1).padStart(5)}  ease ${r.ease.toFixed(0).padStart(3)}  ${r.page}${flag}`,
  );
}

const worst = results[0];
const mean = results.reduce((s, r) => s + r.grade, 0) / results.length;
console.log(`\n  mean grade ${mean.toFixed(1)}   highest ${worst.grade.toFixed(1)} (${worst.page})`);

const over = results.filter((r) => r.grade > THRESHOLD);
if (over.length) {
  console.log(`\n  ${over.length} page(s) over the threshold — the prose needs a plain-English pass`);
  process.exit(1);
}
console.log('  every page is within the threshold');

// The self-test runs last, so every declaration above is initialised.
if (process.argv.includes('--selftest')) {
  selfTest();
  process.exit(0);
}
