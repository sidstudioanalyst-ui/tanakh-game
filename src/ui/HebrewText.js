// Текст на иврите: справа налево, выравнивание по правому краю, шрифт из assets/fonts.
//
// Phaser рисует строку на canvas с context.direction = 'rtl', поэтому браузер сам
// применяет двунаправленный алгоритм Unicode: запятые, точки, кавычки и скобки
// встают на правильную сторону. Перенос строк Phaser делает по словам.
//
// rightX — правый край текста; width — ширина блока (для переноса). Без width —
// однострочная подпись, прижатая правым краем к rightX.
function addHebrewText(scene, rightX, y, text, opts = {}) {
  const style = {
    fontFamily: CONFIG.HEBREW_FONT,
    fontSize: `${opts.size || 18}px`,
    fontStyle: opts.bold ? 'bold' : 'normal',
    color: opts.color || '#eceff4',
    rtl: true,
    align: 'right',
    lineSpacing: opts.lineSpacing !== undefined ? opts.lineSpacing : 4,
    // запас сверху/снизу — для огласовок (никуда) над и под буквами
    padding: { top: 4, bottom: 4, left: 2, right: 2 },
  };
  if (opts.width) {
    style.wordWrap = { width: opts.width };
    style.fixedWidth = opts.width;
  }
  return scene.add.text(rightX, y, text, style).setOrigin(1, 0);
}

// Русский перевод под ивритом — в режиме «оба языка» (UI.showHint).
// force: true — показать и без этого режима (реплики-черновики draft: true, где иврита ещё нет).
// В русском режиме перевод не нужен — основной текст и так русский. Возвращает null, если не нужен.
function addRuHint(scene, rightX, y, text, width, force = false) {
  if (!text || UI.lang === 'ru' || (!UI.showHint && !force)) return null;
  return scene.add
    .text(rightX, y, text, {
      fontFamily: 'sans-serif',
      fontSize: force ? '15px' : '12px',
      color: force ? '#d8dee9' : '#8f9bb3',
      align: 'right',
      wordWrap: { width },
      fixedWidth: width,
    })
    .setOrigin(1, 0);
}

// Текст из данных (диалог, Суд) на текущем языке. Раскладка задаётся «по-ивритски»:
// rightX — правый край блока. В русском режиме блок отражается относительно центра
// экрана (UI.rx) и текст идёт слева направо.
//   he — иврит + (в режиме «оба» или у черновика) русский перевод мелко под ним
//        (noHint: true — без перевода, например для имени говорящего)
//   ru — только русский (если его нет — иврит)
// Возвращает { objects, height }.
function addContentText(scene, rightX, y, he, ru, opts = {}) {
  const size = opts.size || 18;
  if (UI.lang === 'ru') {
    const width = opts.width;
    // правый край блока в иврите ↔ левый край в русском
    const t = scene.add.text(UI.rx(rightX), y + 3, ru || he || '', {
      fontFamily: 'sans-serif',
      fontSize: `${size - 1}px`,
      fontStyle: opts.bold ? 'bold' : 'normal',
      color: opts.color || '#eceff4',
      lineSpacing: opts.lineSpacing !== undefined ? opts.lineSpacing : 4,
      wordWrap: width ? { width } : undefined,
    });
    return { objects: [t], height: t.height + 6 };
  }
  const t = addHebrewText(scene, rightX, y, he || '', opts);
  const hint = opts.noHint ? null : addRuHint(scene, rightX, y + t.height, ru, opts.width || 600, !!opts.draft);
  return { objects: hint ? [t, hint] : [t], height: t.height + (hint ? hint.height + 2 : 0) };
}
