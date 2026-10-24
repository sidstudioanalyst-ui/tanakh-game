// Объяснение перед игрой — две страницы: о чём игра (Мерило, Суд) и управление.
// Показывается один раз на браузер (localStorage, как toast_defense_hint) сразу после
// заставки (TitleScene), перед первой зоной. Можно открыть повторно из меню — «Как играть»
// (MenuScene: data.fromMenu — тогда закрытие возвращает в игру, а не запускает её заново).
class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  init(data) {
    this.fromMenu = !!(data && data.fromMenu);
    this.page = 0;
    this.pages = [
      { titleKey: 'intro_about_title', textKey: 'intro_about_text' },
      { titleKey: 'intro_controls_title', textKey: CONFIG.TOUCH ? 'intro_controls_text_touch' : 'intro_controls_text' },
    ];
  }

  create() {
    this.cameras.main.setBackgroundColor('#1d2129');
    this.cameras.main.fadeIn(250);
    this.layer = this.add.container(0, 0);
    this.draw();

    const kb = this.input.keyboard;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    if (this.fromMenu) kb.on('keydown-ESC', () => this.finish());
    bindLanguageKeys(this, () => this.draw());
  }

  relayout() {
    this.draw();
  }

  draw() {
    this.layer.removeAll(true);
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const width = Math.min(560, W - 40);
    const right = W / 2 + width / 2;
    const page = this.pages[this.page];
    let y = Math.max(40, H / 2 - 170);

    const title = addUiText(this, W / 2, y, UI.t(page.titleKey), { center: true, size: 24, bold: true, color: '#ebcb8b' });
    this.layer.add(title);
    y += title.height + 16;

    const text = addUiText(this, W / 2, y, UI.t(page.textKey), { center: true, size: 15, color: '#d8dee9', width, lineSpacing: 6 });
    this.layer.add(text);
    y += text.height + 26;

    const last = this.page === this.pages.length - 1;
    const label = UI.both(last ? 'intro_play' : 'intro_next');
    const btn = createChoiceButton(this, { rightX: right, y, width, number: 1, text_he: label.he, text_ru: label.ru, onSelect: () => this.advance() });
    this.layer.add(btn);
    y += btn.height + 10;

    if (this.pages.length > 1) {
      const dots = addUiText(this, W / 2, y, `${this.page + 1}/${this.pages.length}`, { center: true, size: 12, color: '#4c566a' });
      this.layer.add(dots);
    }

    if (this.fromMenu) {
      const close = addUiText(this, W / 2, H - 28, UI.t('intro_close'), { center: true, size: 12, color: '#4c566a' });
      close.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish());
      this.layer.add(close);
    }
  }

  advance() {
    if (this.page < this.pages.length - 1) {
      this.page += 1;
      this.draw();
    } else {
      this.finish();
    }
  }

  finish() {
    writeStorage('tanakh-game.introSeen', '1');
    if (this.fromMenu) {
      this.scene.stop();
      this.scene.resume('GameScene');
      return;
    }
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
  }
}
