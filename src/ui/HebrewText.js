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

// Русский перевод под ивритом — только при ?ru в адресе (для проверки текстов).
// Возвращает null, если перевод выключен.
function addRuHint(scene, rightX, y, text, width) {
  if (!CONFIG.SHOW_RU || !text) return null;
  return scene.add
    .text(rightX, y, text, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#8f9bb3',
      align: 'right',
      wordWrap: { width },
      fixedWidth: width,
    })
    .setOrigin(1, 0);
}
