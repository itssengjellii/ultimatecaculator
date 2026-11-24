'use strict';
/* Calculator page: keypad, display, keyboard, history sidebar */
if (typeof document !== 'undefined') (() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { store, settings } = UC;
  let history = UC.history.load();
  const st = { expr: '', done: false, error: null, ans: 0, preview: '' };
  const el = { expr: $('#exprLine'), res: $('#resultLine'), calc: $('#calc'), toast: $('#toast') };
  const BIN = '+−×÷^';

  const show = v => (settings.frac && Engine.toFraction(v)) || Engine.format(v, settings.precision);
  const plain = v => { // numeric text that can be placed back into an expression
    const s = Engine.format(v, 15).replace('e+', 'E').replace('e-', 'E-');
    return v < 0 ? `(−${s.slice(1)})` : s;
  };
  const run = e => Engine.evaluate(e, { deg: settings.angle === 'deg', ans: st.ans });

  function render() {
    el.expr.textContent = st.expr + (st.done ? ' =' : '');
    el.expr.scrollLeft = el.expr.scrollWidth;
    el.res.className = 'result';
    let txt = '0';
    if (st.error) { txt = st.error; el.res.classList.add('err'); }
    else if (st.done) { txt = st.preview; el.res.classList.add('final'); }
    else if (st.expr) txt = st.preview || '\u00a0';
    el.res.textContent = txt;
    const n = txt.length, w = window.innerWidth < 480 ? 2.7 : 3.3;
    el.res.style.fontSize = st.error ? '' : `${Math.max(1.5, w - Math.max(0, n - 9) * 0.13)}rem`;
  }
  function updatePreview() {
    st.preview = '';
    if (!st.expr || st.done) return;
    try { const v = run(st.expr); if (v !== null && String(show(v)) !== st.expr) st.preview = show(v); } catch { /* incomplete input: stay quiet */ }
  }

  function press(str) {
    if (st.done) {
      if ('+−×÷^!%'.includes(str[0])) st.expr = plain(st.ans); else st.expr = '';
      st.done = false;
    }
    st.error = null;
    let e = st.expr;
    const endsOperand = /(?:[\d.)!%πe]|Ans)$/.test(e);
    if (e.length > 400) return;
    if (['+', '×', '÷', '^'].includes(str)) {
      const base = e.replace(/[+−×÷^]+$/, '');
      if (!base || base.endsWith('(') || /E$/.test(base)) return;
      e = base + str;
    } else if (str === '−') {
      e = /[+−]$/.test(e) ? e.slice(0, -1) + '−' : e + '−';
    } else if (str[0] === '^') {
      if (!endsOperand) return; e += str;
    } else if (str === '!' || str === '%') {
      if (!endsOperand) return; e += str;
    } else if (str === 'E') {
      if (!/\d$/.test(e) || /[\d.]*E[\d]*$/.test(e)) return; e += 'E';
    } else if (str === '.') {
      const seg = e.match(/[\d.E]*$/)[0];
      if (seg.includes('.') || seg.includes('E')) return;
      e += seg ? '.' : '0.';
    } else if (/^\d$/.test(str)) {
      e = /(?:^|[^\d.])0$/.test(e) ? e.slice(0, -1) + str : e + str;
    } else if (str === ')') {
      const open = (e.match(/\(/g) || []).length - (e.match(/\)/g) || []).length;
      if (open <= 0 || /[(+−×÷^]$/.test(e)) return; e += ')';
    } else e += str;
    st.expr = e; updatePreview(); render();
  }
  function del() {
    st.done = false; st.error = null;
    st.expr = st.expr.replace(/(?:asin|acos|atan|sin|cos|tan|log|ln|abs|exp)\($|Ans$|.$/u, '');
    updatePreview(); render();
  }
  function clear() { Object.assign(st, { expr: '', done: false, error: null, preview: '' }); render(); }
  function equals() {
    if (!st.expr || st.done) return;
    try {
      const v = run(st.expr);
      if (v === null) return;
      st.ans = v; st.done = true; st.preview = show(v);
      history.unshift({ id: Date.now() + Math.random(), expr: st.expr, text: st.preview, value: v });
      history = history.slice(0, 100); saveHistory(); renderHistory();
    } catch (err) {
      st.error = err instanceof Engine.CalcError ? err.message : 'Something went wrong'; st.done = false;
    }
    render();
  }
  function negate() {
    if (st.done) { st.expr = plain(-st.ans); st.done = false; }
    else if (!st.expr) st.expr = '−';
    else {
      const m = st.expr.match(/\(−(\d[\d.]*(?:E[+−-]?\d+)?)\)$/);
      if (m) st.expr = st.expr.slice(0, -m[0].length) + m[1];
      else {
        const n = st.expr.match(/(\d[\d.]*(?:E[+−-]?\d+)?|Ans|π|e)$/);
        if (n) st.expr = st.expr.slice(0, -n[0].length) + `(−${n[0]})`;
      }
    }
    st.error = null; updatePreview(); render();
  }

  /* history */
  function saveHistory() { UC.history.save(history); }
  function renderHistory() {
    const ul = $('#historyList'); ul.textContent = '';
    if (!history.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = 'No calculations yet. Press = to save one here.'; ul.append(li); return;
    }
    history.forEach(h => {
      const li = document.createElement('li'); li.title = 'Use this result';
      li.innerHTML = '<div class="h-expr"></div><div class="h-res"></div><div class="h-btns"><button class="edit">Edit</button><button class="del">Delete</button></div>';
      li.children[0].textContent = h.expr + ' ='; li.children[1].textContent = h.text;
      li.onclick = e => {
        if (e.target.closest('.del')) { history = history.filter(x => x.id !== h.id); saveHistory(); renderHistory(); }
        else if (e.target.closest('.edit')) { Object.assign(st, { expr: h.expr, done: false, error: null }); updatePreview(); render(); closeHistory(); }
        else { if (st.done) st.expr = ''; st.done = false; press(plain(h.value)); closeHistory(); }
      };
      ul.append(li);
    });
  }
  const closeHistory = () => $('#historyPanel').classList.remove('open');

  /* ui helpers */
  const toast = UC.toast;
  async function copy() {
    const text = st.error ? '' : (st.done || st.preview ? Engine.format(st.ans, 15) : '');
    const t = st.done ? Engine.format(st.ans, 15) : (st.preview ? (() => { try { return Engine.format(run(st.expr), 15); } catch { return ''; } })() : '');
    if (!t) return toast('Nothing to copy yet');
    try { await navigator.clipboard.writeText(t); }
    catch { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove(); }
    toast(`Copied ${t}`);
  }
  function applySettings() {
    el.calc.dataset.mode = settings.mode;
    $$('.seg [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === settings.mode));
    $('#angleChip').textContent = settings.angle.toUpperCase();
    $('#fracChip').setAttribute('aria-pressed', settings.frac);
    UC.save();
    updatePreview();
    if (st.done) st.preview = show(st.ans);
    render();
  }
  const set = (k, v) => { settings[k] = v; applySettings(); };

  /* events */
  $('#keys').addEventListener('pointerdown', e => {
    const b = e.target.closest('.key'); if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--rx', `${e.clientX - r.left}px`); b.style.setProperty('--ry', `${e.clientY - r.top}px`);
  });
  $('#keys').addEventListener('click', e => {
    const b = e.target.closest('.key'); if (!b) return;
    if (b.dataset.ins) press(b.dataset.ins);
    else ({ clear, del, eq: equals, neg: negate })[b.dataset.act]();
  });
  $$('.seg [data-mode]').forEach(b => b.onclick = () => set('mode', b.dataset.mode));
  $('#angleChip').onclick = () => set('angle', settings.angle === 'deg' ? 'rad' : 'deg');
  $('#fracChip').onclick = () => set('frac', !settings.frac);
  $('#copyBtn').onclick = copy;
  $('#historyToggle').onclick = () => $('#historyPanel').classList.toggle('open');
  $('#closeHistory').onclick = closeHistory;
  $('#clearHistory').onclick = () => { history = []; saveHistory(); renderHistory(); toast('History cleared'); };

  const KEYS = { '*': '×', '/': '÷', '-': '−', 'x': '×', 'X': '×', ',': '.', 'p': 'π', 'e': 'e', 's': 'sin(', 'c': 'cos(', 't': 'tan(', 'l': 'log(', 'n': 'ln(', 'r': '√(', 'a': 'abs(', 'E': 'E' };
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key;
    if (/^[\d+^().!%]$/.test(k)) press(k);
    else if (KEYS[k]) press(KEYS[k]);
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') del();
    else if (k === 'Delete' || k === 'Escape') clear();
    else return;
    e.preventDefault();
  });
  document.addEventListener('copy', e => { if (!window.getSelection().toString() && (st.done || st.preview)) { e.preventDefault(); copy(); } });

  const pend = store.get('uc.pending', null);
  if (pend && pend.expr) { st.expr = pend.expr; updatePreview(); store.set('uc.pending', null); }
  UC.initChrome(); applySettings(); renderHistory();
})();
