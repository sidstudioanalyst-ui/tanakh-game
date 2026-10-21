// Слоты экипировки: ключ слота → ключ подписи в src/data/ui-strings.json.
const EQUIPMENT_SLOTS = {
  weapon: 'slot_weapon',
  armor: 'slot_armor',
  special: 'slot_special',
};

// Предметы. Ключ — id предмета: на него ссылаются зоны (items: [{ id, x, y }])
// и диалоги (effects: { give_item: 'id' }).
//   slot    — ключ из EQUIPMENT_SLOTS
//   damage  — бонус к урону атаки
//   defense — сколько урона поглощается при каждом попадании
//   maxHp   — бонус к максимальному здоровью
//   color   — цвет квадрата-плейсхолдера (запасной вариант — остаётся, даже если ниже есть icon)
//   icon    — необязательно: путь к картинке вместо квадрата (PNG, прозрачный фон, см.
//             CONFIG.ITEM_ICON_SIZE — во сколько она показывается на карте; src/entities/Item.js)
const ITEMS = {
  staff: {
    name_ru: 'Посох',
    name_he: 'מַקֵּל',
    slot: 'weapon',
    damage: 1,
    color: 0xa3825c,
    icon: 'assets/items/staff.png',
  },
  sling: {
    name_ru: 'Праща',
    name_he: 'קֶלַע',
    slot: 'weapon',
    damage: 2,
    color: 0xd8dee9,
    icon: 'assets/items/sling.png',
  },
  cloak: {
    name_ru: 'Плащ',
    name_he: 'אַדֶּרֶת',
    slot: 'armor',
    defense: 4,
    color: 0x81a1c1,
    icon: 'assets/items/cloak.png',
  },
  leather_armor: {
    name_ru: 'Кожаный доспех',
    name_he: 'שִׁרְיוֹן עוֹר',
    slot: 'armor',
    defense: 8,
    color: 0x8fbcbb,
    icon: 'assets/items/leather_armor.png',
  },
  belt: {
    name_ru: 'Пояс',
    name_he: 'אֵזוֹר',
    slot: 'special',
    maxHp: 20,
    color: 0xebcb8b,
    icon: 'assets/items/belt.png',
  },
  oil_flask: {
    name_ru: 'Кувшинчик масла',
    name_he: 'פַּךְ שֶׁמֶן',
    slot: 'special',
    maxHp: 10,
    defense: 1,
    color: 0xe5c07b,
    icon: 'assets/items/oil_flask.png',
  },

  // --- «Спасители», часть А (Эхуд) ---
  ehud_dagger: {
    name_ru: 'Обоюдоострый кинжал',
    name_he: 'חֶרֶב פִּיפִיּוֹת',
    slot: 'weapon',
    damage: 2,
    color: 0xeceff4,
    icon: 'assets/items/ehud_dagger.png',
  },
  ehud_garment: {
    name_ru: 'Плащ',
    name_he: 'מַדִּים',
    slot: 'armor',
    defense: 3,
    color: 0x7b6f5a,
    icon: 'assets/items/ehud_garment.png',
  },
  tribute_bag: {
    name_ru: 'Мешок с данью',
    name_he: 'שַׂק הַמִּנְחָה',
    slot: 'special',
    color: 0xd4a84b,
    icon: 'assets/items/tribute_bag.png',
  },
  shofar: {
    name_ru: 'Шофар',
    name_he: 'שׁוֹפָר',
    slot: 'special',
    maxHp: 10,
    color: 0xc8a165,
    icon: 'assets/items/shofar.png',
  },

  // --- «Спасители», часть Б (Барак) ---
  // id прежний (barak_spear) — для сохранений; было «копьё», переименовано под спрайт Барака с мечом
  barak_spear: {
    name_ru: 'Меч',
    name_he: 'חֶרֶב',
    slot: 'weapon',
    damage: 1,
    color: 0xb8c4d0,
    icon: 'assets/items/barak_spear.png',
  },

  // --- «Спасители», часть Й (Йифтах) ---
  // Не экипировка: нет slot, есть heal — подбирается сразу и лечит (GameScene.pickUpItem),
  // в сумку/на слот не попадает. Используется как подкрепление в затяжных боях (например, Й4 «Миннит»).
  bread: {
    name_ru: 'Лепёшка',
    name_he: 'כִּכַּר לֶחֶם',
    heal: 20,
    color: 0xc9995c,
    icon: 'assets/items/bread.png',
  },
};
