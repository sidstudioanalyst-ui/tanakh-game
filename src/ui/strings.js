// Строки интерфейса из src/data/ui-strings.json (загружаются в BootScene) и язык игры.
//
// Язык (UI.lang): 'he' или 'ru' — и для интерфейса, и для диалогов и Суда.
// Режим «оба языка» (UI.bilingual): иврит, а под ним мелко — русский перевод
// (в диалогах и Суде; интерфейс при этом на иврите).
//
// Откуда берётся язык (по приоритету):
//   1) адрес: ?ru, ?he, ?both (можно ?he&both);
//   2) то, что игрок выбрал раньше (клавиши L / B или кнопки в HUD) — хранится в localStorage;
//   3) по умолчанию — иврит без перевода.
// Переключение в игре сразу сохраняется в браузере; параметр в адресе при следующей
// загрузке всё равно имеет приоритет.
//
//   UI.t('hud_stats', { damage: 2, defense: 4 })  → строка на текущем языке
//   UI.both('dialogue_continue')                   → { he, ru } — пара для кнопок выбора
const LANG_STORAGE_KEY = 'tanakh-game.lang';
const BILINGUAL_STORAGE_KEY = 'tanakh-game.bilingual';

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null; // приватный режим, запрет cookies и т. п. — работаем без памяти
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    /* не удалось сохранить — язык просто не запомнится */
  }
}

function initialLanguage() {
  const stored = readStorage(LANG_STORAGE_KEY);
  let lang = stored === 'ru' || stored === 'he' ? stored : 'he';
  let bilingual = readStorage(BILINGUAL_STORAGE_KEY) === '1';
  if (URL_PARAMS.has('ru')) lang = 'ru';
  if (URL_PARAMS.has('he')) lang = 'he';
  if (URL_PARAMS.has('both')) {
    lang = 'he';
    bilingual = true;
  } else if (URL_PARAMS.has('ru') || URL_PARAMS.has('he')) {
    bilingual = false;
  }
  if (lang === 'ru') bilingual = false; // «оба» — это иврит с переводом
  return { lang, bilingual };
}

const UI = {
  strings: {},
  ...initialLanguage(),
  events: new Phaser.Events.EventEmitter(), // 'language-changed'

  get rtl() {
    return this.lang === 'he';
  },

  // Показывать ли русский перевод под ивритом
  get showHint() {
    return this.lang === 'he' && this.bilingual;
  },

  setLanguage(lang, bilingual = false) {
    this.lang = lang;
    this.bilingual = lang === 'he' && bilingual;
    writeStorage(LANG_STORAGE_KEY, this.lang);
    writeStorage(BILINGUAL_STORAGE_KEY, this.bilingual ? '1' : '0');
    this.events.emit('language-changed');
  },

  // L: иврит ↔ русский
  toggleLanguage() {
    this.setLanguage(this.lang === 'he' ? 'ru' : 'he', false);
  },

  // B: включить/выключить «оба языка» (из русского — сразу в иврит с переводом)
  toggleBilingual() {
    if (this.lang === 'ru') this.setLanguage('he', true);
    else this.setLanguage('he', !this.bilingual);
  },

  // Пара he/ru из данных на текущем языке (name_he / name_ru, text_he / text_ru …)
  pick(obj, field) {
    if (!obj) return '';
    const he = obj[`${field}_he`];
    const ru = obj[`${field}_ru`];
    return this.lang === 'ru' ? ru || he || '' : he || ru || '';
  },

  load(json) {
    this.strings = json || {};
  },

  // Подставить {имя} → значение. В иврите каждая подстановка оборачивается в изолят
  // FSI…PDI (U+2068/U+2069): так «+1», «100/120» и латиница не переставляются
  // алгоритмом bidi и не утаскивают соседнюю пунктуацию.
  format(template, params, lang) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, name) => {
      if (!(name in params)) return m;
      const value = String(params[name]);
      return lang === 'he' ? `⁨${value}⁩` : value;
    });
  },

  get(key, lang, params) {
    const entry = this.strings[key];
    if (!entry) {
      console.warn(`[строки] нет ключа "${key}" в ui-strings.json`);
      return key;
    }
    const template = entry[lang] !== undefined ? entry[lang] : entry.he;
    return this.format(template, params, lang);
  },

  t(key, params) {
    return this.get(key, this.lang, params);
  },

  both(key, params) {
    return { he: this.get(key, 'he', params), ru: this.get(key, 'ru', params) };
  },

  // Зеркалирование раскладки: x задаётся как для русского (слева направо),
  // в иврите элемент переносится на симметричное место относительно центра экрана.
  x(x) {
    return this.rtl ? CONFIG.WIDTH - x : x;
  },

  // Обратное зеркалирование: x задан для иврита (справа налево), в русском — отражается
  rx(x) {
    return this.rtl ? x : CONFIG.WIDTH - x;
  },
};

// Клавиши L (язык) и B (оба языка) — подключаются в каждой сцене, где есть текст.
// onChange вызывается после смены языка (перерисовать сцену); подписка снимается при shutdown.
function bindLanguageKeys(scene, onChange) {
  const kb = scene.input.keyboard;
  kb.on('keydown-L', () => UI.toggleLanguage());
  kb.on('keydown-B', () => UI.toggleBilingual());
  if (onChange) {
    UI.events.on('language-changed', onChange);
    scene.events.once('shutdown', () => UI.events.off('language-changed', onChange));
  }
}

// Текст интерфейса на текущем языке.
// x — позиция начала строки в «русской» раскладке (слева); в иврите она зеркалится,
// и текст прижимается правым краем. center: true — по центру x (без зеркалирования).
function addUiText(scene, x, y, text, opts = {}) {
  const size = opts.size || 13;
  const color = opts.color || '#d8dee9';
  let obj;
  if (UI.rtl) {
    obj = addHebrewText(scene, opts.center ? x : UI.x(x), y, text, {
      size: size + 2, // шрифт с ивритом визуально мельче моноширинного
      color,
      bold: opts.bold,
      width: opts.width,
      lineSpacing: opts.lineSpacing !== undefined ? opts.lineSpacing : 2,
    });
    if (opts.center) obj.setOrigin(0.5, 0);
  } else {
    obj = scene.add.text(x, y, text, {
      fontFamily: CONFIG.UI_FONT,
      fontSize: `${size}px`,
      fontStyle: opts.bold ? 'bold' : 'normal',
      color,
      align: opts.center ? 'center' : 'left',
      lineSpacing: opts.lineSpacing !== undefined ? opts.lineSpacing : 2,
      wordWrap: opts.width ? { width: opts.width } : undefined,
    });
    obj.setOrigin(opts.center ? 0.5 : 0, 0);
  }
  if (opts.background) obj.setBackgroundColor(opts.background);
  if (opts.padding) obj.setPadding(opts.padding);
  return obj;
}

// Однострочная подпись на языке интерфейса в точке (x, y) без зеркалирования.
// originX: 1 — x это правый край, 0 — левый. Для экранов, где раскладка уже RTL (Суд).
function addUiLabel(scene, x, y, text, opts = {}) {
  const obj = UI.rtl
    ? addHebrewText(scene, x, y, text, { size: opts.size || 14, color: opts.color, bold: opts.bold })
    : scene.add.text(x, y + 3, text, {
        fontFamily: 'sans-serif',
        fontSize: `${(opts.size || 14) - 1}px`,
        color: opts.color || '#eceff4',
      });
  return obj.setOrigin(opts.originX !== undefined ? opts.originX : 1, 0);
}
