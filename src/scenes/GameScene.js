// Основная игровая сцена: строит карту, создаёт игрока, врагов и предметы, связывает физику и UI.
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    // Карта: из data (при рестарте) → из URL (?map=...) → по умолчанию
    const fromUrl = new URLSearchParams(window.location.search).get('map');
    this.mapKey = data.mapKey || (fromUrl && MAPS[fromUrl] ? fromUrl : CONFIG.START_MAP);
    this.gameOver = false;
  }

  create() {
    this.createTextures();

    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.items = this.physics.add.staticGroup();

    this.buildMap(MAPS[this.mapKey]);

    // Коллизии
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      if (!enemy.isDead) player.takeDamage(enemy.stats.damage, enemy.x, enemy.y, this.time.now);
    });
    this.physics.add.overlap(this.player, this.items, (player, item) => this.pickUpItem(item));

    // Камера следует за игроком в пределах карты
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.createUI();
    this.bindEvents();
  }

  update(time) {
    if (this.gameOver) return;
    this.player.update(time);
    this.enemies.getChildren().forEach((enemy) => enemy.update(time, this.player));
  }

  // --- Построение мира -------------------------------------------------------

  // Генерируем цветные квадраты-плейсхолдеры вместо спрайтов.
  // Когда появятся картинки, замените это на this.load.image(...) в preload().
  createTextures() {
    const T = CONFIG.TILE_SIZE;
    this.makeRectTexture('floorA', T, T, CONFIG.COLORS.floorA);
    this.makeRectTexture('floorB', T, T, CONFIG.COLORS.floorB);
    this.makeRectTexture('wall', T, T, CONFIG.COLORS.wall, 0x4c6a91);
    this.makeRectTexture('player', CONFIG.PLAYER.size, CONFIG.PLAYER.size, CONFIG.PLAYER.color, 0xffffff);

    Object.entries(CONFIG.ENEMY_TYPES).forEach(([key, type]) => {
      this.makeRectTexture(`enemy-${key}`, type.size, type.size, type.color, 0x000000);
    });

    Object.entries(CONFIG.ITEMS).forEach(([key, item]) => {
      this.makeRectTexture(`item-${key}`, CONFIG.ITEM_SIZE, CONFIG.ITEM_SIZE, item.color, 0xffffff);
    });
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

  buildMap(map) {
    if (!map) throw new Error(`Карта "${this.mapKey}" не найдена в MAPS`);

    const T = CONFIG.TILE_SIZE;
    const rows = map.tiles;
    this.mapWidth = rows[0].length * T;
    this.mapHeight = rows.length * T;
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // Символ на карте → ключ типа врага
    const enemyBySymbol = {};
    Object.entries(CONFIG.ENEMY_TYPES).forEach(([key, type]) => {
      enemyBySymbol[type.symbol] = key;
    });
    const itemBySymbol = {};
    Object.entries(CONFIG.ITEMS).forEach(([key, item]) => {
      itemBySymbol[item.symbol] = key;
    });

    let playerSpawn = null;
    const enemySpawns = [];
    // Сетка проходимости для поиска пути врагов
    this.walkable = rows.map((row) => [...row].map((ch) => ch !== CONFIG.TILES.WALL));

    rows.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        const x = tx * T + T / 2;
        const y = ty * T + T / 2;

        if (ch === CONFIG.TILES.WALL) {
          this.walls.create(x, y, 'wall');
          return;
        }

        // Всё, что не стена, — пол (шахматный узор, чтобы было видно движение)
        this.add.image(x, y, (tx + ty) % 2 ? 'floorA' : 'floorB');

        if (ch === CONFIG.TILES.PLAYER) playerSpawn = { x, y };
        else if (enemyBySymbol[ch]) enemySpawns.push({ x, y, type: enemyBySymbol[ch] });
        else if (itemBySymbol[ch]) this.items.add(new Item(this, x, y, itemBySymbol[ch]));
      });
    });

    if (!playerSpawn) throw new Error(`На карте "${this.mapKey}" нет старта игрока (${CONFIG.TILES.PLAYER})`);

    this.player = new Player(this, playerSpawn.x, playerSpawn.y);
    enemySpawns.forEach((s) => {
      const EnemyClass = ENEMY_CLASSES[CONFIG.ENEMY_TYPES[s.type].class] || Enemy;
      this.enemies.add(new EnemyClass(this, s.x, s.y, s.type));
    });
  }

  // Следующая точка на пути от (fromX, fromY) к (toX, toY) в обход стен.
  // Если цель рядом или путь не найден — возвращает саму цель.
  getNextWaypoint(fromX, fromY, toX, toY) {
    const T = CONFIG.TILE_SIZE;
    const toTile = (x, y) => ({ tx: Math.floor(x / T), ty: Math.floor(y / T) });
    const path = findPath(this.walkable, toTile(fromX, fromY), toTile(toX, toY));
    if (!path || path.length <= 2) return { x: toX, y: toY };
    const next = path[1];
    return { x: next.tx * T + T / 2, y: next.ty * T + T / 2 };
  }

  pickUpItem(item) {
    if (!item.body.enable) return;
    item.collect();
    const equipped = this.player.equipment.pickUp(item.itemId);
    this.showToast(`${equipped ? 'Надето' : 'В сумку'}: ${describeItem(item.itemId)}`);
  }

  // --- UI и события ----------------------------------------------------------

  createUI() {
    this.healthBar = new HealthBar(this, 16, 16, 200, 18);
    this.healthBar.draw(this.player.hp, this.player.maxHp);

    const hudStyle = { fontFamily: 'monospace', fontSize: '13px', color: '#d8dee9', lineSpacing: 2 };
    this.equipmentText = this.add.text(16, 42, '', hudStyle).setScrollFactor(0).setDepth(100);
    this.updateEquipmentHud();

    // Всплывающее сообщение о подобранном предмете
    this.toastText = this.add
      .text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 40, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ebcb8b',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false);

    this.add
      .text(CONFIG.WIDTH - 16, 16, 'WASD / стрелки — движение\nПробел — атака\nI — инвентарь', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8dee9',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.messageText = this.add
      // Выше центра: камера держит игрока по центру, текст не должен его закрывать
      .text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.22, '', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    this.input.keyboard.on('keydown-R', () => {
      if (this.gameOver) this.scene.restart({ mapKey: this.mapKey });
    });

    this.input.keyboard.on('keydown-I', () => this.openInventory());
    // После паузы сбрасываем клавиши, иначе зажатые до открытия инвентаря «залипают»
    const onResume = () => this.input.keyboard.resetKeys();
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));
  }

  openInventory() {
    if (this.gameOver) return;
    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.launch('InventoryScene', { player: this.player });
  }

  updateEquipmentHud() {
    const eq = this.player.equipment;
    const lines = Object.entries(CONFIG.EQUIPMENT_SLOTS).map(
      ([slot, label]) => `${label}: ${eq.slots[slot] ? CONFIG.ITEMS[eq.slots[slot]].name : '—'}`
    );
    lines.push(`Урон ${this.player.getAttackDamage()} · Защита ${this.player.getDefense()}`);
    this.equipmentText.setText(lines.join('\n'));
  }

  showToast(message) {
    this.toastText.setText(message).setVisible(true);
    if (this.toastTimer) this.toastTimer.remove();
    this.toastTimer = this.time.delayedCall(2000, () => this.toastText.setVisible(false));
  }

  bindEvents() {
    this.events.on('player-hp-changed', (hp, max) => this.healthBar.draw(hp, max));
    this.events.on('equipment-changed', () => this.updateEquipmentHud());

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

    this.events.on('enemy-dead', () => {
      const alive = this.enemies.getChildren().filter((e) => !e.isDead);
      if (alive.length === 0) this.endGame('Победа!\nR — сыграть ещё раз');
    });

    this.events.on('player-dead', () => this.endGame('Вы погибли\nR — начать заново'));

    // Сцена переиспользует свой EventEmitter при рестарте — снимаем подписки
    this.events.once('shutdown', () => {
      ['player-hp-changed', 'equipment-changed', 'player-attack', 'enemy-dead', 'player-dead'].forEach((e) => this.events.off(e));
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
