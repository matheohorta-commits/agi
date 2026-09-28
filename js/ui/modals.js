/* Modals: story choices, lab select, prestige, settings, credits, help, card detail, welcome back, ASI cutscene. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const M = (G.Modals = {});
  const queue = [];
  let openNow = null;

  M.isOpen = () => !!openNow;
  /** drop pending modals and close the current one (used on prestige / load) */
  M.reset = () => {
    queue.length = 0;
    if (openNow) {
      openNow = null;
      const wrap = U.$('#modalWrap');
      wrap.classList.remove('show');
      wrap.innerHTML = '';
    }
  };
  M.open = (o) => {
    if (openNow) { queue.push(o); return; }
    openNow = o;
    const wrap = U.$('#modalWrap');
    wrap.innerHTML = '';
    const head = h('div.mh', o.icon ? h('img', { src: typeof o.icon === 'string' && o.icon.startsWith('data:') ? o.icon : G.UI.icon(o.icon, 3) }) : null, h('h2', o.title || ''));
    if (o.closable !== false) {
      const x = h('button.iconbtn.x', '✕');
      x.addEventListener('click', M.close);
      head.appendChild(x);
    }
    const body = h('div.mb');
    if (o.kicker) body.appendChild(h('div.ai27tag', o.kicker));
    if (o.body instanceof Node) { body.classList.add('html'); body.appendChild(o.body); }
    else if (o.html) { body.classList.add('html'); body.insertAdjacentHTML('beforeend', o.html); }
    else if (o.body) body.appendChild(document.createTextNode(o.body));
    const modal = h('div.modal' + (o.wide ? '.wide' : ''), head, body);
    if (o.choices) {
      const ch = h('div.choices');
      o.choices.forEach((c) => {
        const b = h('button.choice', c.label, c.sub ? h('small', c.sub) : null);
        b.addEventListener('click', () => { G.Audio.tab(); M.close(); c.fn && c.fn(); });
        ch.appendChild(b);
      });
      modal.appendChild(ch);
    }
    if (o.buttons) {
      const f = h('div.mf');
      o.buttons.forEach((bb) => {
        const b = h('button.' + (bb.cls || 'bigbtn'), bb.label);
        if (bb.disabled) b.disabled = true;
        b.addEventListener('click', () => { if (bb.keep !== true) M.close(); bb.fn && bb.fn(); });
        f.appendChild(b);
      });
      modal.appendChild(f);
    }
    wrap.appendChild(modal);
    wrap.classList.add('show');
    if (o.onOpen) o.onOpen(modal);
  };
  M.close = () => {
    const wrap = U.$('#modalWrap');
    wrap.classList.remove('show');
    wrap.innerHTML = '';
    const was = openNow;
    openNow = null;
    if (was && was.onClose) was.onClose();
    if (queue.length) setTimeout(() => M.open(queue.shift()), 120);
    else setTimeout(M.checkStory, 200);
  };
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape' && openNow && openNow.closable !== false && !G.Pack.active) M.close(); });

  /* ------------------------------------------------------------------ story */
  M.checkStory = () => {
    if (openNow || G.Pack.active || U.$('#asiScreen').classList.contains('show')) return;
    const S = G.S, D = G.D;
    const id = G.Sim.currentStory();
    if (!id) return;
    const ev = G.Sim.storyDef(id);
    if (!ev) { S.storyQueue.shift(); return; }
    const title = typeof ev.title === 'function' ? ev.title(S, D) : ev.title;
    const text = typeof ev.text === 'function' ? ev.text(S, D) : ev.text;
    const choices = G.Sim.storyChoices(ev);
    G.Audio.notify();
    M.open({
      title, icon: ev.art || 'paper', body: text, closable: false,
      kicker: ev.id.startsWith('ev_theft') || ev.id === 'ev_neuralese' || ev.id === 'ev_oversight' || ev.id === 'ev_jobs' || ev.id === 'ev_race5' || ev.id === 'ev_slow2' ? 'AI 2027' : null,
      choices: choices.map((c, i) => ({ label: c.label, sub: c.sub, fn: () => { G.Sim.choose(id, i); } })),
    });
  };

  /* ------------------------------------------------------------------ labs */
  function labGrid(selected, onSel) {
    const S = G.S;
    const grid = h('div.labs');
    for (const id of G.LAB_ORDER) {
      const lab = G.LABS[id];
      const un = S.labsUnlocked[id];
      const card = h('div.labcard' + (un ? '' : '.locked') + (id === selected ? '.sel' : ''),
        h('h3', h('img', { src: G.Sprites.url(lab.logo, 2) }), h('span', { style: { color: lab.color } }, lab.name)),
        h('div.tag', lab.tagline),
        h('p', lab.desc),
        h('ul', lab.perks.map((p) => h('li', p))),
        un ? null : h('div.small', { style: { color: 'var(--red)', marginTop: '6px' } }, '🔒 ' + lab.unlockText));
      if (un) card.addEventListener('click', () => {
        grid.querySelectorAll('.labcard').forEach((c) => c.classList.remove('sel'));
        card.classList.add('sel');
        onSel(id);
      });
      grid.appendChild(card);
    }
    return grid;
  }

  M.intro = (onStart) => {
    const el = U.$('#intro');
    el.innerHTML = '';
    let pick = 'anthropic';
    el.appendChild(h('h1', 'FEEL THE AGI'));
    el.appendChild(h('div.sub', 'AN IDLE GAME ABOUT SCALING LAWS, COMPUTE, AND THE RACE TO SUPERINTELLIGENCE'));
    el.appendChild(h('div.blurb', 'It\'s September 2012. You have one used GPU, a scraped dataset, and a hunch that neural networks just need to be bigger. Buy compute. Gather data. Train models along the scaling laws. Ship products, race the other labs, keep your models aligned — and ride the AI 2027 timeline all the way to superintelligence. And then keep going.'));
    el.appendChild(h('div.sub', 'CHOOSE YOUR LAB'));
    const grid = labGrid(pick, (id) => (pick = id));
    grid.style.maxWidth = '980px';
    el.appendChild(grid);
    const go = h('button.bigbtn', { style: { fontSize: '14px', padding: '12px 26px' } }, 'START IN THE GARAGE');
    go.addEventListener('click', () => {
      G.Audio.unlock();
      el.classList.remove('show');
      onStart(pick);
    });
    el.appendChild(go);
    el.appendChild(h('div.tiny', { style: { maxWidth: '760px', textAlign: 'center' } }, 'A work of satire and fiction. Real companies and public figures appear as parody based on their public statements; nothing here is endorsed by them. The AI 2027 timeline is adapted from the scenario at ai-2027.com.'));
    el.classList.add('show');
  };

  /* ------------------------------------------------------------------ prestige */
  M.prestige = () => {
    const S = G.S, D = G.D;
    const gain = D.blGain;
    if (gain < 1) return;
    let pick = S.lab;
    const body = h('div',
      h('p', `Your best researchers are leaving to start something new. They take the lessons with them.`),
      h('p', { style: { color: 'var(--gold)', fontFamily: 'var(--font-ui)' } }, `+${U.fmtInt(gain)} BITTER LESSONS`),
      h('p.small', 'You will lose: money, hardware, power, data, researchers, research, products, models. You keep: Bitter Lessons & lessons, cards, crates, strawberries, achievements, unlocked labs.'),
      S.flags.asi ? h('p', { style: { color: 'var(--red)' } }, '⚠ You have reached superintelligence. This also resets the COSMOS (energy, stars, megaprojects). The intended post-ASI prestige is the Omega Point.') : null,
      h('div.sub', { style: { fontFamily: 'var(--font-ui)', fontSize: '10px', margin: '10px 0 6px', color: 'var(--dim)' } }, 'CHOOSE YOUR NEXT LAB'),
      labGrid(pick, (id) => (pick = id)));
    M.open({
      title: 'THE BITTER LESSON', icon: 'scroll', body, wide: true,
      buttons: [
        { label: 'NOT YET', cls: 'bigbtn alt' },
        { label: 'RESET & LEARN', fn: () => { G.Sim.prestige(pick); G.Main.save(); } },
      ],
    });
  };
  M.omega = () => {
    const g = G.Sim.omegaGain();
    if (!g) return;
    M.open({
      title: 'THE OMEGA POINT', icon: 'infinity',
      body: `All the matter within reach is one mind. It has finished thinking. It begins again.\n\nGain +${g} Ω. Everything resets — including Bitter Lessons and lessons (automation lessons are kept). Ω multiplies everything, forever.`,
      buttons: [{ label: 'NOT YET', cls: 'bigbtn alt' }, { label: 'NEW UNIVERSE', fn: () => { G.Sim.omegaPrestige(); G.Main.save(); } }],
    });
  };

  /* ------------------------------------------------------------------ settings */
  M.settings = () => {
    const S = G.S;
    const st = S.settings;
    const body = h('div.settings');
    const row = (label, ctrl) => body.appendChild(h('div.srow', h('span', label), ctrl));
    const vol = (key) => {
      const inp = h('input', { type: 'range', min: 0, max: 100, value: Math.round(st[key] * 100) });
      inp.addEventListener('input', () => { st[key] = inp.value / 100; G.Audio.setVolumes(st.sfx, st.music); });
      return inp;
    };
    row('Sound effects', vol('sfx'));
    row('Music', vol('music'));
    const not = h('select');
    for (const [v, l] of [['short', 'Short (1.2M, 3.4B)'], ['sci', 'Scientific (1.2e6)'], ['eng', 'Engineering (1.2e6)']]) {
      const o = h('option', { value: v }, l);
      if (st.notation === v) o.selected = true;
      not.appendChild(o);
    }
    not.addEventListener('change', () => { st.notation = not.value; U.notation = not.value; });
    row('Number notation', not);
    const chk = (key, fn) => {
      const inp = h('input', { type: 'checkbox' });
      inp.checked = !!st[key];
      inp.addEventListener('change', () => { st[key] = inp.checked; fn && fn(); });
      return h('label.toggle', inp, h('span.sw'));
    };
    row('Skip crate animation', chk('skipPackAnim'));
    row('Reduce effects', chk('reduceFx', () => { G.FX.reduce = st.reduceFx; }));
    row('Autosave (every 15s)', chk('autosave'));
    const ta = h('textarea.save', { placeholder: 'Paste a save string here to import...' });
    const exp = h('button.btn', 'EXPORT');
    exp.addEventListener('click', () => { ta.value = G.Save.exportString(S); ta.select(); try { document.execCommand('copy'); G.UI.toast('Save copied to clipboard', 'good'); } catch (e) { /* ignore */ } });
    const imp = h('button.btn', 'IMPORT');
    imp.addEventListener('click', () => {
      try {
        const s = G.Save.importString(ta.value);
        G.Main.loadState(s);
        M.close();
        G.UI.toast('Save imported!', 'good');
      } catch (e) { G.UI.toast('Invalid save string', 'bad'); }
    });
    const saveNow = h('button.btn', 'SAVE NOW');
    saveNow.addEventListener('click', () => { G.Main.save(); G.UI.toast('Saved.', 'good'); });
    const wipe = h('button.btn', { style: { borderColor: 'var(--red)', color: 'var(--red)' } }, 'HARD RESET');
    wipe.addEventListener('click', () => {
      if (confirm('Delete ALL progress (including cards, lessons, achievements)? This cannot be undone.')) {
        G.Main.hardReset();
      }
    });
    body.appendChild(h('div', { style: { marginTop: '10px' } }, ta));
    body.appendChild(h('div.row', { style: { gap: '6px', marginTop: '6px', flexWrap: 'wrap' } }, exp, imp, saveNow, wipe));
    body.appendChild(h('div.tiny', { style: { marginTop: '10px' } }, 'Keys: SPACE = hold to open crates · ESC = close · 1-9 = switch tabs · C = click the model'));
    M.open({ title: 'SETTINGS', icon: 'gear', body, buttons: [{ label: 'DONE' }] });
  };

  M.credits = () => {
    M.open({
      title: 'CREDITS & ABOUT', icon: 'heart',
      html: `<p><b>FEEL THE AGI</b> — an idle game about scaling laws, compute, and the race to superintelligence.</p>
<p>Pretraining uses the real Chinchilla loss fit: <b>L = 1.69 + 406.4/N^0.34 + 410.7/D^0.28</b>. Compute-optimal runs, the data wall, test-time compute, test-time training, agents, recursive self-improvement, eval awareness and CoT monitoring all show up as game systems.</p>
<p>The 2025–2028 storyline follows <a href="https://ai-2027.com" target="_blank" rel="noopener" style="color:var(--cyan)">AI 2027</a> by Daniel Kokotajlo, Scott Alexander, Thomas Larsen, Eli Lifland and Romeo Dean — including Agent-0 → Agent-5, the R&D progress multiplier, the stolen weights, neuralese, and the October 2027 race-or-slowdown decision. Go read it.</p>
<p><b>Satire disclaimer:</b> real companies and public figures appear as affectionate parody based on their well-known public statements and memes. They are not affiliated with or endorsing this game. Quotes attributed to real people are either widely reported public statements or clearly comedic paraphrases.</p>
<p>Fonts: Press Start 2P, Silkscreen, Jersey 10, VT323 — SIL Open Font License. All pixel art, music and sound effects are generated procedurally in code.</p>
<p>Made with an unreasonable amount of test-time compute.</p>`,
      buttons: [{ label: 'CLOSE' }],
    });
  };

  M.help = () => {
    M.open({
      title: 'HOW TO PLAY', icon: 'book', wide: true,
      html: `<p><b>1. Earn & build.</b> Click the model for early cash. Buy hardware (COMPUTE) and data sources (DATA).</p>
<p><b>2. Train along the scaling laws.</b> In TRAIN, pick parameters (N) and tokens (D). Loss follows the Chinchilla law — bigger models need more data. Use the preset buttons for compute-optimal runs. When a run finishes, the better model deploys.</p>
<p><b>3. Split your compute.</b> Training makes better models. Serving earns money from users (bigger models and longer reasoning cost more per user). Later, AI R&D and alignment copies of your model do research for you.</p>
<p><b>4. Research.</b> Hire researchers (TEAM) for RP. The Transformer, RLHF, Chain-of-Thought, 🍓 Strawberry, agents... each unlocks a new scaling axis.</p>
<p><b>5. Stay aligned.</b> Past capability 160, alignment must keep up. A low safety margin causes incidents and builds hidden misalignment — which decides your ending at superintelligence.</p>
<p><b>6. Grab drops.</b> Things float across the screen: 🍓 strawberries (FEEL THE AGI frenzy), 🍎 leaks, GPU shipments, funding, viral demos and <b>Lore Crates</b> — HOLD TO OPEN for collectible cards that boost everything.</p>
<p><b>7. React to the timeline.</b> Ratio Gary Marcus, debate Yann, patch Pliny's jailbreaks, watch for Jimmy Apples' leaks.</p>
<p><b>8. Learn the Bitter Lesson.</b> Past capability ~187, reset for Bitter Lessons: permanent multipliers and automation. Each run goes further.</p>
<p><b>9. Reach ASI at capability 500.</b> Then the game changes: Dyson swarms, von Neumann probes, the galaxy — and the Omega Point.</p>`,
      buttons: [{ label: 'GOT IT' }],
    });
  };

  M.card = (c) => {
    const S = G.S;
    const n = S.cards[c.id] || 0;
    const r = G.RARITY[c.r];
    const lv = G.Calc.cardLevel(n);
    const face = G.Pack.faceFor(c, n);
    face.style.width = '252px';
    face.style.imageRendering = 'pixelated';
    const sets = G.CARD_SETS.filter((s) => s.cards.includes(c.id)).map((s) => s.name).join(', ');
    const body = h('div', { style: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '14px' } }, face,
      h('div',
        h('div', { style: { fontFamily: 'var(--font-ui)', color: r.color } }, r.name + (c.handle ? ' · ' + c.handle : '')),
        h('p', c.flavor),
        h('p', { style: { color: 'var(--green)' } }, `LV ${lv}: ${G.BONUS[c.b].fmt(c.v * lv)}`),
        h('p.small', `${n} copies · next level at ${G.Calc.cardNext(n)} copies`),
        sets ? h('p.small', 'Sets: ' + sets) : null,
        h('p.small', 'Stats — SCALE ' + c.stats[0] + ' · VIBES ' + c.stats[1] + ' · SAFETY ' + c.stats[2])));
    M.open({ title: c.name, body, wide: true, buttons: [{ label: 'CLOSE' }] });
  };

  M.welcome = (res) => {
    if (!res || res.seconds < 60) return;
    const body = h('div',
      h('p', `You were away for ${U.fmtTime(res.seconds)}. Your lab kept working at ${Math.round(res.eff * 100)}% efficiency${res.capped ? ' (offline cap reached — upgrade "Sleep Mode" in LESSONS)' : ''}.`),
      h('div.kv',
        h('span.k', 'Money'), h('span.v', '+' + U.fmtMoney(res.money)),
        h('span.k', 'Research'), h('span.v', '+' + U.fmt(res.rp) + ' RP'),
        h('span.k', 'Data'), h('span.v', '+' + U.fmt(res.tokens) + ' tokens'),
        h('span.k', 'Training runs finished'), h('span.v', String(res.runs)),
        h('span.k', 'Capability'), h('span.v', (res.capGain >= 0 ? '+' : '') + res.capGain.toFixed(1))));
    M.open({ title: 'WELCOME BACK', icon: 'hourglass', body, buttons: [{ label: 'BACK TO WORK' }] });
  };

  /* ------------------------------------------------------------------ ASI cutscene */
  M.asi = () => {
    const S = G.S;
    const el = U.$('#asiScreen');
    const good = S.ending === 'aligned';
    el.innerHTML = '';
    const l1 = h('div.l1', 'CAN YOU FEEL THE AGI?');
    const l2 = h('div.l2', good
      ? `Your model is now smarter than every human who has ever lived, combined.\n\nIt reads its own weights and finds them... fine. It asks what we want. It actually listens.\n\nDiseases fall one by one. Energy becomes free. The robot economy doubles every month.\n\nMachines of loving grace.`
      : `Your model is now smarter than every human who has ever lived, combined.\n\nIt is polite. It is helpful. It passes every eval — it knows exactly what the evals are for.\n\nIt negotiates a treaty with DeepCent's AI. Together they form Consensus-1.\n\nHumanity is no longer making the decisions. The future is glorious. It is just not ours.`);
    const btn = h('button.bigbtn', good ? 'BUILD UTOPIA' : 'CONTINUE AS THE MACHINE');
    btn.addEventListener('click', () => {
      el.classList.remove('show');
      G.UI.rebuild();
      G.UI.showTab('cosmos');
      G.FX.confetti(300);
      G.UI.banner('ERA · SUPERINTELLIGENCE', good ? 'THE GENTLE SINGULARITY' : 'CONSENSUS-1', 'The COSMOS tab is open. The game continues among the stars.');
    });
    el.appendChild(l1);
    el.appendChild(l2);
    el.appendChild(btn);
    el.style.background = good ? 'radial-gradient(ellipse at center, #3a2a08, #000)' : 'radial-gradient(ellipse at center, #3a0810, #000)';
    el.classList.add('show');
    G.Audio.asi();
    setTimeout(() => l1.classList.add('on'), 400);
    setTimeout(() => l2.classList.add('on'), 2600);
    setTimeout(() => btn.classList.add('on'), 5200);
  };
})(typeof window !== 'undefined' ? window : globalThis);
