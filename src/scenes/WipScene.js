// Заглушка «в разработке»: сюда ведёт выход с полем wip (например, из Й3 в Й4, пока Й4 не
// написана; wip_he — код зоны для иврита). Надпись «<код зоны> в разработке» и кнопка «Вернуться» — обратно в зону, откуда
// пришли (к её началу; Мерило, вещи и флаги не меняются). На dev.html — ещё «Список зон».
class WipScene extends Phaser.Scene {
  constructor() {
    super('WipScene');
  }

  init(data) {
    this.label = data.label; // код зоны: «Й4»; label_he — в иврите («י4»)
    this.labelHe = data.label_he || data.label;
    this.back = data.back;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1d2129');
    this.cameras.main.fadeIn(250);
    this.layer = this.add.container(0, 0);
    this.options = [];
    this.draw();

    const kb = this.input.keyboard;
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.options.length) this.options[n - 1]();
    });
    kb.on('keydown-ENTER', () => this.options[0]());
    kb.on('keydown-SPACE', () => this.options[0]());
    bindLanguageKeys(this, () => this.draw());
  }

  draw() {
    this.layer.removeAll(true);
    this.options = [];
    const W = CONFIG.WIDTH;
    const width = Math.min(520, W - 40);
    const right = W / 2 + width / 2;
    let y = CONFIG.HEIGHT / 2 - 110;
    const title = addUiText(this, W / 2, y, UI.t('wip_title', { zone: UI.rtl ? this.labelHe : this.label }), { center: true, size: 26, bold: true, color: '#ebcb8b' });
    this.layer.add(title);
    y += title.height + 14;
    const text = addUiText(this, W / 2, y, UI.t('wip_text'), { center: true, size: 16, color: '#d8dee9' });
    this.layer.add(text);
    y += text.height + 30;
    const buttons = [{ key: 'wip_back', action: () => this.goBack() }];
    if (window.DEV_MODE) buttons.push({ key: 'menu_dev', action: () => window.location.assign('dev.html') });
    buttons.forEach((b, i) => {
      this.options.push(b.action);
      const label = UI.both(b.key);
      const btn = createChoiceButton(this, { rightX: right, y, width, number: i + 1, text_he: label.he, text_ru: label.ru, onSelect: b.action });
      this.layer.add(btn);
      y += btn.height + 8;
    });
  }

  goBack() {
    this.scene.start('GameScene', { zoneId: this.back });
  }
}
