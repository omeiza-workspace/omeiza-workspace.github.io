/**
 * Live GitHub counters for the evidence hub.
 *
 * The four counters that change from day to day — stars, forks, external
 * contributors and followers — are fetched from the public GitHub API in
 * the browser, so the page shows the numbers as they are rather than as
 * they were when the site was last built.
 *
 * The API answers cross-origin requests for public data, so this needs no
 * token and no server. It is rate limited per address, so the result is
 * cached in sessionStorage for a quarter of an hour.
 *
 * If the request fails — offline, or the rate limit spent — the figures
 * rendered by the build are left in place. The page degrades to the
 * snapshot, never to a blank.
 */

(function () {
  'use strict';

  const USERNAME = 'omeiza-workspace';
  const CACHE_KEY = 'gh-metrics';
  const CACHE_MS = 15 * 60 * 1000;
  const API = 'https://api.github.com';

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at > CACHE_MS) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    } catch (e) {
      /* private mode — the next visit refetches, which is fine */
    }
  }

  function paint(data) {
    for (const [key, value] of Object.entries(data)) {
      const card = document.querySelector(`[data-live="${key}"]`);
      if (!card) continue;
      const target = card.querySelector('[data-live-value]');
      if (target) target.textContent = value.toLocaleString('en-GB');
    }
    document.documentElement.setAttribute('data-metrics-live', 'true');
  }

  async function collect() {
    const [profile, repos] = await Promise.all([
      fetch(`${API}/users/${USERNAME}`, { headers: { Accept: 'application/vnd.github+json' } }).then((r) => {
        if (!r.ok) throw new Error(`profile ${r.status}`);
        return r.json();
      }),
      fetch(`${API}/users/${USERNAME}/repos?per_page=100&type=owner`, {
        headers: { Accept: 'application/vnd.github+json' },
      }).then((r) => {
        if (!r.ok) throw new Error(`repos ${r.status}`);
        return r.json();
      }),
    ]);

    const counted = new Set(
      (document.querySelector('[data-count-repos]')?.getAttribute('data-count-repos') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

    // The counters describe the projects this site is about, not the whole
    // account — which also holds forks of other people's repositories.
    const scoped = counted.size
      ? repos.filter((r) => counted.has(r.name) && !r.fork)
      : repos.filter((r) => !r.fork);

    const stars = scoped.reduce((total, r) => total + (r.stargazers_count || 0), 0);
    const forks = scoped.reduce((total, r) => total + (r.forks_count || 0), 0);

    // External contributors: everyone who appears in a commit to those
    // projects, except the account owner.
    const contributors = new Set();
    for (const repo of scoped) {
      try {
        const res = await fetch(`${API}/repos/${repo.full_name}/contributors?per_page=100`, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) continue;
        const list = await res.json();
        if (!Array.isArray(list)) continue;
        for (const c of list) {
          if (c && c.login && c.login.toLowerCase() !== USERNAME.toLowerCase()) contributors.add(c.login);
        }
      } catch (e) {
        /* one repository failing is not a reason to give up on the rest */
      }
    }

    return { stars, forks, followers: profile.followers || 0, contributors: contributors.size };
  }

  async function refresh(force) {
    if (!force) {
      const cached = readCache();
      if (cached) {
        paint(cached);
        return cached;
      }
    }
    try {
      const data = await collect();
      writeCache(data);
      paint(data);
      return data;
    } catch (e) {
      // Leave the built figures in place. A snapshot is better than a blank.
      document.documentElement.setAttribute('data-metrics-live', 'stale');
      return null;
    }
  }

  // Paint on load if the evidence hub is on the page.
  if (document.querySelector('[data-live]')) {
    refresh(false);
  }

  // The reload button asks for a fresh reading.
  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-live-refresh]');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Reading…';
    refresh(true).finally(function () {
      button.disabled = false;
      button.textContent = 'Reload counters';
    });
  });

  window.__refreshLiveMetrics = refresh;
})();
