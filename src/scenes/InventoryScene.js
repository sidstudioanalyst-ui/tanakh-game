// Экран инвентаря (клавиша I). Запускается поверх GameScene, которая на это время стоит на паузе.
// Список: сначала слоты экипировки, затем предметы в сумке.
//   Enter/E на слоте — снять предмет, на предмете в сумке — надеть.
// Строки интерфейса — из ui-strings.json; в иврите раскладка зеркальная (UI.x).
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
    const panelW = 580;
    const panelH = 480;
    this.panelX = (W - panelW) / 2;
    this.panelY = (H - panelH) / 2;
    this.panelW = panelW;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    this.add.rectangle(this.panelX, this.panelY, panelW, panelH, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);

    const left = this.panelX + 20;
    addUiText(this, left, this.panelY + 14, UI.t('inventory_title'), { size: 22, color: '#88c0d0', bold: true });
    this.statsText = addUiText(this, left, this.panelY + 50, '', { size: 15, color: '#ebcb8b' });
    addUiText(this, left, this.panelY + panelH - 50, UI.t('inventory_help'), { size: 13, color: '#a0a8b8' });

    this.rows = this.add.container(0, 0);

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
    const slots = Object.entries(EQUIPMENT_SLOTS).map(([slot, labelKey]) => ({ kind: 'slot', slot, labelKey }));
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
    const p = this.player;
    this.statsText.setText(
      UI.t('inventory_stats', { damage: p.getAttackDamage(), defense: p.getDefense(), hp: `${p.hp}/${p.maxHp}` })
    );

    this.rows.removeAll(true);
    const left = this.panelX + 20;
    const rowH = 26;
    let y = this.panelY + 88;

    const row = (text, selected, indent = 0) => {
      if (selected) {
        this.rows.add(this.add.rectangle(this.panelX + 12, y - 2, this.panelW - 24, rowH, 0x4c566a).setOrigin(0));
      }
      this.rows.add(addUiText(this, left + indent, y, text, { size: 15, color: selected ? '#ffffff' : '#d8dee9' }));
      y += rowH;
    };

    const entries = this.entries();
    const slotCount = Object.keys(EQUIPMENT_SLOTS).length;
    entries.forEach((entry, i) => {
      if (i === slotCount) {
        y += 10;
        row(UI.t('inventory_bag'), false);
      }
      const selected = i === this.cursor;
      if (entry.kind === 'slot') {
        const id = this.equipment.slots[entry.slot];
        row(UI.t('slot_line', { slot: UI.t(entry.labelKey), item: id ? describeItem(id) : UI.t('slot_empty') }), selected);
      } else {
        row(describeItem(entry.id), selected, 18);
      }
    });
    if (entries.length === slotCount) {
      y += 10;
      row(UI.t('inventory_bag'), false);
      row(UI.t('inventory_bag_empty'), false, 18);
    }
  }

  close() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
