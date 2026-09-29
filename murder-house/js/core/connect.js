// Which parts hold which: stud-to-tube contacts, upright tiles hooked on side studs, and inserts
// (glass, doors, drawers) held by their frame. Shared by the step maker and the validator.
import { part, rotCell, studCells, bottomCells } from './parts.js';

const KEY = (x, y, z) => ((x + 64) * 256 + (z + 64)) * 1024 + y;

export function buildEdges(mb) {
  const parts = mb.parts;
  const studTop = new Map();
  parts.forEach((q, i) => {
    const p = part(q.id);
    for (const [u, v] of studCells(p)) { const [dx, dz] = rotCell(p, q.r, u, v); studTop.set(KEY(q.x + dx, q.y + p.h, q.z + dz), i); }
  });
  const edges = parts.map(() => []);
  const link = (i, j) => { edges[i].push(j); edges[j].push(i); };
  parts.forEach((q, i) => {
    const p = part(q.id);
    for (const [u, v] of bottomCells(p)) {
      const [dx, dz] = rotCell(p, q.r, u, v);
      const j = studTop.get(KEY(q.x + dx, q.y, q.z + dz));
      if (j !== undefined && j !== i) link(i, j);
    }
    if (q.attach !== undefined) link(i, q.attach);
  });
  // inserts: the frame at the same spot, else the part behind / below (drawers, lids)
  const at = new Map();
  parts.forEach((q, i) => { if (!part(q.id).insert) { const k = KEY(q.x, q.y, q.z); if (!at.has(k)) at.set(k, i); } });
  const loose = [];
  parts.forEach((q, i) => {
    if (!part(q.id).insert) return;
    let j = at.get(KEY(q.x, q.y, q.z));
    if (j === undefined) {
      const cands = [[q.x, q.y, q.z - 1], [q.x, q.y - 1, q.z], [q.x + 1, q.y, q.z - 1], [q.x - 1, q.y, q.z], [q.x + 1, q.y, q.z], [q.x, q.y, q.z + 1]];
      for (const [x, y, z] of cands) { const o = mb.occAt(x, y, z); if (o !== undefined) { j = o; break; } }
    }
    if (j !== undefined) link(i, j); else loose.push(i);
  });
  return { edges, looseInserts: loose };
}
