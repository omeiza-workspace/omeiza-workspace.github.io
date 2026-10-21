# Portfolio — Omeiza Okuta

A JSON-driven, static portfolio for a **Global Talent Visa** endorsement and for
engineering leaders evaluating open-source work.

The site is built around one idea: **for a visa panel, an unverifiable claim is
worth less than no claim at all.** Every figure published here traces to a
measured artefact — a repository, an evidence document, or a dated article — and
where the record is thin, the site says so rather than filling the gap.

---

## Why it is built this way

| Decision | Reason |
| --- | --- |
| **Static MPA, not an SPA** | A panel clicks *Evidence Hub* and needs a distinct, shareable, printable URL. A SPA gives `#/evidence`, which cannot be bookmarked, archived or printed. |
| **No framework** | Zero runtime dependencies. The build script uses the Node standard library only. Nothing to supply-chain, nothing to rot. |
| **JSON as the single source of truth** | One post, one case study, one metric — edited in one place and rendered into the site, the RSS feed, the media kit and the LinkedIn calendar at once. |
| **htmx for the few interactive bits** | Topic filters and the metrics snapshot. 14 KB, progressive enhancement, zero JS on the critical path. |
| **Plain CSS, design tokens** | One file, no build step, dark and light from the same variables. |
| **The commit history is the audit trail** | Every claim, edit and retraction is a dated commit in this repository. A reviewer can read the site's own history. |

> **On the original brief.** The first draft of this site carried figures such as
> *"feedback latency from 4m 12s to 11s"* and a *"1.8 GB → 22 MB"* mock footprint.
> Those numbers were not in the repositories. The published evidence says the
> local gate takes **99 s against 43–48 s on a runner** — it is *not* faster —
> and the mock engine went from **250 MB across four containers to 50 MB in one
> process**. The site now states the real figures, because a panel that opens
> `ci-kit/docs/EVIDENCE.md` and finds a contradiction has been given a reason to
> doubt everything else. The honest numbers are also, conveniently, the more
> interesting ones.

---

## Commands

```sh
npm run build     # content/*.json + src/ -> dist/
npm run dev       # build, watch and serve on http://localhost:4321
npm run check     # validate the built site before publishing
npm run metrics   # refresh the GitHub section of the evidence snapshot
npm run archive   # regenerate content/archive.json from the TechLiaison repo
```

No `npm install` is needed. There are no dependencies.

---

## Layout

```
content/                  the source of truth — all of it is JSON
  site.json               navigation, footer, SEO, social metadata
  profile.json            positioning, specialisms, principles, timeline
  projects.json           the two tools, their stats and outcomes
  case-studies.json       the two deep case studies
  posts.json              the 2026 essays
  archive.json            the 2013–2025 archive (generated)
  evidence.json           metrics, recognition, milestones, document pack
  social.json             bios per channel, LinkedIn pins, posting calendar

src/
  build.mjs               the builder
  lib/
    data.mjs              loading and content validation
    layout.mjs            the HTML shell
    pages.mjs             every page renderer
    html.mjs              escaping and formatting primitives
    markdown.mjs          a small dependency-free Markdown renderer
  assets/
    styles.css            design tokens and every component
    app.js                theme toggle and copy-to-clipboard
    vendor/htmx.min.js    htmx 2.0.11, vendored

scripts/
  build.mjs               entry point
  refresh-metrics.mjs     GitHub API -> content/evidence.json
  build-archive.mjs       TechLiaison repo -> content/archive.json
  check.mjs               link, leak and metadata checks

dist/                     build output — published to GitHub Pages
```

### URL map

| URL | Source | What it is |
| --- | --- | --- |
| `/` | `profile.json`, `projects.json` | The landing view and the three pillars |
| `/products/` | `projects.json` | Both tools, with the technology filter |
| `/products/ci-kit/` | `case-studies.json` | Case study 01 — the build that never ran |
| `/products/api-mock-services/` | `case-studies.json` | Case study 02 — 250 MB and four containers |
| `/blog/` | `posts.json` | The 2026 essays, with the topic filter |
| `/blog/<slug>/` | `posts.json` | One essay |
| `/archive/` | `archive.json` | The 2013–2025 archive, dated and unchanged |
| `/evidence/` | `evidence.json` | The Open Source Impact dashboard |
| `/endorsement/` | `evidence.json` | Every claim mapped to what supports it |
| `/media-kit/` | `social.json` | Printable one-pager and copy-ready bios |
| `/feed.xml`, `/sitemap.xml`, `/robots.txt` | generated | Feeds and metadata |
| `/partials/*` | generated | htmx fragments for the filters |

---

## Where it lives

**Live now:** <https://omeiza-workspace.github.io/>

| | |
| --- | --- |
| Repository | `omeiza-workspace/omeiza-workspace.github.io` |
| Published from | `main`, via `.github/workflows/pages.yml` |
| Build | `npm run build` → `dist/`, uploaded as a Pages artifact |
| Preview build type | `workflow` (GitHub Actions) — **not** the legacy branch/`/` source |

The repository is the **user site**, which is why the site is served at the
root of `omeiza-workspace.github.io` rather than under a project path. That
matters for a portfolio: the URL a panel writes down is the shortest one
available.

### Moving to `omeiza.dev`

The domain is registered but has no DNS records yet, so the canonical origin
is currently the `github.io` address. To move, in this order:

1. Point the domain at GitHub. For an apex domain:

   ```
   omeiza.dev.            300  IN  A     192.30.252.153
   omeiza.dev.            300  IN  A     192.30.252.154
   www.omeiza.dev.        300  IN  CNAME omeiza-workspace.github.io.
   ```

2. Add a `CNAME` file containing `omeiza.dev` to the repository root and push.
   GitHub provisions the certificate and serves the apex from this same repo.
3. Change `url` in `content/site.json` to `https://omeiza.dev` and the
   `Sitemap:` line in `src/build.mjs` to match. The canonical links, Open
   Graph URLs, the sitemap and the RSS feed all follow from those two lines.
4. Set **Enforce HTTPS** on under **Settings → Pages**.

> Do not add the `CNAME` before step 1. GitHub will try to provision a
> certificate for a domain that does not point at it, and the site stops
> serving — including on the `github.io` address.

### Setting the profile fields

The GitHub profile **bio** and **website** are set in the profile settings, not
in the repository. The website field should point at the live site; the bio is
one line, for example:

```
Open Source Architect — CI Kit & api-mock-services. Deterministic CI gates,
zero-dependency mocks for payment APIs, and every number published with how
it was measured.
```


### Domain note

For an endorsement application, a custom domain reads considerably better than
`username.github.io`: it signals a practice rather than a side project. Keep the
`github.io` address working as a redirect.

---

## Editing the site

Everything is JSON. A few examples:

**Add an essay** — append to `content/posts.json`:

```json
{
  "slug": "my-new-essay",
  "title": "My new essay",
  "dek": "One paragraph that makes someone want to read it.",
  "date": "2026-11-04",
  "readingTime": "6 min read",
  "channel": "Essay",
  "tags": ["CI/CD", "Tooling"],
  "featured": false,
  "body": "## A heading\n\nMarkdown, with **bold**, `code`, lists and tables."
}
```

The build creates `/blog/my-new-essay/`, adds it to the RSS feed, the sitemap,
the topic filter and the archive. Nothing else to touch.

**Update a measurement** — edit `content/evidence.json`, then run
`npm run metrics` to pull the live GitHub numbers.

**Change the bio on one channel** — `content/social.json` → `bios`. The media
kit, the copy buttons and the LinkedIn calendar all read from there.

---

## Before publishing: the outstanding items

The site is complete. These are the things it cannot do for you, and they
matter more than any copy change.

- [ ] **Publish `@bytesickle/api-mock-services` to npm.** The badge in the
      project README currently points at a package that does not exist.
      `npm publish --access public` from the repository, after logging in to
      the `@bytesickle` scope.
- [ ] **Archive the template and fork repositories.** The GitHub profile lists
      `astro-platform-starter` four times, plus `next.js`, `node`, `bolt.diy`,
      `prefect` and a tailwind of starters. A panel scanning that sees a
      template farm, not a maintainer. Keep `ci-kit`, `api-mock-services`,
      `homebrew-tap`, `TechLiaison` and this repository.
- [ ] **Write the README of this repository** to match the site, so the two
      landing pages a panel might read agree with each other.
- [ ] **Reconcile one measurement.** `ci-kit/docs/EVIDENCE.md` reports the mock
      engine answering its first request in **465 ms**; the
      `api-mock-services` README reports **1.4 s** for the same comparison. The
      site quotes 1.4 s. Fix the other document, or state the conditions
      differently in each.
- [ ] **Say the npm scope out loud.** The package is `@bytesickle/…`, not
      `@omeiza-workspace/…`, while the repositories are under `omeiza-workspace`.
      A panel may read that as two different authors. Either publish under a
      consistent scope or explain the relationship in the README.
- [ ] **Get the first external contributor or adopter.** The adopter list is a
      file in the repository and grows by pull request. One real row is worth
      more than a page describing how adoption works.
- [ ] **Archive the remaining template repositories.** `astro-platform-starter`
      has been replaced by this site. The siblings — `astro-platform-starter-971e3`,
      `-d8c27`, `-6a66f`, plus the `next.js`, `node`, `bolt.diy` and `prefect`
      copies — are still on the profile and still read as a template farm.
- [ ] **Set the GitHub profile bio and website.** The profile README is done;
      the two fields above it are set in the profile settings.

---

## Content licence

Site content is CC BY 4.0. Code samples and the build script are MIT.
The two projects are MIT licensed and live in their own repositories.
