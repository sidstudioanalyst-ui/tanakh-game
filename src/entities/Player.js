// Игрок: движение на WASD/стрелках, атака по пробелу, здоровье, экипировка.
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = CONFIG.PLAYER;
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.isDead = false;
    this.nextAttackAt = 0;
    this.invulnerableUntil = 0;
    this.stunnedUntil = 0;
    this.equipment = new Equipment(() => scene.events.emit('equipment-changed', this.equipment));

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    // Атака по событию нажатия: не теряется, даже если клавишу отпустили в том же кадре
    this.keys.attack.on('down', () => this.attack(scene.time.now));
  }

  update(time) {
    if (this.isDead) return;

    // Во время отбрасывания управление ненадолго отключено
    if (time >= this.stunnedUntil) {
      this.handleMovement();
    }
  }

  handleMovement() {
    const left = this.keys.left.isDown || this.cursors.left.isDown;
    const right = this.keys.right.isDown || this.cursors.right.isDown;
    const up = this.keys.up.isDown || this.cursors.up.isDown;
    const down = this.keys.down.isDown || this.cursors.down.isDown;

    const dir = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    // Нормализуем, чтобы по диагонали не бегать быстрее
    dir.normalize().scale(this.stats.speed);
    this.setVelocity(dir.x, dir.y);
  }

  attack(time) {
    if (this.isDead || time < this.nextAttackAt) return;
    this.nextAttackAt = time + this.stats.attackCooldown;

    this.showAttackEffect();

    // Сцена сама решает, кого задела атака
    this.scene.events.emit('player-attack', {
      x: this.x,
      y: this.y,
      range: this.stats.attackRange,
      damage: this.getAttackDamage(),
    });
  }

  getAttackDamage() {
    return this.stats.attackDamage + this.equipment.bonus('damage');
  }

  getDefense() {
    return this.equipment.bonus('defense');
  }

  showAttackEffect() {
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

    // Броня поглощает часть урона, но хотя бы 1 единица проходит всегда
    const taken = Math.max(1, amount - this.getDefense());
    this.hp = Math.max(0, this.hp - taken);
    this.invulnerableUntil = time + this.stats.invulnTime;
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);

    // Отбрасывание от источника урона
    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(this.stats.knockback);
    this.setVelocity(push.x, push.y);
    this.stunnedUntil = time + 150;

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

  die() {
    this.isDead = true;
    this.scene.tweens.killTweensOf(this); // остановить мигание, иначе оно сбросит цвет
    this.setAlpha(1);
    this.setVelocity(0, 0);
    this.setTint(0x555555);
    this.scene.events.emit('player-dead');
  }
}
