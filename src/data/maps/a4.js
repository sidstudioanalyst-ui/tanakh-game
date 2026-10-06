// Зона А4 «Нагорье Эфраима». Эхуд трубит в шофар и собирает воинов.
// Шкала «Собранные воины» растёт от удачных ответов в разговорах с тремя группами.
// Без шофара воины не слушают; к бродам (А5) можно идти только с шофаром.
defineZone({
  id: 'a4',
  name_ru: 'Нагорье Эфраима',
  name_he: 'הַר אֶפְרָיִם',
  tiles: [
    '##############################',
    '#............................#',
    '#...................###......#',
    '#....###............###......#',
    '#....###............###......#',
    '#....###.....................#',
    '#................##..........#',
    '#................##..........#',
    '..............................',
    '............###...............',
    '#...........###..............#',
    '#...........###.......###....#',
    '#...........###.......###....#',
    '#.......##............###....#',
    '#.......##...................#',
    '#.......##...................#',
    '#............................#',
    '##############################',
  ],
  // Тайлы окружения (README «Тайлы окружения»): открытая местность — Kenney RPG base.
  // Только картинка поверх tiles: коллизии из tiles.
  art: {
    layers: [
      {
        // трава (t — с кустиком); d — дорога от входа к бродам, края по соседям (CONFIG.TILESETS.rpg_base.auto)
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
          'gggggggggtdddddddgggtggggggggg',
          'dddddddddddddddddddddddddddddd',
          'ddddddddddddgggddddddddddddddd',
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
        // кромка рощи и кусты по краю; рощи: крона (A, Q, Z) над стволом (a, q, z), внизу куст; 1–9 — родник с берегом
        name: 'walls', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, A: 200, Q: 202, Z: 204, B: 180, K: 184, b: '180x', k: '184x', 1: 10, 2: 11, 3: 12, 4: 30, 5: 31, 6: 32, 7: 50, 8: 51, 9: 52 },
        rows: [
          'aqzaazaqaaqzaqzaazaqaaqzaqzaaz',
          'K                            b',
          'b                   ZAZ      k',
          'k    AZA            zaz      B',
          'B    aza            BKB      K',
          'K    BKB                     b',
          'b                AQ          k',
          'k                aq          B',
          '                              ',
          '            123               ',
          'b           456              k',
          'k           456       AZA    B',
          'B           789       aza    K',
          'K       ZA            BKB    b',
          'b       za                   k',
          'k       BK                   B',
          'B                            K',
          'AQZAAZAQAAQZAQZAAZAQAAQZAQZAAZ',
        ],
      },
    ],
  },
  start: [1, 8],
  gauges: ['warriors'], // показывать шкалу «Собранные воины» в HUD
  items: [{ id: 'shofar', x: 26, y: 2 }],
  npcs: [
    { id: 'ephraim_young', x: 10, y: 4, dialogue: 'a4_young', color: 0xa3be8c },
    { id: 'ephraim_farmers', x: 3, y: 15, dialogue: 'a4_farmers', color: 0xd4b8e0 }, // не жёлтый — жёлтый у Эхуда
    { id: 'ephraim_veteran', x: 26, y: 14, dialogue: 'a4_veteran', color: 0x81a1c1 },
  ],
  enemies: [{ type: 'bandit', x: 16, y: 15 }],
  exits: [{ x: 29, y: 8, h: 2, to: 'a5', at: [22, 8], requires_item: 'shofar', locked: 'locked_a4' }],
});
