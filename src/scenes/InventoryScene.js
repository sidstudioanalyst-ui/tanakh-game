// Экран инвентаря (клавиша I; на тач — иконка сумки). Запускается поверх GameScene, которая
// на это время стоит на паузе. Список: сначала слоты экипировки, затем предметы в сумке.
//   Enter/E на слоте — снять предмет, на предмете в сумке — надеть.
//   Тач: нажатие на предмет в сумке надевает его (в подходящий слот; занятый — заменяет),
//   нажатие на надетый предмет снимает его в сумку. Закрыть — ✕ или касание вне окна.
//   При первом открытии на тач — подсказка «Нажми на предмет, чтобы надеть» (запоминается).
// Строки интерфейса — из ui-strings.json; в иврите раскладка зеркальная (UI.x).
class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    this.tipShown = false;
    this.player = data.player;
    this.equipment = data.player.equipment;
    this.cursor = data.cursor || 0;
  }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const panelW = Math.min(580, W - 24); // на узком экране — почти во всю ширину
    const panelH = CONFIG.TOUCH ? Math.min(H - 80, 640) : 480; // на тач строки выше — окно тоже
    this.panelX = (W - panelW) / 2;
    this.panelY = (H - panelH) / 2;
    this.panelW = panelW;

    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    const panel = this.add.rectangle(this.panelX, this.panelY, panelW, panelH, 0x2e3440, 0.97).setOrigin(0).setStrokeStyle(2, 0x88c0d0);

    const left = this.panelX + 20;
    addUiText(this, left, this.panelY + 14, UI.t('inventory_title'), { size: 22, color: '#88c0d0', bold: true });
    this.statsText = addUiText(this, left, this.panelY + 50, '', { size: 15, color: '#ebcb8b' });
    addUiText(this, left, this.panelY + panelH - 50, UI.t('inventory_help'), { size: 13, color: '#a0a8b8' });

    if (CONFIG.TOUCH) {
      // касание вне окна закрывает инвентарь; внутри окна — ничего (только строки)
      shade.setInteractive().on('pointerdown', () => this.close());
      panel.setInteractive();
      this.buildCloseButton();
      this.showTouchTip();
    }

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
    // Смена языка: раскладка зеркальная — проще построить экран заново (курсор сохраняется)
    bindLanguageKeys(this, () => this.scene.restart({ player: this.player, cursor: this.cursor }));

    this.redraw();
  }

  // ✕ в верхнем углу окна (со стороны конца строки заголовка)
  buildCloseButton() {
    const s = 40;
    const x = UI.x(this.panelX + this.panelW - 8 - s / 2);
    const y = this.panelY + 8 + s / 2;
    const bg = this.add.rectangle(x, y, s, s, 0x3b4252).setStrokeStyle(1, 0x88c0d0);
    this.add.text(x, y, '✕', { fontFamily: 'sans-serif', fontSize: '22px', color: '#eceff4' }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
  }

  // Первое открытие на тач — подсказка над списком (один раз, память в браузере)
  showTouchTip() {
    const KEY = 'tanakh-game.inventoryTouchTip';
    if (readStorage(KEY) === '1') return;
    writeStorage(KEY, '1');
    this.tipShown = true; // список начинается ниже подсказки
    const tip = addUiText(this, this.panelX + this.panelW / 2, this.panelY + 82, UI.t('inventory_touch_tip'), {
      center: true,
      size: 16,
      color: '#2e3440',
      background: '#ebcb8b',
      padding: { x: 12, y: 8 },
    });
    this.tweens.add({ targets: tip, alpha: 0.55, yoyo: true, repeat: 3, duration: 450 });
  }

  // Тач: строка — кнопка; сразу выполняет действие (без курсора и подтверждения)
  tap(index) {
    this.cursor = index;
    this.activate();
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
    let y = this.panelY + (this.tipShown ? 132 : 88);

    // Строка списка; index — номер записи (для касания), null — заголовок «Сумка»
    const touch = CONFIG.TOUCH;
    const row = (text, selected, indent = 0, index = null) => {
      const width = touch ? this.panelW - 40 - indent : undefined;
      const label = addUiText(this, left + indent, y, text, { size: 15, color: selected ? '#ffffff' : '#d8dee9', width });
      // на тач строки выше (под палец) и с фоном-кнопкой; длинное название переносится
      const h = touch ? Math.max(index !== null ? 40 : rowH, label.height + 6) : rowH;
      if (touch && index !== null) label.setY(y + (h - label.height) / 2 - 1);
      if (selected || (touch && index !== null)) {
        const bg = this.add.rectangle(this.panelX + 12, y - 2, this.panelW - 24, h - 2, selected && !touch ? 0x4c566a : 0x3b4252).setOrigin(0);
        if (touch && index !== null) {
          bg.setStrokeStyle(1, 0x4c566a);
          bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tap(index));
        }
        this.rows.add(bg);
      }
      this.rows.add(label);
      y += h + (touch ? 4 : 0);
    };

    const entries = this.entries();
    const slotCount = Object.keys(EQUIPMENT_SLOTS).length;
    entries.forEach((entry, i) => {
      if (i === slotCount) {
        y += 10;
        row(UI.t('inventory_bag'), false);
      }
      const selected = !CONFIG.TOUCH && i === this.cursor; // на тач курсора нет — строки нажимаются
      if (entry.kind === 'slot') {
        const id = this.equipment.slots[entry.slot];
        row(UI.t('slot_line', { slot: UI.t(entry.labelKey), item: id ? describeItem(id) : UI.t('slot_empty') }), selected, 0, i);
      } else {
        row(describeItem(entry.id), selected, 18, i);
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
