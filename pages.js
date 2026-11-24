'use strict';
/* History, Settings and Guide pages */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { store, settings: S } = UC;
  const openInCalc = expr => { store.set('uc.pending', { expr }); location.href = 'index.html'; };

  function initHistory() {
    let list = UC.history.load(), q = '';
    const ul = $('#hgrid'), state = $('#hstate'), count = $('#hcount');
    const render = () => {
      ul.textContent = '';
      const f = list.filter(h => `${h.expr} ${h.text}`.toLowerCase().includes(q));
      count.textContent = `${list.length} saved calculation${list.length === 1 ? '' : 's'}`;
      state.hidden = f.length > 0;
      state.innerHTML = list.length ? 'No calculations match your search.' : 'Nothing here yet. <a href="index.html">Open the calculator</a> and press = to save a calculation.';
      f.forEach(h => {
        const li = document.createElement('li'); li.className = 'hcard glass';
        li.innerHTML = '<time></time><div class="e"></div><div class="r"></div><div class="b"><button class="btn primary" data-a="open">Open</button><button class="btn" data-a="copy">Copy</button><button class="btn danger" data-a="del">Delete</button></div>';
        li.children[0].textContent = new Date(Math.floor(h.id)).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        li.children[1].textContent = h.expr; li.children[2].textContent = '= ' + h.text;
        li.onclick = async e => {
          const a = e.target.closest('button')?.dataset.a;
          if (a === 'open') openInCalc(h.expr);
          else if (a === 'copy') { try { await navigator.clipboard.writeText(h.text); UC.toast('Copied ' + h.text); } catch { UC.toast('Copy is not available here'); } }
          else if (a === 'del') { list = list.filter(x => x.id !== h.id); UC.history.save(list); render(); }
        };
        ul.append(li);
      });
    };
    $('#hsearch').oninput = e => { q = e.target.value.trim().toLowerCase(); render(); };
    $('#hclear').onclick = () => { if (list.length && confirm('Delete all saved calculations?')) { list = []; UC.history.save(list); render(); } };
    $('#hexport').onclick = () => {
      if (!list.length) return UC.toast('Nothing to export yet');
      const csv = 'expression,result\n' + list.map(h => `"${h.expr.replace(/"/g, '""')}","${h.text}"`).join('\n');
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'calculator-history.csv' });
      a.click(); URL.revokeObjectURL(a.href); UC.toast('History exported');
    };
    render();
  }

  function initSettings() {
    const sync = () => $$('[data-key]').forEach(c => {
      const k = c.dataset.key;
      if (c.classList.contains('seg')) c.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.val === String(S[k])));
      else if (c.type === 'checkbox') c.checked = !!S[k]; else c.value = S[k];
    });
    const changed = k => {
      if (k === 'saveHist') { if (S.saveHist) UC.history.save([]); else store.set('uc.history', []); }
      UC.save(); UC.applyTheme(); sync(); UC.toast('Saved');
    };
    $$('.seg[data-key] button').forEach(b => b.onclick = () => { const k = b.parentElement.dataset.key; S[k] = b.dataset.val; changed(k); });
    $$('select[data-key]').forEach(s => s.onchange = () => { S[s.dataset.key] = +s.value; changed(s.dataset.key); });
    $$('input[data-key]').forEach(i => i.onchange = () => { S[i.dataset.key] = i.checked; changed(i.dataset.key); });
    $('#clearData').onclick = () => { if (confirm('Delete all saved calculations?')) { store.set('uc.history', []); UC.toast('History cleared'); } };
    $('#resetAll').onclick = () => { if (confirm('Reset every setting to its default?')) { Object.assign(S, UC.defaults); changed('theme'); } };
    sync();
  }

  function initGuide() {
    const deg = () => S.angle === 'deg';
    $$('.ex').forEach(b => {
      let r; try { r = Engine.format(Engine.evaluate(b.dataset.expr, { deg: true }), 12); } catch { r = '–'; }
      b.innerHTML = '<span></span><span class="eq">=</span><output></output>';
      b.children[0].textContent = b.dataset.expr; b.children[2].textContent = r;
      b.title = 'Open in calculator'; b.onclick = () => openInCalc(b.dataset.expr);
    });
    $('#gsearch').oninput = e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.fcard').forEach(c => { c.hidden = !!q && !c.textContent.toLowerCase().includes(q); });
    };
    const inp = $('#tryIn'), out = $('#tryOut');
    inp.oninput = () => {
      out.className = ''; if (!inp.value.trim()) { out.textContent = ''; return; }
      try { const v = Engine.evaluate(inp.value, { deg: deg() }); out.textContent = v === null ? '' : '= ' + Engine.format(v, S.precision); }
      catch (e) { out.className = 'err'; out.textContent = e instanceof Engine.CalcError ? e.message : 'Something went wrong'; }
    };
    $('#tryAngle').textContent = deg() ? 'Degrees' : 'Radians';
  }

  UC.initChrome();
  ({ history: initHistory, settings: initSettings, guide: initGuide })[document.body.dataset.page]?.();
})();
