// Мидьянитянин в панике (Г4, после сигнала). Поведение задаёт механика лагеря (Coordination)
// через params — по исходу сигнала:
//   растерянный: мечется по стану, от Гидона убегает (fearRange) и не бьёт — касание не ранит;
//     изредка может броситься на него (lunge: { range, every: [мин, макс] мс, damage }) —
//     только в этот короткий бросок касание ранит;
//   собранный (organized): держит оружие — преследует Гидона, как обычный враг, и бьёт.
// Задев Гидона, любой из них отходит на 1,8 с (onHitPlayer) — в панике никто не наседает долго.
// Через fleeAt мс бежит прочь из стана на восток и исчезает (бегство — не смерть).
class PanickedEnemy extends Enemy {
  constructor(scene, x, y, typeKey, spawnKey, params = {}) {
    super(scene, x, y, typeKey, spawnKey);
    const p = (this.params = params);
    this.organized = !!p.organized;
    // у каждого свои числа: не делим объект из CONFIG
    this.stats = {
      ...this.stats,
      hp: this.organized ? p.organizedHp : p.hp,
      speed: this.organized ? p.organizedSpeed : p.speed,
      damage: this.organized ? p.organizedDamage : (p.lunge && p.lunge.damage) || 0,
      aggroRange: 130,
    };
    this.hp = this.stats.hp;
    this.isPanicked = true;
    this.canHurt = this.organized; // растерянный ранит только в броске
    this.fleeAt = scene.time.now + Phaser.Math.Between(p.flee[0], p.flee[1]) * 1000;
    this.nextTurn = 0;
    this.nextLunge = scene.time.now + Phaser.Math.Between(...(p.lunge ? p.lunge.every : [0, 0]));
    this.lungeUntil = 0;
    this.backOffUntil = 0;
    if (this.organized) this.setTint(0x6b4a3e); // собранные — темнее
  }

  update(time, player) {
    if (this.isDead || time < this.stunnedUntil) return;
    const p = this.params;
    const camp = p.camp;

    // бегство: на восток за край стана (в обход камней) — и прочь; застрял — всё равно исчезает
    if (time >= this.fleeAt) {
      this.canHurt = false;
      if (!this.fleeWaypoint || time >= this.nextRepathAt) {
        this.fleeWaypoint = this.scene.getNextWaypoint(this.x, this.y, p.fleeX + 24, camp.centerY);
        this.nextRepathAt = time + Enemy.REPATH_MS;
      }
      this.scene.physics.moveTo(this, this.fleeWaypoint.x, this.fleeWaypoint.y, this.stats.speed * 1.3);
      if (this.x >= p.fleeX || time >= this.fleeAt + 8000) this.flee();
      return;
    }

    // после удара отходит и какое-то время не бьёт — в панике никто не наседает долго
    if (time < this.backOffUntil) {
      const a = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      this.setVelocity(Math.cos(a) * this.stats.speed * 0.8, Math.sin(a) * this.stats.speed * 0.8);
      return;
    }
    if (this.organized) {
      this.canHurt = true;
      super.update(time, player);
      if (this.body.velocity.lengthSq() === 0) this.wander(time, camp);
      return;
    }

    const d = player && !player.isDead ? Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) : Infinity;
    // бросок на Гидона — редко и коротко
    if (p.lunge && d <= p.lunge.range && time >= this.nextLunge) {
      this.lungeUntil = time + 600;
      this.nextLunge = time + Phaser.Math.Between(p.lunge.every[0], p.lunge.every[1]);
    }
    if (time < this.lungeUntil) {
      this.canHurt = true;
      this.setTint(0xd08770);
      this.scene.physics.moveToObject(this, player, this.stats.speed * 1.4);
      return;
    }
    if (this.canHurt) {
      this.canHurt = false;
      this.clearTint();
    }
    // Гидон близко — убегает от него
    if (d < p.fearRange) {
      const a = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      this.setVelocity(Math.cos(a) * this.stats.speed, Math.sin(a) * this.stats.speed);
      return;
    }
    this.wander(time, camp);
  }

  // Задел Гидона: отступает на 1,8 с и не ранит (бросок растерянного тоже заканчивается)
  onHitPlayer(time) {
    this.canHurt = false;
    this.lungeUntil = 0;
    this.backOffUntil = time + 1800;
    this.clearTint();
    if (this.organized) this.setTint(0x6b4a3e);
  }

  // мечется: новое направление каждые 0,4–1,1 с; за пределами стана — обратно внутрь
  wander(time, camp) {
    if (time < this.nextTurn && camp.contains(this.x, this.y)) return;
    this.nextTurn = time + Phaser.Math.Between(400, 1100);
    const a = camp.contains(this.x, this.y)
      ? Math.random() * Math.PI * 2
      : Phaser.Math.Angle.Between(this.x, this.y, camp.centerX, camp.centerY);
    const s = this.stats.speed * Phaser.Math.FloatBetween(0.6, 1);
    this.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
  }

  // убит в стычке своими же (меч одного на другого) — не рукой Гидона
  fallInClash() {
    if (this.isDead) return;
    this.fellInClash = true;
    this.die();
  }

  // убежал из стана: исчезает, это не смерть
  flee() {
    this.isDead = true;
    this.fled = true;
    this.body.enable = false;
    this.scene.events.emit('panicked-fled', this);
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 300, onComplete: () => this.destroy() });
  }
}

ENEMY_CLASSES.Panicked = PanickedEnemy;
