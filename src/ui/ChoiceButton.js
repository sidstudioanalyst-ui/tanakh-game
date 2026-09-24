// Кнопка выбора (диалог, Суд). Номер (клавиша 1, 2, 3…) — в отдельной плашке у начала строки:
// справа в иврите, слева в русском. Так «1.» не перемешивается с ивритом по правилам bidi.
// Текст — на языке игры (addContentText): иврит, иврит + перевод («оба языка») или русский.
// Раскладка задаётся «по-ивритски» (rightX — правый край), в русском она отражается.
// Возвращает контейнер; высота — в container.height (для раскладки).
function createChoiceButton(scene, { rightX, y, width, number, text_he, text_ru, onSelect, draft = false }) {
  const container = scene.add.container(0, 0);
  const pad = 10;
  const badgeW = 26;
  const textWidth = width - badgeW - pad * 3;
  // прямоугольник, заданный для иврита (левый край + ширина), — на своё место в русском
  const mx = (left, w) => (UI.rtl ? left : CONFIG.WIDTH - left - w);

  const text = addContentText(scene, rightX - badgeW - pad * 2, y + pad - 2, text_he, text_ru, {
    size: 17,
    width: textWidth,
    draft,
  });
  const height = text.height + pad * 2 - 4;

  const bg = scene.add.rectangle(mx(rightX - width, width), y, width, height, 0x3b4252, 1).setOrigin(0).setStrokeStyle(1, 0x4c566a);
  const badge = scene.add.rectangle(mx(rightX - pad - badgeW, badgeW), y + height / 2 - 12, badgeW, 24, 0x88c0d0, 1).setOrigin(0);
  const num = scene.add
    .text(mx(rightX - pad - badgeW, badgeW) + badgeW / 2, y + height / 2, String(number), {
      fontFamily: CONFIG.UI_FONT,
      fontSize: '15px',
      color: '#2e3440',
    })
    .setOrigin(0.5);

  container.add([bg, badge, num, ...text.objects]);
  container.height = height;

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(0x4c566a));
  bg.on('pointerout', () => bg.setFillStyle(0x3b4252));
  bg.on('pointerdown', () => onSelect());

  return container;
}
