// Освобождение городов (зона: liberation) — Й4 «От Ароэра до Авель-Керамим» (Шофтим 11:32–33).
//
//   liberation: {
//     gauge: 'gilead_warriors',       // воины Гилада (итог диспута в Й2): чем меньше, тем больше врагов
//     total: 20,                      // сколько всего городов (счётчик в HUD «Города: N/20»)
//     points: [{
//       id, name_he, name_ru,         // точка — группа городов; подпись над маркером
//       x, y, radius,                 // маркер (тайлы); войти в круг radius — начать бой здесь
//       labelBelow?,                  // подпись под кругом, а не над ним (у верхнего края — HUD)
//       cities: 7,                    // сколько городов добавляет точка
//       kind: 'skirmish' | 'waves' | 'fort',
//       type: 'ammonite',             // тип врага
//       base, extra,                  // врагов: base + round((1 − шкала/максимум) × extra)
//       spawns: [[x, y], ...],        // где появляются (тайлы)
//       waves: [3, 4, 5],             // kind 'waves': размеры волн (к каждой — та же прибавка
//       interval, pause,              //   за нехватку воинов); мс между врагами и между волнами
//     }],
//     doneFlag: 'ammon_defeated', onDone: { dialogue: 'yiftach4_victory' },
//   }
//
// Порядок точек выбирает игрок: подходит к любой — там начинается бой. Пока бой идёт, другие
// точки ждут. Каждая точка играется по-своему:
//   skirmish — быстрая: небольшой бой на открытом месте;
//   waves    — волнами: держаться, пока идут волны, и перебить всех;
//   fort     — укреплённая: враги за стенами (стены — в тайлах зоны), к ним нужно обходить.
// Точка взята — её города добавляются к счётчику, а состояние зоны запоминается (как вход в
// зону): после смерти зона начнётся с уже освобождёнными точками, а не с самого начала.
// Все точки — narration (onDone), флаг doneFlag и выход к Й5.
class LiberationMechanic {
  constructor(scene, cfg) {
    const T = CONFIG.TILE_SIZE;
    this.scene = scene;
    this.cfg = cfg;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.active = null; // { point, enemies, waveIndex, toSpawn, nextAt }
    this.px = ([x, y]) => ({ x: x * T + T / 2, y: y * T + T / 2 });
    const def = GameState.map.gauges && GameState.map.gauges[cfg.gauge];
    this.share = def ? Phaser.Math.Clamp((GameState.gauges[cfg.gauge] || 0) / def.max, 0, 1) : 1;

    this.markers = cfg.points.map((p) => {
      const c = this.px([p.x, p.y]);
      const r = (p.radius || 2.5) * T;
      const ring = scene.add.circle(c.x, c.y, r).setStrokeStyle(2, 0xebcb8b, 0.7).setDepth(2);
      const fill = scene.add.circle(c.x, c.y, r, 0xebcb8b, 0.08).setDepth(2);
      return { point: p, c, r, ring, fill, label: null };
    });
    this.refreshMarkers();
  }

  isFreed(p) {
    return !!GameState.flags[`freed_${p.id}`];
  }

  get cities() {
    return this.cfg.points.filter((p) => this.isFreed(p)).reduce((n, p) => n + p.cities, 0);
  }

  // сколько врагов у точки (или в одной волне): чем меньше воинов, тем больше
  scaled(base, extra) {
    return base + Math.round((1 - this.share) * (extra || 0));
  }

  refreshMarkers() {
    this.markers.forEach((m) => {
      const freed = this.isFreed(m.point);
      const on = this.active && this.active.point === m.point;
      const color = freed ? 0xa3be8c : on ? 0xbf616a : 0xebcb8b;
      m.ring.setStrokeStyle(2, color, freed ? 0.5 : 0.8);
      m.fill.setFillStyle(color, freed ? 0.12 : on ? 0.14 : 0.08);
      const name = UI.pick(m.point, 'name');
      // подпись — заново (текст на иврите и на русском — разные объекты)
      if (m.label) m.label.destroy();
      const text = freed ? UI.t('liberation_freed', { name }) : UI.t('liberation_point', { name, n: m.point.cities });
      const y = m.point.labelBelow ? m.c.y + m.r + 6 : m.c.y - m.r - 22;
      m.label = addUiText(this.scene, m.c.x, y, text, { center: true, size: 11, color: '#e5e9f0', background: '#2e3440cc', padding: { x: 4, y: 1 } }).setDepth(20);
    });
    this.langKey = `${UI.lang}${UI.bilingual}`;
  }

  update(time) {
    if (this.langKey !== `${UI.lang}${UI.bilingual}`) this.refreshMarkers(); // сменили язык
    if (this.done) return;
    const p = this.scene.player;
    if (!this.active) {
      const m = this.markers.find((mk) => !this.isFreed(mk.point) && Phaser.Math.Distance.Between(p.x, p.y, mk.c.x, mk.c.y) <= mk.r);
      if (m) this.start(m.point, time);
      return;
    }
    const a = this.active;
    // волны: следующая порция врагов
    if (a.toSpawn > 0 && time >= a.nextAt) {
      this.spawn(a, 1);
      a.toSpawn -= 1;
      a.nextAt = time + (a.point.interval || 700);
    }
    const alive = a.enemies.filter((e) => !e.isDead).length;
    if (a.toSpawn > 0 || alive > 0) return;
    const waves = a.point.waves;
    if (waves && a.waveIndex < waves.length - 1) {
      if (!a.pauseUntil) a.pauseUntil = time + (a.point.pause || 2500);
      if (time < a.pauseUntil) return;
      a.pauseUntil = 0;
      a.waveIndex += 1;
      a.toSpawn = this.scaled(waves[a.waveIndex], a.point.extra);
      this.scene.showToast(UI.t('toast_wave', { n: a.waveIndex + 1 }));
      return;
    }
    this.finishPoint(a.point);
  }

  start(point, time) {
    const a = (this.active = { point, enemies: [], waveIndex: 0, toSpawn: 0, nextAt: time + 600, pauseUntil: 0, spawned: 0 });
    if (point.waves) {
      a.toSpawn = this.scaled(point.waves[0], point.extra);
      this.scene.showToast(`${UI.t('liberation_battle', { name: UI.pick(point, 'name') })}\n${UI.t('toast_wave', { n: 1 })}`);
    } else {
      this.spawn(a, this.scaled(point.base, point.extra));
      this.scene.showToast(UI.t('liberation_battle', { name: UI.pick(point, 'name') }));
    }
    this.refreshMarkers();
  }

  spawn(a, count) {
    const pts = a.point.spawns;
    for (let i = 0; i < count; i++) {
      const k = a.spawned++;
      const p = this.px(pts[k % pts.length]);
      const jitter = k >= pts.length ? 12 : 0; // лишние — рядом с теми же точками
      const e = new Enemy(this.scene, p.x + Phaser.Math.Between(-jitter, jitter), p.y + Phaser.Math.Between(-jitter, jitter), a.point.type, null);
      this.scene.enemies.add(e);
      a.enemies.push(e);
    }
  }

  finishPoint(point) {
    this.active = null;
    GameState.flags[`freed_${point.id}`] = true;
    GameState.logEntry({ type: 'liberation', point: point.id, cities: point.cities });
    // чекпойнт: смерть дальше начнёт зону уже с этой точкой освобождённой
    GameState.zoneSnapshot = GameState.serialize();
    this.scene.showToast(UI.t('liberation_freed_toast', { name: UI.pick(point, 'name'), n: point.cities }));
    this.refreshMarkers();
    if (this.cfg.points.every((p) => this.isFreed(p))) this.finish();
  }

  finish() {
    const { scene, cfg } = this;
    this.done = true;
    GameState.flags[cfg.doneFlag] = true;
    GameState.logEntry({ type: 'liberation_done', cities: this.cities, warriors: GameState.gauges[cfg.gauge] || 0 });
    scene.refreshExits();
    if (cfg.onDone && cfg.onDone.dialogue) scene.time.delayedCall(1200, () => !scene.gameOver && scene.openDialogue(cfg.onDone.dialogue));
  }

  hudLine() {
    const line = UI.t('hud_cities', { value: `${this.cities}/${this.cfg.total}` }) // одной подстановкой — в иврите не перевернётся;
    const a = this.active;
    if (!a) return line;
    const name = UI.pick(a.point, 'name');
    const left = a.enemies.filter((e) => !e.isDead).length + a.toSpawn;
    if (a.point.waves) return `${line}\n${UI.t('hud_liberation_waves', { name, wave: `${a.waveIndex + 1}/${a.point.waves.length}` })}`;
    return `${line}\n${UI.t('hud_liberation_enemies', { name, n: left })}`;
  }
}
