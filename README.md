# FEEL THE AGI

*An idle game about scaling laws, compute, and the race to superintelligence.*

It's September 2012. You have one used GPU, a scraped dataset, and a hunch that neural networks just need to be bigger.
Buy compute. Gather data. Train models along the real scaling laws. Ship products, race OpenAI / Anthropic / DeepMind / xAI / Meta / DeepSeek,
keep your models aligned — and ride the **AI 2027** timeline all the way to superintelligence. Then keep going: Dyson swarms,
von Neumann probes, the galaxy, and the Omega Point.

## Play

No build step. It's plain HTML/CSS/JS (classic scripts, no modules), so it runs straight from disk:

```bash
# option 1: just open it
open index.html            # or double-click it

# option 2: local server
npx http-server -c-1 -p 8080 .

# option 3: desktop app (Electron — the Steam build target)
npm install
npm start
```

Saves go to `localStorage` (autosave every 15 s, plus export/import strings in Settings). Offline progress is simulated when you come back.

## What's in it

**Core loop: the scaling laws are the gameplay**
- Pretraining uses the Chinchilla fit `L = 1.69 + 406.4/N^0.34 + 410.7/D^0.28`. You pick parameters (N) and tokens (D) for every run; compute = 6·N·D.
  Presets give loss-optimal runs for a target duration, or cheap overtrained models that are easier to serve.
- A live train/test loss curve while training, plus log-log scaling-law plots of every model you've trained (after researching *Scaling Laws*).
- The **data wall**: human text is finite (~300T tokens). Break through with synthetic data, RL environments, robots and world simulators.
- Compute is split between **training**, **serving** users (bigger models and longer reasoning cost more per user — "our GPUs are melting"),
  and later **automated AI research** and **automated alignment**.
- Every scaling axis from the frontier dashboard: compute substrate, training-time compute, **test-time compute** (reasoning-effort slider),
  **test-time training**, **agents & swarms**, **recursive self-improvement** — and the two red curves, **eval awareness** and **CoT monitoring**.
- The **power bottleneck** (grid, gas turbines, nuclear, SMRs, fusion, space solar, Dyson tiles).

**Alignment matters.** Past capability 160, alignment must keep up. A low safety margin causes incidents (reward hacking, sycophancy,
jailbreaks, sandbagging, alignment faking, self-exfiltration...) and builds hidden misalignment, which decides your ending at ASI.

**AI 2027.** The 2025–2028 storyline follows [ai-2027.com](https://ai-2027.com): stumbling agents, Agent-0 → Agent-5, the AI R&D progress
multiplier (1.5× → 3× → 10× → 50×), China waking up, the stolen weights, neuralese, the misalignment memo, and the October 2027
**RACE or SLOW DOWN** choice. There's a dedicated AI 2027 dashboard (timeline, R&D multiplier, lead over DeepCent, capability radar).

**The race.** An LMArena-style leaderboard of rival labs that ship on their own schedule. Stall and they pass you.

**The timeline.** A live X/Reddit feed: Sam, Dario, Demis, Yann, Gary Marcus, roon, Jimmy Apples, Chubby, 🍓, Pliny, Karpathy,
Eliezer, Beff Jezos, r/singularity, Hacker News... Some posts are interactive mini-events — **RATIO** Gary, **DEBATE** Yann,
**PATCH** Pliny's jailbreak, **WATCH** for Jimmy's leak (a guaranteed crate), **FIX** an outage.

**Random drops.** Things float across the screen: 🍓 (FEEL THE AGI frenzy ×7), 🍎 leaks, GPU shipments, funding rounds, viral demos,
eureka moments — and **Lore Crates**.

**Lore Crates — HOLD TO OPEN.** A pixel card-reveal homage: brick wall and torches, a locked card with a breathing ring, hold to charge
(shake, cracks, lightning), burst (flash, shockwave, bricks exploding and piling up), rarity title slam, card flip, NEW!/×N badge,
coins raining, DRAW ANOTHER. 130+ collectible cards (people, memes, papers, events, movements: e/acc, EA, d/acc, PauseAI, decels,
LessWrong, r/singularity) across COMMON → RARE → EPIC → LEGENDARY → SINGULAR, with levels and set bonuses.

**Prestige.** *The Bitter Lesson* resets a run for Bitter Lessons: permanent multipliers, automation (auto-buy, auto-train, auto-research,
auto-hire), head starts and more. Pick a different lab each run — 8 labs with different perks (Anthropic and OpenAI from the start;
DeepMind, xAI, Meta, DeepSeek, Mistral and SSI unlock later).

**After ASI.** The game changes: the scene goes from the garage to a datacenter, a gigawatt campus, Earth from orbit, a Dyson swarm, the galaxy.
Megaprojects (robot economy, disassembling Mercury, von Neumann probes, galactic network, black hole engines, intergalactic seeding) lead to the
**Omega Point** — a second prestige layer. The aligned and misaligned endings have different flavor, music and palette.

**Everything is procedural**: pixel art (ASCII sprites + portrait generator), chiptune music and SFX (WebAudio), particles.
Fonts are SIL OFL (Press Start 2P, Silkscreen, Pixelify Sans, VT323).

## Controls

- Click the glowing model in the lab scene (or press `C`)
- `1`–`9` switch tabs, `SPACE` hold to open crates, `ENTER` draw another, `ESC` close
- `F11` fullscreen (desktop build)

## Project layout

```
index.html            entry point
css/style.css         pixel UI
js/util.js            formatting, math, rng, event bus, DOM helpers
js/data/*.js          all content & balance: labs, hardware, research, products, cards, story (AI 2027), feed, achievements, cosmos
js/core/state.js      save/load/migrate/export
js/core/calc.js       derived stats: scaling law, economy, alignment, R&D multiplier
js/core/sim.js        simulation tick + every player action (no DOM — runs headless)
js/gfx/*.js           sprites, lab scene, FX, crate opening, audio
js/ui/*.js            panels, tabs, modals
js/main.js            bootstrap + main loop + offline progress
tools/balance.js      headless bot that plays the game and prints a pacing timeline
electron/main.js      desktop wrapper
```

## Balancing

`node tools/balance.js [hours] [lab] [clicksPerSecond] [-v]` plays the game with a heuristic bot and prints when each capability
milestone, prestige and ASI happen. Override any constant from `js/data/balance.js` with the `BAL` env var, e.g.
`BAL='{"BL_EXP":0.4}' node tools/balance.js 16`. A good bot reaches ASI in ~5 h across ~7 prestiges; expect roughly 8–12 h for a human
player, then the cosmic layer and Omega loops.

## Shipping on Steam (notes)

- `npm run dist:win` / `dist:mac` / `dist:linux` produce unpacked builds in `dist/` (upload those as Steam depots).
- Steam achievements: the game already has ~100 achievements in `js/data/achievements.js`; wire them to Steamworks
  (e.g. `steamworks.js`) by listening to `G.bus.on('achievement', a => ...)`.
- Saves live in Electron's `localStorage` (userData). For Steam Cloud, mirror `G.Save.exportString(G.S)` to a file in `app.getPath('userData')`.
- **Legal:** real companies and public figures appear as parody/commentary. Before a commercial release, have this reviewed — you may want
  to switch to parody names. All names live in `js/data/labs.js`, `js/data/cards.js` and `js/data/feed.js`, so this is a data-only change.
