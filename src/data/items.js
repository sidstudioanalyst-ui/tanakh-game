// Слоты экипировки: ключ слота → подпись в интерфейсе.
const EQUIPMENT_SLOTS = {
  weapon: 'Оружие',
  armor: 'Одежда/броня',
  special: 'Особый предмет',
};

// Предметы. Ключ — id предмета: на него ссылаются зоны (items: [{ id, x, y }])
// и диалоги (effects: { give_item: 'id' }).
//   slot    — ключ из EQUIPMENT_SLOTS
//   damage  — бонус к урону атаки
//   defense — сколько урона поглощается при каждом попадании
//   maxHp   — бонус к максимальному здоровью
//   color   — цвет квадрата-плейсхолдера
const ITEMS = {
  staff: {
    name_ru: 'Посох',
    name_he: 'מַקֵּל',
    slot: 'weapon',
    damage: 1,
    color: 0xa3825c,
  },
  sling: {
    name_ru: 'Праща',
    name_he: 'קֶלַע',
    slot: 'weapon',
    damage: 2,
    color: 0xd8dee9,
  },
  cloak: {
    name_ru: 'Плащ',
    name_he: 'אַדֶּרֶת',
    slot: 'armor',
    defense: 4,
    color: 0x81a1c1,
  },
  leather_armor: {
    name_ru: 'Кожаный доспех',
    name_he: 'שִׁרְיוֹן עוֹר',
    slot: 'armor',
    defense: 8,
    color: 0x8fbcbb,
  },
  belt: {
    name_ru: 'Пояс',
    name_he: 'אֵזוֹר',
    slot: 'special',
    maxHp: 20,
    color: 0xebcb8b,
  },
  oil_flask: {
    name_ru: 'Кувшинчик масла',
    name_he: 'פַּךְ שֶׁמֶן',
    slot: 'special',
    maxHp: 10,
    defense: 1,
    color: 0xe5c07b,
  },
};
