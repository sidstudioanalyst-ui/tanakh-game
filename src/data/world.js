// Мир: карты (главы) и реестр зон.
// Карта состоит из нескольких зон. Каждая зона описана в своём файле src/data/maps/<id>.js
// и регистрируется через defineZone(). В конце карты — выход к экрану «Суд».
const ZONES = {};

function defineZone(zone) {
  if (ZONES[zone.id]) console.warn(`Зона "${zone.id}" описана дважды`);
  ZONES[zone.id] = zone;
}

// Кампании — упорядоченные списки карт. Мерило, экипировка и флаги переходят с карты на карту
// внутри кампании. По умолчанию играется 'saviors', тестовые карты — по ?map=demo.
//
// Поля карты:
//   zones / startZone — зоны карты и стартовая
//   trial             — id суда (src/data/trials/<id>.json) или null, если Суд ещё не написан
//   hero              — за кого играет игрок (имя в HUD, цвет квадрата)
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
