// Bill of materials: counts, price estimates and shopping-list exports.
import { PARTS } from './parts.js';
import { COLORS } from './colors.js';
import { CATALOG } from './catalog.js';

// Commonness -> price factor. `q` = pieces of this part in this colour in sets released since 2015.
// Common parts in common colours are what makes a big MOC affordable on BrickLink.
export function rarity(id, c) {
  const e = CATALOG.parts[id]?.colors[COLORS[c].rb];
  const q = e ? e[1] : 0, sets = e ? e[0] : 0, ever = e ? e[2] : 0;
  let factor, label, tier;
  if (q >= 3000) { factor = 0.8; label = 'Very common'; tier = 5; }
  else if (q >= 1000) { factor = 0.95; label = 'Common'; tier = 4; }
  else if (q >= 300) { factor = 1.15; label = 'Easy to find'; tier = 3; }
  else if (q >= 60) { factor = 1.6; label = 'Available'; tier = 2; }
  else if (q > 0 || sets > 0) { factor = 2.4; label = 'Less common'; tier = 1; }
  else { factor = 3.2; label = ever ? 'Older part' : 'Rare'; tier = 0; }
  return { factor, label, tier, q, sets, ever, last: e ? e[3] : 0 };
}

export function unitPrice(id, c) {
  const p = PARTS[id];
  return Math.max(0.02, (p.cost ?? 0.1) * rarity(id, c).factor);
}

export function computeBOM(mb, steps) {
  const lots = new Map();
  const firstStep = new Map();
  if (steps) steps.forEach((s) => s.parts.forEach((i) => firstStep.set(i, s.n)));
  mb.parts.forEach((q, i) => {
    const list = q.figParts ? q.figParts.map((f) => ({ id: f.id, c: f.c, fig: q.fig })) : [{ id: q.id, c: q.c }];
    for (const f of list) {
      const k = f.id + '|' + f.c;
      if (!lots.has(k)) {
        const p = PARTS[f.id];
        lots.set(k, { key: k, id: f.id, bl: p.bl, c: f.c, name: p.name, cat: p.cat, qty: 0, steps: new Set(), figs: new Set(), placements: [] });
      }
      const L = lots.get(k);
      L.qty++;
      L.placements.push(i);
      if (firstStep.has(i)) L.steps.add(firstStep.get(i));
      if (f.fig) L.figs.add(f.fig);
    }
  });
  const out = [...lots.values()].map((L) => {
    const r = rarity(L.id, L.c);
    const unit = unitPrice(L.id, L.c);
    const officialName = CATALOG.parts[L.id]?.name ?? L.name;
    return { ...L, officialName, rarity: r, unit, total: unit * L.qty, steps: [...L.steps].sort((a, b) => a - b), figs: [...L.figs] };
  });
  const catOrder = ['Brick', 'Plate', 'Tile', 'Slope', 'Arch', 'Window', 'Door', 'Fence', 'Plant', 'Accessory', 'Minifig'];
  out.sort((a, b) => (catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat)) || a.id.localeCompare(b.id, 'en', { numeric: true }) || COLORS[a.c].name.localeCompare(COLORS[b.c].name));
  const pieces = out.reduce((s, L) => s + L.qty, 0);
  const cost = out.reduce((s, L) => s + L.total, 0);
  return { lots: out, pieces, cost, catOrder };
}

// ---------------------------------------------------------------- exports
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// BrickLink wanted list (Want > Upload). Minifig torsos/legs use Rebrickable ids that BrickLink
// catalogues differently, so they are left out of the XML and listed as a comment.
export function brickLinkXML(bom) {
  const rows = [];
  const skipped = [];
  for (const L of bom.lots) {
    if (/^97[03]c/.test(L.id) || /^3626c/.test(L.id)) { skipped.push(`${L.qty}x ${L.name} (${COLORS[L.c].name})`); continue; }
    rows.push(`  <ITEM>\n    <ITEMTYPE>P</ITEMTYPE>\n    <ITEMID>${esc(L.bl)}</ITEMID>\n    <COLOR>${COLORS[L.c].bl}</COLOR>\n    <MINQTY>${L.qty}</MINQTY>\n    <CONDITION>X</CONDITION>\n  </ITEM>`);
  }
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Murder House (1120 Westchester Pl.) - ${bom.pieces} pieces. Upload at bricklink.com > Want > Upload -->\n`;
  if (skipped.length) xml += `<!-- Minifigure parts to add by hand (search their names on BrickLink):\n     ${skipped.join('\n     ')} -->\n`;
  xml += `<INVENTORY>\n${rows.join('\n')}\n</INVENTORY>\n`;
  return xml;
}

// Rebrickable "Part,Color,Quantity" CSV (My LEGO > Parts lists > Import)
export function rebrickableCSV(bom) {
  return 'Part,Color,Quantity\n' + bom.lots.map((L) => `${L.id},${COLORS[L.c].rb},${L.qty}`).join('\n') + '\n';
}

export function plainCSV(bom) {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  return 'Category,Part (Rebrickable),Part (BrickLink),Name,Colour,Quantity,Est. unit EUR,Est. total EUR,Availability\n' +
    bom.lots.map((L) => [L.cat, L.id, L.bl, q(L.officialName), q(COLORS[L.c].name), L.qty, L.unit.toFixed(2), L.total.toFixed(2), L.rarity.label].join(',')).join('\n') + '\n';
}

export function brickLinkURL(L) {
  if (/^97[03]c/.test(L.id) || /^3626c/.test(L.id)) return `https://rebrickable.com/parts/${encodeURIComponent(L.id)}/`;
  return `https://www.bricklink.com/v2/catalog/catalogitem.page?P=${encodeURIComponent(L.bl)}&C=${COLORS[L.c].bl}#T=S&C=${COLORS[L.c].bl}`;
}
export function rebrickableURL(L) {
  return `https://rebrickable.com/parts/${encodeURIComponent(L.id)}/`;
}
