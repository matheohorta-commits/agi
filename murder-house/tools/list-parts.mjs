// prints the part ids (and colours) the model uses, for tools/gen-catalog.py
import { buildHouse } from '../js/model/house.js';
import { PARTS } from '../js/core/parts.js';
import { COLORS } from '../js/core/colors.js';
const mb = buildHouse();
const used = {};
for (const q of mb.parts) {
  const list = q.figParts ? q.figParts.map((f) => [f.id, f.c]) : [[q.id, q.c]];
  for (const [id, c] of list) (used[id] ??= new Set()).add(COLORS[c].rb);
}
const out = { all: Object.keys(PARTS).filter((k) => k !== 'fig'), used: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, [...v]])) };
console.log(JSON.stringify(out));
