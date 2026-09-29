// Debug: floor plan at a height. '.' free, ':' floor finish (tile/board: free for furniture), '#' wall, letters = furniture
import { buildHouse } from '../js/model/house.js';
const [y, x0 = 0, x1 = 47, z0 = 0, z1 = 47] = process.argv.slice(2).map(Number);
const mb = buildHouse();
let head = '   '; for (let x = x0; x <= x1; x++) head += x % 10; console.log(head);
for (let z = z0; z <= z1; z++) {
  let s = String(z).padStart(2) + ' ';
  for (let x = x0; x <= x1; x++) {
    const i = mb.occAt(x, y, z);
    if (i === undefined) { s += mb.occAt(x, y + 1, z) !== undefined ? '^' : '.'; continue; }
    const sec = mb.sections[mb.parts[i].sec].name;
    s += /floor:|parquet|carpets|floorboards/.test(sec) ? ':' : /wall|tile the wall/i.test(sec) ? '#' : /stair/i.test(sec) ? 'S' : 'f';
  }
  console.log(s);
}
