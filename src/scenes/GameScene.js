// Сцена зоны: строит текущую зону из ZONES, создаёт игрока, врагов, предметы, NPC и выходы.
// Переход в другую зону — перезапуск этой же сцены с другим zoneId. Всё, что должно
// сохраниться (экипировка, здоровье, Мерило, убитые враги), лежит в GameState.
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // data.zoneId / data.at (тайл появления) передаются при переходе через выход
  init(data) {
    this.zoneId = data.zoneId || GameState.currentZone;
    this.spawnAt = data.at || null;
    GameState.currentZone = this.zoneId;
    this.zone = ZONES[this.zoneId];
    this.gameOver = false;
    this.transitioning = false;
  }

  create() {
    this.createTextures();

    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.items = this.physics.add.staticGroup();
    this.npcs = this.physics.add.staticGroup();
    this.exits = [];

    this.buildZone(this.zone);

    // Коллизии
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.npcs);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      if (!enemy.isDead) player.takeDamage(enemy.stats.damage, enemy.x, enemy.y, this.time.now);
    });
    this.physics.add.overlap(this.player, this.items, (player, item) => this.pickUpItem(item));

    // Камера следует за игроком в пределах зоны
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBackgroundColor('#242933'); // если зона ниже/уже экрана
    this.cameras.main.fadeIn(200);

    this.createUI();
    this.bindEvents();

    // Короткая пауза перед тем, как выходы начнут срабатывать — чтобы не «отскочить» обратно
    this.exitsArmedAt = this.time.now + 300;
  }

  update(time) {
    if (this.gameOver || this.transitioning) return;
    this.player.update(time);
    this.enemies.getChildren().forEach((enemy) => enemy.update(time, this.player));
    this.updateNpcHints();
    this.checkExits(time);
  }

  // --- Построение мира -------------------------------------------------------

  // Генерируем цветные квадраты-плейсхолдеры вместо спрайтов.
  // Когда появятся картинки, замените это на this.load.image(...) в preload().
  createTextures() {
    const T = CONFIG.TILE_SIZE;
    this.makeRectTexture('floorA', T, T, CONFIG.COLORS.floorA);
    this.makeRectTexture('floorB', T, T, CONFIG.COLORS.floorB);
    this.makeRectTexture('wall', T, T, CONFIG.COLORS.wall, 0x4c6a91);
    this.makeRectTexture('exit', T, T, CONFIG.COLORS.exit);
    this.makeRectTexture('trialExit', T, T, CONFIG.COLORS.trialExit);
    this.makeRectTexture('player', CONFIG.PLAYER.size, CONFIG.PLAYER.size, CONFIG.PLAYER.color, 0xffffff);

    Object.entries(CONFIG.ENEMY_TYPES).forEach(([key, type]) => {
      this.makeRectTexture(`enemy-${key}`, type.size, type.size, type.color, 0x000000);
    });
    Object.entries(ITEMS).forEach(([key, item]) => {
      this.makeRectTexture(`item-${key}`, CONFIG.ITEM_SIZE, CONFIG.ITEM_SIZE, item.color, 0xffffff);
    });
    Object.values(ZONES).forEach((zone) =>
      (zone.npcs || []).forEach((npc) => {
        this.makeRectTexture(`npc-${npc.id}`, CONFIG.NPC_SIZE, CONFIG.NPC_SIZE, npc.color || 0xe5e9f0, 0x2e3440);
      })
    );
  }

  makeRectTexture(key, w, h, color, borderColor) {
    if (this.textures.exists(key)) return; // уже создана при прошлом запуске сцены
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    if (borderColor !== undefined) {
      g.lineStyle(2, borderColor, 1);
      g.strokeRect(1, 1, w - 2, h - 2);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  tileCenter(tx, ty) {
    const T = CONFIG.TILE_SIZE;
    return { x: tx * T + T / 2, y: ty * T + T / 2 };
  }

  buildZone(zone) {
    if (!zone) throw new Error(`Зона "${this.zoneId}" не найдена в ZONES`);

    const T = CONFIG.TILE_SIZE;
    const rows = zone.tiles;
    this.mapWidth = rows[0].length * T;
    this.mapHeight = rows.length * T;
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // Сетка проходимости для поиска пути врагов
    this.walkable = rows.map((row) => [...row].map((ch) => ch !== CONFIG.TILES.WALL));

    rows.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        const { x, y } = this.tileCenter(tx, ty);
        if (ch === CONFIG.TILES.WALL) this.walls.create(x, y, 'wall');
        else this.add.image(x, y, (tx + ty) % 2 ? 'floorA' : 'floorB');
      });
    });

    // Выходы: подсвеченные тайлы, при входе на них — переход
    (zone.exits || []).forEach((exit) => {
      const w = exit.w || 1;
      const h = exit.h || 1;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const { x, y } = this.tileCenter(exit.x + dx, exit.y + dy);
          this.add.image(x, y, exit.trial ? 'trialExit' : 'exit').setAlpha(0.8);
        }
      }
      this.exits.push({ ...exit, rect: new Phaser.Geom.Rectangle(exit.x * T, exit.y * T, w * T, h * T) });
    });

    // Предметы и враги, которых уже подобрали/убили, не появляются снова
    (zone.items || []).forEach((data, i) => {
      const key = `item:${i}`;
      if (GameState.isRemoved(this.zoneId, key)) return;
      const { x, y } = this.tileCenter(data.x, data.y);
      this.items.add(new Item(this, x, y, data.id, key));
    });

    (zone.npcs || []).forEach((data) => {
      const { x, y } = this.tileCenter(data.x, data.y);
      this.npcs.add(new Npc(this, x, y, data));
    });

    const [sx, sy] = this.spawnAt || zone.start;
    const spawn = this.tileCenter(sx, sy);
    this.player = new Player(this, spawn.x, spawn.y);

    (zone.enemies || []).forEach((data, i) => {
      const key = `enemy:${i}`;
      if (GameState.isRemoved(this.zoneId, key)) return;
      const { x, y } = this.tileCenter(data.x, data.y);
      const EnemyClass = ENEMY_CLASSES[CONFIG.ENEMY_TYPES[data.type].class] || Enemy;
      this.enemies.add(new EnemyClass(this, x, y, data.type, key));
    });
  }

  // Следующая точка на пути от (fromX, fromY) к (toX, toY) в обход стен.
  // Если цель рядом или путь не найден — возвращает саму цель.
  getNextWaypoint(fromX, fromY, toX, toY) {
    const T = CONFIG.TILE_SIZE;
    const toTile = (x, y) => ({ tx: Math.floor(x / T), ty: Math.floor(y / T) });
    const path = findPath(this.walkable, toTile(fromX, fromY), toTile(toX, toY));
    if (!path || path.length <= 2) return { x: toX, y: toY };
    return this.tileCenter(path[1].tx, path[1].ty);
  }

  // --- Взаимодействие --------------------------------------------------------

  pickUpItem(item) {
    if (!item.body.enable) return;
    item.collect();
    GameState.markRemoved(this.zoneId, item.spawnKey);
    const equipped = GameState.equipment.pickUp(item.itemId);
    this.showToast(UI.t(equipped ? 'toast_equipped' : 'toast_to_bag', { item: describeItem(item.itemId) }));
  }

  nearestNpc() {
    let best = null;
    let bestDist = CONFIG.PLAYER.talkRange;
    this.npcs.getChildren().forEach((npc) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d <= bestDist) {
        best = npc;
        bestDist = d;
      }
    });
    return best;
  }

  updateNpcHints() {
    const near = this.nearestNpc();
    this.npcs.getChildren().forEach((npc) => npc.setHintVisible(npc === near));
  }

  talk() {
    if (this.gameOver || this.transitioning) return;
    const npc = this.nearestNpc();
    if (!npc) return;
    this.openOverlay('DialogueScene', { dialogueId: npc.dialogueId });
  }

  openInventory() {
    if (this.gameOver || this.transitioning) return;
    this.openOverlay('InventoryScene', { player: this.player });
  }

  // Окно поверх игры (инвентарь, диалог): игра стоит на паузе, пока оно открыто
  openOverlay(sceneKey, data) {
    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.launch(sceneKey, data);
  }

  checkExits(time) {
    if (time < this.exitsArmedAt) return;
    const exit = this.exits.find((e) => e.rect.contains(this.player.x, this.player.y));
    if (!exit) return;

    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (exit.trial) this.scene.start('TrialScene', { trialId: GameState.map.trial });
      else this.scene.restart({ zoneId: exit.to, at: exit.at });
    });
  }

  // --- UI и события ----------------------------------------------------------

  createUI() {
    this.healthBar = new HealthBar(this, 16, 16, 200, 18);
    this.healthBar.draw(this.player.hp, this.player.maxHp);

    // Раскладка HUD задаётся для русского; в иврите UI.x() зеркалит её слева направо
    this.equipmentText = addUiText(this, 16, 42, '').setScrollFactor(0).setDepth(100);
    this.updateEquipmentHud();

    // Название карты и зоны (иврит) — сверху по центру
    const map = GameState.map;
    addHebrewText(this, CONFIG.WIDTH / 2, 10, `${map.name_he} · ${this.zone.name_he}`, { size: 16, color: '#e5e9f0' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // Подсказка по управлению — в противоположном от полоски здоровья углу
    addUiText(this, CONFIG.WIDTH - 16, 16, UI.t('hud_controls'))
      .setOrigin(UI.rtl ? 0 : 1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // Всплывающее сообщение (подобранный предмет и т. п.)
    this.toastText = addUiText(this, CONFIG.WIDTH / 2, CONFIG.HEIGHT - 58, '', {
      center: true,
      size: 16,
      color: '#ebcb8b',
      background: '#000000aa',
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false);

    // Выше центра: камера держит игрока по центру, текст не должен его закрывать
    this.messageText = addUiText(this, CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.22 - 40, '', {
      center: true,
      size: 28,
      color: '#ffffff',
      background: '#000000aa',
      padding: { x: 16, y: 12 },
    })
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    const kb = this.input.keyboard;
    kb.on('keydown-R', () => {
      if (!this.gameOver) return;
      GameState.restartMap(); // вернуть Мерило, вещи и зоны к началу карты
      this.scene.restart({ zoneId: GameState.currentZone });
    });
    kb.on('keydown-I', () => this.openInventory());
    kb.on('keydown-E', () => this.talk());
  }

  updateEquipmentHud() {
    const eq = GameState.equipment;
    const lines = Object.entries(EQUIPMENT_SLOTS).map(([slot, labelKey]) =>
      UI.t('slot_line', { slot: UI.t(labelKey), item: eq.slots[slot] ? itemName(eq.slots[slot]) : UI.t('slot_empty') })
    );
    lines.push(UI.t('hud_stats', { damage: this.player.getAttackDamage(), defense: this.player.getDefense() }));
    this.equipmentText.setText(lines.join('\n'));
  }

  showToast(message) {
    this.toastText.setText(message).setVisible(true);
    if (this.toastTimer) this.toastTimer.remove();
    this.toastTimer = this.time.delayedCall(2500, () => this.toastText.setVisible(false));
  }

  bindEvents() {
    this.events.on('player-hp-changed', (hp, max) => this.healthBar.draw(hp, max));

    this.events.on('player-attack', ({ x, y, range, damage }) => {
      this.enemies.getChildren().forEach((enemy) => {
        if (enemy.isDead) return;
        // Учитываем размер врага: достаточно задеть его край
        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= range + enemy.stats.size / 2) {
          enemy.takeDamage(damage, x, y, this.time.now);
        }
      });
    });

    this.events.on('enemy-dead', (enemy) => GameState.markRemoved(this.zoneId, enemy.spawnKey));
    this.events.on('player-dead', () => this.endGame(UI.t('death_message')));

    // Сообщения от окон поверх игры (диалог выдал предмет и т. п.)
    this.events.on('toast', (message) => this.showToast(message));

    // Экипировка меняется и из инвентаря, и из диалогов — HUD и здоровье обновляем по событию
    const onEquipment = () => {
      this.player.onEquipmentChanged();
      this.updateEquipmentHud();
    };
    GameState.events.on('equipment-changed', onEquipment);

    // После паузы сбрасываем клавиши, иначе зажатые до открытия окна «залипают»
    const onResume = () => this.input.keyboard.resetKeys();
    this.events.on('resume', onResume);

    // Сцена переиспользует свой EventEmitter при рестарте — снимаем подписки
    this.events.once('shutdown', () => {
      ['player-hp-changed', 'player-attack', 'enemy-dead', 'player-dead', 'toast'].forEach((e) => this.events.off(e));
      this.events.off('resume', onResume);
      GameState.events.off('equipment-changed', onEquipment);
    });
  }

  endGame(message) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.enemies.getChildren().forEach((e) => e.body && e.setVelocity(0, 0));
    this.messageText.setText(message).setVisible(true);
  }
}
