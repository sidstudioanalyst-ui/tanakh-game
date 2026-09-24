// Мир: карты (главы) и реестр зон.
// Карта состоит из нескольких зон. Каждая зона описана в своём файле src/data/maps/<id>.js
// и регистрируется через defineZone(). В конце карты — выход к экрану «Суд».
const ZONES = {};

function defineZone(zone) {
  if (ZONES[zone.id]) console.warn(`Зона "${zone.id}" описана дважды`);
  ZONES[zone.id] = zone;
}

// Порядок карт в игре. Мерило, экипировка и флаги переходят с карты на карту.
const MAPS = [
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
];
