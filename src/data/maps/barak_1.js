// «Спасители», часть Б (Барак, Шофтим 4). Зона Бр1 «Под пальмой Деворы» (4:4–10).
// id зон части Б — barak_1…barak_4, коды в подписях — Бр1–Бр4: не путать с Б1–Б2 карты 2.
// Перед зоной — заставка «Прошло время…» (barak_intro, после победы в А5).
// Двора — пророчица и судья, NPC-советница (играть за неё нельзя). Она велит собрать десять
// тысяч из Нафтали и Звулуна. Ответ Барака — выбор игрока (см. barak1_deborah.json):
//   (а) идти без неё, (б) потребовать, чтобы пошла с ним (так в тексте), (в) отказаться —
//   тогда Двора возвращает его к поручению и снова спрашивает (а) или (б).
defineZone({
  id: 'barak_1',
  code_ru: 'Бр1',
  part: 'b',
  name_ru: 'Под пальмой Деворы',
  name_he: 'תֹּמֶר דְּבוֹרָה',
  tiles: [
    '########################',
    '#......................#',
    '#......................#',
    '#...##...........#.....#',
    '#...##...........#.....#',
    '#......................#',
    '#......................#',
    '#.......................',
    '#.......................',
    '#......................#',
    '#......................#',
    '#.................##...#',
    '#.................##...#',
    '#......................#',
    '#......................#',
    '########################',
  ],
  // Тайлы окружения: открытая местность под пальмой (rpg_base, как в А4/Й2).
  art: {
    layers: [
      {
        name: 'floor', tileset: 'rpg_base', place: 'all',
        legend: { g: 43, t: 44 },
        rows: [
          'tggggggggggtggggggggggtg',
          'ggggggtggggggggggtgggggg',
          'gtggggggggggtggggggggggt',
          'gggggggtggggggggggtggggg',
          'ggtggggggggggtgggggggggg',
          'ggggggggtggggggggggtgggg',
          'gggtggggggggggtggggggggg',
          'gggggggggtggggggggggtggg',
          'ggggtggggggggggtgggggggg',
          'ggggggggggtggggggggggtgg',
          'gggggtggggggggggtggggggg',
          'tggggggggggtggggggggggtg',
          'ggggggtggggggggggtgggggg',
          'gtggggggggggtggggggggggt',
          'gggggggtggggggggggtggggg',
          'ggtggggggggggtgggggggggg',
        ],
      },
      {
        name: 'walls', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, B: 180, K: 184 },
        rows: [
          'aqzaqzaqzaqzaqzaqzaqzaqz',
          'q                      a',
          'z                      q',
          'a   KB           B     z',
          'q   BK           K     a',
          'z                      q',
          'a                      z',
          'q                       ',
          'z                       ',
          'a                      z',
          'q                      a',
          'z                 KB   q',
          'a                 BK   z',
          'q                      a',
          'z                      q',
          'aqzaqzaqzaqzaqzaqzaqzaqz',
        ],
      },
    ],
  },
  start: [3, 8],
  props: [
    // пальма: крона и ствол
    { x: 12, y: 6.2, w: 0.4, h: 1.6, color: 0x8a6d3b },
    { x: 12, y: 5, w: 2.4, h: 1.4, shape: 'circle', color: 0x5e8a4a, name_he: 'תֹּמֶר דְּבוֹרָה', name_ru: 'Пальма Деворы' },
  ],
  npcs: [
    { id: 'deborah', x: 12, y: 8, dialogue: 'barak1_deborah', color: 0xd8c3a5, name_he: 'דְּבוֹרָה', name_ru: 'Двора', sprite: 'deborah' },
  ],
  enemies: [],
  items: [],
  exits: [{ x: 23, y: 7, h: 2, to: 'barak_2', at: [2, 8], requires_flag: 'barak_task', locked: 'locked_barak_1' }],
});
