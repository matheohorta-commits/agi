// "Parts & buying": the full bill of materials with prices, availability, links and shopping-list exports.
import { COLORS } from '../core/colors.js';
import { brickLinkXML, rebrickableCSV, plainCSV, brickLinkURL, rebrickableURL } from '../core/bom.js';
import { CHARACTERS, figParts } from '../model/furniture.js';
import { thumb } from '../gfx/thumbs.js';

const eur = (v) => '€' + v.toFixed(2);
const TIERS = 5;

export class PartsList {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('parts');
    this.filter = { q: '', cat: 'All' };
    this.rendered = false;
  }

  show() {
    if (!this.rendered) { this.render(); this.rendered = true; }
  }

  render() {
    const { bom, steps } = this.app;
    const cats = ['All', ...bom.catOrder.filter((c) => bom.lots.some((L) => L.cat === c))];
    const common = bom.lots.filter((L) => L.rarity.tier >= 3).reduce((s, L) => s + L.qty, 0);
    const low = bom.cost * 0.85, high = bom.cost * 1.15;
    this.el.innerHTML = `
      <h2>What to buy</h2>
      <p class="lede">Every piece below is a real LEGO element, checked against the Rebrickable catalogue in the exact colour used. The design sticks to the cheapest, most produced colours (Reddish Brown brick, Tan stone, Dark Bluish Gray slate). Prices are estimates for new parts from BrickLink sellers; used parts are usually 30–40% cheaper.</p>
      <div class="summary">
        <div><b>${bom.pieces.toLocaleString('en')}</b><span>pieces</span></div>
        <div><b>${bom.lots.length}</b><span>different part / colour lots</span></div>
        <div><b>€${Math.round(low)}–${Math.round(high)}</b><span>estimated cost on BrickLink (new parts)</span></div>
        <div><b>${Math.round((100 * common) / bom.pieces)}%</b><span>of pieces are common or very common</span></div>
        <div><b>${steps.length}</b><span>instruction steps in 10 bags</span></div>
        <div><b>9</b><span>minifigures from plain parts</span></div>
      </div>
      <div class="filters">
        <input type="search" id="pl-q" placeholder="Search part number, name or colour" aria-label="Search parts">
        <div class="chips" id="pl-cats">${cats.map((c) => `<button class="chip" data-cat="${c}" aria-pressed="${c === 'All'}">${c}</button>`).join('')}</div>
      </div>
      <div class="tablewrap"><table>
        <thead><tr><th></th><th>Part</th><th>Name</th><th>Colour</th><th class="num">Qty</th><th class="num">Each</th><th class="num">Total</th><th>Availability</th><th>Buy</th></tr></thead>
        <tbody id="pl-body"></tbody>
      </table></div>

      <h2 style="margin-top:32px">The residents</h2>
      <p class="lede">Minifigures are listed as their separate parts (plain torsos, legs, printed standard-grin heads and hair), which is far cheaper than buying printed characters.</p>
      <div class="figlist">${Object.entries(CHARACTERS).map(([k, c]) => `<div class="f"><img alt="" src="${thumb('fig', 'black', 96, k)}"><div><b>${c.name}</b><small>${figParts(k).map((f) => `${f.id} ${COLORS[f.c].name}`).join('<br>')}</small></div></div>`).join('')}</div>

      <div class="cols2">
        <div class="box wide">
          <h3>How to get it cheapest</h3>
          <ol>
            <li>Check your own bricks first: import the Rebrickable CSV to see what you already own.</li>
            <li>Buy the bulk basics (1x2, 1x4, 1x6 bricks in Reddish Brown, Dark Bluish Gray slopes, tiles) from one or two big BrickLink stores to save on shipping.</li>
            <li>LEGO Pick a Brick sells the most common elements at fixed prices; compare it for the Reddish Brown bricks.</li>
            <li>Choose "Used" condition for the base plates, slopes and hidden parts. Keep "New" for windows, glass and tiles, where scratches show.</li>
            <li>The Bright Green 16x16 base plates are the priciest items. Any 16x16 plate works: Dark Bluish Gray or Tan are cheaper if you don't mind a non-green yard.</li>
          </ol>
        </div>
        <div class="box">
          <h3>BrickLink wanted list</h3>
          <p>Copy this, then on bricklink.com go to Want › Upload, paste it and create a new wanted list. "Easy Buy" then finds the fewest shops that have everything.</p>
          <div class="row"><button class="btn primary" data-copy="bl">Copy XML</button><button class="btn" data-dl="bl">Download .xml</button><span class="copied" id="c-bl"></span></div>
          <textarea readonly id="t-bl" aria-label="BrickLink XML"></textarea>
        </div>
        <div class="box">
          <h3>Rebrickable parts list</h3>
          <p>On rebrickable.com: My LEGO › Parts Lists › Import (Rebrickable CSV). It shows which of your own sets already contain these parts.</p>
          <div class="row"><button class="btn primary" data-copy="rb">Copy CSV</button><button class="btn" data-dl="rb">Download .csv</button><span class="copied" id="c-rb"></span></div>
          <textarea readonly id="t-rb" aria-label="Rebrickable CSV"></textarea>
        </div>
        <div class="box">
          <h3>Spreadsheet</h3>
          <p>Everything in the table above, with estimated prices, for your own shopping plan.</p>
          <div class="row"><button class="btn primary" data-copy="csv">Copy CSV</button><button class="btn" data-dl="csv">Download .csv</button><span class="copied" id="c-csv"></span></div>
          <textarea readonly id="t-csv" aria-label="Spreadsheet CSV"></textarea>
        </div>
      </div>`;
    this.el.querySelector('#t-bl').value = brickLinkXML(bom);
    this.el.querySelector('#t-rb').value = rebrickableCSV(bom);
    this.el.querySelector('#t-csv').value = plainCSV(bom);
    this.el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => this.copy(b.dataset.copy)));
    this.el.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => this.download(b.dataset.dl)));
    this.el.querySelector('#pl-q').addEventListener('input', (e) => { this.filter.q = e.target.value.toLowerCase(); this.rows(); });
    this.el.querySelectorAll('#pl-cats .chip').forEach((b) => b.addEventListener('click', () => {
      this.filter.cat = b.dataset.cat;
      this.el.querySelectorAll('#pl-cats .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.rows();
    }));
    this.rows();
  }

  rows() {
    const { bom } = this.app;
    const { q, cat } = this.filter;
    const body = this.el.querySelector('#pl-body');
    const list = bom.lots.filter((L) => (cat === 'All' || L.cat === cat) &&
      (!q || `${L.id} ${L.bl} ${L.officialName} ${COLORS[L.c].name}`.toLowerCase().includes(q)));
    let html = '', lastCat = '';
    for (const L of list) {
      if (L.cat !== lastCat) { lastCat = L.cat; html += `<tr class="cat"><td colspan="9">${L.cat}s</td></tr>`; }
      const col = COLORS[L.c];
      const tier = Array.from({ length: TIERS }, (_, k) => `<i class="${k < L.rarity.tier ? 'on' : ''}"></i>`).join('');
      const sets = L.rarity.sets ? `in ${L.rarity.sets} sets since 2015` : L.rarity.ever ? `in ${L.rarity.ever} older sets/figures` : '';
      html += `<tr><td><img alt="" data-thumb="${L.id}|${L.c}" loading="lazy"></td>
        <td><span class="pid">${L.bl}</span>${L.bl !== L.id ? `<br><small class="mono" style="color:var(--dim)">RB ${L.id}</small>` : ''}</td>
        <td>${L.officialName}${L.figs.length ? `<br><small style="color:var(--dim)">${L.figs.map((f) => CHARACTERS[f].name).join(', ')}</small>` : ''}</td>
        <td><span class="swatch" style="background:${col.hex}"></span>${col.name}</td>
        <td class="num">${L.qty}</td><td class="num">${eur(L.unit)}</td><td class="num">${eur(L.total)}</td>
        <td class="tier" title="${sets}">${tier} ${L.rarity.label}</td>
        <td><a href="${brickLinkURL(L)}" target="_blank" rel="noopener">${/^97[03]c|^3626c/.test(L.id) ? 'Rebrickable' : 'BrickLink'} ↗</a></td></tr>`;
    }
    body.innerHTML = html || '<tr><td colspan="9">No part matches that search.</td></tr>';
    // fill thumbnails progressively so the page stays responsive
    const imgs = [...body.querySelectorAll('img[data-thumb]')];
    let k = 0;
    const fill = () => {
      const end = Math.min(imgs.length, k + 12);
      for (; k < end; k++) { const [id, c] = imgs[k].dataset.thumb.split('|'); imgs[k].src = thumb(id, c, 64); }
      if (k < imgs.length) requestAnimationFrame(fill);
    };
    fill();
  }

  async copy(which) {
    const ta = this.el.querySelector('#t-' + which);
    const out = this.el.querySelector('#c-' + which);
    try { await navigator.clipboard.writeText(ta.value); out.textContent = 'Copied'; }
    catch { ta.focus(); ta.select(); out.textContent = 'Selected: press Ctrl/Cmd+C'; }
    setTimeout(() => (out.textContent = ''), 2500);
  }

  async download(which) {
    const ta = this.el.querySelector('#t-' + which);
    const out = this.el.querySelector('#c-' + which);
    const say = (t) => { out.textContent = t; setTimeout(() => (out.textContent = ''), 3500); };
    const names = { bl: 'murder-house-bricklink.xml', rb: 'murder-house-rebrickable.csv', csv: 'murder-house-parts.csv' };
    // inside the claude.ai viewer files go through the downloads capability (.xml is not allowed there: .txt)
    const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (dl) {
      try {
        await dl.save({ filename: which === 'bl' ? 'murder-house-bricklink-xml.txt' : names[which], data: ta.value });
        say('Saved');
      } catch (e) {
        say(e?.code === 'declined' ? 'Download cancelled' : 'Download not available here: use Copy');
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([ta.value], { type: which === 'bl' ? 'application/xml' : 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = names[which];
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
