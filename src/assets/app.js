/**
 * Progressive enhancement only. The site is fully functional without this file.
 *
 *  - theme toggle (persisted in localStorage, with an OS-preference default)
 *  - copy-to-clipboard for the media kit bio blocks
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------- theme -- */

  const root = document.documentElement;
  const STORAGE_KEY = 'theme';

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function currentTheme() {
    return root.dataset.theme || systemTheme();
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* private mode — theme just will not persist */
    }
  }

  document.addEventListener('click', function (event) {
    const toggle = event.target.closest('[data-theme-toggle]');
    if (!toggle) return;
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  // Follow the OS only while the visitor has not chosen explicitly.
  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = function (e) {
      let stored = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch (err) {
        stored = null;
      }
      if (stored !== 'light' && stored !== 'dark') {
        root.dataset.theme = e.matches ? 'light' : 'dark';
      }
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }

  // Set the theme attribute on load so CSS custom properties resolve.
  if (!root.dataset.theme) root.dataset.theme = systemTheme();

  /* -------------------------------------------------------------- copy -- */

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for http:// origins and older browsers.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  document.addEventListener('click', async function (event) {
    const button = event.target.closest('[data-copy]');
    if (!button) return;

    const source = document.getElementById(button.getAttribute('data-copy'));
    if (!source) return;

    const ok = await copyText(source.textContent.trim());
    if (!ok) return;

    const original = button.textContent;
    button.textContent = 'Copied';
    button.classList.add('is-copied');
    window.setTimeout(function () {
      button.textContent = original;
      button.classList.remove('is-copied');
    }, 1600);
  });
})();
