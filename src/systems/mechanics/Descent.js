// Спуск с горы Тавор (зона: descent) — Бр3 (Шофтим 4:12–16).
//
//   descent: {
//     activeFlag: 'descent_signal',   // знак к спуску (Двора или сам Барак — в диалоге при входе)
//     gauge: 'barak_warriors',        // собранные воины: чем больше, тем меньше пехоты против Барака
//     infantry: { type: 'sisera_foot', base: 8, extra: 8, spawns: [[x, y], ...] },
//                                     // пехоты = base + round((1 − шкала/максимум) × extra)
//     chariots: [{ path: [[x, y], ...], speed }, ...],  // железные колесницы: ездят по кругу,
//                                     // убить нельзя, касание бьёт — их нужно обходить
//     siseraChariot: 0,               // на какой колеснице Сисра (над ней — его фигура)
//     fleeTo: [x, y],                 // куда Сисра убегает пешком (за край карты)
//     doneFlag: 'sisera_fled', onDone: { dialogue: 'barak3_flight' },
//   }
//
// Бой кончается, когда перебита вся пехота: колесницы встают, Сисра сходит с колесницы и
// убегает пешком за край карты (4:15). Затем narration, открывается выход в Бр4.
class DescentMechanic {
  constructor(scene, cfg) {
    const T = CONFIG.TILE_SIZE;
    this.scene = scene;
    this.cfg = cfg;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.active = false;
    this.infantry = [];
    this.chariots = [];
    this.px = ([x, y]) => ({ x: x * T + T / 2, y: y * T + T / 2 });
    if (this.done) return;
    this.chariots = cfg.chariots.map((c, i) => {
      const pts = c.path.map(this.px);
      const e = new ChariotEnemy(scene, pts[0].x, pts[0].y, 'chariot', null, { path: pts, speed: c.speed });
      scene.enemies.add(e);
      return e;
    });
    // Сисра — фигура над своей колесницей
    const sc = this.chariots[cfg.siseraChariot || 0];
    this.sisera = scene.add.rectangle(sc.x, sc.y - 14, 12, 16, 0xbf616a).setDepth(8).setStrokeStyle(1, 0x2e3440);
    this.siseraLabel = addUiText(scene, sc.x, sc.y - 40, UI.t('label_sisera'), { center: true, size: 10, color: '#ebcb8b' }).setDepth(20);
  }

  get remaining() {
    return this.infantry.filter((e) => !e.isDead).length;
  }

  update() {
    if (this.done) return;
    if (this.sisera && !this.fleeing) {
      const sc = this.chariots[this.cfg.siseraChariot || 0];
      this.sisera.setPosition(sc.x, sc.y - 14);
      this.siseraLabel.setPosition(sc.x, sc.y - 40);
    }
    if (!this.active && GameState.flags[this.cfg.activeFlag]) this.activate();
    if (this.active && !this.ending && this.remaining === 0) this.finish();
  }

  // Знак дан: пехота Сисры выходит в долину. Сколько — по собранным воинам.
  activate() {
    const { scene, cfg } = this;
    this.active = true;
    const inf = cfg.infantry;
    const def = GameState.map.gauges && GameState.map.gauges[cfg.gauge];
    const share = def ? Phaser.Math.Clamp((GameState.gauges[cfg.gauge] || 0) / def.max, 0, 1) : 1;
    const count = inf.base + Math.round((1 - share) * inf.extra);
    for (let i = 0; i < count; i++) {
      const p = this.px(inf.spawns[i % inf.spawns.length]);
      const jitter = i >= inf.spawns.length ? 14 : 0; // лишние — рядом с теми же точками
      const e = new Enemy(scene, p.x + Phaser.Math.Between(-jitter, jitter), p.y + Phaser.Math.Between(-jitter, jitter), inf.type, null);
      scene.enemies.add(e);
      this.infantry.push(e);
    }
    this.total = count;
    scene.showToast(UI.t('toast_descent'));
  }

  // Вся пехота перебита: колесницы встают, Сисра бежит пешком за край карты
  finish() {
    const { scene, cfg } = this;
    this.ending = true;
    this.chariots.forEach((c) => c.stop());
    this.fleeing = true;
    const to = this.px(cfg.fleeTo);
    scene.showToast(UI.t('toast_sisera_fled'));
    this.siseraLabel.destroy();
    const d = Phaser.Math.Distance.Between(this.sisera.x, this.sisera.y, to.x, to.y);
    scene.tweens.add({
      targets: this.sisera,
      x: to.x,
      y: to.y,
      duration: Math.max(1200, (d / 150) * 1000),
      onComplete: () => {
        this.sisera.destroy();
        this.done = true;
        GameState.flags[cfg.doneFlag] = true;
        GameState.logEntry({ type: 'descent', infantry: this.total });
        scene.refreshExits();
        if (cfg.onDone && cfg.onDone.dialogue) scene.time.delayedCall(400, () => scene.openDialogue(cfg.onDone.dialogue));
      },
    });
  }

  hudLine() {
    if (this.done || this.ending) return null;
    if (!this.active) return UI.t('hud_descent_wait');
    return UI.t('hud_descent', { n: this.remaining });
  }
}
