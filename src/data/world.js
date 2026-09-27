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
        if (k === 'dialogue' && typeof x === 'string') ids.push(x);
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
//   parts             — части карты со своим названием и героем: { b: { name_he, name_ru, hero } };
//                       зона относится к части полем part: 'b' (в HUD — название части)
//   intro             — заставка перед картой: id диалога из narration-реплик (контекст эпохи).
//                       Показывается при каждом начале карты, в том числе после «Начать заново».
const CAMPAIGNS = {
  saviors: [
    {
      id: 'saviors_a',
      name_ru: 'Спасители · А: Эхуд',
      name_he: 'הַמּוֹשִׁיעִים · א: אֵהוּד',
      zones: ['a1', 'a2', 'a3', 'a4', 'a5'],
      startZone: 'a1',
      trial: 'saviors', // src/data/trials/saviors.json — после победы в А5
      hero: { name_ru: 'Эхуд, сын Геры', name_he: 'אֵהוּד בֶּן גֵּרָא', color: 0xe5c07b },
      gauges: {
        warriors: { label: 'gauge_warriors', max: 300 },
      },
      restartOnDeath: 'zone',
      intro: 'intro_saviors',
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
const ALL_MAPS = Object.values(CAMPAIGNS).flat();

// Диалоги, которые нужны не зонам, а картам и кампаниям: пролог и заставки
function introDialogueIds() {
  return [...Object.values(PROLOGUES).flat(), ...ALL_MAPS.map((m) => m.intro).filter(Boolean)];
}
