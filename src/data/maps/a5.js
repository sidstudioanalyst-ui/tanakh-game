// Зона А5 «Броды Иордана». Моавитяне бегут с запада к бродам, чтобы уйти на восточный
// берег. Эхуд с воинами держит броды. Сколько врагов можно пропустить, зависит от шкалы
// «Собранные воины»: 1 + по одному на каждые 100 воинов (они стерегут другие переправы).
// После трёх волн — заставка и часть Б карты: Барак (Бр1).
defineZone({
  id: 'a5',
  name_ru: 'Броды Иордана',
  name_he: 'מַעְבְּרוֹת הַיַּרְדֵּן',
  tiles: [
    '##############################',
    '#................~~~.........#',
    '#................~~~.........#',
    '#.....##.........~~~.........#',
    '#.....##.....................#',
    '#............................#',
    '#................~~~.........#',
    '#................~~~.........#',
    '#................~~~...##....#',
    '#.........##.....~~~...##....#',
    '#.........##.....~~~.........#',
    '#................~~~.........#',
    '#............................#',
    '#.....##.....................#',
    '#.....##.........~~~.........#',
    '#................~~~.........#',
    '#................~~~.........#',
    '##############################',
  ],
  // Тайлы окружения (rpg_base): открытая трава + Иордан. Три полосы '~' (как в tiles) —
  // тот же приём, что в Г3/Г5: вода рисуется в objects layer (не в floor, он просто продолжает
  // травой — вода полностью её закрывает), 3×3-блок «пруд» из листа (10/11/12 — верхняя кромка
  // берега слева/по центру/справа, 30/31/32 — открытая вода, 50/51/52 — нижняя кромка),
  // с разрывами между полосами — это и есть сами броды. Внутренние '#' (кусты/камни у троп) —
  // B/K, как и везде; внешняя стена — деревья aqz.
  art: {
    layers: [
      {
        name: 'floor', tileset: 'rpg_base', place: 'all',
        legend: { g: 43, t: 44 },
        rows: [
          'tggggggggggtggggggggggtggggggg',
          'ggggggtggggggggggtggggggggggtg',
          'gtggggggggggtggggggggggtgggggg',
          'gggggggtggggggggggtggggggggggt',
          'ggtggggggggggtggggggggggtggggg',
          'ggggggggtggggggggggtgggggggggg',
          'gggtggggggggggtggggggggggtgggg',
          'gggggggggtggggggggggtggggggggg',
          'ggggtggggggggggtggggggggggtggg',
          'ggggggggggtggggggggggtgggggggg',
          'gggggtggggggggggtggggggggggtgg',
          'tggggggggggtggggggggggtggggggg',
          'ggggggtggggggggggtggggggggggtg',
          'gtggggggggggtggggggggggtgggggg',
          'gggggggtggggggggggtggggggggggt',
          'ggtggggggggggtggggggggggtggggg',
          'ggggggggtggggggggggtgggggggggg',
          'gggtggggggggggtggggggggggtgggg',
        ],
      },
      {
        name: 'objects', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, B: 180, K: 184, '1': 10, '2': 11, '3': 12, '4': 30, '5': 31, '6': 32, '7': 50, '8': 51, '9': 52 },
        rows: [
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqz',
          'q                123         a',
          'z                456         q',
          'a     KB         789         z',
          'q     BK                     a',
          'z                            q',
          'a                123         z',
          'q                456         a',
          'z                456   KB    q',
          'a         KB     456   BK    z',
          'q         BK     456         a',
          'z                789         q',
          'a                            z',
          'q     KB                     a',
          'z     BK         123         q',
          'a                456         z',
          'q                789         a',
          'zaqzaqzaqzaqzaqzaqzaqzaqzaqzaq',
        ],
      },
    ],
  },
  start: [22, 8],
  gauges: ['warriors'],
  waves: {
    spawns: [[1, 4], [1, 12], [1, 8]],
    goal: { x: 27, y: 1, w: 2, h: 16 },
    list: [
      { type: 'moabite', count: 4, interval: 1100 },
      { type: 'moabite', count: 7, interval: 700 },
      { type: 'moabite', count: 9, interval: 550 },
    ],
    startDelay: 3000,
    pause: 4000,
    allowed: { base: 1, gauge: 'warriors', per: 100 },
    winFlag: 'fords_held',
    // после победы: ~1 с сцены «Броды удержаны!», затем заставка «Прошло время…» и часть Б (Барак)
    onWin: { to: 'barak_1', at: [3, 8], intro: 'barak_intro', delay: 1100 },
  },
  enemies: [],
  items: [],
  npcs: [],
  exits: [{ x: 28, y: 16, to: 'barak_1', at: [3, 8], requires_flag: 'fords_held', locked: 'locked_a5' }],
});
