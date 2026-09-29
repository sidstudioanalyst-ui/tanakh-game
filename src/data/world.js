// Мир: карты (главы) и реестр зон.
// Карта состоит из нескольких зон. Каждая зона описана в своём файле src/data/maps/<id>.js
// и регистрируется через defineZone(). В конце карты — выход к экрану «Суд».
const ZONES = {};

function defineZone(zone) {
  if (ZONES[zone.id]) console.warn(`Зона "${zone.id}" описана дважды`);
  ZONES[zone.id] = zone;
}

// Все id диалогов, упомянутые в зоне (любое поле dialogue на любой глубине, кроме тайлов)
function zoneDialogueIds(zone) {
  const ids = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, x]) => {
        if ((k === 'dialogue' || k === 'intro') && typeof x === 'string') ids.push(x); // intro — заставка перехода
        else if (k !== 'tiles') walk(x);
      });
    }
  };
  walk(zone);
  return ids;
}

// Кампании — упорядоченные списки карт. Мерило, экипировка и флаги переходят с карты на карту
// внутри кампании. По умолчанию играется 'saviors', тестовые карты — по ?map=demo.
//
// Поля карты:
//   zones / startZone — зоны карты и стартовая
//   trial             — id суда (src/data/trials/<id>.json) или null, если Суд ещё не написан
//   hero              — за кого играет игрок (имя в HUD, цвет квадрата; alias — прозвище по флагу)
//   gauges            — шкалы карты (растут через effects: { gauge: { <id>: n } })
//   restartOnDeath    — 'zone' (начать зону заново) или 'map' (всю карту; по умолчанию)
//   parts             — части карты со своим названием и героем: { b: { name_he, name_ru, hero,
//                       freshEquipment? } }; зона относится к части полем part: 'b' (в HUD — название
//                       части). freshEquipment: в первой зоне части герой начинает без прежних вещей
//   freshEquipment    — герой карты начинает без вещей прежних героев (Йифтах; как у части Барака)
//   intro             — заставка перед картой: id диалога из narration-реплик (контекст эпохи).
//                       Показывается при каждом начале карты, в том числе после «Начать заново».
const CAMPAIGNS = {
  saviors: [
    {
      id: 'saviors_a',
      name_ru: 'Спасители · А: Эхуд',
      name_he: 'הַמּוֹשִׁיעִים · א: אֵהוּד',
      // часть А (Эхуд): А1–А5; часть Б (Барак, Шофтим 4): Бр1–Бр4 (id barak_1…barak_4 —
      // не путать с Б1–Б2 карты 2), затем Суд карты 1
      zones: ['a1', 'a2', 'a3', 'a4', 'a5', 'barak_1', 'barak_2', 'barak_3', 'barak_4'],
      startZone: 'a1',
      trial: 'saviors', // src/data/trials/saviors.json — после Бр4
      hero: { name_ru: 'Эхуд, сын Геры', name_he: 'אֵהוּד בֶּן גֵּרָא', color: 0xe5c07b },
      gauges: {
        warriors: { label: 'gauge_warriors', max: 300 },
        barak_warriors: { label: 'gauge_barak', max: 10000 }, // Нафтали и Звулун (Бр2)
      },
      restartOnDeath: 'zone',
      intro: 'intro_saviors',
      parts: {
        b: {
          name_ru: 'Спасители · Б: Барак',
          name_he: 'הַמּוֹשִׁיעִים · ב: בָּרָק',
          hero: { name_ru: 'Барак, сын Авиноама', name_he: 'בָּרָק בֶּן אֲבִינֹעַם', color: 0x88c0d0 },
          freshEquipment: true, // Барак начинает без вещей Эхуда
        },
      },
    },
    {
      id: 'power_a',
      name_ru: 'Власть · А: Гидон',
      name_he: 'הַשִּׁלְטוֹן · א: גִּדְעוֹן',
      // часть А (Гидон): Г1–Г6; часть Б (притча Йотама и итог Авимелеха): Б1–Б2, затем Суд
      zones: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'b1', 'b2'],
      startZone: 'g1',
      trial: 'power', // src/data/trials/power.json — после эпилога Б2
      hero: {
        name_ru: 'Гидон, сын Иоаша',
        name_he: 'גִּדְעוֹן בֶּן יוֹאָשׁ',
        color: 0x9ccfa0,
        // прозвище после утренней сцены в Г1 (Шофтим 6:32) — показывается рядом с именем в HUD
        alias: { flag: 'jerubbaal', name_ru: 'Йеруббаал', name_he: 'יְרֻבַּעַל' },
      },
      restartOnDeath: 'zone',
      intro: 'intro_power',
      // часть Б: своё название в HUD и свой герой (зоны с part: 'b')
      parts: {
        b: {
          name_ru: 'Власть · Б: Йотам и Авимелех',
          name_he: 'הַשִּׁלְטוֹן · ב: יוֹתָם וַאֲבִימֶלֶךְ',
          hero: { name_ru: 'Йотам, сын Йеруббаала', name_he: 'יוֹתָם בֶּן יְרֻבַּעַל', color: 0xc8b98f },
        },
      },
    },
    {
      id: 'word_a',
      name_ru: 'Слово и власть · А: Йифтах',
      name_he: 'הַדָּבָר וְהַשִּׁלְטוֹן · א: יִפְתָּח',
      // часть А (Йифтах, Шофтим 10:6–11:40, 12:1–7): Й1–Й6 (id yiftach_1…yiftach_6 — не путать
      // с Б1–Б2 карты 2 и Бр1–Бр4 карты 1); часть Б (Шмуэль, Шмуэль алеф 8): Ш1–Ш3
      // (shmuel_1…shmuel_3), затем Суд карты 3 (src/data/trials/word.json).
      zones: ['yiftach_1', 'yiftach_2', 'yiftach_3', 'yiftach_4', 'yiftach_5', 'yiftach_6', 'shmuel_1', 'shmuel_2', 'shmuel_3'],
      startZone: 'yiftach_1',
      trial: 'word', // src/data/trials/word.json — после Ш3; карта последняя: «Начать заново»
      hero: { name_ru: 'Йифтах из Гилада', name_he: 'יִפְתָּח הַגִּלְעָדִי', color: 0xb48ead },
      gauges: {
        gilead_warriors: { label: 'gauge_gilead', max: 10000 }, // после диспута в Й2 — к бою Й4
      },
      restartOnDeath: 'zone',
      freshEquipment: true, // без вещей Эхуда, Барака и Гидона; Мерило и флаги — общие
      intro: 'intro_word',
      parts: {
        b: {
          name_ru: 'Слово и власть · Б: Шмуэль',
          name_he: 'הַדָּבָר וְהַשִּׁלְטוֹן · ב: שְׁמוּאֵל',
          hero: { name_ru: 'Шмуэль', name_he: 'שְׁמוּאֵל', color: 0x8fbcbb },
          freshEquipment: true, // Шмуэль — без вещей Йифтаха; боя в части Б нет (зоны calm)
        },
      },
    },
  ],
  demo: [
    {
      id: 'map1',
      name_ru: 'Деревня у ворот',
      name_he: 'הַכְּפָר שֶׁלְּיַד הַשַּׁעַר',
      zones: ['village', 'field'],
      startZone: 'village',
      trial: 'map1', // src/data/trials/map1.json
    },
    {
      id: 'map2',
      name_ru: 'Город',
      name_he: 'הָעִיר',
      zones: ['city'],
      startZone: 'city',
      trial: 'map2',
    },
  ],
};

// Пролог кампании — narration-сцены перед первой картой (перед её заставкой).
// Показывается один раз: при первом запуске в этом браузере (память — localStorage).
// Esc на прологе пропускает его целиком. ?prologue в адресе — показать пролог снова.
const PROLOGUES = {
  saviors: ['prologue_measure', 'prologue_shoftim'],
};

// Все карты всех кампаний — для загрузки и проверки данных
// Суд эпохи — последний экран кампании, после Суда её последней карты (src/data/trials/<id>.json,
// поле epoch: true): общий профиль Мерила за все карты, сводка ключевых выборов и открытый
// вопрос; затем «Начать заново». Кампании без него после последнего Суда сразу начинаются заново.
const EPOCH_TRIALS = {
  saviors: 'epoch',
};

const ALL_MAPS = Object.values(CAMPAIGNS).flat();

// Диалоги, которые нужны не зонам, а картам и кампаниям: пролог и заставки
function introDialogueIds() {
  return [...Object.values(PROLOGUES).flat(), ...ALL_MAPS.map((m) => m.intro).filter(Boolean)];
}
