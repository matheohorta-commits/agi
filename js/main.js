/* Bootstrap + main loop. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const Main = (G.Main = {});
  let last = 0, simAcc = 0, uiAcc = 0, tabAcc = 0, saveAcc = 0, running = false;

  Main.save = () => {
    if (!G.S) return;
    G.Save.save(G.S);
  };

  function applySettings() {
    const st = G.S.settings;
    U.notation = st.notation || 'short';
    G.Audio.setVolumes(st.sfx, st.music);
    G.FX.reduce = !!st.reduceFx;
  }

  Main.loadState = (s) => {
    G.Modals.reset();
    G.Sim.set(s);
    applySettings();
    G.UI.rebuild();
    G.Audio.Music.setTheme(G.Scene.themeFor(G.S, G.D));
  };

  Main.newGame = (lab) => {
    const s = G.newState(lab);
    s.flags.seenIntro = true;
    G.Sim.set(s);
    applySettings();
    G.UI.rebuild();
    G.Sim.post('you', `${G.LABS[lab].name} is founded in a garage. Mission: build AGI that benefits all of humanity. Assets: one used GPU and a dream.`);
    G.Sim.post('gary', 'Deep learning is hitting a wall.');
    Main.save();
    setTimeout(() => G.Modals.help(), 600);
  };

  Main.hardReset = () => {
    G.Save.wipe();
    location.reload();
  };

  function offline(s) {
    const elapsed = (Date.now() - (s.lastSeen || Date.now())) / 1000;
    if (elapsed < 60) return null;
    const D = G.D;
    const cap = D.M.offlineHours * 3600;
    const eff = Math.min(1, D.M.offlineEff);
    const secs = Math.min(elapsed, cap);
    s.stats.longestOffline = Math.max(s.stats.longestOffline || 0, elapsed);
    const res = G.Sim.fastForward(secs, eff);
    res.seconds = elapsed;
    res.capped = elapsed > cap;
    return res;
  }

  function frame(now) {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 5) {
      // tab was hidden: catch up at full speed
      G.Sim.fastForward(Math.min(dt, 12 * 3600), 1);
      dt = 0.05;
    }
    dt = Math.min(dt, 0.25);
    const TICK = G.BAL.TICK;
    simAcc += dt;
    let n = 0;
    while (simAcc >= TICK && n < 10) {
      G.Sim.tick(TICK);
      simAcc -= TICK;
      n++;
    }
    const S = G.S, D = G.D;
    G.Scene.render(dt, S, D);
    G.FX.update(dt);
    G.UI.updateDrops();
    G.Hist.tick(dt);
    uiAcc += dt;
    if (uiAcc > 0.1) {
      uiAcc = 0;
      G.UI.updateTop();
      G.Panels.updateModel();
      G.Panels.updateTrain();
      G.Panels.updateAlloc();
      G.Panels.updateVibes();
      G.Panels.updateFeedTimers();
      G.Panels.updateBuffs();
      G.Panels.updateAbilities();
      G.UI.refreshTip();
      G.Audio.Music.intensity = U.clamp((S.vibe + 100) / 200, 0, 1);
    }
    tabAcc += dt;
    if (tabAcc > 0.2) {
      tabAcc = 0;
      G.UI.updateTabs();
      G.Panels.updateObjectives();
      G.UI.refreshTabLocks();
      if (!G.Modals.isOpen() && !G.Pack.active && S.storyQueue.length) G.Modals.checkStory();
    }
    saveAcc += dt;
    if (saveAcc > 15) {
      saveAcc = 0;
      if (S.settings.autosave) Main.save();
    }
    requestAnimationFrame(frame);
  }

  function bindKeys() {
    let cHeld = 0;
    window.addEventListener('keydown', (e) => {
      if (G.Pack.active || G.Modals.isOpen()) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (/^Digit[1-9]$/.test(e.code)) {
        const tabs = G.UI.tabs.filter((t) => t.unlocked());
        const t = tabs[+e.code.slice(5) - 1];
        if (t) { G.Audio.tab(); G.UI.showTab(t.id); }
      }
      if (e.code === 'KeyC' && !e.repeat) {
        const now = performance.now();
        if (now - cHeld < 60) return;
        cHeld = now;
        const r = G.Sim.click();
        G.Scene.pulse(r.crit);
        G.Audio.click(r.crit);
        const p = G.Scene.orbScreenPos();
        G.FX.float(p.x, p.y - 30, '+' + U.fmtMoney(r.v), r.crit ? 'crit' : '');
      }
    });
    window.addEventListener('beforeunload', () => { if (G.S) Main.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.S) Main.save(); });
    document.addEventListener('mousedown', () => G.Audio.unlock(), { once: true });
    document.addEventListener('keydown', () => G.Audio.unlock(), { once: true });
  }

  Main.start = async () => {
    try {
      await Promise.race([
        Promise.all(['8px Silkscreen', '8px "Press Start 2P"', '12px "Pixelify Sans"', '16px VT323'].map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) { /* fonts optional */ }
    G.UI.initSprites();
    G.UI.initTooltips();
    G.UI.initTop();
    G.UI.wire();
    G.FX.init();
    G.Scene.init(document.getElementById('sceneCanvas'));
    G.Pack.init();

    const saved = G.Save.load();
    const boot = (s) => {
      G.Sim.set(s);
      applySettings();
      G.Panels.init();
      G.UI.buildTabs();
      G.Audio.Music.setTheme(G.Scene.themeFor(G.S, G.D));
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    };
    bindKeys();
    if (saved) {
      boot(saved);
      const res = offline(saved);
      if (res) setTimeout(() => G.Modals.welcome(res), 300);
    } else {
      // show intro over a fresh garage in the background
      boot(G.newState('anthropic'));
      G.Modals.intro((lab) => Main.newGame(lab));
    }
    // debug handle
    root.FTAGI = G;
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Main.start);
    else Main.start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
