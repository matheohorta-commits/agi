// Node resolve hook: map the browser import-map names ('three', 'three/addons/...') to vendor files
import { pathToFileURL } from 'node:url';
import { resolve as res } from 'node:path';
const root = res(new URL('../..', import.meta.url).pathname);
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: pathToFileURL(root + '/vendor/three.module.min.js').href, shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: pathToFileURL(root + '/vendor/addons/' + spec.slice(13)).href, shortCircuit: true };
  return next(spec, ctx);
}
