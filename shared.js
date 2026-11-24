'use strict';
/* Shared by every page: storage, settings, theme, nav state, toasts */
const UC = (() => {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const defaults = { theme: 'dark', mode: 'standard', angle: 'deg', precision: 12, frac: false, saveHist: true };
  const settings = Object.assign({}, defaults, store.get('uc.settings', {}));
  const save = () => store.set('uc.settings', settings);
  const history = {
    load: () => (settings.saveHist ? store.get('uc.history', []) : []),
    save: list => { if (settings.saveHist) store.set('uc.history', list); },
  };
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme;
    const i = document.getElementById('themeIcon'), b = document.getElementById('themeToggle');
    if (i) i.innerHTML = settings.theme === 'dark' ? SUN : MOON;
    if (b) b.setAttribute('aria-label', settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  let tt;
  function toast(m) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function initChrome() {
    applyTheme();
    const tb = document.getElementById('themeToggle');
    if (tb) tb.onclick = () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.nav === document.body.dataset.page) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
    });
  }
  applyTheme();
  return { store, settings, defaults, save, history, toast, applyTheme, initChrome };
})();
