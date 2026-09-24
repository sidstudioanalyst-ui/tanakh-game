// Враг: преследует игрока, наносит урон при касании, умирает от атак.
// Параметры берутся из CONFIG.ENEMY_TYPES[typeKey].
class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey) {
    super(scene, x, y, `enemy-${typeKey}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.typeKey = typeKey;
    this.stats = CONFIG.ENEMY_TYPES[typeKey];
    this.hp = this.stats.hp;
    this.isDead = false;
    this.stunnedUntil = 0;
    this.waypoint = null;
    this.nextRepathAt = 0;

    this.setCollideWorldBounds(true);
    this.setDepth(5);
  }

  update(time, target) {
    if (this.isDead) return;
    if (time < this.stunnedUntil) return; // отлетает после удара

    if (!target || target.isDead) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist > this.stats.aggroRange) {
      this.setVelocity(0, 0);
      return;
    }

    // Путь пересчитываем не каждый кадр, а раз в REPATH_MS
    if (!this.waypoint || time >= this.nextRepathAt) {
      this.waypoint = this.scene.getNextWaypoint(this.x, this.y, target.x, target.y);
      this.nextRepathAt = time + Enemy.REPATH_MS;
    }
    this.scene.physics.moveTo(this, this.waypoint.x, this.waypoint.y, this.stats.speed);
  }

  takeDamage(amount, fromX, fromY, time) {
    if (this.isDead) return;

    this.hp -= amount;

    // Вспышка и отбрасывание
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && this.clearTint());
    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(260);
    this.setVelocity(push.x, push.y);
    this.stunnedUntil = time + 200;

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.body.enable = false;
    this.setVelocity(0, 0);
    this.scene.events.emit('enemy-dead', this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.6,
      angle: 90,
      duration: 250,
      onComplete: () => this.destroy(),
    });
  }
}

Enemy.REPATH_MS = 200;

// Реестр классов врагов: поле `class` в CONFIG.ENEMY_TYPES ссылается на ключ отсюда.
// Подклассы (в своих файлах после Enemy.js) регистрируют себя: ENEMY_CLASSES.Shooter = Shooter;
const ENEMY_CLASSES = { Enemy };
