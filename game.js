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

   Monstros com "control" (Morrow, Echo, Vesper) têm lógica própria em
   vez de patrulharem pelas câmaras.

   OFFICE PANORÂMICA (Night 5+): mapas com office: 'panoramic' trocam a
   sala fixa por uma vista larga (LEFT HALL / CENTER VENT / RIGHT HALL)
   que roda com a posição do rato. Cada hall tem a sua porta e luz.
   As Nights 1–4 continuam com a sala antiga (porta única 'door').

   O som está todo em audio.js: aqui o jogo só avisa o que aconteceu
   (emitGameEvent) e o soundDirector decide o que se ouve.
   ========================================================= */

const CONFIG = {
  nightLengthSeconds: 360, // duração da noite em segundos reais (6 min)
  endHour: 6,              // a noite acaba às 6 AM
  speed: 2,                // velocidade do jogo. Põe 10 para testar depressa!
  debugJournalUnlockAll: false, // SÓ PARA TESTAR: mostra todas as páginas do Journal (não grava nada)
  debugEcho: false,        // SÓ PARA TESTAR: ruído / estado / posição / hipótese / momentum do Echo na consola
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
    rushCooldown: 3,       // tempo mínimo entre dois avanços seguidos
    // Só visual / som (não muda quando avança): nos últimos 0.45 de exposure antes do avanço
    // os ponteiros param, os ticks calam-se e a cabeça fica virada para a câmara
    freezeBefore: 0.45,
    peekChance: 0.05       // por segundo, a olhar muito tempo: a cabeça abre uns centímetros e fecha
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
    // Quanto barulho faz cada ação física. As PORTAS são de longe o mais barulhento (aço pesado);
    // a rotina (luzes, câmaras) continua baixa: um jogador cuidadoso a vigiar os halls não chama o Echo.
    noise: {
      cameraSwitch: 3.5,
      camerasOpen: 5,
      camerasClose: 3,
      lightOn: 5,
      lightOff: 2,
      doorOpen: 12,        // era 7
      doorClose: 20,       // era 13
      ventHold: 10,        // era 8
      ventSealClose: 12,   // Night 5+: a persiana metálica da vent central
      ventSealOpen: 6
    },
    // Portas abertas/fechadas várias vezes seguidas: cada uma faz mais barulho que a anterior
    // (1ª normal, 2ª +15%, 3ª +30%, 4ª em diante +50%). Spam de porta = barulho a disparar.
    loudKinds: ['doorOpen', 'doorClose'],
    streakWindow: 2.5,     // segundos entre ações para continuar a sequência
    streakBonus: [1, 1.15, 1.3, 1.5],
    quietDelay: 0.5,       // segundos sem barulho antes de o ruído começar a descer
    noiseDecay: 3.0,       // desce isto por segundo... (era 3.5: o barulho fica um pouco mais no ar)
    noiseDecayPct: 0.06,   // ...mais 6% do ruído atual por segundo
    listenAt: 18,          // a partir daqui ergue a cabeça e ouve
    investigateAt: 35,     // a partir daqui pode vir investigar
    quietBelow: 12,        // abaixo disto conta como "silêncio"
    quietGrace: 2.5,       // ...ou se não fizeres barulho nenhum durante estes segundos (o ar ainda "soa", mas ele já não ouve nada novo)
    hesitateAfter: 1,      // sem barulho novo: depois deste segundo começa a hesitar...
    hesitateSeconds: 2,    // ...e em (isto × paciência) segundos já não avança só com o ruído antigo
    advanceFrom: 22,       // ruído onde começa a haver hipótese a sério de avançar
    advanceRange: 40,      // ruído extra até à hipótese máxima (~62+: quase certo)
    finalNoise: 32,        // na última vent precisa de pelo menos isto para ir à grelha
    decisionMin: 3,        // segundos entre decisões (divididos pela velocidade: dificuldade, barulho, momentum)
    decisionMax: 5.5,
    silenceToStop: 2,      // nas vents: silêncio que o faz parar e ouvir   (× paciência da dificuldade)
    silenceToRetreat: 5,   // silêncio que o faz recuar                     (× paciência)
    silenceToLeave: 4,     // fora das vents: silêncio que o faz desistir   (× paciência)
    // MOMENTUM (invisível): avançar seguido dá-lhe confiança; o silêncio tira-a
    momentumPerStep: 0.22,
    momentumFade: 0.12,    // por segundo, com pouco barulho
    momentumQuietFade: 0.3,// por segundo, em silêncio
    momentumChance: 0.25,  // + hipótese de avançar com momentum 1
    momentumSpeed: 0.25,   // + velocidade das decisões
    momentumPatience: 0.4, // + silêncio necessário para desistir
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
    repelNoiseFactor: 0.35,// repelido: o ruído cai para ~1/3 (o susto dele "limpa" o ar)
    repelRestMin: 12,      // e fica uns segundos parado na VENT B (repelir tem de valer a pena)
    repelRestMax: 18,
    sealHoldMin: 3,        // Night 5: tempo com o VENT SEAL fechado até ele desistir
    sealHoldMax: 4.5
  },

  // Office panorâmica (Night 5+): a posição do rato decide para onde olhas
  office: {
    deadZone: 0.3,         // rato no centro (|x| < 0.3): a vista volta ao centro
    fullTurn: 0.75,        // a partir daqui (perto da borda) estás virado por completo
    panSpeed: 4.5,         // suavidade: quanto maior, mais depressa a vista acompanha
    lookAt: 0.45,          // |officePan| a partir do qual contas como "a olhar para o hall"
    lungePanSpeed: 1.6     // ataque do Vesper: a cabeça vira sozinha, devagar
  },

  // Vesper: avança quando NÃO estás virado para o hall onde ele está
  vesper: {
    firstMin: 30,          // primeira aparição (segundos de noite)
    firstMax: 55,
    awayMin: 22,           // depois de expulso fica longe (fora das câmaras)
    awayMax: 38,
    camStepMin: 4,         // nas câmaras: segundos por câmara
    camStepMax: 7,
    watchedCamSlow: 0.25,  // visto nas câmaras: mexe-se muito devagar
    hallStepMin: 2.4,      // no hall, sem ser observado: segundos entre avanços
    hallStepMax: 3.8,
    hallStepSize: [0.16, 0.26], // quanto avança de cada vez (0 = fundo do hall, 1 = porta)
    lightNeedMin: 1.5,     // segundos de luz seguidos para o expulsar
    lightNeedMax: 2.5,
    lightDecay: 0.6,       // sem luz perde progresso devagar (não volta logo a zero)
    doorTouchMin: 4,       // porta fechada: de vez em quando toca/arranha
    doorTouchMax: 8,
    lungeSeconds: 1.0,     // o silêncio anormal antes do susto
    freezeCueCooldown: 5   // o estalo ao congelar não toca sempre
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
   vents: câmaras da rede de ventilação (Night 4+), a última dá para a sala
   ventRepelTo: para onde o Echo volta quando o repeles
   office: 'panoramic' = sala panorâmica com dois halls (Night 5+)
   halls: cada lado da sala panorâmica: o hall e a câmara antes dele
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
    vents: ['ventA', 'ventB', 'ventC'],
    ventRepelTo: 'ventB'
  },

  // Night 5: zona central que liga os setores antigos. Dois caminhos finais
  // (WEST -> LEFT HALL, EAST -> RIGHT HALL) e uma rede de vents até à vent central.
  centralComplex: {
    title: 'CENTRAL PROCESSING',
    ventTitle: 'VENT NETWORK — CORE',
    office: 'panoramic',
    cameras: {
      cam1: 'MAIN LOBBY',
      cam2: 'PROCESSING HALL',
      cam3: 'CONTROL ROOM',
      cam4: 'WEST JUNCTION',
      cam5: 'EAST JUNCTION',
      cam6: 'MACHINE ROOM',
      cam7: 'STORAGE SECTOR',
      cam8: 'LOWER CORRIDOR',
      cam9: 'OBSERVATION ROOM',
      cam10: 'SPECIMEN CHAMBER',
      cam11: 'WEST APPROACH',
      cam12: 'EAST APPROACH',
      ventA: 'INTAKE SHAFT',
      ventB: 'MAIN DUCT',
      ventC: 'CROSS DUCT',
      ventD: 'OFFICE DUCT'
    },
    links: [
      ['cam1', 'cam2'], ['cam2', 'cam3'], ['cam2', 'cam4'], ['cam2', 'cam5'],
      ['cam4', 'cam6'], ['cam5', 'cam7'], ['cam6', 'cam8'], ['cam7', 'cam9'], ['cam8', 'cam9'],
      ['cam8', 'cam10'], ['cam6', 'cam11'], ['cam8', 'cam11'], ['cam7', 'cam12'], ['cam9', 'cam12'],
      ['cam11', 'leftHall'], ['cam12', 'rightHall']
    ],
    doorNodes: ['leftHall', 'rightHall'],
    halls: {
      left: { hall: 'leftHall', approach: 'cam11' },
      right: { hall: 'rightHall', approach: 'cam12' }
    },
    vents: ['ventA', 'ventB', 'ventC', 'ventD'],
    ventRepelTo: 'ventB'
  },

  // Night 6: SUBLEVEL 06 — VEIL CORE. O centro original do PROJECT VEIL, selado desde 08/11/2008.
  // WEST (cam4 -> cam6 -> cam11) e EAST (cam5 -> cam7 -> cam12) como na Night 5;
  // por baixo, o setor do Subject Zero: cam15 -> cam14 -> cam13 (liga à Server Chamber).
  // As vents ramificam: A — B — C, e de C para D ou E (ambas dão para a vent central).
  veilCore: {
    title: 'SUBLEVEL 06 — VEIL CORE',
    ventTitle: 'VENT NETWORK — VEIL CORE',
    office: 'panoramic',
    cameras: {
      cam1: 'CORE ENTRANCE',
      cam2: 'ADMINISTRATION',
      cam3: 'PRIMARY LAB',
      cam4: 'WEST CONTAINMENT',
      cam5: 'EAST CONTAINMENT',
      cam6: 'OBSERVATION HALL',
      cam7: 'MEDICAL WING',
      cam8: 'SERVER CHAMBER',
      cam9: 'BEHAVIOUR LAB',
      cam10: 'MORROW CONTAINMENT',
      cam11: 'WEST APPROACH',
      cam12: 'EAST APPROACH',
      cam13: 'ARCHIVE CORRIDOR',
      cam14: 'ZERO OBSERVATION',
      cam15: 'CORE CHAMBER',
      ventA: 'WEST INTAKE',
      ventB: 'EAST INTAKE',
      ventC: 'JUNCTION DUCT',
      ventD: 'LEFT OFFICE DUCT',
      ventE: 'RIGHT OFFICE DUCT'
    },
    links: [
      ['cam1', 'cam2'], ['cam2', 'cam3'], ['cam3', 'cam4'], ['cam3', 'cam5'],
      ['cam4', 'cam6'], ['cam5', 'cam7'], ['cam6', 'cam8'], ['cam7', 'cam9'], ['cam8', 'cam9'],
      ['cam8', 'cam10'], ['cam6', 'cam11'], ['cam7', 'cam12'],
      ['cam8', 'cam13'], ['cam13', 'cam14'], ['cam14', 'cam15'],
      ['cam11', 'leftHall'], ['cam12', 'rightHall']
    ],
    doorNodes: ['leftHall', 'rightHall'],
    halls: {
      left: { hall: 'leftHall', approach: 'cam11' },
      right: { hall: 'rightHall', approach: 'cam12' }
    },
    vents: ['ventA', 'ventB', 'ventC', 'ventD', 'ventE'],
    finalVents: ['ventD', 'ventE'],   // as duas dão para a vent central
    ventRepelTo: 'ventB'
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
  // Custom Night: o AI LEVEL 1–20 de cada monstro escolhe a afinação (20 = o cap dele)
  const levels = NIGHTS[night] && NIGHTS[night].customLevels;
  if (levels) return getCustomDifficulty(monsterId, levels[monsterId]).multiplier;
  const nightsSince = Math.max(0, night - type.introductionNight);
  return Math.min(1 + nightsSince * DIFFICULTY.stepPerNight, type.difficultyCap);
}

/* ----- Custom Night: AI LEVEL (0–20) -> parâmetros de cada monstro -----
   A IA é SEMPRE a mesma: o nível só escolhe o multiplicador que o tune() de cada
   monstro já sabe usar (mais alguns ajustes pequenos, só na Custom Night).
   O nível 0 nem chega aqui: o monstro fica fora da noite (custom.js).
   Curva (não linear): 1 muito permissivo (0.6x, mais fácil que a estreia),
   10 ~ dificuldade média, 15 difícil, 20 = o cap do monstro (o salto final). */
const CUSTOM_AI_FLOOR = 0.6;

function customCurve(level) {
  const t = (Math.min(20, Math.max(1, level)) - 1) / 19;
  return 0.85 * Math.pow(t, 1.1) + 0.15 * Math.pow(t, 4);   // 5 ≈ 0.8x, 10 ≈ 1.1x, 15 ≈ 1.5x, 20 = cap
}

function customMultiplier(monsterId, level) {
  return CUSTOM_AI_FLOOR + (MONSTER_TYPES[monsterId].difficultyCap - CUSTOM_AI_FLOOR) * customCurve(level);
}

// Black: decide mais vezes, avança com mais vontade, espera menos (tune: com piso de 4 s por câmara)
function getBlackCustomDifficulty(level) {
  return { multiplier: customMultiplier('black', level), extra: {} };
}
// Watcher: exposure sobe mais depressa, avança mais irritado; a recuperação fica um pouco mais lenta
function getWatcherCustomDifficulty(level) {
  return { multiplier: customMultiplier('watcher', level), extra: { recoveryScale: 1 - 0.2 * customCurve(level) } };
}
// Morrow: raiva mais rápida; precisa de um pouco mais de observação para começar a acalmar.
// A corrida final (hunting) não muda.
function getMorrowCustomDifficulty(level) {
  return { multiplier: customMultiplier('morrow', level), extra: { calmDelayScale: 1 + 0.35 * customCurve(level) } };
}
// Echo: curva própria e mais forte (o AI 20 passa claramente a Night 6):
// AI 1 0.6x · AI 5 0.75x · AI 10 1.25x · AI 15 1.8x · AI 20 2.75x (pressão base = Night 4)
const ECHO_CUSTOM_CURVE = [[1, 0.6], [5, 0.75], [10, 1.25], [15, 1.8], [20, 2.75]];   // 20 = MONSTER_TYPES.echo.customCap
function getEchoCustomDifficulty(level) {
  const l = Math.min(20, Math.max(1, level));
  let multiplier = ECHO_CUSTOM_CURVE[0][1];
  for (let i = 1; i < ECHO_CUSTOM_CURVE.length; i++) {
    const [l0, m0] = ECHO_CUSTOM_CURVE[i - 1];
    const [l1, m1] = ECHO_CUSTOM_CURVE[i];
    if (l <= l1) { multiplier = m0 + (m1 - m0) * (l - l0) / (l1 - l0); break; }
  }
  return { multiplier, extra: {} };
}
// Vesper: aproxima-se mais depressa e mais vezes, demora um pouco mais a expulsar
function getVesperCustomDifficulty(level) {
  return { multiplier: customMultiplier('vesper', level), extra: {} };
}
// Subject Zero: mais influência, mais corrupções, avança mais depressa (as pistas ficam sempre)
function getSubjectZeroCustomDifficulty(level) {
  return { multiplier: customMultiplier('subjectZero', level), extra: {} };
}

const CUSTOM_DIFFICULTY = {
  black: getBlackCustomDifficulty,
  watcher: getWatcherCustomDifficulty,
  morrow: getMorrowCustomDifficulty,
  echo: getEchoCustomDifficulty,
  vesper: getVesperCustomDifficulty,
  subjectZero: getSubjectZeroCustomDifficulty
};

function getCustomDifficulty(monsterId, level) {
  return CUSTOM_DIFFICULTY[monsterId](level);
}

// Duração da noite (igual em todas as noites, Custom Night incluída)
function nightLengthSeconds() {
  return CONFIG.nightLengthSeconds;
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
    }),
    jumpscareMs: 1800      // a cabeça lisa enche o ecrã, inclina-se, e a frente abre-se
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
    stayChance: watcherStayChance,
    jumpscareMs: 2300      // o relógio aproxima-se, pára nas 08:11 e abre-se
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
    jumpscareMs: 2200
  },

  echo: {
    name: 'ECHO',
    introductionNight: 4,
    difficultyCap: 2.0,
    base: {},
    // Mais sensível ao barulho, decide mais depressa, avança com mais vontade, desiste mais tarde,
    // descansa menos depois de recuar. (Night 4 = 1.0, Night 5 = 1.5, Night 6 = 2.0;
    // Custom Night AI 20 = 2.75 — ver customCap)
    tune: (m) => ({
      noiseSensitivity: boost(m, 0.4),
      approachSpeed: boost(m, 0.5),
      aggression: boost(m, 0.25),
      patience: boost(m, 0.5),
      restScale: 1 / boost(m, 0.3)
    }),
    customCap: 2.75,           // só a Custom Night passa da Night 6 (o AI 20 do Echo é ~2.5–3x)
    control: updateEcho,
    noPowerOutAttack: true,    // não tem olhos para brilhar no escuro
    jumpscareMs: 2100
  },

  vesper: {
    name: 'VESPER',
    introductionNight: 5,
    difficultyCap: 2.0,
    base: {},
    // Avança mais depressa no hall, demora mais a expulsar, descansa menos
    tune: (m) => ({
      speed: boost(m, 0.5),
      lightNeedScale: boost(m, 0.2),
      restScale: 1 / boost(m, 0.3)
    }),
    control: updateVesper,     // não patrulha: aproxima-se por um lado e fica no hall
    noPowerOutAttack: true,
    jumpscareMs: 2200
  },

  // VEIL-0. Ataca a confiança do jogador na informação (ver zero.js)
  subjectZero: {
    name: 'SUBJECT ZERO',
    introductionNight: 6,
    difficultyCap: 2.0,
    base: {},
    // Ganha influência mais depressa, corrompe mais vezes, avança mais rápido, menos tempo na fase final
    tune: (m) => ({
      influenceRate: boost(m, 0.6),
      corruptionRate: boost(m, 0.5),
      stepScale: 1 / boost(m, 0.4),
      finalWindowScale: 1 / boost(m, 0.25)
    }),
    control: (monster, dt) => updateSubjectZero(monster, dt),   // definido em zero.js
    noPowerOutAttack: true,
    jumpscareMs: 2800
  }
};


/* ---------------------------------------------------------
   NOITES
   Aqui ficam só as ROTAS (dependem do mapa). A velocidade vem
   da afinação base de cada monstro × multiplicador da noite.
   moves: para onde pode ir a partir de cada sítio (e com que peso)
   retreatTo: para onde pode fugir depois de falhar um ataque
              (lista, ou { hall: [...] } quando há mais de uma porta)
   door: (opcional) muda os tempos de CONFIG.door nesta noite
   horror: (opcional) limites extra do Horror Director nesta noite
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
  },

  5: {
    map: 'centralComplex',
    // Dois halls + vent central: fechar tudo esgota a energia muito depressa.
    // Um jogador eficiente deve acabar com ~2–15%.
    power: { start: 100, baseDrain: 0.17, doorDrain: 0.2, lightDrain: 0.1, camerasDrain: 0.05, ventSealDrain: 0.3 },
    // No hall não há aviso visual automático: tens de te virar e ligar a luz.
    // Com dois halls para vigiar, a janela de reação é maior que a da porta única.
    door: { attackWaitMin: 4, attackWaitMax: 7, attackWaitFloor: 3.2 },
    // Nunca mais do que 3 ameaças a pedir reação ao mesmo tempo
    horror: { maxThreats: 3 },
    monsters: {
      // WEST (cam4 -> cam6 -> cam11) ou EAST (cam5 -> cam7 -> cam12); às vezes cruza por baixo (cam8–cam9)
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam4: 0.45, cam5: 0.45, cam3: 0.1 },
          cam3: { cam2: 1 },
          cam4: { cam6: 0.8, cam2: 0.2 },
          cam5: { cam7: 0.8, cam2: 0.2 },
          cam6: { cam11: 0.55, cam8: 0.3, cam4: 0.15 },
          cam7: { cam12: 0.55, cam9: 0.3, cam5: 0.15 },
          cam8: { cam11: 0.5, cam9: 0.25, cam6: 0.25 },
          cam9: { cam12: 0.5, cam8: 0.25, cam7: 0.25 },
          cam11: { leftHall: 0.9, cam6: 0.1 },
          cam12: { rightHall: 0.9, cam7: 0.1 }
        },
        // falhou o ataque: recua pelo mesmo lado
        retreatTo: { leftHall: ['cam6', 'cam8', 'cam4'], rightHall: ['cam7', 'cam9', 'cam5'] }
      },
      watcher: {
        start: 'cam3',
        moves: {
          cam3: { cam2: 1 },
          cam2: { cam4: 0.4, cam5: 0.4, cam1: 0.1, cam3: 0.1 },
          cam1: { cam2: 1 },
          cam4: { cam6: 0.65, cam2: 0.35 },
          cam5: { cam7: 0.65, cam2: 0.35 },
          cam6: { cam8: 0.4, cam11: 0.4, cam4: 0.2 },
          cam7: { cam9: 0.4, cam12: 0.4, cam5: 0.2 },
          cam8: { cam11: 0.55, cam9: 0.2, cam6: 0.25 },
          cam9: { cam12: 0.55, cam8: 0.2, cam7: 0.25 },
          cam11: { leftHall: 0.85, cam8: 0.15 },
          cam12: { rightHall: 0.85, cam9: 0.15 }
        },
        retreatTo: { leftHall: ['cam6', 'cam4', 'cam8'], rightHall: ['cam7', 'cam5', 'cam9'] }
      },
      morrow: {
        start: 'cam10',
        // Ao fugir escolhe um lado; as portas não o param
        huntPaths: {
          left: ['cam8', 'cam11', 'leftHall'],
          right: ['cam8', 'cam9', 'cam12', 'rightHall']
        },
        huntStep: [1.0, 2.2]
      },
      echo: {
        startOptions: ['cam7', 'cam6', 'cam1'],
        // As duas junções têm entrada para a VENT A; daí é sempre em frente até à vent central
        toward: {
          cam1: ['cam2'], cam3: ['cam2'], cam2: ['cam4', 'cam5'], cam6: ['cam4'], cam7: ['cam5'],
          cam4: ['ventA'], cam5: ['ventA'], ventA: ['ventB'], ventB: ['ventC'], ventC: ['ventD']
        },
        away: {
          ventD: ['ventC'], ventC: ['ventB'], ventB: ['ventA'], ventA: ['cam4', 'cam5'],
          cam4: ['cam6', 'cam2'], cam5: ['cam7', 'cam2'], cam2: ['cam1', 'cam3']
        },
        homes: ['cam1', 'cam3', 'cam6', 'cam7'],
        bigRooms: ['cam2', 'cam6']
      },
      vesper: {
        // Escolhe um lado em cada aproximação e não troca até ser expulso
        paths: {
          left: ['cam4', 'cam6', 'cam11', 'leftHall'],
          right: ['cam5', 'cam7', 'cam12', 'rightHall']
        }
      }
    }
  },

  // NIGHT 6 — FINAL NIGHT. Todos os monstros + Subject Zero, na VEIL CORE.
  // A dificuldade vem da combinação e da informação pouco confiável, não de timers absurdos.
  6: {
    map: 'veilCore',
    // Mais barata por segundo que a Night 5: o SIGNAL VERIFY e o PURGE também gastam energia
    power: { start: 100, baseDrain: 0.14, doorDrain: 0.2, lightDrain: 0.1, camerasDrain: 0.04, ventSealDrain: 0.3 },
    door: { attackWaitMin: 4, attackWaitMax: 7, attackWaitFloor: 3.2 },
    horror: { maxThreats: 3 },
    extendedEnding: true,      // às 6:00 a noite não acaba: 6:01 e a sequência final (ver startOvertime)
    finalNight: true,          // eventos das 5:00 / 5:30 / 5:59 (zero.js)
    monsters: {
      black: {
        start: 'cam1',
        moves: {
          cam1: { cam2: 1 },
          cam2: { cam3: 1 },
          cam3: { cam4: 0.45, cam5: 0.45, cam2: 0.1 },
          cam4: { cam6: 0.8, cam3: 0.2 },
          cam5: { cam7: 0.8, cam3: 0.2 },
          cam6: { cam11: 0.5, cam8: 0.35, cam4: 0.15 },
          cam7: { cam12: 0.5, cam9: 0.35, cam5: 0.15 },
          cam8: { cam6: 0.5, cam9: 0.5 },
          cam9: { cam7: 0.55, cam8: 0.45 },
          cam11: { leftHall: 0.9, cam6: 0.1 },
          cam12: { rightHall: 0.9, cam7: 0.1 }
        },
        retreatTo: { leftHall: ['cam6', 'cam8', 'cam4'], rightHall: ['cam7', 'cam9', 'cam5'] }
      },
      watcher: {
        start: 'cam2',
        moves: {
          cam2: { cam3: 0.8, cam1: 0.2 },
          cam1: { cam2: 1 },
          cam3: { cam4: 0.4, cam5: 0.4, cam2: 0.2 },
          cam4: { cam6: 0.65, cam3: 0.35 },
          cam5: { cam7: 0.65, cam3: 0.35 },
          cam6: { cam8: 0.4, cam11: 0.4, cam4: 0.2 },
          cam7: { cam9: 0.4, cam12: 0.4, cam5: 0.2 },
          cam8: { cam6: 0.5, cam9: 0.5 },
          cam9: { cam7: 0.6, cam8: 0.4 },
          cam11: { leftHall: 0.85, cam6: 0.15 },
          cam12: { rightHall: 0.85, cam7: 0.15 }
        },
        retreatTo: { leftHall: ['cam6', 'cam4', 'cam8'], rightHall: ['cam7', 'cam5', 'cam9'] }
      },
      morrow: {
        start: 'cam10',
        huntPaths: {
          left: ['cam8', 'cam6', 'cam11', 'leftHall'],
          right: ['cam8', 'cam9', 'cam7', 'cam12', 'rightHall']
        },
        huntStep: [1.0, 2.0]
      },
      echo: {
        startOptions: ['cam1', 'cam6', 'cam7'],
        // WEST entra na VENT A (cam4), EAST na VENT B (cam5); de C ramifica para D ou E
        toward: {
          cam1: ['cam2'], cam2: ['cam3'], cam3: ['cam4', 'cam5'], cam6: ['cam4'], cam7: ['cam5'],
          cam4: ['ventA'], cam5: ['ventB'], ventA: ['ventB'], ventB: ['ventC'], ventC: ['ventD', 'ventE']
        },
        away: {
          ventD: ['ventC'], ventE: ['ventC'], ventC: ['ventB'], ventB: ['ventA', 'cam5'], ventA: ['cam4'],
          cam4: ['cam6', 'cam3'], cam5: ['cam7', 'cam3'], cam3: ['cam2'], cam2: ['cam1']
        },
        homes: ['cam1', 'cam6', 'cam7'],
        bigRooms: ['cam3', 'cam6']
      },
      vesper: {
        paths: {
          left: ['cam4', 'cam6', 'cam11', 'leftHall'],
          right: ['cam5', 'cam7', 'cam12', 'rightHall']
        }
      },
      subjectZero: {
        start: 'cam15',
        // A progressão real: CORE CHAMBER -> ZERO OBSERVATION -> ARCHIVE CORRIDOR -> sistema central (fase final)
        path: ['cam15', 'cam14', 'cam13']
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

// Office panorâmica (Night 5+): duas portas, duas luzes e o VENT SEAL
let leftDoorClosed = false;
let rightDoorClosed = false;
let leftLightOn = false;
let rightLightOn = false;
let ventSealed = false;

// Para onde o jogador está virado: -1 = LEFT HALL, 0 = centro, 1 = RIGHT HALL.
// targetOfficePan vem da posição do rato; officePan aproxima-se devagar.
let officePan = 0;
let targetOfficePan = 0;
let mouseX = 0;             // posição horizontal do rato no jogo (-1 a 1)
let panLockSide = null;     // ataque do Vesper: a cabeça vira sozinha para este lado
let keyLookTarget = null;   // atalhos A/S/D: para onde olhar até o rato voltar a mexer-se
let keyLookMouseX = 0;      // onde estava o rato quando se carregou na tecla
let lastPanApplied = null;

// Vesper: quanto tempo seguido está iluminado (invisível para o jogador)
let vesperLightExposure = 0;

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
  btnHints: $('btn-hints'),
  adminNote: $('admin-note'),
  nightIntro: $('night-intro'),
  introNight: $('intro-night'),
  introSector: $('intro-sector'),

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
  btnWinMenu: $('btn-win-menu'),

  // Office panorâmica (Night 5+)
  panoTrack: $('pano-track'),
  centerVent: $('center-vent'),
  btnVentSeal: $('btn-vent-seal'),
  btnCamerasPano: $('btn-cameras-pano')
};

// Cada hall da office panorâmica é igual: o desenho está num <template>
// e é copiado para o lado esquerdo e para o direito
const hallTemplate = document.getElementById('tpl-hall');
document.querySelectorAll('.hall-doorway').forEach((el) => {
  el.appendChild(hallTemplate.content.cloneNode(true));
});

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

// E o do Vesper
const vesperTemplate = document.getElementById('tpl-vesper');
document.querySelectorAll('.vesper-figure').forEach((el) => {
  el.appendChild(vesperTemplate.content.cloneNode(true));
});

// E o do Black (cabeça lisa, sem rosto; a boca só aparece no ataque)
const blackTemplate = document.getElementById('tpl-black');
document.querySelectorAll('.figure.creature').forEach((el) => {
  el.appendChild(blackTemplate.content.cloneNode(true));
});

// E o do Watcher (a cabeça-relógio). Cada cópia começa com os ponteiros noutra hora.
const watcherTemplate = document.getElementById('tpl-watcher');
document.querySelectorAll('.figure.watcher').forEach((el) => {
  el.appendChild(watcherTemplate.content.cloneNode(true));
  el.style.setProperty('--w-hour0', `${Math.round(Math.random() * 360)}deg`);
  el.style.setProperty('--w-min-delay', `${(-Math.random() * 60).toFixed(1)}s`);
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

// Office panorâmica: os elementos de cada lado (hall, porta, botões, monstros)
const SIDES = ['left', 'right'];
const panoEls = {};
for (const side of SIDES) {
  const root = document.querySelector(`.pano-side[data-side="${side}"]`);
  const figures = {};
  const slots = {};
  root.querySelectorAll('.hall-fig').forEach((el) => { figures[el.dataset.monster] = el; });
  root.querySelectorAll('.slot-figure').forEach((el) => { slots[el.dataset.monster] = el; });
  panoEls[side] = {
    root,
    doorway: root.querySelector('.hall-doorway'),
    door: root.querySelector('.pano-door'),
    eyes: root.querySelector('.pano-eyes'),
    btnDoor: root.querySelector('.side-door-btn'),
    btnLight: root.querySelector('.side-light-btn'),
    figures,
    slots
  };
}

// Distância (em passos) de cada câmara até à porta, para cada mapa
const doorDistances = {};
for (const [mapId, map] of Object.entries(MAPS)) {
  doorDistances[mapId] = computeDoorDistances(map.links, map.doorNodes);
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

// A última vent dá para a sala (VENT C na Night 4, VENT D na Night 5, D ou E na Night 6)
function isFinalVent(position) {
  const map = currentMap();
  const finals = map.finalVents || [map.vents[map.vents.length - 1]];
  return finals.includes(position);
}

// O nome da noite no ecrã ("NIGHT 6", "CUSTOM NIGHT")
function nightTitle(night) {
  return (NIGHTS[night] && NIGHTS[night].label) || `NIGHT ${night}`;
}

// Ganchos do Subject Zero (preenchidos por zero.js). Todos opcionais:
// cameraView(cam), hallView(side), labelFor(cam), tick(dt), reset(night), audioState()
const zeroHooks = {};

// Ganchos das ANOMALIES da Custom Night (preenchidos por anomalies.js). Todos opcionais:
// tick(dt), reset(night), blocks(control), extraDrain(), panTarget(), denyClaim(kind, id, target), types
// Nas Nights 1–6 não há Anomalies: os ganchos não fazem nada.
const anomalyHooks = {};

// Um controlo da office está agarrado pelo LATCH? (o clique não faz nada; ele mexe-se no botão)
function controlLatched(control) {
  if (!anomalyHooks.blocks || !anomalyHooks.blocks(control)) return false;
  emitGameEvent('latchJammed', { control });
  return true;
}

/* ----- Portas: uma só (Nights 1–4) ou uma por hall (office panorâmica) ----- */

const HALL_SIDE = { leftHall: 'left', rightHall: 'right' };

function isPanoramic() {
  return currentMap().office === 'panoramic';
}

// 'door' na sala antiga, 'leftHall' / 'rightHall' na panorâmica
function isDoorPosition(position) {
  return position === 'door' || Boolean(HALL_SIDE[position]);
}

// De que lado fica esta posição (hall ou a câmara mesmo antes dele)
function sideOf(position) {
  if (HALL_SIDE[position]) return HALL_SIDE[position];
  const halls = currentMap().halls;
  if (!halls) return null;
  return SIDES.find((side) => halls[side].approach === position) || null;
}

// A última câmara antes de uma porta (a sala antiga tem uma, a panorâmica duas)
function isApproachCam(position) {
  const map = currentMap();
  if (map.halls) return SIDES.some((side) => map.halls[side].approach === position);
  return position === map.nearDoor;
}

function isSideDoorClosed(side) {
  return side === 'left' ? leftDoorClosed : rightDoorClosed;
}

function isSideLightOn(side) {
  return side === 'left' ? leftLightOn : rightLightOn;
}

// A porta que protege esta posição está fechada?
function isDoorClosedAt(position) {
  const side = HALL_SIDE[position];
  return side ? isSideDoorClosed(side) : doorClosed;
}

// Tempos da porta desta noite (CONFIG.door com os ajustes da noite)
function doorTiming() {
  return { ...CONFIG.door, ...(NIGHTS[currentNight].door || {}) };
}

// Para onde o jogador está virado: 'left', 'right', 'center' ou 'monitor' (câmaras abertas)
function lookDirection() {
  if (!isPanoramic()) return 'center';
  if (camerasOpen) return 'monitor';
  if (officePan <= -CONFIG.office.lookAt) return 'left';
  if (officePan >= CONFIG.office.lookAt) return 'right';
  return 'center';
}

function computeDoorDistances(links, doorNodes = ['door']) {
  const distances = {};
  const queue = [...doorNodes];
  doorNodes.forEach((node) => { distances[node] = 0; });
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

   Nas noites com horror.maxThreats (Night 5) também conta quantas
   ameaças estão a pedir uma reação ao mesmo tempo (monstro num
   hall, Morrow a correr, Echo na vent): se já forem demasiadas,
   uma ameaça NOVA espera um pouco. Overlap normal continua a existir;
   só se evita a combinação instantânea sem hipótese de reagir.

   Custom Night: as ANOMALIES também passam por aqui (HUSH CRITICAL,
   KNOCKER RESPONSE, LATCH CRITICAL, LUMEN CRITICAL — ver anomalies.js).
   --------------------------------------------------------- */

// Eventos que COMEÇAM uma ameaça nova (os ataques são consequência e não contam)
const THREAT_STARTS = new Set(['arriveDoor', 'watcherRush', 'morrowHunt', 'echoVent', 'vesperHall', 'zeroFinal']);

const horrorDirector = {
  lastMajorTime: -Infinity,
  lastMonster: null,
  majorEventCooldown: 0,
  maxThreats: Infinity,
  log: [],

  reset(night = currentNight) {
    this.lastMajorTime = -Infinity;
    this.lastMonster = null;
    this.majorEventCooldown = 0;
    this.maxThreats = (NIGHTS[night].horror && NIGHTS[night].horror.maxThreats) || Infinity;
    this.log = [];
  },

  // Quantas ameaças estão neste momento a exigir uma reação do jogador
  activeThreats(exceptId) {
    let count = 0;
    for (const m of Object.values(monsters)) {
      if (m.id === exceptId) continue;
      if (m.id === 'morrow') {
        if (m.state === 'hunting' || m.state === 'attacking') count++;
      } else if (m.id === 'echo') {
        if (m.state === 'atVent') count++;
      } else if (m.id === 'subjectZero') {
        if (m.state === 'final' || m.state === 'attacking') count++;   // fase final: PURGE SIGNAL
      } else if (isDoorPosition(m.position) && m.state !== 'blocked') {
        count++;
      }
    }
    // Custom Night: as Anomalies a pedir uma reação também contam (anomalies.js)
    if (anomalyHooks.threats) count += anomalyHooks.threats();
    return count;
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
  // target: para onde vai (ex.: 'leftHall'), quando importa
  claim(kind, monsterId, target) {
    if (!this.isFree(monsterId)) return false;
    if (THREAT_STARTS.has(kind) && this.activeThreats(monsterId) >= this.maxThreats) return false;
    // Custom Night: as Anomalies nunca criam uma situação impossível (ver anomalies.js)
    if (anomalyHooks.denyClaim && anomalyHooks.denyClaim(kind, monsterId, target)) return false;
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

let noiseStreak = { count: 0, last: -Infinity };   // ações barulhentas seguidas (spam de porta / luz)

function makeNoise(kind) {
  const echo = monsters.echo;
  if (!echo || gameOver) return;
  const E = CONFIG.echo;
  let amount = E.noise[kind] || 0;
  if (E.loudKinds.includes(kind)) {
    noiseStreak.count = elapsedSeconds - noiseStreak.last <= E.streakWindow ? noiseStreak.count + 1 : 0;
    noiseStreak.last = elapsedSeconds;
    amount *= E.streakBonus[Math.min(noiseStreak.count, E.streakBonus.length - 1)];
  }
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

// Guardado como securityGuard.night2Unlocked, ...night3Unlocked, ...night4Unlocked, ...night5Unlocked
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
  if (night === 'custom') return isCustomNightUnlocked();   // Custom Night: depois de acabar a campanha (ou atalho de admin)
  if (!NIGHTS[night]) return false;
  return Boolean(memoryUnlocks[night]) || loadProgress(nightKey(night));
}

/* ----- Campanha completa (Night 6 até ao fim) ----- */

const CAMPAIGN_KEY = 'securityGuard.campaignComplete';
let campaignCompleteMemory = false;   // se o browser não deixar guardar

function isCampaignComplete() {
  return campaignCompleteMemory || loadProgress(CAMPAIGN_KEY);
}

function markCampaignComplete() {
  campaignCompleteMemory = true;
  try {
    localStorage.setItem(CAMPAIGN_KEY, 'true');
  } catch (error) { /* só nesta sessão */ }
  emitGameEvent('campaignComplete');
}

/* ----- Custom Night: abre com a campanha completa, ou com o atalho de admin ↑↑↑↑←
   (o atalho só abre a Custom Night: não marca a campanha como completa) ----- */

const CUSTOM_UNLOCK_KEY = 'securityGuard.customUnlocked';
let customUnlockedMemory = false;   // se o browser não deixar guardar

function isCustomNightUnlocked() {
  return isCampaignComplete() || customUnlockedMemory || loadProgress(CUSTOM_UNLOCK_KEY);
}

function unlockCustomNight() {
  customUnlockedMemory = true;
  try {
    localStorage.setItem(CUSTOM_UNLOCK_KEY, 'true');
  } catch (error) { /* só nesta sessão */ }
  emitGameEvent('customUnlocked');
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

// Apaga o progresso guardado (Nights, Journal, intro vista). As opções
// (volume, dicas das teclas) ficam. Usado pelo atalho de admin no menu.
const SAVE_KEYS_KEEP = ['securityGuard.audio', 'securityGuard.showShortcutHints', 'securityGuard.subtitles'];

function resetSaveData() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('securityGuard.') && !SAVE_KEYS_KEEP.includes(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // sem localStorage: só há o progresso desta sessão, que é limpo abaixo
  }
  for (const night of Object.keys(memoryUnlocks)) delete memoryUnlocks[night];
  campaignCompleteMemory = false;
  customUnlockedMemory = false;
  emitGameEvent('saveReset');   // o Journal e a intro limpam o que têm em memória
  renderMenu();
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
  const realDt = Math.min((now - lastFrameTime) / 1000, 0.25);
  const dt = realDt * CONFIG.speed;
  lastFrameTime = now;

  updateOfficePan(realDt);   // virar a cabeça segue o rato em tempo real (não acelera com CONFIG.speed)
  tickGame(dt);
  if (!gameOver) loopId = requestAnimationFrame(gameLoop);
}

// Avança o jogo "dt" segundos
function tickGame(dt) {
  elapsedSeconds += dt;
  // Night 6: depois das 6:00 o relógio continua (e os monstros já não atacam)
  if (overtime) {
    updateOvertime(dt);
    return;
  }
  updateClock();
  if (gameOver || overtime) return;

  updatePower(dt);
  updateNoise(dt);
  updateMonsters(dt);
  if (gameOver) return;
  if (zeroHooks.tick) zeroHooks.tick(dt);   // corrupções, verify, eventos da Night 6
  if (gameOver) return;
  if (anomalyHooks.tick) anomalyHooks.tick(dt);   // Custom Night: Anomalies
  if (gameOver) return;
  updatePowerOut(dt);
  if (gameOver) return;
  soundDirector.update(dt, getAudioState());
}

/* ----- Night 6: 6:00 AM não é o fim ----- */

let overtime = null;   // null = noite normal; { t, stage } depois das 6:00

// Às 6:00 a noite não acaba: os monstros param, e passados ~2 s o relógio mostra 6:01
function startOvertime() {
  overtime = { t: 0, stage: 0 };
  closeCameras();
  releaseVent();
  emitGameEvent('overtime', { stage: '6:00' });
}

function updateOvertime(dt) {
  overtime.t += dt / CONFIG.speed;   // segundos reais (não acelera com CONFIG.speed)
  if (overtime.stage === 0 && overtime.t >= 2) {
    overtime.stage = 1;
    ui.clock.textContent = formatTime(CONFIG.endHour, 1);   // 6:01 AM — nunca tinha acontecido
    lastClockText = ui.clock.textContent;
    emitGameEvent('overtime', { stage: '6:01' });
  }
  if (overtime.stage === 1 && overtime.t >= 3.8) {
    overtime.stage = 2;
    finishFinalNight();
  }
}

// A campanha acabou (é aqui que fica guardado). Depois toca a sequência final.
function finishFinalNight() {
  gameOver = true;
  stopLoop();
  closeCameras();
  markCampaignComplete();
  if (cutsceneAfterCampaign) cutsceneAfterCampaign();
  else showMenu();
}

// Preenchido por cutscenes.js: a sequência final da campanha
let cutsceneAfterCampaign = null;

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
    watcherCritical: Boolean(watcher) && isBeingWatched(watcher) && watcher.exposure >= CONFIG.watcher.rushAt - CONFIG.watcher.freezeBefore,
    watcherSide: watcher ? sideOf(watcher.position) : null,
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
      ventIndex: currentMap().vents.indexOf(monsters.echo.position) + 1,
      ventCount: currentMap().vents.length,
      watched: isBeingWatched(monsters.echo),
      noise: echoNoise,
      momentum: monsters.echo.momentum,
      held: isVentBlocked()
    } : null,
    vesper: monsters.vesper ? {
      state: monsters.vesper.state,
      side: monsters.vesper.side,
      progress: monsters.vesper.hallProgress,
      frozen: monsters.vesper.frozen
    } : null,
    zero: monsters.subjectZero && zeroHooks.audioState ? zeroHooks.audioState() : null
  };
}


/* ---------------------------------------------------------
   OFFICE PANORÂMICA — virar a cabeça com o rato
   A posição horizontal do rato dá o targetOfficePan; o
   officePan aproxima-se suavemente (sem saltos).
   Sem scrollbar, sem arrastar, sem teclado.
   --------------------------------------------------------- */

// Rato no centro: vista ao centro. Perto das bordas: vira por completo.
function panTargetFromMouse(x) {
  const O = CONFIG.office;
  const k = Math.min(1, Math.max(0, (Math.abs(x) - O.deadZone) / (O.fullTurn - O.deadZone)));
  return Math.sign(x) * k * k * (3 - 2 * k);   // smoothstep: começa e acaba suave
}

function updateOfficePan(dt) {
  if (!isPanoramic()) return;
  const O = CONFIG.office;
  let speed = O.panSpeed;
  const held = anomalyHooks.panTarget ? anomalyHooks.panTarget() : null;
  if (panLockSide) {
    targetOfficePan = panLockSide === 'left' ? -1 : 1;
    speed = O.lungePanSpeed;
  } else if (held !== null) {
    // Custom Night: a arrastar o LATCH, a vista vira-se para a secretária (MAINTENANCE SLOT)
    targetOfficePan = held;
  } else if (!camerasOpen && !powerOut) {
    // Com o monitor levantado não estás a olhar para a sala: a vista fica onde estava
    // Atalho A/S/D: olha para lá até o rato voltar a mexer-se a sério
    targetOfficePan = keyLookTarget !== null ? keyLookTarget : panTargetFromMouse(mouseX);
  }
  officePan += (targetOfficePan - officePan) * (1 - Math.exp(-speed * dt));
  if (Math.abs(targetOfficePan - officePan) < 0.0005) officePan = targetOfficePan;
  renderOfficePan();
}

function renderOfficePan() {
  if (officePan === lastPanApplied) return;
  lastPanApplied = officePan;
  // A sala tem o dobro da largura do ecrã: -1 mostra a metade esquerda, 1 a direita
  ui.panoTrack.style.transform = `translate3d(${(-(officePan + 1) / 2 * 50).toFixed(3)}%, 0, 0)`;
}

// Só a posição horizontal conta. Mexer o rato não faz barulho.
ui.game.addEventListener('pointermove', (event) => {
  const rect = ui.game.getBoundingClientRect();
  mouseX = Math.min(1, Math.max(-1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
  // Mexer o rato (mais do que um tremor) devolve-lhe o controlo da vista
  if (keyLookTarget !== null && Math.abs(mouseX - keyLookMouseX) > 0.04) keyLookTarget = null;
});

// Atalhos A/S/D: virar a cabeça depressa (a transição continua suave)
function lookWithKey(target) {
  if (gameOver || !isPanoramic() || camerasOpen || panLockSide) return;
  keyLookTarget = target;
  keyLookMouseX = mouseX;
}


/* ---------------------------------------------------------
   RELÓGIO
   --------------------------------------------------------- */

function updateClock() {
  const gameMinutes = Math.floor((elapsedSeconds / nightLengthSeconds()) * CONFIG.endHour * 60);
  currentHour = Math.min(Math.floor(gameMinutes / 60), CONFIG.endHour);
  const minutes = currentHour >= CONFIG.endHour ? 0 : gameMinutes % 60;

  const text = formatTime(currentHour, minutes);
  if (text !== lastClockText) {
    ui.clock.textContent = text;
    lastClockText = text;
  }

  if (currentHour >= CONFIG.endHour && !gameOver) {
    // Night 6: às 6:00 não há vitória (ver startOvertime)
    if (NIGHTS[currentNight].extendedEnding) startOvertime();
    else winGame();
  }
}

function formatTime(hour, minutes) {
  const displayHour = hour % 12 === 0 ? 12 : hour;
  return `${displayHour}:${String(minutes).padStart(2, '0')} AM`;
}


/* ---------------------------------------------------------
   ENERGIA
   --------------------------------------------------------- */

// Quantas portas / luzes estão a gastar energia neste momento
function doorsClosedCount() {
  if (!isPanoramic()) return doorClosed ? 1 : 0;
  return (leftDoorClosed ? 1 : 0) + (rightDoorClosed ? 1 : 0);
}

function lightsOnCount() {
  if (!isPanoramic()) return lightOn ? 1 : 0;
  return (leftLightOn ? 1 : 0) + (rightLightOn ? 1 : 0);
}

// Quantas barras de "Usage" estão ativas (1 a 4; até 7 na office panorâmica)
function getUsage() {
  let usage = 1 + doorsClosedCount() + lightsOnCount();
  if (camerasOpen) usage++;
  if (ventSealed) usage++;
  return usage;
}

function getDrainPerSecond() {
  const p = NIGHTS[currentNight].power;
  let drain = p.baseDrain;
  drain += doorsClosedCount() * p.doorDrain;
  drain += lightsOnCount() * p.lightDrain;
  if (camerasOpen) drain += p.camerasDrain;
  if (ventSealed) drain += p.ventSealDrain || 0;
  if (anomalyHooks.extraDrain) drain += anomalyHooks.extraDrain();   // Custom Night: o LATCH a roer os fios
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
   - position: 'cam1'...'cam12', 'door' (sala antiga) ou
               'leftHall' / 'rightHall' (office panorâmica)
   - state: 'roaming' (nas câmaras), 'lurking' (à porta, prestes a atacar)
            ou 'blocked' (atacou com a porta fechada, vai recuar)
   O Morrow, o Echo e o Vesper têm estados próprios (ver mais abaixo).
   --------------------------------------------------------- */

// Junta a rota da noite com a afinação base do monstro × multiplicador
function buildMonsterSettings(id, night) {
  const type = MONSTER_TYPES[id];
  const multiplier = getDifficultyMultiplier(id, night);
  const tuned = type.tune ? type.tune(multiplier, type.base) : {};
  // Custom Night: pequenos ajustes extra por monstro (nas Nights 1–6 não existem)
  const levels = NIGHTS[night].customLevels;
  const extra = levels ? getCustomDifficulty(id, levels[id]).extra : {};
  return { ...NIGHTS[night].monsters[id], ...tuned, ...extra, difficulty: multiplier };
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
    momentum: 0,          // invisível: avançar seguido dá-lhe confiança
    still: false,
    restTimer: 0,
    retreatTimer: 0,
    ventTimer: 0,
    holdProgress: 0,
    holdNeeded: 2,
    pushTimer: 0,
    listenPose: 'listen',    // 'listen' ou 'rear' (o pescoço todo esticado, em salas grandes)
    part: 'full',
    // Morrow (Night 5): o caminho que escolheu ao fugir
    huntPath: settings.huntPath || null,
    // Vesper
    side: null,
    pathIndex: 0,
    stepTimer: 0,
    awayTimer: 0,
    hallProgress: 0,
    frozen: false,
    stage: 0,
    lightNeeded: 2,
    touchTimer: 0,
    attackTimer: 0,
    litShown: false,
    freezeCueTime: -Infinity
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

// Outro monstro já está nesta câmara? (à porta / no hall podem estar vários)
function isOccupied(position, exceptMonster) {
  if (isDoorPosition(position)) return false;
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

    if (isDoorPosition(monster.position)) {
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
  if (isDoorPosition(next) && !horrorDirector.claim('arriveDoor', monster.id, next)) {
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
  monster.doorSide = sideOf(newPosition);   // para o som saber de que lado vem (Night 5)

  if (isDoorPosition(newPosition)) {
    const d = doorTiming();
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
      side: monster.doorSide,
      distance: doorDistances[currentMapId()][newPosition]
    });
  }

  // Dá sempre uns segundos na última câmara antes de ir para a porta
  if (isApproachCam(newPosition)) {
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
  const d = doorTiming();
  const closed = isDoorClosedAt(monster.position);
  monster.doorTimer -= dt;

  if (monster.state === 'lurking') {
    if (monster.doorTimer > 0) return;

    // Atacar é crítico: se outro monstro acabou de fazer algo grave, espera um pouco
    if (!closed && !horrorDirector.claim('attack', monster.id)) {
      monster.doorTimer = horrorDirector.waitLeft() + 0.1;
      return;
    }

    if (closed) {
      monster.state = 'blocked';
      monster.doorTimer = randomBetween(d.blockedWaitMin, d.blockedWaitMax);
      thudDoor(HALL_SIDE[monster.position]);
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
    if (!closed) {
      monster.state = 'lurking';
      monster.doorTimer = randomBetween(d.reopenWaitMin, d.reopenWaitMax);
      return;
    }
    if (monster.doorTimer <= 0) retreatEnemy(monster);
  }
}

// Falhou o ataque: volta para uma câmara anterior (na Night 5, do mesmo lado)
function retreatEnemy(monster) {
  const retreat = monster.settings.retreatTo;
  const list = Array.isArray(retreat) ? retreat : retreat[monster.position];
  const options = list.filter((cam) => !isOccupied(cam, monster));
  if (!options.length) {
    monster.doorTimer = 1; // todas ocupadas: espera mais um bocadinho
    return;
  }
  const side = HALL_SIDE[monster.position] || null;
  setMonsterPosition(monster, randomItem(options));
  monster.moveTimer = getMoveDelay(monster);
  emitGameEvent('monsterRetreat', { monster, side });
}

// A porta que protege um lado ('left' / 'right'), ou a porta única da sala antiga
function doorElement(side) {
  return side ? panoEls[side].door : ui.door;
}

function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // truque para recomeçar a animação CSS
  el.classList.add(className);
}

function thudDoor(side = null) {
  restartAnimation(doorElement(side), 'thud');
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
    monster.exposure = Math.max(0, monster.exposure - W.decayPerSecond * (monster.settings.recoveryScale || 1) * dt);
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

  // Visual: nível de exposure (0–3) e o instante "crítico" mesmo antes de avançar
  const stillWatched = isBeingWatched(monster);
  const level = stillWatched ? getStareLevel(monster.exposure) : 0;
  const critical = stillWatched && monster.exposure >= W.rushAt - W.freezeBefore;
  renderWatcherStare(level, critical);
  // Muito raramente, a olhar há muito tempo: a cabeça-relógio abre uns centímetros e volta a fechar
  if (level >= 2 && !critical && Math.random() < W.peekChance * dt) watcherPeek();
}

function watcherPeek() {
  const el = monsterEls.watcher.camera;
  if (el.classList.contains('w-peek')) return;
  restartAnimation(el, 'w-peek');
  later(700, () => el.classList.remove('w-peek'));
  emitGameEvent('watcherPeek');
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

function renderWatcherStare(level, critical = false) {
  if (level === lastWatchLevel && critical === lastWatchCritical) return;
  lastWatchLevel = level;
  lastWatchCritical = critical;
  ui.camScreen.dataset.watch = level;
  ui.camScreen.classList.toggle('watch-critical', critical);   // ponteiros parados, silêncio
}
let lastWatchCritical = false;


/* ---------------------------------------------------------
   MORROW — dorme na sua sala (CAM 07 na Night 3, CAM 08 na Night 4,
   CAM 10 na Night 5)
   Se não o vigiares, a raiva (invisível) sobe e ele acorda:
   sleeping -> restless -> awake -> standing -> hunting -> attacking
   Olhar para a câmara dele acalma-o (com um pequeno atraso).
   Depois de começar a caçar, nada o pára — nem a porta.
   Na Night 5 escolhe um dos halls ao fugir.
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
    const delay = (standing ? M.standingCalmDelay : M.calmDelay) * (monster.settings.calmDelayScale || 1);
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
  // Night 5: escolhe um dos lados (LEFT HALL ou RIGHT HALL)
  const paths = monster.settings.huntPaths;
  monster.huntPath = paths ? paths[randomItem(Object.keys(paths))] : monster.settings.huntPath;
  emitGameEvent('morrowState', { monster, from: 'standing', to: 'hunting' });
  emitGameEvent('morrowHunt', { monster });
  renderMonsters();
}

// A correr: muito mais rápido que os outros (1–3 s por câmara)
function updateMorrowHunt(monster, dt) {
  monster.huntTimer -= dt;
  if (monster.huntTimer > 0) return;

  const next = monster.huntPath[monster.huntIndex];
  if (!next || isDoorPosition(next)) {
    if (!horrorDirector.claim('arriveDoor', monster.id, next)) {
      monster.huntTimer = horrorDirector.waitLeft() + 0.1;
      return;
    }
    monster.huntIndex++;
    morrowArrivesAtDoor(monster, next || 'door');
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
    side: sideOf(next),
    distance: doorDistances[currentMapId()][next]
  });
  renderMonsters();
}

function morrowArrivesAtDoor(monster, doorPosition) {
  const M = CONFIG.morrow;
  monster.position = doorPosition;
  monster.state = 'attacking';
  monster.doorPose = Math.random() < 0.3 ? 'stand' : 'rear';   // à porta, quase sempre erguido (só visual)
  emitGameEvent('morrowAtDoor', { monster, side: HALL_SIDE[doorPosition] || null });

  if (isDoorClosedAt(doorPosition)) {
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
  const side = HALL_SIDE[monster.position] || null;
  monster.attackPhase = 'breach';
  monster.doorTimer = CONFIG.morrow.breachSeconds;
  doorElement(side).classList.add('breaching');
  if (soundDirector.onFlicker) soundDirector.onFlicker();
  emitGameEvent('morrowBreach', { monster, side });
}

function updateMorrowAttack(monster, dt) {
  const closed = isDoorClosedAt(monster.position);
  monster.doorTimer -= dt;

  if (monster.attackPhase === 'pounce') {
    if (closed) {                // fechaste a porta à última hora: arromba-a
      startMorrowBreach(monster);
      return;
    }
    if (monster.doorTimer <= 0) loseGame(monster.id);
    return;
  }

  // A arrombar: se abrires a porta, entra logo
  if (!closed) monster.doorTimer = Math.min(monster.doorTimer, 0.15);
  if (monster.doorTimer <= 0) loseGame(monster.id);
}

// Que pose desenhar para o estado atual (só visual)
// standing: primeiro a meio caminho ('rise': as patas de trás aguentam o peso), depois erguido ('rear')
function getMorrowPose(monster) {
  switch (monster.state) {
    case 'awake': return 'headup';
    case 'standing': return monster.rage >= CONFIG.morrow.rearAt ? 'rear' : 'rise';
    case 'hunting': return morrowHuntPose(monster);
    case 'attacking': return monster.doorPose;
    default: return 'lying';
  }
}

// A caçar corre quase sempre a quatro patas; às vezes, numa câmara, aparece erguido (escolhido ao chegar)
const MORROW_HUNT_REAR_CHANCE = 0.3;
function morrowHuntPose(monster) {
  if (monster.huntPoseAt !== monster.position) {
    monster.huntPoseAt = monster.position;
    monster.huntPose = Math.random() < MORROW_HUNT_REAR_CHANCE ? 'rear' : 'run';
  }
  return monster.huntPose;
}


/* ---------------------------------------------------------
   ECHO — quase cego, ouve o barulho que fazes
   idle -> listening -> investigating -> venting -> atVent -> attacking
   e retreating (quando fica tudo em silêncio, ou se o repeliste).
   Ver o Echo nas câmaras não o afeta. A porta não o pára:
   a única defesa é segurar a grelha da vent da sala (Night 4)
   ou fechar o VENT SEAL da vent central (Night 5).
   --------------------------------------------------------- */

function updateEcho(echo, dt) {
  const E = CONFIG.echo;

  if (echo.state === 'attacking') return;
  if (echo.state === 'atVent') { updateEchoAtVent(echo, dt); return; }

  // Silêncio: pouco ruído no ar, ou nenhum barulho novo há uns segundos
  const quiet = echoNoise < E.quietBelow || noiseQuietTime >= E.quietGrace;
  echo.silence = quiet ? echo.silence + dt : 0;
  if (echo.restTimer > 0) echo.restTimer -= dt;
  // Momentum: perde-o com pouco barulho, e mais depressa em silêncio
  if (quiet) echo.momentum = Math.max(0, echo.momentum - E.momentumQuietFade * dt);
  else if (echoNoise < E.listenAt) echo.momentum = Math.max(0, echo.momentum - E.momentumFade * dt);

  if (echo.state === 'retreating') { updateEchoRetreat(echo, dt); return; }

  const inVent = isVentCam(echo.position);
  // Paciência: com mais dificuldade (e embalado) precisa de mais silêncio para parar / desistir
  const patience = (echo.settings.patience || 1) * (1 + E.momentumPatience * echo.momentum);

  // Silêncio: nas vents pára e fica a ouvir; se continuar, recua
  if (inVent) {
    const wasStill = echo.still;
    echo.still = echo.silence >= E.silenceToStop * patience || echo.restTimer > 0;
    if (echo.still !== wasStill) {
      emitGameEvent('echoStill', { monster: echo, still: echo.still });
      renderMonsters();
    }
    if (echo.silence >= E.silenceToRetreat * patience && echo.restTimer <= 0) {
      startEchoRetreat(echo);
      return;
    }
  } else if (echo.state === 'investigating' && echo.silence >= E.silenceToLeave * patience) {
    startEchoRetreat(echo);
    return;
  } else if (echo.state === 'listening' && echo.silence >= E.silenceToLeave * patience) {
    setEchoState(echo, 'idle');
  }

  // Decisões de tempos a tempos (mais rápidas com mais barulho, mais dificuldade e momentum)
  const speed = (echo.settings.approachSpeed || 1) * (0.7 + echoNoise / 140) * (1 + E.momentumSpeed * echo.momentum);
  echo.decisionTimer -= dt * speed;
  if (echo.decisionTimer > 0) return;
  echo.decisionTimer = randomBetween(E.decisionMin, E.decisionMax);

  decideEcho(echo);
  logEchoDebug(echo);
}

// Hipótese de avançar numa decisão. Não é um detetor perfeito, mas o barulho alto domina a sorte:
// pouco barulho ~5%; médio ~60%; alto ~95%; com a dificuldade e o momentum, quase certo.
function echoAdvanceChance() {
  const E = CONFIG.echo;
  const echo = monsters.echo;
  let chance;
  if (echoNoise < E.advanceFrom) chance = 0.05;
  else chance = 0.12 + 0.86 * Math.pow(Math.min(1, (echoNoise - E.advanceFrom) / E.advanceRange), 0.75);
  chance = chance * (echo.settings.aggression || 1) + E.momentumChance * echo.momentum;
  // Ficaste quieto: o ruído ainda está no ar, mas ele já não ouve nada novo e começa a hesitar
  const quietFor = noiseQuietTime - E.hesitateAfter;
  if (quietFor > 0) chance *= Math.max(0, 1 - quietFor / (E.hesitateSeconds * (echo.settings.patience || 1)));
  return Math.min(0.98, chance);
}

// Um passo em frente (para as vents / a grelha): ganha momentum
function echoAdvanced(echo) {
  echo.momentum = Math.min(1, echo.momentum + CONFIG.echo.momentumPerStep);
}

// Debug temporário (só com CONFIG.debugEcho = true): o estado do Echo na consola a cada decisão
function logEchoDebug(echo) {
  if (!CONFIG.debugEcho) return;
  console.log(`[echo] noise ${echoNoise.toFixed(1)} | ${echo.state} @ ${echo.position} | advance ${(echoAdvanceChance() * 100).toFixed(0)}% | momentum ${echo.momentum.toFixed(2)} | silence ${echo.silence.toFixed(1)}`);
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
        if (stepEcho(echo, 'toward')) echoAdvanced(echo);
      }
      break;

    case 'investigating':
      if (echoNoise < E.quietBelow) {
        setEchoState(echo, 'listening');
      } else if (Math.random() < echoAdvanceChance()) {
        if (stepEcho(echo, 'toward')) echoAdvanced(echo);
      }
      break;

    case 'venting':
      if (echo.still) break;
      if (isFinalVent(echo.position)) {
        // Fase final: ir à grelha da sala (evento crítico — o único que o HorrorDirector pode atrasar)
        if (echoNoise >= E.finalNoise && Math.random() < echoAdvanceChance()) {
          if (horrorDirector.claim('echoVent', echo.id)) {
            echoAdvanced(echo);
            startEchoAtVent(echo);
          } else {
            echo.decisionTimer = horrorDirector.waitLeft() + 0.3;   // tenta outra vez logo que possa
          }
        }
      } else if (Math.random() < echoAdvanceChance()) {
        if (stepEcho(echo, 'toward')) echoAdvanced(echo);
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
  // near: está nas duas últimas vents (perto da sala) — o som ouve-se mais
  const vents = currentMap().vents || [];
  const near = vents.indexOf(echo.position) >= vents.length - 2;
  emitGameEvent('echoState', { monster: echo, from, to: state, near });
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

  // Nas vents nunca se vê da mesma maneira (só visual): ao longe (costas e cauda), de lado a atravessar,
  // virado para a câmara, demasiado perto da lente, ou comprimido atrás de uma grelha. Perto da sala: mais perto.
  echo.part = inVent ? weightedPick(isFinalVent(newPosition)
    ? [['face', 0.3], ['close', 0.3], ['grille', 0.25], ['side', 0.15]]
    : [['far', 0.25], ['side', 0.35], ['face', 0.15], ['grille', 0.15], ['close', 0.1]]) : 'full';

  if (camerasOpen && (selectedCamera === oldPosition || selectedCamera === newPosition)) {
    triggerInterference('monster');
  }
  const vents = currentMap().vents;
  emitGameEvent('echoMoved', {
    monster: echo,
    from: oldPosition,
    to: newPosition,
    ventIndex: vents.indexOf(newPosition) + 1,   // 0 = fora das vents
    ventCount: vents.length
  });
  renderMonsters();
}

function startEchoRetreat(echo) {
  const E = CONFIG.echo;
  echo.still = false;
  echo.momentum = 0;
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
  // Segurar a grelha (Night 4) é rápido; o VENT SEAL (Night 5) tem de ficar fechado mais tempo
  echo.holdNeeded = isPanoramic()
    ? randomBetween(E.sealHoldMin, E.sealHoldMax)
    : randomBetween(E.holdMin, E.holdMax);
  echo.pushTimer = 0;
  setEchoState(echo, 'atVent');
  emitGameEvent('echoAtVent', { monster: echo });
  renderOfficeVent();
}

// A vent da sala está bloqueada? (grelha segura na Night 4, VENT SEAL fechado na Night 5)
function isVentBlocked() {
  return isPanoramic() ? ventSealed : ventHeld;
}

function updateEchoAtVent(echo, dt) {
  const E = CONFIG.echo;

  if (isVentBlocked()) {
    // A vent está bloqueada: ele bate do outro lado
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

// Bloqueaste a vent tempo suficiente: desiste e volta para trás (VENT B)
function repelEcho(echo) {
  const E = CONFIG.echo;
  horrorDirector.claim('echoRepelled', echo.id);   // um momento de folga antes do próximo evento crítico
  echoNoise *= E.repelNoiseFactor;
  echo.momentum = 0;
  echo.restTimer = randomBetween(E.repelRestMin, E.repelRestMax) * (echo.settings.restScale || 1);
  echo.silence = 0;
  echo.still = true;
  setEchoState(echo, 'venting');
  moveEchoTo(echo, currentMap().ventRepelTo || 'ventB');
  emitGameEvent('echoRepelled', { monster: echo });
  renderOfficeVent();
}

// Pose a desenhar (só visual): agachado, a ouvir, baixo a investigar, a entrar numa vent, ou uma das poses das vents
function getEchoPose(echo) {
  if (isVentCam(echo.position)) return 'v' + (echo.part === 'full' ? 'side' : echo.part);
  if (echo.state === 'listening') return echo.listenPose;
  if (echo.state === 'investigating') {
    // na sala que dá para as vents: já a meio da abertura (a cabeça e os braços lá dentro)
    const next = (echo.settings.toward[echo.position] || [])[0];
    return next && isVentCam(next) ? 'enter' : 'stalk';
  }
  if (echo.state === 'retreating') return 'stalk';
  return 'crouch';
}

// Efeitos visuais curtos do Echo nas câmaras (não mexem na IA)
const ECHO_ROAR_CHANCE = { atVent: 0.4, enterVent: 0.1 };
function echoVisualCue(name, ms) {
  const el = monsterEls.echo.camera;
  restartAnimation(el, name);
  later(ms, () => el.classList.remove(name));
}
// Começou a ouvir: pára, ergue a cabeça, orienta as placas, fica imóvel um instante, e só depois decide
onGameEvent('echoState', (data) => {
  if (data && data.to === 'listening') echoVisualCue('e-hear', 1200);
});
// O rugido raro (o Echo é quase sempre silencioso): ao chegar à grelha, ou às vezes ao entrar nas vents com barulho extremo
function maybeEchoRoar(kind) {
  const echo = monsters.echo;
  if (!echo || Math.random() >= ECHO_ROAR_CHANCE[kind]) return;
  if (kind === 'enterVent' && echoNoise < 85) return;
  echoVisualCue('e-roar', 1300);
  emitGameEvent('echoRoar', { monster: echo, kind });
}
// Os temporizadores são cancelados no reset / menu: limpa os efeitos para não ficarem presos (ex.: boca aberta)
function clearEchoVisualCues() {
  monsterEls.echo.camera.classList.remove('e-hear', 'e-roar');
}
for (const name of ['menu', 'nightIntro', 'caught']) onGameEvent(name, clearEchoVisualCues);
onGameEvent('echoAtVent', () => maybeEchoRoar('atVent'));
onGameEvent('echoEnterVent', () => maybeEchoRoar('enterVent'));

// Calmo, alerta ou agressivo (membranas abertas, boca aberta)
function getEchoMood(echo) {
  if (echo.state === 'atVent' || echo.state === 'attacking' || echoNoise >= 65) return 'aggressive';
  if (echo.state === 'idle') return 'calm';
  return 'alert';
}


/* ---------------------------------------------------------
   VESPER — muito alto e magro, rosto branco liso
   away -> approach (câmaras, por um lado) -> hall -> attacking
   No hall avança aos poucos quando NÃO estás virado para esse lado;
   se te virares para lá, congela (não precisa de luz para sentir).
   Para o expulsar: porta aberta + virado para ele + luz ligada
   durante ~1.5–2.5 s. Fechar a porta não o faz recuar: ele espera.
   --------------------------------------------------------- */

function updateVesper(v, dt) {
  switch (v.state) {
    case 'away': updateVesperAway(v, dt); break;
    case 'approach': updateVesperApproach(v, dt); break;
    case 'hall': updateVesperHall(v, dt); break;
    case 'attacking': updateVesperAttack(v, dt); break;
    default: break;
  }
}

// Longe, fora das câmaras: daqui a pouco escolhe um lado e aproxima-se
function updateVesperAway(v, dt) {
  v.awayTimer -= dt;
  if (v.awayTimer > 0) return;

  // Só numa aproximação nova pode escolher o outro lado
  const side = randomItem(SIDES);
  const first = v.settings.paths[side][0];
  if (isOccupied(first, v)) {
    v.awayTimer = randomBetween(1.5, 3);   // a primeira sala está ocupada: tenta daqui a pouco
    return;
  }
  v.side = side;
  v.pathIndex = 0;
  v.state = 'approach';
  v.stepTimer = randomBetween(CONFIG.vesper.camStepMin, CONFIG.vesper.camStepMax);
  moveVesperTo(v, first);
}

// Nas câmaras: avança sempre pelo mesmo lado. Visto nas câmaras, quase não se mexe.
function updateVesperApproach(v, dt) {
  const V = CONFIG.vesper;
  const slow = isBeingWatched(v) ? V.watchedCamSlow : 1;
  v.stepTimer -= dt * slow * (v.settings.speed || 1);
  if (v.stepTimer > 0) return;

  const path = v.settings.paths[v.side];
  const next = path[v.pathIndex + 1];

  if (isDoorPosition(next)) {
    // Entrar no hall é crítico: o Horror Director pode pedir para esperar
    if (!horrorDirector.claim('vesperHall', v.id, next)) {
      v.stepTimer = horrorDirector.waitLeft() + randomBetween(0.5, 1.5);
      return;
    }
    v.pathIndex++;
    enterVesperHall(v, next);
    return;
  }
  if (isOccupied(next, v)) {
    v.stepTimer = randomBetween(1, 2);     // caminho ocupado: espera um pouco
    return;
  }
  v.pathIndex++;
  v.stepTimer = randomBetween(V.camStepMin, V.camStepMax);
  moveVesperTo(v, next);
}

function moveVesperTo(v, newPosition) {
  const oldPosition = v.position;
  v.position = newPosition;
  if (camerasOpen && (selectedCamera === oldPosition || selectedCamera === newPosition)) {
    triggerInterference('monster');
  }
  emitGameEvent('monsterMoved', {
    monster: v,
    from: oldPosition,
    to: newPosition,
    side: sideOf(newPosition),
    distance: doorDistances[currentMapId()][newPosition]
  });
  renderMonsters();
}

function enterVesperHall(v, hall) {
  const V = CONFIG.vesper;
  v.state = 'hall';
  v.hallProgress = 0;
  v.frozen = lookDirection() === v.side;
  v.stage = 0;
  v.litShown = false;
  v.stepTimer = randomBetween(V.hallStepMin, V.hallStepMax);
  v.touchTimer = randomBetween(V.doorTouchMin, V.doorTouchMax);
  v.lightNeeded = randomBetween(V.lightNeedMin, V.lightNeedMax) * (v.settings.lightNeedScale || 1);
  vesperLightExposure = 0;
  moveVesperTo(v, hall);
  emitGameEvent('vesperEnterHall', { monster: v, side: v.side });
}

function updateVesperHall(v, dt) {
  const V = CONFIG.vesper;
  const side = v.side;
  const looked = lookDirection() === side;
  const doorShut = isSideDoorClosed(side);

  // Sente que está a ser observado: congela logo (mesmo no escuro)
  if (looked !== v.frozen) {
    v.frozen = looked;
    const cue = looked && elapsedSeconds - v.freezeCueTime > V.freezeCueCooldown;
    if (cue) v.freezeCueTime = elapsedSeconds;
    emitGameEvent('vesperFreeze', { monster: v, side, frozen: looked, cue });
    renderMonsters();
  }

  // A luz só o atinge com a porta aberta e contigo virado para ele
  const lit = looked && !doorShut && isSideLightOn(side);
  if (lit) {
    vesperLightExposure += dt;
    if (!v.litShown) {
      v.litShown = true;
      emitGameEvent('vesperLit', { monster: v, side });
    }
  } else {
    vesperLightExposure = Math.max(0, vesperLightExposure - V.lightDecay * dt);
  }
  const stage = getVesperStage(v);
  if (stage !== v.stage) {
    // a máscara a falhar sob a luz (só som e imagem: continua a recuar como sempre)
    if (stage > v.stage && stage >= 2) emitGameEvent('vesperDeform', { monster: v, side, stage });
    v.stage = stage;
    renderMonsters();
  }
  if (vesperLightExposure >= v.lightNeeded) {
    repelVesper(v);
    return;
  }

  if (looked) return;   // congelado

  if (v.hallProgress >= 1) {
    if (doorShut) {
      // Porta fechada: não entra, mas também não se vai embora. Toca, arranha, espera.
      v.touchTimer -= dt;
      if (v.touchTimer <= 0) {
        v.touchTimer = randomBetween(V.doorTouchMin, V.doorTouchMax);
        restartAnimation(panoEls[side].door, 'touch');
        emitGameEvent('vesperDoor', { monster: v, side });
      }
      return;
    }
    // Porta aberta e estás virado para outro lado: entra
    if (horrorDirector.claim('attack', v.id)) startVesperAttack(v);
    return;
  }

  v.stepTimer -= dt * (v.settings.speed || 1);
  if (v.stepTimer > 0) return;
  v.stepTimer = randomBetween(V.hallStepMin, V.hallStepMax);
  v.hallProgress = Math.min(1, v.hallProgress + randomBetween(V.hallStepSize[0], V.hallStepSize[1]));
  emitGameEvent('vesperStep', { monster: v, side, progress: v.hallProgress });
  renderMonsters();
}

// 0 = parado, 1 = inclina a cabeça, 2 = abre a boca devagar, 3 = contrai-se, irritado
function getVesperStage(v) {
  const k = vesperLightExposure / v.lightNeeded;
  if (k >= 0.7) return 3;
  if (k >= 0.4) return 2;
  if (k >= 0.08) return 1;
  return 0;
}

// Aguentou a luz o suficiente: interferência curta e desaparece pelo hall
function repelVesper(v) {
  const V = CONFIG.vesper;
  const side = v.side;
  horrorDirector.claim('vesperRepelled', v.id);   // um momento de folga antes do próximo evento crítico
  vesperLightExposure = 0;
  v.state = 'away';
  v.frozen = false;
  v.stage = 0;
  v.hallProgress = 0;
  v.awayTimer = randomBetween(V.awayMin, V.awayMax) * (v.settings.restScale || 1);
  const from = v.position;
  v.position = 'away';
  restartAnimation(panoEls[side].doorway, 'hall-glitch');
  later(450, () => panoEls[side].doorway.classList.remove('hall-glitch'));
  emitGameEvent('vesperRepelled', { monster: v, side, from });
  renderMonsters();
}

// Entrou: silêncio anormal, a cabeça vira sozinha... e ele já está ali
function startVesperAttack(v) {
  v.state = 'attacking';
  v.hallProgress = 1;
  v.attackTimer = CONFIG.vesper.lungeSeconds;
  closeCameras();
  panLockSide = v.side;
  emitGameEvent('preAttack', v);
  emitGameEvent('vesperLunge', { monster: v, side: v.side });
  renderMonsters();
}

function updateVesperAttack(v, dt) {
  v.attackTimer -= dt;
  if (v.attackTimer <= 0) loseGame(v.id);
}


/* ---------------------------------------------------------
   GRELHA DA VENT DA SALA (Night 4)
   Clica e mantém o rato carregado para a segurar.
   Na Night 5 há antes o VENT SEAL (ver CONTROLOS DA OFFICE PANORÂMICA).
   --------------------------------------------------------- */

function holdVent() {
  if (gameOver || !mapHasVents() || isPanoramic() || ventHeld) return;
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
  const rattling = Boolean(echo) && echo.state === 'atVent';
  ui.officeVent.classList.toggle('held', ventHeld);
  ui.officeVent.classList.toggle('rattling', rattling);
  ui.btnHoldVent.classList.toggle('is-active', ventHeld);
  ui.centerVent.classList.toggle('sealed', ventSealed);
  ui.centerVent.classList.toggle('rattling', rattling);
  ui.btnVentSeal.classList.toggle('is-active', ventSealed);
  setButtonLabel(ui.btnVentSeal, ventSealed ? 'VENT: CLOSED' : 'VENT: OPEN');
}

function bumpOfficeVent() {
  restartAnimation(isPanoramic() ? ui.centerVent : ui.officeVent, 'bump');
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
  const panoramic = isPanoramic();

  // Corredor: só com a LIGHT ligada e a porta aberta
  const corridorVisible = !panoramic && lightOn && !doorClosed && !powerOut;
  const near = corridorVisible ? active.filter((m) => m.position === 'door') : [];
  const far = corridorVisible ? active.filter((m) => m.position === nearDoor) : [];

  // Janela da porta: só com a LIGHT ligada e a porta fechada
  const slotVisible = !panoramic && lightOn && doorClosed && !powerOut;
  const inSlot = slotVisible ? active.filter((m) => m.position === 'door') : [];

  // Subject Zero pode corromper o feed desta câmara (zero.js): { show, hide, fake } (listas de ids)
  const view = camerasOpen && zeroHooks.cameraView ? zeroHooks.cameraView(selectedCamera) : null;

  for (const id of Object.keys(MONSTER_TYPES)) {
    const monster = monsters[id];
    const els = monsterEls[id];

    // Vesper nas câmaras: de pé, gigante (às vezes, raramente, rente ao chão); mais perto = a máscara já falha um pouco
    if (monster && id === 'vesper') {
      els.camera.dataset.form = vesperForm(monster);
      els.camera.dataset.near = doorDistances[mapId] && doorDistances[mapId][monster.position] <= 1 ? 'mid' : 'far';
    }
    // Black: a pose muda cada vez que muda de sítio (curvado / agachado / a rastejar) — só visual
    if (monster && id === 'black') {
      const pose = blackPoses(monster);
      els.camera.dataset.pose = pose.cam;
      els.corridor.dataset.pose = monster.position === 'door' ? 'close' : pose.far;
    }

    // Câmaras: só se vê o monstro que está na câmara que estás a ver (ou o que o feed falso mostra)
    const realHere = Boolean(monster) && monster.position === selectedCamera;
    const shown = view ? view.show.includes(id) || (realHere && !view.hide.includes(id)) : realHere;
    const onCamera = camerasOpen && shown;
    els.camera.classList.toggle('hidden', !onCamera);
    els.camera.classList.toggle('zero-fake', onCamera && Boolean(view) && view.fake.includes(id));
    if (onCamera) els.camera.dataset.spot = `${mapId}-${selectedCamera}`;

    // O Echo não aparece no corredor nem na janela da porta
    if (id === 'echo') {
      if (monster && onCamera) {
        els.camera.dataset.pose = getEchoPose(monster);
        els.camera.dataset.mood = getEchoMood(monster);
        els.camera.dataset.part = monster.part;
        // AI alta: animações um pouco mais rápidas (a leitura visual mantém-se)
        els.camera.style.setProperty('--e-rate', Math.min(1.6, monster.settings.approachSpeed || 1).toFixed(2));
      }
      continue;
    }
    // O Vesper só existe na office panorâmica (ver renderPanoHalls)
    if (!els.corridor) continue;

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

  if (panoramic) renderPanoHalls();
}

// Até três monstros à porta ao mesmo tempo: esquerda, direita, meio
const SIDE_CLASSES = ['side-left', 'side-right', 'side-center'];

// Vesper: a forma baixa ("ele conseguia fazer isso?") só nas câmaras, raramente; escolhida ao chegar
const VESPER_LOW_CHANCE = 0.14;
function vesperForm(monster) {
  if (monster.formAt !== monster.position) {
    monster.formAt = monster.position;
    monster.form = Math.random() < VESPER_LOW_CHANCE ? 'low' : 'tall';
  }
  return monster.form;
}

// Vesper no hall: a distância visual (a máscara começa a falhar quando se aproxima)
function vesperNear(monster) {
  if (monster.state === 'attacking') return 'close';
  if (monster.hallProgress >= 0.7) return 'close';
  if (monster.hallProgress >= 0.35) return 'mid';
  return 'far';
}

// Black: escolhe poses novas quando muda de sítio (não mexe na IA; só no desenho)
// cam = nas câmaras; far = ao fundo do corredor / hall. À porta é sempre 'close'.
function blackPoses(monster) {
  if (monster.poseAt !== monster.position) {
    monster.poseAt = monster.position;
    const r = Math.random();
    monster.camPose = r < 0.4 ? 'stand' : r < 0.75 ? 'crouch' : 'crawl';
    monster.farPose = Math.random() < 0.6 ? 'stand' : 'crouch';
  }
  return { cam: monster.camPose, far: monster.farPose };
}

// Muito raramente, com o Black mesmo à porta e a luz a acender: a frente da cabeça contrai-se,
// como se alguma coisa estivesse prestes a abrir (nada de boca à vista)
const BLACK_TWITCH_CHANCE = 0.12;
onGameEvent('lightOn', (data) => {
  const black = monsters.black;
  if (!black || gameOver || Math.random() >= BLACK_TWITCH_CHANCE) return;
  let el = null;
  if (data && data.side) {
    if (black.position === currentMap().halls[data.side].hall && !isSideDoorClosed(data.side)) el = panoEls[data.side].figures.black;
  } else if (black.position === 'door' && !doorClosed) {
    el = monsterEls.black.corridor;
  }
  if (!el) return;
  restartAnimation(el, 'b-twitch');
  later(700, () => el.classList.remove('b-twitch'));
  emitGameEvent('blackTwitch', { side: data && data.side });
});

// Office panorâmica: o que se vê em cada hall. Tal como na sala antiga,
// no escuro não se vê nada: só com a luz desse lado.
function renderPanoHalls() {
  const map = currentMap();
  const active = Object.values(monsters);
  const vesper = monsters.vesper;

  for (const side of SIDES) {
    const els = panoEls[side];
    const { hall, approach } = map.halls[side];
    const lit = isSideLightOn(side) && !powerOut;
    const open = !isSideDoorClosed(side);
    // Subject Zero (zero.js): falsa luz (por um instante o hall parece vazio) ou um Black falso
    const hv = zeroHooks.hallView ? zeroHooks.hallView(side) : null;
    const falseLight = Boolean(hv && hv.falseLight && lit);
    const hallVisible = lit && open && !falseLight;
    els.root.classList.toggle('false-light', falseLight);

    // Black, Watcher e Morrow: à porta (near) ou ao fundo, na câmara antes do hall (far)
    const near = hallVisible ? active.filter((m) => m.position === hall && m.id !== 'vesper') : [];
    const far = hallVisible ? active.filter((m) => m.position === approach && m.id !== 'echo') : [];
    const inSlot = lit && !open && !falseLight
      ? active.filter((m) => m.position === hall && (m.id !== 'vesper' || m.hallProgress >= 1))
      : [];
    // O Black falso só aparece se o verdadeiro não estiver ali (nunca esconde o verdadeiro)
    const fakeBlack = Boolean(hv && hv.fakeBlack && hallVisible) && !near.some((m) => m.id === 'black');

    for (const [id, el] of Object.entries(els.figures)) {
      const monster = monsters[id];
      el.classList.remove('near', 'far', 'in-hall', 'zero-fake', ...SIDE_CLASSES);
      if (id === 'black' && fakeBlack) {
        el.classList.add('near', 'zero-fake');
        el.dataset.pose = 'close';
        continue;
      }
      // Black no hall: à porta quase direito ('close'); ao fundo curvado ou agachado
      if (id === 'black' && monster) el.dataset.pose = monster.position === hall ? 'close' : blackPoses(monster).far;
      if (!monster) continue;
      if (id === 'vesper') {
        el.dataset.form = 'tall';                       // nos halls é sempre a silhueta altíssima
        el.dataset.near = monster.position === hall ? vesperNear(monster) : 'far';
      }
      if (id === 'vesper' && hallVisible && monster.position === hall) {
        el.classList.add('in-hall');
        el.style.setProperty('--p', monster.hallProgress.toFixed(3));
      } else if (near.includes(monster)) {
        el.classList.add('near');
        if (near.length > 1) el.classList.add(SIDE_CLASSES[near.indexOf(monster)]);
      } else if (far.includes(monster)) {
        el.classList.add('far');
        if (far.length > 1) el.classList.add(SIDE_CLASSES[far.indexOf(monster)]);
      }
      if (id === 'morrow') {
        el.dataset.pose = getMorrowPose(monster);
        el.dataset.mood = monster.state;
      }
    }

    for (const [id, el] of Object.entries(els.slots)) {
      const monster = monsters[id];
      el.classList.remove('visible', ...SIDE_CLASSES);
      if (monster && inSlot.includes(monster)) {
        el.classList.add('visible');
        if (inSlot.length > 1) el.classList.add(SIDE_CLASSES[inSlot.indexOf(monster)]);
      }
    }
  }

  // Vesper: a pose depende da luz (inclina a cabeça, abre a boca, contrai-se)
  const figures = [monsterEls.vesper.camera, panoEls.left.figures.vesper, panoEls.right.figures.vesper];
  for (const el of figures) {
    el.dataset.stage = vesper ? vesper.stage : 0;
    el.classList.toggle('frozen', Boolean(vesper) && vesper.frozen);
  }
}


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

  setButtonLabel(ui.btnDoor, doorClosed ? 'OPEN DOOR' : 'CLOSE DOOR');
  ui.btnDoor.classList.toggle('is-active', doorClosed);
  ui.btnLight.classList.toggle('is-active', lightOn);

  // Office panorâmica: cada lado tem a sua porta e a sua luz
  for (const side of SIDES) {
    const els = panoEls[side];
    const closed = isSideDoorClosed(side);
    const lit = isSideLightOn(side);
    els.root.classList.toggle('closed', closed);
    els.root.classList.toggle('lit', lit);
    setButtonLabel(els.btnDoor, closed ? 'OPEN' : 'DOOR');
    els.btnDoor.classList.toggle('is-active', closed);
    els.btnLight.classList.toggle('is-active', lit);
  }
  renderOfficeVent();
}


/* ---------------------------------------------------------
   CONTROLOS DA OFFICE PANORÂMICA (Night 5+)
   LEFT DOOR / LEFT LIGHT, RIGHT DOOR / RIGHT LIGHT e VENT SEAL.
   Cada lado funciona sozinho. Tudo com o rato.
   --------------------------------------------------------- */

function toggleSideDoor(side) {
  if (gameOver || powerOut || !isPanoramic()) return;
  if (controlLatched(side === 'left' ? 'doorLeft' : 'doorRight')) return;
  if (side === 'left') leftDoorClosed = !leftDoorClosed;
  else rightDoorClosed = !rightDoorClosed;
  const closed = isSideDoorClosed(side);
  makeNoise(closed ? 'doorClose' : 'doorOpen');
  renderControls();
  renderPower();
  renderMonsters();
  emitGameEvent(closed ? 'doorClosed' : 'doorOpened', { side });
}

function toggleSideLight(side) {
  if (gameOver || powerOut || !isPanoramic()) return;
  if (controlLatched(side === 'left' ? 'lightLeft' : 'lightRight')) return;
  if (side === 'left') leftLightOn = !leftLightOn;
  else rightLightOn = !rightLightOn;
  const lit = isSideLightOn(side);
  makeNoise(lit ? 'lightOn' : 'lightOff');
  renderControls();
  renderPower();
  renderMonsters();
  emitGameEvent(lit ? 'lightOn' : 'lightOff', { side });
}

// VENT SEAL: persiana metálica da vent central. Fechada gasta muita energia.
function toggleVentSeal() {
  if (gameOver || powerOut || !isPanoramic()) return;
  if (controlLatched('ventSeal')) return;
  ventSealed = !ventSealed;
  makeNoise(ventSealed ? 'ventSealClose' : 'ventSealOpen');
  renderControls();
  renderPower();
  emitGameEvent(ventSealed ? 'ventSealClosed' : 'ventSealOpened');
}


/* ---------------------------------------------------------
   CÂMARAS
   --------------------------------------------------------- */

// Mostra as câmaras e o mapa da noite atual
function setupMapForNight() {
  const mapId = currentMapId();
  ui.game.classList.remove(...Object.keys(MAPS).map((id) => `map-${id}`));
  ui.game.classList.add(`map-${mapId}`);
  ui.game.classList.toggle('office-pano', isPanoramic());   // Night 5+: sala panorâmica
  ui.sceneSets.forEach((set) => set.classList.toggle('active', set.dataset.map === mapId));
  ui.netToggle.classList.toggle('hidden', !mapHasVents());
  renderCamMap();
  renderShortcutHints();
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
  if (controlLatched('cameras')) return;
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
  renderCamLabel();
  ui.camScreen.dataset.view = `${mapId}-${camId}`;   // para o CSS saber que sala é (escuridão, cor)

  renderMonsters();
  triggerInterference();
}

// Nome da câmara no ecrã. O Subject Zero pode trocá-lo por instantes (o mapa continua certo).
function renderCamLabel() {
  const shown = zeroHooks.labelFor ? zeroHooks.labelFor(selectedCamera) : selectedCamera;
  ui.camLabel.textContent = `${camLabel(shown)} — ${currentMap().cameras[shown]}`;
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
  // Pode não haver ninguém para atacar no escuro (Custom Night só com Echo / Vesper / Zero, ou vazia)
  powerOutAttacker = randomItem(Object.keys(monsters).filter((id) => !MONSTER_TYPES[id].noPowerOutAttack)) || null;
  releaseVent();
  powerOutEyesShown = false;
  powerOutSilence = false;

  closeCameras();
  emitGameEvent('powerOut');
  if (doorClosed) emitGameEvent('doorOpened');
  doorClosed = false;      // a porta abre sozinha
  lightOn = false;         // a luz deixa de funcionar
  ui.powerOutEyes.dataset.monster = powerOutAttacker || 'none';

  // Office panorâmica: as duas portas abrem, as luzes apagam e o VENT SEAL solta-se.
  // Os olhos aparecem num dos halls (tens de te virar para os ver).
  for (const side of SIDES) {
    if (isSideDoorClosed(side)) emitGameEvent('doorOpened', { side });
  }
  leftDoorClosed = rightDoorClosed = false;
  leftLightOn = rightLightOn = false;
  ventSealed = false;
  const eyesSide = randomItem(SIDES);
  for (const side of SIDES) {
    panoEls[side].root.classList.toggle('eyes-here', side === eyesSide && Boolean(powerOutAttacker));
    panoEls[side].eyes.dataset.monster = powerOutAttacker || 'none';
  }
  ui.game.classList.add('power-out');

  renderControls();
  renderPower();
  renderMonsters();
}

function updatePowerOut(dt) {
  if (!powerOut || !powerOutAttacker) return;   // ninguém para atacar: só escuro até às 6
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

// Quem apanhou o jogador: um monstro canónico ou uma Anomaly da Custom Night (anomalies.js)
function killerType(id) {
  return MONSTER_TYPES[id] || (anomalyHooks.types && anomalyHooks.types[id]) || { name: String(id).toUpperCase() };
}

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

  const killer = killerType(monsterId);
  later(killer.jumpscareMs || 1600, () => {
    hide(ui.jumpscare);
    ui.loseTitle.textContent = `CAUGHT BY ${killer.name}`;
    show(ui.loseScreen);
    emitGameEvent('loseScreen', { monsterId });   // o Journal usa isto para avisar de uma entrada nova
  });
}

function winGame() {
  if (gameOver) return;
  gameOver = true;
  stopLoop();
  closeCameras();

  releaseVent();

  // Ganhar uma noite desbloqueia a seguinte (Night 1 -> 2 -> 3 -> 4 -> 5)
  const nextNight = currentNight + 1;
  const justUnlocked = unlockNight(nextNight);

  ui.btnNextNight.classList.toggle('hidden', !(NIGHTS[nextNight] && isNightUnlocked(nextNight)));
  ui.unlockNote.textContent = `NIGHT ${nextNight} UNLOCKED`;
  ui.unlockNote.classList.toggle('hidden', !justUnlocked);
  renderMenu();

  // Primeira vez que se acaba esta noite: pode haver uma cutscene de transição (cutscenes.js).
  // quiet = sem o "6:00 AM" de vitória (a cutscene começa logo, em silêncio).
  const transition = cutsceneAfterWin ? cutsceneAfterWin(currentNight) : null;
  if (transition && transition.quiet) {
    transition.play();
    return;
  }

  hide(ui.winMessage);
  show(ui.winScreen);
  emitGameEvent('nightWon', { night: currentNight });
  later(2200, () => (transition ? transition.play() : show(ui.winMessage)));
}

// Depois de uma cutscene de transição: o ecrã de vitória com NEXT NIGHT / PLAY AGAIN / MENU
function showWinMessage() {
  show(ui.winScreen);
  show(ui.winMessage);
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

// Antes de uma noite pode tocar uma cutscene (intro.js, cutscenes.js). Cada função
// recebe a noite e devolve true se tratou do início (a cutscene chama startNight no fim).
const cutsceneBeforeNightHooks = [];

// Depois de ganhar uma noite (cutscenes.js): recebe a noite e devolve
// null ou { quiet, play() } se houver uma cutscene de transição por ver.
let cutsceneAfterWin = null;

// O que os botões NIGHT do menu (e NEXT NIGHT) chamam
function requestNight(night) {
  if (!NIGHTS[night] || !isNightUnlocked(night)) return;
  if (cutsceneBeforeNightHooks.some((hook) => hook(night))) return;
  startNight(night);
}

// Mostra "NIGHT X" e depois começa a noite
function startNight(night) {
  if (!NIGHTS[night] || !isNightUnlocked(night)) return;
  audioManager.unlock();
  resetGame(night);

  ui.introNight.textContent = nightTitle(night);
  ui.introSector.textContent = LORE.sectors[night] || '';   // que parte da instalação ficou acessível
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
  { kind: 'ambience', input: $('vol-ambience'), label: $('vol-ambience-value') },
  { kind: 'voice', input: $('vol-voice'), label: $('vol-voice-value') }       // voice acting (voice.js)
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
  // Ao largar o slider dos efeitos (ou da voz), um pequeno som para ouvir o volume
  slider.input.addEventListener('change', () => {
    if (slider.kind === 'voice') voiceManager.staticBurst(0.25, 0.08);   // estática de telefone, no canal da voz
    else if (slider.kind !== 'ambience') emitGameEvent('uiClick');
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
  clearEchoVisualCues();

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
  noiseStreak = { count: 0, last: -Infinity };
  ventHeld = false;
  // Office panorâmica: tudo aberto, luzes apagadas, a olhar em frente
  leftDoorClosed = rightDoorClosed = false;
  leftLightOn = rightLightOn = false;
  ventSealed = false;
  officePan = targetOfficePan = 0;
  panLockSide = null;
  keyLookTarget = null;
  lastPanApplied = null;
  vesperLightExposure = 0;
  overtime = null;
  horrorDirector.reset(night);
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
  // Vesper: começa longe, fora das câmaras
  if (monsters.vesper) {
    const vesper = monsters.vesper;
    vesper.state = 'away';
    vesper.position = 'away';
    vesper.awayTimer = randomBetween(CONFIG.vesper.firstMin, CONFIG.vesper.firstMax);
  }
  // Subject Zero: corrupções, verify, purge, eventos da Night 6 (zero.js) voltam ao início
  if (zeroHooks.reset) zeroHooks.reset(night);

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
  ui.centerVent.classList.remove('sealed', 'rattling', 'bump');
  for (const side of SIDES) {
    panoEls[side].door.classList.remove('thud', 'breaching', 'touch');
    panoEls[side].doorway.classList.remove('hall-glitch');
    panoEls[side].root.classList.remove('eyes-here');
  }
  ui.nightLabel.textContent = nightTitle(night);
  // Custom Night: Anomalies (anomalies.js) — nas Nights 1–6 não fazem nada
  if (anomalyHooks.reset) anomalyHooks.reset(night);

  setupMapForNight();
  renderOfficePan();
  updateClock();
  renderPower();
  renderControls();
  renderMonsters();
  renderWatcherStare(0);
}


/* ---------------------------------------------------------
   ATALHOS DE TECLADO (opcionais)
   O jogo continua 100% jogável só com o rato: as teclas fazem
   exatamente o mesmo que clicar nos botões.
   Nights 1–4: C câmaras, L luz, D porta, V (segurar) grelha da vent
   Night 5+:   A / S / D olhar esquerda / centro / direita
               Q luz esq., W VENT SEAL, E luz dir.
               Z porta esq., X câmaras, C porta dir.
   Night 6:    V SIGNAL VERIFY, F (segurar) PURGE SIGNAL
   ESC fecha as câmaras e os menus secundários (nunca sai do jogo).
   --------------------------------------------------------- */

const toggleCameras = () => (camerasOpen ? closeCameras() : openCameras());

// tecla -> ação (cada lista é para um tipo de sala)
const SHORTCUTS = {
  classic: {
    KeyC: toggleCameras,
    KeyL: toggleLight,
    KeyD: toggleDoor
  },
  panoramic: {
    KeyA: () => lookWithKey(-1),
    KeyS: () => lookWithKey(0),
    KeyD: () => lookWithKey(1),
    KeyQ: () => toggleSideLight('left'),
    KeyW: toggleVentSeal,
    KeyE: () => toggleSideLight('right'),
    KeyZ: () => toggleSideDoor('left'),
    KeyX: toggleCameras,
    KeyC: () => toggleSideDoor('right'),
    KeyV: () => verifySignal()            // Night 6: SIGNAL VERIFY (zero.js)
  }
};

// Teclas de "segurar": carregar = agarrar, largar = soltar (como o rato)
const HOLD_SHORTCUTS = {
  classic: { KeyV: [holdVent, releaseVent] },
  panoramic: { KeyF: [() => setPurgeHold(true), () => setPurgeHold(false)] }   // Night 6: PURGE SIGNAL (zero.js)
};

function isTypingIn(target) {
  return Boolean(target) && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

// Só durante a noite: nunca no menu, no Journal, nas opções ou depois do fim
function shortcutsAllowed(event) {
  if (gameOver || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isTypingIn(event.target)) return false;
  return ui.optionsScreen.classList.contains('hidden');
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    // ESC: fecha o que estiver aberto por cima (o Journal trata do seu próprio ESC)
    if (!ui.optionsScreen.classList.contains('hidden')) { hideOptions(); return; }
    if (!gameOver && camerasOpen) closeCameras();
    return;
  }
  if (!shortcutsAllowed(event)) return;
  const mode = isPanoramic() ? 'panoramic' : 'classic';
  const hold = HOLD_SHORTCUTS[mode][event.code];
  const action = SHORTCUTS[mode][event.code];
  if (!hold && !action) return;
  event.preventDefault();
  if (event.repeat) return;              // manter a tecla carregada não alterna dezenas de vezes
  if (hold) hold[0]();
  else action();
});

document.addEventListener('keyup', (event) => {
  const mode = isPanoramic() ? 'panoramic' : 'classic';
  const hold = HOLD_SHORTCUTS[mode][event.code];
  if (hold) hold[1]();
});

/* ----- Dicas das teclas nos botões (discretas; podem ser escondidas nas opções) ----- */

// O texto do botão fica num <span class="btn-label"> para a dica não se perder ao mudar o texto
function setButtonLabel(button, text) {
  (button.querySelector('.btn-label') || button).textContent = text;
}

function addKeyHint(el, key) {
  if (!el.querySelector('.btn-label') && el.tagName === 'BUTTON') {
    const label = document.createElement('span');
    label.className = 'btn-label';
    label.textContent = el.textContent;
    el.textContent = '';
    el.appendChild(label);
  }
  const hint = document.createElement('span');
  hint.className = 'key-hint';
  hint.textContent = key;
  el.appendChild(hint);
  return hint;
}

[
  [ui.btnDoor, 'D'], [ui.btnLight, 'L'], [ui.btnCameras, 'C'], [ui.btnHoldVent, 'V'],
  [panoEls.left.btnLight, 'Q'], [ui.btnVentSeal, 'W'], [panoEls.right.btnLight, 'E'],
  [panoEls.left.btnDoor, 'Z'], [ui.btnCamerasPano, 'X'], [panoEls.right.btnDoor, 'C'],
  [panoEls.left.root.querySelector('.hall-sign'), 'A'],
  [document.querySelector('.cv-label'), 'S'],
  [panoEls.right.root.querySelector('.hall-sign'), 'D']
].forEach(([el, key]) => addKeyHint(el, key));

// O botão CLOSE das câmaras usa a mesma tecla que as abriu (C nas Nights 1–4, X na Night 5)
const closeCamsHint = addKeyHint(ui.btnCloseCams, 'C');

function renderShortcutHints() {
  closeCamsHint.textContent = isPanoramic() ? 'X' : 'C';
}

/* ----- Opção SHOW SHORTCUT HINTS (guardada no browser) ----- */

const HINTS_KEY = 'securityGuard.showShortcutHints';
let showShortcutHints = true;
try {
  showShortcutHints = localStorage.getItem(HINTS_KEY) !== 'false';   // por defeito: ON
} catch (error) {
  // sem localStorage: fica ON só nesta sessão
}

function renderHintsOption() {
  ui.game.classList.toggle('hints-off', !showShortcutHints);
  ui.btnHints.textContent = showShortcutHints ? 'ON' : 'OFF';
  ui.btnHints.classList.toggle('is-active', showShortcutHints);
}

function toggleShortcutHints() {
  showShortcutHints = !showShortcutHints;
  try {
    localStorage.setItem(HINTS_KEY, String(showShortcutHints));
  } catch (error) { /* ignorar */ }
  renderHintsOption();
}

ui.btnHints.addEventListener('click', toggleShortcutHints);
renderHintsOption();

/* ----- Atalhos de admin (só no menu principal) -----
   ↑ ↑ ↓ ↓ ← ↓ ↑ →   apagar o progresso
   ↑ ↑ ↑ ↑ ←         desbloquear todas as Nights (1–6) e a Custom Night  */

const ADMIN_RESET_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const ADMIN_UNLOCK_CODE = ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft'];
let adminKeys = [];
let adminNoteTimer = null;

// Desbloqueia todas as Nights (guardado como se tivessem sido ganhas) e a Custom Night.
// Não marca a campanha como completa nem mexe no Journal.
function unlockAllNights() {
  Object.keys(NIGHTS).map(Number).filter((night) => night > 1).forEach((night) => unlockNight(night));
  unlockCustomNight();
  renderMenu();
}

function showAdminNote(text) {
  ui.adminNote.textContent = text;
  show(ui.adminNote);
  clearTimeout(adminNoteTimer);
  adminNoteTimer = setTimeout(() => hide(ui.adminNote), 2500);
}

// A sequência acabou de ser escrita? (compara com as últimas teclas)
function adminCodeTyped(code) {
  return adminKeys.slice(-code.length).join() === code.join();
}

document.addEventListener('keydown', (event) => {
  if (event.repeat || isTypingIn(event.target) || ui.startScreen.classList.contains('hidden')) return;
  adminKeys.push(event.key);
  if (adminKeys.length > ADMIN_RESET_CODE.length) adminKeys.shift();
  if (adminCodeTyped(ADMIN_RESET_CODE)) {
    adminKeys = [];
    resetSaveData();
    emitGameEvent('uiClick');
    showAdminNote('SAVE DATA RESET');
  } else if (adminCodeTyped(ADMIN_UNLOCK_CODE)) {
    adminKeys = [];
    unlockAllNights();
    emitGameEvent('uiClick');
    showAdminNote('ALL NIGHTS UNLOCKED');
  }
});


/* ---------------------------------------------------------
   CLIQUES
   --------------------------------------------------------- */

ui.btnDoor.addEventListener('click', toggleDoor);
ui.btnLight.addEventListener('click', toggleLight);
ui.btnCameras.addEventListener('click', openCameras);
ui.btnCloseCams.addEventListener('click', closeCameras);

// Office panorâmica (Night 5+)
for (const side of SIDES) {
  panoEls[side].btnDoor.addEventListener('click', () => toggleSideDoor(side));
  panoEls[side].btnLight.addEventListener('click', () => toggleSideLight(side));
}
ui.btnVentSeal.addEventListener('click', toggleVentSeal);
ui.btnCamerasPano.addEventListener('click', openCameras);

ui.camButtons.forEach((button) => {
  button.addEventListener('click', () => switchCamera(button.dataset.cam));
});

ui.nightButtons.forEach((button) => {
  button.addEventListener('click', () => requestNight(Number(button.dataset.night)));
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
ui.btnNextNight.addEventListener('click', () => requestNight(currentNight + 1));
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
