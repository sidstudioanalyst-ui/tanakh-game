// Зона Й4 «От Ароэра до Авель-Керамим» (Шофтим 11:32–33) — самая динамичная зона карты.
// Механика liberation («освобождение городов», src/systems/mechanics/Liberation.js): три точки —
// три группы городов, порядок выбирает игрок. Каждая играется по-своему:
//   Ароэр       — быстрая: небольшой бой на открытом месте (7 городов);
//   Миннит      — волнами: держаться, пока идут три волны (7 городов);
//   Авель-Керамим — укреплённая: враги за стенами, вход с востока — нужно обойти (6 городов).
// Счётчик в HUD «Города: N/20». Врагов тем больше, чем меньше «Воинов Гилада» (итог диспута Й2),
// как пехота Сисры в Бр3 зависела от воинов Бр2. Взятая точка — чекпойнт: после смерти зона
// начнётся с уже освобождёнными точками.
// Итог по тексту одной строкой (11:33), без подробностей; флаг ammon_defeated, выход к Й5.
defineZone({
  id: 'yiftach_4',
  code_ru: 'Й4',
  name_ru: 'От Ароэра до Авель-Керамим',
  name_he: 'מֵעֲרוֹעֵר וְעַד אָבֵל כְּרָמִים',
  tiles: [
    '########################################',
    '#......................................#',
    '#......................................#',
    '#...............##...........########..#',
    '#...............##...........#......#..#',
    '#............................#......#..#',
    '#............................#.........#',
    '#............................#.........#',
    '#............................#......#..#',
    '#............................#......#..#',
    '#............................#......#...',
    '#............................########...',
    '#.....................##...............#',
    '#.....................##...............#',
    '#......................................#',
    '#.......##.............................#',
    '#.......##.............................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '########################################',
  ],
  // Тайлы окружения (rpg_base): открытое поле (Ароэр/Миннит) + стены Авель-Керамим —
  // укреплённая точка, вход обойти с востока (как в тексте коммента зоны выше). Стены —
  // авто-тип 'w' (CONFIG.TILESETS.rpg_base.auto.w), как дворец Эглона в А2; снаружи — деревья,
  // мелкие внутренние блоки — кусты (не стены).
  art: {
    layers: [
      {
        name: 'ground', tileset: 'rpg_base', place: 'all',
        legend: { g: 43 },
        rows: [
          'gggggggggggggggggggggggggggggggggggggggg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gdddddddddddddddggdddddddddddggggggggddg',
          'gdddddddddddddddggdddddddddddgddddddgddg',
          'gddddddddddddddddddddddddddddgddddddgddg',
          'gddddddddddddddddddddddddddddgdddddddddg',
          'gddddddddddddddddddddddddddddgdddddddddg',
          'gddddddddddddddddddddddddddddgddddddgddg',
          'gddddddddddddddddddddddddddddgddddddgddg',
          'gddddddddddddddddddddddddddddgddddddgddd',
          'gddddddddddddddddddddddddddddggggggggddd',
          'gdddddddddddddddddddddggdddddddddddddddg',
          'gdddddddddddddddddddddggdddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gdddddddggdddddddddddddddddddddddddddddg',
          'gdddddddggdddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddddddddddddg',
          'gggggggggggggggggggggggggggggggggggggggg',
        ],
      },
      {
        name: 'objects', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, B: 180, K: 184 }, // w (стены Авель-Керамим) — авто, в легенде не нужен
        rows: [
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqza',
          'q                                      z',
          'a                                      q',
          'z               KB           wwwwwwww  a',
          'q               BK           w      w  z',
          'a                            w      w  q',
          'z                            w         a',
          'q                            w         z',
          'a                            w      w  q',
          'z                            w      w  a',
          'q                            w      w   ',
          'z                            wwwwwwww   ',
          'a                     BK               q',
          'z                     KB               a',
          'q                                      z',
          'a       KB                             q',
          'z       BK                             a',
          'q                                      z',
          'a                                      q',
          'z                                      a',
          'q                                      z',
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqzaqza',
        ],
      },
    ],
  },
  start: [2, 12],
  gauges: ['gilead_warriors'],
  onEnter: { dialogue: 'yiftach4_march', unless_flag: 'yiftach4_started' },
  liberation: {
    gauge: 'gilead_warriors',
    total: 20,
    points: [
      {
        id: 'aroer',
        name_he: 'עֲרוֹעֵר',
        name_ru: 'Ароэр',
        x: 10,
        y: 10,
        radius: 2.5,
        cities: 7,
        kind: 'skirmish',
        type: 'ammonite',
        base: 4,
        extra: 3,
        spawns: [[13, 8], [14, 12], [8, 7], [12, 13], [15, 10]],
      },
      {
        id: 'minnith',
        name_he: 'מִנִּית',
        name_ru: 'Миннит',
        x: 17,
        y: 17,
        radius: 2.5,
        cities: 7,
        kind: 'waves',
        type: 'ammonite',
        waves: [2, 3, 4],
        extra: 2, // к каждой волне — до +2 при нехватке воинов
        interval: 700,
        pause: 2500,
        // рядом с точкой (17,17), а не по всей карте — иначе врагов приходится искать (было
        // [3,19]/[30,19]: за 13+ клеток от боя, у самых краёв карты)
        spawns: [[14, 15], [20, 15], [14, 19], [20, 19], [17, 20]],
      },
      {
        id: 'abel',
        name_he: 'אָבֵל כְּרָמִים',
        name_ru: 'Авель-Керамим',
        x: 33,
        y: 7,
        radius: 5,
        labelBelow: true, // подпись под кругом: над ним — HUD
        cities: 6,
        kind: 'fort',
        type: 'ammonite',
        base: 5,
        extra: 3,
        spawns: [[31, 5], [34, 5], [31, 9], [34, 9], [32, 7], [35, 8]],
      },
    ],
    doneFlag: 'ammon_defeated',
    onDone: { dialogue: 'yiftach4_victory' },
  },
  props: [
    { x: 33, y: 2, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'חוֹמָה', name_ru: 'Стены' },
  ],
  npcs: [],
  enemies: [],
  // лепёшки у Миннита (самый долгий бой — три волны): можно пополнить здоровье прямо в бою
  items: [
    { id: 'bread', x: 15, y: 16 },
    { id: 'bread', x: 19, y: 18 },
    { id: 'bread', x: 17, y: 19 },
  ],
  exits: [{ x: 39, y: 10, h: 2, to: 'yiftach_5', at: [11, 8], requires_flag: 'ammon_defeated', locked: 'locked_yiftach_4' }],
});
