// Враг: преследует игрока и бьёт с замахом, умирает от атак.
// Параметры берутся из CONFIG.ENEMY_TYPES[typeKey].
//
// Удар с замахом: подойдя на расстояние удара, враг замирает и вспыхивает оранжевым на
// windupMs (CONFIG.ENEMY_STRIKE, у типа можно переопределить) — по этой вспышке видно, что
// сейчас будет удар, и можно увернуться (Shift) или закрыться блоком (Ctrl). Потом удар —
// если игрок ещё в досягаемости — и пауза cooldownMs. Касание само по себе не ранит
// (кроме врагов с contactDamage: колесницы Сисры, бросок растерянного мидьянитянина).
//
// Полоска здоровья над врагом появляется после первого попадания и видна, пока он жив.
// Неуязвимым (noHpBar: колесницы) не показывается. Глубина — ниже подписей и имён NPC.
class Enemy extends Phaser.Physics.Arcade.Sprite {
  // spawnKey — метка в зоне ('enemy:0'), чтобы убитый враг не появлялся снова
  constructor(scene, x, y, typeKey, spawnKey) {
    super(scene, x, y, `enemy-${typeKey}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.typeKey = typeKey;
    this.spawnKey = spawnKey;
    this.stats = CONFIG.ENEMY_TYPES[typeKey];
    this.hp = this.stats.hp;
    this.isDead = false;
    this.stunnedUntil = 0;
    this.waypoint = null;
    this.nextRepathAt = 0;
    this.contactDamage = false; // касание не ранит — бьёт только удар после замаха
    this.windupUntil = 0;
    this.nextStrikeAt = 0;
    this.baseTint = null; // свой оттенок (например, собранные мидьянитяне) — после вспышек возвращается
    this.hpBar = null;
    this.noHpBar = false;

    this.setCollideWorldBounds(true);
    this.setDepth(5);
  }

  // Числа удара: у типа врага — windupMs / cooldownMs / reachPad, иначе общие
  get strike() {
    const d = CONFIG.ENEMY_STRIKE;
    const s = this.stats;
    return { windupMs: s.windupMs || d.windupMs, cooldownMs: s.cooldownMs || d.cooldownMs, reach: s.size / 2 + CONFIG.PLAYER.size / 2 + (s.reachPad || d.reachPad) };
  }

  restoreTint() {
    if (this.baseTint !== null) this.setTint(this.baseTint);
    else this.clearTint();
  }

  // Замах начат: враг стоит и вспыхивает; true — ход врага в этом кадре занят
  // Вызывается из update, когда враг рядом с целью.
  handleStrike(time, target, dist) {
    const st = this.strike;
    if (this.windupUntil) {
      this.setVelocity(0, 0);
      // мигание оранжевым всё время замаха
      if (Math.floor(time / 90) % 2) this.setTint(0xffa040);
      else this.setTintFill(0xffd28a);
      if (time >= this.windupUntil) {
        this.windupUntil = 0;
        this.restoreTint();
        this.nextStrikeAt = time + st.cooldownMs;
        if (!target.isDead && Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= st.reach + 8) {
          target.takeDamage(this.stats.damage, this.x, this.y, time);
          if (this.onHitPlayer) this.onHitPlayer(time);
        }
      }
      return true;
    }
    if (dist <= st.reach && time >= this.nextStrikeAt) {
      this.windupUntil = time + st.windupMs;
      this.setVelocity(0, 0);
      return true;
    }
    // уже вплотную, но удар на перезарядке — не наседает сверху
    if (dist <= st.reach * 0.8) {
      this.setVelocity(0, 0);
      return true;
    }
    return false;
  }

  // Полоска здоровья: рисуется каждый кадр, пока видна
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.hpBar) return;
    const w = Math.max(20, this.displayWidth);
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight / 2 - 8;
    const ratio = Phaser.Math.Clamp(this.hp / this.stats.hp, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.75).fillRect(x - 1, y - 1, w + 2, 5);
    this.hpBar.fillStyle(ratio > 0.5 ? 0xd08770 : 0xbf616a, 1).fillRect(x, y, w * ratio, 3);
  }

  showHpBar() {
    if (this.hpBar || this.noHpBar || this.isDead) return;
    this.hpBar = this.scene.add.graphics().setDepth(11); // выше фигур, ниже подписей (20)
  }

  hideHpBar() {
    if (this.hpBar) this.hpBar.destroy();
    this.hpBar = null;
  }

  destroy(fromScene) {
    this.hideHpBar();
    super.destroy(fromScene);
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

    // рядом — замах и удар
    if (this.handleStrike(time, target, dist)) return;

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
    this.showHpBar();

    // Вспышка и отбрасывание (замах не прерывается: враг ударит, если игрок останется рядом)
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && !this.windupUntil && this.restoreTint());
    const push = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(260);
    this.setVelocity(push.x, push.y);
    this.stunnedUntil = time + 200;

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.hideHpBar();
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
