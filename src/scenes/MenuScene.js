// Меню (Esc в игре или кнопка «Меню» в HUD). Запускается поверх GameScene, которая на это
// время стоит на паузе.
//   Продолжить       — закрыть меню (так же Esc)
//   Начать заново    — текущую карту с самого начала (Мерило, вещи, флаги — как на её старте)
//   Демо-карты       — перейти в демо-кампанию; из демо этот пункт возвращает к «Спасителям»
// Управление: ↑/↓ или W/S и Enter, цифры 1–3, мышь; L / B — язык.
class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  init(data) {
    this.cursor = data.cursor || 0;
  }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    const panelW = 420;
    const panelH = 300;
    this.panelX = (W - panelW) / 2;
    this.panelY = (H - panelH) / 2;
    this.panelW = panelW;
    this.add.rectangle(this.panelX, this.panelY, panelW, panelH, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);
    addUiText(this, W / 2, this.panelY + 18, UI.t('menu_title'), { center: true, size: 22, bold: true, color: '#88c0d0' });
    addUiText(this, W / 2, this.panelY + panelH - 34, UI.t('menu_help'), { center: true, size: 12, color: '#a0a8b8' });

    const demo = GameState.campaign === 'demo';
    this.items = [
      { key: 'menu_continue', action: () => this.close() },
      { key: 'menu_restart', action: () => this.restartMap() },
      { key: demo ? 'menu_saviors' : 'menu_demo', action: () => this.switchCampaign(demo ? 'saviors' : 'demo') },
    ];
    this.rows = this.add.container(0, 0);
    this.drawItems();

    const kb = this.input.keyboard;
    const move = (d) => {
      this.cursor = (this.cursor + d + this.items.length) % this.items.length;
      this.drawItems();
    };
    kb.on('keydown-UP', () => move(-1));
    kb.on('keydown-W', () => move(-1));
    kb.on('keydown-DOWN', () => move(1));
    kb.on('keydown-S', () => move(1));
    kb.on('keydown-ENTER', () => this.items[this.cursor].action());
    kb.on('keydown-SPACE', () => this.items[this.cursor].action());
    kb.on('keydown-ESC', () => this.close());
    kb.on('keydown', (event) => {
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= this.items.length) this.items[n - 1].action();
    });
    bindLanguageKeys(this, () => this.scene.restart({ cursor: this.cursor }));
  }

  drawItems() {
    this.rows.removeAll(true);
    const rowH = 44;
    let y = this.panelY + 70;
    this.items.forEach((item, i) => {
      const selected = i === this.cursor;
      const bg = this.add
        .rectangle(this.panelX + 30, y, this.panelW - 60, rowH - 8, selected ? 0x4c566a : 0x3b4252)
        .setOrigin(0)
        .setStrokeStyle(1, selected ? 0xebcb8b : 0x4c566a);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => item.action());
      bg.on('pointerover', () => {
        if (this.cursor === i) return; // перерисовка создаёт новый фон под курсором — без проверки зациклится
        this.cursor = i;
        this.drawItems();
      });
      // без «1.» в строке: в иврите точка по правилам bidi встала бы не с той стороны
      const label = addUiText(this, CONFIG.WIDTH / 2, y + 7, UI.t(item.key), {
        center: true,
        size: 16,
        color: selected ? '#ffffff' : '#d8dee9',
      });
      this.rows.add([bg, label]);
      y += rowH;
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  // Текущая карта с самого начала — не только зона
  restartMap() {
    const entry = GameState.restartMap();
    this.scene.stop('GameScene');
    this.scene.start('GameScene', { zoneId: entry.zoneId });
  }

  switchCampaign(campaign) {
    GameState.newGame(campaign);
    this.scene.stop('GameScene');
    this.scene.start('GameScene', { zoneId: GameState.currentZone });
  }
}
