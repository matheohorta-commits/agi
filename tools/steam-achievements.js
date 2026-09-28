#!/usr/bin/env node
/* Prints the achievement list as CSV (API name, display name, description, hidden) for the Steamworks partner site. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/util.js', 'js/data/balance.js', 'js/data/labs.js', 'js/data/buildings.js', 'js/data/research.js', 'js/data/products.js', 'js/data/cards.js', 'js/data/achievements.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
console.log('api_name,display_name,description,hidden');
for (const a of ctx.G.ACHIEVEMENTS) console.log([q('ACH_' + a.id.toUpperCase()), q(a.name), q(a.desc), a.hidden ? 1 : 0].join(','));
