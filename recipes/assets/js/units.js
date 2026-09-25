// Ingredient-line parsing and weight/volume conversion.
// Used by the recipe pages (via ingredient-tools.js), the converter page, and
// scripts/coverage.js (Node), so keep it free of DOM code.
(function (root) {
  // Volumes in US teaspoons, weights in grams.
  const VOLUME = { tsp: 1, tbsp: 3, cup: 48 };
  const WEIGHT = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };

  const UNIT_WORDS = [
    [/^(cups?|c\.?)$/i, 'cup'],
    [/^(tablespoons?|tbsps?|tbs|tbl|T)$/, 'tbsp'],
    [/^(tablespoons?|tbsps?|tbs|tbl)$/i, 'tbsp'],
    [/^(teaspoons?|tsps?|t)$/, 'tsp'],
    [/^(teaspoons?|tsps?)$/i, 'tsp'],
    [/^(grams?|g|gr)$/i, 'g'],
    [/^(kilograms?|kg)$/i, 'kg'],
    [/^(ounces?|oz)$/i, 'oz'],
    [/^(pounds?|lbs?)$/i, 'lb'],
    [/^(sticks?)$/i, 'stick'],
  ];

  const UNICODE_FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };

  // One number: "1 1/2", "1/2", "1.5", "1½", "½"
  const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+(?:\.\d+)?|\.\d+)`;
  const UNIT = String.raw`(?:cups?|c\.?|tablespoons?|tbsps?|tbs|tbl|teaspoons?|tsps?|grams?|gr|g|kilograms?|kg|ounces?|oz|pounds?|lbs?|sticks?|T|t)`;
  // Optional hedge, number, optional range, optional unit (unit must end at a word boundary).
  // A trailing "+" ("3+ tbsp") is kept as part of the amount text.
  const LEAD = new RegExp(String.raw`^(\s*(?:\(optional\)\s*)?(?:about|approx\.?|approximately|roughly|~)?\s*)(${NUM})(?:\s*(?:-|–|to)\s*(${NUM}))?\+?(?:\s*(${UNIT})(?![A-Za-z]))?`, 'i');
  const PAREN = /\(([^)]*)\)/g;
  const AMOUNT = new RegExp(String.raw`(${NUM})\s*(${UNIT})(?![A-Za-z])`, 'gi');

  function parseNumber(s) {
    s = s.trim();
    let m;
    if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + m[2] / m[3];
    if ((m = s.match(/^(\d+)\/(\d+)$/))) return m[1] / m[2];
    if ((m = s.match(/^(\d*)([½⅓⅔¼¾⅛⅜⅝⅞])$/))) return (m[1] ? +m[1] : 0) + UNICODE_FRACTIONS[m[2]];
    return parseFloat(s);
  }

  function canonicalUnit(u) {
    if (!u) return null;
    for (const [re, name] of UNIT_WORDS) if (re.test(u)) return name;
    return null;
  }

  function dimension(unit) {
    if (unit in VOLUME) return 'volume';
    if (unit in WEIGHT) return 'weight';
    if (unit === 'stick') return 'stick';
    return null;
  }

  // ---- Ingredient matching ----

  function prepareIngredients(data) {
    return data.ingredients.map(ing => {
      const [amt, unit] = (ing.amount || '').split(/\s+/);
      const tsp = amt ? parseFloat(amt) * VOLUME[canonicalUnit(unit)] : null;
      return {
        ...ing,
        gramsPerTsp: tsp ? ing.grams / tsp : null,
        matchers: ing.match.map(phrase => ({
          phrase,
          words: phrase.toLowerCase().split(/\s+/).map(w => new RegExp(String.raw`\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i')),
        })),
      };
    });
  }

  // Earliest match wins; ties go to the longer phrase ("almond flour" beats "flour").
  function findIngredient(text, ingredients) {
    const clean = text.replace(/\([^)]*\)/g, m => ' '.repeat(m.length));
    let best = null;
    for (const ing of ingredients) {
      for (const { phrase, words } of ing.matchers) {
        let pos = -1, ok = true;
        for (const re of words) {
          const m = clean.match(re);
          if (!m) { ok = false; break; }
          if (pos === -1 || m.index < pos) pos = m.index;
        }
        if (!ok) continue;
        if (!best || pos < best.pos || (pos === best.pos && phrase.length > best.len)) best = { ing, pos, len: phrase.length };
      }
    }
    return best && best.ing;
  }

  // ---- Line parsing ----

  // Returns { text, qty: {lo, hi}, unit, dim, hedge, start, end, rest, ingredient, paren } or null fields.
  function parseLine(text, ingredients) {
    const out = { text, qty: null, unit: null, dim: null, ingredient: null, parenDims: new Set() };
    const m = text.match(LEAD);
    if (!m) {
      out.ingredient = findIngredient(text, ingredients);
      return out;
    }
    const lo = parseNumber(m[2]);
    const hi = m[3] ? parseNumber(m[3]) : null;
    const unit = canonicalUnit(m[4]);
    out.hedge = m[1] || '';
    out.qty = { lo, hi };
    out.unit = unit;
    out.dim = unit ? dimension(unit) : 'count';
    out.plus = m[0].includes('+') ? '+' : '';
    out.start = m[1].length;
    out.end = m[0].length;
    out.rest = text.slice(out.end);
    out.ingredient = findIngredient(out.rest, ingredients);
    // Dimensions the author already wrote in parentheses, e.g. "(5 oz, 1 stick + 2 tbsp)".
    out.parenDims = new Set();
    for (const p of out.rest.matchAll(PAREN)) {
      for (const a of p[1].matchAll(AMOUNT)) {
        const u = canonicalUnit(a[2]);
        if (u) out.parenDims.add(dimension(u));
      }
    }
    return out;
  }

  // ---- Conversion ----

  function toGrams(value, unit, ing) {
    if (unit in WEIGHT) return value * WEIGHT[unit];
    if (unit in VOLUME) return ing && ing.gramsPerTsp ? value * VOLUME[unit] * ing.gramsPerTsp : null;
    if (unit === 'stick') return ing && ing.each && ing.each.stick ? value * ing.each.stick : null;
    return null;
  }

  function toTsp(grams, ing) {
    return ing && ing.gramsPerTsp ? grams / ing.gramsPerTsp : null;
  }

  // ---- Formatting ----
  // Rounding rules (proposed; see review/REVIEW.md):
  //   grams: under 10 g to the nearest 0.5 g, under 100 g to 1 g, otherwise to 5 g
  //   volume: cups in quarters or thirds, then leftover tablespoons in halves;
  //           under 1/4 cup, tablespoons in halves; under 1 tbsp, teaspoons in eighths.

  function roundGrams(g) {
    if (g < 10) return Math.round(g * 2) / 2;
    if (g < 100) return Math.round(g);
    return Math.round(g / 5) * 5;
  }

  // `precise` (converter page): nearest 1 g, or 0.1 g under 10 g.
  function formatGrams(g, precise) {
    if (precise) return `${g < 10 ? Math.round(g * 10) / 10 : Math.round(g)} g`;
    return `${roundGrams(g)} g`;
  }

  const FRACTION_NAMES = [[0, ''], [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'], [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8']];

  function fractionText(x, allowed) {
    const whole = Math.floor(x + 1e-9);
    const frac = x - whole;
    let best = null;
    for (const [v, name] of FRACTION_NAMES) {
      if (!allowed.includes(v)) continue;
      if (!best || Math.abs(frac - v) < Math.abs(frac - best[0])) best = [v, name];
    }
    let w = whole, name = best[1];
    if (Math.abs(frac - 1) < Math.abs(frac - best[0])) { w += 1; name = ''; }
    if (w === 0 && !name) return '0';
    return [w || '', name].filter(Boolean).join(' ');
  }

  function roundTo(x, step) { return Math.round(x / step) * step; }

  function plural(n, unit) {
    if (unit === 'cup') return n > 1 ? 'cups' : 'cup';
    if (unit === 'stick') return n > 1 ? 'sticks' : 'stick';
    return unit;
  }

  // tsp -> "1 1/2 cups", "1/2 cup + 2 tbsp", "2 1/2 tbsp", "3/8 tsp"
  // `plain` skips the "+ tbsp" remainder (used for ranges).
  function formatVolume(tsp, plain) {
    const cupsParts = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
    if (plain && tsp >= 11.25) {
      const c = fractionText(tsp / 48, cupsParts);
      return `${c} ${plural(parseNumber(c), 'cup')}`;
    }
    if (tsp >= 11.25) {
      const cups = tsp / 48;
      const whole = Math.floor(cups);
      // Largest quarter/third at or below the amount, remainder in tablespoons.
      let base = whole;
      for (const f of cupsParts) if (whole + f <= cups + 1e-9 && whole + f > base) { base = whole + f; }
      let remTbsp = roundTo((cups - base) * 16, 0.5);
      if (remTbsp >= 1 && remTbsp <= 3) {
        const cupText = fractionText(base, cupsParts);
        return `${cupText} ${plural(base, 'cup')} + ${fractionText(remTbsp, [0, 1 / 2])} tbsp`;
      }
      const c = fractionText(cups, cupsParts);
      return `${c} ${plural(parseNumber(c), 'cup')}`;
    }
    if (tsp >= 3) {
      const tbsp = roundTo(tsp / 3, 0.5);
      return `${fractionText(tbsp, [0, 1 / 2])} tbsp`;
    }
    // Eighths under a teaspoon, quarters above (nobody measures 2 3/8 tsp).
    const t = tsp < 1 ? roundTo(tsp, 1 / 8) : roundTo(tsp, 1 / 4);
    if (t === 0) return 'pinch';
    return `${fractionText(t, [0, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8])} tsp`;
  }

  // Butter reads better in sticks + tablespoons.
  function formatButter(grams, ing) {
    const stick = ing.each.stick;
    const tbsp = roundTo(grams / (stick / 8), 0.5);
    if (tbsp < 4) return `${fractionText(tbsp, [0, 1 / 2])} tbsp`;
    const sticks = Math.floor(tbsp / 8 + 1e-9);
    const halfStick = tbsp - sticks * 8 >= 4 - 1e-9 && tbsp - sticks * 8 < 4.5 ? 0.5 : 0;
    if (halfStick) return `${sticks ? sticks + ' 1/2' : '1/2'} ${plural(sticks + 0.5, 'stick')}`;
    const left = tbsp - sticks * 8;
    const parts = [];
    if (sticks) parts.push(`${sticks} ${plural(sticks, 'stick')}`);
    if (left) parts.push(`${fractionText(left, [0, 1 / 2])} tbsp`);
    return parts.join(' + ');
  }

  function formatAmount(value, unit) {
    if (unit === 'g' || unit === 'kg') return formatGrams(toGrams(value, unit));
    const shown = Math.round(value * 1000) / 1000;
    const text = fractionText(shown, [0, 1 / 8, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8]);
    return unit ? `${text} ${plural(value, unit)}` : text;
  }

  // ---- Rewriting a parsed line for a display mode ----
  // mode: 'original' | 'weight' | 'volume'; scale: number
  // Returns { html-safe pieces } as { amount, rest, original, changed }.
  function render(parsed, mode, scale) {
    scale = scale || 1;
    const p = parsed;
    if (!p.qty) return { amount: null, rest: p.text, changed: false };
    const lo = p.qty.lo * scale;
    const hi = p.qty.hi != null ? p.qty.hi * scale : null;
    const ing = p.ingredient;
    const originalAmount = p.text.slice(p.start, p.end).trim();
    const hedge = p.hedge;

    // "500 g–530 g" -> "500–530 g"; "3 g" + "+" -> "3+ g"
    const fmtRange = f => (hi != null ? `${f(lo)}–${f(hi)}`.replace(/ ([a-z]+)–/, '–') : f(lo).replace(/^([\d./ ]*\d)/, `$1${p.plus}`));

    let target = null;
    if (mode === 'weight' && (p.dim === 'volume' || p.dim === 'stick')) target = 'weight';
    if (mode === 'volume' && p.dim === 'weight') target = 'volume';
    // Author already gave the target unit in parentheses: leave the line alone.
    if (target && (p.parenDims.has(target) || (target === 'volume' && p.parenDims.has('stick')))) target = null;

    if (target === 'weight') {
      const g = v => toGrams(v, p.unit, ing);
      if (g(lo) != null) return { amount: fmtRange(v => formatGrams(g(v))), rest: p.text.slice(p.end), original: originalAmount, changed: true, hedge };
    }
    if (target === 'volume' && ing && ing.gramsPerTsp) {
      const f = v => {
        const grams = toGrams(v, p.unit, ing);
        return ing.each && ing.each.stick ? formatButter(grams, ing) : formatVolume(toTsp(grams, ing), hi != null);
      };
      return { amount: fmtRange(f), rest: p.text.slice(p.end), original: originalAmount, changed: true, hedge };
    }
    if (scale !== 1) {
      const f = v => (p.unit === 'g' ? formatGrams(v) : formatAmount(v, p.unit));
      return { amount: fmtRange(f), rest: p.text.slice(p.end), original: originalAmount, changed: true, hedge };
    }
    return { amount: null, rest: p.text, changed: false };
  }

  const api = { parseLine, prepareIngredients, findIngredient, toGrams, toTsp, formatGrams, formatVolume, formatButter, formatAmount, render, parseNumber, VOLUME, WEIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RecipeUnits = api;
})(this);
