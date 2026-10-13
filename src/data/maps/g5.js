// Зона Г5 «Погоня, переправы, конфликт с Эфраимом» (Шофтим 7:23–8:3).
// Часть 1 — бой волнами за переправы Иордана: мидьянитяне бегут к трём бродам, их нужно
//   перехватить. Заметно легче А5 (это уже вторая удача в игре): враги медленнее и слабее,
//   волны меньше, пропустить можно троих.
// Часть 2 — сразу после победы разговор с разгневанными эфраимитами (их не позвали раньше).
//   Тон ответа — мягкий (как в Шофтим 8:2–3) или жёсткий (не из текста). Жёсткий ответ здесь
//   ни к чему не ведёт сюжетно: он только записан флагом ephraim_harsh (для будущего Суда).
defineZone({
  id: 'g5',
  name_ru: 'Погоня, переправы, конфликт с Эфраимом',
  name_he: 'הַמִּרְדָּף, הַמַּעְבָּרוֹת וְרִיב אֶפְרַיִם',
  tiles: [
    '##############################',
    '#...................~~.......#',
    '#...................~~.......#',
    '#............................#',
    '#............................#',
    '#.......##..........~~.......#',
    '#.......##..........~~.......#',
    '#...................~~.......#',
    '#.............................',
    '#.............................',
    '#...................~~.......#',
    '#...........##......~~.......#',
    '#...........##......~~.......#',
    '#............................#',
    '#............................#',
    '#...................~~.......#',
    '#...................~~.......#',
    '##############################',
  ],
  // Тайлы окружения: Иордан (rpg_base). Три отрезка воды — те же, что '~' в tiles; разрывы
  // между ними — броды (как и раньше, проходимость из tiles, тут только картинка). Блок
  // 'вода с берегом' тот же, что в А4/Г3, просто уже (два столбца вместо трёх).
  art: {
    layers: [
      {
        name: 'ground', tileset: 'rpg_base', place: 'all',
        legend: { g: 43, '1': 10, '2': 12, '3': 50, '4': 52, '5': 30, '6': 32 },
        rows: [
          'gggggggggggggggggggggggggggggg',
          'gddddddddddddddddddd12dddddddg',
          'gddddddddddddddddddd34dddddddg',
          'gddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddg',
          'gdddddddggdddddddddd12dddddddg',
          'gdddddddggdddddddddd56dddddddg',
          'gddddddddddddddddddd34dddddddg',
          'gddddddddddddddddddddddddddddd',
          'gddddddddddddddddddddddddddddd',
          'gddddddddddddddddddd12dddddddg',
          'gdddddddddddggdddddd56dddddddg',
          'gdddddddddddggdddddd34dddddddg',
          'gddddddddddddddddddddddddddddg',
          'gddddddddddddddddddddddddddddg',
          'gddddddddddddddddddd12dddddddg',
          'gddddddddddddddddddd34dddddddg',
          'gggggggggggggggggggggggggggggg',
        ],
      },
      {
        name: 'objects', tileset: 'rpg_base', place: 'walls',
        legend: { a: 220, q: 222, z: 224, B: 180, K: 184 },
        rows: [
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqz',
          'a                            q',
          'z                            a',
          'q                            z',
          'a                            q',
          'z       KB                   a',
          'q       BK                   z',
          'a                            q',
          'z                             ',
          'a                             ',
          'q                            z',
          'a           KB               q',
          'z           BK               a',
          'q                            z',
          'a                            q',
          'z                            a',
          'q                            z',
          'aqzaqzaqzaqzaqzaqzaqzaqzaqzaqz',
        ],
      },
    ],
  },
  start: [18, 8],
  // первый вход — коротко о погоне; после победы (если разговор ещё не был) — эфраимиты
  onEnter: [
    { dialogue: 'g5_ephraim', if_flag: 'crossings_held', unless_flag: 'ephraim_done' },
    { dialogue: 'g5_pursuit', unless_flag: 'crossings_held' },
  ],
  waves: {
    spawns: [[1, 3], [1, 14], [1, 8]],
    goal: { x: 25, y: 1, w: 3, h: 16 },
    list: [
      { type: 'midianite', count: 3, interval: 1400 },
      { type: 'midianite', count: 4, interval: 1200 },
      { type: 'midianite', count: 5, interval: 1000 },
    ],
    startDelay: 3500,
    pause: 4500,
    allowed: { base: 3 },
    winFlag: 'crossings_held',
    winToast: 'toast_crossings_held',
    failKey: 'fail_crossings',
    onWin: { dialogue: 'g5_ephraim', delay: 1300 },
  },
  props: [
    // эфраимиты ждут на восточном берегу; в разговоре их группа выделена
    { x: 26, y: 5, w: 2.2, h: 1.4, color: 0x8fa3bf, alpha: 0.85, name_he: 'אַנְשֵׁי אֶפְרַיִם', name_ru: 'Мужи Эфраима', speaker: 'ephraim' },
  ],
  npcs: [],
  enemies: [],
  items: [],
  exits: [{ x: 29, y: 8, h: 2, to: 'g6', at: [3, 8], requires_flag: 'ephraim_done', locked: 'locked_g5' }],
});
