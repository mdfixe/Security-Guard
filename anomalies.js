'use strict';

/* =========================================================
   SECURITY GUARD — ANOMALIES (só na Custom Night)

   Entidades NÃO-CANÓNICAS: não fazem parte do Project VEIL, da
   campanha, das Nights 1–6, das cutscenes, do Journal nem dos
   Archives. Só existem na Custom Night (NIGHTS.custom.customAnomalies).

   - HUSH ..... desce do teto. Reage ao MOVIMENTO (rato, vista, cliques,
                teclas). Fica imóvel ~3 s e ele recolhe-se.
   - KNOCKER .. três pancadas (LEFT / CENTER / RIGHT). Repete a ordem
                batendo nas estruturas da office (sem barulho para o Echo).
   - LATCH .... agarra-se a um controlo e encrava-o. Arrasta-o para o
                MAINTENANCE SLOT da secretária.
   - LUMEN .... atraído pela LUZ dos halls (lumenInterest, invisível).
                Quando aparece: TODAS as luzes apagadas uns segundos.

   Cada uma é OFF / ON: dificuldade fixa (ANOMALY), sem AI LEVEL.
   Os tempos estão em SEGUNDOS REAIS (não aceleram com CONFIG.speed):
   são janelas de reação do jogador.

   HorrorDirector (anomalyHooks.denyClaim / threats):
   - HUSH CRITICAL ..... enquanto exige imobilidade, nenhum monstro começa
                         nada (nem chega à porta, nem ataca). Só começa sem
                         ameaças ativas e sem as outras Anomalies a pedir ação.
   - KNOCKER RESPONSE .. durante a sequência / resposta não começam ameaças novas.
   - LATCH CRITICAL .... nunca se agarra ao único counter de uma ameaça ativa;
                         ninguém chega a uma porta (aberta) que ele encravou, e o
                         Echo não vai à grelha com o VENT SEAL encravado.
   - LUMEN CRITICAL .... enquanto exige escuridão, o Vesper não entra num hall.
   HUSH e KNOCKER nunca se sobrepõem (ficar imóvel vs. clicar).
   ========================================================= */

const ANOMALY_IDS = ['hush', 'knocker', 'latch', 'lumen'];

// Ficha de cada Anomaly (ANOMALY FILE na Custom Night). Sem lore canónica.
const ANOMALY_INFO = {
  hush: {
    name: 'HUSH',
    code: 'AF-01',
    bonus: 2000,
    desc: 'Lowers itself from the ceiling on a body far too long. Many thin hands keep its face covered.',
    mechanic: 'When it descends the office goes quiet and a thin tone rises. It reacts to movement: the cursor, the view, every click and key. A small twitch is tolerated. Deliberate movement is not.',
    survival: 'STOP. Do not move the mouse, do not click, do not turn. Stay still for about three seconds and it withdraws.'
  },
  knocker: {
    name: 'KNOCKER',
    code: 'AF-02',
    bonus: 2000,
    desc: 'Something small and curled lives inside the walls. Only its three long arms are ever seen: huge hands, joints that bend too far, no face.',
    mechanic: 'The room goes quiet. Three knocks follow, each from LEFT, CENTER or RIGHT. The knocked structure shakes, so the sequence can be read without sound.',
    survival: 'Knock back in the same order on the WEST HALL frame, the CENTER VENT and the EAST HALL frame. These knocks make no noise. Wrong order or silence: it reaches in.'
  },
  latch: {
    name: 'LATCH',
    code: 'AF-03',
    bonus: 3000,
    desc: 'A small knot of fingers, cable and tissue. Eight finger-legs, wires trailing from its back, a mouth underneath.',
    mechanic: 'Wraps itself around one control (a door, a light, the vent seal, the cameras or a verify button) and jams it. Left alone it chews the wiring, drains power, damages the control and then jumps.',
    survival: 'Click and hold it, then drag it into the MAINTENANCE SLOT on the desk. It pulls back toward the control while you carry it.'
  },
  lumen: {
    name: 'LUMEN',
    code: 'AF-04',
    bonus: 2000,
    desc: 'An experimental moth the size of a person. Torn, translucent wings; filament bulbs where eyes should be. Wings closed, it looks like someone hanging from the ceiling.',
    mechanic: 'Drawn to the hall lights. Short flashes are almost safe. Long or repeated light brings shadows and wingbeats, then the thing itself, clinging near the lamp.',
    survival: 'When it appears, turn ALL lights off and keep them off for a few seconds. Lighting it up again makes it open its wings. Doors do not stop it.'
  }
};

// Afinação fixa (segundos reais). Ver o teste "anom" e o bot de fairness.
const ANOMALY = {
  hush: {
    first: [22, 34],         // primeira descida
    every: [30, 44],         // entre descidas
    retry: 1.5,              // não pôde descer agora (HorrorDirector): tenta daqui a pouco
    descend: 1.2,            // aviso: o som baixa, o tom agudo, a sombra — ainda podes acabar o gesto
    still: [2.6, 3.6],       // imobilidade necessária
    tolerance: 0.03,         // movimento acumulado ignorado (fração da largura do ecrã ~ 38 px a 1280)
    leak: 0.05,              // ...que se "esquece" a este ritmo por segundo (tremores do rato)
    leave: 0.9,
    morrowMargin: 1.0        // segundos extra na previsão da raiva do Morrow
  },
  knocker: {
    first: [28, 40],
    every: [34, 48],
    retry: 1.5,
    lead: 0.9,               // os sons baixam antes da primeira pancada
    gap: 0.8,                // entre pancadas
    after: 0.4,              // depois da última: começa a resposta
    answer: 5.5,             // tempo para responder (4–6 s)
    maxThreats: 1,           // só começa com no máximo uma ameaça canónica ativa
    hand2: 0.55,             // errou: a segunda mão
    punish: 1.25             // ...e o ataque
  },
  latch: {
    first: [14, 24],
    every: [20, 32],         // depois de o deitares fora
    retry: 2,
    wires: 6,                // começa a roer os fios (consumo extra, faíscas)
    damage: 11,              // danifica o controlo (depois de o tirares, o controlo reinicia)
    attack: 16,              // salta
    vanish: 0.75,            // "saiu"... e depois o susto
    reboot: 2.2,             // controlo danificado: segundos até voltar a funcionar
    extraDrain: 0.12,        // energia por segundo de jogo enquanto rói os fios
    pull: 0.09,              // a tentar voltar ao controlo enquanto o seguras (larguras de ecrã / s)
    maxOffset: 0.14,
    reattach: 0.035,         // chegou ao controlo: agarra-se outra vez
    chuteMargin: 0.025,
    morrowSafe: 45           // não encrava as câmaras com o Morrow acima disto
  },
  lumen: {
    jolt: 4.5,               // cada vez que acendes uma luz
    rate: 14,                // por segundo, por luz acesa (depois do aquecimento)
    warm: 0.8,               // os primeiros segundos de luz contam pouco (flashes curtos: quase seguros)
    warmFactor: 0.3,
    decay: 4.5,              // tudo apagado: o interesse desce
    cueAt: 30,               // sombras, asas, insetos, a lâmpada a vibrar
    uncueAt: 22,
    appearAt: 60,            // aparece agarrado perto da lâmpada (LUMEN CRITICAL)
    presentHold: 2.4,        // presente e com luz acesa: abre as asas
    attackHold: 1.2,         // asas abertas e luz acesa: ataca
    dark: [2.2, 3.2],        // escuridão necessária para ele perder o interesse
    flaredExtra: 0.8,
    leaveTo: 12,
    rest: [6, 10]            // depois de ir embora: o interesse sobe a metade
  }
};

// Sustos (o game.js usa isto no CAUGHT BY ... e na duração do jumpscare)
anomalyHooks.types = {
  hush: { name: 'HUSH', jumpscareMs: 2400 },
  knocker: { name: 'KNOCKER', jumpscareMs: 2200 },
  latch: { name: 'LATCH', jumpscareMs: 1900 },
  lumen: { name: 'LUMEN', jumpscareMs: 2300 }
};

const randomIn = ([min, max]) => randomBetween(min, max);


/* ---------------------------------------------------------
   DESENHOS (SVG gerado aqui; o mesmo desenho no jogo, no
   ANOMALY FILE e no jumpscare). Sem imagens externas.
   --------------------------------------------------------- */

// HUSH: pendurado do teto; corpo/tronco finíssimo, sem pernas, seis braços com as mãos na cara
function hushArmMarkup() {
  // Cada mão: palma pequena e quatro dedos compridíssimos que atravessam a cara toda
  const arm = (n, upper, elbow, fore, palm, fingers, wrist) => `
    <g class="hu-arm hu-a${n}">
      <path class="hu-limb" d="${upper}"/>
      <g class="hu-fa">
        <path class="hu-limb hu-fore" d="${fore}"/>
        <path class="hu-finger-dk" d="${fingers}"/>
        <path class="hu-palm" d="${palm}"/>
        <path class="hu-finger" d="${fingers}"/>
        <circle class="hu-joint" cx="${wrist[0]}" cy="${wrist[1]}" r="1.8"/>
      </g>
      <circle class="hu-joint" cx="${elbow[0]}" cy="${elbow[1]}" r="2.4"/>
    </g>`;
  return arm(3, 'M94 234 C76 258 54 296 46 330', [46, 330], 'M46 330 C58 330 70 328 80 324',
      'M78 318 C86 315 95 316 100 319 C98 327 90 330 80 330 Z',
      'M99 317 C107 314 116 314 124 316 M100 321 C108 321 117 322 125 325 M98 325 C106 328 112 331 118 336 M93 328 C98 334 102 338 106 342', [80, 324])
    + arm(2, 'M91 233 C70 246 46 262 34 290', [34, 290], 'M34 290 C48 296 62 298 78 296',
      'M76 290 C84 286 94 287 100 291 C98 299 90 303 78 302 Z',
      'M99 289 C108 285 118 284 129 286 M100 293 C110 291 120 292 130 295 M99 297 C109 299 118 301 128 305 M95 301 C103 306 111 310 118 315', [78, 296])
    + arm(1, 'M89 231 C74 233 56 238 42 250', [42, 250], 'M42 250 C54 258 66 264 76 266',
      'M74 260 C82 256 92 257 98 261 C96 269 88 273 76 272 Z',
      'M97 259 C106 255 116 254 127 256 M98 263 C108 261 118 261 129 263 M97 267 C107 268 117 269 127 272 M94 271 C102 275 110 278 118 282', [76, 266]);
}

function hushSVG() {
  return `<svg class="hu-svg" viewBox="0 0 200 440" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
  <g class="hu-sway">
    <path class="hu-cord" d="M98 0 C97 40 99.5 80 98 118 L102 118 C100.5 80 103 40 102 0 Z"/>
    <path class="hu-torso" d="M97.5 116 C95 150 92.5 178 93 200 C93.4 214 95.5 222 96.5 230 L103.5 230 C104.5 222 106.6 214 107 200 C107.5 178 105 150 102.5 116 Z"/>
    <path class="hu-spine" d="M100 120 L100 228"/>
    <path class="hu-rib" d="M94.2 170 Q100 174 105.8 170 M93.6 180 Q100 185 106.4 180 M93.4 190 Q100 195 106.6 190 M93.8 200 Q100 205 106.2 200"/>
    <path class="hu-shoulders" d="M86 233 C90 226 110 226 114 233 C110 237 90 237 86 233 Z"/>
    <g class="hu-headg">
      <path class="hu-neck" d="M96.5 228 C96 236 95.5 242 95 250 L105 250 C104.5 242 104 236 103.5 228 Z"/>
      <path class="hu-head" d="M100 246 C117 246 125 264 125 292 C125 320 114 340 100 342 C86 340 75 320 75 292 C75 264 83 246 100 246 Z"/>
      <path class="hu-shade" d="M110 250 C122 260 127 290 122 318 C118 332 108 341 100 342 C112 328 118 296 110 250 Z M90 250 C80 262 76 284 78 304 C80 290 84 266 90 250 Z"/>
      <path class="hu-sheen" d="M92 262 C96 257 104 257 108 262 C104 296 96 296 92 262 Z"/>
      <g class="hu-cavity">
        <path class="hu-rim" d="M100 272 C107 282 109 304 100 324 C91 304 93 282 100 272 Z"/>
        <path class="hu-hole" d="M100 279 C104.5 289 105.5 304 100 317 C94.5 304 95.5 289 100 279 Z"/>
      </g>
    </g>
    <g class="hu-side">${hushArmMarkup()}</g>
    <g class="hu-side hu-mirror" transform="matrix(-1 0 0 1 200 3)">${hushArmMarkup()}</g>
  </g>
</svg>`;
}

// KNOCKER: um braço comprido (três segmentos, articulações enormes) e uma mão grande de dedos dobrados
function knockerArmMarkup() {
  return `
    <path class="kn-skin" d="M0 58 C40 54 82 50 112 50 C120 50 128 55 129 62 C129 69 121 72 112 72 C82 73 40 78 0 84 Z"/>
    <path class="kn-skin" d="M118 55 C152 60 190 68 216 72 C224 73 230 79 228 86 C225 91 216 90 209 89 C178 84 148 77 116 70 Z"/>
    <path class="kn-skin" d="M218 76 C232 71 245 66 257 61 L263 75 C251 79 238 84 224 89 Z"/>
    <circle class="kn-joint" cx="120" cy="61" r="11"/>
    <circle class="kn-joint" cx="221" cy="81" r="8.5"/>
    <path class="kn-crease" d="M113 52 Q117 61 113 70 M127 52 Q123 61 127 70 M215 74 Q218 81 215 88 M227 75 Q224 81 227 88 M40 63 Q60 61 80 60 M150 67 Q175 72 200 77"/>
    <path class="kn-skin" d="M254 55 C267 48 285 48 296 55 C303 60 303 73 296 79 C285 86 267 86 256 81 C250 72 250 62 254 55 Z"/>
    <g class="kn-fingers">
      <path class="kn-finger" d="M293 55 L308 48 L320 58 L317 73"/>
      <path class="kn-finger" d="M298 63 L315 61 L324 74 L318 89"/>
      <path class="kn-finger" d="M296 72 L311 77 L315 92 L307 104"/>
      <path class="kn-finger" d="M287 80 L298 91 L298 106 L290 115"/>
      <path class="kn-finger" d="M268 52 L276 40 L291 37"/>
    </g>
    <g class="kn-knuckle">
      <circle cx="308" cy="48" r="3.6"/><circle cx="320" cy="58" r="3.2"/><circle cx="315" cy="61" r="3.6"/>
      <circle cx="324" cy="74" r="3.2"/><circle cx="311" cy="77" r="3.6"/><circle cx="315" cy="92" r="3.2"/>
      <circle cx="298" cy="91" r="3.6"/><circle cx="298" cy="106" r="3.2"/><circle cx="276" cy="40" r="3.4"/>
    </g>
    <path class="kn-nail" d="M317 73 L315 79 M318 89 L315 95 M307 104 L303 109 M290 115 L285 118 M291 37 L297 36"/>`;
}

function knockerArmSVG() {
  return `<svg class="kn-arm" viewBox="0 0 330 130" aria-hidden="true">${knockerArmMarkup()}</svg>`;
}

// O corpo: pequeno, curvado, sem cara (só aparece no ANOMALY FILE e um instante no susto)
function knockerBodyMarkup() {
  return `
    <path class="kn-body" d="M60 140 C50 100 70 60 110 54 C150 50 176 76 178 110 C180 140 160 162 130 166 C100 170 70 168 60 140 Z"/>
    <path class="kn-ridge" d="M78 72 L83 61 L90 70 M100 59 L105 48 L111 58 M123 57 L129 47 L134 58 M146 66 L153 57 L157 68 M164 84 L172 78 L173 90"/>
    <path class="kn-crease" d="M74 128 Q88 148 116 156 M150 76 Q166 94 168 122 M98 80 Q108 98 102 118 M128 70 Q132 84 126 96"/>`;
}

// O ANOMALY FILE: um buraco na parede, o corpo enrolado lá dentro e os três braços a sair
function knockerFullSVG() {
  const arm = (x, y, angle, s) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s}) translate(0 -70)">${knockerArmMarkup()}</g>`;
  return `<svg class="kn-full" viewBox="0 0 320 320" aria-hidden="true">
    <path class="kn-wall" d="M0 0 H320 V320 H0 Z"/>
    <path class="kn-panel" d="M0 58 H320 M0 262 H320 M104 0 V58 M226 262 V320 M40 58 V262 M282 58 V262"/>
    <path class="kn-cavity" d="M118 122 L142 112 L176 118 L206 114 L212 146 L206 178 L212 206 L176 212 L146 206 L118 210 L112 182 L116 152 Z"/>
    <path class="kn-crack" d="M118 122 L92 100 L76 104 M206 114 L226 86 L236 62 M212 206 L240 226 M118 210 L98 236 L94 258 M176 118 L180 96"/>
    <g transform="translate(110 118) scale(.46)">${knockerBodyMarkup()}</g>
    ${arm(122, 168, 150, 0.38)}
    ${arm(172, 122, -56, 0.38)}
    ${arm(204, 182, 28, 0.36)}
  </svg>`;
}

// As pontas dos dedos a dobrar-se por cima da estrutura (durante a pancada nessa zona)
function knockerTipsSVG() {
  return `<svg class="kn-tips" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
    <path class="kn-finger" d="M28 -4 L30 12 L25 24"/><path class="kn-finger" d="M52 -4 L54 14 L49 28"/>
    <path class="kn-finger" d="M76 -4 L77 13 L72 25"/><path class="kn-finger" d="M98 -4 L98 10 L94 19"/>
    <g class="kn-knuckle"><circle cx="30" cy="12" r="3"/><circle cx="54" cy="14" r="3"/><circle cx="77" cy="13" r="3"/><circle cx="98" cy="10" r="2.6"/></g>
  </svg>`;
}

// LATCH: corpo pequeno, oito "dedos-pata", cabos nas costas, boca pequena por baixo
function latchLegsMarkup() {
  const leg = (n, d, k1, k2, nail) => `
    <g class="la-leg la-l${n}">
      <path class="la-limb" d="${d}"/>
      <circle class="la-knuckle" cx="${k1[0]}" cy="${k1[1]}" r="2.6"/>
      <circle class="la-knuckle" cx="${k2[0]}" cy="${k2[1]}" r="2.2"/>
      <path class="la-nail" d="${nail}"/>
    </g>`;
  return leg(1, 'M55 46 L38 34 L22 38 L13 52', [38, 34], [22, 38], 'M12.5 51 L14 56.5')
    + leg(2, 'M53 54 L34 52 L18 60 L12 75', [34, 52], [18, 60], 'M11.5 74 L12.5 79.5')
    + leg(3, 'M55 61 L40 70 L30 85 L31 99', [40, 70], [30, 85], 'M30.5 98 L32 103.5')
    + leg(4, 'M60 67 L52 82 L50 96 L55 108', [52, 82], [50, 96], 'M54.5 107 L58 111');
}

function latchSVG() {
  return `<svg class="la-svg" viewBox="0 0 140 112" aria-hidden="true">
    <g class="la-cables">
      <path class="la-cable" d="M62 40 C54 24 36 22 24 8"/>
      <path class="la-cable la-thin" d="M66 38 C60 20 52 14 46 4"/>
      <path class="la-cable" d="M70 36 C71 22 80 12 88 2"/>
      <path class="la-cable" d="M78 40 C92 32 108 32 122 18"/>
      <path class="la-plug" d="M21 5 L27 10 M43 2 L49 5 M86 0 L91 4 M119 15 L125 19"/>
    </g>
    <g class="la-side">${latchLegsMarkup()}</g>
    <g class="la-side la-mirror" transform="matrix(-1 0 0 1 140 0)">${latchLegsMarkup()}</g>
    <g class="la-core">
      <path class="la-body" d="M50 52 C48 38 59 30 71 30 C84 31 93 41 91 54 C90 66 80 73 70 73 C58 73 51 64 50 52 Z"/>
      <path class="la-plate" d="M58 35 L62.5 31.5 L63.5 36.5 Z M67 31 L71.5 29.5 L72.5 33.5 Z M76.5 31.5 L80.5 31 L80 35.5 Z"/>
      <path class="la-crease" d="M58 43 Q61 47 59 53 M82 41 Q79 47 83 52 M66 40 Q70 44 68 50 M74 46 Q77 52 75 58"/>
      <path class="la-mouth" d="M63 67 Q70 74 77 67 Q70 70.5 63 67 Z"/>
      <path class="la-teeth" d="M65 68.4 L66 70.6 L67 69.2 M69 69.8 L70 72 L71 69.8 M73 69.2 L74 70.6 L75 68.4"/>
    </g>
  </svg>`;
}

// LUMEN: mariposa experimental gigante. Asas fechadas = uma figura pendurada; abertas = enorme
function lumenWingMarkup() {
  // asa esquerda (aberta), rasgada; a direita é o espelho
  return `
    <path class="lu-wing" fill-rule="evenodd" d="M188 120 C150 80 96 52 34 44 C24 43 17 50 19 58 L28 82 L37 80 L35 96 L47 111 L42 120 L61 139 L49 150 C40 170 45 196 60 214 L72 210 L70 224 C92 242 128 250 160 236 C176 228 186 210 190 190 Z
      M72 88 L86 95 L79 104 Z M112 150 L124 157 L116 167 L107 160 Z M62 186 L74 182 L72 196 Z M140 206 L150 212 L142 220 Z M48 62 L58 60 L54 70 Z"/>
    <path class="lu-vein" d="M188 124 L40 52 M188 128 L26 76 M188 140 L62 140 M188 160 L56 200 M188 180 L112 238 M120 92 L112 120 M90 140 L84 170"/>`;
}

function lumenSVG() {
  return `<svg class="lu-svg" viewBox="0 0 400 420" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
    <g class="lu-open">
      <g class="lu-wing-l">${lumenWingMarkup()}</g>
      <g class="lu-wing-r" transform="matrix(-1 0 0 1 400 0)">${lumenWingMarkup()}</g>
    </g>
    <path class="lu-leg" d="M190 98 C176 70 166 40 158 4 M210 98 C224 70 234 40 242 4 M158 4 L150 2 M242 4 L250 2"/>
    <path class="lu-antenna" d="M196 62 C186 34 160 18 128 14 M204 62 C214 34 240 18 272 14"/>
    <path class="lu-barb" d="M180 36 l-3 -6 M168 27 l-2 -6 M154 20 l-1 -6 M140 16 l-1 -5 M220 36 l3 -6 M232 27 l2 -6 M246 20 l1 -6 M260 16 l1 -5"/>
    <path class="lu-abdomen" d="M200 176 C211 182 213 222 211 268 C209 316 205 366 200 404 C195 366 191 316 189 268 C187 222 189 182 200 176 Z"/>
    <path class="lu-seg" d="M190.5 210 Q200 214 209.5 210 M190 240 Q200 244 210 240 M190 270 Q200 274 210 270 M191 300 Q200 304 209 300 M192.5 330 Q200 334 207.5 330 M194.5 360 Q200 363 205.5 360"/>
    <path class="lu-thorax" d="M200 112 C213 114 220 132 218 152 C216 168 208 178 200 180 C192 178 184 168 182 152 C180 132 187 114 200 112 Z"/>
    <path class="lu-fur" d="M186 130 l-4 -3 M214 130 l4 -3 M184 146 l-5 -1 M216 146 l5 -1 M186 162 l-4 2 M214 162 l4 2 M195 120 l-1 -4 M205 120 l1 -4"/>
    <path class="lu-limb" d="M188 136 L176 150 L180 166 M187 150 L174 168 L180 184 M212 136 L224 150 L220 166 M213 150 L226 168 L220 184"/>
    <path class="lu-head" d="M200 60 C209 62 213 76 211 92 C209 104 204 112 200 114 C196 112 191 104 189 92 C187 76 191 62 200 60 Z"/>
    <g class="lu-bulbs">
      <circle class="lu-bulb" cx="194" cy="84" r="5.4"/><circle class="lu-bulb" cx="206" cy="84" r="5.4"/>
      <path class="lu-fil" d="M191 85 L193 82 L195 86 L197 82 M203 85 L205 82 L207 86 L209 82"/>
      <path class="lu-socket" d="M189.5 88.5 Q194 92.5 198.5 88.5 M201.5 88.5 Q206 92.5 210.5 88.5"/>
    </g>
    <g class="lu-closed">
      <path class="lu-wing lu-cloak" d="M190 116 C172 128 161 176 163 244 C165 300 174 352 184 392 L188 382 L190 398 L194 386 L197 396 L198 180 Z"/>
      <path class="lu-wing lu-cloak" d="M210 116 C228 128 239 176 237 244 C235 300 226 352 216 392 L212 382 L210 398 L206 386 L203 396 L202 180 Z"/>
      <path class="lu-vein" d="M192 124 L170 250 L180 380 M208 124 L230 250 L220 380 M194 150 L188 330 M206 150 L212 330"/>
    </g>
  </svg>`;
}

// Uma figura pronta a usar (jogo, preview, ANOMALY FILE, jumpscare)
function anomalyFigure(id, extraClass = '') {
  const el = document.createElement('div');
  el.className = `an-fig an-fig-${id} ${extraClass}`.trim();
  el.dataset.anomaly = id;
  if (id === 'hush') { el.innerHTML = hushSVG(); el.dataset.phase = 'watch'; }
  if (id === 'knocker') el.innerHTML = knockerFullSVG();
  if (id === 'latch') el.innerHTML = latchSVG();
  if (id === 'lumen') { el.innerHTML = lumenSVG(); el.dataset.wings = 'closed'; }
  return el;
}


/* ---------------------------------------------------------
   ESTADO
   --------------------------------------------------------- */

const anom = {
  on: {},                 // as Anomalies ligadas nesta noite
  clock: 0,               // segundos reais desde o início da noite
  hush: { phase: 'idle', timer: 0, t: 0, need: 3, still: 0, jitter: 0, strikes: 0 },
  knocker: { phase: 'idle', timer: 0, t: 0, seq: [], step: 0, knocked: 0, left: 0, wrong: null },
  latch: { phase: 'idle', timer: 0, t: 0, target: null, stage: 0, damaged: false, reboot: null, pointer: { x: 0.5, y: 0.3 }, offset: { x: 0, y: 0 }, pos: { x: 0.5, y: 0.3 }, sparkTimer: 0 },
  lumen: { stage: 0, interest: 0, stint: 0, side: 'left', dark: 0, lit: 0, need: 3, rest: 0, cueTimer: 0 },
  lastPointer: null,
  el: {}
};

function anomOn(id) { return Boolean(anom.on[id]); }
function anomActive() { return ANOMALY_IDS.some(anomOn); }

// O HUSH está a exigir imobilidade (descer + ver)
function hushHolding() {
  return ['descend', 'watch', 'react'].includes(anom.hush.phase);
}
function knockerBusy() {
  return ['knock', 'answer', 'punish'].includes(anom.knocker.phase);
}

const LATCH_CONTROLS = {
  doorLeft:    () => panoEls.left.btnDoor,
  doorRight:   () => panoEls.right.btnDoor,
  lightLeft:   () => panoEls.left.btnLight,
  lightRight:  () => panoEls.right.btnLight,
  ventSeal:    () => ui.btnVentSeal,
  cameras:     () => ui.btnCamerasPano,
  verifyLeft:  () => document.querySelector('.side-verify-btn[data-side="left"]'),
  verifyRight: () => document.querySelector('.side-verify-btn[data-side="right"]')
};
const CONTROL_SIDE = { doorLeft: 'left', lightLeft: 'left', verifyLeft: 'left', doorRight: 'right', lightRight: 'right', verifyRight: 'right' };

// O controlo está encravado (LATCH agarrado / a desaparecer, ou a reiniciar depois de danificado)
function latchBlocks(control) {
  const L = anom.latch;
  if (L.reboot && L.reboot.control === control && anom.clock < L.reboot.until) return true;
  return (L.phase === 'latched' || L.phase === 'vanish') && L.target === control;
}

// ...ou ocupado: na mão do jogador, mas volta para lá se ele o largar fora do MAINTENANCE SLOT
function latchOccupies(control) {
  return latchBlocks(control) || (anom.latch.phase === 'held' && anom.latch.target === control);
}


/* ---------------------------------------------------------
   ELEMENTOS (criados uma vez)
   --------------------------------------------------------- */

function buildAnomalyElements() {
  const E = anom.el;
  // Camada por cima da sala e das câmaras (abaixo do HUD): o HUSH, as pancadas nas bordas, as mãos, a sombra do LUMEN
  const layer = document.createElement('div');
  layer.id = 'anom-layer';
  layer.innerHTML = `
    <div class="an-ceiling"></div>
    <div class="an-hush"></div>
    <div class="an-edge" data-zone="left"></div>
    <div class="an-edge" data-zone="center"></div>
    <div class="an-edge" data-zone="right"></div>
    <div class="an-lumen-shade"><span class="an-mote"></span><span class="an-mote"></span><span class="an-mote"></span><span class="an-mote"></span><span class="an-mote"></span></div>
    <div class="an-kn-hand an-kn-h1"></div>
    <div class="an-kn-hand an-kn-h2"></div>`;
  ui.game.insertBefore(layer, ui.cameraPanel.nextSibling);
  E.layer = layer;
  E.hush = anomalyFigure('hush', 'an-hush-fig');
  layer.querySelector('.an-hush').appendChild(E.hush);
  E.edges = {};
  layer.querySelectorAll('.an-edge').forEach((el) => { E.edges[el.dataset.zone] = el; });
  E.hands = [layer.querySelector('.an-kn-h1'), layer.querySelector('.an-kn-h2')];
  E.hands.forEach((h) => { h.innerHTML = knockerArmSVG(); });

  // KNOCKER: as três zonas de resposta (a estrutura do hall esquerdo, a grelha central, o hall direito)
  E.zones = {};
  for (const zone of ['left', 'center', 'right']) {
    const z = document.createElement('div');
    z.className = 'kn-zone';
    z.dataset.zone = zone;
    z.innerHTML = knockerTipsSVG();
    z.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      knockerTap(zone);
    });
    const parent = zone === 'center' ? document.querySelector('.pano-center') : document.querySelector(`.pano-side[data-side="${zone}"]`);
    parent.appendChild(z);
    E.zones[zone] = z;
  }
  E.shake = {
    left: document.querySelector('.pano-side[data-side="left"] .hall-frame'),
    center: ui.centerVent,
    right: document.querySelector('.pano-side[data-side="right"] .hall-frame')
  };

  // LATCH: a criatura (na sala, presa a um botão) e o MAINTENANCE SLOT na secretária
  const chute = document.createElement('div');
  chute.className = 'an-chute';
  chute.innerHTML = '<div class="an-chute-mouth"><div class="an-chute-lid"></div></div><div class="an-chute-label">MAINTENANCE SLOT</div>';
  document.querySelector('.pano-center').appendChild(chute);
  E.chute = chute;
  E.chuteMouth = chute.querySelector('.an-chute-mouth');
  const latch = anomalyFigure('latch', 'an-latch hidden');
  latch.addEventListener('pointerdown', (event) => latchGrab(event));
  ui.panoTrack.appendChild(latch);
  E.latch = latch;

  // LUMEN: em cada hall (agarrado perto da lâmpada) + as pistas (sombra, insetos)
  E.lumen = {};
  for (const side of SIDES) {
    const room = panoEls[side].doorway.querySelector('.hall-room');
    const wrap = document.createElement('div');
    wrap.className = 'lu-hall';
    wrap.innerHTML = '<div class="lu-shadow"></div><div class="lu-motes"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
    const fig = anomalyFigure('lumen', 'lu-hall-fig');
    wrap.appendChild(fig);
    room.insertBefore(wrap, room.querySelector('.hall-dark'));
    // os filamentos dos olhos ainda se veem no escuro (por cima do .hall-dark)
    const glow = document.createElement('div');
    glow.className = 'lu-glow';
    glow.innerHTML = '<i></i><i></i>';
    room.appendChild(glow);
    E.lumen[side] = { wrap, fig, glow };
  }

  buildAnomalyJumpscares();
}

// Os quatro sustos (dentro do #jumpscare, como os dos monstros canónicos)
function buildAnomalyJumpscares() {
  const js = ui.jumpscare;
  const add = (cls, html) => {
    const div = document.createElement('div');
    div.className = `js-face ${cls}`;
    div.innerHTML = html;
    js.insertBefore(div, js.querySelector('#js-noise'));
    return div;
  };
  // HUSH: as mãos abrem, o corpo cai do teto, os braços envolvem o enquadramento, a face aproxima-se
  const hush = add('js-hush', '<div class="jh-arm jh-arm-l"></div><div class="jh-arm jh-arm-r"></div><div class="jh-fig"></div><div class="jh-flash"></div>');
  hush.querySelector('.jh-fig').appendChild(anomalyFigure('hush'));
  hush.querySelectorAll('.jh-arm').forEach((a) => { a.innerHTML = `<svg viewBox="0 0 200 440" preserveAspectRatio="none" aria-hidden="true"><g class="hu-side">${hushArmMarkup()}</g></svg>`; });
  // KNOCKER: três mãos entram de lados diferentes e agarram o enquadramento; o corpo aparece um instante
  add('js-knocker', `<div class="jk-hand jk-l">${knockerArmSVG()}</div><div class="jk-hand jk-r">${knockerArmSVG()}</div><div class="jk-hand jk-t">${knockerArmSVG()}</div>
    <div class="jk-body"><svg viewBox="40 40 150 140" aria-hidden="true">${knockerBodyMarkup()}</svg></div><div class="jk-flash"></div>`);
  // LATCH: mãos pequenas nas bordas do ecrã... e salta diretamente para a câmara
  const latch = add('js-latch', '<div class="jl-edge jl-e1"></div><div class="jl-edge jl-e2"></div><div class="jl-edge jl-e3"></div><div class="jl-edge jl-e4"></div><div class="jl-jump"></div><div class="jl-flash"></div>');
  latch.querySelectorAll('.jl-edge').forEach((e) => { e.innerHTML = `<svg viewBox="0 0 70 112" aria-hidden="true"><g class="la-side">${latchLegsMarkup()}</g></svg>`; });
  latch.querySelector('.jl-jump').appendChild(anomalyFigure('latch'));
  // LUMEN: a luz pisca, as asas cobrem o hall, as lâmpadas acendem todas, as asas abrem e investe
  const lumen = add('js-lumen', '<div class="jlu-lamps"><i></i><i></i><i></i></div><div class="jlu-fig"></div><div class="jlu-flash"></div>');
  lumen.querySelector('.jlu-fig').appendChild(anomalyFigure('lumen'));
}


/* ---------------------------------------------------------
   ENTRADA DO JOGADOR (para o HUSH): rato, cliques, teclas
   Mede o movimento LÓGICO do ponteiro (clientX/Y), por isso
   funciona igual com o cursor da Asterion.
   --------------------------------------------------------- */

// kind: 'move' (fração da largura do ecrã), 'click', 'key'
function anomalyInput(kind, amount = 0) {
  if (gameOver || !anomOn('hush')) return;
  const H = anom.hush;
  if (H.phase !== 'watch' && H.phase !== 'react') return;
  H.jitter += kind === 'move' ? amount : ANOMALY.hush.tolerance * 1.5;   // um clique / tecla conta sempre
  if (H.jitter > ANOMALY.hush.tolerance) hushStrike(kind);
}

document.addEventListener('pointermove', (event) => {
  const rect = ui.game.getBoundingClientRect();
  if (!rect.width) return;
  const p = { x: event.clientX, y: event.clientY };
  const last = anom.lastPointer;
  anom.lastPointer = p;
  if (anom.latch.phase === 'held') latchPointer(event);
  if (!last) return;
  anomalyInput('move', Math.hypot(p.x - last.x, p.y - last.y) / rect.width);
}, { passive: true });
document.addEventListener('pointerdown', (event) => {
  if (event.target instanceof Element && event.target.closest('#game')) anomalyInput('click');
}, true);
document.addEventListener('keydown', (event) => {
  if (!event.repeat) anomalyInput('key');
}, true);
document.addEventListener('pointerup', () => latchRelease());
document.addEventListener('pointercancel', () => latchRelease());
window.addEventListener('blur', () => latchRelease());


/* ---------------------------------------------------------
   HUSH
   --------------------------------------------------------- */

// Previsão: a raiva do Morrow não chega a 100 enquanto estás parado (se não o estiveres a ver)
function morrowSafeFor(seconds) {
  const m = monsters.morrow;
  if (!m || m.state === 'sleeping' && m.rage < 10) return true;
  if (m.state === 'hunting' || m.state === 'attacking') return false;
  if (isBeingWatched(m)) return true;
  const rate = (m.settings.rageRate || [])[hourIndex()] || 3;
  const standing = m.rage >= CONFIG.morrow.standingAt ? CONFIG.morrow.standingRageFactor : 1;
  return m.rage + rate * standing * CONFIG.speed * seconds < CONFIG.morrow.huntAt - 3;
}

function hushCanStart() {
  const H = ANOMALY.hush;
  if (powerOut || panLockSide || knockerBusy() || anom.knocker.phase === 'leave') return false;
  if (anom.lumen.stage >= 2) return false;                       // o LUMEN está a pedir que apagues as luzes
  if (anom.latch.phase === 'held' || anom.latch.phase === 'vanish') return false;
  if (anom.clock - (anom.lastCritical || -99) < 3) return false;  // um pouco de folga entre Anomalies
  if (horrorDirector.activeThreats('hush') > 0 || horrorDirector.waitLeft() > 0) return false;
  if (typeof zero !== 'undefined' && zero.purge && zero.purge.holding) return false;
  return morrowSafeFor(H.descend + H.still[1] + H.morrowMargin);
}

function startHush() {
  const H = anom.hush;
  H.phase = 'descend';
  H.t = 0;
  H.need = randomIn(ANOMALY.hush.still);
  H.still = 0;
  H.jitter = 0;
  H.strikes = 0;
  renderHush();
  emitGameEvent('hushStart');
}

function hushStrike(kind) {
  const H = anom.hush;
  H.jitter = 0;
  H.still = 0;
  if (H.strikes === 0) {
    // primeira vez: as mãos afastam-se e a cabeça vira-se. Ainda dá para parar.
    H.strikes = 1;
    H.phase = 'react';
    renderHush();
    emitGameEvent('hushReact', { kind });
    return;
  }
  H.phase = 'attack';
  renderHush();
  loseGame('hush');
}

function updateHush(rdt) {
  const H = anom.hush;
  const C = ANOMALY.hush;
  switch (H.phase) {
    case 'idle':
      H.timer -= rdt;
      if (H.timer > 0) return;
      if (hushCanStart() && horrorDirector.claim('hushCritical', 'hush')) startHush();
      else H.timer = C.retry;
      return;
    case 'descend':
      H.t += rdt;
      if (H.t >= C.descend) {
        H.phase = 'watch';
        H.t = 0;
        H.jitter = 0;
        renderHush();
      }
      return;
    case 'watch':
    case 'react':
      H.jitter = Math.max(0, H.jitter - C.leak * rdt);
      H.still += rdt;
      if (H.still >= H.need) {
        H.phase = 'leave';
        H.t = 0;
        anom.lastCritical = anom.clock;
        renderHush();
        emitGameEvent('hushLeave');
      }
      return;
    case 'leave':
      H.t += rdt;
      if (H.t >= C.leave) {
        H.phase = 'idle';
        H.timer = randomIn(C.every);
        renderHush();
      }
      return;
    default:
      return;
  }
}

function renderHush() {
  const phase = anom.hush.phase;
  const shown = phase !== 'idle';
  anom.el.layer.querySelector('.an-hush').dataset.phase = phase;
  anom.el.hush.dataset.phase = phase === 'react' ? 'react' : phase === 'attack' ? 'open' : 'watch';
  ui.game.classList.toggle('an-hush-on', shown && phase !== 'leave');
}


/* ---------------------------------------------------------
   KNOCKER
   --------------------------------------------------------- */

const KNOCK_ZONES = ['left', 'center', 'right'];

function knockerSequence() {
  let seq;
  do {
    seq = [0, 1, 2].map(() => randomItem(KNOCK_ZONES));
  } while (new Set(seq).size === 1);       // nunca três vezes o mesmo sítio
  return seq;
}

function knockerCanStart() {
  if (powerOut || panLockSide || hushHolding() || anom.hush.phase === 'leave') return false;
  if (anom.lumen.stage >= 3 || anom.latch.phase === 'vanish') return false;
  if (anom.clock - (anom.lastCritical || -99) < 3) return false;
  return horrorDirector.activeThreats('knocker') <= ANOMALY.knocker.maxThreats;
}

function startKnocker() {
  const K = anom.knocker;
  K.phase = 'knock';
  K.t = 0;
  K.seq = knockerSequence();
  K.step = 0;
  K.knocked = 0;
  K.wrong = null;
  ui.game.classList.add('an-knocker-on');
  emitGameEvent('knockerStart', { seq: [...K.seq] });
}

function knock(zone, index) {
  restartAnimation(anom.el.zones[zone], 'kn-hit');
  restartAnimation(anom.el.edges[zone], 'is-hit');
  if (anom.el.shake[zone]) restartAnimation(anom.el.shake[zone], 'kn-shake');
  emitGameEvent('knockerKnock', { zone, index });
}

// O jogador bate numa estrutura (não abre portas, não mexe na vent nem na luz, não faz barulho para o Echo)
function knockerTap(zone) {
  const K = anom.knocker;
  if (gameOver || K.phase !== 'answer') return;
  const ok = zone === K.seq[K.step];
  restartAnimation(anom.el.zones[zone], 'kn-tap');
  emitGameEvent('knockerTap', { zone, ok, step: K.step });
  if (!ok) {
    knockerPunish(zone);
    return;
  }
  K.step++;
  if (K.step >= K.seq.length) {
    K.phase = 'leave';
    K.t = 0;
    anom.lastCritical = anom.clock;
    ui.game.classList.remove('kn-answer');
    emitGameEvent('knockerAnswered');
  }
}

function knockerPunish(zone) {
  const K = anom.knocker;
  K.phase = 'punish';
  K.t = 0;
  K.wrong = zone || randomItem(['left', 'right']);
  K.handsShown = 0;
  ui.game.classList.remove('kn-answer');
  showKnockerHand(0);
  emitGameEvent('knockerPunish', { zone: K.wrong, hand: 1 });
}

function showKnockerHand(i) {
  const hand = anom.el.hands[i];
  const side = i === 0 ? (anom.knocker.wrong === 'right' ? 'right' : anom.knocker.wrong === 'center' ? 'top' : 'left')
    : (anom.knocker.wrong === 'right' ? 'left' : 'right');
  hand.dataset.from = side;
  hand.classList.add('is-on');
  anom.knocker.handsShown = i + 1;
}

function updateKnocker(rdt) {
  const K = anom.knocker;
  const C = ANOMALY.knocker;
  switch (K.phase) {
    case 'idle':
      K.timer -= rdt;
      if (K.timer > 0) return;
      if (knockerCanStart() && horrorDirector.claim('knockerResponse', 'knocker')) startKnocker();
      else K.timer = C.retry;
      return;
    case 'knock':
      K.t += rdt;
      while (K.knocked < 3 && K.t >= C.lead + K.knocked * C.gap) {
        knock(K.seq[K.knocked], K.knocked);
        K.knocked++;
      }
      if (K.t >= C.lead + 2 * C.gap + C.after) {
        K.phase = 'answer';
        K.left = C.answer;
        ui.game.classList.add('kn-answer');
        emitGameEvent('knockerListen');
      }
      return;
    case 'answer':
      K.left -= rdt;
      if (K.left <= 0) knockerPunish(null);
      return;
    case 'punish':
      K.t += rdt;
      if (K.handsShown < 2 && K.t >= C.hand2) {
        showKnockerHand(1);
        emitGameEvent('knockerPunish', { zone: K.wrong, hand: 2 });
      }
      if (K.t >= C.punish) loseGame('knocker');
      return;
    case 'leave':
      K.t += rdt;
      if (!K.farDone && K.t >= 0.6) {
        K.farDone = true;
        emitGameEvent('knockerFarKnock');
      }
      if (K.t >= 1.3) {
        K.phase = 'idle';
        K.farDone = false;
        K.timer = randomIn(C.every);
        ui.game.classList.remove('an-knocker-on');
      }
      return;
    default:
      return;
  }
}


/* ---------------------------------------------------------
   LATCH
   --------------------------------------------------------- */

function hallBusy(side) {
  return Object.values(monsters).some((m) => HALL_SIDE[m.position] === side || (m.id === 'vesper' && m.state === 'attacking' && m.side === side));
}

// Onde se pode agarrar agora sem bloquear o único counter de uma ameaça já ativa
function latchCandidates() {
  const list = [];
  const zeroOn = Boolean(monsters.subjectZero);
  for (const side of SIDES) {
    const S = side === 'left' ? 'Left' : 'Right';
    const busy = hallBusy(side);
    const morrowComing = monsters.morrow && monsters.morrow.state === 'hunting';
    if (!busy && !morrowComing) list.push(`door${S}`);
    if (!busy && !isSideLightOn(side)) list.push(`light${S}`);     // nunca numa luz acesa (o LUMEN pede escuridão)
    if (zeroOn) list.push(`verify${S}`);
  }
  const echo = monsters.echo;
  if (!echo || (echo.state !== 'atVent' && !isFinalVent(echo.position))) list.push('ventSeal');
  const m = monsters.morrow;
  if (!camerasOpen && (!m || (m.rage < ANOMALY.latch.morrowSafe && !['hunting', 'attacking'].includes(m.state)))) list.push('cameras');
  return list.filter((c) => !(anom.latch.reboot && anom.latch.reboot.control === c && anom.clock < anom.latch.reboot.until));
}

function latchCanStart() {
  return !powerOut && !hushHolding() && !panLockSide && anom.knocker.phase !== 'punish';
}

function controlRect(control) {
  const btn = LATCH_CONTROLS[control]();
  return btn ? btn.getBoundingClientRect() : null;
}

// Põe o LATCH em cima do botão (na pista da office: vira com a vista)
function placeLatchOnControl() {
  const L = anom.latch;
  const el = anom.el.latch;
  const r = controlRect(L.target);
  const t = ui.panoTrack.getBoundingClientRect();
  if (!r || !t.width) return;
  if (el.parentElement !== ui.panoTrack) ui.panoTrack.appendChild(el);
  const w = r.width * 1.5;
  el.style.width = `${(w / t.width * 100).toFixed(3)}%`;
  el.style.left = `${((r.left + r.width / 2 - t.left) / t.width * 100).toFixed(3)}%`;
  el.style.top = `${((r.top + r.height * 0.42 - t.top) / t.height * 100).toFixed(3)}%`;
  el.classList.remove('is-held', 'hidden', 'is-gone');
}

function latchAttach(control) {
  const L = anom.latch;
  L.phase = 'latched';
  L.target = control;
  L.t = 0;
  L.stage = 0;
  L.damaged = false;
  L.sparkTimer = 1;
  anom.el.latch.dataset.stage = '0';
  anom.el.latch.dataset.control = control;
  placeLatchOnControl();
  restartAnimation(anom.el.latch, 'la-arrive');
  emitGameEvent('latchAttach', { control, side: CONTROL_SIDE[control] || null });
}

function setLatchStage(stage) {
  const L = anom.latch;
  if (L.stage === stage) return;
  L.stage = stage;
  anom.el.latch.dataset.stage = String(stage);
  const btn = LATCH_CONTROLS[L.target]();
  if (btn) btn.classList.toggle('an-chewed', stage >= 1);
  if (stage === 2) {
    L.damaged = true;
    emitGameEvent('latchDamage', { control: L.target, side: CONTROL_SIDE[L.target] || null });
  }
}

function clearLatchButtons() {
  for (const get of Object.values(LATCH_CONTROLS)) {
    const btn = get();
    if (btn) btn.classList.remove('an-chewed', 'an-rebooting');
  }
}

// Clicar e manter: agarras o LATCH (a vista vira-se para a secretária)
function latchGrab(event) {
  const L = anom.latch;
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  if (gameOver || L.phase !== 'latched' || hushHolding()) return;
  const g = ui.game.getBoundingClientRect();
  const r = anom.el.latch.getBoundingClientRect();
  L.phase = 'held';
  L.armed = false;
  L.pointer ={ x: (event.clientX - g.left) / g.width, y: (event.clientY - g.top) / g.width };
  L.offset = { x: (r.left + r.width / 2 - event.clientX) / g.width, y: (r.top + r.height / 2 - event.clientY) / g.width };
  const btn = LATCH_CONTROLS[L.target]();
  if (btn) btn.classList.remove('an-chewed');
  anom.el.layer.appendChild(anom.el.latch);
  anom.el.latch.classList.add('is-held');
  anom.el.latch.style.width = `${(r.width / g.width * 100).toFixed(3)}%`;
  renderHeldLatch();
  ui.game.classList.add('an-latch-held');
  emitGameEvent('latchGrab', { control: L.target });
}

function latchPointer(event) {
  const g = ui.game.getBoundingClientRect();
  anom.latch.pointer = { x: (event.clientX - g.left) / g.width, y: (event.clientY - g.top) / g.width };
  renderHeldLatch();
}

function renderHeldLatch() {
  const L = anom.latch;
  const g = ui.game.getBoundingClientRect();
  L.pos = { x: L.pointer.x + L.offset.x, y: L.pointer.y + L.offset.y };
  anom.el.latch.style.left = `${(L.pos.x * 100).toFixed(3)}%`;
  anom.el.latch.style.top = `${(L.pos.y * g.width / g.height * 100).toFixed(3)}%`;
}

// Enquanto o seguras, puxa devagar para o controlo; se lá chegar, agarra-se outra vez
function updateHeldLatch(rdt) {
  const L = anom.latch;
  const C = ANOMALY.latch;
  const g = ui.game.getBoundingClientRect();
  const r = controlRect(L.target);
  if (!r || !g.width) return;
  const cx = (r.left + r.width / 2 - g.left) / g.width;
  const cy = (r.top + r.height / 2 - g.top) / g.width;
  const dx = cx - L.pos.x;
  const dy = cy - L.pos.y;
  const dist = Math.hypot(dx, dy);
  // Só se volta a agarrar depois de o teres afastado do botão (senão, nos botões da secretária
  // — CAMERAS, VENT SEAL — agarrava-se outra vez no próprio instante em que o pegavas)
  if (dist > C.reattach * 3) L.armed = true;
  if (L.armed && dist < C.reattach) {
    latchReturn('crawl');
    return;
  }
  L.offset.x += dx / dist * C.pull * rdt;
  L.offset.y += dy / dist * C.pull * rdt;
  const len = Math.hypot(L.offset.x, L.offset.y);
  if (len > C.maxOffset) {
    L.offset.x *= C.maxOffset / len;
    L.offset.y *= C.maxOffset / len;
  }
  renderHeldLatch();
}

function latchInChute() {
  const L = anom.latch;
  const g = ui.game.getBoundingClientRect();
  const c = anom.el.chuteMouth.getBoundingClientRect();
  if (!g.width || !c.width) return false;
  const m = ANOMALY.latch.chuteMargin;
  const x = L.pos.x;
  const y = L.pos.y;
  return x >= (c.left - g.left) / g.width - m && x <= (c.right - g.left) / g.width + m
    && y >= (c.top - g.top) / g.width - m * 1.6 && y <= (c.bottom - g.top) / g.width + m;
}

function latchRelease() {
  const L = anom.latch;
  if (L.phase !== 'held') return;
  ui.game.classList.remove('an-latch-held');
  if (!gameOver && latchInChute()) latchDispose();
  else latchReturn('drop');
}

// Largaste-o fora do MAINTENANCE SLOT (ou chegou lá sozinho): volta a agarrar-se ao controlo
function latchReturn(how) {
  const L = anom.latch;
  L.phase = 'latched';
  ui.game.classList.remove('an-latch-held');
  placeLatchOnControl();
  restartAnimation(anom.el.latch, 'la-arrive');
  const btn = LATCH_CONTROLS[L.target]();
  if (btn) btn.classList.toggle('an-chewed', L.stage >= 1);
  emitGameEvent('latchReturn', { control: L.target, how });
}

// Dentro do MAINTENANCE SLOT: a tampa fecha e desaparece
function latchDispose() {
  const L = anom.latch;
  const control = L.target;
  L.phase = 'idle';
  L.timer = randomIn(ANOMALY.latch.every);
  anom.el.latch.classList.add('hidden');
  anom.el.latch.classList.remove('is-held');
  restartAnimation(anom.el.chute, 'is-eating');
  clearLatchButtons();
  if (L.damaged) {
    // o controlo ficou danificado: reinicia (só uns segundos; nunca fica estragado de vez)
    L.reboot = { control, until: anom.clock + ANOMALY.latch.reboot };
    const btn = LATCH_CONTROLS[control]();
    if (btn) btn.classList.add('an-rebooting');
  }
  L.target = null;
  L.stage = 0;
  L.damaged = false;
  emitGameEvent('latchDisposed', { control });
}

function updateLatch(rdt) {
  const L = anom.latch;
  const C = ANOMALY.latch;
  if (L.reboot && anom.clock >= L.reboot.until) {
    const btn = LATCH_CONTROLS[L.reboot.control]();
    if (btn) btn.classList.remove('an-rebooting');
    emitGameEvent('latchRebooted', { control: L.reboot.control });
    L.reboot = null;
  }
  switch (L.phase) {
    case 'idle':
      L.timer -= rdt;
      if (L.timer > 0) return;
      if (latchCanStart()) {
        const options = latchCandidates();
        if (options.length && horrorDirector.claim('latchAttach', 'latch')) {
          latchAttach(randomItem(options));
          return;
        }
      }
      L.timer = C.retry;
      return;
    case 'latched':
      // parado enquanto o HUSH exige que não mexas em nada (não dava para o tirar), ou sem energia
      if (hushHolding() || powerOut) return;
      L.t += rdt;
      setLatchStage(L.t >= C.damage ? 2 : L.t >= C.wires ? 1 : 0);
      if (L.stage >= 1) {
        L.sparkTimer -= rdt;
        if (L.sparkTimer <= 0) {
          L.sparkTimer = randomBetween(1.1, 2.2);
          restartAnimation(anom.el.latch, 'la-spark');
          const btn = LATCH_CONTROLS[L.target]();
          if (btn) restartAnimation(btn, 'an-glitch');
          emitGameEvent('latchSpark', { control: L.target, side: CONTROL_SIDE[L.target] || null });
        }
      }
      if (L.t >= C.attack) {
        // "saiu"... (não saiu)
        L.phase = 'vanish';
        L.t = 0;
        anom.el.latch.classList.add('is-gone');
        emitGameEvent('latchVanish', { control: L.target });
      }
      return;
    case 'held':
      updateHeldLatch(rdt);
      return;
    case 'vanish':
      L.t += rdt;
      if (L.t >= C.vanish) loseGame('latch');
      return;
    default:
      return;
  }
}


/* ---------------------------------------------------------
   LUMEN
   --------------------------------------------------------- */

function lumenCanAppear() {
  if (powerOut || hushHolding() || anom.knocker.phase === 'punish') return false;
  const v = monsters.vesper;
  if (v && (v.state === 'attacking' || (v.state === 'hall' && v.hallProgress >= 0.6))) return false;
  return true;
}

function lumenSideNow() {
  if (leftLightOn && !rightLightOn) return 'left';
  if (rightLightOn && !leftLightOn) return 'right';
  return anom.lumen.side;
}

function setLumenStage(stage) {
  const U = anom.lumen;
  if (U.stage === stage) return;
  const from = U.stage;
  U.stage = stage;
  renderLumen();
  if (stage === 1 && from === 0) emitGameEvent('lumenCue', { side: U.side });
}

function lumenAppear() {
  const U = anom.lumen;
  U.side = lumenSideNow();
  U.dark = 0;
  U.lit = 0;
  U.need = randomIn(ANOMALY.lumen.dark);
  setLumenStage(2);
  emitGameEvent('lumenAppear', { side: U.side });
}

function lumenFlare(reason) {
  const U = anom.lumen;
  U.lit = 0;
  U.dark = 0;
  setLumenStage(3);
  emitGameEvent('lumenFlare', { side: U.side, reason });
}

function lumenLeave() {
  const U = anom.lumen;
  U.interest = ANOMALY.lumen.leaveTo;
  U.rest = randomIn(ANOMALY.lumen.rest);
  anom.lastCritical = anom.clock;
  setLumenStage(0);
  emitGameEvent('lumenLeave', { side: U.side });
}

// Acender uma luz: dá-lhe sempre um pouco de interesse; perto dele, é provocação
function lumenOnLight(side) {
  if (gameOver || !anomOn('lumen')) return;
  const U = anom.lumen;
  if (U.stage >= 3) {
    loseGame('lumen');
    return;
  }
  if (U.stage === 2) {
    U.side = side || U.side;
    lumenFlare('lit');
    return;
  }
  if (!hushHolding()) U.interest = Math.min(100, U.interest + ANOMALY.lumen.jolt * (U.rest > 0 ? 0.5 : 1));
}

function updateLumen(rdt) {
  const U = anom.lumen;
  const C = ANOMALY.lumen;
  const lights = lightsOnCount();
  if (lights > 0) {
    U.stint += rdt;
    U.side = lumenSideNow();
  } else {
    U.stint = 0;
  }
  if (hushHolding()) return;           // parado enquanto o HUSH exige imobilidade
  if (powerOut) {
    if (U.stage >= 2) lumenLeave();
    U.interest = Math.max(0, U.interest - C.decay * rdt);
    if (U.stage === 1 && U.interest < C.uncueAt) setLumenStage(0);
    return;
  }
  U.rest = Math.max(0, U.rest - rdt);

  if (U.stage <= 1) {
    if (lights > 0) {
      const warm = U.stint < C.warm ? C.warmFactor : 1;
      U.interest = Math.min(100, U.interest + C.rate * lights * warm * (U.rest > 0 ? 0.5 : 1) * rdt);
    } else {
      U.interest = Math.max(0, U.interest - C.decay * rdt);
    }
    if (U.stage === 0 && U.interest >= C.cueAt) setLumenStage(1);
    else if (U.stage === 1 && U.interest < C.uncueAt) setLumenStage(0);
    if (U.interest >= C.appearAt) {
      if (lumenCanAppear() && horrorDirector.claim('lumenCritical', 'lumen')) lumenAppear();
      else U.interest = C.appearAt - 0.1;
    }
    if (U.stage === 1) {
      U.cueTimer -= rdt;
      if (U.cueTimer <= 0) {
        U.cueTimer = randomBetween(1.4, 2.8);
        emitGameEvent('lumenCue', { side: U.side, lit: lights > 0 });
      }
    }
    return;
  }

  // Presente (2) ou de asas abertas (3): só a escuridão o faz ir embora
  if (lights === 0) {
    U.lit = 0;
    U.dark += rdt;
    if (U.dark >= U.need + (U.stage === 3 ? C.flaredExtra : 0)) lumenLeave();
    return;
  }
  U.dark = 0;
  U.lit += rdt;
  if (U.stage === 2 && U.lit >= C.presentHold) lumenFlare('held');
  else if (U.stage === 3 && U.lit >= C.attackHold) loseGame('lumen');
}

function renderLumen() {
  const U = anom.lumen;
  for (const side of SIDES) {
    const here = U.stage >= 2 && U.side === side;
    const root = panoEls[side].root;
    root.classList.toggle('lu-cue', U.stage === 1);
    root.classList.toggle('lu-here', here);
    root.classList.toggle('lu-flare', here && U.stage === 3);
    anom.el.lumen[side].fig.dataset.wings = here && U.stage === 3 ? 'open' : 'closed';
  }
  ui.game.classList.toggle('an-lumen-near', U.stage >= 2);
  ui.game.classList.toggle('an-lumen-flare', U.stage === 3);
  ui.game.classList.toggle('an-lumen-cue', U.stage === 1);
}


/* ---------------------------------------------------------
   HORROR DIRECTOR
   --------------------------------------------------------- */

const ANOMALY_CLAIMS = new Set(['hushCritical', 'knockerResponse', 'latchAttach', 'lumenCritical']);

anomalyHooks.denyClaim = (kind, monsterId, target) => {
  if (!anomActive() || ANOMALY_CLAIMS.has(kind)) return false;
  // HUSH CRITICAL: ninguém começa nada enquanto tens de ficar parado
  if (hushHolding()) return true;
  // KNOCKER RESPONSE: nenhuma ameaça nova durante a sequência / resposta
  if ((anom.knocker.phase === 'knock' || anom.knocker.phase === 'answer') && THREAT_STARTS.has(kind)) return true;
  // LUMEN CRITICAL: a pedir escuridão — o Vesper (que se expulsa com luz) espera
  if (anom.lumen.stage >= 2 && kind === 'vesperHall') return true;
  // LATCH CRITICAL: ninguém chega a uma porta aberta que ele encravou; o Echo não vai à grelha com o VENT SEAL encravado
  if (kind === 'arriveDoor' && HALL_SIDE[target]) {
    const side = HALL_SIDE[target];
    if (!isSideDoorClosed(side) && latchOccupies(side === 'left' ? 'doorLeft' : 'doorRight')) return true;
  }
  if (kind === 'echoVent' && !ventSealed && latchOccupies('ventSeal')) return true;
  return false;
};

// Também contam como ameaças ativas (o maxThreats da noite inclui-as)
anomalyHooks.threats = () => {
  if (!anomActive()) return 0;
  let n = 0;
  if (anom.knocker.phase === 'knock' || anom.knocker.phase === 'answer') n++;
  if (anom.lumen.stage >= 2) n++;
  if (anom.latch.phase !== 'idle' && anom.latch.stage >= 1) n++;
  return n;
};

anomalyHooks.blocks = (control) => anomActive() && latchBlocks(control);
anomalyHooks.extraDrain = () => (anom.latch.phase === 'latched' && anom.latch.stage >= 1 ? ANOMALY.latch.extraDrain : 0);
anomalyHooks.panTarget = () => (anom.latch.phase === 'held' ? 0 : null);


/* ---------------------------------------------------------
   CICLO
   --------------------------------------------------------- */

anomalyHooks.tick = (dt) => {
  if (!anomActive()) return;
  const rdt = dt / CONFIG.speed;            // segundos reais
  anom.clock += rdt;
  if (anomOn('hush')) updateHush(rdt);
  if (gameOver) return;
  if (anomOn('knocker')) updateKnocker(rdt);
  if (gameOver) return;
  if (anomOn('latch')) updateLatch(rdt);
  if (gameOver) return;
  if (anomOn('lumen')) updateLumen(rdt);
};

function clearAnomalyVisuals(keep) {
  const E = anom.el;
  if (keep !== 'hush') {
    E.layer.querySelector('.an-hush').dataset.phase = 'idle';
    E.hush.dataset.phase = 'watch';
  }
  ui.game.classList.remove('an-hush-on', 'an-knocker-on', 'kn-answer', 'an-latch-held', 'an-lumen-near', 'an-lumen-flare', 'an-lumen-cue');
  E.hands.forEach((h) => h.classList.remove('is-on'));
  if (E.latch.parentElement !== ui.panoTrack) ui.panoTrack.appendChild(E.latch);
  E.latch.classList.add('hidden');
  E.latch.classList.remove('is-held', 'is-gone');
  clearLatchButtons();
  for (const side of SIDES) {
    panoEls[side].root.classList.remove('lu-cue', 'lu-here', 'lu-flare');
    E.lumen[side].fig.dataset.wings = 'closed';
  }
}

anomalyHooks.reset = (night) => {
  const cfg = (NIGHTS[night] && NIGHTS[night].customAnomalies) || {};
  anom.on = Object.fromEntries(ANOMALY_IDS.map((id) => [id, Boolean(cfg[id])]));
  anom.clock = 0;
  anom.lastCritical = -99;
  anom.lastPointer = null;
  anom.hush = { phase: 'idle', timer: randomIn(ANOMALY.hush.first), t: 0, need: 3, still: 0, jitter: 0, strikes: 0 };
  anom.knocker = { phase: 'idle', timer: randomIn(ANOMALY.knocker.first), t: 0, seq: [], step: 0, knocked: 0, left: 0, wrong: null, handsShown: 0, farDone: false };
  anom.latch = { phase: 'idle', timer: randomIn(ANOMALY.latch.first), t: 0, target: null, stage: 0, damaged: false, reboot: null, pointer: { x: 0.5, y: 0.3 }, offset: { x: 0, y: 0 }, pos: { x: 0.5, y: 0.3 }, sparkTimer: 0 };
  anom.lumen = { stage: 0, interest: 0, stint: 0, side: 'left', dark: 0, lit: 0, need: 3, rest: 0, cueTimer: 0 };
  clearAnomalyVisuals();
  // O MAINTENANCE SLOT só existe nas noites com o LATCH
  ui.game.classList.toggle('an-latch-night', anomOn('latch'));
  ui.game.classList.toggle('an-night', anomActive());
};

onGameEvent('lightOn', (data) => lumenOnLight(data && data.side));

// Fim de jogo: as Anomalies param (o susto de quem apanhou continua no #jumpscare)
onGameEvent('caught', (id) => {
  if (!anomActive()) return;
  clearAnomalyVisuals(id);
});
onGameEvent('nightWon', () => { if (anomActive()) clearAnomalyVisuals(); });
onGameEvent('menu', () => {
  anom.on = {};
  clearAnomalyVisuals();
  ui.game.classList.remove('an-latch-night', 'an-night');
});

buildAnomalyElements();
