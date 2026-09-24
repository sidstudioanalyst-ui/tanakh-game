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
    attackDamage: 1,
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
      hp: 2,
      damage: 20,        // урон игроку при касании
      aggroRange: 1000,  // на каком расстоянии (px) замечает игрока
    },
  },
};
