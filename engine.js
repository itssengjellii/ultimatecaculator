'use strict';
/* ============ Math engine: tokenizer + recursive-descent parser (no eval) ============ */
const Engine = (() => {
  class CalcError extends Error {}
  const clean = x => (Number.isFinite(x) ? parseFloat(x.toPrecision(15)) : x);
  const tidy = x => (Math.abs(x) < 1e-15 ? 0 : clean(x));
  const FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'log', 'ln', 'exp'];
  const OPS = { '+': '+', '-': '-', '−': '-', '–': '-', '*': '*', '×': '*', '/': '/', '÷': '/', '^': '^' };

  function tokenize(src, ans) {
    const s = src.replace(/\s+/g, '');
    const out = []; let i = 0, depth = 0;
    while (i < s.length) {
      const rest = s.slice(i), c = s[i];
      let m;
      if ((m = rest.match(/^(\d+\.?\d*|\.\d+)(?:[eE][+-−]?\d+)?/))) {
        out.push({ t: 'num', v: parseFloat(m[0].replace('−', '-')) }); i += m[0].length;
      } else if (OPS[c]) { out.push({ t: 'op', v: OPS[c] }); i++; }
      else if (c === '(') { depth++; out.push({ t: '(' }); i++; }
      else if (c === ')') { if (--depth < 0) throw new CalcError('Unmatched closing parenthesis'); out.push({ t: ')' }); i++; }
      else if (c === '!' || c === '%') { out.push({ t: 'post', v: c }); i++; }
      else if (c === 'π') { out.push({ t: 'num', v: Math.PI }); i++; }
      else if (c === '√') { out.push({ t: 'fn', v: 'sqrt' }); i++; }
      else if (c === '∛') { out.push({ t: 'fn', v: 'cbrt' }); i++; }
      else if ((m = rest.match(/^[a-zA-Z]+/))) {
        const w = m[0].toLowerCase(); i += m[0].length;
        if (w === 'pi') out.push({ t: 'num', v: Math.PI });
        else if (w === 'e') out.push({ t: 'num', v: Math.E });
        else if (w === 'ans') out.push({ t: 'num', v: ans || 0 });
        else if (FUNCS.includes(w)) out.push({ t: 'fn', v: w });
        else throw new CalcError(`Unknown name “${m[0]}”`);
      } else throw new CalcError(`Unexpected character “${c}”`);
    }
    while (depth-- > 0) out.push({ t: ')' }); // auto-close parentheses
    return out;
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) throw new CalcError('Factorial needs a whole number ≥ 0');
    if (n > 170) throw new CalcError('Result too large (max 170!)');
    let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
  }

  function parse(tokens, deg) {
    let p = 0, pct = false;
    const peek = () => tokens[p];
    const isOp = (...v) => peek() && peek().t === 'op' && v.includes(peek().v);
    const toRad = x => (deg ? x * Math.PI / 180 : x);
    const fromRad = x => tidy(deg ? x * 180 / Math.PI : x);
    const chk = x => {
      if (Number.isNaN(x)) throw new CalcError('Result is not a real number');
      if (!Number.isFinite(x)) throw new CalcError('Result too large');
      return x;
    };
    const FN = {
      sin: x => tidy(Math.sin(toRad(x))), cos: x => tidy(Math.cos(toRad(x))),
      tan: x => { const c = Math.cos(toRad(x)); if (Math.abs(c) < 1e-15) throw new CalcError('tan is undefined here'); return tidy(Math.tan(toRad(x))); },
      asin: x => { if (Math.abs(x) > 1) throw new CalcError('sin⁻¹ needs a value from −1 to 1'); return fromRad(Math.asin(x)); },
      acos: x => { if (Math.abs(x) > 1) throw new CalcError('cos⁻¹ needs a value from −1 to 1'); return fromRad(Math.acos(x)); },
      atan: x => fromRad(Math.atan(x)),
      sqrt: x => { if (x < 0) throw new CalcError('Square root of a negative number'); return clean(Math.sqrt(x)); },
      cbrt: x => clean(Math.cbrt(x)), abs: Math.abs, exp: x => clean(Math.exp(x)),
      log: x => { if (x <= 0) throw new CalcError('log needs a positive number'); return clean(Math.log10(x)); },
      ln: x => { if (x <= 0) throw new CalcError('ln needs a positive number'); return clean(Math.log(x)); },
    };

    function expr() {
      let l = term();
      while (isOp('+', '-')) {
        const op = tokens[p++].v, r = term(), rr = pct ? l * r : r; // 50 + 10% = 55
        l = chk(clean(op === '+' ? l + rr : l - rr)); pct = false;
      }
      return l;
    }
    function term() {
      pct = false;
      let l = unary();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (isOp('*', '/')) {
          const op = tokens[p++].v, r = unary();
          if (op === '/' && r === 0) throw new CalcError('Cannot divide by zero');
          l = chk(clean(op === '*' ? l * r : l / r));
        } else if (t.t === 'num' || t.t === 'fn' || t.t === '(') l = chk(clean(l * unary())); // implicit ×
        else break;
        pct = false;
      }
      return l;
    }
    function unary() {
      if (isOp('-')) { p++; return -unary(); }
      if (isOp('+')) { p++; return unary(); }
      return power();
    }
    function power() {
      const b = postfix();
      if (isOp('^')) {
        p++; const e = unary(); pct = false;
        if (b === 0 && e < 0) throw new CalcError('Cannot divide by zero');
        return chk(clean(Math.pow(b, e)));
      }
      return b;
    }
    function postfix() {
      let v = primary();
      while (peek() && peek().t === 'post') {
        if (tokens[p++].v === '!') { v = factorial(v); pct = false; } else { v = clean(v / 100); pct = true; }
      }
      return v;
    }
    function primary() {
      const t = tokens[p++];
      if (!t || t.t === ')') throw new CalcError('Incomplete expression');
      if (t.t === 'num') return t.v;
      if (t.t === '(') {
        const v = expr();
        if (!peek() || peek().t !== ')') throw new CalcError('Invalid expression');
        p++; pct = false; return v;
      }
      if (t.t === 'fn') {
        const nt = peek();
        let arg;
        if (nt && nt.t === '(') { p++; arg = expr(); if (!peek() || peek().t !== ')') throw new CalcError('Invalid expression'); p++; }
        else arg = power(); // allows "√9" and "sin30"
        pct = false;
        return chk(FN[t.v](arg));
      }
      throw new CalcError('Invalid expression');
    }

    if (!tokens.length) return null;
    const v = expr();
    if (p < tokens.length) throw new CalcError('Invalid expression');
    return v;
  }

  const evaluate = (src, { deg = true, ans = 0 } = {}) => parse(tokenize(src, ans), deg);

  function format(x, prec = 12) {
    if (x === 0 || Object.is(x, -0)) return '0';
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-9) return x.toExponential(Math.min(prec, 15) - 1).replace(/\.?0+e/, 'e');
    return String(parseFloat(x.toPrecision(prec)));
  }
  function toFraction(x, maxDen = 10000) {
    if (!Number.isFinite(x) || Number.isInteger(x)) return null;
    const sign = x < 0 ? '-' : '', v = Math.abs(x);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = v;
    for (let i = 0; i < 32; i++) {
      const a = Math.floor(b), h = a * h1 + h0, k = a * k1 + k0;
      if (k > maxDen) break;
      h0 = h1; h1 = h; k0 = k1; k1 = k;
      if (Math.abs(v - h1 / k1) < 1e-10 * Math.max(1, v)) return `${sign}${h1}/${k1}`;
      if (b === a) break; b = 1 / (b - a);
    }
    return null;
  }
  return { evaluate, format, toFraction, CalcError };
})();

if (typeof module !== 'undefined') module.exports = { Engine };
