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
// Логическое разрешение. На компьютере — всегда 800×600. На тач-устройстве — по пропорциям
// экрана, чтобы игра занимала его целиком, без полос по бокам: короткая сторона — 480 (телефон)
// или 600 (планшет 4:3…16:10), длинная — по пропорциям (не больше 1280). Портрет: ширина 480,
// высота по экрану; альбом: высота 480, ширина по экрану. Так текст и кнопки остаются крупными.
// При повороте и изменении окна размер пересчитывается на лету (src/ui/Layout.js).
const PHONE_SHORT = 480;
const TABLET_SHORT = 600;
function touchLayout(w, h) {
  const portrait = h > w;
  const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
  const short = aspect < 1.6 ? TABLET_SHORT : PHONE_SHORT;
  const long = Math.round(Phaser.Math.Clamp(short * aspect, short, 1280));
  return portrait ? { width: short, height: long, portrait } : { width: long, height: short, portrait };
}
// Размер области игры: #game (на тач — весь экран без вырезов, см. index.html)
function gameAreaSize() {
  const el = document.getElementById('game');
  const r = el ? el.getBoundingClientRect() : null;
  return r && r.width && r.height ? { w: r.width, h: r.height } : { w: window.innerWidth, h: window.innerHeight };
}
const START_LAYOUT = IS_TOUCH ? touchLayout(gameAreaSize().w, gameAreaSize().h) : { width: 800, height: 600, portrait: false };

const CONFIG = {
  // WIDTH / HEIGHT / PORTRAIT на тач меняются при повороте (Layout.apply) — читать их каждый раз,
  // а не запоминать при загрузке
  WIDTH: START_LAYOUT.width,
  HEIGHT: START_LAYOUT.height,
  TOUCH: IS_TOUCH, // джойстик, кнопки атаки/действия, иконки сумки и меню (src/ui/TouchControls.js)
  PORTRAIT: START_LAYOUT.portrait, // портрет: компактная раскладка HUD и окон
  // «на весь экран»: сплошные затемнения (ночь в Г1/Г4, переправа) рисуются этим размером, чтобы
  // накрывать экран при любой раскладке и после поворота
  FULLSCREEN_RECT: 4096,

  // Тач-управление (только при CONFIG.TOUCH)
  TOUCH_UI: {
    stickRadius: 56,     // база джойстика; стик ходит в её пределах
    stickDeadZone: 0.12, // доля радиуса, где движения ещё нет
    attackRadius: 46,    // кнопка атаки (справа внизу, на месте)
    actionRadius: 32,    // кнопка действия (E) — рядом, меньше
    defenseRadius: 30,   // уворот и блок — только в боевых зонах
    iconSize: 44,        // иконки сумки и меню в углу
    // «призрачный» джойстик-подсказка: слева внизу (и в иврите), прозрачность ~30 %
    ghostInset: { left: 30, bottom: 44 }, // отступ базы от левого и нижнего края экрана
    ghostAlpha: 0.3,
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
    // Направленный удар — у героя со спрайтом (сейчас Эхуд, часть А карты 1): урон только
    // врагам в конусе перед героем (куда шёл последним), а не по кругу. См. README «Направленный удар».
    //   arc   — ширина конуса, градусы; range — дальность от центра героя, px (как attackRange,
    //   враг задет, если в конус попал хотя бы его край)
    directed: { arc: 120, range: 44 },
    attackDamage: 1,     // базовый урон без оружия
    attackCooldown: 350, // мс между ударами
    invulnTime: 800,     // мс неуязвимости после получения урона
    knockback: 220,      // скорость отбрасывания при получении урона
    talkRange: 52,       // на каком расстоянии можно заговорить с NPC
    // защита (только в боевых зонах, см. Player.js)
    dodgeSpeed: 520,     // скорость рывка, px/с
    dodgeMs: 170,        // длительность рывка (≈ 90 px); всё это время игрок неуязвим
    dodgeCooldown: 1200, // перезарядка уворота, мс
    blockFactor: 0.5,    // блок: доля урона, которая проходит
    blockSpeed: 0.45,    // блок: скорость ходьбы
  },

  // Спрайт-листы героев, 4 направления. Подключается у героя карты полем sprite (world.js).
  // Файл не загрузился — у героя остаётся цветной квадрат.
  //   frame   — размер квадратного кадра (ячейки) в листе;
  //   scale   — множитель отрисовки (1 — родной размер LPC: он рисовался под тайлы 32×32);
  //   anchorX, anchorY — точка кадра (в пикселях кадра), где центр физического тела игрока:
  //   тело прежнее (PLAYER.size × PLAYER.size), на бёдрах и ногах; голова выше него;
  //   layout  — раскладка рядов (как в LPC_LAYOUT, Player.js); нет — раскладка LPC;
  //   attackRange — дальность направленного удара под оружие героя (иначе PLAYER.directed.range).
  CHARACTER_SPRITES: {
    // Эхуд: лист Universal LPC Spritesheet Generator, кадр 64×64, кинжал
    ehud: { file: 'assets/characters/ehud.png', frame: 64, scale: 1, anchorX: 32, anchorY: 50 },
    // Барак: лист собран из idle/walk/attack скриптом tools/build_barak_sheet.py — ячейки 96×96,
    // ноги на 79-м пикселе. Рисунок крупнее LPC (рост ≈ 60 px против 47) — масштаб 0,8.
    // Меч длиннее кинжала: дальность 52 против 44 (README «Спрайт Барака»).
    barak: {
      file: 'assets/characters/barak/barak.png', frame: 96, scale: 0.8, anchorX: 48, anchorY: 64,
      layout: {
        walk: { row: 0, from: 0, to: 7, fps: 12 },
        attack: { row: 4, from: 0, to: 8, fps: 26 }, // 9 кадров ≈ 350 мс — как перезарядка удара
        stand: { row: 8, col: 0 },
      },
      attackRange: 52,
    },
  },

  // Удар врага с замахом (см. Enemy.js): замах — враг стоит и мигает оранжевым, потом удар,
  // если игрок ещё рядом; затем пауза. У типа врага можно задать свои windupMs / cooldownMs.
  ENEMY_STRIKE: {
    windupMs: 400,  // замах — время заметить и увернуться/закрыться
    cooldownMs: 450, // пауза после удара (замах + пауза ≈ 0,85 с — как прежний темп урона касанием)
    reachPad: 12,   // досягаемость удара сверх касания (px)
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
      speed: 88,
      hp: 3, // с копьём Барака — 2 удара, без него — 3
      damage: 16,
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
    // Воин Аммона (Й4): обычный преследующий враг с замахом. По давлению — между пехотой Сисры
    // (Бр3) и мидьянитянами Г4; сколько их — по шкале «Воины Гилада» (см. Liberation.js)
    ammonite: {
      size: 20,
      color: 0x8c6d8a,
      speed: 84,
      hp: 3,
      damage: 12,
      aggroRange: 240,
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
      speed: 90, // было 95: под направленный удар Эхуда (README «Направленный удар и блок»)
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
