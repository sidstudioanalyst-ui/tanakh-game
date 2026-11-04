// Титры. Прокрутка снизу вверх (CREDITS из src/data/credits.js), в конце — логотип SID Studio.
// Запуск: из меню («Титры», data.fromMenu — закрытие возвращает в игру) и после Суда эпохи
// (TrialScene.finish — закрытие ведёт на титульный экран). Пропуск: Esc, Enter, Space или касание.
class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
  }

  init(data) {
    this.fromMenu = !!(data && data.fromMenu);
    this.closed = false;
  }

  create() {
    // из меню GameScene (на паузе) рисуется поверх всего, что стоит в списке раньше неё (см. IntroScene)
    if (this.fromMenu) this.scene.bringToTop();
    GameAudio.music('title');
    GameAudio.sfx('win');
    this.cameras.main.setBackgroundColor('#14171d');
    this.cameras.main.fadeIn(400);
    this.layer = this.add.container(0, 0);
    this.build();

    const kb = this.input.keyboard;
    ['ESC', 'ENTER', 'SPACE'].forEach((k) => kb.on(`keydown-${k}`, () => this.close()));
    this.input.on('pointerdown', () => this.close());
    bindLanguageKeys(this, () => this.build());
  }

  relayout() {
    this.build();
  }

  build() {
    if (this.scroll) this.scroll.remove();
    this.layer.removeAll(true);
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const width = Math.min(560, W - 40);
    let y = H; // начало — под нижним краем экрана

    CREDITS.forEach((block) => {
      const head = addUiText(this, W / 2, y, UI.pick(block, 'head'), { center: true, size: block.big ? 40 : 20, bold: true, color: block.big ? '#ebcb8b' : '#88c0d0' });
      this.layer.add(head);
      y += head.height + (block.big ? 10 : 12);
      block.lines.forEach((line) => {
        const t = addUiText(this, W / 2, y, UI.pick(line, 'text'), { center: true, size: block.big ? 18 : 15, color: '#d8dee9', width, lineSpacing: 5 });
        this.layer.add(t);
        y += t.height + 8;
      });
      y += 46;
    });

    // логотип студии на светлой плашке (чёрный знак на тёмном фоне не виден)
    const logoW = Math.min(420, W - 60);
    const logo = this.add.image(W / 2, y + 16, 'logo').setOrigin(0.5, 0);
    logo.setScale(logoW / logo.width);
    const plate = this.add.graphics();
    plate.fillStyle(0xffffff, 1).fillRoundedRect(W / 2 - logoW / 2 - 10, y + 6, logoW + 20, logo.displayHeight + 20, 10);
    this.layer.add([plate, logo]);
    y += logo.displayHeight + 80;

    const total = y; // высота ленты от H до y
    const distance = total - H + H * 0.55; // последний блок останавливается на середине экрана
    this.layer.y = 0;
    this.scroll = this.tweens.add({
      targets: this.layer,
      y: -distance,
      duration: (distance / 42) * 1000,
      ease: 'Linear',
      onComplete: () => this.time.delayedCall(2500, () => this.close()),
    });

    if (this.skipHint) this.skipHint.destroy();
    this.skipHint = addUiText(this, W / 2, H - 26, UI.t('credits_skip'), { center: true, size: 11, color: '#7b8394', background: '#14171dee', padding: { x: 8, y: 3 } }).setDepth(10);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.fromMenu) {
      this.scene.stop();
      this.scene.resume('GameScene');
      return;
    }
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
  }
}
