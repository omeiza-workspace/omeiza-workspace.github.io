/**
 * Page renderers. Each returns the inner HTML for <main>.
 *
 * Renderers receive the whole content bundle so that any page can pull
 * cross-links from anywhere — that is what keeps the channels
 * cross-pollinated rather than siloed.
 */

import { esc, attr, join, formatDate, formatMonth, num } from './html.mjs';
import { markdown, inlineMarkdown } from './markdown.mjs';

/* ------------------------------------------------------------------ */
/* shared pieces                                                       */
/* ------------------------------------------------------------------ */

function sectionHead({ eyebrow, title, lede, action }) {
  return join([
    eyebrow ? `<p class="section-eyebrow">${esc(eyebrow)}</p>` : '',
    `<div class="section-head-row"><h2 class="section-title">${esc(title)}</h2>${
      action ? `<div class="section-action">${action}</div>` : ''
    }</div>`,
    lede ? `<p class="section-lede">${esc(lede)}</p>` : '',
  ]);
}

function statStrip(stats) {
  return `<div class="stat-strip">${stats
    .map(
      (s) => `<div class="stat"><span class="stat-value">${esc(s.value)}</span><span class="stat-label">${esc(
        s.detail,
      )}</span></div>`,
    )
    .join('')}</div>`;
}

function arrowLink(label, href, { external = false } = {}) {
  const isExternal = external ?? /^https?:\/\//.test(href);
  return `<a class="arrow-link" href="${attr(href)}"${
    isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
  }>${esc(label)}${
    isExternal
      ? '<span class="ext" aria-hidden="true">↗</span>'
      : '<span class="arrow" aria-hidden="true">→</span>'
  }</a>`;
}

function tagList(tags = [], extraClass = 'tag-list') {
  if (!tags.length) return '';
  return `<ul class="${extraClass}">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

/** Canonical path for a case study. */
const casePath = (cs) => `/products/${cs.id}/`;

/* ------------------------------------------------------------------ */
/* landing                                                             */
/* ------------------------------------------------------------------ */

export function renderLanding({ site, profile, projects, caseStudies, posts, evidence, social }) {
  const featuredPosts = posts.filter((p) => p.featured).slice(0, 2);
  const recentPosts = posts.slice(0, 3);
  const primary = projects.projects[0];
  const secondary = projects.projects[1];

  // The hero figures are read from the project stats rather than restated
  // here, so a number can never drift between the panel and the case study.
  const headlineStats = [
    {
      value: primary.stats[0].value,
      label: `${primary.name} — ${primary.stats[0].detail}`,
    },
    {
      value: secondary.stats[0].value,
      label: `${secondary.name} — ${secondary.stats[0].detail}`,
    },
    {
      value: String(projects.projects.length),
      label: 'Open-source tools, published',
    },
    {
      value: String(posts.length),
      label: 'Technical essays, cross-posted',
    },
  ];

  const body = `
<section class="hero">
  <div class="hero-inner">
    <div class="hero-copy">
      <p class="hero-eyebrow"><span class="pulse" aria-hidden="true"></span>${esc(profile.hero.eyebrow)}</p>
      <h1 class="hero-headline">${esc(profile.hero.headline)}</h1>
      <p class="hero-sub">${esc(profile.hero.sub)}</p>
      <div class="hero-cta">${profile.hero.cta
        .map(
          (c) =>
            `<a class="btn ${c.primary ? 'btn-primary' : 'btn-ghost'}" href="${attr(c.href)}">${esc(c.label)}</a>`,
        )
        .join('')}</div>
      <p class="hero-scroll">${esc(profile.hero.scrollHint)}</p>
    </div>
    <aside class="hero-panel" aria-label="Key figures">
      <div class="panel-id">
        <img class="panel-avatar" src="/assets/img/avatar.jpg" alt="" width="52" height="52" decoding="async" />
        <div>
          <p class="panel-name">${esc(profile.name)}</p>
          <p class="panel-role">${esc(profile.role)}</p>
        </div>
      </div>
      <div class="panel-label">Measured, not claimed</div>
      <ul class="hero-stats">${headlineStats
        .map(
          (s) =>
            `<li><span class="hs-value">${esc(s.value)}</span><span class="hs-label">${esc(s.label)}</span></li>`,
        )
        .join('')}</ul>
      <p class="panel-foot">Every figure on this site is traceable to a published measurement, and each one links to the artefact that produced it.</p>
    </aside>
  </div>
</section>

<section class="pillars" aria-label="Three pillars">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'How this site is organised',
      title: 'Products, writing, and evidence',
      lede: 'Three ways in, depending on what you are here to judge.',
    })}
    <div class="pillar-grid">${profile.pillars
      .map(
        (p, idx) => `<article class="pillar">
        <div class="pillar-index" aria-hidden="true">0${idx + 1}</div>
        <p class="pillar-kicker">${esc(p.kicker)}</p>
        <h3 class="pillar-title"><a href="${attr(p.href)}">${esc(p.title)}</a></h3>
        <p class="pillar-body">${esc(p.description)}</p>
        <p class="pillar-proof">${esc(p.proof)}</p>
        <div class="pillar-links">${p.links
          .map((l) => `<a href="${attr(l.href)}">${esc(l.label)}<span aria-hidden="true">→</span></a>`)
          .join('')}</div>
      </article>`,
      )
      .join('')}</div>
  </div>
</section>

<section class="case-preview" aria-label="Case studies">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Case studies',
      title: 'Two problems, measured end to end',
      lede: 'Not a feature list. The failure mode, the intervention, the before-and-after numbers, and what I would do differently.',
      action: arrowLink('All products', '/products/'),
    })}
    <div class="case-grid">${caseStudies
      .map((cs) => {
        const proj = projects.projects.find((p) => p.id === cs.projectId);
        return `<article class="case-card">
        <p class="case-eyebrow">${esc(cs.hero.eyebrow)}</p>
        <h3 class="case-title"><a href="${attr(casePath(cs))}">${esc(cs.hero.headline)}</a></h3>
        <p class="case-sub">${esc(cs.subtitle)}</p>
        <p class="case-body">${esc(cs.hero.body)}</p>
        <ul class="case-facts">${(cs.results.before ?? [])
          .slice(0, 2)
          .map((r) => `<li><span>${esc(r.value)}</span><em>${esc(r.metric)}</em></li>`)
          .join('')}<li class="is-after"><span>${esc(
            (cs.results.after ?? []).slice(0, 2)[0]?.value ?? '—',
          )}</span><em>${esc((cs.results.after ?? []).slice(0, 2)[0]?.metric ?? 'after')}</em></li></ul>
        <div class="case-foot">${arrowLink(`Read the ${proj?.name ?? cs.id} case study`, casePath(cs))}${
          tagList(cs.stack.slice(0, 3), 'tag-list tag-list-inline')
        }</div>
      </article>`;
      })
      .join('')}</div>
  </div>
</section>

<section class="positioning" aria-label="Positioning">
  <div class="wrap positioning-inner">
    <div class="positioning-copy">
      <p class="section-eyebrow">Positioning</p>
      <h2 class="section-title">${esc(profile.positioning.statement)}</h2>
      <ul class="check-list">${profile.positioning.supports
        .map((s) => `<li>${esc(s)}</li>`)
        .join('')}</ul>
    </div>
    <div class="positioning-side">
      <div class="linkd-card">
        <p class="linkd-label">LinkedIn headline</p>
        <p class="linkd-text">${esc(social.headline)}</p>
      </div>
      <div class="linkd-card">
        <p class="linkd-label">Currently</p>
        <p class="linkd-text">${esc(profile.availability.status)}</p>
        <p class="linkd-sub">${esc(profile.availability.note)}</p>
      </div>
    </div>
  </div>
</section>

<section class="specialisms" aria-label="Specialisms">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Specialisms',
      title: 'What I actually work on',
      lede: 'Four areas, chosen because I have shipped in them rather than because they sound impressive.',
    })}
    <div class="spec-grid">${profile.specialisms
      .map(
        (s) => `<article class="spec">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </article>`,
      )
      .join('')}</div>
    <div class="stack-block">
      <p class="stack-label">Tooling I work in daily</p>
      <div class="stack-groups">${profile.stack
        .map(
          (g) =>
            `<div class="stack-group"><span class="stack-name">${esc(g.group)}</span><ul>${g.items
              .map((i) => `<li>${esc(i)}</li>`)
              .join('')}</ul></div>`,
        )
        .join('')}</div>
    </div>
  </div>
</section>

<section class="writing-preview" aria-label="Recent writing">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Build in public',
      title: 'Recent writing',
      lede: 'Long-form technical essays, cross-posted to Substack and Dev.to. The full archive is on the blog.',
      action: arrowLink('All articles', '/blog/'),
    })}
    <div class="post-grid">${recentPosts
      .map(
        (p) => `<article class="post-card">
      <p class="post-meta"><span class="post-channel">${esc(p.channel)}</span><time datetime="${attr(p.date)}">${esc(
        formatDate(p.date),
      )}</time><span class="dot" aria-hidden="true">·</span><span>${esc(p.readingTime)}</span></p>
      <h3 class="post-title"><a href="/blog/${attr(p.slug)}/">${esc(p.title)}</a></h3>
      <p class="post-dek">${esc(p.dek)}</p>
      ${tagList(p.tags, 'tag-list tag-list-inline')}
    </article>`,
      )
      .join('')}</div>
  </div>
</section>

<section class="evidence-strip" aria-label="Public evidence">
  <div class="wrap evidence-strip-inner">
    <div>
      <p class="section-eyebrow">Open Source Impact</p>
      <h2 class="section-title">A pre-packaged evidence base for anyone assessing my work.</h2>
      <p class="section-lede">${esc(
        'Consolidated metrics, community growth, external recognition, public writing and an activity log — all in one printable page, and all linked to primary sources.',
      )}</p>
      <div class="evidence-actions">${arrowLink('Open the evidence hub', '/evidence/')}${arrowLink(
        'Printable media kit',
        '/media-kit/',
      )}</div>
    </div>
    <ul class="evidence-mini">${evidence.community
      .slice(0, 4)
      .map(
        (c) =>
          `<li><span class="em-value">${esc(c.value)}</span><span class="em-label">${esc(c.label)}</span></li>`,
      )
      .join('')}</ul>
  </div>
</section>

<section class="contact" aria-label="Contact">
  <div class="wrap contact-inner">
    <div>
      <p class="section-eyebrow">Contact</p>
      <h2 class="section-title">${esc(profile.contact.formNote)}</h2>
      <div class="contact-links">${profile.contact.channels
        .map(
          (c) =>
            `<a href="${attr(c.href)}"${
              /^https?:\/\//.test(c.href) ? ' target="_blank" rel="noopener noreferrer"' : ''
            }><span class="cc-label">${esc(c.label)}</span><span class="cc-value">${esc(c.value)}</span></a>`,
        )
        .join('')}</div>
    </div>
  </div>
</section>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* products                                                            */
/* ------------------------------------------------------------------ */

export function renderProducts({ site, profile, projects, caseStudies }) {
  const tags = [...new Set(projects.projects.flatMap((p) => p.tags))].sort();

  const body = `
<section class="page-hero">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">My products</p>
    <h1 class="page-title">Two open-source tools for the part of the workflow nobody demos.</h1>
    <p class="page-lede">Both are published, both are permissively licensed, and both ship with the benchmark harness so the performance claims can be re-run rather than taken on trust.</p>
  </div>
</section>

<section class="wrap" aria-label="Projects">
  <div class="project-list">${projects.projects
    .map((p) => {
      const cs = caseStudies.find((c) => c.projectId === p.id);
      return `<article class="project" id="${attr(p.id)}">
      <div class="project-head">
        <div>
          <h2 class="project-name">${esc(p.name)}</h2>
          <p class="project-tagline">${esc(p.tagline)}</p>
        </div>
        <span class="pill pill-status">${esc(p.status)}</span>
      </div>
      <p class="project-desc">${esc(p.description)}</p>
      ${statStrip(p.stats)}
      <div class="project-pillars">${p.pillars
        .map((pl) => `<span>${esc(pl)}</span>`)
        .join('')}</div>
      <ul class="outcomes">${p.keyOutcomes
        .map(
          (o) =>
            `<li><h3>${esc(o.title)}</h3><p>${inlineMarkdown(o.body)}</p></li>`,
        )
        .join('')}</ul>
      <div class="project-foot">
        <div class="project-meta">${tagList(p.tags, 'tag-list tag-list-inline')}<span class="meta-item">${esc(
          p.language,
        )}</span><span class="meta-item">${esc(p.license)}</span></div>
        <div class="project-links">${arrowLink('Repository', p.repo, { external: true })}${
          cs ? arrowLink('Read the case study', casePath(cs)) : ''
        }</div>
      </div>
    </article>`;
    })
    .join('')}</div>
</section>

<section class="wrap filter-demo" aria-label="Filter by technology">
  ${sectionHead({
    eyebrow: 'Filter',
    title: 'Filter by technology',
    lede: 'Small datasets, real behaviour — the same partial-refresh pattern is reused for the blog topic filter and the evidence metrics.',
  })}
  <div class="filter-bar" role="group" aria-label="Filter projects by technology">
    <button class="filter-chip is-active" hx-get="/partials/projects/all.html" hx-target="#project-filter-results" hx-swap="innerHTML" hx-push-url="false">All</button>
    ${tags
      .map(
        (t) =>
          `<button class="filter-chip" hx-get="/partials/projects/${attr(
            t.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          )}.html" hx-target="#project-filter-results" hx-swap="innerHTML" hx-push-url="false">${esc(t)}</button>`,
      )
      .join('')}
  </div>
  <div id="project-filter-results" class="filter-results">${renderProjectFilter(projects, null)}</div>
</section>

<section class="principles" aria-label="Working principles">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Principles',
      title: 'The rules I build by',
      lede: 'These are not values on a wall. Each one exists because ignoring it produced a measurable problem at some point.',
    })}
    <div class="principle-grid">${profile.principles
      .map(
        (p, i) => `<article class="principle">
        <span class="principle-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.body)}</p>
      </article>`,
      )
      .join('')}</div>
  </div>
</section>

<section class="wrap" aria-label="Background">
  ${sectionHead({ eyebrow: 'Background', title: 'Experience' })}
  <ol class="timeline">${profile.timeline
    .map(
      (t) => `<li class="timeline-item">
    <p class="tl-period">${esc(t.period)}</p>
    <h3>${esc(t.title)}</h3>
    <p class="tl-org">${esc(t.org)}</p>
    <p class="tl-body">${esc(t.body)}</p>
    ${tagList(t.tags, 'tag-list tag-list-inline')}
  </li>`,
    )
    .join('')}</ol>
</section>
`;

  return body;
}

/** htmx fragment: project cards filtered by tag. */
export function renderProjectFilter(projects, tag) {
  const list = tag
    ? projects.projects.filter((p) => p.tags.some((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === tag))
    : projects.projects;

  if (!list.length) {
    return '<p class="empty-note">No project uses that technology yet.</p>';
  }

  return `<div class="filter-grid">${list
    .map(
      (p) => `<article class="filter-card">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.shortDescription)}</p>
      <ul class="filter-stats">${p.stats
        .slice(0, 2)
        .map((s) => `<li><span>${esc(s.value)}</span><em>${esc(s.detail)}</em></li>`)
        .join('')}</ul>
      ${arrowLink('Repository', p.repo, { external: true })}
    </article>`,
    )
    .join('')}</div>`;
}

/* ------------------------------------------------------------------ */
/* case study                                                          */
/* ------------------------------------------------------------------ */

export function renderCaseStudy({ cs, project, next, site }) {
  // Section numbers are derived so that optional sections do not leave gaps.
  const steps = [
    { id: 'problem', label: 'The problem', node: cs.problem },
    { id: 'approach', label: 'The approach', node: cs.approach },
    { id: 'architecture', label: 'The architecture', node: cs.architecture },
    { id: 'results', label: 'The results', node: cs.results },
  ];
  if (cs.findings) steps.push({ id: 'findings', label: 'What it found', node: cs.findings });
  if (cs.governance) steps.push({ id: 'governance', label: 'The public record', node: cs.governance });
  steps.push({ id: 'lessons', label: 'Lessons', node: null });

  const numbered = (id) => String(steps.findIndex((s) => s.id === id) + 1).padStart(2, '0');

  const body = `
<article class="case-study">
  <header class="cs-hero">
    <div class="wrap">
      <p class="section-eyebrow">${esc(cs.hero.eyebrow)}</p>
      <h1 class="cs-headline">${esc(cs.hero.headline)}</h1>
      <p class="cs-subtitle">${esc(cs.subtitle)}</p>
      <p class="cs-lede">${esc(cs.hero.body)}</p>
      <div class="cs-meta">
        <div class="cs-meta-item"><span class="cs-meta-label">Role</span><span class="cs-meta-value">${esc(cs.role)}</span></div>
        <div class="cs-meta-item"><span class="cs-meta-label">Reading time</span><span class="cs-meta-value">${esc(cs.readingTime)}</span></div>
        <div class="cs-meta-item"><span class="cs-meta-label">Project</span><span class="cs-meta-value">${esc(project.name)} · ${esc(
          project.license,
        )} · ${esc(project.language)}</span></div>
      </div>
      <div class="cs-hero-actions">${arrowLink('Repository', project.repo, { external: true })}${
        project.site ? arrowLink('Project documentation', project.site, { external: true }) : ''
      }${arrowLink('Open Source Impact', '/evidence/')}</div>
    </div>
  </header>

  <section class="cs-section" id="problem">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('problem')}</p><p class="cs-aside-title">${esc(steps[0].label)}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.problem.headline)}</h2>
        ${markdown(cs.problem.body)}
        <blockquote class="pull-quote"><p>${esc(cs.problem.pullQuote)}</p></blockquote>
        <h3>What it looked like day to day</h3>
        <ul class="symptom-list">${cs.problem.symptoms.map((s) => `<li>${inlineMarkdown(s)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section class="cs-section cs-alt" id="approach">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('approach')}</p><p class="cs-aside-title">${esc(steps[1].label)}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.approach.headline)}</h2>
        ${markdown(cs.approach.body)}
        ${
          cs.approach.pullQuote2
            ? `<blockquote class="pull-quote"><p>${esc(cs.approach.pullQuote2)}</p></blockquote>`
            : ''
        }
      </div>
    </div>
  </section>

  <section class="cs-section" id="architecture">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('architecture')}</p><p class="cs-aside-title">${esc(steps[2].label)}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.architecture.headline)}</h2>
        <pre class="diagram" aria-label="Architecture diagram"><code>${esc(
          cs.architecture.diagram.join('\n'),
        )}</code></pre>
        <ol class="arch-steps">${cs.architecture.steps
          .map(
            (s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`,
          )
          .join('')}</ol>
      </div>
    </div>
  </section>

  <section class="cs-section cs-alt" id="results">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('results')}</p><p class="cs-aside-title">${esc(steps[3].label)}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.results.headline)}</h2>
        <div class="before-after">
          <div class="ba-col ba-before">
            <p class="ba-label">Before</p>
            <ul>${cs.results.before.map((r) => `<li><span>${esc(r.value)}</span><em>${esc(r.metric)}</em></li>`).join('')}</ul>
          </div>
          <div class="ba-col ba-after">
            <p class="ba-label">After</p>
            <ul>${cs.results.after.map((r) => `<li><span>${esc(r.value)}</span><em>${esc(r.metric)}</em></li>`).join('')}</ul>
          </div>
        </div>
        <ul class="note-list">${cs.results.notes.map((n) => `<li>${inlineMarkdown(n)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  ${
    cs.findings
      ? `<section class="cs-section" id="findings">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('findings')}</p><p class="cs-aside-title">${esc(
        steps.find((s) => s.id === 'findings').label,
      )}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.findings.headline)}</h2>
        <p>${inlineMarkdown(cs.findings.body)}</p>
        <div class="lesson-grid">${cs.findings.items
          .map((i) => `<article class="lesson"><h3>${esc(i.title)}</h3><p>${inlineMarkdown(i.body)}</p></article>`)
          .join('')}</div>
      </div>
    </div>
  </section>`
      : ''
  }

  ${
    cs.governance
      ? `<section class="cs-section cs-alt" id="governance">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('governance')}</p><p class="cs-aside-title">${esc(
        steps.find((s) => s.id === 'governance').label,
      )}</p></div>
      <div class="cs-content">
        <h2>${esc(cs.governance.headline)}</h2>
        <p>${inlineMarkdown(cs.governance.body)}</p>
        <div class="lesson-grid">${cs.governance.items
          .map((i) => `<article class="lesson"><h3>${esc(i.title)}</h3><p>${inlineMarkdown(i.body)}</p></article>`)
          .join('')}</div>
      </div>
    </div>
  </section>`
      : ''
  }

  <section class="cs-section${cs.governance ? ' cs-alt' : ''}" id="lessons">
    <div class="wrap cs-grid">
      <div class="cs-aside"><p class="cs-aside-label">${numbered('lessons')}</p><p class="cs-aside-title">${esc(
        steps[steps.length - 1].label,
      )}</p></div>
      <div class="cs-content">
        <h2>What I would tell my past self</h2>
        <div class="lesson-grid">${cs.lessons
          .map(
            (l) => `<article class="lesson"><h3>${esc(l.title)}</h3><p>${inlineMarkdown(l.body)}</p></article>`,
          )
          .join('')}</div>
      </div>
    </div>
  </section>

  <section class="cs-section cs-alt">
    <div class="wrap">
      <div class="cs-foot">
        <div>
          <p class="section-eyebrow">Keep reading</p>
          <h2 class="section-title">${esc(next ? next.hero.headline : 'See the full public record')}</h2>
        </div>
        <div class="cs-foot-actions">
          ${next ? arrowLink('Next case study', casePath(next)) : ''}${arrowLink('Open Source Impact', '/evidence/')}
        </div>
      </div>
      <ul class="cs-links">${cs.links
        .map(
          (l) =>
            `<li><a href="${attr(l.href)}"${
              /^https?:\/\//.test(l.href) ? ' target="_blank" rel="noopener noreferrer"' : ''
            }>${esc(l.label)}<span class="ext" aria-hidden="true">↗</span></a></li>`,
        )
        .join('')}</ul>
      ${
        project.docs?.length
          ? `<div class="doc-index">
        <p class="doc-index-label">Documentation in the repository</p>
        <ul class="doc-index-list">${project.docs
          .map(
            (d) =>
              `<li><a href="${attr(d.href)}" target="_blank" rel="noopener noreferrer">${esc(d.label)}</a>${
                d.note ? `<span>${esc(d.note)}</span>` : ''
              }</li>`,
          )
          .join('')}</ul>
        <p class="doc-index-foot">Indexed rather than copied, so the repository stays the single source of truth.</p>
      </div>`
          : ''
      }
    </div>
  </section>
</article>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* blog                                                                */
/* ------------------------------------------------------------------ */

export function renderBlogIndex({ posts, social }) {
  const topics = [...new Set(posts.flatMap((p) => p.tags))].sort();
  const [first, ...rest] = posts;

  const body = `
<section class="page-hero">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">Build in public</p>
    <h1 class="page-title">Deep technical write-ups.</h1>
    <p class="page-lede">Essays and post-mortems on CI/CD reproducibility, offline-first integration testing, and the cost of slow feedback loops. Cross-posted to Substack and Dev.to, and permanently archived here with RSS.</p>
    <div class="page-hero-actions">${arrowLink('RSS feed', '/feed.xml', { external: true })}${arrowLink(
      'Subscribe on Substack',
      social.channels.find((c) => c.id === 'substack')?.url ?? '#',
      { external: true },
    )}</div>
  </div>
</section>

<section class="wrap" aria-label="Articles">
  <div class="post-layout">
    <div class="post-main">
      <div class="filter-bar" role="group" aria-label="Filter articles by topic">
        <button class="filter-chip is-active" hx-get="/partials/posts/all.html" hx-target="#post-list" hx-swap="innerHTML">All</button>
        ${topics
          .map(
            (t) =>
              `<button class="filter-chip" hx-get="/partials/posts/${attr(
                t.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              )}.html" hx-target="#post-list" hx-swap="innerHTML">${esc(t)}</button>`,
          )
          .join('')}
      </div>
      <div id="post-list">${renderPostList(posts, null)}</div>
    </div>
    <aside class="post-side">
      <div class="side-card">
        <p class="side-label">Writing cadence</p>
        <ul class="side-list">${social.channels
          .filter((c) => ['substack', 'devto', 'x'].includes(c.id))
          .map(
            (c) =>
              `<li><a href="${attr(c.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(
                c.label,
              )}</span><em>${esc(c.cadence)}</em></a></li>`,
          )
          .join('')}</ul>
      </div>
      <div class="side-card">
        <p class="side-label">Content loop</p>
        <p class="side-text">Every post follows the same shape: the problem, the evidence, the intervention, the measurement, and a link to the repository. Never a bare link.</p>
      </div>
    </aside>
  </div>
</section>

<section class="wrap newsletter-cta" aria-label="Subscribe">
  <div class="newsletter-inner">
    <div>
      <h2>Follow the work as it happens.</h2>
      <p>New releases, benchmarks and essays. No newsletter platform required — Substack and RSS cover it.</p>
    </div>
    <div class="newsletter-actions">${arrowLink(
      'Substack',
      social.channels.find((c) => c.id === 'substack')?.url ?? '#',
      { external: true },
    )}${arrowLink('RSS', '/feed.xml', { external: true })}</div>
  </div>
</section>
`;

  return body;
}

/** htmx fragment: post list filtered by topic. */
export function renderPostList(posts, topic) {
  const list = topic
    ? posts.filter((p) => p.tags.some((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === topic))
    : posts;

  if (!list.length) {
    return '<p class="empty-note">Nothing published on that topic yet.</p>';
  }

  return `<div class="post-grid post-grid-wide">${list
    .map(
      (p) => `<article class="post-card">
    <p class="post-meta"><span class="post-channel">${esc(p.channel)}</span><time datetime="${attr(p.date)}">${esc(
      formatDate(p.date),
    )}</time><span class="dot" aria-hidden="true">·</span><span>${esc(p.readingTime)}</span></p>
    <h3 class="post-title"><a href="/blog/${attr(p.slug)}/">${esc(p.title)}</a></h3>
    <p class="post-dek">${esc(p.dek)}</p>
    ${tagList(p.tags, 'tag-list tag-list-inline')}
  </article>`,
    )
    .join('')}</div>`;
}

/* ------------------------------------------------------------------ */
/* post                                                                */
/* ------------------------------------------------------------------ */

export function renderPost({ post, related, project, nextPost }) {
  const body = `
<article class="post-full">
  <header class="post-hero">
    <div class="wrap wrap-narrow">
      <p class="post-meta"><span class="post-channel">${esc(post.channel)}</span><time datetime="${attr(
        post.date,
      )}">${esc(formatDate(post.date))}</time>${
        post.updated && post.updated !== post.date
          ? `<span class="dot" aria-hidden="true">·</span><span>Updated ${esc(formatDate(post.updated))}</span>`
          : ''
      }<span class="dot" aria-hidden="true">·</span><span>${esc(post.readingTime)}</span></p>
      <h1 class="post-h1">${esc(post.title)}</h1>
      <p class="post-dek-lg">${esc(post.dek)}</p>
      ${tagList(post.tags, 'tag-list tag-list-inline')}
      ${
        post.crossPost?.length
          ? `<div class="crosspost">${post.crossPost
              .map(
                (c) =>
                  `<a href="${attr(c.url)}" target="_blank" rel="noopener noreferrer">Also on ${esc(
                    c.platform,
                  )}<span class="ext" aria-hidden="true">↗</span></a>`,
              )
              .join('')}</div>`
          : ''
      }
    </div>
  </header>

  <div class="wrap wrap-narrow post-body">
    ${markdown(post.body)}
  </div>

  <div class="wrap wrap-narrow post-foot">
    ${
      project
        ? `<div class="post-related"><p class="section-eyebrow">Related project</p><h2>${esc(project.name)}</h2><p>${esc(
            project.tagline,
          )}</p>${arrowLink('Repository', project.repo, { external: true })}</div>`
        : ''
    }
    <div class="post-next">
      <p class="section-eyebrow">Read next</p>
      ${
        nextPost
          ? `<h2><a href="/blog/${attr(nextPost.slug)}/">${esc(nextPost.title)}</a></h2><p>${esc(nextPost.dek)}</p>`
          : '<h2><a href="/blog/">All articles</a></h2><p>Back to the full archive.</p>'
      }
    </div>
    <div class="post-cta">
      <p>Every claim on this site is reproducible. The repositories include the benchmark harness.</p>
      ${arrowLink('Open Source Impact', '/evidence/')}${arrowLink('All products', '/products/')}
    </div>
  </div>
</article>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* evidence hub                                                        */
/* ------------------------------------------------------------------ */

export function renderEvidence({ evidence, projects, social }) {
  const g = evidence.github;
  const unverified = evidence.community.filter((c) => !c.verified).length;

  const body = `
<section class="page-hero page-hero-evidence">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">Open Source Impact · Public Recognition</p>
    <h1 class="page-title">The evidence, in one page.</h1>
    <p class="page-lede">${esc(evidence.record.statement)}</p>
    <div class="page-hero-actions">${arrowLink('Printable media kit', '/media-kit/')}${arrowLink(
      'Media kit as PDF (print)',
      '/media-kit/',
    )}</div>
  </div>
</section>

${
  unverified
    ? `<div class="wrap"><div class="notice notice-warn"><strong>Figures to confirm before submission.</strong> ${unverified} metric${
        unverified === 1 ? '' : 's'
      } in this page are placeholders awaiting live data. Run <code>npm run metrics</code> to refresh the GitHub section from the public API, then update any remaining figures in <code>content/evidence.json</code>.</div></div>`
    : ''
}

<section class="wrap" aria-label="Metrics">
  <div class="evidence-toolbar">
    <div>
      <p class="section-eyebrow">Snapshot</p>
      <h2 class="section-title">Consolidated metrics</h2>
    </div>
    <div class="snapshot-controls">
      <p class="snapshot-stamp">As of <time datetime="${attr(evidence.snapshot.generatedAt)}">${esc(
        formatDate(evidence.snapshot.generatedAt),
      )}</time> · source: ${inlineMarkdown(evidence.snapshot.source)}</p>
      <button class="btn btn-ghost btn-sm" hx-get="/partials/metrics.html" hx-target="#metrics-grid" hx-swap="innerHTML" hx-indicator="#metrics-loading">Reload snapshot</button>
    </div>
  </div>
  <div id="metrics-loading" class="htmx-indicator">Loading…</div>
  <div id="metrics-grid">${renderMetrics(evidence)}</div>
</section>

<section class="wrap" aria-label="Repositories">
  ${sectionHead({
    eyebrow: 'Open Source',
    title: 'Published repositories',
    lede: 'Permissively licensed, published with the harness that produced the numbers.',
  })}
  <div class="repo-list">${g.repos
    .map(
      (r) => `<article class="repo">
    <div class="repo-head">
      <h3><a href="${attr(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}<span class="ext" aria-hidden="true">↗</span></a></h3>
      <p class="repo-desc">${esc(r.description)}</p>
    </div>
    <ul class="repo-stats">
      <li><span>${esc(num(r.stars))}</span><em>stars</em></li>
      <li><span>${esc(num(r.forks))}</span><em>forks</em></li>
      <li><span>${esc(num(r.watchers))}</span><em>watchers</em></li>
      <li><span>${esc(num(r.openIssues))}</span><em>open issues</em></li>
    </ul>
    <div class="repo-foot">
      <p class="repo-lang">${esc(r.language)} · ${esc(r.license)}${
        r.lastPush ? ` · last push ${esc(formatMonth(r.lastPush))}` : ''
      }</p>
      ${tagList(r.topics ?? [], 'tag-list tag-list-inline')}
    </div>
  </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="Recognition">
  ${sectionHead({
    eyebrow: 'Public recognition',
    title: 'Recognition beyond the employer',
    lede: 'Publications, releases and other records that exist outside any single company, and that a third party can verify.',
  })}
  <ol class="recognition-list">${evidence.recognition
    .map(
      (r) => `<li class="recognition">
    <p class="rec-type">${esc(r.type)}</p>
    <h3><a href="${attr(r.url)}"${
      /^https?:\/\//.test(r.url) ? ' target="_blank" rel="noopener noreferrer"' : ''
    }>${esc(r.title)}</a></h3>
    <p class="rec-meta">${esc(r.issuer)} · ${esc(r.date)}${r.note ? ` — ${esc(r.note)}` : ''}</p>
  </li>`,
    )
    .join('')}</ol>
</section>

<section class="wrap" aria-label="Community">
  ${sectionHead({
    eyebrow: 'Community',
    title: 'What the public record says, and why it is empty',
    lede: 'This section reports no testimonials, because there are none I can attribute honestly yet.',
  })}
  <div class="testimonial-grid">${evidence.testimonials.mechanisms
    .map(
      (m) => `<figure class="testimonial">
      <blockquote>${esc(m.body)}</blockquote>
      <figcaption>
        <span class="t-name">${esc(m.title)}</span>
        <span class="t-role">${esc(evidence.testimonials.policy ? 'Mechanism' : '')}</span>
      </figcaption>
    </figure>`,
    )
    .join('')}</div>
  <div class="archive-note">
    <p>${esc(evidence.testimonials.policy)}</p>
  </div>
</section>

<section class="wrap" aria-label="Activity">
  ${sectionHead({
    eyebrow: 'Ongoing activity',
    title: 'Milestones and recent work',
    lede: 'A continuous record of shipping and publishing, not a single launch.',
  })}
  <div class="activity-list">${evidence.activity
    .map(
      (a) => `<div class="activity-row">
      <span class="activity-date">${esc(formatMonth(a.date))}</span>
      <span class="activity-kind">${esc(a.label)}</span>
      <span class="activity-detail">${esc(a.detail)}</span>
    </div>`,
    )
    .join('')}</div>
  <div class="milestone-grid">${evidence.milestones
    .map(
      (m) => `<article class="milestone">
      <p class="ms-date">${esc(m.date)}</p>
      <h3>${esc(m.label)}</h3>
      <p>${esc(m.detail)}</p>
      ${m.href ? arrowLink('Read more', m.href) : ''}
    </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="What this record covers">
  ${sectionHead({
    eyebrow: 'What this record covers',
    title: 'The four areas this work is assessed on',
    lede: 'Where each part of the public record sits, and the artefacts that back it.',
  })}
  <div class="criteria-grid">${evidence.record.criteria
    .map(
      (c) => `<article class="criterion">
      <h3>${esc(c.label)}</h3>
      <p>${esc(c.body)}</p>
    </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="Channels">
  ${sectionHead({ eyebrow: 'Cross-pollination', title: 'Where to find the work' })}
  <div class="channel-grid">${social.channels
    .map(
      (c) => `<a class="channel" href="${attr(c.url)}" target="_blank" rel="noopener noreferrer">
      <span class="ch-label">${esc(c.label)}</span>
      <span class="ch-handle">${esc(c.handle)}</span>
      <span class="ch-role">${esc(c.role)}</span>
      <span class="ch-cadence">${esc(c.cadence)}</span>
    </a>`,
    )
    .join('')}</div>
</section>
`;

  return body;
}

/** htmx fragment: the metrics grid, re-renderable from the snapshot. */
export function renderMetrics(evidence) {
  const g = evidence.github;
  return `<div class="metrics-grid">
    <div class="metric metric-primary">
      <p class="metric-label">Open-source stars</p>
      <p class="metric-value">${esc(num(g.totals.stars))}</p>
      <p class="metric-detail">Across ${g.repos.length} published repositories</p>
    </div>
    <div class="metric metric-primary">
      <p class="metric-label">Forks</p>
      <p class="metric-value">${esc(num(g.totals.forks))}</p>
      <p class="metric-detail">Independent reuse of the tools</p>
    </div>
    <div class="metric">
      <p class="metric-label">External contributors</p>
      <p class="metric-value">${esc(num(g.totals.contributors))}</p>
      <p class="metric-detail">Distinct contributors other than the maintainer</p>
    </div>
    <div class="metric">
      <p class="metric-label">Followers</p>
      <p class="metric-value">${esc(num(g.followers))}</p>
      <p class="metric-detail">On the public GitHub profile</p>
    </div>
    ${evidence.community
      .map(
        (c) => `<div class="metric${c.verified ? '' : ' metric-unverified'}">
      <p class="metric-label">${esc(c.label)}</p>
      <p class="metric-value">${esc(c.value)}</p>
      <p class="metric-detail">${inlineMarkdown(c.detail)}</p>
      <p class="metric-source">${esc(c.source)}${c.verified ? '' : ' · unconfirmed'}</p>
    </div>`,
      )
      .join('')}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* media kit                                                           */
/* ------------------------------------------------------------------ */

export function renderMediaKit({ profile, social, projects, posts, evidence, site }) {
  const copyBlock = (id, label, value) => `
<div class="copy-block" data-copy-source="${attr(id)}">
  <div class="copy-head">
    <p class="copy-label">${esc(label)}</p>
    <button class="copy-btn" type="button" data-copy="${attr(id)}">Copy</button>
  </div>
  <p class="copy-text" id="${attr(id)}">${esc(value)}</p>
</div>`;

  const body = `
<section class="page-hero page-hero-kit">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">Media kit</p>
    <h1 class="page-title">A printable one-pager, and copy-ready bios.</h1>
    <p class="page-lede">Everything on this page is designed to be printed to PDF or copied straight into a profile. Nothing here is marketing copy — it is the same record as the evidence hub, in a shape that fits a form.</p>
    <div class="page-hero-actions">
      <button class="btn btn-primary" type="button" onclick="window.print()">Print / save as PDF</button>
      ${arrowLink('Full evidence hub', '/evidence/')}
    </div>
  </div>
</section>

<section class="wrap" aria-label="One-pager">
  <div class="onepager" id="onepager">
    <header class="op-head">
      <div class="op-id">
        <img class="op-avatar" src="/assets/img/avatar.jpg" alt="" width="64" height="64" decoding="async" />
        <div>
          <h2 class="op-name">${esc(profile.name)}</h2>
          <p class="op-role">${esc(profile.role)}</p>
        </div>
      </div>
      <p class="op-contact">${esc(profile.contact.email)}<br />${esc(profile.location)}</p>
    </header>

    <div class="op-statement">
      <p>${esc(profile.hero.headline)}</p>
    </div>

    <div class="op-cols">
      <div class="op-col">
        <h3>Products</h3>
        <ul class="op-list">${projects.projects
          .map(
            (p) => `<li><strong>${esc(p.name)}</strong> — ${esc(p.tagline)}<br /><span class="op-small">${esc(
              p.stats[0].value,
            )} ${esc(p.stats[0].detail.toLowerCase())}</span></li>`,
          )
          .join('')}</ul>

        <h3>Recognition</h3>
        <ul class="op-list">${evidence.recognition
          .map((r) => `<li>${esc(r.title)} — <em>${esc(r.issuer)}, ${esc(r.date)}</em></li>`)
          .join('')}</ul>
      </div>
      <div class="op-col">
        <h3>Writing</h3>
        <ul class="op-list">${posts
          .slice(0, 4)
          .map(
            (p) =>
              `<li><a href="/blog/${attr(p.slug)}/">${esc(p.title)}</a><br /><span class="op-small">${esc(
                formatDate(p.date),
              )} · ${esc(p.channel)}</span></li>`,
          )
          .join('')}</ul>

        <h3>Links</h3>
        <ul class="op-list">${social.channels
          .map((c) => `<li><strong>${esc(c.label)}</strong> — ${esc(c.url)}</li>`)
          .join('')}</ul>
      </div>
    </div>

    <footer class="op-foot">
      <p>${esc(profile.availability.status)} — ${esc(profile.availability.detail)}</p>
      <p>Full evidence: <a href="${attr(site.url)}/evidence/">${esc(site.url)}/evidence/</a></p>
    </footer>
  </div>
</section>

<section class="wrap" aria-label="Copy-ready bios">
  ${sectionHead({
    eyebrow: 'Copy-ready',
    title: 'Unified bios for every channel',
    lede: 'The same narrative, four lengths. Use the one that fits the field you are filling in.',
  })}
  ${copyBlock('bio-oneline', 'One line — X bio, GitHub profile', social.bios.oneLine)}
  ${copyBlock('bio-short', 'Short — 160 characters, LinkedIn headline or X', social.bios.short)}
  ${copyBlock('bio-linkedin', 'LinkedIn about section', social.bios.linkedin)}
  ${copyBlock('bio-x', 'X / short-form bio', social.bios.x)}
  ${copyBlock('bio-long', 'Long — portfolio, conference bios and speaker profiles', social.bios.long)}
  ${copyBlock('headline', 'LinkedIn headline', social.headline)}
</section>

<section class="wrap" aria-label="LinkedIn featured">
  ${sectionHead({
    eyebrow: 'LinkedIn',
    title: 'What to pin in the Featured section',
    lede: 'Three items, in this order. A recruiter who clicks one lands on a different part of the argument each time.',
  })}
  <ol class="featured-list">${social.linkedinFeatured
    .map(
      (f, i) => `<li class="featured">
      <span class="fe-index">0${i + 1}</span>
      <div>
        <p class="fe-type">${esc(f.type)}</p>
        <h3><a href="${attr(f.href)}"${
          /^https?:\/\//.test(f.href) ? ' target="_blank" rel="noopener noreferrer"' : ''
        }>${esc(f.title)}</a></h3>
        <p>${esc(f.detail)}</p>
      </div>
    </li>`,
    )
    .join('')}</ol>
</section>

<section class="wrap" aria-label="Content calendar">
  ${sectionHead({
    eyebrow: 'Content loop',
    title: 'Weekly posting calendar',
    lede: 'Every post leads with a technical problem, carries the evidence, and points at the repository. Never a bare link.',
  })}
  <div class="calendar">${social.contentCalendar
    .map(
      (c) => `<article class="cal-item">
    <div class="cal-head">
      <span class="cal-week">Week ${esc(String(c.week))}</span>
      <span class="cal-channel">${esc(c.channel)}</span>
      <span class="cal-format">${esc(c.format)}</span>
    </div>
    <h3>${esc(c.topic)}</h3>
    <p class="cal-hook">“${esc(c.hook)}”</p>
    <p class="cal-body">${esc(c.body)}</p>
    <p class="cal-cta"><strong>CTA:</strong> ${esc(c.cta)}</p>
    <ul class="cal-links">${c.links
      .map((l) => `<li><a href="${attr(l.href)}">${esc(l)}</a></li>`)
      .join('')}</ul>
  </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="Cross-pollination rules">
  ${sectionHead({
    eyebrow: 'Cross-pollination',
    title: 'How the channels link to each other',
    lede: social.crossPollination.note,
  })}
  <ul class="check-list check-list-wide">${social.crossPollination.rules
    .map((r) => `<li>${esc(r)}</li>`)
    .join('')}</ul>
</section>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* earlier archive (2013–2025)                                        */
/* ------------------------------------------------------------------ */

export function renderArchive({ archive }) {
  const byEra = archive.eras
    .map((era) => ({ era, posts: archive.posts.filter((p) => p.era === era.id) }))
    .filter((g) => g.posts.length);

  const body = `
<section class="page-hero page-hero-archive">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">The earlier archive</p>
    <h1 class="page-title">${archive.counts.from}–${archive.counts.to}: ${archive.counts.total} articles, kept public.</h1>
    <p class="page-lede">These were written between ${archive.counts.from} and ${archive.counts.to}, originally on a Hugo blog hosted on Netlify, mostly for working teams rather than for a portfolio. They are reproduced here with their dates intact, because the arc is part of the record — and because a body of writing that spans thirteen years is evidence of something a single polished article is not.</p>
    <div class="page-hero-actions">
      ${arrowLink('Original archive on Netlify', archive.source.site, { external: true })}
      ${arrowLink('Archive repository', archive.source.repo, { external: true })}
    </div>
  </div>
</section>

<section class="wrap" aria-label="Archive by era">
  <div class="archive-note">
    <p><strong>On the audience these were written for.</strong> Much of this archive was written for non-technical readers — operations teams, business stakeholders, new joiners. It is kept unchanged rather than rewritten, because rewriting older work to look more impressive than it was would defeat the purpose of a dated archive. The technical work that followed is in the <a href="/blog/">recent writing</a> and the <a href="/products/">case studies</a>.</p>
  </div>

  ${byEra
    .map(
      ({ era, posts }) => `<section class="archive-era">
    <div class="era-head">
      <p class="era-range">${esc(era.from)}–${esc(era.to)}</p>
      <h2>${esc(era.label)}</h2>
      <p class="era-note">${esc(era.note)}</p>
    </div>
    <ol class="archive-list">${posts
      .map(
        (p) => `<li class="archive-item">
      <div class="ai-meta">
        <time datetime="${attr(p.date)}">${esc(formatDate(p.date))}</time>
        ${p.readingTime ? `<span class="dot" aria-hidden="true">·</span><span>${esc(p.readingTime)}</span>` : ''}
      </div>
      <h3><a href="${attr(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}<span class="ext" aria-hidden="true">↗</span></a></h3>
      <p class="ai-dek">${esc(p.dek)}</p>
      <p class="ai-src"><a href="${attr(p.repoUrl)}" target="_blank" rel="noopener noreferrer">source markdown</a></p>
    </li>`,
      )
      .join('')}</ol>
  </section>`,
    )
    .join('')}
</section>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* verification index                                                   */
/* ------------------------------------------------------------------ */

export function renderRecord({ evidence, profile, projects, posts, archive }) {
  const checks = evidence.verification.checks;
  const documents = evidence.verification.documents;

  const body = `
<section class="page-hero page-hero-record">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">Verification index</p>
    <h1 class="page-title">Every claim here, and the artefact that supports it.</h1>
    <p class="page-lede">This page exists to make verification trivial. Each claim below links to the primary artefact behind it, so a reader can confirm the work without asking for anything. Material that is not public is listed as available on request, with its status stated plainly.</p>
  </div>
</section>

<section class="wrap" aria-label="What this record covers">
  ${sectionHead({
    eyebrow: 'What this record covers',
    title: 'Where the evidence sits',
    lede: 'The four areas this work is assessed on, and the artefacts that back each one.',
  })}
  <div class="criteria-grid">${evidence.record.criteria
    .map(
      (c) => `<article class="criterion">
      <h3>${esc(c.label)}</h3>
      <p>${esc(c.body)}</p>
    </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="How to verify">
  ${sectionHead({
    eyebrow: 'Frictionless verification',
    title: 'How to check each claim',
    lede: 'Every claim on this site is checkable against a public artefact. Here is the index.',
  })}
  <div class="verify-list">${checks
    .map(
      (c) => `<article class="verify">
    <h3>${esc(c.claim)}</h3>
    <p>${esc(c.how)}</p>
    <a href="${attr(c.verify)}"${
      /^https?:\/\//.test(c.verify) ? ' target="_blank" rel="noopener noreferrer"' : ''
    }>${esc(c.verify.replace(/^https?:\/\//, ''))}<span class="ext" aria-hidden="true">↗</span></a>
  </article>`,
    )
    .join('')}</div>
</section>

<section class="wrap" aria-label="Document pack">
  ${sectionHead({
    eyebrow: 'The document pack',
    title: 'What is public, and what is on request',
    lede: 'The full pack is supplied directly to the endorsing body. This table states what exists, so nothing has to be requested blind.',
  })}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Item</th><th>Status</th><th>Availability</th></tr></thead>
      <tbody>${documents
        .map(
          (d) => `<tr>
        <td><strong>${esc(d.item)}</strong></td>
        <td>${esc(d.state)}</td>
        <td>${/^https?:/.test(d.availability) ? `<a href="${attr(d.availability)}">${esc(d.availability)}</a>` : esc(d.availability)}</td>
      </tr>`,
        )
        .join('')}</tbody>
    </table>
  </div>
</section>

<section class="wrap" aria-label="Current position">
  ${sectionHead({
    eyebrow: 'Current position',
    title: 'Stated plainly, including the gaps',
    lede: 'A reviewer will find the gaps anyway. Finding them on the author\u2019s own site is worth more than being asked.',
  })}
  <div class="honest-grid">
    <article class="honest">
      <h3>What is strong</h3>
      <ul>
        <li>Two published, permissively licensed tools, both with live documentation sites.</li>
        <li>A published measurement record, including a discarded measurement and a section on what is not claimed.</li>
        <li>A footprint claim that is enforced by a build gate rather than asserted in prose.</li>
        <li>${archive.counts.total} dated articles spanning ${archive.counts.from}–${archive.counts.to}.</li>
        <li>A body of writing that is specific to one technical subject rather than generalist commentary.</li>
      </ul>
    </article>
    <article class="honest honest-caution">
      <h3>What is not yet strong</h3>
      <ul>
        <li><strong>Zero stars, forks and external contributors.</strong> The repositories are published; the adoption is not. This is the largest gap and no amount of copy closes it.</li>
        <li><strong>No public testimonials.</strong> The projects handle this structurally — the adopter list is a repository file — but the list is currently empty.</li>
        <li><strong>The npm package is not yet published</strong>, so the registry badge in the project README does not yet resolve.</li>
        <li><strong>No third-party press or talks yet.</strong> The mention list exists and is empty; it grows by issue.</li>
        <li><strong>Four essays are recent</strong> against a much longer archive, and the recent ones are the ones written for a specialist audience.</li>
      </ul>
    </article>
  </div>
</section>

<section class="wrap" aria-label="Contact">
  <div class="honest-cta">
    <div>
      <h2>${esc(profile.availability.status)}</h2>
      <p>${esc(profile.availability.detail)} For anything not on this page, email is the fastest route — I respond to technical and collaboration enquiries within two working days.</p>
    </div>
    <div class="honest-cta-actions">
      <a class="btn btn-primary" href="mailto:${attr(profile.contact.email)}">${esc(profile.contact.email)}</a>
      ${arrowLink('Printable media kit', '/media-kit/')}
    </div>
  </div>
</section>
`;

  return body;
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

export function renderNotFound({ site }) {
  return `
<section class="page-hero">
  <div class="wrap page-hero-inner">
    <p class="section-eyebrow">404</p>
    <h1 class="page-title">That page does not exist.</h1>
    <p class="page-lede">It may have been renamed, or the link may be wrong. The three things people usually want are below.</p>
    <div class="page-hero-actions">
      <a class="btn btn-primary" href="/">Landing page</a>
      <a class="btn btn-ghost" href="/products/">Products</a>
      <a class="btn btn-ghost" href="/blog/">Build in public</a>
      <a class="btn btn-ghost" href="/evidence/">Open Source Impact</a>
    </div>
  </div>
</section>
`;
}
