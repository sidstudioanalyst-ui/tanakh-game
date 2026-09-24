// Враг, который прорывается к цели (броды в А5), а не гонится за игроком.
// Нападает, только если игрок подошёл ближе aggroRange; потом снова бежит к цели.
// Цель берётся у механики волн: scene.mechanics.waves.goalPoint(this).
class RunnerEnemy extends Enemy {
  constructor(scene, x, y, typeKey, spawnKey) {
    super(scene, x, y, typeKey, spawnKey);
    this.isRunner = true;
  }

  update(time, target) {
    if (this.isDead || time < this.stunnedUntil) return;

    const near = target && !target.isDead && Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= this.stats.aggroRange;
    const waves = this.scene.mechanics && this.scene.mechanics.waves;
    if (near || !waves) {
      super.update(time, target);
      return;
    }

    if (!this.goalWaypoint || time >= this.nextGoalRepath) {
      const goal = waves.goalPoint(this);
      this.goalWaypoint = this.scene.getNextWaypoint(this.x, this.y, goal.x, goal.y);
      this.nextGoalRepath = time + Enemy.REPATH_MS;
    }
    this.scene.physics.moveTo(this, this.goalWaypoint.x, this.goalWaypoint.y, this.stats.speed);
  }

  // Добежал до другого берега — исчезает (это не смерть: в зоне не отмечается)
  escape() {
    this.isDead = true;
    this.body.enable = false;
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => this.destroy() });
  }
}

ENEMY_CLASSES.Runner = RunnerEnemy;
