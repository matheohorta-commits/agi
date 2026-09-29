// usage: node tools/shot.mjs "<url-query>" out.png [w] [h]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');   // set NODE_PATH to a global install if needed
const [, , query = '', out = 'shot.png', w = '1400', h = '900', page = 'still.html'] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
pg.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
pg.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await pg.goto(`http://127.0.0.1:8120/${page}?${query}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => logs.push('timeout waiting for __ready'));
await pg.waitForTimeout(+process.env.WAIT || 500);
await pg.screenshot({ path: out, timeout: 180000 });
console.log(JSON.stringify(await pg.evaluate(() => window.__stats || null)));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
