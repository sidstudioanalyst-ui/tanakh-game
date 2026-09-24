// Кнопка выбора с текстом на иврите. Номер (клавиша 1, 2, 3…) — в отдельной плашке справа,
// чтобы «1.» не перемешивался с ивритом по правилам bidi.
// Возвращает контейнер; высота — в container.height (для раскладки).
function createChoiceButton(scene, { rightX, y, width, number, text_he, text_ru, onSelect, draft = false }) {
  const container = scene.add.container(0, 0);
  const pad = 10;
  const badgeW = 26;
  const textWidth = width - badgeW - pad * 3;

  const label = addHebrewText(scene, rightX - badgeW - pad * 2, y + pad - 2, text_he, { size: 17, width: textWidth });
  const ru = addRuHint(scene, rightX - badgeW - pad * 2, label.y + label.height, text_ru, textWidth, draft);
  const contentBottom = (ru ? ru.y + ru.height : label.y + label.height) + pad - 4;
  const height = contentBottom - y;

  const bg = scene.add.rectangle(rightX - width, y, width, height, 0x3b4252, 1).setOrigin(0).setStrokeStyle(1, 0x4c566a);
  const badge = scene.add.rectangle(rightX - pad - badgeW, y + height / 2 - 12, badgeW, 24, 0x88c0d0, 1).setOrigin(0);
  const num = scene.add
    .text(rightX - pad - badgeW / 2, y + height / 2, String(number), {
      fontFamily: CONFIG.UI_FONT,
      fontSize: '15px',
      color: '#2e3440',
    })
    .setOrigin(0.5);

  container.add([bg, badge, num, label]);
  if (ru) container.add(ru);
  container.height = height;

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(0x4c566a));
  bg.on('pointerout', () => bg.setFillStyle(0x3b4252));
  bg.on('pointerdown', () => onSelect());

  return container;
}
