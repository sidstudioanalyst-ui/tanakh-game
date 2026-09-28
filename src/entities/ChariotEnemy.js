// Железная колесница Сисры (Бр3). Ездит по своему пути по кругу (path — точки в px) и не
// останавливается ради игрока. Убить её нельзя: удар только высекает искру. Касание бьёт
// и отбрасывает (урон — stats.damage), поэтому колесницы нужно обходить.
// stop() — колесницы встают (Сисра бросил колесницу), после этого не ранят.
class ChariotEnemy extends Enemy {
  constructor(scene, x, y, typeKey, spawnKey, opts = {}) {
    super(scene, x, y, typeKey, spawnKey);
    this.path = opts.path || [{ x, y }];
    this.seg = 0;
    this.speed = opts.speed || this.stats.speed;
    this.isChariot = true;
    this.canHurt = true;
    this.stopped = false;
    this.body.setImmovable(true);
    this.body.pushable = false;
    this.setScale(1.4, 0.9); // шире, чем выше
  }

  update() {
    if (this.stopped) {
      this.setVelocity(0, 0);
      return;
    }
    const next = this.path[(this.seg + 1) % this.path.length];
    if (Phaser.Math.Distance.Between(this.x, this.y, next.x, next.y) < 4) this.seg = (this.seg + 1) % this.path.length;
    const to = this.path[(this.seg + 1) % this.path.length];
    this.scene.physics.moveTo(this, to.x, to.y, this.speed);
  }

  // неуязвима: только искра
  takeDamage() {
    this.setTintFill(0xffe8a0);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
  }

  stop() {
    this.stopped = true;
    this.canHurt = false;
    this.setVelocity(0, 0);
    this.setAlpha(0.8);
  }
}

ENEMY_CLASSES.Chariot = ChariotEnemy;
