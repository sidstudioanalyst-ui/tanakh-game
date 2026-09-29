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
  start: [15, 10],
  onEnter: { dialogue: 'shmuel2_people', if_flag: 'law_announced', unless_flag: 'law_people' },
  props: [
    // поля и сады жителей — окрашиваются, когда объявлен пункт о них
    { id: 'field_1', x: 10, y: 15.5, w: 4, h: 1.6, color: 0x6f8f4e, alpha: 0.7, name_he: 'שָׂדוֹת', name_ru: 'Поля' },
    { id: 'field_2', x: 15, y: 15.5, w: 4, h: 1.6, color: 0x7e9a52, alpha: 0.7 },
    { id: 'vineyard', x: 4, y: 15.5, w: 4, h: 1.6, color: 0x6b7d45, alpha: 0.7, name_he: 'כְּרָמִים', name_ru: 'Виноградники' },
    { id: 'olive', x: 21, y: 15.5, w: 3, h: 1.6, color: 0x5f7a55, alpha: 0.7, name_he: 'זֵיתִים', name_ru: 'Масличные сады' },
    // куда уходят люди, скот и урожай — «царское»
    { x: 25, y: 5.5, w: 3, h: 1.2, color: 0x8a8f99, name_he: 'מֶרְכְּבוֹת הַמֶּלֶךְ', name_ru: 'Колесницы царя' },
    { x: 26, y: 9, w: 2.4, h: 1.8, shape: 'tri', color: 0x9a7b5a, name_he: 'אֹהֶל הַמִּטְבָּח', name_ru: 'Кухня-шатёр' },
    { x: 27, y: 12.6, w: 2.6, h: 1.6, color: SHMUEL2_ROYAL, alpha: 0.85, name_he: 'בֵּית הַמֶּלֶךְ', name_ru: 'Царский дом' },
    { x: 27, y: 15.6, w: 2.6, h: 1.2, color: SHMUEL2_ROYAL, alpha: 0.5, name_he: 'מִכְלְאַת הַמֶּלֶךְ', name_ru: 'Царский загон' },
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
        members: [{ x: 5, y: 5, color: 0xb08d6a }, { x: 6, y: 5, color: 0xa3825c }, { x: 7, y: 5, color: 0xb08d6a }, { x: 6, y: 6, color: 0x9a825e }],
        change: { moves: [{ members: [0, 1, 2], to: [25, 6] }, { members: [3], to: [15, 14] }] },
        journal: { ref_ru: 'Дварим 17:16', ref_he: 'דְּבָרִים יז, טז', key: 'toast_compare_deut' },
      },
      {
        id: 'maidens', x: 6, y: 12, radius: 2.2, dialogue: 'shmuel2_maidens', doneFlag: 'law_maidens',
        members: [{ x: 5, y: 12, color: 0xd8b4a0 }, { x: 6, y: 12, color: 0xe0c0a8 }, { x: 7, y: 12, color: 0xd8b4a0 }],
        change: { moves: [{ members: [0, 1, 2], to: [26, 9], fade: true }] },
      },
      {
        id: 'farmers', x: 11, y: 14, radius: 2.2, dialogue: 'shmuel2_farmers', doneFlag: 'law_farmers',
        members: [{ x: 10, y: 14, color: 0x9c7a5b }, { x: 12, y: 14, color: 0x8c6d4f }, { x: 13, y: 13, color: 0x9c7a5b }],
        change: { recolor: ['field_1', 'field_2', 'vineyard', 'olive'], color: SHMUEL2_ROYAL },
      },
      {
        id: 'servants', x: 19, y: 5, radius: 2.2, dialogue: 'shmuel2_servants', doneFlag: 'law_servants',
        members: [{ x: 18, y: 5, color: 0xa08a6c }, { x: 20, y: 5, color: 0xa08a6c }, { x: 19, y: 6, w: 20, h: 12, color: 0x8f8f8f }, { x: 21, y: 6, w: 20, h: 12, color: 0x8f8f8f }],
        change: { moves: [{ members: [0, 1, 2, 3], to: [27, 12], fade: true }] },
      },
      {
        id: 'herders', x: 20, y: 11, radius: 2.2, dialogue: 'shmuel2_herders', doneFlag: 'law_herders',
        members: [
          { x: 19, y: 11, color: 0x8c6d4f },
          { x: 20, y: 12, w: 12, h: 9, color: 0xeceff4 }, { x: 21, y: 12, w: 12, h: 9, color: 0xeceff4 }, { x: 22, y: 11, w: 12, h: 9, color: 0xeceff4 },
          { x: 21, y: 10, w: 12, h: 9, color: 0xeceff4 }, { x: 22, y: 12, w: 12, h: 9, color: 0xeceff4 }, { x: 20, y: 10, w: 12, h: 9, color: 0xeceff4 },
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
