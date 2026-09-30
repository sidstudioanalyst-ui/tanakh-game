// Панель «Комментаторы» (данные — COMMENTARY в src/data/commentary.js). Окно поверх GameScene,
// та стоит на паузе. Закрыть — ✕ в углу, Esc, Пробел/Enter или касание/клик вне окна.
// L / B — сменить язык (окно перерисуется).
class CommentaryScene extends Phaser.Scene {
  constructor() {
    super('CommentaryScene');
  }

  init(data) {
    this.commentaryId = data.commentaryId;
    this.data_ = COMMENTARY[data.commentaryId];
    // сцена одна на всю игру: после прошлой панели (Й3) флаг остался бы true, и следующую (Й5, Ш2)
    // было бы не закрыть
    this.closing = false;
  }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const c = this.data_;
    const panelW = Math.min(640, W - 24);
    this.panelX = (W - panelW) / 2;
    const pad = CONFIG.PORTRAIT ? 16 : 24;
    const right = this.panelX + panelW - pad;
    const width = panelW - pad * 2;

    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    shade.setInteractive().on('pointerdown', () => this.close());
    const panel = this.add.rectangle(this.panelX, 0, panelW, 10, 0x2e3440, 0.98).setOrigin(0).setStrokeStyle(2, 0x88c0d0);
    panel.setInteractive(); // касание внутри окна не закрывает его

    // Содержимое — от y = 0, затем окно встаёт по центру экрана
    const layer = this.add.container(0, 0);
    const put = (block) => {
      layer.add(block.objects);
      return block.height;
    };
    let y = pad + 44; // сверху — место под ✕
    y += put(addContentText(this, right, y, c.title_he, c.title_ru, { size: 24, bold: true, color: '#ebcb8b', noHint: true })) + 4;
    y += put(addContentText(this, right, y, c.subtitle_he, c.subtitle_ru, { size: 16, width, color: '#a0a8b8', draft: c.draft })) + 14;
    c.views.forEach((v, i) => {
      const h = put(addContentText(this, right, y, v.text_he, v.text_ru, { size: 18, width, lineSpacing: 5, draft: v.draft }));
      // полоска у начала строки — отделяет один взгляд от другого
      layer.add(this.add.rectangle(UI.rtl ? right + 6 : this.panelX + pad - 9, y + 2, 3, h - 4, 0x88c0d0).setOrigin(0));
      y += h + 4;
      const pending = !v.source || /^TODO/.test(v.source);
      const src = addUiLabel(this, UI.rx(right), y, pending ? UI.t('commentary_source_pending') : UI.t('commentary_source', { source: v.source }), {
        size: 13,
        color: pending ? '#d08770' : '#8f9bb3',
        originX: UI.rtl ? 1 : 0,
      });
      layer.add(src);
      y += src.height + (i < c.views.length - 1 ? 18 : 8);
    });
    const hint = addUiLabel(this, UI.rx(right), y + 6, UI.t(CONFIG.TOUCH ? 'commentary_close_touch' : 'commentary_close'), { size: 12, color: '#8f9bb3', originX: UI.rtl ? 1 : 0 });
    layer.add(hint);
    y += hint.height + 6 + pad;

    const panelH = Math.min(y, H - 16);
    const top = Math.max(8, Math.round((H - panelH) / 2));
    panel.setPosition(this.panelX, top).setSize(panelW, panelH);
    panel.input.hitArea.setTo(0, 0, panelW, panelH);
    layer.y = top;
    this.panelY = top;
    this.panelW = panelW;
    this.buildCloseButton();

    const kb = this.input.keyboard;
    ['ESC', 'SPACE', 'ENTER'].forEach((k) => kb.on(`keydown-${k}`, () => this.close()));
    bindLanguageKeys(this, () => this.scene.restart({ commentaryId: this.commentaryId }));
  }

  // ✕ — в углу окна со стороны конца строки (как в инвентаре)
  buildCloseButton() {
    const s = 40;
    const x = UI.x(this.panelX + this.panelW - 8 - s / 2);
    const y = this.panelY + 8 + s / 2;
    const bg = this.add.rectangle(x, y, s, s, 0x3b4252).setStrokeStyle(1, 0x88c0d0);
    this.add.text(x, y, '✕', { fontFamily: 'sans-serif', fontSize: '22px', color: '#eceff4' }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.closeButton = bg;
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
