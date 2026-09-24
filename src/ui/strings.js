// Строки интерфейса из src/data/ui-strings.json (загружаются в BootScene).
// Язык: иврит по умолчанию, русский — при ?ru в адресе.
//
//   UI.t('hud_stats', { damage: 2, defense: 4 })  → строка на текущем языке
//   UI.both('dialogue_continue')                   → { he, ru } — для кнопок выбора,
//                                                    где под ивритом показывается перевод
const UI = {
  strings: {},
  lang: CONFIG.SHOW_RU ? 'ru' : 'he',

  get rtl() {
    return this.lang === 'he';
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
};

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
