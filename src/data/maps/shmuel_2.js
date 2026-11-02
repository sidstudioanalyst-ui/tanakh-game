// Зона Ш2 «Право царя» (Шмуэль алеф 8:10–20). Механика village (src/systems/mechanics/Village.js).
// «Тихая» зона (calm). Шмуэль стоит на площади деревни, вокруг — пять групп жителей. К каждой он
// подходит и объявляет пункт «права царя» по 8:11–17: сказать прямо, как в тексте, или
// предупредить резче (резкая добавка — наша, не текст). Исход не меняется. Каждый объявленный
// пункт меняет деревню на глазах (без насилия): парней уводят к колесницам, девушки уходят в
// кухню-шатёр, поля окрашиваются в «царский» цвет, слуги и ослы уходят к царскому дому, часть
// скота отгоняют. Пункт о колесницах и всадниках — запись в журнал «Сравни: Дварим 17:16 (о
// конях)»; другие пункты с Дварим 17 не сравниваются.
// Когда объявлено всё — народ собирается на площади: предостережение 8:18 (без выбора), ответ
// народа 8:19–20, затем «Дальше» или панель «Комментаторы» (COMMENTARY.kingslaw). Выход в Ш3.
// tally: резче предупредил хотя бы три группы — +1 свет «справедливости к слабым».
const SHMUEL2_ROYAL = 0x7b5ea7; // «царский» цвет полей
// Фигуры жителей: картинки (tools/build_prop_sprites.py); нет файла — цветной прямоугольник (Village.js)
const VY = (x, y) => ({ x, y, w: 20, h: 30, icon: 'assets/props/villager_youth.png', color: 0xb08d6a });
const VM = (x, y) => ({ x, y, w: 16, h: 31, icon: 'assets/props/villager_maiden.png', color: 0xd8b4a0 });
const VF = (x, y) => ({ x, y, w: 16, h: 30, icon: 'assets/props/villager_farmer.png', color: 0x9c7a5b });
const VS = (x, y) => ({ x, y, w: 18, h: 31, icon: 'assets/props/villager_servant.png', color: 0xa08a6c });
const VH = (x, y) => ({ x, y, w: 22, h: 30, icon: 'assets/props/villager_herder.png', color: 0x8c6d4f });
const VW = (x, y) => ({ x, y, w: 20, h: 16, icon: 'assets/props/shield.png', color: 0x8f8f8f }); // снаряжение для колесниц
const VSheep = (x, y) => ({ x, y, w: 16, h: 12, icon: 'assets/props/sheep.png', color: 0xeceff4 });
defineZone({
  id: 'shmuel_2',
  code_ru: 'Ш2',
  part: 'b',
  calm: true,
  name_ru: 'Право царя',
  name_he: 'מִשְׁפַּט הַמֶּלֶךְ',
  tiles: [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#.............................',
    '#.............................',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  // Тайлы окружения: деревенская площадь (tiny_town, как Ш1/Г6) — открытое поле без внутренних построек,
  // всё действие в props/village.
  art: {
    tileset: 'tiny_town',
    ground: [
      '..*,.......,........**......,*',
      '.,...,.........,..............',
      '..,..,...........,...*...,.*..',
      ',.,..,,...*.,.,.*.*..,,..*.,*.',
      '..,.*........,..,..,...,....*.',
      ',**,,.....,.........**.,.,,,,,',
      '....,......*..,,........*.,...',
      '*...,.*...*.,.....,,,....*....',
      '...........,.......,..,.*,...,',
      '.,....,...,..........,.*..,...',
      '..........,.....*.....*.....,.',
      '.,..,.,.....,.**.........**.,.',
      '.....,,...*............*......',
      '.,.......,.,..,....*.,........',
      ',,,....,.....................,',
      '....,.,*.......,....,..,,,....',
      ',,....*,...,..................',
      '...*,.,...*..*,.,,.,..*.,..,.*',
    ],
    objects: [
      'ffffffffffffffffffffffffffffff',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                             ',
      'f                             ',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'f                            f',
      'ffffffffffffffffffffffffffffff',
    ],
    legend: {
      '.': 0, ',': 1, '*': 2, // трава: сплошная, с травинками, с цветами
      // f — забор по границе, авто (CONFIG.TILESETS.tiny_town.auto)
    },
  },
  start: [15, 10],
  onEnter: { dialogue: 'shmuel2_people', if_flag: 'law_announced', unless_flag: 'law_people' },
  props: [
    // поля и сады жителей — окрашиваются, когда объявлен пункт о них
    { id: 'field_1', x: 10, y: 15.5, w: 4, h: 1.6, icon: 'assets/props/field.png', color: 0x6f8f4e, name_he: 'שָׂדוֹת', name_ru: 'Поля' },
    { id: 'field_2', x: 15, y: 15.5, w: 4, h: 1.6, icon: 'assets/props/field.png', color: 0x7e9a52 },
    { id: 'vineyard', x: 4, y: 15.5, w: 4, h: 1.6, icon: 'assets/props/vineyard.png', color: 0x6b7d45, name_he: 'כְּרָמִים', name_ru: 'Виноградники' },
    { id: 'olive', x: 21, y: 15.5, w: 3, h: 1.6, icon: 'assets/props/olive.png', color: 0x5f7a55, name_he: 'זֵיתִים', name_ru: 'Масличные сады' },
    // куда уходят люди, скот и урожай — «царское»
    { x: 25, y: 5.5, w: 2.3, h: 1.7, icon: 'assets/props/chariots_royal.png', color: 0x8a8f99, name_he: 'מֶרְכְּבוֹת הַמֶּלֶךְ', name_ru: 'Колесницы царя' },
    { x: 26, y: 9, w: 2.4, h: 1.9, icon: 'assets/props/tent.png', shape: 'tri', color: 0x9a7b5a, name_he: 'אֹהֶל הַמִּטְבָּח', name_ru: 'Кухня-шатёр' },
    { x: 27, y: 12.6, w: 3, h: 3, icon: 'assets/props/house_red.png', color: SHMUEL2_ROYAL, name_he: 'בֵּית הַמֶּלֶךְ', name_ru: 'Царский дом' },
    { x: 27, y: 15.8, w: 3, h: 3, icon: 'assets/props/pen.png', color: SHMUEL2_ROYAL, name_he: 'מִכְלְאַת הַמֶּלֶךְ', name_ru: 'Царский загон' },
    // подписи групп
    { x: 6, y: 3.6, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'בַּחוּרִים', name_ru: 'Парни' },
    { x: 6, y: 10.6, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'נְעָרוֹת', name_ru: 'Девушки' },
    { x: 11, y: 12.6, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'אִכָּרִים', name_ru: 'Крестьяне' },
    { x: 19, y: 3.6, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'עֲבָדִים', name_ru: 'Слуги' },
    { x: 20, y: 9.6, w: 0.1, h: 0.1, color: 0x000000, alpha: 0, name_he: 'רוֹעֵי צֹאן', name_ru: 'Скотоводы' },
  ],
  village: {
    plaza: [14, 8],
    groups: [
      {
        id: 'youth', x: 6, y: 5, radius: 2.2, dialogue: 'shmuel2_youth', doneFlag: 'law_youth',
        members: [VY(5, 5), VY(6, 5), VY(7, 5), VY(6, 6)],
        change: { moves: [{ members: [0, 1, 2], to: [25, 6] }, { members: [3], to: [15, 14] }] },
        journal: { ref_ru: 'Дварим 17:16', ref_he: 'דְּבָרִים יז, טז', key: 'toast_compare_deut' },
      },
      {
        id: 'maidens', x: 6, y: 12, radius: 2.2, dialogue: 'shmuel2_maidens', doneFlag: 'law_maidens',
        members: [VM(5, 12), VM(6, 12), VM(7, 12)],
        change: { moves: [{ members: [0, 1, 2], to: [26, 9], fade: true }] },
      },
      {
        id: 'farmers', x: 11, y: 14, radius: 2.2, dialogue: 'shmuel2_farmers', doneFlag: 'law_farmers',
        members: [VF(10, 14), VF(12, 14), VF(13, 13)],
        change: { recolor: ['field_1', 'field_2', 'vineyard', 'olive'], color: SHMUEL2_ROYAL },
      },
      {
        id: 'servants', x: 19, y: 5, radius: 2.2, dialogue: 'shmuel2_servants', doneFlag: 'law_servants',
        members: [VS(18, 5), VS(20, 5), VW(19, 6), VW(21, 6)],
        change: { moves: [{ members: [0, 1, 2, 3], to: [27, 12], fade: true }] },
      },
      {
        id: 'herders', x: 20, y: 11, radius: 2.2, dialogue: 'shmuel2_herders', doneFlag: 'law_herders',
        members: [
          VH(19, 11),
          VSheep(20, 12), VSheep(21, 12), VSheep(22, 11),
          VSheep(21, 10), VSheep(22, 12), VSheep(20, 10),
        ],
        change: { moves: [{ members: [1, 3, 5], to: [27, 15] }] },
      },
    ],
    doneFlag: 'law_announced',
    onDone: { dialogue: 'shmuel2_people' },
  },
  tally: { flags: ['law_youth_sharp', 'law_maidens_sharp', 'law_farmers_sharp', 'law_servants_sharp', 'law_herders_sharp'], need: 3, effects: { justice: 1 }, flag: 'law_sharp_counted' },
  npcs: [],
  enemies: [],
  items: [],
  exits: [{ x: 29, y: 8, h: 2, to: 'shmuel_3', at: [4, 8], requires_flag: 'law_people', locked: 'locked_shmuel_2' }],
});
