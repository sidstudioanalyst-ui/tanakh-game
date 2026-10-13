// Зона Г3 «Стан у Харод, сокращение войска» (Шофтим 7:1–8) — «ограниченное внимание».
// Часть 1 (при входе, narration): из 32 000 после клича «кто боится — пусть вернётся»
//   остаётся 10 000 — без выбора игрока.
// Часть 2 (механика selection): отбор у воды. Три точки на берегу с разным соотношением
//   «сторожевых» (пьют из ладони стоя, у них мелькает сигнал «взгляд по сторонам») и
//   «коленопреклонённых». За 30 с можно отметить до 30 воинов; обойти все три точки не
//   успеть. Итог: войско сокращается до 300 — независимо от выбора игрока.
// Выход ведёт в Г4 — ночной лагерь мидьянитян.
defineZone({
  id: 'g3',
  name_ru: 'Стан у Харод, сокращение войска',
  name_he: 'מַחֲנֵה עֵין חֲרֹד',
  tiles: [
    '############################################',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#.....####........................####.....#',
    '#.....####.....##..........##.....####.....#',
    '#.....####.....##..........##.....####.....#',
    '#..........................................#',
    '#..........................................#',
    '#..................##..##..................#',
    '#..................#....#...###............#',
    '#.............###..#....#...###............#',
    '#.............###..#....#...###............#',
    '#.............###..#....#...###............#',
    '#..................#....#..................#',
    '#..................#....#..................#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '############################################',
  ],
  // Тайлы окружения: стан у источника (rpg_base). Вода — полоса '~' внизу (сама по себе
  // непроходима, как и раньше); ground даёт ей берег сверху (авто-не нужен, вода сплошная
  // полоса до самых стен). Внутренние блоки '#' (тростник/тень у точек отбора) — кусты, а
  // не деревья внешней границы, чтобы не путать с оградой.
  art: {
    layers: [
      {
        name: 'ground', tileset: 'rpg_base', place: 'all',
        legend: { g: 43, b: 10, n: 11, c: 12, v: 31 }, // b/n/c — левый край/середина/правый край берега, v — вода
        rows: [
          'gggggggggggggggggggggggggggggggggggggggggggg',
          'gddddddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddddddg',
          'gdddddggggddddddddddddddddddddddddggggdddddg',
          'gdddddggggdddddggddddddddddggdddddggggdddddg',
          'gdddddggggdddddggddddddddddggdddddggggdddddg',
          'gddddddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddggddggddddddddddddddddddg',
          'gddddddddddddddddddgddddgdddgggddddddddddddg',
          'gdddddddddddddgggddgddddgdddgggddddddddddddg',
          'gdddddddddddddgggddgddddgdddgggddddddddddddg',
          'gdddddddddddddgggddgddddgdddgggddddddddddddg',
          'gddddddddddddddddddgddddgddddddddddddddddddg',
          'gddddddddddddddddddgddddgddddddddddddddddddg',
          'gbnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnncg',
          'gvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvg',
          'gvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvg',
          'gvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvg',
          'gvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvg',
          'gggggggggggggggggggggggggggggggggggggggggggg',
        ],
      },
      {
        name: 'objects', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, B: 180, K: 184 }, // a/q/z — деревья границы, B/K — кусты тростника
        rows: [
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaq',
          'z                                          a',
          'q                                          z',
          'a                                          q',
          'z     BKBK                        BKBK     a',
          'q     KBKB     BK          BK     KBKB     z',
          'a     BKBK     KB          KB     BKBK     q',
          'z                                          a',
          'q                                          z',
          'a                  BK  BK                  q',
          'z                  K    B   BKB            a',
          'q             KBK  B    K   KBK            z',
          'a             BKB  K    B   BKB            q',
          'z             KBK  B    K   KBK            a',
          'q                  K    B                  z',
          'a                  B    K                  q',
          'z                                          a',
          'q                                          z',
          'a                                          q',
          'z                                          a',
          'q                                          z',
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaq',
        ],
      },
    ],
  },
  start: [21, 3],
  onEnter: { dialogue: 'g3_muster', unless_flag: 'fearful_left' },
  selection: {
    activeFlag: 'fearful_left',
    army: { start: 32000, afterFear: 10000, final: 300 },
    seconds: 30,
    maxMarks: 30,
    markRange: 34,
    markMs: 450,
    // тач: касание засчитывается по воину в 28 px от пальца (сам воин меньше — так легче попасть),
    // если он не дальше 72 px от игрока (круг вокруг игрока показывает эту границу)
    tapRadius: 28,
    tapReach: 72,
    searchedSeconds: 3,
    // «взгляд по сторонам» у стоящих: горит 1,2 с, повтор раз в 2,2–3 с (у каждого своя фаза)
    signal: { durationMs: 1200, periodMs: [2200, 3000] },
    locations: [
      // соседние точки — в ~14 тайлах друг от друга (около 3 с ходьбы): две успеть можно,
      // три — только впопыхах, и ни одну не осмотреть полностью
      { id: 'open', label: 'loc_open', x: 3, y: 12, w: 10, h: 4, count: 16, lappers: 2 },
      { id: 'shade', label: 'loc_shade', x: 20, y: 10, w: 4, h: 6, count: 10, lappers: 6, shade: true },
      { id: 'reeds', label: 'loc_reeds', x: 31, y: 12, w: 10, h: 4, count: 14, lappers: 4 },
    ],
    doneFlag: 'army_300',
    onDone: { dialogue: 'g3_three_hundred' },
  },
  npcs: [],
  enemies: [],
  items: [],
  exits: [{ x: 26, y: 1, w: 2, to: 'g4', at: [3, 11], requires_flag: 'army_300', locked: 'locked_g3' }],
});
