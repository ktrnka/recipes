---
title: Weight-volume conversions
layout: page
---

<style>
.conv { max-width: 560px; }
.conv-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.conv select, .conv input { font: inherit; padding: 0.3rem 0.4rem; border: 1px solid #ccc; border-radius: 4px; }
.conv input { width: 6rem; }
.conv-out { font-size: 1.15rem; line-height: 1.8; }
.conv-out strong { color: #3f8257; }
.conv-note { color: #57606a; font-size: 0.9rem; }
.dens td, .dens th { font-size: 0.85rem; vertical-align: top; }
.flag { color: #9a6700; font-weight: 600; }
</style>

# Weight-volume conversions

<div class="conv">
  <div class="conv-row">
    <input id="conv-amount" type="text" inputmode="decimal" value="1" aria-label="Amount">
    <select id="conv-unit" aria-label="Unit"></select>
    <select id="conv-ing" aria-label="Ingredient">
      {% for i in site.data.ingredients.ingredients %}<option value="{{ i.id }}">{{ i.name }}</option>
      {% endfor %}
    </select>
  </div>
  <div id="conv-out" class="conv-out"></div>
  <p id="conv-note" class="conv-note"></p>
</div>

Amounts like `1 1/2` and `3/4` work. Flour by volume depends on how you fill the cup, so weigh when it matters.

## The table

Every number comes from the source listed. <span class="flag">Check</span> marks rows where sources disagree by more than about 10%. The data lives in `_data/ingredients.yml`; change a row there to override it with your own measurement.

<table class="dens">
<thead><tr><th>Ingredient</th><th>Weight</th><th>Source</th><th>Cross-check</th></tr></thead>
<tbody>
{% for i in site.data.ingredients.ingredients %}{% assign src = site.data.ingredients.sources[i.source.ref] %}<tr>
<td>{{ i.name }}{% if i.review %} <span class="flag">Check</span>{% endif %}{% if i.note %}<br><span class="conv-note">{{ i.note }}</span>{% endif %}</td>
<td>{% if i.amount %}{{ i.amount | replace: "0.25 ", "1/4 " | replace: "0.5 ", "1/2 " }} = {{ i.grams }} g{% endif %}{% for e in i.each %}{% if i.amount %}<br>{% endif %}1 {{ e[0] }} = {{ e[1] }} g{% endfor %}</td>
<td>{% if src.url %}<a href="{{ src.url }}">{{ src.name }}</a>{% else %}{{ src.name }}{% endif %}{% if i.source.fdc %} #{{ i.source.fdc }}{% endif %}: {{ i.source.as_stated }}</td>
<td>{% if i.check %}{% assign chk = site.data.ingredients.sources[i.check.ref] %}{{ chk.name | split: "," | first | split: " ingredient" | first }}{% if i.check.fdc %} #{{ i.check.fdc }}{% endif %}: {{ i.check.as_stated }}{% endif %}</td>
</tr>
{% endfor %}
</tbody>
</table>

## Eggs

[Note on egg yolks from Rose](https://www.realbakingwithrose.com/baking-tips/2019/1/16/now-we-are-separating-and-weighing-out-egg-yolks-and-whites-ad25y):
> When Rose wrote The Bread Bible in 2003, an average large egg’s yolk weighed 18.6 grams and its whites weighed 31.4 grams. We are now seeing yolks ranging from as low as 12 grams (and rarely as high as 19 grams), and thus usually an increase in whites per whole egg

<script src="{{ '/assets/js/units.js' | relative_url }}"></script>
<script>
(async function () {
  const U = window.RecipeUnits;
  const data = await (await fetch("{{ '/assets/ingredients.json' | relative_url }}")).json();
  const ings = U.prepareIngredients(data);
  const byId = Object.fromEntries(ings.map(i => [i.id, i]));
  const $ = id => document.getElementById(id);
  const amountEl = $('conv-amount'), unitEl = $('conv-unit'), ingEl = $('conv-ing'), out = $('conv-out'), note = $('conv-note');

  // Remember the last ingredient per viewer (a convenience only).
  try { const last = localStorage.getItem('recipes.conv.ing'); if (last && byId[last]) ingEl.value = last; } catch (e) {}

  function units(ing) {
    const list = [];
    if (ing.gramsPerTsp) list.push('cup', 'tbsp', 'tsp');
    if (ing.each) list.push(...Object.keys(ing.each));
    list.push('g', 'oz', 'lb');
    return list;
  }

  function fillUnits() {
    const ing = byId[ingEl.value];
    const prev = unitEl.value;
    unitEl.innerHTML = '';
    for (const u of units(ing)) unitEl.append(new Option(u, u));
    if (units(ing).includes(prev)) unitEl.value = prev;
  }

  function grams(amount, unit, ing) {
    if (ing.each && unit in ing.each) return amount * ing.each[unit];
    return U.toGrams(amount, unit, ing);
  }

  function update() {
    const ing = byId[ingEl.value];
    try { localStorage.setItem('recipes.conv.ing', ing.id); } catch (e) {}
    const amount = U.parseNumber(amountEl.value || '');
    note.textContent = ing.note || '';
    if (!(amount > 0)) { out.innerHTML = ''; return; }
    const g = grams(amount, unitEl.value, ing);
    const lines = [`<strong>${U.formatGrams(g, true)}</strong> <span class="conv-note">(${(g / 28.3495).toFixed(1)} oz)</span>`];
    if (ing.gramsPerTsp) lines.push(`<strong>${U.formatVolume(U.toTsp(g, ing))}</strong>`);
    if (ing.each && ing.each.stick) lines.push(`<strong>${U.formatButter(g, ing)}</strong>`);
    for (const [name, w] of Object.entries(ing.each || {})) {
      if (name !== 'stick') lines.push(`<strong>${Math.round((g / w) * 10) / 10}</strong> ${name}${g / w === 1 ? '' : 's'}`);
    }
    out.innerHTML = lines.join('<br>');
  }

  ingEl.addEventListener('change', () => { fillUnits(); update(); });
  unitEl.addEventListener('change', update);
  amountEl.addEventListener('input', update);
  // ?ing=butter&amount=142&unit=g links straight to a conversion.
  const params = new URLSearchParams(location.search);
  if (byId[params.get('ing')]) ingEl.value = params.get('ing');
  fillUnits();
  if (params.get('amount')) amountEl.value = params.get('amount');
  if (params.get('unit') && units(byId[ingEl.value]).includes(params.get('unit'))) unitEl.value = params.get('unit');
  update();
})();
</script>
