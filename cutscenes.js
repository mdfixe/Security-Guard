'use strict';

/* =========================================================
   SECURITY GUARD — CUTSCENES DE TRANSIÇÃO ENTRE NIGHTS

   Explicam porque o segurança muda de posto (e de Office) e
   revelam a instalação aos poucos. Cada uma tem:
   1 informação clara + 1 pista estranha + 1 pergunta nova.

   Quando tocam:
   - depois da PRIMEIRA vez que se acaba a Night N (antes do ecrã final), ou
   - antes da primeira entrada na Night N+1, se ainda não foi vista
     (por exemplo, saves de antes desta atualização).
   Revêem-se no Journal (secção RECOVERED FOOTAGE).

   Guardado em localStorage como 'securityGuard.cutscenes'
   (ex.: { night1To2: true }). Separado do resto do progresso.

   Cada guião usa um "realizador" (d) com um cursor de tempo:
   d.wait(ms) avança; d.time(), d.scene(), d.terminal(), d.message(),
   d.phone(), d.title(), d.sfx(), d.loop()... agendam no tempo atual.
   Todos os temporizadores ficam em cutscenes.timers (limpos no SKIP).

   NÃO revelar ainda: quem é o responsável pelo incidente, quem manda
   a mensagem da Night 5, porque os sistemas se ligam, porque os
   espécimes estão vivos, o objetivo final do VEIL, o que há depois.

   Night 6: 'night5To6' leva-te ao SUBLEVEL 06. 'finale' é a sequência
   final (depois das 6:01): o relatório do INCIDENT 0811, o estado do
   VEIL-0, o teste ao próprio segurança. Acaba no menu, não numa noite.
   ========================================================= */

// Quanto tempo fica cada fala/linha no ecrã (ms), conforme o tamanho
function cutsceneLineMs(text) {
  return Math.min(3600, Math.max(1500, 700 + text.length * 32));
}

const TRANSITIONS = {
  // Informação: o posto tem uma falha elétrica. Pista: VEIL NETWORK NODE. Pergunta: o que é o VEIL?
  night1To2: {
    from: 1,
    to: 2,
    label: 'SHIFT 01 → 02',
    note: 'Surface node unstable. VEIL network node 02: connected.',
    play(d) {
      d.sfx('ambience.electricCrackle', { gain: 0.5 })
        .loop('csHum', 'ambience.hum', { bus: 'ambience', gain: 0.3, fade: 2 })
        .wait(800).time('06:18 AM')
        .wait(2300).hideTime().wait(400)
        .scene('office').mode('flicker')
        .loop('csBuzz', 'office.lightBuzz', { gain: 0.14, fade: 0.5 })
        .wait(1100).sfx('cameras.open', { gain: 0.45 })
        .terminal(['SECURITY NETWORK ERROR', '', 'SURFACE NODE:', 'UNSTABLE', '', 'REASSIGNMENT REQUIRED'], 'warn')
        .wait(2200).clearTerminal()
        // aviso automático: o intercom lê a mensagem enquanto ela aparece no monitor
        .voiceMessage('n1to2Intercom', 'ASTERION FACILITY OPERATIONS')
        .wait(900).closeMessage()
        // menos de um segundo, e desaparece
        .sfx('cameras.interference', { gain: 0.25 })
        .flash(['VEIL NETWORK NODE 02', 'CONNECTED'], 700, 'ghost')
        .wait(500).mode('flicker', false)
        .title('NIGHT 2 ASSIGNMENT', 'UNDERGROUND MAINTENANCE');
    }
  },

  // Informação: vamos para o Research Wing. Pista: PROJECT VEIL. Pergunta: o que investigavam ali?
  night2To3: {
    from: 2,
    to: 3,
    label: 'SHIFT 02 → 03',
    note: 'Recovered folder: PROJECT VEIL — OBSERVATION WING.',
    play(d) {
      d.loop('csHum', 'ambience.hum', { bus: 'ambience', gain: 0.25, fade: 2 })
        .wait(700).time('06:11 AM')
        .wait(2200).hideTime().wait(400)
        .scene('folder').sfx('ui.pageFlip', { gain: 0.45 })
        // muito ao fundo: algo grande a respirar (não se mostra nada)
        .loop('csBreath', 'monsters.morrowBreath', { gain: 0.035, fade: 4 })
        .wait(2800).sfx('intro.phoneRing', { gain: 0.45 })
        .wait(2400).sfx('intro.phonePickup', { gain: 0.55 })
        .loop('csLine', 'intro.phoneLine', { gain: 0.1, fade: 0.3 })
        .wait(250)
        .voice('n2to3Phone')
        .sfx('intro.phoneHangup', { gain: 0.6 }).stopLoop('csLine', 0.1)
        .at(() => voiceManager.staticBurst(0.2, 0.05))
        .subtitle('*click*', 800)
        .wait(300)
        .title('NEW ASSIGNMENT', 'ABANDONED RESEARCH WING');
    }
  },

  // Informação: problemas na ventilação. Pista: movimento não identificado. Pergunta: há coisas nas vents?
  night3To4: {
    from: 3,
    to: 4,
    label: 'SHIFT 03 → 04',
    note: 'Unidentified movement logged in the vent network.',
    play(d) {
      d.wait(600).time('06:04 AM')
        .wait(2000).hideTime().wait(300)
        .scene('corridor').sfx('intro.footsteps', { gain: 0.4 })
        .loop('csBuzz', 'office.lightBuzz', { gain: 0.1, fade: 0.5 })
        // um aviso ao longe, numa coluna do corredor
        .wait(500).voice('n3to4Distant', { wait: false })
        .wait(2100).mode('blackout').stopLoop('csBuzz', 0.05)
        .sfx('office.powerDown', { gain: 0.55 })
        // CLANG numa vent
        .wait(900).sfx('monsters.echoVentMetal', { gain: 0.9, pan: 0.35 })
        .sfx('office.ventPush', { gain: 0.5, pan: 0.35 })
        .wait(1700).mode('blackout', false).mode('emergency')
        .sfx('ambience.electricCrackle', { gain: 0.4 })
        .loop('csDrone', 'ambience.drone', { bus: 'ambience', gain: 0.3, fade: 2 })
        .wait(900).scene('terminal').sfx('cameras.open', { gain: 0.45 })
        .terminal(['FACILITY POWER ROUTING', '', 'SECTOR 04:', 'VENTILATION & POWER COMPLEX', '', 'MANUAL SUPERVISION REQUIRED'])
        .wait(2000).clearTerminal()
        .message('ASTERION FACILITY OPERATIONS', [
          'The ventilation systems are causing failures across the rest of the facility.',
          'Your next shift will take place directly in the Power Complex.',
          'Do not shut down the main system.',
          'There are crews working in the building during the day.'
        ])
        .closeMessage()
        .sfx('cameras.interference', { gain: 0.35 })
        .voice('n3to4Warning', { wait: false })
        .flash(['WARNING', '', 'UNIDENTIFIED MOVEMENT', 'VENT NETWORK'], 900, 'warn')
        .wait(Math.max(0, voiceManager.durationMs('n3to4Warning') - 1300))   // o intercom acaba antes do título
        .wait(400).mode('emergency', false)
        .title('NIGHT 4', 'VENTILATION & POWER COMPLEX');
    }
  },

  // A mais importante. Informação: a Central Security voltou online.
  // Pista: alguém aumentou a nossa clearance. Pergunta: quem está a controlar o sistema?
  night4To5: {
    from: 4,
    to: 5,
    quiet: true,             // nada de "6:00 AM" alegre: começa em silêncio
    label: 'SHIFT 04 → 05',
    note: 'Clearance updated. Sender: unknown.',
    play(d) {
      d.wait(1200).time('06:00 AM')
        .wait(2200).mode('blackout').hideTime()
        .sfx('office.powerDown', { gain: 0.8 })
        // no escuro: ventoinhas, metal, algo ao longe que não se percebe o que é
        .wait(1000).sfx('ambience.ventGust', { gain: 0.5, pan: -0.4 })
        .wait(1000).sfx('ambience.metalCreak', { gain: 0.6, pan: 0.5 })
        .wait(1000).sfx('ambience.farDrop', { gain: 0.45 })
        .sfx('monsters.blackRumble', { gain: 0.18, rate: 0.7 })
        .wait(1400).mode('blackout', false).mode('emergency').scene('terminal')
        .sfx('ambience.electricCrackle', { gain: 0.45 })
        .loop('csDrone', 'ambience.drone', { bus: 'ambience', gain: 0.3, fade: 2 })
        .wait(600).sfx('cameras.open', { gain: 0.45 })
        .terminal(['ASTERION CENTRAL NETWORK', '', 'SYSTEM RECOVERY: 73%', '', 'CENTRAL SECURITY HUB', 'ONLINE'])
        .wait(1400).sfx('cameras.interference', { gain: 0.4 })
        .flashLine('UNAUTHORIZED ACCESS DETECTED', 1000, 'warn')
        .wait(400).terminal(['CLEARANCE UPDATED'], 'ok')
        .wait(1500).clearTerminal()
        // Não é o mesmo funcionário das outras mensagens: não há remetente (e a voz não soa bem)
        .voiceMessage('n4to5Unknown', 'SENDER: UNKNOWN', 'unknown')
        .wait(800).closeMessage().mode('emergency', false)
        .hub()
        .title('NIGHT 5', 'CENTRAL SECURITY HUB');
    }
  },

  // Informação: há um último posto, por baixo de tudo (SUBLEVEL 06, o VEIL CORE).
  // Pista: "não confies no que as câmaras mostram" e um relógio parado nas 08:11.
  // Pergunta: o que é o VEIL-0, e porque precisa de alguém a vê-lo?
  night5To6: {
    from: 5,
    to: 6,
    quiet: true,
    label: 'SHIFT 05 → 06',
    note: 'Elevator to SUBLEVEL 06. Observation required.',
    play(d) {
      d.wait(1000).time('06:00 AM')
        .wait(2000).hideTime().mode('blackout')
        .sfx('office.powerDown', { gain: 0.6, rate: 0.9 })
        // o chão desce: um elevador antigo, cabos, metal
        .wait(900).loop('csDrone', 'ambience.drone', { bus: 'ambience', gain: 0.35, fade: 2 })
        .sfx('office.doorClose', { gain: 0.7, rate: 0.6 })
        .wait(1100).sfx('ambience.metalCreak', { gain: 0.55, rate: 0.8 })
        .wait(1300).sfx('ambience.pipeKnock', { gain: 0.45, pan: -0.3 })
        .wait(1200).sfx('office.doorOpen', { gain: 0.7, rate: 0.6 })
        .mode('blackout', false).mode('cold')
        .scene('corridor').sfx('intro.footsteps', { gain: 0.42, rate: 0.92 })
        .loop('csZero', 'monsters.zeroDrone', { bus: 'ambience', gain: 0.18, fade: 3 })
        .wait(3600).scene('terminal').sfx('cameras.open', { gain: 0.45 })
        .terminal(['ASTERION CENTRAL NETWORK', '', 'SYSTEM RECOVERY: 100%', '', 'SUBLEVEL 06 — VEIL CORE', 'ACCESS GRANTED'], 'ok')
        .wait(1600).clearTerminal()
        .voiceMessage('n5to6Unknown', 'SENDER: UNKNOWN', 'unknown')
        .wait(700).closeMessage()
        .sfx('monsters.zeroReverse', { gain: 0.35 })
        .flash(['CAM 14 — 08:11:00', '', 'OBSERVATION REQUIRED'], 900, 'ghost')
        .wait(500).mode('cold', false).stopLoop('csZero', 1.5)
        .title('NIGHT 6', 'VEIL CORE — FINAL SHIFT', 3400);
    }
  },

  // A sequência final (depois de 6:01 na Night 6). Não é uma transição: acaba no menu.
  finale: {
    from: 6,
    to: null,
    campaign: true,
    label: 'FINAL SEQUENCE',
    note: 'Behavioural Response Trial 07 — subject retained.',
    play(d) {
      d.scene('terminal').loop('csZero', 'monsters.zeroDrone', { bus: 'ambience', gain: 0.22, fade: 2 })
        .wait(600).terminal(['06:01 AM', '', 'SHIFT COMPLETE'], 'ok')
        .wait(1500).sfx('cameras.interference', { gain: 0.45 })
        .clearTerminal()
        .terminal(['06:01 AM', '', 'SHIFT NOT COMPLETE'], 'warn')
        .wait(1700).clearTerminal()
        .voiceMessage('finaleUnknown', 'SENDER: UNKNOWN', 'unknown')
        .wait(800).closeMessage()
        // 1. o relatório do incidente
        .scene('report').sfx('ui.pageFlip', { gain: 0.45 })
        .report('INCIDENT 0811 — CONTAINMENT FAILURE', [
          'DATE: 08/11/2008 — 08:11',
          'OBSERVATION STAFF ON DUTY: 6',
          'ALL CAMERA FEEDS: REPORTED NORMAL',
          'CONTAINMENT: LOST IN 4 MINUTES',
          'CAUSE: STAFF ACTED ON FALSE INFORMATION.',
          'NOTE: EVERY RECORDED CLOCK STOPPED AT 08:11.'
        ])
        .wait(800)
        // 2. o estado do VEIL-0
        .scene('terminal').sfx('cameras.open', { gain: 0.4 })
        .terminal(['VEIL-0 — STATUS', '', 'LOCATION: CORE CHAMBER', 'CONTAINMENT: 0%', 'BEHAVIOUR: OBSERVING', '', 'IT LEARNED TO WATCH BACK.'], 'warn')
        .wait(2600).clearTerminal()
        // 3. a descida até ao núcleo
        .mode('cold').scene('corridor').sfx('intro.footsteps', { gain: 0.45, rate: 0.88 })
        .wait(3600).sfx('office.doorOpen', { gain: 0.65, rate: 0.55 })
        .mode('cold', false).scene('core')
        .loop('csCore', 'ambience.hum', { bus: 'ambience', gain: 0.3, fade: 1.5 })
        .wait(2600)
        // 4. o último monitor
        .scene('terminal').sfx('cameras.open', { gain: 0.45 })
        .terminal(['BEHAVIOURAL RESPONSE TRIAL 07', '', 'SUBJECT: NIGHT SECURITY (CONTRACTOR)', 'SHIFTS COMPLETED: 6', 'RESULT: SUBJECT KEPT WATCHING', '', 'STATUS: RETAINED'])
        .wait(2800).clearTerminal()
        // 5. por um instante, ele
        .scene('core').wait(1200)
        .sfx('monsters.zeroReverse', { gain: 0.55 })
        // ...e fala com a voz que aprendeu na instalação (a despedida da primeira chamada)
        .voice('finaleZero', { wait: false })
        .glimpse(700)
        .wait(500).mode('blackout').stopLoop('csCore', 0.05).stopLoop('csZero', 0.05)
        .sfx('monsters.zeroClick', { gain: 0.5 })
        .wait(1400).mode('blackout', false).scene('black')
        .title('SECURITY GUARD', 'THE VEIL REMAINS', 4200)
        .credits([
          'SECURITY GUARD',
          '',
          'A browser horror game',
          'HTML · CSS · JavaScript',
          'Every sound synthesised in the browser',
          '',
          'THANK YOU FOR PLAYING',
          '',
          'CUSTOM NIGHT UNLOCKED',
          'ARCHIVES UPDATED'
        ], 7000);
    }
  }
};


const cutscenes = {
  storageKey: 'securityGuard.cutscenes',
  data: {},
  current: null,          // id da cutscene a tocar
  mode: null,             // 'win' (depois de ganhar), 'before' (antes de entrar na noite), 'journal'
  timers: [],
  duration: 0,

  el: {
    screen: document.getElementById('cutscene-screen'),
    time: document.querySelector('#cutscene-screen .cs-time'),
    term: document.querySelector('#cutscene-screen .cs-term'),
    msg: document.querySelector('#cutscene-screen .cs-msg'),
    msgHead: document.querySelector('#cutscene-screen .cs-msg-head'),
    msgBody: document.querySelector('#cutscene-screen .cs-msg-body'),
    title: document.querySelector('#cutscene-screen .cs-title'),
    titleBig: document.querySelector('#cutscene-screen .cs-title-big'),
    titleSmall: document.querySelector('#cutscene-screen .cs-title-small'),
    hubLabel: document.querySelector('#cutscene-screen .cs-hub-label'),
    skip: document.querySelector('#cutscene-screen .cs-skip'),
    reportHead: document.querySelector('#cutscene-screen .cs-report-head'),
    reportBody: document.querySelector('#cutscene-screen .cs-report-body'),
    credits: document.querySelector('#cutscene-screen .cs-credits'),
    creditsInner: document.querySelector('#cutscene-screen .cs-credits-inner')
  },

  /* ----- Guardar o que já foi visto ----- */

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      this.data = saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      this.data = {};
    }
  },

  seen(id) {
    return Boolean(this.data[id]);
  },

  markSeen(id) {
    this.data[id] = true;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) { /* sem localStorage: só nesta sessão */ }
  },

  // A transição que vem depois de acabar esta noite (ex.: 1 -> 'night1To2')
  idAfter(night) {
    const id = `night${night}To${night + 1}`;
    return TRANSITIONS[id] ? id : null;
  },

  // Lista para o Journal (inclui a intro). Não vistas: sem título nem nota.
  list() {
    const items = [{ id: 'intro', label: 'INTRODUCTION', note: `${LORE.complex} — scheduled for demolition.`, seen: intro.seen() }];
    for (const [id, t] of Object.entries(TRANSITIONS)) {
      items.push({ id, label: t.label, note: t.note, seen: this.seen(id) });
    }
    return items;
  },

  replay(id) {
    if (id === 'intro') intro.play('journal');
    else this.play(id, 'journal');
  },

  /* ----- Tocar ----- */

  at(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  },

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  },

  play(id, mode) {
    if (this.current || !TRANSITIONS[id]) return;
    this.current = id;
    this.mode = mode;
    audioManager.unlock();
    hide(ui.startScreen);
    hide(journal.el.screen);
    this.resetView();
    show(this.el.screen);
    emitGameEvent('cutsceneStart', { id });

    const d = makeDirector();
    TRANSITIONS[id].play(d);
    voiceManager.preload(d.voices);          // só as falas desta cutscene
    this.duration = d.t;
    this.at(d.t, () => this.finish());
  },

  // Fim (também usado pelo SKIP): limpa tudo e segue para onde deve
  finish() {
    if (!this.current) return;
    const id = this.current;
    const mode = this.mode;
    this.current = null;
    this.clearTimers();
    this.markSeen(id);
    this.resetView();
    this.restoreOffice();
    hide(this.el.screen);
    emitGameEvent('cutsceneEnd', { id });

    if (mode === 'win') showWinMessage();                 // NIGHT SURVIVED / NEXT NIGHT / MENU
    else if (mode === 'before') startNight(TRANSITIONS[id].to);
    else if (mode === 'campaign') showMenu();             // fim da campanha: menu (com a CUSTOM NIGHT)
    else {
      showMenu();
      journal.open();
    }
  },

  skip() {
    if (this.current) this.finish();
  },

  /* ----- Peças visuais ----- */

  resetView() {
    const s = this.el.screen;
    s.dataset.scene = 'black';
    s.classList.remove('flicker', 'emergency', 'blackout', 'cold', 'glimpse');
    this.el.reportHead.textContent = '';
    this.el.reportBody.replaceChildren();
    this.el.credits.classList.remove('on');
    this.el.creditsInner.replaceChildren();
    this.el.time.classList.remove('on');
    this.el.time.textContent = '';
    this.clearTerm();
    this.closeMessage();
    this.el.title.classList.remove('on');
    this.el.hubLabel.classList.remove('on');
    subtitles.hide();
  },

  setScene(name) {
    this.el.screen.dataset.scene = name;
  },

  showTime(text) {
    this.el.time.textContent = text;
    this.el.time.classList.add('on');
  },

  hideTime() {
    this.el.time.classList.remove('on');
  },

  termLine(text, cls) {
    const line = document.createElement('div');
    line.className = `cs-term-line ${cls || ''}`.trim();
    line.textContent = text || ' ';
    this.el.term.appendChild(line);
    return line;
  },

  clearTerm() {
    this.el.term.replaceChildren();
  },

  openMessage(sender, style) {
    this.clearTerm();
    this.el.msg.dataset.style = style || 'ops';
    this.el.msgHead.textContent = sender;
    this.el.msgBody.replaceChildren();
    show(this.el.msg);
    emitGameEvent('cutsceneSfx', { id: style === 'unknown' ? 'monsters.watcherGlitch' : 'ui.click', gain: style === 'unknown' ? 0.1 : 0.4 });
  },

  messageLine(text) {
    const p = document.createElement('p');
    p.className = 'cs-msg-line';
    p.textContent = text;
    this.el.msgBody.appendChild(p);
  },

  closeMessage() {
    hide(this.el.msg);
    this.el.msgBody.replaceChildren();
  },

  showSubtitle(text, speaker) {
    subtitles.show(text, speaker || '');
  },

  showTitle(big, small) {
    this.setScene('black');
    this.el.titleBig.textContent = big;
    this.el.titleSmall.textContent = small;
    this.el.title.classList.add('on');
    emitGameEvent('cutsceneSfx', { id: 'ui.nightStart', gain: 0.5 });
  },

  /* ----- A grande Office da Night 5 (usa a própria sala panorâmica do jogo) ----- */

  hubStart() {
    ui.game.classList.add('office-pano', 'cutscene-hud-off');
    officePan = targetOfficePan = -1;
    lastPanApplied = null;
    renderOfficePan();
    this.setScene('hub');
    this.hubLabel('LEFT HALL');
    this.at(60, () => ui.panoTrack.classList.add('cs-cinematic'));   // a partir daqui desliza devagar
  },

  hubPan(target, label) {
    officePan = targetOfficePan = target;
    lastPanApplied = null;
    renderOfficePan();
    this.hubLabel(label);
  },

  hubLabel(text) {
    this.el.hubLabel.classList.remove('on');
    this.el.hubLabel.textContent = text;
    void this.el.hubLabel.offsetWidth;
    this.el.hubLabel.classList.add('on');
  },

  // Volta a pôr a sala da noite atual como estava
  restoreOffice() {
    ui.panoTrack.classList.remove('cs-cinematic');
    ui.game.classList.remove('cutscene-hud-off');
    ui.game.classList.toggle('office-pano', isPanoramic());
    officePan = targetOfficePan = 0;
    lastPanApplied = null;
    renderOfficePan();
  }
};

// O "realizador": cada chamada agenda no tempo atual (d.t); d.wait() avança o tempo
function makeDirector() {
  const c = cutscenes;
  const d = {
    t: 0,
    wait(ms) { d.t += ms; return d; },
    at(fn) { c.at(d.t, fn); return d; },
    scene(name) { return d.at(() => c.setScene(name)); },
    mode(className, on = true) { return d.at(() => c.el.screen.classList.toggle(className, on)); },
    time(text) { return d.at(() => c.showTime(text)); },
    hideTime() { return d.at(() => c.hideTime()); },

    // Linhas a aparecer no terminal, uma de cada vez
    terminal(lines, cls) {
      lines.forEach((line, i) => c.at(d.t + i * 140, () => c.termLine(line, cls)));
      d.t += lines.length * 140;
      return d;
    },
    clearTerminal() { return d.at(() => c.clearTerm()); },
    // Aparece e desaparece depressa (pistas)
    flash(lines, ms, cls) {
      d.at(() => { c.clearTerm(); lines.forEach((line) => c.termLine(line, cls)); });
      d.t += ms;
      return d.at(() => c.clearTerm());
    },
    flashLine(text, ms, cls) {
      let el = null;
      d.at(() => { el = c.termLine(text, cls); });
      d.t += ms;
      return d.at(() => { if (el) el.remove(); });
    },

    // Mensagem interna (uma linha de cada vez)
    message(sender, lines, style) {
      d.at(() => c.openMessage(sender, style));
      d.t += 600;
      for (const line of lines) {
        if (line.pause) { d.t += line.pause; continue; }
        d.at(() => c.messageLine(line));
        d.t += cutsceneLineMs(line);
      }
      return d;
    },
    closeMessage() { return d.at(() => c.closeMessage()); },

    // Uma fala (voice-lines.js), com legendas. Avança o tempo da cutscene pela duração da fala,
    // a não ser com { wait: false } (a fala corre por baixo do que vem a seguir).
    voices: [],
    voice(id, opts = {}) {
      d.voices.push(id);
      const { wait = true, ...voiceOpts } = opts;
      d.at(() => voiceManager.play(id, voiceOpts));
      if (wait) d.t += voiceManager.durationMs(id);
      return d;
    },
    // Mensagem no monitor lida em voz alta: cada linha aparece no CRT quando é dita
    // (o próprio monitor faz de legenda, por isso não aparece outra em baixo)
    voiceMessage(id, sender, style) {
      d.at(() => c.openMessage(sender, style));
      d.t += 600;
      d.voice(id, { subtitles: false, onLine: (text) => c.messageLine(text) });
      return d;
    },
    // Legenda de um som (ex.: *click*)
    subtitle(text, ms) {
      d.at(() => subtitles.caption(text, ms));
      d.t += ms;
      return d;
    },

    title(big, small, ms = 3000) {
      d.at(() => c.showTitle(big, small));
      d.t += ms;
      return d;
    },

    // Som: o soundDirector (audio.js) é que toca
    sfx(id, opts = {}) { return d.at(() => emitGameEvent('cutsceneSfx', { id, ...opts })); },
    loop(name, id, opts = {}) { return d.at(() => emitGameEvent('cutsceneLoop', { name, id, ...opts })); },
    stopLoop(name, fade) { return d.at(() => emitGameEvent('cutsceneStopLoop', { name, fade })); },

    // Night 6: relatório em papel (uma linha de cada vez)
    report(head, lines) {
      d.at(() => {
        c.el.reportHead.textContent = head;
        c.el.reportBody.replaceChildren();
      });
      d.t += 700;
      for (const line of lines) {
        d.at(() => {
          const p = document.createElement('p');
          p.className = 'cs-report-line';
          p.textContent = line;
          c.el.reportBody.appendChild(p);
        });
        d.t += cutsceneLineMs(line);
      }
      return d;
    },
    // Night 6: o Subject Zero aparece ao fundo do núcleo por um instante
    glimpse(ms) {
      d.mode('glimpse');
      d.t += ms;
      return d.mode('glimpse', false);
    },
    // Créditos curtos (a subir devagar)
    credits(lines, ms) {
      d.at(() => {
        c.el.creditsInner.replaceChildren(...lines.map((line) => {
          const p = document.createElement('p');
          p.textContent = line || ' ';
          return p;
        }));
        c.el.credits.classList.add('on');
      });
      d.t += ms;
      return d;
    },

    // Entrada na Central Security Hub: LEFT HALL -> CENTER VENT -> RIGHT HALL (sem monstros)
    hub() {
      d.at(() => c.hubStart());
      d.loop('csHub', 'ambience.vent', { bus: 'ambience', gain: 0.35, fade: 1.5 });
      d.wait(2000).at(() => c.hubPan(0, 'CENTER VENT'));
      d.wait(2300).at(() => c.hubPan(1, 'RIGHT HALL'));
      d.wait(2100);
      return d;
    }
  };
  return d;
}

cutscenes.load();

/* ----- Ligações ao jogo ----- */

// Depois de ganhar uma noite pela primeira vez (game.js chama isto em winGame)
cutsceneAfterWin = (night) => {
  const id = cutscenes.idAfter(night);
  if (!id || cutscenes.seen(id)) return null;
  return { quiet: Boolean(TRANSITIONS[id].quiet), play: () => cutscenes.play(id, 'win') };
};

// Night 6: depois das 6:01 (game.js guarda a campanha como completa e chama isto)
cutsceneAfterCampaign = () => cutscenes.play('finale', 'campaign');

// Antes da primeira entrada na noite seguinte, se a transição ainda não foi vista
cutsceneBeforeNightHooks.push((night) => {
  const id = cutscenes.idAfter(night - 1);
  if (!id || cutscenes.seen(id)) return false;
  cutscenes.play(id, 'before');
  return true;
});

cutscenes.el.skip.addEventListener('click', (event) => {
  event.stopPropagation();
  cutscenes.skip();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cutscenes.current) cutscenes.skip();
});
// Progresso apagado (atalho de admin): as transições voltam a estar por ver
onGameEvent('saveReset', () => { cutscenes.data = {}; });
