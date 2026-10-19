'use strict';

/* =========================================================
   SECURITY GUARD — CUSTOM NIGHT (modo pós-campanha)

   - Só aparece no menu depois de acabar a Night 6 (campanha completa)
     ou com o atalho de admin ↑↑↑↑←; depois fica sempre disponível.
     Não desbloqueia Nights, não mexe na campanha nem nas cutscenes.
   - CANON SUBJECTS: cada monstro tem um AI LEVEL 0–20. 0 = desligado: o
     monstro nem entra na noite (não se mexe, não aparece, não faz som,
     não conta para o HorrorDirector). 1–20: a MESMA IA da campanha, com
     outros parâmetros (getCustomDifficulty em game.js; 20 = o cap do
     monstro, nunca "20x").
   - ANOMALIES (anomalies.js): HUSH, KNOCKER, LATCH, LUMEN. Entidades
     NÃO-CANÓNICAS, só OFF / ON (dificuldade fixa). Substituíram os antigos
     modificadores abstratos (LIMITED POWER, DARK CAMS, ...): um save antigo
     com modificadores continua a carregar, só que eles já não existem.
   - Joga-se na VEIL CORE OBSERVATION STATION (mapa e office da Night 6),
     12:00 -> 6:00 AM, sem a sequência das 6:01.
   - SCORE: soma dos AI LEVELs × 100, + o bónus fixo de cada Anomaly ligada,
     + um pequeno bónus da energia que sobrou. Recorde pessoal, presets e
     desafios completados e as recompensas ficam no browser.
   - ANOMALY CHALLENGES: ASTERION // HUSH, // KNOCKER, // LATCH, // LUMEN
     (os seis a 20 + uma Anomaly). Os quatro desbloqueiam ANOMALY OVERLOAD
     (os seis a 20 + as quatro). Recompensas só visuais.
   - A configuração só é guardada quando a noite começa ("last config").
   ========================================================= */

const CUSTOM_MONSTERS = ['black', 'watcher', 'morrow', 'echo', 'vesper', 'subjectZero'];
const CUSTOM_SHORT_NAMES = { subjectZero: 'ZERO' };   // na lista da configuração usada

function customLevels(values) {
  return Object.fromEntries(CUSTOM_MONSTERS.map((id) => [id, values[id] || 0]));
}

function customAnomalies(values) {
  return Object.fromEntries(ANOMALY_IDS.map((id) => [id, Boolean(values && values[id])]));
}

const ALL_TWENTY = customLevels({ black: 20, watcher: 20, morrow: 20, echo: 20, vesper: 20, subjectZero: 20 });

// Presets oficiais (só monstros canónicos: escolher um desliga as Anomalies)
const CUSTOM_PRESETS = [
  { id: 'original', name: 'THE ORIGINAL', levels: customLevels({ black: 20 }) },
  { id: 'dontStare', name: "DON'T STARE", levels: customLevels({ watcher: 20, vesper: 20 }) },
  { id: 'keepWatching', name: 'KEEP WATCHING', levels: customLevels({ black: 10, morrow: 20 }) },
  { id: 'silentShift', name: 'SILENT SHIFT', levels: customLevels({ morrow: 15, echo: 20 }) },
  { id: 'systemError', name: 'SYSTEM ERROR', levels: customLevels({ black: 10, watcher: 10, subjectZero: 20 }) },
  { id: 'predators', name: 'PREDATORS', levels: customLevels({ black: 20, morrow: 20, vesper: 20 }) },
  { id: 'asterion', name: 'ASTERION', levels: ALL_TWENTY }
];

// Desafios das Anomalies: os seis a 20 + uma Anomaly; o OVERLOAD só depois dos quatro
const ANOMALY_CHALLENGES = [
  ...ANOMALY_IDS.map((id) => ({ id, name: `ASTERION // ${ANOMALY_INFO[id].name}`, levels: ALL_TWENTY, anomalies: customAnomalies({ [id]: true }) })),
  { id: 'overload', name: 'ANOMALY OVERLOAD', levels: ALL_TWENTY, anomalies: customAnomalies({ hush: true, knocker: true, latch: true, lumen: true }) }
];

const CUSTOM_RULES = {
  pointsPerLevel: 100,
  powerBonusShare: 0.1,         // energia que sobrou: no máximo +10% da pontuação dos AI LEVELs (100% de energia)
  quickSteps: [0, 5, 10, 15, 20],
  randomAnomalyChance: 0.27,    // RANDOMIZE: cada Anomaly ~27% ON (nunca as quatro)
  chaosAnomalyChance: 0.5       // CHAOS: 50% cada
};

const CUSTOM_KEYS = {
  levels: 'securityGuard.customLevels',          // última configuração usada
  anomalies: 'securityGuard.customAnomalies',    // { hush: true, ... } (a última configuração usada)
  best: 'securityGuard.customBest',              // { total, ai, anomalies, power, levels, anomalyConfig }
  last: 'securityGuard.customLastScore',         // o último resultado (mesmo formato)
  asterionBest: 'securityGuard.customAsterionBest',
  presets: 'securityGuard.customPresetsDone',    // ['original', ...]
  asterion: 'securityGuard.asterionComplete',
  theme: 'securityGuard.menuTheme',              // 'asterion' | 'standard'
  challenges: 'securityGuard.anomalyChallenges', // ['hush', 'knocker', ...]
  overloadUnlocked: 'securityGuard.anomalyOverloadUnlocked',
  overloadDone: 'securityGuard.anomalyOverloadComplete',
  cursor: 'securityGuard.cursorVariant'          // 'anomaly' | 'standard' (recompensa do OVERLOAD)
};
const ASTERION_KEY = CUSTOM_KEYS.asterion;

// Se o browser não deixar guardar, fica só nesta sessão
const customMemory = {};

function customRead(key, fallback) {
  if (key in customMemory) return customMemory[key];
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function customWrite(key, value) {
  customMemory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) { /* só nesta sessão */ }
}

// 0 desligado ... 20 MAX (discreto: do apagado ao âmbar e ao vermelho, sem arco-íris)
function customTier(level) {
  if (level <= 0) return { id: 'off', label: 'OFFLINE' };
  if (level <= 5) return { id: 'easy', label: 'EASY' };
  if (level <= 10) return { id: 'moderate', label: 'MODERATE' };
  if (level <= 15) return { id: 'hard', label: 'HARD' };
  if (level <= 19) return { id: 'veryHard', label: 'VERY HARD' };
  return { id: 'max', label: 'MAX' };
}

function activeAnomalies(anomalies) {
  return ANOMALY_IDS.filter((id) => anomalies && anomalies[id]);
}

function customScore(levels, anomalies, powerLeft) {
  const aiSum = CUSTOM_MONSTERS.reduce((sum, id) => sum + levels[id], 0);
  const ai = aiSum * CUSTOM_RULES.pointsPerLevel;
  const anom = activeAnomalies(anomalies).reduce((sum, id) => sum + ANOMALY_INFO[id].bonus, 0);
  const power = Math.round(ai * CUSTOM_RULES.powerBonusShare * Math.min(100, Math.max(0, powerLeft)) / 100);
  return { ai, anomalies: anom, power, total: ai + anom + power };
}

function clampLevel(value) {
  return Math.min(20, Math.max(0, Math.round(value)));
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sameConfig(a, b) {
  return CUSTOM_MONSTERS.every((id) => a.levels[id] === b.levels[id]) && ANOMALY_IDS.every((id) => Boolean(a.anomalies[id]) === Boolean(b.anomalies[id]));
}

const customNight = {
  levels: customLevels({}),
  anomalies: customAnomalies({}),
  selected: 'black',          // o monstro (ou a Anomaly) do preview
  asterionMemory: false,      // se o browser não deixar guardar
  rows: {},
  cards: {},                  // compatibilidade: cards[id] = { card, value, minus, plus }
  previews: {},
  presetButtons: {},
  anomalyRows: {},
  challengeButtons: {},

  el: {
    menuButton: document.getElementById('btn-custom'),
    star: document.querySelector('#btn-custom .custom-star'),
    badges: document.querySelector('#btn-custom .custom-badges'),
    screen: document.getElementById('custom-screen'),
    grid: document.getElementById('cn-grid'),
    anoms: document.getElementById('cn-anoms'),
    challenges: document.getElementById('cn-challenges'),
    presets: document.getElementById('cn-presets'),
    preview: document.getElementById('cn-preview'),
    previewPhoto: document.querySelector('#cn-preview .cn-preview-photo'),
    previewName: document.querySelector('#cn-preview .cn-preview-name'),
    previewNum: document.querySelector('#cn-preview .cn-preview-num'),
    previewTier: document.querySelector('#cn-preview .cn-preview-tier'),
    previewFile: document.querySelector('#cn-preview .cn-preview-file'),
    summary: document.getElementById('cn-summary'),
    start: document.getElementById('cn-start'),
    random: document.getElementById('cn-random'),
    chaos: document.getElementById('cn-chaos'),
    reset: document.getElementById('cn-reset'),
    theme: document.getElementById('cn-theme'),
    cursor: document.getElementById('cn-cursor'),
    back: document.getElementById('cn-back'),
    fail: document.getElementById('cn-fail'),
    failConfig: document.getElementById('cn-fail-config'),
    retry: document.getElementById('cn-retry'),
    failBack: document.getElementById('cn-fail-back'),
    result: document.getElementById('cn-result'),
    resultLines: document.getElementById('cn-result-lines'),
    resultNotes: document.getElementById('cn-result-notes'),
    again: document.getElementById('cn-again'),
    resultBack: document.getElementById('cn-result-back'),
    resultMenu: document.getElementById('cn-result-menu')
  },

  /* ----- Guardar / carregar ----- */

  // A última configuração usada (só muda quando uma noite começa).
  // Saves antigos (com modificadores) continuam válidos: os modificadores são ignorados.
  load() {
    const saved = customRead(CUSTOM_KEYS.levels, null);
    this.levels = customLevels({});
    if (saved && typeof saved === 'object') {
      for (const id of CUSTOM_MONSTERS) {
        const value = Number(saved[id]);
        if (Number.isFinite(value)) this.levels[id] = clampLevel(value);
      }
    }
    const anomalies = customRead(CUSTOM_KEYS.anomalies, {});
    this.anomalies = customAnomalies(anomalies && typeof anomalies === 'object' ? anomalies : {});
  },

  save() {
    customWrite(CUSTOM_KEYS.levels, { ...this.levels });
    customWrite(CUSTOM_KEYS.anomalies, { ...this.anomalies });
  },

  best() { return customRead(CUSTOM_KEYS.best, null); },
  asterionBest() { return customRead(CUSTOM_KEYS.asterionBest, 0); },
  presetsDone() { return customRead(CUSTOM_KEYS.presets, []); },
  challengesDone() {
    const list = customRead(CUSTOM_KEYS.challenges, []);
    return Array.isArray(list) ? list.filter((id) => ANOMALY_IDS.includes(id)) : [];
  },
  overloadUnlocked() {
    return customRead(CUSTOM_KEYS.overloadUnlocked, false) === true || ANOMALY_IDS.every((id) => this.challengesDone().includes(id));
  },
  overloadDone() { return customRead(CUSTOM_KEYS.overloadDone, false) === true; },
  cursorVariantOn() { return this.overloadDone() && customRead(CUSTOM_KEYS.cursor, 'anomaly') === 'anomaly'; },

  asterionDone() {
    if (this.asterionMemory) return true;
    try {
      return localStorage.getItem(ASTERION_KEY) === 'true';
    } catch (error) {
      return false;
    }
  },

  // Primeira vez que se acaba o ASTERION: estrela no menu, documento VEIL-0811 nos ARCHIVES, tema do menu
  markAsterion() {
    this.asterionMemory = true;
    try {
      localStorage.setItem(ASTERION_KEY, 'true');
    } catch (error) { /* só nesta sessão */ }
    customWrite(CUSTOM_KEYS.theme, 'asterion');
    this.renderMenuButton();
    emitGameEvent('asterionComplete');
  },

  themeOn() {
    return this.asterionDone() && customRead(CUSTOM_KEYS.theme, 'asterion') === 'asterion';
  },

  /* ----- Menu ----- */

  // Só aparece no menu depois de acabar a Night 6 (ou com o atalho de admin ↑↑↑↑←)
  renderMenuButton() {
    const unlocked = isCustomNightUnlocked();
    this.el.menuButton.classList.toggle('hidden', !unlocked);
    this.el.menuButton.disabled = !unlocked;
    this.el.star.classList.toggle('hidden', !this.asterionDone());
    // Recompensa dos ANOMALY CHALLENGES: uma marca por desafio (e outra pelo OVERLOAD)
    const done = this.challengesDone();
    this.el.badges.replaceChildren(...ANOMALY_IDS.filter((id) => done.includes(id)).map((id) => {
      const mark = document.createElement('i');
      mark.dataset.anomaly = id;
      mark.title = `ASTERION // ${ANOMALY_INFO[id].name}`;
      return mark;
    }));
    if (this.overloadDone()) {
      const mark = document.createElement('i');
      mark.dataset.anomaly = 'overload';
      mark.title = 'ANOMALY OVERLOAD';
      this.el.badges.appendChild(mark);
    }
    this.el.badges.classList.toggle('hidden', !done.length && !this.overloadDone());
    ui.startScreen.classList.toggle('asterion-theme', this.themeOn());
    document.documentElement.classList.toggle('cursor-anomaly', this.cursorVariantOn());
  },

  open() {
    if (!isCustomNightUnlocked()) return;
    this.load();                       // volta sempre à última configuração usada
    this.render();
    hide(ui.startScreen);
    show(this.el.screen);
    restartAnimation(this.el.screen, 'cn-boot');
    emitGameEvent('cnOpen');
  },

  close() {
    hide(this.el.screen);
    show(ui.startScreen);
    this.renderMenuButton();
  },

  /* ----- Ecrã ----- */

  build() {
    for (const id of CUSTOM_MONSTERS) {
      const row = document.createElement('div');
      row.className = 'cn-row';
      row.dataset.monster = id;
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'cn-name';
      name.textContent = MONSTER_TYPES[id].name;
      name.addEventListener('click', () => this.select(id));
      const minus = this.button('cn-step', '−', () => this.change(id, -1));
      const value = this.button('cn-level', '0', () => this.cycle(id));
      value.title = '0 · 5 · 10 · 15 · 20';
      const plus = this.button('cn-step', '+', () => this.change(id, 1));
      // A barra de 20 segmentos também serve de "slider": clicar num segmento escolhe esse nível
      const bar = document.createElement('div');
      bar.className = 'cn-bar';
      const segments = [];
      for (let level = 1; level <= 20; level++) {
        const seg = document.createElement('button');
        seg.type = 'button';
        seg.className = 'cn-seg';
        seg.setAttribute('aria-label', `${MONSTER_TYPES[id].name} AI ${level}`);
        seg.addEventListener('click', () => this.set(id, level));
        bar.appendChild(seg);
        segments.push(seg);
      }
      const tier = document.createElement('span');
      tier.className = 'cn-tier';
      row.append(name, minus, value, plus, bar, tier);
      // passar o rato (ou tocar) numa linha mostra esse monstro no preview
      row.addEventListener('pointerenter', () => this.select(id, true));
      this.el.grid.appendChild(row);
      this.rows[id] = { row, value, minus, plus, segments, tier };
      this.cards[id] = { card: row, value, minus, plus };
      // preview: a mesma figura do jogo (reutiliza os desenhos; nada de imagens novas)
      const photo = document.createElement('div');
      photo.className = 'cn-photo';
      photo.dataset.monster = id;
      photo.appendChild(makePortrait(id));
      this.el.previewPhoto.appendChild(photo);
      this.previews[id] = photo;
    }

    // ANOMALIES: só OFF / ON (sem sliders)
    for (const id of ANOMALY_IDS) {
      const info = ANOMALY_INFO[id];
      const row = document.createElement('div');
      row.className = 'cn-anom';
      row.dataset.anomaly = id;
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'cn-anom-name';
      name.innerHTML = '<span></span><small>NON-CANON</small>';
      name.querySelector('span').textContent = info.name;
      name.addEventListener('click', () => this.select(id));
      const toggle = this.button('cn-anom-toggle', '', () => this.toggleAnomaly(id));
      toggle.innerHTML = '<span class="cn-off">OFF</span><span class="cn-on">ON</span>';
      toggle.setAttribute('aria-label', `${info.name} ON / OFF`);
      const bonus = document.createElement('span');
      bonus.className = 'cn-anom-bonus';
      bonus.textContent = `+${info.bonus}`;
      row.append(name, toggle, bonus);
      row.addEventListener('pointerenter', () => this.select(id, true));
      this.el.anoms.appendChild(row);
      this.anomalyRows[id] = { row, toggle };
      const photo = document.createElement('div');
      photo.className = 'cn-photo cn-photo-anom';
      photo.dataset.anomaly = id;
      photo.appendChild(anomalyFigure(id));
      this.el.previewPhoto.appendChild(photo);
      this.previews[id] = photo;
    }

    for (const preset of CUSTOM_PRESETS) {
      const button = this.button(`cn-preset${preset.id === 'asterion' ? ' cn-preset-asterion' : ''}`, '', () => this.applyPreset(preset));
      button.dataset.preset = preset.id;
      const mark = document.createElement('span');
      mark.className = 'cn-check';
      const label = document.createElement('span');
      label.className = 'cn-preset-name';
      label.textContent = preset.name;
      button.append(mark, label);
      this.el.presets.appendChild(button);
      this.presetButtons[preset.id] = button;
    }

    for (const challenge of ANOMALY_CHALLENGES) {
      const button = this.button(`cn-challenge${challenge.id === 'overload' ? ' cn-overload' : ''}`, '', () => this.applyChallenge(challenge));
      button.dataset.challenge = challenge.id;
      button.innerHTML = '<span class="cn-check"></span><span class="cn-preset-name"></span>';
      button.querySelector('.cn-preset-name').textContent = challenge.name;
      this.el.challenges.appendChild(button);
      this.challengeButtons[challenge.id] = button;
    }
  },

  button(className, text, onClick, sound = 'cnTick') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ctrl-btn ${className}`;
    button.textContent = text;
    button.addEventListener('click', () => onClick());
    button.addEventListener('click', () => emitGameEvent(sound));
    return button;
  },

  set(id, value) {
    const level = clampLevel(value);
    if (level === this.levels[id]) return;
    this.levels[id] = level;
    this.selected = id;
    this.render();
    restartAnimation(this.rows[id].value, 'cn-bump');
  },

  change(id, delta) {
    this.set(id, this.levels[id] + delta);
  },

  // Clicar no número: salta para o próximo nível "redondo" (0 · 5 · 10 · 15 · 20)
  cycle(id) {
    const steps = CUSTOM_RULES.quickSteps;
    const next = steps.find((s) => s > this.levels[id]);
    this.set(id, next === undefined ? 0 : next);
  },

  select(id, quiet) {
    if (this.selected === id) return;
    this.selected = id;
    this.renderPreview();
    if (!quiet) emitGameEvent('cnTick');
  },

  toggleAnomaly(id) {
    this.anomalies[id] = !this.anomalies[id];
    this.selected = id;
    this.render();
    restartAnimation(this.anomalyRows[id].toggle, 'cn-bump');
  },

  bumpAll() {
    for (const id of CUSTOM_MONSTERS) restartAnimation(this.rows[id].value, 'cn-bump');
    for (const id of ANOMALY_IDS) restartAnimation(this.anomalyRows[id].toggle, 'cn-bump');
  },

  // Presets canónicos: só os monstros do Project VEIL (as Anomalies ficam OFF)
  applyPreset(preset) {
    this.levels = { ...preset.levels };
    this.anomalies = customAnomalies({});
    this.render();
    this.bumpAll();
  },

  applyChallenge(challenge) {
    if (challenge.id === 'overload' && !this.overloadUnlocked()) return;
    this.levels = { ...challenge.levels };
    this.anomalies = { ...challenge.anomalies };
    if (challenge.id !== 'overload') this.selected = challenge.id;
    this.render();
    this.bumpAll();
  },

  // RANDOMIZE: 0–15, com variedade (pelo menos dois monstros ativos, nunca tudo igual).
  // Cada Anomaly ~27% ON; as quatro ao mesmo tempo nunca.
  randomize() {
    let levels;
    do {
      levels = customLevels(Object.fromEntries(CUSTOM_MONSTERS.map((id) => [id, Math.random() < 0.25 ? 0 : randomInt(1, 15)])));
    } while (CUSTOM_MONSTERS.filter((id) => levels[id] > 0).length < 2 || new Set(Object.values(levels)).size < 3);
    let anomalies;
    do {
      anomalies = customAnomalies(Object.fromEntries(ANOMALY_IDS.map((id) => [id, Math.random() < CUSTOM_RULES.randomAnomalyChance])));
    } while (activeAnomalies(anomalies).length === ANOMALY_IDS.length);
    this.levels = levels;
    this.anomalies = anomalies;
    this.render();
    this.bumpAll();
  },

  // CHAOS: tudo entre 5 e 20, cada Anomaly 50%. Não promete ser justo.
  chaos() {
    this.levels = customLevels(Object.fromEntries(CUSTOM_MONSTERS.map((id) => [id, randomInt(5, 20)])));
    this.anomalies = customAnomalies(Object.fromEntries(ANOMALY_IDS.map((id) => [id, Math.random() < CUSTOM_RULES.chaosAnomalyChance])));
    this.render();
    this.bumpAll();
  },

  reset() {
    this.levels = customLevels({});
    this.anomalies = customAnomalies({});
    this.render();
  },

  toggleTheme() {
    customWrite(CUSTOM_KEYS.theme, this.themeOn() ? 'standard' : 'asterion');
    this.render();
    this.renderMenuButton();
  },

  toggleCursor() {
    customWrite(CUSTOM_KEYS.cursor, this.cursorVariantOn() ? 'standard' : 'anomaly');
    this.render();
    this.renderMenuButton();
  },

  activePreset() {
    const anyAnomaly = activeAnomalies(this.anomalies).length > 0;
    if (anyAnomaly) return null;
    return CUSTOM_PRESETS.find((p) => CUSTOM_MONSTERS.every((id) => p.levels[id] === this.levels[id])) || null;
  },

  activeChallenge() {
    return ANOMALY_CHALLENGES.find((c) => sameConfig(c, this)) || null;
  },

  render() {
    for (const id of CUSTOM_MONSTERS) {
      const r = this.rows[id];
      const level = this.levels[id];
      const tier = customTier(level);
      r.row.dataset.tier = tier.id;
      r.value.textContent = String(level);
      r.tier.textContent = tier.label;
      r.minus.disabled = level <= 0;
      r.plus.disabled = level >= 20;
      r.segments.forEach((seg, i) => seg.classList.toggle('on', i < level));
    }
    for (const id of ANOMALY_IDS) {
      const on = Boolean(this.anomalies[id]);
      const a = this.anomalyRows[id];
      a.row.classList.toggle('is-on', on);
      a.toggle.classList.toggle('is-on', on);
      a.toggle.setAttribute('aria-pressed', String(on));
    }
    const active = this.activePreset();
    const done = this.presetsDone();
    for (const preset of CUSTOM_PRESETS) {
      const b = this.presetButtons[preset.id];
      b.classList.toggle('is-active', Boolean(active) && active.id === preset.id);
      b.classList.toggle('is-done', done.includes(preset.id));
      b.querySelector('.cn-check').textContent = done.includes(preset.id) ? '✓' : '';
    }
    const challenge = this.activeChallenge();
    const cleared = this.challengesDone();
    const overloadOpen = this.overloadUnlocked();
    for (const c of ANOMALY_CHALLENGES) {
      const b = this.challengeButtons[c.id];
      const isDone = c.id === 'overload' ? this.overloadDone() : cleared.includes(c.id);
      const locked = c.id === 'overload' && !overloadOpen;
      b.classList.toggle('is-active', Boolean(challenge) && challenge.id === c.id);
      b.classList.toggle('is-done', isDone);
      b.classList.toggle('is-locked', locked);
      b.disabled = locked;
      b.querySelector('.cn-check').textContent = isDone ? '✓' : locked ? '■' : '';
      b.querySelector('.cn-preset-name').textContent = locked ? 'ANOMALY OVERLOAD — CLEAR ALL FOUR' : c.name;
    }
    this.renderPreview();
    this.renderSummary(active, challenge);
    this.el.theme.classList.toggle('hidden', !this.asterionDone());
    this.el.theme.textContent = `MENU THEME: ${this.themeOn() ? 'ASTERION' : 'STANDARD'}`;
    this.el.cursor.classList.toggle('hidden', !this.overloadDone());
    this.el.cursor.textContent = `CURSOR: ${this.cursorVariantOn() ? 'ANOMALY' : 'STANDARD'}`;
  },

  renderPreview() {
    const id = this.selected;
    const isAnomaly = ANOMALY_IDS.includes(id);
    for (const [key, photo] of Object.entries(this.previews)) photo.classList.toggle('on', key === id);
    this.el.preview.classList.toggle('is-anomaly', isAnomaly);
    if (isAnomaly) {
      // ANOMALY FILE: nome, render, descrição curta, como sobreviver, ON/OFF
      const info = ANOMALY_INFO[id];
      const on = Boolean(this.anomalies[id]);
      this.el.preview.dataset.tier = on ? 'max' : 'off';
      this.el.previewName.textContent = info.name;
      this.el.previewNum.textContent = on ? 'ON' : 'OFF';
      this.el.previewTier.textContent = `+${info.bonus}`;
      this.el.previewFile.replaceChildren(...[
        ['cnp-head', `ANOMALY FILE ${info.code}`],
        ['cnp-tag', 'NON-CANON · SIMULATION ENTITY'],
        ['cnp-desc', info.desc],
        ['cnp-surv', `SURVIVAL: ${info.survival}`]
      ].map(([cls, text]) => {
        const p = document.createElement('p');
        p.className = cls;
        p.textContent = text;
        return p;
      }));
    } else {
      const level = this.levels[id];
      const tier = customTier(level);
      this.el.preview.dataset.tier = tier.id;
      this.el.previewName.textContent = MONSTER_TYPES[id].name;
      this.el.previewNum.textContent = `AI ${level}`;
      this.el.previewTier.textContent = tier.label;
      this.el.previewFile.replaceChildren();
    }
    for (const [key, r] of Object.entries(this.rows)) r.row.classList.toggle('is-selected', key === id);
    for (const [key, a] of Object.entries(this.anomalyRows)) a.row.classList.toggle('is-selected', key === id);
  },

  renderSummary(active, challenge) {
    const score = customScore(this.levels, this.anomalies, 0);
    const count = CUSTOM_MONSTERS.filter((id) => this.levels[id] > 0).length;
    const anomCount = activeAnomalies(this.anomalies).length;
    const best = this.best();
    const lines = [];
    const main = document.createElement('div');
    main.className = 'cn-summary-main';
    main.textContent = count === 0 && anomCount === 0
      ? 'NO SUBJECTS ACTIVE — EMPTY NIGHT (NO SCORE)'
      : `SUBJECTS ${count}/6 · AI SCORE ${score.ai} · ANOMALIES ${anomCount}/4 (+${score.anomalies})`;
    lines.push(main);
    const record = document.createElement('div');
    record.className = 'cn-summary-best';
    record.textContent = `PERSONAL BEST ${best ? best.total : '—'}`
      + (this.asterionDone() ? `   ★ ASTERION ${this.asterionBest() || 'CLEARED'}` : '');
    lines.push(record);
    if ((active && active.id === 'asterion') || challenge) {
      const warn = document.createElement('div');
      warn.className = 'cn-warning';
      warn.textContent = challenge && challenge.id === 'overload' ? 'ANOMALY OVERLOAD — EXTREME CONFIGURATION' : 'EXTREME CONFIGURATION';
      lines.push(warn);
    }
    this.el.summary.replaceChildren(...lines);
  },

  /* ----- Começar ----- */

  // A noite "custom" usa o mapa, a office e as rotas da Night 6, só com os monstros ativos (+ as Anomalies)
  buildNight(levels = this.levels, anomalies = this.anomalies) {
    const base = NIGHTS[6];
    const monsters = {};
    for (const id of CUSTOM_MONSTERS) {
      if (levels[id] > 0) monsters[id] = base.monsters[id];
    }
    NIGHTS.custom = {
      ...base,
      label: 'CUSTOM NIGHT',
      extendedEnding: false,       // às 6:00: vitória normal (sem 6:01)
      finalNight: false,           // sem os eventos narrativos da Night 6
      customLevels: { ...levels },
      customAnomalies: customAnomalies(anomalies),
      power: { ...base.power },
      monsters
    };
  },

  start() {
    this.save();
    this.buildNight();
    hide(this.el.screen);
    emitGameEvent('cnStart');
    requestNight('custom');
  },

  // RETRY SAME CONFIG / PLAY AGAIN: a mesma configuração da noite que acabou (níveis e Anomalies)
  retry() {
    const night = NIGHTS.custom;
    if (!night) return;
    this.buildNight(night.customLevels, night.customAnomalies);
    startNight('custom');
  },

  backToCustom() {
    showMenu();
    this.open();
  },

  /* ----- Fim da noite ----- */

  configLines(levels, anomalies) {
    const lines = CUSTOM_MONSTERS.map((id) => {
      const div = document.createElement('div');
      div.className = 'cn-config-row';
      div.dataset.tier = customTier(levels[id]).id;
      div.innerHTML = '<span></span><b></b>';
      div.querySelector('span').textContent = CUSTOM_SHORT_NAMES[id] || MONSTER_TYPES[id].name;
      div.querySelector('b').textContent = String(levels[id]);
      return div;
    });
    const active = activeAnomalies(anomalies);
    if (active.length) {
      const div = document.createElement('div');
      div.className = 'cn-config-mods';
      div.textContent = `ANOMALIES: ${active.map((id) => ANOMALY_INFO[id].name).join(' · ')}`;
      lines.push(div);
    }
    return lines;
  },

  onLose() {
    const night = NIGHTS.custom;
    this.el.failConfig.replaceChildren(...this.configLines(night.customLevels, night.customAnomalies));
    ui.loseScreen.classList.add('is-custom');
    show(this.el.fail);
  },

  onWin() {
    const night = NIGHTS.custom;
    const levels = night.customLevels;
    const anomalies = night.customAnomalies;
    const score = customScore(levels, anomalies, power);
    const notes = [];
    const scored = score.total > 0;

    // Último resultado e recorde pessoal
    const record = { total: score.total, ai: score.ai, anomalies: score.anomalies, power: score.power, levels: { ...levels }, anomalyConfig: { ...anomalies } };
    customWrite(CUSTOM_KEYS.last, record);
    const best = this.best();
    const newBest = scored && (!best || score.total > best.total);
    if (newBest) customWrite(CUSTOM_KEYS.best, record);

    // Preset completado (só conta a configuração exata dos níveis)
    const preset = CUSTOM_PRESETS.find((p) => CUSTOM_MONSTERS.every((id) => p.levels[id] === levels[id]));
    if (preset) {
      const done = this.presetsDone();
      if (!done.includes(preset.id)) {
        customWrite(CUSTOM_KEYS.presets, [...done, preset.id]);
        notes.push(`PRESET COMPLETED: ${preset.name}`);
      }
    }

    // ASTERION (20/20/20/20/20/20): melhor pontuação própria, e a recompensa só da primeira vez
    if (preset && preset.id === 'asterion') {
      if (score.total > this.asterionBest()) customWrite(CUSTOM_KEYS.asterionBest, score.total);
      if (!this.asterionDone()) {
        this.markAsterion();
        notes.push('★ ASTERION CLEARED');
        notes.push('ARCHIVE FILE RECOVERED: VEIL-0811 — FINAL OBSERVATION REPORT');
        notes.push('ASTERION MENU THEME UNLOCKED');
      }
    }

    // ANOMALY CHALLENGES (configuração exata) e ANOMALY OVERLOAD
    const challenge = ANOMALY_CHALLENGES.find((c) => sameConfig(c, { levels, anomalies }));
    if (challenge && challenge.id !== 'overload') {
      const done = this.challengesDone();
      if (!done.includes(challenge.id)) {
        const list = [...done, challenge.id];
        customWrite(CUSTOM_KEYS.challenges, list);
        notes.push(`✓ ${challenge.name} CLEARED`);
        notes.push(`CONCEPT VARIANT FILED IN THE JOURNAL: ${ANOMALY_INFO[challenge.id].name}`);
        if (ANOMALY_IDS.every((id) => list.includes(id)) && customRead(CUSTOM_KEYS.overloadUnlocked, false) !== true) {
          customWrite(CUSTOM_KEYS.overloadUnlocked, true);
          notes.push('ANOMALY OVERLOAD UNLOCKED');
        }
        emitGameEvent('anomalyChallenge', { id: challenge.id });
      }
    }
    if (challenge && challenge.id === 'overload' && !this.overloadDone()) {
      customWrite(CUSTOM_KEYS.overloadDone, true);
      notes.push('✶ ANOMALY OVERLOAD CLEARED');
      notes.push('ANOMALY CURSOR UNLOCKED');
      emitGameEvent('anomalyOverload');
    }
    if (challenge) this.renderMenuButton();

    const line = (label, value, cls = '') => {
      const div = document.createElement('div');
      div.className = `cn-result-line ${cls}`;
      div.innerHTML = '<span></span><b></b>';
      div.querySelector('span').textContent = label;
      div.querySelector('b').textContent = value;
      return div;
    };
    const lines = [
      line('AI SCORE', String(score.ai)),
      line('ANOMALIES', `+${score.anomalies}`),
      line('POWER BONUS', `+${score.power}`),
      line('', '', 'cn-result-rule'),
      line('TOTAL', String(score.total), 'cn-result-total')
    ];
    if (newBest) lines.push(line('NEW PERSONAL BEST', '', 'cn-result-best'));
    else if (best && scored) lines.push(line('PERSONAL BEST', String(best.total), 'cn-result-prev'));
    lines.forEach((el, i) => { el.style.animationDelay = `${0.25 + i * 0.22}s`; });
    this.el.resultLines.replaceChildren(...lines);
    this.el.resultNotes.replaceChildren(...notes.map((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));

    ui.winScreen.classList.add('is-custom');
    later(2200, () => {
      show(this.el.result);
      emitGameEvent('cnResult', { total: score.total, best: newBest });
    });
    return score;
  },

  // Sai do modo "custom" dos ecrãs de fim (qualquer noite nova, ou o menu)
  clearEndScreens() {
    ui.loseScreen.classList.remove('is-custom');
    ui.winScreen.classList.remove('is-custom');
    hide(this.el.fail);
    hide(this.el.result);
  }
};

// Retrato: uma cópia do desenho da câmara (o mesmo do jogo e do Journal)
function makePortrait(id) {
  const source = document.getElementById(`cam-${id}`);
  const copy = source.cloneNode(true);
  copy.removeAttribute('id');
  copy.classList.remove('hidden', 'cam-monster', 'zero-fake');
  if (id === 'black') copy.dataset.pose = 'close';   // de frente: lê-se melhor num retrato pequeno
  if (id === 'morrow') { copy.dataset.pose = 'stand'; copy.dataset.mood = 'standing'; }
  if (id === 'echo') { copy.dataset.pose = 'crouch'; copy.dataset.mood = 'calm'; copy.dataset.part = 'full'; }
  if (id === 'subjectZero') { copy.dataset.pose = 'stand'; delete copy.dataset.glitch; }
  if (id === 'vesper') { copy.dataset.stage = '0'; copy.dataset.near = 'far'; copy.dataset.form = 'tall'; }
  return copy;
}

customNight.load();
customNight.build();
customNight.render();
customNight.renderMenuButton();

// Fim da noite custom: pontuação ou falha (as Nights 1–6 não passam por aqui)
onGameEvent('nightWon', (data) => {
  if (data && data.night === 'custom') customNight.onWin();
});
onGameEvent('loseScreen', () => {
  if (currentNight === 'custom') customNight.onLose();
});
for (const name of ['menu', 'nightIntro']) onGameEvent(name, () => customNight.clearEndScreens());

for (const name of ['menu', 'campaignComplete', 'customUnlocked', 'saveReset']) {
  onGameEvent(name, () => {
    if (name === 'saveReset') {
      customNight.asterionMemory = false;
      for (const key of Object.keys(customMemory)) delete customMemory[key];
      customNight.load();
      customNight.render();
    }
    customNight.renderMenuButton();
  });
}

// (o som de clique destes já vem do game.js: são botões .overlay .ctrl-btn do HTML)
customNight.el.menuButton.addEventListener('click', () => customNight.open());
customNight.el.back.addEventListener('click', () => customNight.close());
customNight.el.start.addEventListener('click', () => customNight.start());
customNight.el.random.addEventListener('click', () => customNight.randomize());
customNight.el.chaos.addEventListener('click', () => customNight.chaos());
customNight.el.reset.addEventListener('click', () => customNight.reset());
customNight.el.theme.addEventListener('click', () => customNight.toggleTheme());
customNight.el.cursor.addEventListener('click', () => customNight.toggleCursor());
customNight.el.retry.addEventListener('click', () => customNight.retry());
customNight.el.again.addEventListener('click', () => customNight.retry());
customNight.el.failBack.addEventListener('click', () => customNight.backToCustom());
customNight.el.resultBack.addEventListener('click', () => customNight.backToCustom());
customNight.el.resultMenu.addEventListener('click', showMenu);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || customNight.el.screen.classList.contains('hidden')) return;
  customNight.close();
});
