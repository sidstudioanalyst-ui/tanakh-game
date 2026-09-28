// Общие настройки игры. Все «магические числа» живут здесь.
// Игровые данные (зоны, предметы, диалоги, суд) лежат в src/data/.
const URL_PARAMS = new URLSearchParams(window.location.search);

// Тач-устройство: основной указатель «грубый» (палец) или есть сенсор при небольшом экране.
// Ноутбук с сенсорным экраном и мышью сюда не попадает — там всё как на компьютере.
// ?touch / ?notouch — включить или выключить тач-интерфейс вручную (для проверки).
function detectTouch() {
  if (URL_PARAMS.has('notouch')) return false;
  if (URL_PARAMS.has('touch')) return true;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const smallTouch = navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) < 820;
  return !!(coarse || smallTouch);
}
const IS_TOUCH = detectTouch();
// Портретный телефон: логическая ширина 480, высота — по пропорциям экрана. Так текст и кнопки
// остаются крупными (800×600 в узком экране сжались бы вдвое). Размер выбирается при загрузке.
const IS_PORTRAIT = IS_TOUCH && window.innerHeight > window.innerWidth;
const PORTRAIT_WIDTH = 480;

const CONFIG = {
  WIDTH: IS_PORTRAIT ? PORTRAIT_WIDTH : 800,
  HEIGHT: IS_PORTRAIT ? Math.round(Phaser.Math.Clamp((PORTRAIT_WIDTH * window.innerHeight) / window.innerWidth, 640, 1100)) : 600,
  TOUCH: IS_TOUCH, // джойстик, кнопки атаки/действия, иконки сумки и меню (src/ui/TouchControls.js)
  PORTRAIT: IS_PORTRAIT, // компактная раскладка HUD и окон

  // Тач-управление (только при CONFIG.TOUCH)
  TOUCH_UI: {
    stickRadius: 56,     // база джойстика; стик ходит в её пределах
    stickDeadZone: 0.12, // доля радиуса, где движения ещё нет
    attackRadius: 46,    // кнопка атаки (справа внизу, на месте)
    actionRadius: 32,    // кнопка действия (E) — рядом, меньше
    iconSize: 44,        // иконки сумки и меню в углу
  },
  TILE_SIZE: 32,
  BACKGROUND: '#111111',
  DEBUG: URL_PARAMS.has('debug'), // ?debug — показать хитбоксы Arcade Physics

  // Язык: ?ru / ?he / ?both — см. src/ui/strings.js (там же память выбора в браузере)
  // ?zone=<id> — начать сразу с указанной зоны (для отладки)
  START_ZONE: URL_PARAMS.get('zone'),
  // ?prologue — показать пролог, даже если он уже пройден (см. PROLOGUES в src/data/world.js)
  FORCE_PROLOGUE: URL_PARAMS.has('prologue'),
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
    // Пехота Сисры (Бр3): обычный враг, преследует и бьёт; легче врагов А5 по давлению
    sisera_foot: {
      size: 20,
      color: 0x9c7a5b,
      speed: 82,
      hp: 3, // с копьём Барака — 2 удара, без него — 3
      damage: 9,
      aggroRange: 260,
    },
    // Железная колесница Сисры (Бр3): ездит по своему пути, убить нельзя — только обойти;
    // бьёт при касании (см. ChariotEnemy.js)
    chariot: {
      class: 'Chariot',
      size: 30,
      color: 0xa7b1c2, // светлое железо — хорошо видно на тёмном полу
      speed: 90,
      hp: 999,
      damage: 12,
      aggroRange: 0,
    },
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
    // Бегущий мидьянитянин в Г5: как воин Моава, но медленнее и слабее — погоня легче А5
    midianite: {
      class: 'Runner',
      size: 20,
      color: 0xb07d62,
      speed: 72,
      hp: 2,
      damage: 7,
      aggroRange: 56,
    },
    // Мидьянитянин в стане после сигнала (Г4): числа по исходу сигнала задаёт зона (fight)
    midianite_panic: {
      class: 'Panicked',
      size: 18,
      color: 0x9c6b5b,
      speed: 70,
      hp: 1,
      damage: 0,
      aggroRange: 170,
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
