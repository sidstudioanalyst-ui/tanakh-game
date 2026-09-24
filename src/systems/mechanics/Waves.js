// Бой волнами (зона: waves). Враги бегут к «другому берегу»; нужно не пропустить их.
//
//   waves: {
//     spawns: [[x, y], ...],             // где появляются враги (тайлы)
//     goal: { x, y, w, h },              // куда они стремятся; дошедший считается прорвавшимся
//     list: [{ type: 'moabite', count: 3, interval: 1500 }, ...],
//     startDelay: 2500, pause: 4000,     // мс до первой волны и между волнами
//     allowed: { base: 1, gauge: 'warriors', per: 100 },  // сколько можно пропустить:
//                                        // base + (шкала / per), округление вниз
//     winFlag: 'fords_held',             // флаг после победы (открывает выход)
//   }
// Прорвалось больше, чем allowed, — сцена проваливается.
class WavesMechanic {
  constructor(scene, cfg) {
    const T = CONFIG.TILE_SIZE;
    this.scene = scene;
    this.cfg = cfg;
    this.goalRect = new Phaser.Geom.Rectangle(cfg.goal.x * T, cfg.goal.y * T, (cfg.goal.w || 1) * T, (cfg.goal.h || 1) * T);
    this.waveIndex = -1;
    this.toSpawn = 0;
    this.spawned = 0;
    this.escaped = 0;
    this.done = GameState.flags[cfg.winFlag] || false;
    this.nextAt = scene.time.now + (cfg.startDelay || 2500);

    const a = cfg.allowed || { base: 0 };
    this.allowed = (a.base || 0) + (a.gauge ? Math.floor((GameState.gauges[a.gauge] || 0) / a.per) : 0);

    // «Другой берег» подсвечен
    scene.add
      .rectangle(this.goalRect.x, this.goalRect.y, this.goalRect.width, this.goalRect.height, CONFIG.COLORS.escapeZone, 0.15)
      .setOrigin(0)
      .setDepth(2);
  }

  get wave() {
    return this.cfg.list[this.waveIndex];
  }

  update(time) {
    if (this.done) return;

    // Прорвавшиеся
    this.runners().forEach((e) => {
      if (this.goalRect.contains(e.x, e.y)) {
        this.escaped += 1;
        e.escape();
        if (this.escaped > this.allowed) this.scene.failZone('fail_fords');
      }
    });

    if (this.toSpawn > 0 && time >= this.nextAt) {
      const spawns = this.cfg.spawns;
      const [tx, ty] = spawns[this.spawned % spawns.length];
      const { x, y } = this.scene.tileCenter(tx, ty);
      const type = this.wave.type;
      const EnemyClass = ENEMY_CLASSES[CONFIG.ENEMY_TYPES[type].class] || Enemy;
      this.scene.enemies.add(new EnemyClass(this.scene, x, y, type, null));
      this.spawned += 1;
      this.toSpawn -= 1;
      this.nextAt = time + (this.wave.interval || 1500);
      return;
    }

    const alive = this.runners().length;
    if (this.toSpawn === 0 && alive === 0) {
      if (this.waveIndex === this.cfg.list.length - 1) {
        this.win();
      } else if (this.waveIndex >= 0 && this.nextAt < time) {
        // пауза между волнами
        this.nextAt = time + (this.cfg.pause || 4000);
        this.waveIndex += 1;
        this.toSpawn = this.wave.count;
        this.scene.showToast(UI.t('toast_wave', { n: this.waveIndex + 1 }));
      } else if (this.waveIndex < 0 && time >= this.nextAt) {
        this.waveIndex = 0;
        this.toSpawn = this.wave.count;
        this.scene.showToast(UI.t('toast_wave', { n: 1 }));
      }
    }
  }

  runners() {
    return this.scene.enemies.getChildren().filter((e) => !e.isDead && e.isRunner);
  }

  // Куда бежать врагу: ближайшая по вертикали клетка «другого берега»
  goalPoint(enemy) {
    const T = CONFIG.TILE_SIZE;
    const g = this.cfg.goal;
    const ty = Phaser.Math.Clamp(Math.floor(enemy.y / T), g.y, g.y + (g.h || 1) - 1);
    return this.scene.tileCenter(g.x + Math.floor((g.w || 1) / 2), ty);
  }

  win() {
    this.done = true;
    GameState.flags[this.cfg.winFlag] = true;
    this.scene.showToast(UI.t('toast_fords_held'));
  }

  hudLine() {
    const total = this.cfg.list.length;
    const n = this.done ? total : Math.max(1, this.waveIndex + 1);
    return UI.t('hud_waves', { wave: `${n}/${total}`, escaped: `${this.escaped}/${this.allowed}` });
  }
}
