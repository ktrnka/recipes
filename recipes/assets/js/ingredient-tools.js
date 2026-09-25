// Weight/volume toggle and scaling for recipe ingredient lists.
// Needs units.js and window.INGREDIENTS_URL (set in the cook-mode layout).
(function () {
  const U = window.RecipeUnits;
  const STORE_KEY = 'recipes.units.mode';

  function load(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode etc. */ }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    Object.assign(e, attrs || {});
    (children || []).forEach(c => e.append(c));
    return e;
  }

  async function init() {
    const spans = [...document.querySelectorAll('.ingredients .ing-text')];
    if (!spans.length) return;
    let data;
    try {
      data = await (await fetch(window.INGREDIENTS_URL)).json();
    } catch (e) {
      console.error('Could not load ingredient densities', e);
      return;
    }
    const ingredients = U.prepareIngredients(data);
    const lines = spans.map(span => ({ span, parsed: U.parseLine(span.dataset.original, ingredients) }));
    // ?units=weight&scale=2 overrides the remembered mode (handy for links and screenshots).
    const params = new URLSearchParams(location.search);
    const state = { mode: params.get('units') || load(STORE_KEY, 'original'), scale: parseFloat(params.get('scale')) || 1 };

    // ---- Controls ----
    const modeButtons = ['original', 'weight', 'volume'].map(mode =>
      el('button', { type: 'button', textContent: { original: 'As written', weight: 'Weights', volume: 'Volumes' }[mode], className: 'ing-btn', onclick: () => { state.mode = mode; save(STORE_KEY, mode); update(); } }));
    modeButtons.forEach((b, i) => { b.dataset.mode = ['original', 'weight', 'volume'][i]; });

    const scaleButtons = [0.5, 1, 2].map(x =>
      el('button', { type: 'button', textContent: `${x === 0.5 ? '½' : x}×`, className: 'ing-btn', onclick: () => { state.scale = x; scaleInput.value = ''; update(); } }));
    scaleButtons.forEach((b, i) => { b.dataset.scale = [0.5, 1, 2][i]; });
    const scaleInput = el('input', { type: 'number', min: '0', step: 'any', placeholder: 'other', className: 'ing-scale-input', title: 'Scale factor' });
    scaleInput.addEventListener('input', () => { const v = parseFloat(scaleInput.value); if (v > 0) { state.scale = v; update(); } });

    // "Scale to what I have": pick a line with an amount, enter how much you have.
    const scalable = lines.filter(l => l.parsed.qty);
    const haveLine = el('select', { className: 'ing-have-line' }, [el('option', { value: '', textContent: 'pick an ingredient…' })].concat(
      scalable.map((l, i) => el('option', { value: String(i), textContent: l.parsed.text.length > 40 ? l.parsed.text.slice(0, 40) + '…' : l.parsed.text }))));
    const haveAmount = el('input', { type: 'text', inputMode: 'decimal', placeholder: 'amount', className: 'ing-have-amount', size: 6 });
    const haveUnit = el('select', { className: 'ing-have-unit' }, ['g', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'count'].map(u => el('option', { value: u, textContent: u })));
    const haveNote = el('span', { className: 'ing-have-note' });
    haveLine.addEventListener('change', () => {
      const l = scalable[+haveLine.value];
      if (l) haveUnit.value = l.parsed.unit && l.parsed.unit !== 'stick' && l.parsed.unit !== 'kg' ? l.parsed.unit : (l.parsed.dim === 'count' ? 'count' : 'g');
      applyHave();
    });
    haveAmount.addEventListener('input', applyHave);
    haveUnit.addEventListener('change', applyHave);

    function applyHave() {
      haveNote.textContent = '';
      const l = scalable[+haveLine.value];
      const amount = U.parseNumber(haveAmount.value || '');
      if (!l || !(amount > 0)) return;
      const p = l.parsed, unit = haveUnit.value;
      let factor = null;
      if (unit === 'count' || p.dim === 'count') {
        if (unit === 'count' && p.dim === 'count') factor = amount / p.qty.lo;
      } else if (unit === p.unit) {
        factor = amount / p.qty.lo;
      } else {
        const have = U.toGrams(amount, unit, p.ingredient);
        const need = U.toGrams(p.qty.lo, p.unit, p.ingredient);
        if (have != null && need != null) factor = have / need;
      }
      if (factor == null) { haveNote.textContent = "can't compare those units for this ingredient"; return; }
      state.scale = factor;
      scaleInput.value = String(Math.round(factor * 100) / 100);
      haveNote.textContent = `→ ${Math.round(factor * 100) / 100}×`;
      update();
    }

    const bar = el('div', { className: 'ing-tools' }, [
      el('div', { className: 'ing-row' }, [el('span', { className: 'ing-label', textContent: 'Units' }), ...modeButtons]),
      el('div', { className: 'ing-row' }, [el('span', { className: 'ing-label', textContent: 'Scale' }), ...scaleButtons, scaleInput]),
      el('div', { className: 'ing-row' }, [el('span', { className: 'ing-label', textContent: 'I have' }), haveAmount, haveUnit, el('span', { textContent: 'of' }), haveLine, haveNote]),
    ]);
    // Right under the "Ingredients" heading, above any sub-section headings like "Dough".
    let anchor = document.querySelector('.ingredients');
    for (let e = anchor.previousElementSibling; e; e = e.previousElementSibling) {
      if (e.tagName === 'H2') { anchor = e.nextElementSibling; break; }
      if (/^H[3-6]$/.test(e.tagName)) anchor = e;
    }
    anchor.parentNode.insertBefore(bar, anchor);

    function update() {
      modeButtons.forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
      scaleButtons.forEach(b => b.classList.toggle('on', +b.dataset.scale === state.scale));
      for (const { span, parsed } of lines) {
        const r = U.render(parsed, state.mode, state.scale);
        if (!r.changed) { span.textContent = parsed.text; continue; }
        const lead = parsed.text.slice(0, parsed.start);
        span.innerHTML = `${escapeHtml(lead)}<strong class="ing-amount">${escapeHtml(r.amount)}</strong>${escapeHtml(r.rest)} <span class="ing-orig">(${escapeHtml(r.original)})</span>`;
      }
    }
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
