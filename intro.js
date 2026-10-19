'use strict';

/* =========================================================
   SECURITY GUARD — CUTSCENE INICIAL

   Toca antes da Night 1, só na primeira vez (fica guardado em
   localStorage como 'securityGuard.introSeen'). Pode ser saltada
   (SKIP / ESC) e revista no menu (REPLAY INTRO), sem mexer na
   progressão das Nights.

   Cenas (~50 s):  preto (data/hora) -> exterior da Asterion ->
                   corredores -> Security Office -> telefone ->
                   o monitor liga -> NIGHT 1

   Todo o som passa pelo soundDirector (audio.js) através de eventos.
   A chamada é uma fala do voiceManager (voice.js): VOICE_LINES.introPhone
   em voice-lines.js (assets/voice/phone/intro_call.ogg; sem ficheiro,
   só legendas). Todos os temporizadores da cutscene ficam em
   intro.timers e são limpos no SKIP / no fim (a voz também pára).
   ========================================================= */

// Linha temporal (ms desde o início). Ajustar aqui o ritmo da cutscene.
const INTRO_TIMING = {
  car: 900,
  date: 1500,
  time: 3300,
  hideDate: 5600,
  exterior: 6200,
  corridorA: 13000,
  corridorB: 17400,
  farFigure: 2300,        // depois de entrar no corredor B
  farFigureMs: 350,       // quanto tempo a silhueta do Black fica visível (0.2–0.5 s)
  office: 21800,
  ringStart: 23200,
  ringEvery: 3000,
  answerToVoice: 250,     // CLICK de atender -> estática curta -> voz
  afterCall: 1500,        // depois do CLICK de desligar: só o ambiente da sala
  monitorOn: 900          // o monitor liga e depois aparece NIGHT 1 / 12:00 AM
};

const intro = {
  storageKey: 'securityGuard.introSeen',
  memorySeen: false,      // se o browser não deixar guardar
  playing: false,
  mode: 'first',          // 'first' (antes da Night 1), 'replay' (do menu) ou 'journal'
  phase: 'idle',          // 'scenes', 'ringing', 'call', 'ending'
  timers: [],

  el: {
    screen: document.getElementById('intro-screen'),
    date: document.querySelector('#intro-screen .in-date'),
    time: document.querySelector('#intro-screen .in-time'),
    office: document.querySelector('#intro-screen .in-office'),
    prompt: document.querySelector('#intro-screen .in-prompt'),
    fade: document.querySelector('#intro-screen .in-fade'),
    farFigure: document.getElementById('in-far-figure'),
    skip: document.querySelector('#intro-screen .in-skip'),
    replay: document.getElementById('btn-replay-intro')
  },

  /* ----- Guardar se já foi vista ----- */

  seen() {
    if (this.memorySeen) return true;
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch (error) {
      return false;
    }
  },

  markSeen() {
    this.memorySeen = true;
    try {
      localStorage.setItem(this.storageKey, 'true');
    } catch (error) { /* sem localStorage: só nesta sessão */ }
  },

  /* ----- Temporizadores da cutscene (todos limpos no SKIP) ----- */

  at(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  },

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  },

  /* ----- Tocar ----- */

  play(mode) {
    if (this.playing) return;
    this.mode = mode;
    this.playing = true;
    this.phase = 'scenes';
    audioManager.unlock();
    voiceManager.preload(['introPhone']);   // a chamada só vem daqui a ~20 s: tempo de sobra
    hide(ui.startScreen);
    this.reset();
    show(this.el.screen);
    emitGameEvent('introStart');

    const T = INTRO_TIMING;
    this.at(T.car, () => emitGameEvent('introCar'));
    this.at(T.date, () => this.el.date.classList.add('on'));
    this.at(T.time, () => this.el.time.classList.add('on'));
    this.at(T.hideDate, () => { this.el.date.classList.remove('on'); this.el.time.classList.remove('on'); });
    this.at(T.exterior, () => this.scene('exterior'));
    this.at(T.corridorA, () => this.scene('corridorA'));
    this.at(T.corridorB, () => this.scene('corridorB'));
    // Easter egg: o Black, muito ao fundo, só por um instante. Sem som, sem zoom, sem texto.
    this.at(T.corridorB + T.farFigure, () => this.el.farFigure.classList.add('show'));
    this.at(T.corridorB + T.farFigure + T.farFigureMs, () => this.el.farFigure.classList.remove('show'));
    this.at(T.office, () => this.scene('office'));
    this.at(T.ringStart, () => this.startRinging());
  },

  // Põe tudo como no início (também serve para limpar depois)
  reset() {
    this.clearTimers();
    this.el.screen.dataset.scene = 'black';
    this.el.date.textContent = LORE.present.introDate;
    this.el.time.textContent = LORE.present.introTime;
    this.el.date.classList.remove('on');
    this.el.time.classList.remove('on');
    this.el.farFigure.classList.remove('show');
    this.el.office.classList.remove('ringing', 'monitor-on');
    this.el.screen.classList.remove('is-clickable');
    hide(this.el.prompt);
    subtitles.hide();
  },

  scene(name) {
    restartAnimation(this.el.fade, 'blink');   // corte rápido a preto entre cenas
    this.at(250, () => {
      this.el.screen.dataset.scene = name;
      emitGameEvent('introScene', { scene: name });
    });
  },

  /* ----- Telefone ----- */

  startRinging() {
    this.phase = 'ringing';
    this.el.office.classList.add('ringing');
    this.el.screen.classList.add('is-clickable');   // o cursor mostra que se pode clicar
    show(this.el.prompt);
    const ring = () => {
      if (this.phase !== 'ringing') return;
      emitGameEvent('introRing');
      this.at(INTRO_TIMING.ringEvery, ring);
    };
    ring();
  },

  answer() {
    if (this.phase !== 'ringing') return;
    this.phase = 'call';
    this.el.office.classList.remove('ringing');
    this.el.screen.classList.remove('is-clickable');
    hide(this.el.prompt);
    emitGameEvent('introAnswer');          // CLICK de atender + o ruído da linha
    // Estática curta e depois a voz (com legendas). Quando a fala acaba, desliga-se.
    this.at(INTRO_TIMING.answerToVoice, () => {
      voiceManager.play('introPhone', { interrupt: true, onEnd: () => this.hangUp() });
    });
  },

  // CLICK: a chamada termina. Um resto de estática, 1–2 s só com a sala, e a Night 1.
  hangUp() {
    if (this.phase !== 'call') return;
    emitGameEvent('introHangup');
    voiceManager.staticBurst(0.2, 0.05);
    subtitles.caption('*click*', 900);
    let t = INTRO_TIMING.afterCall;
    this.at(t, () => {
      this.phase = 'ending';
      this.el.office.classList.add('monitor-on');
      emitGameEvent('introMonitorOn');
    });
    t += INTRO_TIMING.monitorOn;
    this.at(t, () => this.finish());
  },

  /* ----- Fim (também usado pelo SKIP) ----- */

  finish() {
    if (!this.playing) return;
    this.playing = false;
    this.phase = 'idle';
    this.markSeen();
    this.reset();
    hide(this.el.screen);
    emitGameEvent('introEnd');
    renderReplayButton();
    // Primeira vez: começa a Night 1. Replay: volta ao menu (ou ao Journal, se foi revista lá).
    // A progressão não muda.
    if (this.mode === 'first') startNight(1);
    else {
      showMenu();
      if (this.mode === 'journal') journal.open();
    }
  },

  skip() {
    if (this.playing) this.finish();
  }
};

function renderReplayButton() {
  intro.el.replay.classList.toggle('hidden', !intro.seen());
}

// A silhueta do Black ao fundo do corredor: o mesmo desenho das câmaras
(() => {
  const black = document.getElementById('cam-black').cloneNode(true);
  black.dataset.pose = 'stand';            // curvado, cabeça comprida e lisa (boca fechada)
  black.removeAttribute('id');
  black.classList.remove('cam-monster', 'hidden');
  intro.el.farFigure.appendChild(black);
})();

// Antes da Night 1, na primeira vez, toca a cutscene (game.js chama isto em requestNight)
cutsceneBeforeNightHooks.push((night) => {
  if (night !== 1 || intro.seen()) return false;
  intro.play('first');
  return true;
});

/* ----- Ligações (rato; ESC também salta) ----- */

intro.el.screen.addEventListener('click', () => {
  if (intro.phase === 'ringing') intro.answer();
});
intro.el.skip.addEventListener('click', (event) => {
  event.stopPropagation();
  intro.skip();
});
intro.el.replay.addEventListener('click', () => intro.play('replay'));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && intro.playing) intro.skip();
});
onGameEvent('menu', renderReplayButton);
// Progresso apagado (atalho de admin): a intro volta a tocar antes da Night 1
onGameEvent('saveReset', () => {
  intro.memorySeen = false;
  renderReplayButton();
});
renderReplayButton();
