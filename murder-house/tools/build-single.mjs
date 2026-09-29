// Bundle the app into single HTML files:
//   standalone/murder-house.html - standalone page, open it straight from disk (no server needed)
//   dist/artifact.html           - same page without the <html>/<head>/<body> wrapper (for hosted viewers)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const r = (p) => path.join(root, p);
const res = await build({
  entryPoints: [r('js/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  target: 'es2020',
  alias: { three: r('vendor/three.module.min.js') },
  plugins: [{
    name: 'addons',
    setup(b) { b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: r('vendor/addons/' + a.path.slice('three/addons/'.length)) })); },
  }],
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(r('index.html'), 'utf8');
const between = (a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b));
const head = between('<!-- APP:HEAD:BEGIN -->', '<!-- APP:HEAD:END -->').trim();
const body = between('<!-- APP:BODY:BEGIN -->', '<!-- APP:BODY:END -->').trim();
const css = readFileSync(r('css/app.css'), 'utf8');
const inner = `${head}\n<style>\n${css}\n</style>\n${body}\n<script>\n${js}\n</script>\n`;
mkdirSync(r('dist'), { recursive: true });
mkdirSync(r('standalone'), { recursive: true });
writeFileSync(r('dist/artifact.html'), inner);
writeFileSync(r('standalone/murder-house.html'), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n<script>\n${js}\n</script>\n</body>\n</html>\n`);
console.log(`standalone/murder-house.html ${(inner.length / 1024).toFixed(0)} KB`);
