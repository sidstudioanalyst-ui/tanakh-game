// Ночной лагерь мидьянитян (зона: coordination) — Г4 (Шофтим 7:9–22).
//
//   coordination: {
//     activeFlag: 'heard_dream',  // после подслушанного сна: отряды идут к позициям, сигнал доступен
//     darkness: 0.5,              // ночь
//     camp: { x, y, w, h },       // стан (тайлы): мидьянитяне спят здесь, здесь же паника
//     midianites: 28,             // сколько фигур в стане
//     speed: 34,                  // скорость отряда по ровному месту, px/с
//     terrain: { open: 1, rocks: 0.4, wadi: 0.6 },    // множители скорости по местности
//     areas: [{ x, y, w, h, terrain: 'rocks' }, ...], // участки местности (видны на карте и мини-карте)
//     squads: [{ id, label, color, path: [[x, y], ...] }, ...], // два других отряда; конец пути — позиция
//     fight: { full: {...}, partial: {...}, early: {...} },  // бой после сигнала, см. ниже
//     signalFlag: 'jars_broken', doneFlag: 'camp_routed',
//     onDone: { dialogue: 'g4_panic' },
//   }
//
// Это не таймер на реакцию. Отряды идут сами, каждый со своей скоростью (камни и вади
// замедляют), игрок видит их на мини-карте и подаёт сигнал (E — разбить кувшин), когда решит.
// Ждать можно сколько угодно. Итог зависит от того, сколько отрядов уже на местах:
//   оба — signal_full: полная паника, мидьянитяне рубят друг друга по всему стану;
//   один — signal_partial: часть стана успевает собраться и отходит строем;
//   ни одного — signal_early: паника слабее, большая часть отходит в порядке.
// Провала нет — только более или менее полная победа.
// После сигнала — бой в стане: фигуры становятся врагами (PanickedEnemy), Гидон ходит и бьёт.
// fight[исход]: { hp, speed, fearRange, lunge?, organized (доля собранных), organizedHp/Speed/Damage,
//   clashEvery, clashFall (стычки между своими), flee: [мин, макс] с — когда уцелевший бежит, shake }.
// Чем лучше сигнал, тем враги растеряннее: не бьют, убегают, чаще рубят друг друга, раньше бегут.
// Зона завершается, когда в стане никого не осталось (убиты, пали в стычках или бежали).
// В журнал: сколько отрядов было на местах и итог боя; при обоих — +1 свет «мудрости и разумению».
class CoordinationMechanic {
  constructor(scene, cfg) {
    const T = CONFIG.TILE_SIZE;
    this.scene = scene;
    this.cfg = cfg;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.signaled = this.done || !!GameState.flags[cfg.signalFlag];
    this.active = false;
    this.strengthShown = !!GameState.flags[cfg.activeFlag]; // вернулись в зону — без повторного эффекта
    this.px = (p) => ({ x: p[0] * T + T / 2, y: p[1] * T + T / 2 });
    this.campRect = new Phaser.Geom.Rectangle(cfg.camp.x * T, cfg.camp.y * T, cfg.camp.w * T, cfg.camp.h * T);

    // местность: камни и вади видны на карте
    this.areas = (cfg.areas || []).map((a) => {
      const rect = new Phaser.Geom.Rectangle(a.x * T, a.y * T, a.w * T, a.h * T);
      const color = a.terrain === 'rocks' ? 0x6b6356 : 0x3e5566;
      scene.add.rectangle(rect.x, rect.y, rect.width, rect.height, color, 0.45).setOrigin(0).setDepth(1);
      return { ...a, rect, color };
    });

    // отряды: точка на пути (сегмент + пройденная доля)
    this.squads = cfg.squads.map((s) => {
      const pts = s.path.map(this.px);
      const end = pts[pts.length - 1];
      scene.add.circle(end.x, end.y, 18).setStrokeStyle(2, s.color, 0.6).setDepth(2);
      const dots = [0, 1, 2].map(() => scene.add.rectangle(0, 0, 9, 9, s.color).setDepth(7).setStrokeStyle(1, 0x2e3440));
      const label = addUiText(scene, 0, 0, UI.t(s.label), { center: true, size: 10, color: '#d8dee9' }).setDepth(52);
      const squad = { ...s, labelKey: s.label, pts, seg: 0, x: pts[0].x, y: pts[0].y, arrived: false, dots, label };
      if (this.signaled) this.placeAt(squad, pts.length - 1);
      return squad;
    });

    // мидьянитяне спят в стане
    const n = this.done ? 0 : cfg.midianites || 24;
    this.figures = [];
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(this.campRect.x + 10, this.campRect.right - 10);
      const y = Phaser.Math.Between(this.campRect.y + 10, this.campRect.bottom - 10);
      const body = scene.add.rectangle(x, y, 16, 9, 0x9c6b5b).setDepth(6).setStrokeStyle(1, 0x2e3440);
      this.figures.push({ body, x, y, vx: 0, vy: 0, fallen: false, organized: false });
    }

    this.dark = scene.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x0b1020, this.done ? cfg.darkness * 0.4 : cfg.darkness).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.fx = scene.add.graphics().setDepth(51); // вспышки ударов в панике
    this.map = scene.add.graphics().setScrollFactor(0).setDepth(110); // мини-карта
    this.mapTitle = null;
    this.torches = [];
    this.labelLang = UI.lang;
    this.updateLabels();
  }

  // --- отряды ---------------------------------------------------------------

  terrainAt(x, y) {
    const area = this.areas.find((a) => a.rect.contains(x, y));
    return area ? area.terrain : 'open';
  }

  placeAt(squad, index) {
    const p = squad.pts[index];
    squad.seg = squad.pts.length - 1;
    squad.x = p.x;
    squad.y = p.y;
    squad.arrived = true;
  }

  moveSquad(squad, dt) {
    if (squad.arrived) return;
    const factor = (this.cfg.terrain || {})[this.terrainAt(squad.x, squad.y)] || 1;
    let left = this.cfg.speed * factor * dt;
    while (left > 0 && squad.seg < squad.pts.length - 1) {
      const to = squad.pts[squad.seg + 1];
      const d = Phaser.Math.Distance.Between(squad.x, squad.y, to.x, to.y);
      if (d <= left) {
        squad.x = to.x;
        squad.y = to.y;
        squad.seg += 1;
        left -= d;
      } else {
        squad.x += ((to.x - squad.x) / d) * left;
        squad.y += ((to.y - squad.y) / d) * left;
        left = 0;
      }
    }
    if (squad.seg >= squad.pts.length - 1) squad.arrived = true;
  }

  get inPlace() {
    return this.squads.filter((s) => s.arrived).length;
  }

  updateLabels() {
    const relabel = this.labelLang !== UI.lang; // язык сменился — подписи на новом языке
    this.labelLang = UI.lang;
    this.squads.forEach((s) => {
      if (relabel) {
        s.label.destroy();
        s.label = addUiText(this.scene, 0, 0, UI.t(s.labelKey), { center: true, size: 10, color: '#d8dee9' }).setDepth(52);
      }
      s.dots.forEach((d, i) => d.setPosition(s.x - 10 + i * 10, s.y + (i % 2) * 5));
      s.label.setPosition(s.x, s.y - 26);
    });
  }

  // --- цикл -----------------------------------------------------------------

  update(time, delta) {
    const dt = delta / 1000;
    if (!this.active && GameState.flags[this.cfg.activeFlag]) this.activate();
    if (this.active && !this.signaled) this.squads.forEach((s) => this.moveSquad(s, dt));
    this.updateLabels();
    if (this.fight) this.updateFight(time);
    this.drawMinimap();
  }

  // Сон подслушан: Гидон укрепляется духом (свечение, без статов); отряды выходят
  activate() {
    this.active = true;
    if (this.strengthShown) return;
    this.strengthShown = true;
    const p = this.scene.player;
    this.scene.showToast(UI.t('toast_strengthened'));
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(p.x, p.y, 16).setStrokeStyle(3, 0xebcb8b, 0.9).setDepth(52);
      this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 1100, delay: i * 350, onComplete: () => ring.destroy() });
    }
    const aura = this.scene.add.circle(p.x, p.y, 20, 0xebcb8b, 0.35).setDepth(52);
    this.scene.tweens.add({ targets: aura, alpha: 0, scale: 2, duration: 2200, onUpdate: () => aura.setPosition(p.x, p.y), onComplete: () => aura.destroy() });
  }

  canInteract() {
    return this.active && !this.signaled;
  }

  // E — разбить кувшин: сигнал. Можно в любой момент после сна.
  interact() {
    if (!this.canInteract()) return false;
    this.signal();
    return true;
  }

  signal() {
    const { scene, cfg } = this;
    this.signaled = true;
    const n = this.inPlace;
    const quality = n >= this.squads.length ? 'full' : n > 0 ? 'partial' : 'early';
    GameState.flags[cfg.signalFlag] = true;
    GameState.flags[`signal_${quality}`] = true;
    GameState.logEntry({ type: 'signal', squadsInPlace: n, squads: this.squads.length, quality });
    if (quality === 'full') GameState.addMeasure('wisdom', 1); // дождался сведений, прежде чем решить

    // кувшины разбиты: факелы у всех трёх отрядов, крик
    scene.cameras.main.flash(300, 235, 180, 90);
    scene.showToast(UI.t('toast_shout'));
    [...this.squads.map((s) => ({ x: s.x, y: s.y })), { x: scene.player.x, y: scene.player.y }].forEach((pt) => {
      for (let i = 0; i < 3; i++) {
        const t = scene.add.circle(pt.x - 12 + i * 12, pt.y - 6, 7, 0xffb347, 0.95).setDepth(52);
        scene.tweens.add({ targets: t, alpha: 0.5, scale: 1.3, duration: 180 + i * 40, yoyo: true, repeat: -1 });
        this.torches.push(t);
      }
    });
    this.startFight(quality);
  }

  // --- бой в стане после сигнала -------------------------------------------
  // Спящие фигуры превращаются во врагов (PanickedEnemy), игрок ходит по стану и бьёт.
  // Насколько они растеряны — по исходу сигнала (cfg.fight[quality]). Между собой они тоже
  // сходятся в стычках: «обратил Г-сподь меч одного на другого». Кто уцелел — со временем
  // бежит на восток. Зона завершается, когда в стане никого не осталось.
  startFight(quality) {
    const { scene, cfg } = this;
    const p = cfg.fight[quality];
    const T = CONFIG.TILE_SIZE;
    scene.cameras.main.shake(700, p.shake);
    const params = { ...p, camp: this.campRect, fleeX: this.campRect.right + 3 * T };
    const organizedCount = Math.round(this.figures.length * p.organized);
    this.fighters = Phaser.Utils.Array.Shuffle(this.figures).map((f, i) => {
      f.body.destroy();
      const e = new PanickedEnemy(scene, f.x, f.y, 'midianite_panic', null, { ...params, organized: i < organizedCount });
      scene.enemies.add(e);
      return e;
    });
    this.figures = [];
    this.fight = { quality, total: this.fighters.length, byGideon: 0, inClash: 0, fled: 0, nextClash: scene.time.now + 600 };
    this.onDead = (e) => {
      if (!e.isPanicked || !this.fight) return;
      if (e.fellInClash) this.fight.inClash += 1;
      else this.fight.byGideon += 1;
    };
    this.onFled = () => this.fight && (this.fight.fled += 1);
    scene.events.on('enemy-dead', this.onDead);
    scene.events.on('panicked-fled', this.onFled);
    scene.events.once('shutdown', () => {
      scene.events.off('enemy-dead', this.onDead);
      scene.events.off('panicked-fled', this.onFled);
    });
  }

  get remaining() {
    return (this.fighters || []).filter((e) => !e.isDead).length;
  }

  updateFight(time) {
    const { fight } = this;
    const p = this.cfg.fight[fight.quality];
    this.fx.clear();
    // стычка: двое растерянных рядом — вспышка, один падает
    if (time >= fight.nextClash) {
      fight.nextClash = time + Phaser.Math.Between(p.clashEvery * 0.7, p.clashEvery * 1.3);
      const wild = this.fighters.filter((e) => !e.isDead && !e.organized && time < e.fleeAt);
      const a = Phaser.Utils.Array.GetRandom(wild);
      const b = a && wild.filter((e) => e !== a && Phaser.Math.Distance.Between(a.x, a.y, e.x, e.y) < 90)[0];
      if (a && b) {
        this.clash = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, until: time + 180 };
        if (Math.random() < p.clashFall) b.fallInClash();
      }
    }
    if (this.clash && time < this.clash.until) {
      this.fx.lineStyle(2, 0xff6b4a, 0.9).lineBetween(this.clash.a.x, this.clash.a.y, this.clash.b.x, this.clash.b.y);
      this.fx.fillStyle(0xffd28a, 0.9).fillCircle((this.clash.a.x + this.clash.b.x) / 2, (this.clash.a.y + this.clash.b.y) / 2, 5);
    }
    if (this.remaining === 0) this.finishFight();
  }

  finishFight() {
    const { scene, cfg, fight } = this;
    this.fight = null;
    this.fx.clear();
    GameState.logEntry({ type: 'camp_fight', quality: fight.quality, total: fight.total, byGideon: fight.byGideon, inClash: fight.inClash, fled: fight.fled });
    scene.tweens.add({ targets: this.dark, fillAlpha: cfg.darkness * 0.4, duration: 900 }); // светает
    scene.showToast(UI.t('toast_camp_empty'));
    scene.time.delayedCall(900, () => {
      this.done = true;
      GameState.flags[cfg.doneFlag] = true;
      scene.refreshExits();
      if (cfg.onDone && cfg.onDone.dialogue) scene.openDialogue(cfg.onDone.dialogue);
    });
  }

  // --- мини-карта -------------------------------------------------------------
  // Вся зона в уменьшенном виде: стан, местность, позиции отрядов (кольца), отряды и игрок.
  // Угол напротив полоски здоровья (под подсказками/иконками); на узком экране — под строкой
  // механик, по центру.
  drawMinimap() {
    const g = this.map;
    g.clear();
    if (!this.active || this.done || this.signaled) { // после сигнала мини-карта не нужна
      if (this.mapTitle) this.mapTitle.setVisible(false);
      return;
    }
    const scene = this.scene;
    const W = 190;
    const zoneW = scene.mapWidth;
    const zoneH = scene.mapHeight;
    const k = W / zoneW;
    const H = zoneH * k;
    let left;
    let top;
    if (CONFIG.PORTRAIT && scene.statusText) {
      left = (CONFIG.WIDTH - W) / 2;
      top = scene.statusText.y + scene.statusText.height + 22;
    } else {
      left = UI.rtl ? 16 : CONFIG.WIDTH - 16 - W;
      top = CONFIG.TOUCH ? 104 : 136; // под подсказками по клавишам (в боевой зоне их 6 строк)
    }
    const X = (x) => left + x * k;
    const Y = (y) => top + y * k;
    g.fillStyle(0x0b1020, 0.85).fillRect(left - 4, top - 4, W + 8, H + 8);
    g.lineStyle(1, 0x88c0d0, 0.8).strokeRect(left - 4, top - 4, W + 8, H + 8);
    this.areas.forEach((a) => g.fillStyle(a.color, 0.8).fillRect(X(a.rect.x), Y(a.rect.y), a.rect.width * k, a.rect.height * k));
    g.fillStyle(0x9c6b5b, 0.6).fillRect(X(this.campRect.x), Y(this.campRect.y), this.campRect.width * k, this.campRect.height * k);
    this.squads.forEach((s) => {
      const end = s.pts[s.pts.length - 1];
      g.lineStyle(1, s.color, 0.35);
      for (let i = s.seg; i < s.pts.length - 1; i++) g.lineBetween(X(i === s.seg ? s.x : s.pts[i].x), Y(i === s.seg ? s.y : s.pts[i].y), X(s.pts[i + 1].x), Y(s.pts[i + 1].y));
      g.lineStyle(2, s.color, s.arrived ? 1 : 0.6).strokeCircle(X(end.x), Y(end.y), 5);
      g.fillStyle(s.color, 1).fillCircle(X(s.x), Y(s.y), s.arrived ? 4 : 3);
    });
    const p = scene.player;
    g.fillStyle(0xebcb8b, 1).fillRect(X(p.x) - 3, Y(p.y) - 3, 6, 6);
    if (!this.mapTitle || this.mapTitleLang !== UI.lang) {
      if (this.mapTitle) this.mapTitle.destroy();
      this.mapTitleLang = UI.lang;
      this.mapTitle = addUiText(scene, 0, 0, UI.t('minimap_title'), { size: 11, color: '#88c0d0' }).setScrollFactor(0).setDepth(111);
    }
    this.mapTitle.setVisible(true).setOrigin(UI.rtl ? 1 : 0, 0).setPosition(UI.rtl ? left + W : left, top + H + 6);
  }

  hudLine() {
    if (this.done) return null;
    if (!this.active) return UI.t('hud_listen');
    if (this.fight) return UI.t('hud_camp_fight', { n: this.remaining });
    if (this.signaled) return UI.t('hud_signal_given');
    return `${UI.t('hud_squads', { n: `${this.inPlace}/${this.squads.length}` })}\n${UI.t('hud_signal_hint')}`;
  }
}
