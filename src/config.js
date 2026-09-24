// Общие настройки игры. Все «магические числа» живут здесь.
const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  TILE_SIZE: 32,
  BACKGROUND: '#111111',
  DEBUG: false, // true — показать хитбоксы Arcade Physics

  // Карта, которая загружается по умолчанию (ключ из MAPS в maps.js).
  // Другую карту можно открыть через URL: index.html?map=arena
  START_MAP: 'level1',

  // Символы тайлов на карте
  TILES: {
    WALL: '#',
    FLOOR: '.',
    PLAYER: 'P',
  },

  COLORS: {
    floorA: 0x3b4252,
    floorB: 0x434c5e,
    wall: 0x5e81ac,
    attack: 0xebcb8b,
  },

  PLAYER: {
    size: 24,
    color: 0x88c0d0,
    speed: 160,
    maxHp: 100,
    attackRange: 56,     // радиус атаки в пикселях (от центра игрока)
    attackDamage: 1,     // базовый урон без оружия
    attackCooldown: 350, // мс между ударами
    invulnTime: 800,     // мс неуязвимости после получения урона
    knockback: 220,      // скорость отбрасывания при получении урона
  },

  // Типы врагов. Ключ — id типа, symbol — символ на карте.
  // Чтобы добавить врага: добавьте запись сюда и поставьте её symbol на карту.
  ENEMY_TYPES: {
    chaser: {
      symbol: 'E',
      size: 24,
      color: 0xbf616a,
      speed: 90,
      hp: 3,             // базовый урон игрока 1 → 3 удара; с оружием — меньше
      damage: 20,        // урон игроку при касании
      aggroRange: 1000,  // на каком расстоянии (px) замечает игрока
    },
  },

  // Слоты экипировки: ключ слота → подпись в интерфейсе
  EQUIPMENT_SLOTS: {
    weapon: 'Оружие',
    armor: 'Броня',
  },

  // Предметы. Ключ — id предмета, symbol — символ на карте (maps.js).
  //   slot    — в какой слот надевается (ключ из EQUIPMENT_SLOTS)
  //   damage  — бонус к урону атаки
  //   defense — сколько урона поглощает броня при каждом попадании
  ITEMS: {
    rusty_sword: {
      symbol: 's',
      name: 'Ржавый меч',
      slot: 'weapon',
      damage: 1,
      color: 0xd8dee9,
    },
    battle_axe: {
      symbol: 'x',
      name: 'Боевой топор',
      slot: 'weapon',
      damage: 2,
      color: 0xd08770,
    },
    leather_armor: {
      symbol: 'l',
      name: 'Кожаная броня',
      slot: 'armor',
      defense: 5,
      color: 0xa3825c,
    },
    chainmail: {
      symbol: 'c',
      name: 'Кольчуга',
      slot: 'armor',
      defense: 10,
      color: 0x8fbcbb,
    },
  },
  ITEM_SIZE: 14,
};
