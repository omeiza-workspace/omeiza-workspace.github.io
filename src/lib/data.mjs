/**
 * Loads the JSON content layer and validates the shape we depend on.
 *
 * Everything the site renders comes from these files. There is no inline
 * copy in the templates, so adding a post or a metric is a JSON edit.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const ASSETS_DIR = path.join(ROOT, 'src', 'assets');

const REQUIRED = {
  'site.json': ['title', 'url', 'nav', 'footer', 'seo'],
  'profile.json': ['name', 'hero', 'pillars', 'specialisms', 'contact'],
  'projects.json': ['projects'],
  'case-studies.json': ['caseStudies'],
  'posts.json': ['posts'],
  'archive.json': ['source', 'eras', 'counts', 'posts'],
  'plain.json': ['proposition', 'howIHelp', 'plainTerms', 'glossary', 'plainMetrics'],
  'why.json': ['eyebrow', 'title', 'intro', 'beliefs', 'close'],
  'evidence.json': ['snapshot', 'github', 'community', 'recognition', 'milestones'],
  'social.json': ['channels', 'headline', 'bios', 'linkedinFeatured', 'contentCalendar'],
};

export async function loadContent() {
  const content = {};
  const problems = [];

  for (const [file, keys] of Object.entries(REQUIRED)) {
    const raw = await readFile(path.join(CONTENT_DIR, file), 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      problems.push(`${file}: invalid JSON — ${err.message}`);
      continue;
    }
    for (const key of keys) {
      if (parsed[key] === undefined) problems.push(`${file}: missing required key "${key}"`);
    }
    content[file.replace('.json', '')] = parsed;
  }

  if (problems.length) {
    throw new Error(`Content validation failed:\n  - ${problems.join('\n  - ')}`);
  }

  // Cross-file integrity: every case study must point at a real project.
  const projectIds = new Set(content.projects.projects.map((p) => p.id));
  for (const cs of content['case-studies'].caseStudies) {
    if (!projectIds.has(cs.projectId)) {
      throw new Error(`Case study "${cs.id}" references unknown project "${cs.projectId}"`);
    }
  }

  // Every article referenced by a case study link must exist.
  const postSlugs = new Set(content.posts.posts.map((p) => p.slug));
  for (const cs of content['case-studies'].caseStudies) {
    for (const l of cs.links ?? []) {
      if (l.href.startsWith('/blog/') && !postSlugs.has(l.href.replace('/blog/', '').replace(/\/$/, ''))) {
        throw new Error(`Case study "${cs.id}" links to missing post "${l.href}"`);
      }
    }
  }

  content.posts.posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  content['case-studies'].caseStudies.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  return content;
}

/** Absolute URL for a site-relative path. */
export function absolute(site, href) {
  if (/^https?:\/\//.test(href)) return href;
  return new URL(href, site.url).toString();
}
