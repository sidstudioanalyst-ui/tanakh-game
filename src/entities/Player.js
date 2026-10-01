// Игрок: движение на WASD/стрелках (на тач — джойстиком), атака по пробелу, здоровье.
// Экипировка и здоровье хранятся в GameState, чтобы переживать переходы между зонами.
//
// Защита — только в боевых зонах (scene.combatZone: А5, Бр3, Г4, Г5…; не в скрытности А2/Г1):
//   Уворот (Shift, на тач — кнопка): короткий рывок в сторону движения, а если игрок стоит —
//     прочь от ближайшего врага. Во время рывка неуязвим. Перезарядка CONFIG.PLAYER.dodgeCooldown.
//   Блок (Ctrl, на тач — удержание кнопки со щитом): пока держишь — входящий урон вдвое меньше
//     и отбрасывает слабее, но идёшь медленнее и не можешь атаковать.
//
// Вид: цветной квадрат или спрайт-лист героя в формате LPC (sprite — id из
// CONFIG.CHARACTER_SPRITES). У спрайта: ходьба в сторону движения, стойка, когда стоит,
// удар кинжалом при атаке. Физическое тело то же, что у квадрата.
// У героя со спрайтом удар направленный (CONFIG.PLAYER.directed): урон только в конусе перед
// ним — по lastDir, куда шёл последним (клавиши или джойстик). Блок у него — голубое свечение
// самого спрайта вместо кольца вокруг. У квадрата — как раньше: удар по кругу, кольцо щита.

// Раскладка LPC: первый ряд анимации и число кадров. У каждой анимации 4 ряда —
// направления в порядке LPC: вверх, влево, вниз, вправо.
const LPC_LAYOUT = {
  walk: { row: 8, frames: 9 }, // кадр 0 — стойка, 1–8 — цикл шага
  slash: { row: 12, frames: 6 }, // удар с замахом (у Эхуда — кинжал в левой руке)
};
const LPC_DIRS = ['up', 'left', 'down', 'right'];

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'player', sprite = null) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = CONFIG.PLAYER;
    this.equipment = GameState.equipment;
    this.hp = GameState.hp === null ? this.maxHp : Math.min(GameState.hp, this.maxHp);
    this.lastMaxHp = this.maxHp;
    this.isDead = false;
    this.nextAttackAt = 0;
    this.invulnerableUntil = 0;
    this.stunnedUntil = 0;
    this.dodgeUntil = 0;
    this.nextDodgeAt = 0;
    this.lastDir = new Phaser.Math.Vector2(0, 1);
    this.heroKey = null; // ключ спрайт-листа героя; null — квадрат
    this.directed = null; // направленный удар: { arc (рад), range } — только у героя со спрайтом
    if (sprite) this.setupSprite(sprite);

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dodge: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      block: Phaser.Input.Keyboard.KeyCodes.CTRL,
    });
    // Атака по событию нажатия: не теряется, даже если клавишу отпустили в том же кадре
    this.keys.attack.on('down', () => this.attack(scene.time.now));
    this.keys.dodge.on('down', () => this.dodge(scene.time.now));
    this.shield = scene.add.graphics().setDepth(11); // кольцо блока
  }

  // Спрайт-лист героя вместо квадрата. Тело — прежний квадрат PLAYER.size с центром в
  // (x, y); картинка сдвинута так, что точка anchorX/anchorY кадра (бёдра) — в этом центре.
  setupSprite(id) {
    const sp = CONFIG.CHARACTER_SPRITES[id];
    const key = `hero-${id}`;
    this.heroKey = key;
    this.lpcCols = this.scene.textures.get(key).getSourceImage().width / sp.frame;
    Player.createLpcAnims(this.scene, key, this.lpcCols);
    this.setTexture(key, this.lpcFrame('walk', 'down', 0));
    this.setScale(sp.scale);
    this.setOrigin(sp.anchorX / sp.frame, sp.anchorY / sp.frame);
    const b = this.stats.size / sp.scale; // в пикселях кадра; на экране — PLAYER.size
    this.body.setSize(b, b, false);
    this.body.setOffset(sp.anchorX - b / 2, sp.anchorY - b / 2);
    this.facing = 'down';
    this.slashing = false;
    const d = CONFIG.PLAYER.directed;
    this.directed = { arc: Phaser.Math.DegToRad(d.arc), range: d.range };
    // Блок: свечение по контуру спрайта (WebGL); без WebGL — голубой оттенок (см. drawShield)
    this.blockGlow = this.preFX ? this.preFX.addGlow(0x88c0d0, 3, 0, false, 0.1, 12) : null;
    if (this.blockGlow) this.blockGlow.active = false;
    this.on('animationcomplete', (anim) => {
      if (anim.key.startsWith(`${key}-slash-`)) this.slashing = false;
    });
  }

  // Анимации создаются один раз на игру (менеджер анимаций общий для сцен)
  static createLpcAnims(scene, key, cols) {
    if (scene.anims.exists(`${key}-walk-down`)) return;
    const frames = (anim, i, from, to) =>
      scene.anims.generateFrameNumbers(key, { start: (LPC_LAYOUT[anim].row + i) * cols + from, end: (LPC_LAYOUT[anim].row + i) * cols + to });
    LPC_DIRS.forEach((dir, i) => {
      scene.anims.create({ key: `${key}-walk-${dir}`, frames: frames('walk', i, 1, LPC_LAYOUT.walk.frames - 1), frameRate: 12, repeat: -1 });
      // 6 кадров за 300 мс — успевает до следующего удара (attackCooldown 350 мс)
      scene.anims.create({ key: `${key}-slash-${dir}`, frames: frames('slash', i, 0, LPC_LAYOUT.slash.frames - 1), frameRate: 20 });
    });
  }

  lpcFrame(anim, dir, col) {
    return (LPC_LAYOUT[anim].row + LPC_DIRS.indexOf(dir)) * this.lpcCols + col;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.heroKey) this.updateSpriteAnim();
  }

  // Направление — куда шёл последним (как и раньше у квадрата: lastDir); идёт — шаг, стоит — стойка.
  // Работает и в катсценах: там update() не вызывается, а скорость обнулена — будет стойка.
  updateSpriteAnim() {
    if (this.isDead || this.slashing) return;
    this.updateFacing();
    if (this.body.velocity.lengthSq() > 100) {
      this.play(`${this.heroKey}-walk-${this.facing}`, true);
      return;
    }
    if (this.anims.isPlaying) this.anims.stop();
    const stand = this.lpcFrame('walk', this.facing, 0);
    if (this.frame.name !== stand) this.setFrame(stand);
  }

  // Сторона спрайта (4 направления) — ближайшая к lastDir; по диагонали — влево/вправо
  updateFacing() {
    const d = this.lastDir;
    this.facing = Math.abs(d.x) >= Math.abs(d.y) - 1e-6 ? (d.x < 0 ? 'left' : 'right') : d.y < 0 ? 'up' : 'down';
  }

  // Уворот и блок работают только в боевых зонах
  get defenseEnabled() {
    return !!this.scene.combatZone;
  }

  get isDodging() {
    return this.scene.time.now < this.dodgeUntil;
  }

  // Блок: удержание Ctrl или кнопки со щитом (тач); не во время рывка
  get isBlocking() {
    if (!this.defenseEnabled || this.isDead || this.isDodging) return false;
    const touch = this.scene.touch;
    return this.keys.block.isDown || !!(touch && touch.blockHeld);
  }

  // Направление, куда игрок сейчас идёт (клавиши или джойстик); нулевое — стоит
  inputDir() {
    const left = this.keys.left.isDown || this.cursors.left.isDown;
    const right = this.keys.right.isDown || this.cursors.right.isDown;
    const up = this.keys.up.isDown || this.cursors.up.isDown;
    const down = this.keys.down.isDown || this.cursors.down.isDown;
    const dir = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    const touch = this.scene.touch;
    if (dir.lengthSq() === 0 && touch && touch.moving) dir.set(touch.vector.x, touch.vector.y);
    return dir;
  }

  // Рывок: в сторону движения; стоишь — прочь от ближайшего врага (или назад).
  // towards — задать направление явно (для проверок ботом).
  dodge(time, towards = null) {
    if (!this.defenseEnabled || this.isDead || time < this.nextDodgeAt || time < this.stunnedUntil) return false;
    let dir = towards ? new Phaser.Math.Vector2(towards.x, towards.y) : this.inputDir();
    if (dir.lengthSq() === 0) {
      const foes = this.scene.enemies.getChildren().filter((e) => !e.isDead);
      let near = null;
      let best = Infinity;
      foes.forEach((e) => {
        const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
        if (d < best) {
          best = d;
          near = e;
        }
      });
      dir = near ? new Phaser.Math.Vector2(this.x - near.x, this.y - near.y) : this.lastDir.clone().negate();
    }
    dir.normalize();
    const p = this.stats;
    this.dodgeUntil = time + p.dodgeMs;
    this.nextDodgeAt = time + p.dodgeCooldown;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + p.dodgeMs + 60);
    this.dodgeVelocity = dir.scale(p.dodgeSpeed);
    this.setVelocity(this.dodgeVelocity.x, this.dodgeVelocity.y);
    // след: три бледные копии
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 45, () => {
        if (!this.active) return;
        const g = this.heroKey
          ? this.scene.add.image(this.x, this.y, this.heroKey, this.frame.name).setOrigin(this.originX, this.originY).setScale(this.scaleX).setTint(0x88c0d0).setAlpha(0.35).setDepth(9)
          : this.scene.add.rectangle(this.x, this.y, p.size, p.size, 0x88c0d0, 0.35).setDepth(9);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
      });
    }
    return true;
  }

  update(time) {
    this.drawShield();
    if (this.isDead) return;
    // рывок: скорость задана при старте, управление ждёт
    if (time < this.dodgeUntil) {
      this.setVelocity(this.dodgeVelocity.x, this.dodgeVelocity.y);
      return;
    }
    // Во время отбрасывания управление ненадолго отключено
    if (time >= this.stunnedUntil) {
      this.handleMovement();
    }
  }

  // Кольцо щита вокруг игрока, пока держит блок; у героя со спрайтом — свечение его контура
  drawShield() {
    const g = this.shield;
    g.clear();
    if (this.heroKey) {
      const on = this.isBlocking;
      if (this.blockGlow) this.blockGlow.active = on;
      else if (on !== this.blockTinted && !this.scene.tweens.isTweening(this)) {
        // без WebGL: оттенок; не мешаем красному миганию при уроне (оно само снимает оттенок)
        if (on) this.setTint(0x9fd8ff);
        else this.clearTint();
        this.blockTinted = on;
      }
      return;
    }
    if (!this.isBlocking) return;
    g.lineStyle(3, 0x88c0d0, 0.9).strokeCircle(this.x, this.y, this.stats.size * 0.85);
    g.lineStyle(1, 0xeceff4, 0.6).strokeCircle(this.x, this.y, this.stats.size * 0.85 + 3);
  }

  handleMovement() {
    const left = this.keys.left.isDown || this.cursors.left.isDown;
    const right = this.keys.right.isDown || this.cursors.right.isDown;
    const up = this.keys.up.isDown || this.cursors.up.isDown;
    const down = this.keys.down.isDown || this.cursors.down.isDown;

    const dir = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    // speedFactor задают механики зоны (например, вылазка со слугами в Г1 — медленнее);
    // с поднятым щитом (блок) — медленнее
    const speed = this.stats.speed * (this.speedFactor || 1) * (this.isBlocking ? this.stats.blockSpeed : 1);
    if (dir.lengthSq() > 0) this.lastDir.set(dir.x, dir.y).normalize();
    // Джойстик (тач): направление и сила смещения стика — плавно, от 0 до полной скорости.
    // Клавиши, если нажаты, важнее.
    const touch = this.scene.touch;
    if (dir.lengthSq() === 0 && touch && touch.moving) {
      this.lastDir.set(touch.vector.x, touch.vector.y).normalize();
      this.setVelocity(touch.vector.x * speed, touch.vector.y * speed);
      return;
    }
    // Нормализуем, чтобы по диагонали не бегать быстрее
    dir.normalize().scale(speed);
    this.setVelocity(dir.x, dir.y);
  }

  attack(time) {
    if (this.isDead || time < this.nextAttackAt || this.isBlocking) return; // за щитом не атакует
    if (this.scene.zone && this.scene.zone.calm) return; // «тихая» зона (Шмуэль): боя нет
    this.nextAttackAt = time + this.stats.attackCooldown;

    this.showAttackEffect();
    // спрайт: удар кинжалом в ту сторону, куда смотрит; урон — как и раньше, сразу ниже
    if (this.heroKey) {
      this.updateFacing(); // направление — на момент удара
      this.slashing = true;
      this.play(`${this.heroKey}-slash-${this.facing}`);
    }

    // Сцена сама решает, кого задела атака. Направленный удар: конус arc с осью dir
    const d = this.directed;
    this.scene.events.emit('player-attack', {
      x: this.x,
      y: this.y,
      range: d ? d.range : this.stats.attackRange,
      damage: this.getAttackDamage(),
      dir: d ? this.lastDir.clone() : null,
      arc: d ? d.arc : null,
    });
  }

  getAttackDamage() {
    return this.stats.attackDamage + this.equipment.bonus('damage');
  }

  getDefense() {
    return this.equipment.bonus('defense');
  }

  // Максимум здоровья зависит от особых предметов
  get maxHp() {
    return this.stats.maxHp + this.equipment.bonus('maxHp');
  }

  // Вызывается при смене экипировки: прибавка к максимуму сразу добавляет здоровье,
  // а при снятии предмета здоровье не может превышать новый максимум
  onEquipmentChanged() {
    const delta = this.maxHp - this.lastMaxHp;
    this.lastMaxHp = this.maxHp;
    this.setHp(Phaser.Math.Clamp(this.hp + Math.max(0, delta), 0, this.maxHp));
  }

  setHp(value) {
    this.hp = value;
    GameState.hp = value;
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);
  }

  showAttackEffect() {
    if (this.directed) {
      // сектор удара — та же зона, где засчитывается урон
      const { arc, range } = this.directed;
      const a = Math.atan2(this.lastDir.y, this.lastDir.x);
      const g = this.scene.add.graphics().setDepth(9);
      g.fillStyle(CONFIG.COLORS.attack, 0.22).beginPath().slice(this.x, this.y, range, a - arc / 2, a + arc / 2).closePath().fillPath();
      g.lineStyle(2, CONFIG.COLORS.attack, 0.8).beginPath().arc(this.x, this.y, range, a - arc / 2, a + arc / 2).strokePath();
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
      return;
    }
    const ring = this.scene.add.circle(this.x, this.y, this.stats.attackRange, CONFIG.COLORS.attack, 0.25);
    ring.setStrokeStyle(2, CONFIG.COLORS.attack, 0.9).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.15,
      duration: 180,
      onComplete: () => ring.destroy(),
    });
  }

  takeDamage(amount, fromX, fromY, time) {
    if (this.isDead || time < this.invulnerableUntil) return;

    // Броня поглощает часть урона, но хотя бы 1 единица проходит всегда; блок — ещё вдвое
    const blocking = this.isBlocking;
    let taken = Math.max(1, amount - this.getDefense());
    if (blocking) taken = Math.max(1, Math.round(taken * this.stats.blockFactor));
    this.setHp(Math.max(0, this.hp - taken));
    this.invulnerableUntil = time + this.stats.invulnTime;
    if (blocking) this.scene.events.emit('player-blocked');

    this.knockFrom(fromX, fromY, time, blocking ? 0.4 : 1);

    // Мигание на время неуязвимости
    this.setTint(0xff6666);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(this.stats.invulnTime / 200) - 1,
      onComplete: () => {
        this.setAlpha(1);
        this.clearTint();
      },
    });

    if (this.hp <= 0) this.die();
  }

  // Отбрасывание от точки (fromX, fromY): удар врага, столкновение с препятствием
  knockFrom(fromX, fromY, time, factor = 1) {
    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(this.stats.knockback * factor);
    this.setVelocity(push.x, push.y);
    this.stunnedUntil = time + 150;
  }

  die() {
    this.isDead = true;
    this.shield.clear();
    this.scene.tweens.killTweensOf(this); // остановить мигание, иначе оно сбросит цвет
    this.setAlpha(1);
    this.setVelocity(0, 0);
    if (this.heroKey) {
      this.slashing = false;
      this.anims.stop();
      this.setFrame(this.lpcFrame('walk', this.facing, 0));
    }
    this.setTint(0x555555);
    this.scene.events.emit('player-dead');
  }
}
