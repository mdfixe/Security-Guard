'use strict';

/* =========================================================
   SECURITY GUARD — SUBJECT ZERO (VEIL-0) — Night 6

   Ataca a CONFIANÇA DO JOGADOR NA INFORMAÇÃO.

   - Tem uma posição real: CAM 15 -> CAM 14 -> CAM 13 -> sistema
     central (fase final) -> OFFICE. Quase imóvel no início.
   - zeroInfluence (invisível) sobe com a noite; faz-o andar mais
     depressa e corromper mais vezes.
   - CORRUPÇÕES (subjectZeroCorruption): feed falso, Black falso,
     áudio imitado, luz falsa, etiqueta de câmara trocada.
     Normalmente 1 de cada vez (no fim, no máximo 2).
     TODAS têm pistas, e a assinatura comum: o relógio da câmara
     a mostrar 08:11, uma linha vertical, "V0", um som invertido.
   - SIGNAL VERIFY: verifica o feed atual. Real -> SIGNAL VERIFIED.
     Falso -> SIGNAL INVALID e a corrupção desaparece.
     Gasta um pouco de energia e tem cooldown.
   - OBSERVATION LOCK: vê-lo numa câmara REAL (CAM 14 ou 13) durante
     1.5–2.5 s (1.5 s se acabaste de verificar o feed) faz descer a
     influência e obriga-o a recuar. Na CAM 15 vê-lo só o segura.
     Ser observado NÃO o irrita (não é o Watcher).
   - FASE FINAL: os monitores falham; aparece o PURGE SIGNAL no
     terminal central — segurar ~2 s empurra-o para a CAM 14 (com
     cooldown; cada fase final seguinte dá menos tempo). Se falhar: entra.
   - Também trata dos eventos da Night 6 (5:00, 5:30, 5:59).
   ========================================================= */

const ZERO = {
  idleUntil: 10,                 // influência abaixo disto: quase imóvel
  influenceRate: [0.07, 0.1, 0.14, 0.18, 0.26, 0.34],    // por segundo, por hora (12 AM ... 5 AM)
  at5amBoost: 12,                // às 5:00 fica claramente mais ativo
  stepMin: 30,                   // segundos por câmara com influência 0...
  stepMax: 40,
  stepFast: 0.4,                 // ...e com influência 100 (×0.4)
  lockVerified: 1.5,             // OBSERVATION LOCK: segundos a ver num feed real e verificado
  lockUnverified: 2.5,           // ...ou num feed real não verificado
  lockInfluenceDrop: 12,
  lockCooldown: 16,              // segundos entre dois LOCKs
  finalWindow: 11,               // fase final: segundos para o PURGE (menos com mais influência)
  finalWindowMin: 7.5,
  finalRepeatCut: 1.5,           // cada fase final seguinte dá menos 1.5 s...
  finalWindowFloor: 5,           // ...até este mínimo
  purgeHold: 2,                  // segurar o PURGE SIGNAL
  purgeCooldown: 45,             // defesa de emergência: não dá para usar sempre
  purgePower: 5,                 // % de energia
  purgeInfluenceDrop: 15,
  purgeReturnStage: 1,           // depois do PURGE volta para a CAM 14 (não para o núcleo)
  verifyCooldown: 8,             // SIGNAL VERIFY: 6–10 s
  verifyPower: 1,
  verifiedFor: 6,                // um feed verificado conta como "confirmado" durante uns segundos
  firstCorruptionAt: 6,          // influência mínima para a primeira corrupção
  gapMax: 42,                    // segundos entre corrupções (influência 0 -> 100)
  gapMin: 13,
  durations: {
    falseCamera: [7, 11],
    fakeBlack: [6, 9],
    cameraLabel: [3, 5],
    falseLightArmed: 14,         // a próxima luz ligada nestes segundos pode ser falsa
    falseLightShow: 0.9
  }
};

// Câmara "vizinha" para a troca de etiqueta (o mapa continua a mostrar a verdadeira)
const ZERO_LABEL_SWAP = {
  cam1: 'cam2', cam2: 'cam3', cam3: 'cam2', cam4: 'cam5', cam5: 'cam4', cam6: 'cam7', cam7: 'cam6',
  cam8: 'cam9', cam9: 'cam8', cam10: 'cam8', cam11: 'cam12', cam12: 'cam11', cam13: 'cam15',
  cam14: 'cam13', cam15: 'cam13', ventA: 'ventB', ventB: 'ventA', ventC: 'ventB', ventD: 'ventE', ventE: 'ventD'
};

// Estado do sistema (fora do objeto do monstro: também serve as Nights sem Zero)
const zero = {
  influence: 0,
  awake: false,                  // já saiu do "quase imóvel" do início
  finals: 0,                     // quantas fases finais já houve nesta noite
  corruptions: [],
  nextCorruption: 30,
  history: [],                   // posições antigas (para o feed "ligeiramente antigo")
  historyTimer: 0,
  verifyCooldown: 0,
  verified: null,                // { cam, until }
  purge: { cooldown: 0, holding: false, progress: 0 },
  events: {},
  viewCorrupt: false,
  officeCorrupt: false,
  lastVerifyShown: '',

  el: {
    verifyButtons: document.querySelectorAll('.verify-btn'),   // um em cada hall + um nas câmaras
    purge: document.getElementById('btn-purge'),
    purgeFill: document.querySelector('#btn-purge .purge-fill'),
    feedback: document.getElementById('verify-feedback'),
    stamp: document.getElementById('cam-timestamp'),
    terminal: document.getElementById('n6-terminal')
  }
};

// O desenho do Subject Zero está num <template> (câmara e Journal)
const zeroTemplate = document.getElementById('tpl-zero');
document.querySelectorAll('.zero-figure').forEach((el) => {
  el.appendChild(zeroTemplate.content.cloneNode(true));
});

function zeroHere() {
  return Boolean(monsters.subjectZero);
}

/* ---------------------------------------------------------
   VISUAL (só imagem; não mexe em nenhuma regra)
   - pose deitada / dobrada, rara, nas CAM 14 e 15 (escolhida ao chegar);
   - ao mudar de sítio: sem passos — um salto de imagem e já está noutro lado;
   - FRAMES CORROMPIDOS: muito raramente, durante 1–3 frames, a imagem dele está errada
     (sem túnica, membros a mais, a cabeça entreaberta, virada, deitado, a túnica vazia).
     Mais vezes num feed corrompido e com mais dificuldade. Não querem dizer que ele mudou.
   --------------------------------------------------------- */
const ZERO_VISUAL = {
  lowChance: 0.15,
  glitchEvery: [22, 40],          // segundos de jogo a vê-lo entre frames corrompidos (feed normal)
  glitchCorruptFactor: 0.35,      // num feed com a assinatura (08:11): muito mais vezes
  glitchFrames: ['bare', 'limbs', 'open', 'turn', 'lying', 'empty'],
  glitchMs: [50, 140]             // 1–3 frames
};
const zeroCamEl = document.getElementById('cam-subjectZero');
let zeroGlitchTimer = 30;

function zeroGlitchFrame(el, frame) {
  el.dataset.glitch = frame || randomItem(ZERO_VISUAL.glitchFrames);
  setTimeout(() => { delete el.dataset.glitch; }, randomBetween(...ZERO_VISUAL.glitchMs));
}

function updateZeroVisual(dt) {
  const z = monsters.subjectZero;
  zeroCamEl.style.setProperty('--z-rate', Math.min(1.6, (z.settings.corruptionRate || 1)).toFixed(2));
  if (!camerasOpen || zeroCamEl.classList.contains('hidden')) return;
  const corrupt = ui.camScreen.classList.contains('zero-corrupt');
  zeroGlitchTimer -= dt * (z.settings.corruptionRate || 1) / (corrupt ? ZERO_VISUAL.glitchCorruptFactor : 1);
  if (zeroGlitchTimer > 0) return;
  zeroGlitchTimer = randomBetween(...ZERO_VISUAL.glitchEvery);
  zeroGlitchFrame(zeroCamEl);
  emitGameEvent('zeroGlitchFrame', {});
}

onGameEvent('zeroMoved', (data) => {
  const to = data && data.to;
  zeroCamEl.dataset.pose = (to === 'cam14' || to === 'cam15') && Math.random() < ZERO_VISUAL.lowChance ? 'low' : 'stand';
  restartAnimation(zeroCamEl, 'z-shift');
  setTimeout(() => zeroCamEl.classList.remove('z-shift'), 500);
});

/* ---------------------------------------------------------
   O MONSTRO (control do MONSTER_TYPES.subjectZero)
   --------------------------------------------------------- */

function updateSubjectZero(z, dt) {
  if (z.state === 'attacking') {
    z.attackTimer -= dt;
    if (z.attackTimer <= 0) loseGame(z.id);
    return;
  }
  const s = z.settings;
  zero.influence = Math.min(100, zero.influence + ZERO.influenceRate[hourIndex()] * (s.influenceRate || 1) * dt);

  if (z.state === 'final') {
    updateZeroFinal(z, dt);
    return;
  }

  // OBSERVATION LOCK: só numa câmara REAL (sem feed falso) onde ele está mesmo
  const genuine = camerasOpen && selectedCamera === z.position && !falseCameraOn(selectedCamera);
  if (genuine) {
    const verified = zero.verified && zero.verified.cam === selectedCamera && elapsedSeconds < zero.verified.until;
    const need = verified ? ZERO.lockVerified : ZERO.lockUnverified;
    // No núcleo (CAM 15) não tem para onde recuar: vê-lo só o segura. O LOCK é na CAM 14 / 13.
    // Depois de um LOCK, uns segundos sem outro.
    const ready = z.stage > 0 && elapsedSeconds >= z.lockReadyAt;
    z.watchTime += dt;
    ui.camScreen.classList.toggle('zero-locking', ready);
    if (ready && z.watchTime >= need) observationLock(z);
    return;                                         // enquanto o observas a sério, não avança
  }
  ui.camScreen.classList.remove('zero-locking');
  z.watchTime = Math.max(0, z.watchTime - dt * 1.5);

  // Quase imóvel no início. Depois de acordar, já não volta a parar (nem depois de um PURGE).
  if (!zero.awake) {
    if (zero.influence < ZERO.idleUntil) return;
    zero.awake = true;
  }
  z.stepTimer -= dt;
  if (z.stepTimer > 0) return;

  const path = s.path;
  if (z.stage < path.length - 1) {
    const next = path[z.stage + 1];
    if (isOccupied(next, z)) {
      z.stepTimer = randomBetween(2, 4);
      return;
    }
    z.stage++;
    moveZeroTo(z, next);
    z.stepTimer = zeroStepTime(z);
    return;
  }
  // Último passo: entra no sistema central (fase final). Nunca com o PURGE a recarregar.
  if (zero.purge.cooldown > 0) {
    z.stepTimer = Math.min(4, zero.purge.cooldown + 1);
    return;
  }
  if (!horrorDirector.claim('zeroFinal', z.id)) {
    z.stepTimer = horrorDirector.waitLeft() + randomBetween(1, 2);
    return;
  }
  startZeroFinal(z);
}

function zeroStepTime(z) {
  const k = 1 - (1 - ZERO.stepFast) * (zero.influence / 100);
  return randomBetween(ZERO.stepMin, ZERO.stepMax) * k * (z.settings.stepScale || 1);
}

function moveZeroTo(z, position) {
  const old = z.position;
  z.position = position;
  if (camerasOpen && (selectedCamera === old || selectedCamera === position)) triggerInterference('monster');
  emitGameEvent('zeroMoved', { monster: z, from: old, to: position });
  renderMonsters();
}

// Visto a sério numa câmara real: perde influência e recua
function observationLock(z) {
  z.watchTime = 0;
  z.lockReadyAt = elapsedSeconds + ZERO.lockCooldown;
  ui.camScreen.classList.remove('zero-locking');
  zero.influence = Math.max(0, zero.influence - ZERO.lockInfluenceDrop);
  z.stage--;
  moveZeroTo(z, z.settings.path[z.stage]);
  z.stepTimer = zeroStepTime(z);
  triggerInterference('monster');
  showVerifyFeedback('OBSERVATION CONFIRMED', 'ok');
  emitGameEvent('zeroLock', { monster: z });
}

/* ----- Fase final: os sistemas falham, só o PURGE SIGNAL o trava ----- */

function startZeroFinal(z) {
  z.state = 'final';
  z.position = 'system';
  closeCameras();                       // os monitores falham: só o terminal central responde
  // Menos tempo com mais influência, e cada fase final seguinte é mais curta (ignorá-lo sai caro)
  const window = ZERO.finalWindow - (ZERO.finalWindow - ZERO.finalWindowMin) * (zero.influence / 100) - ZERO.finalRepeatCut * zero.finals;
  z.finalTimer = Math.max(ZERO.finalWindowFloor, window) * (z.settings.finalWindowScale || 1);
  zero.finals++;
  zero.purge.progress = 0;
  ui.game.classList.add('zero-final');
  show(zero.el.purge);
  emitGameEvent('zeroFinal', { monster: z });
  renderMonsters();
}

function updateZeroFinal(z, dt) {
  const p = zero.purge;
  if (p.holding && !camerasOpen && !powerOut) {
    p.progress += dt;
    if (p.progress >= ZERO.purgeHold) {
      purgeSuccess(z);
      return;
    }
  } else {
    p.progress = Math.max(0, p.progress - dt * 1.5);   // largar perde o progresso aos poucos
    z.finalTimer -= dt;
  }
  zero.el.purgeFill.style.transform = `scaleX(${(p.progress / ZERO.purgeHold).toFixed(3)})`;
  if (z.finalTimer > 0) return;
  if (!horrorDirector.claim('attack', z.id)) {
    z.finalTimer = horrorDirector.waitLeft() + 0.1;
    return;
  }
  startZeroAttack(z);
}

function purgeSuccess(z) {
  const p = zero.purge;
  p.holding = false;
  p.progress = 0;
  p.cooldown = ZERO.purgeCooldown;
  power = Math.max(0, power - ZERO.purgePower);
  renderPower();
  zero.influence = Math.max(0, zero.influence - ZERO.purgeInfluenceDrop);
  // O PURGE só o empurra para fora do sistema (CAM 14): é uma emergência, não uma solução.
  // Mantê-lo longe é com o OBSERVATION LOCK.
  z.state = 'roaming';
  z.stage = ZERO.purgeReturnStage;
  z.position = z.settings.path[z.stage];
  z.stepTimer = zeroStepTime(z) + 6;
  ui.game.classList.remove('zero-final', 'purging');
  hide(zero.el.purge);
  horrorDirector.claim('zeroPurged', z.id);   // um momento de folga
  emitGameEvent('zeroPurged', { monster: z });
  renderMonsters();
}

// Não conseguiste: tudo para, a imagem congela... e ele está na sala
function startZeroAttack(z) {
  z.state = 'attacking';
  z.attackTimer = 0.25;
  hide(zero.el.purge);
  emitGameEvent('preAttack', z);
  emitGameEvent('zeroAttack', { monster: z });
}

// Segurar o PURGE SIGNAL (rato no terminal central, ou tecla F)
function setPurgeHold(on) {
  const z = monsters.subjectZero;
  const can = on && !gameOver && Boolean(z) && z.state === 'final' && !camerasOpen && !powerOut;
  if (can === zero.purge.holding) return;
  zero.purge.holding = can;
  ui.game.classList.toggle('purging', can);
  emitGameEvent(can ? 'purgeHold' : 'purgeRelease');
}

/* ---------------------------------------------------------
   CORRUPÇÕES (subjectZeroCorruption)
   --------------------------------------------------------- */

const subjectZeroCorruption = {
  maxActive() {
    return currentHour >= 5 && zero.influence >= 60 ? 2 : 1;
  },

  update(dt) {
    const now = elapsedSeconds;
    // As que acabaram (o Black falso desaparece de forma estranha)
    for (const c of [...zero.corruptions]) {
      if (now >= c.until) this.end(c, false);
    }
    if (zero.influence < ZERO.firstCorruptionAt) return;
    zero.nextCorruption -= dt;
    if (zero.nextCorruption > 0) return;
    zero.nextCorruption = this.gap();
    if (zero.corruptions.length >= this.maxActive()) return;
    this.spawn();
  },

  gap() {
    const z = monsters.subjectZero;
    const base = ZERO.gapMax - (ZERO.gapMax - ZERO.gapMin) * (zero.influence / 100);
    return base / ((z && z.settings.corruptionRate) || 1) * randomBetween(0.75, 1.25);
  },

  spawn() {
    const late = zero.influence > 45;
    const busy = (type) => zero.corruptions.some((c) => c.type === type);
    const options = [
      ['falseCamera', busy('falseCamera') ? 0 : 3],
      ['audioMimic', 3],
      ['cameraLabel', busy('cameraLabel') ? 0 : 2],
      ['fakeBlack', busy('fakeBlack') || !isPanoramic() ? 0 : (late ? 2 : 1)],
      ['falseLight', busy('falseLight') || !isPanoramic() ? 0 : (late ? 1 : 0.6)]
    ].filter(([, w]) => w > 0);
    const type = weightedPick(options);
    const c = this.create(type);
    if (!c) return;
    if (c.until !== undefined) zero.corruptions.push(c);
    // Assinatura comum: um pequeno som invertido (e no ecrã, o 08:11)
    emitGameEvent('zeroCorruption', { type, side: c.side || null });
    renderMonsters();
    renderCamLabel();
  },

  create(type) {
    const D = ZERO.durations;
    const now = elapsedSeconds;
    const z = monsters.subjectZero;
    if (type === 'falseCamera') {
      const zeroCam = z && String(z.position).startsWith('cam') ? z.position : null;
      // De preferência esconde-o a ele; senão mostra a sala vazia ou como estava há uns segundos
      if (zeroCam && Math.random() < 0.5) {
        return { type, variant: 'hideZero', cam: zeroCam, show: [], hide: ['subjectZero'], fake: [], until: now + randomBetween(...D.falseCamera) };
      }
      // Nunca esconde o Watcher (olhar para ele sem o ver seria injusto)
      const watcherCam = monsters.watcher ? monsters.watcher.position : null;
      const occupied = Object.values(monsters)
        .filter((m) => String(m.position).startsWith('cam') && m.position !== watcherCam)
        .map((m) => m.position);
      const cam = occupied.length && Math.random() < 0.7 ? randomItem(occupied) : randomItem(Object.keys(currentMap().cameras).filter((k) => k.startsWith('cam')));
      const old = this.oldPositions();
      const show = Object.keys(old).filter((id) => old[id] === cam && monsters[id]);
      const hide = Object.values(monsters).filter((m) => m.position === cam && m.id !== 'watcher').map((m) => m.id);
      return { type, variant: show.length ? 'stale' : 'empty', cam, show, hide, fake: [], until: now + randomBetween(...D.falseCamera) };
    }
    if (type === 'fakeBlack') {
      const side = randomItem(SIDES);
      const approach = currentMap().halls[side].approach;
      // No hall (precisa de luz) ou na câmara antes do hall
      if (Math.random() < 0.6) return { type, side, until: now + randomBetween(...D.fakeBlack) };
      if (monsters.black && monsters.black.position === approach) return null;
      return { type, side, cam: approach, show: ['black'], hide: [], fake: ['black'], until: now + randomBetween(...D.fakeBlack) };
    }
    if (type === 'cameraLabel') {
      const cam = camerasOpen ? selectedCamera : randomItem(Object.keys(ZERO_LABEL_SWAP));
      const shown = ZERO_LABEL_SWAP[cam];
      if (!shown || !currentMap().cameras[shown]) return null;
      return { type, cam, shown, until: now + randomBetween(...D.cameraLabel) };
    }
    if (type === 'falseLight') {
      return { type, armed: true, showUntil: 0, until: now + D.falseLightArmed };
    }
    if (type === 'audioMimic') {
      // Só som: não mexe em nenhum monstro. Tem um segundo tom quase inaudível (a assinatura).
      const kinds = ['blackStep'];
      if (monsters.echo) kinds.push('echoScratch');
      if (monsters.watcher) kinds.push('watcherStatic');
      emitGameEvent('zeroMimic', { kind: randomItem(kinds), side: randomItem(SIDES) });
      return { type };   // sem duração: não fica ativa
    }
    return null;
  },

  // Posições de há ~10–16 s (o feed "ligeiramente antigo")
  oldPositions() {
    const target = elapsedSeconds - randomBetween(10, 16);
    const snap = zero.history.find((h) => h.t >= target) || zero.history[0];
    return snap ? snap.positions : {};
  },

  // verified = foi desfeita pelo SIGNAL VERIFY
  end(c, verified) {
    zero.corruptions = zero.corruptions.filter((x) => x !== c);
    if (c.type === 'fakeBlack' && !verified && c.side) {
      restartAnimation(panoEls[c.side].doorway, 'zero-vanish');   // some de forma anormal
      later(300, () => panoEls[c.side].doorway.classList.remove('zero-vanish'));
    }
    emitGameEvent('zeroCorruptionEnd', { type: c.type, verified });
    renderMonsters();
    renderCamLabel();
  },

  clear() {
    zero.corruptions = [];
  }
};

function falseCameraOn(cam) {
  return zero.corruptions.some((c) => c.type === 'falseCamera' && c.cam === cam);
}

// Corrupções que afetam o que estás a ver agora: a câmara aberta, ou um hall
// (side = o hall do botão VERIFY; sem side: o hall para onde estás virado, ou os dois)
function corruptionsInView(side = null) {
  if (camerasOpen) {
    return zero.corruptions.filter((c) => c.cam === selectedCamera);
  }
  const look = lookDirection();
  const sides = side ? [side] : SIDES.includes(look) ? [look] : SIDES;
  return zero.corruptions.filter((c) => sides.includes(c.side) && hallCorruptionVisible(c));
}

// Um Black falso só se vê com a luz e a porta aberta; a luz falsa só enquanto dura
function hallCorruptionVisible(c) {
  if (c.cam || !c.side) return false;
  if (c.type === 'fakeBlack') return isSideLightOn(c.side) && !isSideDoorClosed(c.side) && !powerOut;
  return c.type === 'falseLight' && c.showUntil > elapsedSeconds;
}

/* ----- Ganchos usados por game.js para desenhar ----- */

zeroHooks.cameraView = (cam) => {
  const c = zero.corruptions.find((x) => x.cam === cam && x.show);
  return c ? { show: c.show, hide: c.hide, fake: c.fake } : null;
};

zeroHooks.hallView = (side) => {
  const fakeBlack = zero.corruptions.some((c) => c.type === 'fakeBlack' && c.side === side && !c.cam);
  const falseLight = zero.corruptions.some((c) => c.type === 'falseLight' && c.side === side && c.showUntil > elapsedSeconds);
  return fakeBlack || falseLight ? { fakeBlack, falseLight } : null;
};

zeroHooks.labelFor = (cam) => {
  const c = zero.corruptions.find((x) => x.type === 'cameraLabel' && x.cam === cam);
  return c ? c.shown : cam;
};

zeroHooks.audioState = () => {
  const z = monsters.subjectZero;
  return {
    influence: zero.influence,
    final: Boolean(z) && z.state === 'final',
    corruptView: zero.viewCorrupt || zero.officeCorrupt,
    purging: zero.purge.holding,
    purgeProgress: Math.min(1, zero.purge.progress / ZERO.purgeHold)
  };
};

// Luz falsa: na próxima vez que acendes um hall (se for seguro), parece aceso de forma estranha
onGameEvent('lightOn', (data) => {
  if (!data || !data.side) return;
  const c = zero.corruptions.find((x) => x.type === 'falseLight' && x.armed);
  if (!c) return;
  const side = data.side;
  const hall = currentMap().halls[side].hall;
  // Nunca durante uma janela de ataque: dá sempre margem de reação
  const danger = Object.values(monsters).some((m) => m.position === hall &&
    ((m.state === 'lurking' && m.doorTimer < 3.5) || (m.id === 'vesper' && m.hallProgress >= 0.7) || m.id === 'morrow'));
  if (danger) return;
  c.armed = false;
  c.side = side;
  c.showUntil = elapsedSeconds + ZERO.durations.falseLightShow * CONFIG.speed;
  c.until = c.showUntil + 0.05;
  emitGameEvent('zeroFalseLight', { side });
  renderMonsters();
});

/* ---------------------------------------------------------
   SIGNAL VERIFY
   --------------------------------------------------------- */

// side: o hall do botão carregado (null = tecla V / botão das câmaras)
function verifySignal(side = null) {
  if (gameOver || powerOut || !zeroHere() || overtime) return;
  // Custom Night: o LATCH pode agarrar-se ao VERIFY de um dos halls (o das câmaras continua livre)
  if (side && !camerasOpen && controlLatched(side === 'left' ? 'verifyLeft' : 'verifyRight')) return;
  if (zero.verifyCooldown > 0) {
    showVerifyFeedback('VERIFY RECHARGING', 'dim');
    return;
  }
  zero.verifyCooldown = ZERO.verifyCooldown;
  power = Math.max(0, power - ZERO.verifyPower);
  renderPower();
  makeNoise('cameraSwitch');
  const found = corruptionsInView(camerasOpen ? null : side);
  if (camerasOpen) zero.verified = { cam: selectedCamera, until: elapsedSeconds + ZERO.verifiedFor };
  if (found.length) {
    found.forEach((c) => subjectZeroCorruption.end(c, true));
    if (camerasOpen) triggerInterference('verify');
    showVerifyFeedback('SIGNAL INVALID', 'bad');
  } else {
    showVerifyFeedback('SIGNAL VERIFIED', 'ok');
  }
  emitGameEvent('verifyResult', { ok: found.length === 0 });
  renderVerify();
}

let verifyFeedbackTimer = null;
function showVerifyFeedback(text, kind) {
  const el = zero.el.feedback;
  el.textContent = text;
  el.dataset.kind = kind;
  show(el);
  restartAnimation(el, 'pop');
  clearTimeout(verifyFeedbackTimer);
  verifyFeedbackTimer = setTimeout(() => hide(el), 1600);
}

// "VERIFY READY" / "VERIFY RECHARGING" (só redesenha quando muda)
function renderVerify() {
  const ready = zero.verifyCooldown <= 0;
  const text = ready ? 'READY' : `RECHARGING ${Math.ceil(zero.verifyCooldown)}`;
  if (text === zero.lastVerifyShown) return;
  zero.lastVerifyShown = text;
  for (const btn of zero.el.verifyButtons) {
    btn.querySelector('.verify-status').textContent = text;
    btn.classList.toggle('recharging', !ready);
  }
}

/* ---------------------------------------------------------
   A CADA FRAME (Nights com Subject Zero; eventos da Night 6)
   --------------------------------------------------------- */

zeroHooks.tick = (dt) => {
  if (NIGHTS[currentNight].finalNight) updateFinalNightEvents();
  if (!zeroHere()) return;

  if (zero.verifyCooldown > 0) zero.verifyCooldown = Math.max(0, zero.verifyCooldown - dt);
  if (zero.purge.cooldown > 0) zero.purge.cooldown = Math.max(0, zero.purge.cooldown - dt);
  renderVerify();

  // Guarda as posições de 2 em 2 s (para o feed "antigo")
  zero.historyTimer -= dt;
  if (zero.historyTimer <= 0) {
    zero.historyTimer = 2;
    zero.history.push({ t: elapsedSeconds, positions: Object.fromEntries(Object.values(monsters).map((m) => [m.id, m.position])) });
    if (zero.history.length > 12) zero.history.shift();
  }

  subjectZeroCorruption.update(dt);
  renderCorruptionSignature();
  updateZeroVisual(dt);
};

// A assinatura: relógio da câmara a mostrar 08:11, linha vertical, "V0", etiqueta a piscar
function renderCorruptionSignature() {
  const camCorrupt = camerasOpen && corruptionsInView().length > 0;
  // Nos halls a assinatura fica no próprio hall (só se vê quando olhas para lá)
  let officeCorrupt = false;
  for (const side of SIDES) {
    const here = !camerasOpen && zero.corruptions.some((c) => c.side === side && hallCorruptionVisible(c));
    panoEls[side].root.classList.toggle('zero-corrupt', here);
    if (here) officeCorrupt = true;
  }
  if (camCorrupt !== zero.viewCorrupt || officeCorrupt !== zero.officeCorrupt) {
    zero.viewCorrupt = camCorrupt;
    zero.officeCorrupt = officeCorrupt;
    ui.camScreen.classList.toggle('zero-corrupt', camCorrupt);
    emitGameEvent('zeroView', { on: camCorrupt || officeCorrupt });
  }
  // Relógio da câmara: normal, ou (feed corrompido) a saltar para 08:11
  if (camerasOpen) {
    const glitch = camCorrupt && Math.floor(elapsedSeconds * 3 / CONFIG.speed) % 3 === 0;
    zero.el.stamp.textContent = glitch ? '08:11:00' : cameraClock(camCorrupt ? -randomBetween(40, 90) : 0);
  }
}

// Hora da câmara com segundos (o feed falso fica um pouco atrasado)
function cameraClock(offsetSeconds) {
  const total = Math.max(0, (elapsedSeconds / nightLengthSeconds()) * CONFIG.endHour * 3600 + offsetSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const hh = h % 12 === 0 ? 12 : h;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ----- Night 6: 5:00 emergência, 5:30 contenção, 5:59 ----- */

function updateFinalNightEvents() {
  const minutes = (elapsedSeconds / nightLengthSeconds()) * CONFIG.endHour * 60;
  const ev = zero.events;
  if (!ev.emergency && minutes >= 300) {
    ev.emergency = true;
    ui.game.classList.add('n6-emergency');            // algumas luzes passam a emergência
    zero.influence = Math.min(100, zero.influence + ZERO.at5amBoost);
    emitGameEvent('n6Emergency');
  }
  if (!ev.containment && minutes >= 330) {
    ev.containment = true;
    showN6Terminal(['VEIL CORE', 'CONTAINMENT: 1%']);
    later(2600, () => showN6Terminal(['VEIL CORE', 'CONTAINMENT: 0%'], true));
    later(6500, () => hide(zero.el.terminal));
    emitGameEvent('n6Containment');
  }
  if (!ev.lastMinute && minutes >= 359) {
    ev.lastMinute = true;
    ui.game.classList.add('n6-last-minute');
    emitGameEvent('n6LastMinute');
  }
}

function showN6Terminal(lines, warn = false) {
  const t = zero.el.terminal;
  t.replaceChildren(...lines.map((line) => {
    const div = document.createElement('div');
    div.textContent = line;
    return div;
  }));
  t.classList.toggle('warn', warn);
  show(t);
  restartAnimation(t, 'pop');
}

/* ---------------------------------------------------------
   RESET (início / restart / fim de jogo)
   --------------------------------------------------------- */

function clearZeroVisuals() {
  ui.game.classList.remove('zero-final', 'purging', 'n6-emergency', 'n6-last-minute');
  ui.camScreen.classList.remove('zero-corrupt', 'zero-locking');
  hide(zero.el.purge);
  hide(zero.el.feedback);
  hide(zero.el.terminal);
  zero.el.purgeFill.style.transform = 'scaleX(0)';
  for (const side of SIDES) {
    panoEls[side].doorway.classList.remove('zero-vanish');
    panoEls[side].root.classList.remove('zero-corrupt');
  }
}

zeroHooks.reset = (night) => {
  zero.influence = 0;
  zero.awake = false;
  zero.finals = 0;
  subjectZeroCorruption.clear();
  zero.nextCorruption = randomBetween(25, 40);
  zero.history = [];
  zero.historyTimer = 0;
  zero.verifyCooldown = 0;
  zero.verified = null;
  zero.purge = { cooldown: 0, holding: false, progress: 0 };
  zero.events = {};
  zero.viewCorrupt = false;
  zero.officeCorrupt = false;
  zero.lastVerifyShown = '';
  clearTimeout(verifyFeedbackTimer);
  clearZeroVisuals();
  zeroGlitchTimer = randomBetween(...ZERO_VISUAL.glitchEvery);
  zeroCamEl.dataset.pose = 'stand';
  delete zeroCamEl.dataset.glitch;
  zeroCamEl.classList.remove('z-shift');
  ui.game.classList.remove('zero-takeover');
  // Só há SIGNAL VERIFY (e relógio nas câmaras) nas noites com Subject Zero
  ui.game.classList.toggle('zero-night', Boolean(NIGHTS[night].monsters.subjectZero));
  const z = monsters.subjectZero;
  if (z) {
    z.stage = 0;
    z.position = z.settings.path[0];
    z.state = 'roaming';
    z.watchTime = 0;
    z.lockReadyAt = 0;
    z.stepTimer = zeroStepTime(z);
  }
  renderVerify();
};

// Fim de jogo / 6:00: nada de corrupções antigas a continuar
onGameEvent('caught', (id) => {
  subjectZeroCorruption.clear();
  zero.purge.holding = false;
  clearZeroVisuals();
  // O susto do Zero: a interface desaparece e a sala parece vazia
  if (id === 'subjectZero') ui.game.classList.add('zero-takeover');
});
onGameEvent('overtime', () => {
  subjectZeroCorruption.clear();
  zero.purge.holding = false;
  clearZeroVisuals();
  ui.game.classList.add('n6-last-minute');
  renderMonsters();
});
onGameEvent('menu', () => ui.game.classList.remove('zero-takeover'));
onGameEvent('nightIntro', () => ui.game.classList.remove('zero-takeover'));

/* ----- Botões (rato) ----- */

for (const btn of zero.el.verifyButtons) {
  btn.addEventListener('click', () => verifySignal(btn.dataset.side || null));
  addKeyHint(btn, 'V');
}
zero.el.purge.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  setPurgeHold(true);
});
document.addEventListener('pointerup', () => setPurgeHold(false));
document.addEventListener('pointercancel', () => setPurgeHold(false));
window.addEventListener('blur', () => setPurgeHold(false));

addKeyHint(zero.el.purge, 'F');
