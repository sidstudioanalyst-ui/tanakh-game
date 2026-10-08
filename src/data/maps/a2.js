// Зона А2 «Приём у Эглона» — скрытность.
// Кинжал у Эхуда всё время, поэтому любой страж, который его увидит, проваливает сцену.
// Путь 1 (кинжал на правом бедре): досмотр у ворот пройден — ворота открываются,
//   дальше тронный зал с колоннами (один страж) и прихожая горницы (ещё один).
// Путь 2 (кинжал на левом бедре): страж у ворот нашёл бы его — остаётся длинный служебный
//   коридор с нишами (один страж), а затем та же прихожая.
// В горнице — диалог с Эглоном; развязка — затемнение и строка текста, затем побег (А3).
defineZone({
  id: 'a2',
  name_ru: 'Приём у Эглона',
  name_he: 'קַבָּלַת פָּנִים אֵצֶל עֶגְלוֹן',
  tiles: [
    '##############################',
    '#######.####.####.############',
    '##..........................##',
    '##..........................##',
    '##..##################......##',
    '##..###..............#......##',
    '#.....#..............#......##',
    '#.....#...#...#......#......##',
    '#................#...#......##',
    '#...........................##',
    '#.....#.....................##',
    '#.....#...#...#......####.####',
    '#######..........#...#......##',
    '#######..............#......##',
    '#######..............#......##',
    '######################......##',
    '##############################',
  ],
  // Тайлы окружения (README «Тайлы окружения»): дворец — песчаник Kenney RPG base, ковры и
  // декор — Kenney Roguelike Indoor. Только картинка поверх tiles: коллизии из tiles.
  art: {
    layers: [
      {
        // песчаник; серый камень — служебный коридор и ниши
        name: 'floor', tileset: 'rpg_base', place: 'all',
        legend: { s: 101, g: 110 },
        rows: [
          'gggggggggggggggggggggggggggggg',
          'gggggggggggggggggggggggggggggg',
          'gggggggggggggggggggggggggggggg',
          'gggggggggggggggggggggggggggggg',
          'ssggssssssssssssssssssssssssss',
          'ssggssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
          'ssssssssssssssssssssssssssssss',
        ],
      },
      {
        // красная и зелёная дорожки: кромка, середина, кромка (левая — отражённая правая)
        name: 'carpets', tileset: 'roguelike_indoor', place: 'floor',
        legend: { '<': '25x', m: 24, '>': 25, '[': '133x', '=': 132, ']': 133 },
        rows: [
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '           <m>                ',
          '           <m>                ',
          '           <m>                ',
          '           <m>                ',
          '           <m>                ',
          '           <m>                ',
          '           <m>                ',
          '           <m>          [=]   ',
          '           <m>          [=]   ',
          '           <m>          [=]   ',
          '                              ',
          '                              ',
        ],
      },
      {
        // w — стена: верх / лицо подбираются сами (CONFIG.TILESETS.rpg_base.auto)
        name: 'walls', tileset: 'rpg_base', place: 'walls',
        legend: {},
        rows: [
          'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
          'wwwwwww wwww wwww wwwwwwwwwwww',
          'ww                          ww',
          'ww                          ww',
          'ww  wwwwwwwwwwwwwwwwww      ww',
          'ww  www              w      ww',
          'w     w              w      ww',
          'w     w   w   w      w      ww',
          'w                w   w      ww',
          'w                           ww',
          'w     w                     ww',
          'w     w   w   w      wwww wwww',
          'wwwwwww          w   w      ww',
          'wwwwwww              w      ww',
          'wwwwwww              w      ww',
          'wwwwwwwwwwwwwwwwwwwwww      ww',
          'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        ],
      },
      {
        // золотой канделябр, растение в горшке — на «лице» стены, не на полу
        name: 'decor', tileset: 'roguelike_indoor', place: 'walls', cover: false,
        legend: { C: 206, P: 16 },
        rows: [
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '         C      C             ',
          ' P   P                        ',
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '                       C   C  ',
          '                              ',
          '                              ',
          '                              ',
          '                              ',
          '                              ',
        ],
      },
    ],
  },
  start: [2, 9],
  doors: [{ id: 'main_gate', tiles: [[6, 8], [6, 9]] }],
  triggers: [{ x: 4, y: 8, w: 2, h: 2, dialogue: 'a2_inspection' }],
  npcs: [
    // страж ворот — копейщик (спрайт), стоит лицом к месту досмотра
    { id: 'gate_guard', x: 5, y: 7, dialogue: 'a2_inspection', color: 0xb48ead, sprite: 'guard_spear', facing: 'down' },
    { id: 'eglon', x: 25, y: 14, dialogue: 'a2_eglon', color: 0xd08770, name_he: 'עֶגְלוֹן', name_ru: 'Эглон' },
  ],
  // стража (sprite): у ворот и в служебном коридоре — копейщики, ближе к царю (тронный зал,
  // прихожая горницы) — мечники; почему так — README «Стража дворца»
  guards: [
    // тронный зал: обход по кругу вдоль стен — мечник
    { x: 8, y: 6, facing: 'right', patrol: [[8, 6], [19, 6], [19, 13], [8, 13]], loop: true, sprite: 'guard_sword' },
    // прихожая горницы: вверх-вниз вдоль восточной стены — мечник
    { x: 26, y: 5, facing: 'down', patrol: [[26, 5], [26, 9]], speed: 40, sprite: 'guard_sword' },
    // служебный коридор: туда-обратно — копейщик
    { x: 4, y: 2, facing: 'right', patrol: [[4, 2], [24, 2]], speed: 55, sprite: 'guard_spear' },
  ],
  enemies: [],
  items: [],
  exits: [],
});
