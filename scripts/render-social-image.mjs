#!/usr/bin/env node
/**
 * Renders the social "hero image" for a case study — a rendered version of
 * the architecture diagram, at the size LinkedIn and X expect.
 *
 *   node scripts/render-social-image.mjs automation-gateway
 *   node scripts/render-social-image.mjs --all
 *
 * The image is generated from the same JSON the site renders, so a diagram
 * that changes on the site changes here too. Nothing is hand-typed twice.
 *
 * Requires `rsvg-convert` (librsvg) on the path for the PNG conversion.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const WIDTH = 1200;
const HEIGHT = 630;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Very small monospace-column measurement, good enough for a fixed grid. */
const CHAR_W = 8.15;
const LINE_H = 22;

function renderSvg({ title, subtitle, lines, label }) {
  const body = lines
    .map((line, i) => {
      const y = 232 + i * LINE_H;
      // Dim the comment part of each line so the structure reads first.
      const [code, comment] = line.split('  # ');
      const codeText = esc(code ?? line);
      const commentText = comment ? `  # ${esc(comment)}` : '';
      const indent = (code.match(/^\s*/) ?? [''])[0].length;
      const colour = comment ? '#5b6b7c' : '#c8d6e2';
      return `<text x="80" y="${y}" font-family="ui-monospace, Menlo, monospace" font-size="15" fill="${colour}" xml:space="preserve">${codeText.replace(
        /^\s+/,
        (m) => ' '.repeat(Math.round((m.length * CHAR_W) / 15) * 1),
      )}<tspan fill="#4d5b6b">${commentText}</tspan></text>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0e13"/>
      <stop offset="100%" stop-color="#0d1620"/>
    </linearGradient>
    <radialGradient id="glow" cx="10%" cy="6%" r="62%">
      <stop offset="0%" stop-color="#5eead4" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#5eead4" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${WIDTH}" height="4" fill="#5eead4"/>

  <text x="80" y="88" font-family="ui-monospace, Menlo, monospace" font-size="15" letter-spacing="2.4" fill="#5eead4">${esc(label)}</text>
  <text x="80" y="140" font-family="ui-sans-serif, -apple-system, Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="#f4f8fb" letter-spacing="-0.8">${esc(title)}</text>
  <text x="80" y="172" font-family="ui-sans-serif, -apple-system, Helvetica, Arial, sans-serif" font-size="18" fill="#8b9cad">${esc(subtitle)}</text>

  <g>
    ${body}
  </g>

  <text x="80" y="596" font-family="ui-monospace, Menlo, monospace" font-size="15" fill="#4d5b6b">omeiza-workspace.github.io</text>
</svg>
`;
}

async function renderOne(id) {
  const cases = JSON.parse(await readFile(path.join(ROOT, 'content', 'case-studies.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
  const cs = cases.caseStudies.find((c) => c.id === id);
  if (!cs) throw new Error(`No case study "${id}"`);

  const project = projects.projects.find((p) => p.id === cs.projectId);
  const svg = renderSvg({
    label: cs.hero.eyebrow.toUpperCase(),
    title: project?.name ?? id,
    subtitle: cs.subtitle.length > 90 ? `${cs.subtitle.slice(0, 88)}…` : cs.subtitle,
    lines: cs.architecture.diagram,
  });

  const outDir = path.join(ROOT, 'src', 'assets', 'img', 'social');
  await mkdir(outDir, { recursive: true });
  const svgPath = path.join(outDir, `${id}-tree.svg`);
  const pngPath = path.join(outDir, `${id}-tree.png`);

  await writeFile(svgPath, svg, 'utf8');
  try {
    await exec('rsvg-convert', ['-w', String(WIDTH), '-h', String(HEIGHT), '-o', pngPath, svgPath]);
    console.log(`✓ ${path.relative(ROOT, pngPath)}`);
  } catch (err) {
    console.warn(`  ! rsvg-convert unavailable — wrote the SVG only: ${svgPath}`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--all')) {
  const cases = JSON.parse(await readFile(path.join(ROOT, 'content', 'case-studies.json'), 'utf8'));
  for (const cs of cases.caseStudies) await renderOne(cs.id);
} else if (args[0]) {
  await renderOne(args[0]);
} else {
  console.log('usage: node scripts/render-social-image.mjs <case-study-id> | --all');
}
