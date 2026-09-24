// Сцена зоны: строит текущую зону из ZONES, создаёт игрока, врагов, предметы, NPC, двери,
// выходы, триггеры и механики зоны (стража, таймер побега, волны).
// Переход в другую зону — перезапуск этой же сцены с другим zoneId. Всё, что должно
// сохраниться (экипировка, здоровье, Мерило, флаги, убитые враги), лежит в GameState.
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // data.zoneId / data.at (тайл появления) передаются при переходе через выход
  init(data) {
    this.zoneId = data.zoneId || GameState.currentZone;
    this.spawnAt = data.at || null;
    this.zone = ZONES[this.zoneId];
    this.gameOver = false;
    this.transitioning = false;
    GameState.enterZone(this.zoneId, this.spawnAt);
  }

  create() {
    this.createTextures();

    this.walls = this.physics.add.staticGroup();
    this.doors = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.items = this.physics.add.staticGroup();
    this.npcs = this.physics.add.staticGroup();
    this.exits = [];
    this.triggers = [];

    this.buildZone(this.zone);

    // Коллизии
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.doors);
    this.physics.add.collider(this.player, this.npcs);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.doors);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      if (!enemy.isDead) player.takeDamage(enemy.stats.damage, enemy.x, enemy.y, this.time.now);
    });
    this.physics.add.overlap(this.player, this.items, (player, item) => this.pickUpItem(item));

    // Механики зоны
    this.mechanics = {};
    if (this.zone.guards) this.mechanics.stealth = new StealthMechanic(this, this.zone.guards);
    if (this.zone.timer) this.mechanics.timer = new EscapeTimerMechanic(this, this.zone.timer, this.zone.hazards);
    if (this.zone.waves) this.mechanics.waves = new WavesMechanic(this, this.zone.waves);

    // Камера следует за игроком в пределах зоны
    // Зона меньше экрана — центрируем её, чтобы HUD не закрывал край карты
    const padX = Math.max(0, (CONFIG.WIDTH - this.mapWidth) / 2);
    const padY = Math.max(0, (CONFIG.HEIGHT - this.mapHeight) / 2);
    this.cameras.main.setBounds(-padX, -padY, this.mapWidth + padX * 2, this.mapHeight + padY * 2);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBackgroundColor('#242933'); // если зона ниже/уже экрана
    this.cameras.main.fadeIn(200);

    this.createUI();
    this.bindEvents();

    // Короткая пауза перед тем, как выходы и триггеры начнут срабатывать — чтобы не «отскочить» обратно
    this.armedAt = this.time.now + 300;
  }

  update(time, delta) {
    if (this.gameOver || this.transitioning) return;
    this.player.update(time);
    this.enemies.getChildren().forEach((enemy) => enemy.update(time, this.player));
    Object.values(this.mechanics).forEach((m) => !this.gameOver && m.update(time, delta));
    if (this.gameOver || this.transitioning) return;
    this.updateNpcHints();
    this.checkTriggers(time);
    this.checkExits(time);
    this.updateStatusHud();
  }

  // --- Построение мира -------------------------------------------------------

  // Генерируем цветные квадраты-плейсхолдеры вместо спрайтов.
  // Когда появятся картинки, замените это на this.load.image(...) в preload().
  createTextures() {
    const T = CONFIG.TILE_SIZE;
    const C = CONFIG.COLORS;
    this.makeRectTexture('floorA', T, T, C.floorA);
    this.makeRectTexture('floorB', T, T, C.floorB);
    this.makeRectTexture('wall', T, T, C.wall, 0x4c6a91);
    this.makeRectTexture('water', T, T, C.water, 0x3b6ea5);
    this.makeRectTexture('door', T, T, C.door, 0x5a4526);
    this.makeRectTexture('exit', T, T, C.exit);
    this.makeRectTexture('trialExit', T, T, C.trialExit);
    this.makeRectTexture('lockedExit', T, T, C.lockedExit, 0x3b4252);
    this.makeRectTexture('guard', CONFIG.GUARD.size, CONFIG.GUARD.size, C.guard, 0x2e3440);
    this.makeRectTexture('hazard', 22, 22, C.hazard, 0x2e3440);
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

  tileRect(r) {
    const T = CONFIG.TILE_SIZE;
    return new Phaser.Geom.Rectangle(r.x * T, r.y * T, (r.w || 1) * T, (r.h || 1) * T);
  }

  buildZone(zone) {
    if (!zone) throw new Error(`Зона "${this.zoneId}" не найдена в ZONES`);

    const T = CONFIG.TILE_SIZE;
    const rows = zone.tiles;
    this.mapWidth = rows[0].length * T;
    this.mapHeight = rows.length * T;
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // Сетки: проходимость (поиск пути врагов) и непрозрачность (взгляд стражи)
    this.walkable = rows.map((row) => [...row].map((ch) => ch === CONFIG.TILES.FLOOR));
    this.opaque = rows.map((row) => [...row].map((ch) => ch === CONFIG.TILES.WALL));

    rows.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        const { x, y } = this.tileCenter(tx, ty);
        if (ch === CONFIG.TILES.WALL) this.walls.create(x, y, 'wall');
        else if (ch === CONFIG.TILES.WATER) this.walls.create(x, y, 'water');
        else this.add.image(x, y, (tx + ty) % 2 ? 'floorA' : 'floorB');
      });
    });

    // Двери: закрыты, пока их не откроет эффект open_door (например, после досмотра)
    this.doorTiles = {};
    (zone.doors || []).forEach((door) => {
      if (GameState.isDoorOpen(this.zoneId, door.id)) return;
      this.doorTiles[door.id] = door.tiles.map(([tx, ty]) => {
        const { x, y } = this.tileCenter(tx, ty);
        this.walkable[ty][tx] = false;
        this.opaque[ty][tx] = true;
        return { tx, ty, sprite: this.doors.create(x, y, 'door') };
      });
    });

    // Выходы: подсвеченные тайлы, при входе на них — переход. Выход с условием
    // (requires_flag / requires_item) выглядит серым, пока условие не выполнено.
    (zone.exits || []).forEach((exit) => {
      const images = [];
      for (let dy = 0; dy < (exit.h || 1); dy++) {
        for (let dx = 0; dx < (exit.w || 1); dx++) {
          const { x, y } = this.tileCenter(exit.x + dx, exit.y + dy);
          images.push(this.add.image(x, y, 'exit').setAlpha(0.8));
        }
      }
      this.exits.push({ ...exit, rect: this.tileRect(exit), images });
    });
    this.refreshExits();

    // Триггеры: вход в область запускает диалог (например, досмотр у ворот)
    (zone.triggers || []).forEach((t) => this.triggers.push({ ...t, rect: this.tileRect(t), inside: false }));

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

    // Игрок: цвет — у героя карты (например, Эхуд), иначе стандартный
    const hero = GameState.map.hero;
    let texture = 'player';
    if (hero && hero.color !== undefined) {
      texture = `player-${hero.color.toString(16)}`;
      this.makeRectTexture(texture, CONFIG.PLAYER.size, CONFIG.PLAYER.size, hero.color, 0xffffff);
    }
    const [sx, sy] = this.spawnAt || zone.start;
    const spawn = this.tileCenter(sx, sy);
    this.player = new Player(this, spawn.x, spawn.y, texture);

    (zone.enemies || []).forEach((data, i) => {
      const key = `enemy:${i}`;
      if (GameState.isRemoved(this.zoneId, key)) return;
      const { x, y } = this.tileCenter(data.x, data.y);
      const EnemyClass = ENEMY_CLASSES[CONFIG.ENEMY_TYPES[data.type].class] || Enemy;
      this.enemies.add(new EnemyClass(this, x, y, data.type, key));
    });
  }

  // Закрывает ли взгляд точка (px, py): стена или закрытая дверь. Вода — прозрачна.
  isOpaqueAt(px, py) {
    const T = CONFIG.TILE_SIZE;
    const row = this.opaque[Math.floor(py / T)];
    if (!row) return true;
    const v = row[Math.floor(px / T)];
    return v === undefined ? true : v;
  }

  openDoorNow(doorId) {
    const tiles = this.doorTiles[doorId];
    if (!tiles) return;
    tiles.forEach(({ tx, ty, sprite }) => {
      this.walkable[ty][tx] = true;
      this.opaque[ty][tx] = false;
      sprite.destroy();
    });
    delete this.doorTiles[doorId];
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
    this.refreshExits();
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
    this.openDialogue(npc.dialogueId);
  }

  openDialogue(dialogueId) {
    this.openOverlay('DialogueScene', { dialogueId });
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

  checkTriggers(time) {
    if (time < this.armedAt) return;
    for (const t of this.triggers) {
      const inside = t.rect.contains(this.player.x, this.player.y);
      const entered = inside && !t.inside;
      t.inside = inside;
      if (entered && t.dialogue) {
        this.openDialogue(t.dialogue);
        return;
      }
    }
  }

  // Выход открыт, если выполнены его условия
  exitOpen(exit) {
    const flags = [].concat(exit.requires_flag || []);
    const items = [].concat(exit.requires_item || []);
    return flags.every((f) => GameState.flags[f]) && items.every((id) => GameState.hasItem(id));
  }

  refreshExits() {
    this.exits.forEach((exit) => {
      const key = !this.exitOpen(exit) ? 'lockedExit' : exit.trial ? 'trialExit' : 'exit';
      exit.images.forEach((img) => img.setTexture(key));
    });
  }

  checkExits(time) {
    if (time < this.armedAt) return;
    const exit = this.exits.find((e) => e.rect.contains(this.player.x, this.player.y));
    if (exit !== this.lastExit) {
      this.lastExit = exit;
      if (exit && !this.exitOpen(exit) && exit.locked) this.showToast(UI.t(exit.locked));
    }
    if (!exit || !this.exitOpen(exit)) return;
    if (exit.trial) this.goToTrial();
    else this.goToZone(exit.to, exit.at);
  }

  goToZone(to, at) {
    this.transition(() => this.scene.restart({ zoneId: to, at }));
  }

  goToTrial() {
    this.transition(() => this.scene.start('TrialScene', { trialId: GameState.map.trial }));
  }

  transition(then) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', then);
  }

  // Провал сцены (заметила стража, вышло время, прорвались враги): короткое сообщение
  // и зона начинается заново — как была в момент входа.
  failZone(reasonKey) {
    if (this.gameOver || this.transitioning) return;
    this.gameOver = true;
    this.updateStatusHud(); // показать итог (например, последний прорвавшийся враг)
    this.player.setVelocity(0, 0);
    this.enemies.getChildren().forEach((e) => e.body && e.setVelocity(0, 0));
    this.cameras.main.flash(250, 191, 97, 106);
    this.messageText.setText(`${UI.t(reasonKey)}\n${UI.t('fail_retry')}`).setVisible(true);
    this.time.delayedCall(1600, () => {
      const entry = GameState.restartZone();
      this.transitioning = true;
      this.cameras.main.fadeOut(200);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ zoneId: entry.zoneId, at: entry.at }));
    });
  }

  // После диалога: переход или провал, заказанные эффектами goto_zone / fail_zone
  applyPending() {
    if (GameState.pendingFail) {
      const key = GameState.pendingFail;
      GameState.pendingFail = null;
      this.failZone(key);
      return;
    }
    if (GameState.pendingZone) {
      const { to, at } = GameState.pendingZone;
      GameState.pendingZone = null;
      this.goToZone(to, at);
    }
  }

  // --- UI и события ----------------------------------------------------------

  createUI() {
    this.healthBar = new HealthBar(this, 16, 16, 200, 18);
    this.healthBar.draw(this.player.hp, this.player.maxHp);

    // Раскладка HUD задаётся для русского; в иврите UI.x() зеркалит её слева направо
    this.equipmentText = addUiText(this, 16, 42, '').setScrollFactor(0).setDepth(100);
    this.updateEquipmentHud();

    // Название карты и зоны (иврит) — сверху по центру; под ним — строка механик и шкал
    const map = GameState.map;
    addHebrewText(this, CONFIG.WIDTH / 2, 10, `${map.name_he} · ${this.zone.name_he}`, { size: 16, color: '#e5e9f0' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.statusText = addUiText(this, CONFIG.WIDTH / 2, 36, '', { center: true, size: 14, color: '#ebcb8b' })
      .setScrollFactor(0)
      .setDepth(100);
    this.updateStatusHud();

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
      if (!this.deadWaitingRestart) return;
      // Смерть: начать заново зону или всю карту — как задано у карты (restartOnDeath)
      const entry = GameState.map.restartOnDeath === 'zone' ? GameState.restartZone() : GameState.restartMap();
      this.scene.restart({ zoneId: entry.zoneId, at: entry.at });
    });
    kb.on('keydown-I', () => this.openInventory());
    kb.on('keydown-E', () => this.talk());
  }

  updateEquipmentHud() {
    const eq = GameState.equipment;
    const lines = [];
    const hero = GameState.map.hero;
    if (hero) lines.push(UI.lang === 'he' ? hero.name_he : hero.name_ru);
    Object.entries(EQUIPMENT_SLOTS).forEach(([slot, labelKey]) =>
      lines.push(UI.t('slot_line', { slot: UI.t(labelKey), item: eq.slots[slot] ? itemName(eq.slots[slot]) : UI.t('slot_empty') }))
    );
    lines.push(UI.t('hud_stats', { damage: this.player.getAttackDamage(), defense: this.player.getDefense() }));
    this.equipmentText.setText(lines.join('\n'));
  }

  // Строка под названием зоны: таймер, волны, шкалы карты
  updateStatusHud() {
    const lines = Object.values(this.mechanics || {})
      .map((m) => m.hudLine())
      .filter(Boolean);
    // Шкалы карты показываются в зонах, где они нужны (zone.gauges: ['warriors'])
    Object.entries(GameState.map.gauges || {}).forEach(([id, def]) => {
      if (!(this.zone.gauges || []).includes(id)) return;
      lines.push(UI.t('hud_gauge', { label: UI.t(def.label), value: `${GameState.gauges[id] || 0}/${def.max}` }));
    });
    const text = lines.join('\n');
    if (text !== this.statusText.text) this.statusText.setText(text);
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

    this.events.on('enemy-dead', (enemy) => enemy.spawnKey && GameState.markRemoved(this.zoneId, enemy.spawnKey));
    this.events.on('player-dead', () => {
      const key = GameState.map.restartOnDeath === 'zone' ? 'death_message_zone' : 'death_message';
      this.endGame(UI.t(key));
      this.deadWaitingRestart = true;
    });

    // Сообщения от окон поверх игры (диалог выдал предмет и т. п.)
    this.events.on('toast', (message) => this.showToast(message));

    // Экипировка меняется и из инвентаря, и из диалогов — HUD и здоровье обновляем по событию
    const onEquipment = () => {
      this.player.onEquipmentChanged();
      this.updateEquipmentHud();
      this.refreshExits();
    };
    GameState.events.on('equipment-changed', onEquipment);
    const onDoor = (doorId) => this.openDoorNow(doorId);
    GameState.events.on('door-opened', onDoor);

    // После паузы (диалог, инвентарь): сбросить клавиши, обновить выходы, выполнить
    // заказанные диалогом переход или провал
    const onResume = () => {
      this.input.keyboard.resetKeys();
      this.refreshExits();
      this.triggers.forEach((t) => (t.inside = t.rect.contains(this.player.x, this.player.y)));
      this.applyPending();
    };
    this.events.on('resume', onResume);

    // Сцена переиспользует свой EventEmitter при рестарте — снимаем подписки
    this.events.once('shutdown', () => {
      ['player-hp-changed', 'player-attack', 'enemy-dead', 'player-dead', 'toast'].forEach((e) => this.events.off(e));
      this.events.off('resume', onResume);
      GameState.events.off('equipment-changed', onEquipment);
      GameState.events.off('door-opened', onDoor);
      this.deadWaitingRestart = false;
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
