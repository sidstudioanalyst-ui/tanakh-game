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
const CAMPAIGNS = {
  saviors: [
    {
      id: 'saviors_a',
      name_ru: 'Спасители · А: Эхуд',
      name_he: 'הַמּוֹשִׁיעִים · א: אֵהוּד',
      zones: ['a1', 'a2', 'a3', 'a4', 'a5'],
      startZone: 'a1',
      trial: null, // Суд части А ещё не написан — в А5 есть только выход к нему
      hero: { name_ru: 'Эхуд, сын Геры', name_he: 'אֵהוּד בֶּן גֵּרָא', color: 0xe5c07b },
      gauges: {
        warriors: { label: 'gauge_warriors', max: 300 },
      },
      restartOnDeath: 'zone',
    },
    {
      id: 'power_a',
      name_ru: 'Власть · А: Гидон',
      name_he: 'הַשִּׁלְטוֹן · א: גִּדְעוֹן',
      zones: ['g1', 'g2', 'g3'], // Г4 — следующая задача; пока Г3 ведёт к выходу к Суду
      startZone: 'g1',
      trial: null,
      hero: {
        name_ru: 'Гидон, сын Иоаша',
        name_he: 'גִּדְעוֹן בֶּן יוֹאָשׁ',
        color: 0x9ccfa0,
        // прозвище после утренней сцены в Г1 (Шофтим 6:32) — показывается рядом с именем в HUD
        alias: { flag: 'jerubbaal', name_ru: 'Йеруббаал', name_he: 'יְרֻבַּעַל' },
      },
      restartOnDeath: 'zone',
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

// Все карты всех кампаний — для загрузки и проверки данных
const ALL_MAPS = Object.values(CAMPAIGNS).flat();
