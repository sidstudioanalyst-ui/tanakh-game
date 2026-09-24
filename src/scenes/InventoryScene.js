// Экран инвентаря (клавиша I). Запускается поверх GameScene, которая на это время стоит на паузе.
// Список: сначала слоты экипировки, затем предметы в сумке.
//   Enter/E на слоте — снять предмет, на предмете в сумке — надеть.
class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    this.player = data.player;
    this.equipment = data.player.equipment;
    this.cursor = 0;
  }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const panelW = 520;
    const panelH = 400;
    this.panelX = (W - panelW) / 2;
    this.panelY = (H - panelH) / 2;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    this.add.rectangle(this.panelX, this.panelY, panelW, panelH, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);

    const text = (x, y, str, size, color) =>
      this.add.text(x, y, str, { fontFamily: 'monospace', fontSize: `${size}px`, color: color || '#eceff4' });

    text(this.panelX + 20, this.panelY + 16, 'Инвентарь', 22, '#88c0d0');
    this.statsText = text(this.panelX + 20, this.panelY + 50, '', 15, '#ebcb8b');
    this.listText = text(this.panelX + 20, this.panelY + 84, '', 15);
    this.listText.setLineSpacing(6);
    text(
      this.panelX + 20,
      this.panelY + panelH - 44,
      '↑/↓ W/S — выбор   Enter/E — надеть/снять\nI или Esc — закрыть',
      13,
      '#a0a8b8'
    );

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-ENTER', () => this.activate());
    kb.on('keydown-E', () => this.activate());
    kb.on('keydown-I', () => this.close());
    kb.on('keydown-ESC', () => this.close());

    this.redraw();
  }

  // Плоский список строк: слоты, затем сумка
  entries() {
    const slots = Object.entries(CONFIG.EQUIPMENT_SLOTS).map(([slot, label]) => ({ kind: 'slot', slot, label }));
    const bag = this.equipment.bag.map((id, index) => ({ kind: 'bag', id, index }));
    return [...slots, ...bag];
  }

  move(delta) {
    const count = this.entries().length;
    this.cursor = (this.cursor + delta + count) % count;
    this.redraw();
  }

  activate() {
    const entry = this.entries()[this.cursor];
    if (!entry) return;
    if (entry.kind === 'slot') this.equipment.unequip(entry.slot);
    else this.equipment.equipFromBag(entry.index);
    this.cursor = Math.min(this.cursor, this.entries().length - 1);
    this.redraw();
  }

  redraw() {
    this.statsText.setText(`Урон: ${this.player.getAttackDamage()}    Защита: ${this.player.getDefense()}`);

    const lines = [];
    const entries = this.entries();
    const slotCount = Object.keys(CONFIG.EQUIPMENT_SLOTS).length;
    entries.forEach((entry, i) => {
      if (i === slotCount) lines.push('', 'Сумка:');
      const mark = i === this.cursor ? '▶ ' : '  ';
      if (entry.kind === 'slot') {
        const id = this.equipment.slots[entry.slot];
        lines.push(`${mark}${entry.label}: ${id ? describeItem(id) : '—'}`);
      } else {
        lines.push(`${mark}${describeItem(entry.id)}`);
      }
    });
    if (entries.length === slotCount) lines.push('', 'Сумка:', '  (пусто)');
    this.listText.setText(lines.join('\n'));
  }

  close() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
