// Общие настройки игры. Все «магические числа» живут здесь.
// Игровые данные (зоны, предметы, диалоги, суд) лежат в src/data/.
const URL_PARAMS = new URLSearchParams(window.location.search);

const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  TILE_SIZE: 32,
  BACKGROUND: '#111111',
  DEBUG: URL_PARAMS.has('debug'), // ?debug — показать хитбоксы Arcade Physics

  // Язык: ?ru / ?he / ?both — см. src/ui/strings.js (там же память выбора в браузере)
  // ?zone=<id> — начать сразу с указанной зоны (для отладки)
  START_ZONE: URL_PARAMS.get('zone'),
  // ?map=demo — тестовые карты «Деревня у ворот» и «Город». По умолчанию — «Спасители».
  CAMPAIGN: URL_PARAMS.get('map') === 'demo' ? 'demo' : 'saviors',

  HEBREW_FONT: '"Noto Sans Hebrew", sans-serif',
  // Временный text_he у реплик-черновиков (draft: true). Без draft валидатор такой текст не пропустит.
  DRAFT_TEXT: 'טְיוּטָה',
  UI_FONT: 'monospace',

  // Символы тайлов в зонах
  TILES: {
    WALL: '#',
    FLOOR: '.',
    WATER: '~', // непроходимо, как стена, но выглядит как вода (броды — обычный пол)
  },

  COLORS: {
    floorA: 0x3b4252,
    floorB: 0x434c5e,
    wall: 0x5e81ac,
    exit: 0xa3be8c,      // переход в другую зону
    trialExit: 0xebcb8b, // выход к «Суду» (конец карты)
    attack: 0xebcb8b,
    light: 0xebcb8b,     // «свет» в профиле Мерила
    shadow: 0x5b4b8a,    // «тень» в профиле Мерила
    water: 0x2e5a88,
    door: 0x8a6d3b,      // закрытая дверь (открывается эффектом open_door)
    lockedExit: 0x4c566a, // выход, для которого не выполнено условие
    cone: 0xebcb8b,      // конус зрения стражи
    coneAlert: 0xbf616a,
    hazard: 0xd08770,    // движущееся препятствие (А3)
    guard: 0xb48ead,
    escapeZone: 0x88c0d0, // «другой берег» (А5)
    gauge: 0xa3be8c,
  },

  PLAYER: {
    size: 24,
    color: 0x88c0d0,
    speed: 160,
    maxHp: 100,          // базовое здоровье, особые предметы могут добавить
    attackRange: 56,     // радиус атаки в пикселях (от центра игрока)
    attackDamage: 1,     // базовый урон без оружия
    attackCooldown: 350, // мс между ударами
    invulnTime: 800,     // мс неуязвимости после получения урона
    knockback: 220,      // скорость отбрасывания при получении урона
    talkRange: 52,       // на каком расстоянии можно заговорить с NPC
  },

  NPC_SIZE: 24,
  ITEM_SIZE: 14,

  // Типы врагов. В зоне враг задаётся как { type: 'chaser', x, y }.
  // Поле class (необязательно) — ключ из ENEMY_CLASSES для врага со своим поведением.
  ENEMY_TYPES: {
    chaser: {
      size: 24,
      color: 0xbf616a,
      speed: 90,
      hp: 3,             // базовый урон игрока 1 → 3 удара; с оружием — меньше
      damage: 20,        // урон игроку при касании
      aggroRange: 320,   // на каком расстоянии (px) замечает игрока
    },
    bandit: {
      size: 20,
      color: 0xd08770,
      speed: 115,
      hp: 2,
      damage: 12,
      aggroRange: 260,
    },
    // Воин Моава в А5: бежит к бродам на другой берег; нападает, только если Эхуд рядом
    moabite: {
      class: 'Runner',
      size: 22,
      color: 0x9c5b5b,
      speed: 95,
      hp: 3,
      damage: 10,
      aggroRange: 70,
    },
  },

  // Стража (скрытность, А2): конус зрения с учётом стен.
  // В зоне страж задаётся { x, y, facing, patrol: [[x, y], ...], range?, fov? }.
  GUARD: {
    size: 24,
    speed: 45,        // скорость обхода
    range: 150,       // дальность взгляда, px
    fov: 70,          // ширина конуса, градусы
    pauseMs: 900,     // остановка в точке маршрута
    rays: 24,         // сколько лучей в конусе (точность отрисовки и проверки стен)
  },
};
