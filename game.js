'use strict';

/* =========================================================
   SECURITY GUARD — lógica do jogo

   Como está organizado:
   - CONFIG ........ valores gerais (tempos, porta, Watcher, Morrow, Echo)
   - MAPS .......... os mapas (câmaras e ligações entre elas)
   - MONSTER_TYPES . cada monstro: a sua afinação base, a noite em que
                     aparece e como interpreta a dificuldade
   - NIGHTS ........ cada noite: mapa, energia e as ROTAS de cada monstro

   DIFICULDADE: cada monstro começa a 1.0x na noite em que aparece e
   ganha +0.5x por cada noite seguinte, até ao seu limite (difficultyCap).
   Cada monstro usa o multiplicador à sua maneira (ver "tune").

   HORROR DIRECTOR: espaça os eventos críticos (monstro à porta, Watcher
   a avançar, Morrow a fugir, Echo na grelha, ataques) para não
   acontecerem todos no mesmo instante.

   Monstros com "control" (Morrow, Echo) têm lógica própria em vez de
   patrulharem pelas câmaras.

   O som está todo em audio.js: aqui o jogo só avisa o que aconteceu
   (emitGameEvent) e o soundDirector decide o que se ouve.
   ========================================================= */

const CONFIG = {
  nightLengthSeconds: 360, // duração da noite em segundos reais (6 min)
  endHour: 6,              // a noite acaba às 6 AM
  speed: 1,                // velocidade do jogo. Põe 10 para testar depressa!
  introSeconds: 2.5,       // tempo do ecrã "NIGHT X" antes de começar

  // O que acontece quando um monstro chega à porta
  door: {
    attackWaitMin: 1.5,    // janela de reação antes do ataque (segundos)
    attackWaitMax: 4,
    attackWaitFloor: 1.2,  // nunca menos do que isto, por mais difícil que seja
    blockedWaitMin: 2,     // depois de um ataque falhado, espera isto antes de recuar
    blockedWaitMax: 5,
    reopenWaitMin: 1,      // se abrires a porta com ele lá fora, tens isto para a voltar a fechar
    reopenWaitMax: 2,
    minWaitNearDoor: 4     // tempo mínimo na última câmara antes de ir para a porta
  },

  // Habilidade do Watcher: não gosta de ser observado
  watcher: {
    uneasyAt: 2,           // segundos a olhar: fica inquieto
    restlessAt: 4,         // segundos a olhar: muito mais provável mexer-se
    rushAt: 6,             // segundos a olhar: avança logo
    decayPerSecond: 0.5,   // quanto desce por segundo quando não estás a olhar
    rushCooldown: 3        // tempo mínimo entre dois avanços seguidos
  },

  powerOut: {
    eyesDelay: 4,          // segundos até aparecerem os olhos na porta
    attackDelayMin: 4,     // segundos extra até ao ataque
    attackDelayMax: 9
  },

  // Morrow: dorme na sua sala e acorda se não o vigiares (raiva invisível 0–100)
  morrow: {
    restlessAt: 35,        // começa a mexer-se (ainda deitado)
    awakeAt: 60,           // acordado, cabeça erguida, olha para a câmara
    standingAt: 85,        // levanta-se em quatro patas
    rearAt: 93,            // ergue-se nas patas traseiras
    huntAt: 100,           // sai da sala: já não há volta
    hysteresis: 6,         // para baixar de fase tem de descer uns pontos abaixo do limite
    calmDelay: 0.6,        // segundos a olhar antes de começar a acalmar (abrir e fechar não chega)
    calmRate: 26,          // raiva que desce por segundo enquanto o observas
    standingCalmDelay: 1.5,   // de pé: demora mais a reagir...
    standingCalmFactor: 0.25, // ...acalma muito mais devagar...
    standingRageFactor: 1.4,  // ...e se desviares o olhar sobe mais depressa
    huntStepMin: 1.0,      // a correr: segundos por câmara
    huntStepMax: 2.6,
    leaveRoomMin: 0.4,     // tempo até sair da sala depois de perder o controlo
    leaveRoomMax: 0.8,
    pounceMin: 0.6,        // porta aberta: o instante em que o podes ver antes do ataque
    pounceMax: 1.1,
    breachSeconds: 1.6     // porta fechada: o tempo que demora a arrombá-la
  },

  // Echo: quase cego, reage ao BARULHO que fazes (ruído invisível 0–100)
  echo: {
    noise: {               // quanto barulho faz cada ação física
      cameraSwitch: 3.5,
      camerasOpen: 5,
      camerasClose: 3,
      lightOn: 6,
      lightOff: 3,
      doorOpen: 7,
      doorClose: 13,
      ventHold: 8
    },
    quietDelay: 0.5,       // segundos sem barulho antes de o ruído começar a descer
    noiseDecay: 3.5,       // desce isto por segundo...
    noiseDecayPct: 0.06,   // ...mais 6% do ruído atual por segundo
    listenAt: 25,          // a partir daqui ergue a cabeça e ouve
    investigateAt: 50,     // a partir daqui pode vir investigar
    quietBelow: 18,        // abaixo disto conta como "silêncio"
    advanceFrom: 35,       // ruído onde começa a haver hipótese de avançar
    advanceRange: 50,      // ruído extra até à hipótese máxima
    finalNoise: 45,        // na VENT C precisa de pelo menos isto para ir à grelha
    decisionMin: 3,        // segundos entre decisões
    decisionMax: 5.5,
    silenceToStop: 2,      // nas vents: silêncio que o faz parar e ouvir
    silenceToRetreat: 5,   // silêncio que o faz recuar
    silenceToLeave: 4,     // fora das vents: silêncio que o faz desistir
    retreatStepMin: 1.5,   // a recuar: segundos por posição
    retreatStepMax: 2.5,
    restMin: 18,           // depois de recuar, fica algum tempo longe a ignorar o barulho
    restMax: 28,
    ventWindowMin: 4.5,    // na grelha: tempo até a forçar se ninguém a segurar
    ventWindowMax: 6,
    holdMin: 1.6,          // tempo a segurar a grelha para o repelir (1.6–2.4 s)
    holdMax: 2.4,
    holdDecay: 0.4,        // se largares, o que já seguraste desce devagar
    pushEveryMin: 0.45,    // enquanto seguras, ele bate do outro lado
    pushEveryMax: 0.8,
    repelNoiseFactor: 0.5, // repelido: o ruído cai para metade
    repelRestMin: 6,       // e fica uns segundos parado na VENT B
    repelRestMax: 10
  },

  // Horror Director: depois de um evento crítico, espera isto antes de outro
  horror: {
    cooldownMin: 1,
    cooldownMax: 2
  }
};


/* ---------------------------------------------------------
   MAPAS
   cameras: nome de cada câmara
   links: ligações (servem para saber o que está mais perto da porta)
   nearDoor: a última câmara antes da porta
   vents: câmaras da rede de ventilação (só a Night 4)
   --------------------------------------------------------- */

const MAPS = {
  facility: {
    title: 'GROUND FLOOR',
    cameras: {
      cam1: 'ENTRANCE',
      cam2: 'STORAGE',
      cam3: 'MAIN HALL',
      cam4: 'CORRIDOR',
      cam5: 'OUTSIDE OFFICE'
    },
    links: [['cam1', 'cam2'], ['cam2', 'cam3'], ['cam3', 'cam4'], ['cam4', 'cam5'], ['cam5', 'door']],
    nearDoor: 'cam5'
  },

  underground: {
    title: 'LEVEL B2 — MAINTENANCE',
    cameras: {
      cam1: 'GENERATOR ROOM',
      cam2: 'PIPE HALL',
      cam3: 'MAINTENANCE',
      cam4: 'JUNCTION',
      cam5: 'STORAGE',
      cam6: 'SERVICE HALL'
    },
    links: [['cam1', 'cam2'], ['cam2', 'cam3'], ['cam3', 'cam4'], ['cam5', 'cam4'], ['cam4', 'cam6'], ['cam6', 'door']],
    nearDoor: 'cam6'
  },

  researchWing: {
    title: 'RESEARCH WING',
    cameras: {
      cam1: 'RECEPTION',
      cam2: 'OBSERVATION HALL',
      cam3: 'LABORATORY',
      cam4: 'ARCHIVE',
      cam5: 'CONTAINMENT HALL',
      cam6: 'SERVICE CORRIDOR',
      cam7: 'SPECIMEN ROOM'
    },
    links: [['cam1', 'cam2'], ['cam2', 'cam3'], ['cam2', 'cam4'], ['cam4', 'cam5'], ['cam7', 'cam5'], ['cam5', 'cam6'], ['cam6', 'door']],
    nearDoor: 'cam6'
  },

  powerComplex: {
    title: 'VENTILATION & POWER',
    ventTitle: 'VENTILATION NETWORK',
    cameras: {
      cam1: 'POWER CONTROL',
      cam2: 'TURBINE HALL',
      cam3: 'MAINTENANCE JUNCTION',
      cam4: 'COOLING ROOM',
      cam5: 'GENERATOR HALL',
      cam6: 'SERVICE TUNNEL',
      cam7: 'LOWER JUNCTION',
      cam8: 'MORROW CHAMBER',
      cam9: 'MAIN HALL',
      ventA: 'INTAKE DUCT',
      ventB: 'CROSS DUCT',
      ventC: 'OFFICE DUCT'
    },
    links: [
      ['cam1', 'cam2'], ['cam2', 'cam3'], ['cam3', 'cam9'], ['cam2', 'cam4'], ['cam3', 'cam6'],
      ['cam4', 'cam5'], ['cam6', 'cam7'], ['cam5', 'cam7'], ['cam7', 'cam8'], ['cam9', 'door']
    ],
    nearDoor: 'cam9',
    vents: ['ventA', 'ventB', 'ventC']
  }
};


/* ---------------------------------------------------------
   DIFICULDADE PROGRESSIVA
   Multiplicador = 1 na noite em que o monstro aparece,
   +0.5 por cada noite seguinte, até ao difficultyCap dele.
   --------------------------------------------------------- */

const DIFFICULTY = { stepPerNight: 0.5 };

function getDifficultyMultiplier(monsterId, night = currentNight) {
  const type = MONSTER_TYPES[monsterId];
  const nightsSince = Math.max(0, night - type.introductionNight);
  return Math.min(1 + nightsSince * DIFFICULTY.stepPerNight, type.difficultyCap);
}

// Quanto do "extra" do multiplicador conta para uma coisa (k = 1: tudo; k = 0.5: metade)
function boost(m, k) {
  return 1 + (m - 1) * k;
}

// Divide tempos [mín, máx] por um fator, sem descer abaixo de um mínimo razoável
function scaleDelays(list, divisor, floor) {
  return list.map(([min, max]) => {
    const a = Math.max(floor, min / divisor);
    return [a, Math.max(a + 2, max / divisor)];
  });
}


/* ---------------------------------------------------------
   TIPOS DE MONSTRO
   base: afinação do monstro na noite em que aparece (1.0x)
   tune(m, base): como o monstro usa o multiplicador m
   update / timerMultiplier / stayChance / control: comportamentos especiais
   --------------------------------------------------------- */

const MONSTER_TYPES = {
  black: {
    name: 'BLACK',
    introductionNight: 1,
    difficultyCap: 2.0,
    base: {
      moveDelay: [[16, 28], [14, 25], [12, 22], [10, 19], [8, 16], [6, 13]],   // por hora: 12 AM ... 5 AM
      stayChance: [0.30, 0.25, 0.20, 0.15, 0.10, 0.05]
    },
    // Decide mexer-se mais vezes, avança com mais vontade, espera um pouco menos
    tune: (m, base) => ({
      moveDelay: scaleDelays(base.moveDelay, boost(m, 0.4), 4),
      stayChance: base.stayChance.map((c) => c * (1 - (m - 1) * 0.4)),
      forwardBias: boost(m, 0.6),
      attackWaitScale: 1 / boost(m, 0.15),
      nearDoorWaitScale: 1 / boost(m, 0.25)
    })
  },

  watcher: {
    name: 'WATCHER',
    introductionNight: 2,
    difficultyCap: 2.0,
    base: {
      moveDelay: [[18, 30], [16, 27], [13, 21], [11, 18], [8, 14], [7, 12]],
      stayChance: [0.30, 0.30, 0.20, 0.20, 0.10, 0.10]
    },
    // Irrita-se mais depressa quando observado e avança com mais vontade
    tune: (m, base) => ({
      moveDelay: scaleDelays(base.moveDelay, boost(m, 0.25), 5),
      stayChance: base.stayChance.map((c) => c * (1 - (m - 1) * 0.3)),
      exposureRate: boost(m, 0.5),
      irritation: boost(m, 0.5)
    }),
    update: updateWatcher,
    timerMultiplier: watcherTimerMultiplier,
    stayChance: watcherStayChance
  },

  morrow: {
    name: 'MORROW',
    introductionNight: 3,
    difficultyCap: 1.75,
    base: {
      rageRate: [1.3, 1.9, 1.9, 2.5, 2.5, 3.1]    // raiva por segundo sem ser observado, por hora
    },
    // Só a raiva sobe mais depressa; a corrida final não muda
    tune: (m, base) => ({
      rageRate: base.rageRate.map((r) => r * boost(m, 0.7))
    }),
    control: updateMorrow,     // não patrulha: tem a sua própria máquina de estados
    jumpscareMs: 2000
  },

  echo: {
    name: 'ECHO',
    introductionNight: 4,
    difficultyCap: 2.0,
    base: {},
    // Mais sensível ao barulho, aproxima-se mais depressa, descansa menos depois de recuar
    tune: (m) => ({
      noiseSensitivity: boost(m, 0.5),
      approachSpeed: boost(m, 0.5),
      restScale: 1 / boost(m, 0.3)
    }),
    control: updateEcho,
    noPowerOutAttack: true,    // não tem olhos para brilhar no escuro
    jumpscareMs: 2100
  }
};


/* ---------------------------------------------------------
   NOITES
   Aqui ficam só as ROTAS (dependem do mapa). A velocidade vem
   da afinação base de cada monstro × multiplicador da noite.
   moves: para onde pode ir a partir de cada sítio (e com que peso)
   retreatTo: para onde pode fugir depois de falhar um ataque
   --------------------------------------------------------- */

const NIGHTS = {
  1: {
    map: 'facility',
    power: { start: 100, baseDrain: 0.10, doorDrain: 0.20, lightDrain: 0.12, camerasDrain: 0.06 },
    monsters: {
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam3: 1 },
          cam3: { cam4: 1 },
          cam4: { cam5: 1 },
          cam5: { door: 1 }
        },
        retreatTo: ['cam2', 'cam3', 'cam4']
      }
    }
  },

  2: {
    map: 'underground',
    power: { start: 100, baseDrain: 0.15, doorDrain: 0.25, lightDrain: 0.13, camerasDrain: 0.07 },
    monsters: {
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam3: 0.85, cam1: 0.15 },
          cam3: { cam4: 0.75, cam2: 0.25 },
          cam4: { cam6: 0.7, cam3: 0.2, cam5: 0.1 },
          cam5: { cam4: 1 },
          cam6: { door: 0.9, cam4: 0.1 }
        },
        retreatTo: ['cam2', 'cam3', 'cam4']
      },
      watcher: {
        start: 'cam5',
        moves: {
          cam5: { cam4: 1 },
          cam4: { cam3: 0.45, cam6: 0.4, cam5: 0.15 },
          cam3: { cam4: 0.8, cam2: 0.2 },
          cam2: { cam3: 1 },
          cam6: { door: 0.85, cam4: 0.15 }
        },
        retreatTo: ['cam3', 'cam4', 'cam5']
      }
    }
  },

  3: {
    map: 'researchWing',
    power: { start: 100, baseDrain: 0.165, doorDrain: 0.24, lightDrain: 0.12, camerasDrain: 0.05 },
    monsters: {
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam4: 0.75, cam3: 0.25 },
          cam3: { cam2: 1 },
          cam4: { cam5: 0.75, cam2: 0.25 },
          cam5: { cam6: 0.8, cam4: 0.2 },
          cam6: { door: 0.9, cam5: 0.1 }
        },
        retreatTo: ['cam2', 'cam4', 'cam5']
      },
      watcher: {
        start: 'cam3',
        moves: {
          cam3: { cam2: 1 },
          cam2: { cam4: 0.6, cam1: 0.2, cam3: 0.2 },
          cam1: { cam2: 1 },
          cam4: { cam5: 0.65, cam2: 0.35 },
          cam5: { cam6: 0.75, cam4: 0.25 },
          cam6: { door: 0.85, cam5: 0.15 }
        },
        retreatTo: ['cam2', 'cam4', 'cam3']
      },
      morrow: {
        start: 'cam7',
        huntPath: ['cam5', 'cam6', 'door']
      }
    }
  },

  4: {
    map: 'powerComplex',
    // Afinado para um jogador cuidadoso acabar com ~3–20% de energia
    power: { start: 100, baseDrain: 0.175, doorDrain: 0.24, lightDrain: 0.12, camerasDrain: 0.05 },
    monsters: {
      // Mapa maior: o Black dá normalmente a volta grande (até 8 salas), às vezes corta caminho
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam4: 0.75, cam3: 0.25 },
          cam4: { cam5: 0.75, cam2: 0.25 },
          cam5: { cam7: 0.8, cam4: 0.2 },
          cam7: { cam6: 0.85, cam5: 0.15 },
          cam6: { cam3: 0.85, cam7: 0.15 },
          cam3: { cam9: 0.55, cam6: 0.25, cam2: 0.2 },
          cam9: { door: 0.9, cam3: 0.1 }
        },
        retreatTo: ['cam2', 'cam4', 'cam6']
      },
      watcher: {
        start: 'cam5',
        moves: {
          cam5: { cam7: 0.7, cam4: 0.3 },
          cam4: { cam2: 0.6, cam5: 0.4 },
          cam2: { cam3: 0.7, cam1: 0.15, cam4: 0.15 },
          cam1: { cam2: 1 },
          cam7: { cam6: 0.8, cam5: 0.2 },
          cam6: { cam3: 0.8, cam7: 0.2 },
          cam3: { cam9: 0.7, cam2: 0.3 },
          cam9: { door: 0.85, cam3: 0.15 }
        },
        retreatTo: ['cam6', 'cam2', 'cam3']
      },
      morrow: {
        start: 'cam8',
        huntPath: ['cam7', 'cam6', 'cam3', 'cam9', 'door'],
        huntStep: [0.7, 1.6]          // mapa maior: mais câmaras, cada uma mais curta
      },
      echo: {
        startOptions: ['cam7', 'cam1', 'cam5'],
        // Para onde vai quando investiga (em direção às vents) e quando recua
        toward: { cam1: ['cam2'], cam2: ['cam4'], cam7: ['cam5'], cam5: ['cam4'], cam4: ['ventA'], ventA: ['ventB'], ventB: ['ventC'] },
        away: { ventC: ['ventB'], ventB: ['ventA'], ventA: ['cam4'], cam4: ['cam5', 'cam2'], cam2: ['cam1'], cam5: ['cam7'] },
        homes: ['cam1', 'cam5', 'cam7'],
        bigRooms: ['cam2', 'cam5']   // salas grandes: às vezes ergue-se para ouvir melhor
      }
    }
  }
};


/* ---------------------------------------------------------
   ESTADO DO JOGO (GAME STATE)
   Isto é o que o jogo "sabe". O que aparece no ecrã é
   calculado a partir daqui nas funções render...().
   --------------------------------------------------------- */

let currentNight = 1;
let monsters = {};          // monstros da noite atual, ex: { black: {...}, watcher: {...} }

let power = 100;
let currentHour = 0;
let elapsedSeconds = 0;
let doorClosed = false;
let lightOn = false;
let camerasOpen = false;
let selectedCamera = 'cam1';
let powerOut = false;
let powerOutTimer = 0;
let powerOutAttackTime = 0;
let powerOutAttacker = 'black';
let powerOutEyesShown = false;
let powerOutSilence = false;
let gameOver = true;        // true fora de uma noite (menu, intro, ecrãs finais)

// Câmaras: rede principal ou rede de ventilação (Night 4)
let camNetwork = 'main';
let lastCam = { main: 'cam1', vent: 'ventA' };

// Echo: barulho do jogador (invisível) e a grelha da vent da sala
let echoNoise = 0;
let noiseQuietTime = 0;
let ventHeld = false;

let loopId = null;
let lastFrameTime = 0;
let lastClockText = '';
let lastWatchLevel = -1;
let pendingTimeouts = [];


/* ---------------------------------------------------------
   ELEMENTOS DA PÁGINA
   --------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const ui = {
  game: $('game'),
  clock: $('clock'),
  nightLabel: $('night-label'),
  powerValue: $('power-value'),
  powerFill: $('power-fill'),
  usageBars: document.querySelectorAll('.usage-bar'),

  btnDoor: $('btn-door'),
  btnLight: $('btn-light'),
  btnCameras: $('btn-cameras'),
  btnCloseCams: $('btn-close-cams'),
  door: $('door'),
  powerOutEyes: $('powerout-eyes'),

  cameraPanel: $('camera-panel'),
  camScreen: $('cam-screen'),
  camLabel: $('cam-label'),
  mapTitle: $('map-title'),
  sceneSets: document.querySelectorAll('.scene-set'),
  camMaps: document.querySelectorAll('.cam-map'),
  camButtons: document.querySelectorAll('.cam-btn'),
  camNoise: $('cam-noise'),

  startScreen: $('start-screen'),
  btnNight1: $('btn-night-1'),
  nightButtons: document.querySelectorAll('.night-btn[data-night]'),
  netToggle: $('net-toggle'),
  btnNetMain: $('btn-net-main'),
  btnNetVent: $('btn-net-vent'),
  officeVent: $('office-vent'),
  btnHoldVent: $('btn-hold-vent'),
  btnOptions: $('btn-options'),
  optionsScreen: $('options-screen'),
  btnOptionsBack: $('btn-options-back'),
  nightIntro: $('night-intro'),
  introNight: $('intro-night'),

  jumpscare: $('jumpscare'),
  jsNoise: $('js-noise'),
  loseScreen: $('lose-screen'),
  loseTitle: $('lose-title'),
  btnRetry: $('btn-retry'),
  btnLoseMenu: $('btn-lose-menu'),

  winScreen: $('win-screen'),
  winMessage: $('win-message'),
  unlockNote: $('unlock-note'),
  btnNextNight: $('btn-next-night'),
  btnPlayAgain: $('btn-play-again'),
  btnWinMenu: $('btn-win-menu')
};

// O desenho do Morrow está uma vez no HTML (<template>) e é copiado
// para cada sítio onde ele aparece (câmara, corredor, jumpscare)
const morrowTemplate = document.getElementById('tpl-morrow');
document.querySelectorAll('.morrow-figure').forEach((el) => {
  el.appendChild(morrowTemplate.content.cloneNode(true));
});

// O desenho do Echo também está num <template>
const echoTemplate = document.getElementById('tpl-echo');
document.querySelectorAll('.echo-figure').forEach((el) => {
  el.appendChild(echoTemplate.content.cloneNode(true));
});

// Elementos de cada monstro: na câmara, no corredor e na janela da porta
// (o Echo não usa a porta: só existe nas câmaras e nas vents)
const monsterEls = {};
for (const id of Object.keys(MONSTER_TYPES)) {
  monsterEls[id] = {
    camera: $(`cam-${id}`),
    corridor: $(`corridor-${id}`),
    slot: $(`slot-${id}`)
  };
}

// Distância (em passos) de cada câmara até à porta, para cada mapa
const doorDistances = {};
for (const [mapId, map] of Object.entries(MAPS)) {
  doorDistances[mapId] = computeDoorDistances(map.links);
}


/* ---------------------------------------------------------
   AJUDANTES
   --------------------------------------------------------- */

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Escolhe uma chave de { a: 0.7, b: 0.3 } respeitando os pesos
function weightedPick(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// setTimeout que é cancelado automaticamente quando o jogo reinicia
function later(ms, fn) {
  const id = setTimeout(fn, ms);
  pendingTimeouts.push(id);
  return id;
}

function clearPendingTimeouts() {
  pendingTimeouts.forEach(clearTimeout);
  pendingTimeouts = [];
}

function show(element) { element.classList.remove('hidden'); }
function hide(element) { element.classList.add('hidden'); }

function currentMapId() { return NIGHTS[currentNight].map; }
function currentMap() { return MAPS[currentMapId()]; }
function hourIndex() { return Math.min(currentHour, CONFIG.endHour - 1); }

function camLabel(camId) {
  if (isVentCam(camId)) return 'VENT ' + camId.slice(4);
  return 'CAM ' + camId.replace('cam', '').padStart(2, '0');
}

function isVentCam(camId) {
  return typeof camId === 'string' && camId.startsWith('vent');
}

function mapHasVents() {
  return Boolean(currentMap().vents);
}

function computeDoorDistances(links) {
  const distances = { door: 0 };
  const queue = ['door'];
  while (queue.length) {
    const node = queue.shift();
    for (const [a, b] of links) {
      const other = a === node ? b : b === node ? a : null;
      if (other && distances[other] === undefined) {
        distances[other] = distances[node] + 1;
        queue.push(other);
      }
    }
  }
  return distances;
}


/* ---------------------------------------------------------
   EVENTOS
   O jogo avisa "aconteceu X" e quem quiser reage.
   O som (audio.js) ouve todos os eventos através do '*'.
   --------------------------------------------------------- */

const gameEventListeners = {};

function onGameEvent(name, handler) {
  (gameEventListeners[name] = gameEventListeners[name] || []).push(handler);
}

function emitGameEvent(name, data) {
  (gameEventListeners[name] || []).forEach((handler) => handler(data));
  (gameEventListeners['*'] || []).forEach((handler) => handler(name, data));
}

// Todo o som passa pelo soundDirector (ver audio.js)
onGameEvent('*', (name, data) => soundDirector.handle(name, data));


/* ---------------------------------------------------------
   HORROR DIRECTOR
   Não desliga nenhum monstro: só espaça os eventos críticos.
   Depois de um evento crítico, outro monstro tem de esperar
   1–2 s antes de fazer o seu. O próprio monstro pode continuar
   a sua sequência (ex.: chegar à porta e depois atacar).
   --------------------------------------------------------- */

const horrorDirector = {
  lastMajorTime: -Infinity,
  lastMonster: null,
  majorEventCooldown: 0,
  log: [],

  reset() {
    this.lastMajorTime = -Infinity;
    this.lastMonster = null;
    this.majorEventCooldown = 0;
    this.log = [];
  },

  waitLeft() {
    return Math.max(0, this.majorEventCooldown - (elapsedSeconds - this.lastMajorTime));
  },

  isFree(monsterId) {
    // O Echo a forçar a grelha é um evento crítico que dura: enquanto estás a lutar com
    // ele, os outros não começam outro (só esperam um pouco; não ficam desligados)
    const echo = monsters.echo;
    if (echo && echo.state === 'atVent' && monsterId !== 'echo') return false;
    return this.waitLeft() <= 0 || monsterId === this.lastMonster;
  },

  // Pede para fazer um evento crítico agora. true = pode; false = espera um pouco.
  claim(kind, monsterId) {
    if (!this.isFree(monsterId)) return false;
    this.lastMajorTime = elapsedSeconds;
    this.lastMonster = monsterId;
    this.majorEventCooldown = randomBetween(CONFIG.horror.cooldownMin, CONFIG.horror.cooldownMax);
    this.log.push({ kind, monsterId, time: elapsedSeconds });
    if (this.log.length > 60) this.log.shift();
    return true;
  }
};


/* ---------------------------------------------------------
   BARULHO (só conta quando o Echo está na noite)
   Só ações físicas fazem barulho: câmaras, luz, porta, vent.
   Os cliques dos menus não contam.
   --------------------------------------------------------- */

function makeNoise(kind) {
  const echo = monsters.echo;
  if (!echo || gameOver) return;
  const amount = CONFIG.echo.noise[kind] || 0;
  echoNoise = Math.min(100, echoNoise + amount * (echo.settings.noiseSensitivity || 1));
  noiseQuietTime = 0;
}

// O barulho desce sozinho quando não fazes nada
function updateNoise(dt) {
  if (!monsters.echo) return;
  const E = CONFIG.echo;
  noiseQuietTime += dt;
  if (noiseQuietTime < E.quietDelay) return;
  echoNoise = Math.max(0, echoNoise - (E.noiseDecay + echoNoise * E.noiseDecayPct) * dt);
}


/* ---------------------------------------------------------
   PROGRESSO (guardado no browser)
   --------------------------------------------------------- */

// Guardado como securityGuard.night2Unlocked, ...night3Unlocked, ...night4Unlocked
const memoryUnlocks = {};    // se o browser não deixar guardar, fica só nesta sessão

function nightKey(night) {
  return `securityGuard.night${night}Unlocked`;
}

function loadProgress(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch (error) {
    return false;
  }
}

function isNightUnlocked(night) {
  if (night === 1) return true;
  if (!NIGHTS[night]) return false;
  return Boolean(memoryUnlocks[night]) || loadProgress(nightKey(night));
}

// Desbloqueia uma noite; devolve true se acabou de ser desbloqueada
function unlockNight(night) {
  if (!NIGHTS[night] || isNightUnlocked(night)) return false;
  memoryUnlocks[night] = true;
  try {
    localStorage.setItem(nightKey(night), 'true');
  } catch (error) {
    // Sem localStorage (ex: modo privado): o progresso só dura esta sessão
  }
  return true;
}


/* ---------------------------------------------------------
   CICLO PRINCIPAL (corre ~60 vezes por segundo)
   --------------------------------------------------------- */

function startLoop() {
  lastFrameTime = performance.now();
  loopId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (loopId !== null) cancelAnimationFrame(loopId);
  loopId = null;
}

function gameLoop(now) {
  // dt = segundos desde o último frame. Limitado a 0.25 s para não
  // haver saltos enormes se mudares de separador.
  const dt = Math.min((now - lastFrameTime) / 1000, 0.25) * CONFIG.speed;
  lastFrameTime = now;

  tickGame(dt);
  if (!gameOver) loopId = requestAnimationFrame(gameLoop);
}

// Avança o jogo "dt" segundos
function tickGame(dt) {
  elapsedSeconds += dt;
  updateClock();
  if (gameOver) return;

  updatePower(dt);
  updateNoise(dt);
  updateMonsters(dt);
  if (gameOver) return;
  updatePowerOut(dt);
  if (gameOver) return;
  soundDirector.update(dt, getAudioState());
}

// O que o som precisa de saber sobre o jogo neste momento
function getAudioState() {
  const distances = doorDistances[currentMapId()];
  const watcher = monsters.watcher;
  return {
    hour: currentHour,
    powerOut,
    camerasOpen,
    monsters: Object.values(monsters).map((m) => ({
      id: m.id,
      distance: distances[m.position] === undefined ? 9 : distances[m.position]
    })),
    watcherWatched: Boolean(watcher) && isBeingWatched(watcher),
    watcherExposure: watcher ? watcher.exposure : 0,
    morrow: monsters.morrow ? {
      state: monsters.morrow.state,
      rage: monsters.morrow.rage,
      watched: isBeingWatched(monsters.morrow) && monsters.morrow.position === monsters.morrow.settings.start
    } : null,
    echo: monsters.echo ? {
      state: monsters.echo.state,
      position: monsters.echo.position,
      still: monsters.echo.still,
      inVent: isVentCam(monsters.echo.position),
      ventIndex: ['ventA', 'ventB', 'ventC'].indexOf(monsters.echo.position) + 1,
      watched: isBeingWatched(monsters.echo),
      noise: echoNoise,
      held: ventHeld
    } : null
  };
}


/* ---------------------------------------------------------
   RELÓGIO
   --------------------------------------------------------- */

function updateClock() {
  const gameMinutes = Math.floor((elapsedSeconds / CONFIG.nightLengthSeconds) * CONFIG.endHour * 60);
  currentHour = Math.min(Math.floor(gameMinutes / 60), CONFIG.endHour);
  const minutes = currentHour >= CONFIG.endHour ? 0 : gameMinutes % 60;

  const text = formatTime(currentHour, minutes);
  if (text !== lastClockText) {
    ui.clock.textContent = text;
    lastClockText = text;
  }

  if (currentHour >= CONFIG.endHour) winGame();
}

function formatTime(hour, minutes) {
  const displayHour = hour % 12 === 0 ? 12 : hour;
  return `${displayHour}:${String(minutes).padStart(2, '0')} AM`;
}


/* ---------------------------------------------------------
   ENERGIA
   --------------------------------------------------------- */

// Quantas barras de "Usage" estão ativas (1 a 4)
function getUsage() {
  let usage = 1;
  if (doorClosed) usage++;
  if (lightOn) usage++;
  if (camerasOpen) usage++;
  return usage;
}

function getDrainPerSecond() {
  const p = NIGHTS[currentNight].power;
  let drain = p.baseDrain;
  if (doorClosed) drain += p.doorDrain;
  if (lightOn) drain += p.lightDrain;
  if (camerasOpen) drain += p.camerasDrain;
  return drain;
}

function updatePower(dt) {
  if (powerOut) return;

  power = Math.max(0, power - getDrainPerSecond() * dt);
  renderPower();

  if (power <= 0) triggerPowerOut();
}

function renderPower() {
  ui.powerValue.textContent = Math.ceil(power) + '%';
  ui.powerFill.style.width = power + '%';
  ui.powerFill.classList.toggle('low', power <= 20);

  const usage = powerOut ? 0 : getUsage();
  ui.usageBars.forEach((bar, i) => bar.classList.toggle('on', i < usage));
}


/* ---------------------------------------------------------
   MONSTROS
   Cada monstro tem:
   - position: 'cam1'...'cam7' ou 'door'
   - state: 'roaming' (nas câmaras), 'lurking' (à porta, prestes a atacar)
            ou 'blocked' (atacou com a porta fechada, vai recuar)
   O Morrow tem estados próprios (ver mais abaixo).
   --------------------------------------------------------- */

// Junta a rota da noite com a afinação base do monstro × multiplicador
function buildMonsterSettings(id, night) {
  const type = MONSTER_TYPES[id];
  const multiplier = getDifficultyMultiplier(id, night);
  const tuned = type.tune ? type.tune(multiplier, type.base) : {};
  return { ...NIGHTS[night].monsters[id], ...tuned, difficulty: multiplier };
}

function createMonster(id, settings) {
  return {
    id,
    type: MONSTER_TYPES[id],
    settings,
    position: settings.start,
    state: 'roaming',
    moveTimer: 0,
    doorTimer: 0,
    exposure: 0,          // só usado pelo Watcher
    rushCooldown: 0,
    rage: 0,              // só usado pelo Morrow (invisível para o jogador)
    watchTime: 0,
    huntTimer: 0,
    huntIndex: 0,
    attackPhase: null,
    doorPose: 'stand',
    drift: 0,
    lastPose: null,
    // Echo
    decisionTimer: 0,
    silence: 0,
    still: false,
    restTimer: 0,
    retreatTimer: 0,
    ventTimer: 0,
    holdProgress: 0,
    holdNeeded: 2,
    pushTimer: 0,
    listenPose: 'listen',
    part: 'full'
  };
}

function getMoveDelay(monster) {
  const [min, max] = monster.settings.moveDelay[hourIndex()];
  return randomBetween(min, max);
}

function getStayChance(monster) {
  if (monster.type.stayChance) return monster.type.stayChance(monster);
  return monster.settings.stayChance[hourIndex()];
}

// Outro monstro já está nesta câmara? (à porta podem estar os dois)
function isOccupied(position, exceptMonster) {
  if (position === 'door') return false;
  return Object.values(monsters).some((m) => m !== exceptMonster && m.position === position);
}

function updateMonsters(dt) {
  for (const monster of Object.values(monsters)) {
    if (gameOver || powerOut) return;

    // Monstros com lógica própria (Morrow) não patrulham
    if (monster.type.control) {
      monster.type.control(monster, dt);
      continue;
    }

    if (monster.type.update) monster.type.update(monster, dt);
    if (gameOver) return;

    if (monster.position === 'door') {
      updateMonsterAtDoor(monster, dt);
    } else {
      const multiplier = monster.type.timerMultiplier ? monster.type.timerMultiplier(monster) : 1;
      monster.moveTimer -= dt * multiplier;
      if (monster.moveTimer <= 0) moveEnemy(monster);
    }
  }
}

function moveEnemy(monster) {
  monster.moveTimer = getMoveDelay(monster);

  // Às vezes decide ficar onde está, para não ser previsível
  if (Math.random() < getStayChance(monster)) return;

  const next = pickNextPosition(monster, false);
  if (!next) {
    monster.moveTimer = randomBetween(2, 4); // caminho ocupado: tenta daqui a pouco
    return;
  }

  // Chegar à porta é um evento crítico: o Horror Director pode pedir para esperar
  if (next === 'door' && !horrorDirector.claim('arriveDoor', monster.id)) {
    monster.moveTimer = horrorDirector.waitLeft() + randomBetween(0.3, 1.2);
    return;
  }
  setMonsterPosition(monster, next);
}

// forward = true escolhe sempre a opção mais perto da porta
function pickNextPosition(monster, forward) {
  const distances = doorDistances[currentMapId()];
  const here = distances[monster.position];
  const options = Object.entries(monster.settings.moves[monster.position] || {})
    .filter(([to]) => !isOccupied(to, monster));
  if (!options.length) return null;

  if (forward) {
    options.sort((a, b) => distances[a[0]] - distances[b[0]]);
    return options[0][0];
  }

  // Mais dificuldade = mais vontade de avançar em direção à porta
  const bias = monster.settings.forwardBias || 1;
  return weightedPick(options.map(([to, weight]) => [to, distances[to] < here ? weight * bias : weight]));
}

function setMonsterPosition(monster, newPosition) {
  const oldPosition = monster.position;
  monster.position = newPosition;

  if (newPosition === 'door') {
    const d = CONFIG.door;
    monster.state = 'lurking';
    monster.doorTimer = Math.max(d.attackWaitFloor,
      randomBetween(d.attackWaitMin, d.attackWaitMax) * (monster.settings.attackWaitScale || 1));
    emitGameEvent('monsterAtDoor', monster);
  } else {
    monster.state = 'roaming';
    emitGameEvent('monsterMoved', {
      monster,
      from: oldPosition,
      to: newPosition,
      distance: doorDistances[currentMapId()][newPosition]
    });
  }

  // Dá sempre uns segundos na última câmara antes de ir para a porta
  if (newPosition === currentMap().nearDoor) {
    monster.moveTimer = Math.max(monster.moveTimer, CONFIG.door.minWaitNearDoor * (monster.settings.nearDoorWaitScale || 1));
  }

  // Se estiveres a ver a câmara de onde saiu ou para onde foi, a imagem falha
  if (camerasOpen && (selectedCamera === oldPosition || selectedCamera === newPosition)) {
    triggerInterference('monster');
  }

  renderMonsters();
}

// À porta: espera um pouco e depois ataca (ou bate na porta fechada)
function updateMonsterAtDoor(monster, dt) {
  const d = CONFIG.door;
  monster.doorTimer -= dt;

  if (monster.state === 'lurking') {
    if (monster.doorTimer > 0) return;

    // Atacar é crítico: se outro monstro acabou de fazer algo grave, espera um pouco
    if (!doorClosed && !horrorDirector.claim('attack', monster.id)) {
      monster.doorTimer = horrorDirector.waitLeft() + 0.1;
      return;
    }

    if (doorClosed) {
      monster.state = 'blocked';
      monster.doorTimer = randomBetween(d.blockedWaitMin, d.blockedWaitMax);
      thudDoor();
      emitGameEvent('attackBlocked', monster);
    } else if (Math.random() < AUDIO_SETTINGS.preAttackSilenceChance) {
      // Às vezes o som desaparece por um instante... e depois o susto
      monster.state = 'attacking';
      monster.doorTimer = randomBetween(0.1, 0.5);
      emitGameEvent('preAttack', monster);
    } else {
      loseGame(monster.id);
    }
    return;
  }

  // O ataque já começou (o silêncio antes do susto): não há volta
  if (monster.state === 'attacking') {
    if (monster.doorTimer <= 0) loseGame(monster.id);
    return;
  }

  if (monster.state === 'blocked') {
    // Abriste a porta com ele ainda lá fora: tens pouco tempo para a fechar
    if (!doorClosed) {
      monster.state = 'lurking';
      monster.doorTimer = randomBetween(d.reopenWaitMin, d.reopenWaitMax);
      return;
    }
    if (monster.doorTimer <= 0) retreatEnemy(monster);
  }
}

// Falhou o ataque: volta para uma câmara anterior
function retreatEnemy(monster) {
  const options = monster.settings.retreatTo.filter((cam) => !isOccupied(cam, monster));
  if (!options.length) {
    monster.doorTimer = 1; // todas ocupadas: espera mais um bocadinho
    return;
  }
  setMonsterPosition(monster, randomItem(options));
  monster.moveTimer = getMoveDelay(monster);
  emitGameEvent('monsterRetreat', { monster });
}

function thudDoor() {
  ui.door.classList.remove('thud');
  void ui.door.offsetWidth; // truque para recomeçar a animação CSS
  ui.door.classList.add('thud');
}


/* ---------------------------------------------------------
   WATCHER — não gosta de ser observado
   --------------------------------------------------------- */

function isBeingWatched(monster) {
  return camerasOpen && monster.position === selectedCamera;
}

function updateWatcher(monster, dt) {
  const W = CONFIG.watcher;
  const watched = isBeingWatched(monster);

  // Olhar faz subir; desviar o olhar faz descer devagar (não volta logo a zero)
  if (watched) {
    monster.exposure += dt * (monster.settings.exposureRate || 1);
  } else {
    monster.exposure = Math.max(0, monster.exposure - W.decayPerSecond * dt);
  }
  if (monster.rushCooldown > 0) monster.rushCooldown -= dt;

  // 6+ segundos a olhar: avança imediatamente
  if (watched && monster.exposure >= W.rushAt && monster.rushCooldown <= 0) {
    const next = pickNextPosition(monster, true);
    // Avançar assim é crítico: o Horror Director pode adiar um instante
    if (next && horrorDirector.claim('watcherRush', monster.id)) {
      monster.rushCooldown = W.rushCooldown;
      setMonsterPosition(monster, next);
      monster.moveTimer = getMoveDelay(monster);
    }
  }

  renderWatcherStare(isBeingWatched(monster) ? getStareLevel(monster.exposure) : 0);
}

// 0 = normal, 1 = inquieto, 2 = agitado, 3 = prestes a avançar
function getStareLevel(exposure) {
  const W = CONFIG.watcher;
  if (exposure >= W.rushAt) return 3;
  if (exposure >= W.restlessAt) return 2;
  if (exposure >= W.uneasyAt) return 1;
  return 0;
}

// Quanto mais exposto, mais depressa o temporizador de movimento anda
function watcherTimerMultiplier(monster) {
  const level = getStareLevel(monster.exposure);
  const irritation = monster.settings.irritation || 1;
  if (level >= 2) return 3 * irritation;
  if (level === 1) return 1 + 0.5 * irritation;
  return 1;
}

function watcherStayChance(monster) {
  if (monster.exposure >= CONFIG.watcher.restlessAt) return 0;
  return monster.settings.stayChance[hourIndex()];
}

function renderWatcherStare(level) {
  if (level === lastWatchLevel) return;
  lastWatchLevel = level;
  ui.camScreen.dataset.watch = level;
}


/* ---------------------------------------------------------
   MORROW — dorme na Specimen Room (CAM 07)
   Se não o vigiares, a raiva (invisível) sobe e ele acorda:
   sleeping -> restless -> awake -> standing -> hunting -> attacking
   Olhar para a CAM 07 acalma-o (com um pequeno atraso).
   Depois de começar a caçar, nada o pára — nem a porta.
   --------------------------------------------------------- */

const MORROW_PHASES = ['sleeping', 'restless', 'awake', 'standing'];

function updateMorrow(monster, dt) {
  if (monster.state === 'hunting') { updateMorrowHunt(monster, dt); return; }
  if (monster.state === 'attacking') { updateMorrowAttack(monster, dt); return; }

  const M = CONFIG.morrow;
  const standing = monster.state === 'standing';

  // Só conta como "vigiar" se olhares a sério (abrir e fechar logo não chega)
  const watched = isBeingWatched(monster);
  monster.watchTime = watched ? monster.watchTime + dt : 0;

  if (watched) {
    const delay = standing ? M.standingCalmDelay : M.calmDelay;
    if (monster.watchTime >= delay) {
      monster.rage -= M.calmRate * (standing ? M.standingCalmFactor : 1) * dt;
    }
  } else {
    monster.rage += monster.settings.rageRate[hourIndex()] * (standing ? M.standingRageFactor : 1) * dt;
  }
  monster.rage = Math.min(M.huntAt, Math.max(0, monster.rage));

  setMorrowState(monster, getMorrowPhase(monster));
  // Fugir é crítico: se outro monstro acabou de fazer algo grave, espera um instante (de pé)
  if (monster.rage >= M.huntAt && horrorDirector.claim('morrowHunt', monster.id)) {
    startMorrowHunt(monster);
    return;
  }

  // A pose pode mudar sem mudar de estado (de quatro patas para erguido)
  if (getMorrowPose(monster) !== monster.lastPose) renderMonsters();
}

// Fase a partir da raiva, com margem para não ficar a saltar entre fases
function getMorrowPhase(monster) {
  const M = CONFIG.morrow;
  const limits = [0, M.restlessAt, M.awakeAt, M.standingAt];
  let i = Math.max(0, MORROW_PHASES.indexOf(monster.state));
  while (i < limits.length - 1 && monster.rage >= limits[i + 1]) i++;
  while (i > 0 && monster.rage < limits[i] - M.hysteresis) i--;
  return MORROW_PHASES[i];
}

function setMorrowState(monster, newState) {
  if (monster.state === newState) return;
  const oldState = monster.state;
  monster.state = newState;

  // Ao ficar mais agitado, mexe-se um bocadinho no sítio: quando voltas, já não está igual
  if (MORROW_PHASES.indexOf(newState) > MORROW_PHASES.indexOf(oldState)) {
    monster.drift = Math.max(-6, Math.min(6, monster.drift + randomBetween(-3, 3)));
  }

  emitGameEvent('morrowState', { monster, from: oldState, to: newState });
  renderMonsters();
}

function startMorrowHunt(monster) {
  const M = CONFIG.morrow;
  monster.state = 'hunting';
  monster.rage = M.huntAt;
  monster.huntIndex = 0;
  monster.huntTimer = randomBetween(M.leaveRoomMin, M.leaveRoomMax);
  emitGameEvent('morrowState', { monster, from: 'standing', to: 'hunting' });
  emitGameEvent('morrowHunt', { monster });
  renderMonsters();
}

// A correr: muito mais rápido que os outros (1–3 s por câmara)
function updateMorrowHunt(monster, dt) {
  monster.huntTimer -= dt;
  if (monster.huntTimer > 0) return;

  const next = monster.settings.huntPath[monster.huntIndex];
  if (!next || next === 'door') {
    if (!horrorDirector.claim('arriveDoor', monster.id)) {
      monster.huntTimer = horrorDirector.waitLeft() + 0.1;
      return;
    }
    monster.huntIndex++;
    morrowArrivesAtDoor(monster);
    return;
  }
  monster.huntIndex++;

  const oldPosition = monster.position;
  const [stepMin, stepMax] = monster.settings.huntStep || [CONFIG.morrow.huntStepMin, CONFIG.morrow.huntStepMax];
  monster.position = next;
  monster.huntTimer = randomBetween(stepMin, stepMax);
  if (camerasOpen && (selectedCamera === oldPosition || selectedCamera === next)) triggerInterference('monster');
  emitGameEvent('monsterMoved', {
    monster,
    from: oldPosition,
    to: next,
    distance: doorDistances[currentMapId()][next]
  });
  renderMonsters();
}

function morrowArrivesAtDoor(monster) {
  const M = CONFIG.morrow;
  monster.position = 'door';
  monster.state = 'attacking';
  monster.doorPose = Math.random() < 0.5 ? 'stand' : 'rear';
  emitGameEvent('morrowAtDoor', { monster });

  if (doorClosed) {
    startMorrowBreach(monster);
  } else {
    // Porta aberta: um instante (se tiveres a luz ligada, vês-lo) e ataca
    monster.attackPhase = 'pounce';
    monster.doorTimer = randomBetween(M.pounceMin, M.pounceMax);
  }
  renderMonsters();
}

// A porta fechada não o pára: bate, deforma o metal e entra
function startMorrowBreach(monster) {
  monster.attackPhase = 'breach';
  monster.doorTimer = CONFIG.morrow.breachSeconds;
  ui.door.classList.add('breaching');
  if (soundDirector.onFlicker) soundDirector.onFlicker();
  emitGameEvent('morrowBreach', { monster });
}

function updateMorrowAttack(monster, dt) {
  monster.doorTimer -= dt;

  if (monster.attackPhase === 'pounce') {
    if (doorClosed) {            // fechaste a porta à última hora: arromba-a
      startMorrowBreach(monster);
      return;
    }
    if (monster.doorTimer <= 0) loseGame(monster.id);
    return;
  }

  // A arrombar: se abrires a porta, entra logo
  if (!doorClosed) monster.doorTimer = Math.min(monster.doorTimer, 0.15);
  if (monster.doorTimer <= 0) loseGame(monster.id);
}

// Que pose desenhar para o estado atual
function getMorrowPose(monster) {
  switch (monster.state) {
    case 'awake': return 'headup';
    case 'standing': return monster.rage >= CONFIG.morrow.rearAt ? 'rear' : 'stand';
    case 'hunting': return 'run';
    case 'attacking': return monster.doorPose;
    default: return 'lying';
  }
}


/* ---------------------------------------------------------
   ECHO — quase cego, ouve o barulho que fazes
   idle -> listening -> investigating -> venting -> atVent -> attacking
   e retreating (quando fica tudo em silêncio, ou se o repeliste).
   Ver o Echo nas câmaras não o afeta. A porta não o pára:
   a única defesa é segurar a grelha da vent da sala.
   --------------------------------------------------------- */

const ECHO_VENTS = ['ventA', 'ventB', 'ventC'];

function updateEcho(echo, dt) {
  const E = CONFIG.echo;

  if (echo.state === 'attacking') return;
  if (echo.state === 'atVent') { updateEchoAtVent(echo, dt); return; }

  echo.silence = echoNoise < E.quietBelow ? echo.silence + dt : 0;
  if (echo.restTimer > 0) echo.restTimer -= dt;

  if (echo.state === 'retreating') { updateEchoRetreat(echo, dt); return; }

  const inVent = isVentCam(echo.position);

  // Silêncio: nas vents pára e fica a ouvir; se continuar, recua
  if (inVent) {
    const wasStill = echo.still;
    echo.still = echo.silence >= E.silenceToStop || echo.restTimer > 0;
    if (echo.still !== wasStill) {
      emitGameEvent('echoStill', { monster: echo, still: echo.still });
      renderMonsters();
    }
    if (echo.silence >= E.silenceToRetreat && echo.restTimer <= 0) {
      startEchoRetreat(echo);
      return;
    }
  } else if (echo.state === 'investigating' && echo.silence >= E.silenceToLeave) {
    startEchoRetreat(echo);
    return;
  } else if (echo.state === 'listening' && echo.silence >= E.silenceToLeave) {
    setEchoState(echo, 'idle');
  }

  // Decisões de tempos a tempos (mais rápidas com mais barulho e mais dificuldade)
  const speed = (echo.settings.approachSpeed || 1) * (0.85 + echoNoise / 200);
  echo.decisionTimer -= dt * speed;
  if (echo.decisionTimer > 0) return;
  echo.decisionTimer = randomBetween(E.decisionMin, E.decisionMax);

  decideEcho(echo);
}

// Hipótese de avançar numa decisão: depende do barulho (não é um detetor perfeito)
function echoAdvanceChance() {
  const E = CONFIG.echo;
  const sens = Math.min(1.3, monsters.echo.settings.approachSpeed || 1);
  return Math.min(0.9, Math.max(0.08, (echoNoise - E.advanceFrom) / E.advanceRange)) * sens;
}

function decideEcho(echo) {
  const E = CONFIG.echo;
  if (echo.restTimer > 0) return;           // acabou de recuar: ignora o barulho por agora

  switch (echo.state) {
    case 'idle':
      if (echoNoise >= E.listenAt) {
        // Em salas grandes às vezes ergue-se nas patas traseiras para ouvir melhor
        const big = echo.settings.bigRooms.includes(echo.position);
        echo.listenPose = big && Math.random() < 0.4 ? 'rear' : 'listen';
        setEchoState(echo, 'listening');
      }
      break;

    case 'listening':
      if (echoNoise < E.listenAt - 5) setEchoState(echo, 'idle');
      else if (echoNoise >= E.investigateAt && Math.random() < echoAdvanceChance()) {
        setEchoState(echo, 'investigating');
        stepEcho(echo, 'toward');
      }
      break;

    case 'investigating':
      if (echoNoise < E.quietBelow) {
        setEchoState(echo, 'listening');
      } else if (Math.random() < echoAdvanceChance()) {
        stepEcho(echo, 'toward');
      }
      break;

    case 'venting':
      if (echo.still) break;
      if (echo.position === 'ventC') {
        // Fase final: ir à grelha da sala (evento crítico)
        if (echoNoise >= E.finalNoise && Math.random() < echoAdvanceChance()
            && horrorDirector.claim('echoVent', echo.id)) {
          startEchoAtVent(echo);
        }
      } else if (Math.random() < echoAdvanceChance()) {
        stepEcho(echo, 'toward');
      }
      break;

    default:
      break;
  }
}

function setEchoState(echo, state) {
  if (echo.state === state) return;
  const from = echo.state;
  echo.state = state;
  emitGameEvent('echoState', { monster: echo, from, to: state });
  renderMonsters();
}

// Um passo (para as vents ou para longe), evitando câmaras ocupadas
function stepEcho(echo, direction) {
  const routes = echo.settings[direction];
  const options = (routes[echo.position] || []).filter((p) => !isOccupied(p, echo));
  if (!options.length) return false;
  moveEchoTo(echo, randomItem(options));
  return true;
}

function moveEchoTo(echo, newPosition) {
  const oldPosition = echo.position;
  echo.position = newPosition;
  const inVent = isVentCam(newPosition);

  if (inVent && !isVentCam(oldPosition)) {
    setEchoState(echo, 'venting');
    emitGameEvent('echoEnterVent', { monster: echo });
  } else if (!inVent && isVentCam(oldPosition)) {
    emitGameEvent('echoLeaveVent', { monster: echo });
  }

  // Nas vents nunca se vê perfeitamente: às vezes só a mão, a cabeça ou uma sombra
  echo.part = inVent ? weightedPick(newPosition === 'ventC'
    ? [['full', 0.45], ['head', 0.35], ['hand', 0.2]]
    : [['full', 0.3], ['head', 0.2], ['hand', 0.2], ['membrane', 0.15], ['shadow', 0.15]]) : 'full';

  if (camerasOpen && (selectedCamera === oldPosition || selectedCamera === newPosition)) {
    triggerInterference('monster');
  }
  emitGameEvent('echoMoved', { monster: echo, from: oldPosition, to: newPosition });
  renderMonsters();
}

function startEchoRetreat(echo) {
  const E = CONFIG.echo;
  echo.still = false;
  echo.retreatTimer = randomBetween(E.retreatStepMin, E.retreatStepMax) * 0.5;
  setEchoState(echo, 'retreating');
}

// A recuar: volta pelo caminho até uma sala longe e fica lá a descansar
function updateEchoRetreat(echo, dt) {
  const E = CONFIG.echo;
  echo.retreatTimer -= dt;
  if (echo.retreatTimer > 0) return;
  echo.retreatTimer = randomBetween(E.retreatStepMin, E.retreatStepMax);

  const home = echo.settings.homes.includes(echo.position);
  if (home || (!stepEcho(echo, 'away') && !isVentCam(echo.position))) {
    // Chegou longe (ou o caminho está ocupado por outro monstro): fica aqui a descansar
    echo.restTimer = randomBetween(E.restMin, E.restMax) * (echo.settings.restScale || 1);
    echo.silence = 0;
    setEchoState(echo, 'idle');
    return;
  }
  // Ainda nas vents com o caminho ocupado: tenta outra vez daqui a pouco
}

// Chegou à grelha da sala: começa a forçar
function startEchoAtVent(echo) {
  const E = CONFIG.echo;
  echo.still = false;
  echo.ventTimer = randomBetween(E.ventWindowMin, E.ventWindowMax);
  echo.holdProgress = 0;
  echo.holdNeeded = randomBetween(E.holdMin, E.holdMax);
  echo.pushTimer = 0;
  setEchoState(echo, 'atVent');
  emitGameEvent('echoAtVent', { monster: echo });
  renderOfficeVent();
}

function updateEchoAtVent(echo, dt) {
  const E = CONFIG.echo;

  if (ventHeld) {
    // Estás a segurar a grelha: ele bate do outro lado
    echo.holdProgress += dt;
    echo.pushTimer -= dt;
    if (echo.pushTimer <= 0) {
      echo.pushTimer = randomBetween(E.pushEveryMin, E.pushEveryMax);
      emitGameEvent('echoPush', { monster: echo });
      bumpOfficeVent();
    }
    if (echo.holdProgress >= echo.holdNeeded) repelEcho(echo);
    return;
  }

  echo.holdProgress = Math.max(0, echo.holdProgress - E.holdDecay * dt);
  echo.ventTimer -= dt;
  if (echo.ventTimer > 0) return;

  // Abrir a grelha é um ataque (crítico)
  if (!horrorDirector.claim('attack', echo.id)) {
    echo.ventTimer = horrorDirector.waitLeft() + 0.1;
    return;
  }
  echo.state = 'attacking';
  loseGame(echo.id);
}

// Seguraste a grelha tempo suficiente: desiste e volta para a VENT B
function repelEcho(echo) {
  const E = CONFIG.echo;
  horrorDirector.claim('echoRepelled', echo.id);   // um momento de folga antes do próximo evento crítico
  echoNoise *= E.repelNoiseFactor;
  echo.restTimer = randomBetween(E.repelRestMin, E.repelRestMax) * (echo.settings.restScale || 1);
  echo.silence = 0;
  echo.still = true;
  setEchoState(echo, 'venting');
  moveEchoTo(echo, 'ventB');
  emitGameEvent('echoRepelled', { monster: echo });
  renderOfficeVent();
}

// Pose a desenhar: quatro patas, a ouvir, erguido, ou espalmado nas vents
function getEchoPose(echo) {
  if (isVentCam(echo.position)) return 'crawl';
  if (echo.state === 'listening') return echo.listenPose;
  return 'crouch';
}

// Calmo, alerta ou agressivo (membranas abertas, boca aberta)
function getEchoMood(echo) {
  if (echo.state === 'atVent' || echo.state === 'attacking' || echoNoise >= 65) return 'aggressive';
  if (echo.state === 'idle') return 'calm';
  return 'alert';
}


/* ---------------------------------------------------------
   GRELHA DA VENT DA SALA (Night 4)
   Clica e mantém o rato carregado para a segurar.
   --------------------------------------------------------- */

function holdVent() {
  if (gameOver || !mapHasVents() || ventHeld) return;
  ventHeld = true;
  makeNoise('ventHold');
  emitGameEvent('ventHold');
  renderOfficeVent();
}

function releaseVent() {
  if (!ventHeld) return;
  ventHeld = false;
  emitGameEvent('ventRelease');
  renderOfficeVent();
}

function renderOfficeVent() {
  const echo = monsters.echo;
  ui.officeVent.classList.toggle('held', ventHeld);
  ui.officeVent.classList.toggle('rattling', Boolean(echo) && echo.state === 'atVent');
  ui.btnHoldVent.classList.toggle('is-active', ventHeld);
}

function bumpOfficeVent() {
  ui.officeVent.classList.remove('bump');
  void ui.officeVent.offsetWidth; // recomeça a animação
  ui.officeVent.classList.add('bump');
}


/* ---------------------------------------------------------
   O QUE SE VÊ (VISUAL STATE)
   Os monstros existem sempre no estado do jogo, mas só
   aparecem no ecrã quando há maneira de os ver.
   --------------------------------------------------------- */

function renderMonsters() {
  const mapId = currentMapId();
  const nearDoor = currentMap().nearDoor;
  const active = Object.values(monsters);

  // Corredor: só com a LIGHT ligada e a porta aberta
  const corridorVisible = lightOn && !doorClosed && !powerOut;
  const near = corridorVisible ? active.filter((m) => m.position === 'door') : [];
  const far = corridorVisible ? active.filter((m) => m.position === nearDoor) : [];

  // Janela da porta: só com a LIGHT ligada e a porta fechada
  const slotVisible = lightOn && doorClosed && !powerOut;
  const inSlot = slotVisible ? active.filter((m) => m.position === 'door') : [];

  for (const id of Object.keys(MONSTER_TYPES)) {
    const monster = monsters[id];
    const els = monsterEls[id];

    // Câmaras: só se vê o monstro que está na câmara que estás a ver
    const onCamera = Boolean(monster) && camerasOpen && monster.position === selectedCamera;
    els.camera.classList.toggle('hidden', !onCamera);
    if (onCamera) els.camera.dataset.spot = `${mapId}-${selectedCamera}`;

    // O Echo não aparece no corredor nem na janela da porta
    if (!els.corridor) {
      if (monster && onCamera) {
        els.camera.dataset.pose = getEchoPose(monster);
        els.camera.dataset.mood = getEchoMood(monster);
        els.camera.dataset.part = monster.part;
      }
      continue;
    }

    // Corredor
    els.corridor.classList.remove('near', 'far', ...SIDE_CLASSES);
    if (monster && near.includes(monster)) {
      els.corridor.classList.add('near');
      if (near.length > 1) els.corridor.classList.add(SIDE_CLASSES[near.indexOf(monster)]);
    } else if (monster && far.includes(monster)) {
      els.corridor.classList.add('far');
      if (far.length > 1) els.corridor.classList.add(SIDE_CLASSES[far.indexOf(monster)]);
    }

    // Janela da porta
    els.slot.classList.remove('visible', ...SIDE_CLASSES);
    if (monster && inSlot.includes(monster)) {
      els.slot.classList.add('visible');
      if (inSlot.length > 1) els.slot.classList.add(SIDE_CLASSES[inSlot.indexOf(monster)]);
    }

    // Morrow: a pose e o "humor" vêm do estado (o estado existe mesmo sem ser visto)
    if (monster && id === 'morrow') {
      const pose = getMorrowPose(monster);
      monster.lastPose = pose;
      for (const el of [els.camera, els.corridor]) {
        el.dataset.pose = pose;
        el.dataset.mood = monster.state;
      }
      els.camera.style.setProperty('--drift', `${monster.drift}%`);
    }
  }
}

// Até três monstros à porta ao mesmo tempo: esquerda, direita, meio
const SIDE_CLASSES = ['side-left', 'side-right', 'side-center'];


/* ---------------------------------------------------------
   PORTA E LUZ
   --------------------------------------------------------- */

function toggleDoor() {
  if (gameOver || powerOut) return;
  doorClosed = !doorClosed;
  makeNoise(doorClosed ? 'doorClose' : 'doorOpen');
  renderControls();
  renderPower();
  renderMonsters();
  emitGameEvent(doorClosed ? 'doorClosed' : 'doorOpened');
}

function toggleLight() {
  if (gameOver || powerOut) return;
  lightOn = !lightOn;
  makeNoise(lightOn ? 'lightOn' : 'lightOff');
  renderControls();
  renderPower();
  renderMonsters();
  emitGameEvent(lightOn ? 'lightOn' : 'lightOff');
}

function renderControls() {
  ui.game.classList.toggle('door-closed', doorClosed);
  ui.game.classList.toggle('light-on', lightOn);

  ui.btnDoor.textContent = doorClosed ? 'OPEN DOOR' : 'CLOSE DOOR';
  ui.btnDoor.classList.toggle('is-active', doorClosed);
  ui.btnLight.classList.toggle('is-active', lightOn);
}


/* ---------------------------------------------------------
   CÂMARAS
   --------------------------------------------------------- */

// Mostra as câmaras e o mapa da noite atual
function setupMapForNight() {
  const mapId = currentMapId();
  ui.game.classList.remove(...Object.keys(MAPS).map((id) => `map-${id}`));
  ui.game.classList.add(`map-${mapId}`);
  ui.sceneSets.forEach((set) => set.classList.toggle('active', set.dataset.map === mapId));
  ui.netToggle.classList.toggle('hidden', !mapHasVents());
  renderCamMap();
}

// Mostra o mapa da rede atual (câmaras principais ou vents)
function renderCamMap() {
  const mapId = currentMapId();
  const showing = camNetwork === 'vent' ? `${mapId}-vents` : mapId;
  ui.camMaps.forEach((map) => map.classList.toggle('active', map.dataset.map === showing));
  ui.mapTitle.textContent = camNetwork === 'vent' ? currentMap().ventTitle : currentMap().title;
  ui.btnNetMain.classList.toggle('selected', camNetwork === 'main');
  ui.btnNetVent.classList.toggle('selected', camNetwork === 'vent');
  ui.camScreen.classList.toggle('vent-view', camNetwork === 'vent');
}

// MAIN CAMS / VENT CAMS
function switchNetwork(network) {
  if (!camerasOpen || !mapHasVents() || network === camNetwork) return;
  switchCamera(lastCam[network]);
}

function openCameras() {
  if (gameOver || powerOut || camerasOpen) return;
  camerasOpen = true;
  makeNoise('camerasOpen');
  show(ui.cameraPanel);
  emitGameEvent('camerasOpened');
  switchCamera(selectedCamera, true);
  noise.start();
  renderPower();
}

function closeCameras() {
  if (!camerasOpen) return;
  camerasOpen = false;
  if (!gameOver) makeNoise('camerasClose');
  hide(ui.cameraPanel);
  renderPower();
  renderMonsters();
  renderWatcherStare(0);
  emitGameEvent('camerasClosed');
}

// opening = true quando é só a abrir o monitor (já tem o seu próprio som)
function switchCamera(camId, opening = false) {
  if (!camerasOpen) return;
  if (!opening) {
    makeNoise('cameraSwitch');
    emitGameEvent('cameraSwitch', { camId });
  }
  selectedCamera = camId;
  camNetwork = isVentCam(camId) ? 'vent' : 'main';
  lastCam[camNetwork] = camId;
  renderCamMap();
  const mapId = currentMapId();

  document.querySelectorAll(`.scene-set[data-map="${mapId}"] .scene`).forEach((scene) => {
    scene.classList.toggle('active', scene.dataset.cam === camId);
  });
  ui.camButtons.forEach((button) => {
    const inThisMap = button.closest('.cam-map').dataset.map.split('-')[0] === mapId;
    button.classList.toggle('selected', inThisMap && button.dataset.cam === camId);
  });
  ui.camLabel.textContent = `${camLabel(camId)} — ${currentMap().cameras[camId]}`;
  ui.camScreen.dataset.view = `${mapId}-${camId}`;   // para o CSS saber que sala é (escuridão, cor)

  renderMonsters();
  triggerInterference();
}

function triggerInterference(reason = 'switch') {
  ui.camScreen.classList.remove('interference');
  void ui.camScreen.offsetWidth; // truque para recomeçar a animação CSS
  ui.camScreen.classList.add('interference');
  later(350, () => ui.camScreen.classList.remove('interference'));
  emitGameEvent('interference', { reason });
}

// Ruído (estática) desenhado em canvas pequenos: câmaras e jumpscare do Watcher
const noise = {
  targets: [
    { canvas: ui.camNoise, isActive: () => camerasOpen },
    { canvas: ui.jsNoise, isActive: () => !ui.jumpscare.classList.contains('hidden') }
  ],
  loopId: null,
  lastTime: 0,

  start() {
    if (this.loopId === null) this.loopId = requestAnimationFrame((t) => this.loop(t));
  },

  loop(now) {
    const active = this.targets.filter((target) => target.isActive());
    if (!active.length) {
      this.loopId = null;
      return;
    }
    if (now - this.lastTime > 60) {
      active.forEach((target) => this.draw(target));
      this.lastTime = now;
    }
    this.loopId = requestAnimationFrame((t) => this.loop(t));
  },

  draw(target) {
    if (!target.ctx) {
      target.ctx = target.canvas.getContext('2d');
      target.image = target.ctx.createImageData(target.canvas.width, target.canvas.height);
    }
    const data = target.image.data;
    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
    target.ctx.putImageData(target.image, 0, 0);
  }
};


/* ---------------------------------------------------------
   FALTA DE ENERGIA
   --------------------------------------------------------- */

function triggerPowerOut() {
  powerOut = true;
  powerOutTimer = 0;
  powerOutAttackTime = CONFIG.powerOut.eyesDelay +
    randomBetween(CONFIG.powerOut.attackDelayMin, CONFIG.powerOut.attackDelayMax);
  powerOutAttacker = randomItem(Object.keys(monsters).filter((id) => !MONSTER_TYPES[id].noPowerOutAttack));
  releaseVent();
  powerOutEyesShown = false;
  powerOutSilence = false;

  closeCameras();
  emitGameEvent('powerOut');
  if (doorClosed) emitGameEvent('doorOpened');
  doorClosed = false;      // a porta abre sozinha
  lightOn = false;         // a luz deixa de funcionar
  ui.powerOutEyes.dataset.monster = powerOutAttacker;
  ui.game.classList.add('power-out');

  renderControls();
  renderPower();
  renderMonsters();
}

function updatePowerOut(dt) {
  if (!powerOut) return;
  powerOutTimer += dt;

  if (!powerOutEyesShown && powerOutTimer >= CONFIG.powerOut.eyesDelay) {
    powerOutEyesShown = true;
    ui.game.classList.add('eyes-visible');
    emitGameEvent('powerOutEyes', { monsterId: powerOutAttacker });
  }
  // Um instante de silêncio total mesmo antes do ataque
  if (!powerOutSilence && powerOutTimer >= powerOutAttackTime - 0.4) {
    powerOutSilence = true;
    emitGameEvent('preAttack', monsters[powerOutAttacker]);
  }
  if (powerOutTimer >= powerOutAttackTime) {
    loseGame(powerOutAttacker);
  }
}


/* ---------------------------------------------------------
   FIM DE JOGO
   --------------------------------------------------------- */

function loseGame(monsterId) {
  if (gameOver) return;
  gameOver = true;
  stopLoop();
  closeCameras();
  releaseVent();

  ui.jumpscare.dataset.monster = monsterId;
  show(ui.jumpscare);
  noise.start();
  emitGameEvent('caught', monsterId);

  later(MONSTER_TYPES[monsterId].jumpscareMs || 1600, () => {
    hide(ui.jumpscare);
    ui.loseTitle.textContent = `CAUGHT BY ${MONSTER_TYPES[monsterId].name}`;
    show(ui.loseScreen);
  });
}

function winGame() {
  if (gameOver) return;
  gameOver = true;
  stopLoop();
  closeCameras();

  releaseVent();

  // Ganhar uma noite desbloqueia a seguinte (Night 1 -> 2 -> 3 -> 4)
  const nextNight = currentNight + 1;
  const justUnlocked = unlockNight(nextNight);

  ui.btnNextNight.classList.toggle('hidden', !(NIGHTS[nextNight] && isNightUnlocked(nextNight)));
  ui.unlockNote.textContent = `NIGHT ${nextNight} UNLOCKED`;
  ui.unlockNote.classList.toggle('hidden', !justUnlocked);
  renderMenu();

  hide(ui.winMessage);
  show(ui.winScreen);
  emitGameEvent('nightWon', { night: currentNight });
  later(2200, () => show(ui.winMessage));
}


/* ---------------------------------------------------------
   MENU, INÍCIO E REINÍCIO
   --------------------------------------------------------- */

function renderMenu() {
  ui.nightButtons.forEach((button) => {
    button.disabled = !isNightUnlocked(Number(button.dataset.night));
  });
}

function showMenu() {
  stopLoop();
  clearPendingTimeouts();
  gameOver = true;
  hide(ui.loseScreen);
  hide(ui.winScreen);
  hide(ui.jumpscare);
  hide(ui.nightIntro);
  hide(ui.optionsScreen);
  renderMenu();
  show(ui.startScreen);
  emitGameEvent('menu');
}

// Mostra "NIGHT X" e depois começa a noite
function startNight(night) {
  if (!NIGHTS[night] || !isNightUnlocked(night)) return;
  audioManager.unlock();
  resetGame(night);

  ui.introNight.textContent = `NIGHT ${night}`;
  show(ui.nightIntro);
  emitGameEvent('nightIntro', { night });
  later(CONFIG.introSeconds * 1000, () => {
    hide(ui.nightIntro);
    beginNight();
  });
}

function beginNight() {
  gameOver = false;
  startLoop();
  emitGameEvent('nightBegin', { night: currentNight });
}


/* ---------------------------------------------------------
   OPÇÕES DE ÁUDIO (só com o rato)
   --------------------------------------------------------- */

const volumeSliders = [
  { kind: 'master', input: $('vol-master'), label: $('vol-master-value') },
  { kind: 'sfx', input: $('vol-sfx'), label: $('vol-sfx-value') },
  { kind: 'ambience', input: $('vol-ambience'), label: $('vol-ambience-value') }
];

function renderVolumeSliders() {
  for (const slider of volumeSliders) {
    const value = Math.round(audioManager[`${slider.kind}Volume`] * 100);
    slider.input.value = value;
    slider.label.textContent = `${value}%`;
  }
}

function showOptions() {
  renderVolumeSliders();
  hide(ui.startScreen);
  show(ui.optionsScreen);
}

function hideOptions() {
  hide(ui.optionsScreen);
  show(ui.startScreen);
}

for (const slider of volumeSliders) {
  slider.input.addEventListener('input', () => {
    audioManager.setVolume(slider.kind, Number(slider.input.value) / 100);
    slider.label.textContent = `${slider.input.value}%`;
  });
  // Ao largar o slider dos efeitos, um pequeno som para ouvir o volume
  slider.input.addEventListener('change', () => {
    if (slider.kind !== 'ambience') emitGameEvent('uiClick');
  });
}

// Falhas elétricas das 4–6 AM: a sala pisca ao mesmo tempo que o som falha
soundDirector.onFlicker = () => {
  ui.game.classList.add('power-flicker');
  later(350, () => ui.game.classList.remove('power-flicker'));
};

// Quando os sons acabam de carregar no menu, começa o ambiente do menu
audioManager.onReady = () => {
  if (soundDirector.mode === 'menu') emitGameEvent('menu');
};

// Os browsers só deixam tocar som depois do primeiro clique
document.addEventListener('pointerdown', () => audioManager.unlock(), true);

// Põe tudo como no início da noite (não começa o relógio)
function resetGame(night = currentNight) {
  stopLoop();
  clearPendingTimeouts();

  currentNight = night;
  const nightConfig = NIGHTS[night];

  power = nightConfig.power.start;
  currentHour = 0;
  elapsedSeconds = 0;
  doorClosed = false;
  lightOn = false;
  camerasOpen = false;
  selectedCamera = 'cam1';
  camNetwork = 'main';
  lastCam = { main: 'cam1', vent: 'ventA' };
  powerOut = false;
  powerOutTimer = 0;
  lastClockText = '';
  lastWatchLevel = -1;
  echoNoise = 0;
  noiseQuietTime = 0;
  ventHeld = false;
  horrorDirector.reset();
  gameOver = true;

  monsters = {};
  for (const id of Object.keys(nightConfig.monsters)) {
    const settings = buildMonsterSettings(id, night);
    monsters[id] = createMonster(id, settings);
    if (settings.moveDelay) monsters[id].moveTimer = getMoveDelay(monsters[id]);
    if (id === 'morrow') monsters[id].state = 'sleeping';
  }
  // Echo: começa longe, numa sala livre, sem se importar contigo
  if (monsters.echo) {
    const echo = monsters.echo;
    const free = echo.settings.startOptions.filter((cam) => !isOccupied(cam, echo));
    echo.position = randomItem(free.length ? free : echo.settings.startOptions);
    echo.state = 'idle';
    echo.decisionTimer = randomBetween(CONFIG.echo.decisionMin, CONFIG.echo.decisionMax);
  }

  hide(ui.cameraPanel);
  hide(ui.startScreen);
  hide(ui.jumpscare);
  hide(ui.loseScreen);
  hide(ui.winScreen);
  ui.game.classList.remove('power-out', 'eyes-visible', 'power-flicker');
  ui.door.classList.remove('thud', 'breaching');
  ui.camScreen.classList.remove('interference');
  ui.officeVent.classList.remove('held', 'rattling', 'bump');
  ui.btnHoldVent.classList.remove('is-active');
  ui.nightLabel.textContent = `NIGHT ${night}`;

  setupMapForNight();
  updateClock();
  renderPower();
  renderControls();
  renderMonsters();
  renderWatcherStare(0);
}


/* ---------------------------------------------------------
   CLIQUES
   --------------------------------------------------------- */

ui.btnDoor.addEventListener('click', toggleDoor);
ui.btnLight.addEventListener('click', toggleLight);
ui.btnCameras.addEventListener('click', openCameras);
ui.btnCloseCams.addEventListener('click', closeCameras);

ui.camButtons.forEach((button) => {
  button.addEventListener('click', () => switchCamera(button.dataset.cam));
});

ui.nightButtons.forEach((button) => {
  button.addEventListener('click', () => startNight(Number(button.dataset.night)));
});

ui.btnNetMain.addEventListener('click', () => switchNetwork('main'));
ui.btnNetVent.addEventListener('click', () => switchNetwork('vent'));

// Segurar a grelha: carregar e manter o rato na grelha ou no botão HOLD VENT
for (const el of [ui.officeVent, ui.btnHoldVent]) {
  el.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    holdVent();
  });
}
document.addEventListener('pointerup', releaseVent);
document.addEventListener('pointercancel', releaseVent);
window.addEventListener('blur', releaseVent);
ui.btnRetry.addEventListener('click', () => startNight(currentNight));
ui.btnPlayAgain.addEventListener('click', () => startNight(currentNight));
ui.btnNextNight.addEventListener('click', () => startNight(currentNight + 1));
ui.btnLoseMenu.addEventListener('click', showMenu);
ui.btnWinMenu.addEventListener('click', showMenu);
ui.btnOptions.addEventListener('click', showOptions);
ui.btnOptionsBack.addEventListener('click', hideOptions);

// Som de clique nos botões dos menus (os da noite têm o seu próprio som)
document.querySelectorAll('.overlay .ctrl-btn:not(.night-btn)').forEach((button) => {
  button.addEventListener('click', () => emitGameEvent('uiClick'));
});

// Estado inicial por trás do menu
resetGame(1);
show(ui.startScreen);
renderMenu();
renderVolumeSliders();
emitGameEvent('menu');
