// Деревня (зона: village) — Ш2 «Право царя» (Шмуэль алеф 8:10–18).
//
//   village: {
//     groups: [{
//       id, name_he, name_ru,          // группа жителей; подпись — над ней (props зоны)
//       x, y, radius,                  // центр группы (тайлы); подойти ближе radius — можно объявить
//       dialogue,                      // разговор: пункт «права царя» (сказать прямо или резче)
//       doneFlag,                      // ставит диалог, когда пункт объявлен
//       members: [{ x, y, w?, h?, color }],   // фигуры-плейсхолдеры (тайлы)
//       change: {                      // что меняется в деревне, когда пункт объявлен (без насилия):
//         moves: [{ members: [0, 1], to: [x, y], fade? }],  // фигуры уходят (к колесницам, в шатёр…)
//         recolor: ['field_1', ...], color,                  // props с этими id — в «царский» цвет
//       },
//       journal?: { ref_he, ref_ru, key },  // запись в журнал + сообщение (только колесницы: Дварим 17:16)
//     }],
//     plaza: [x, y],                   // куда в конце собирается народ
//     doneFlag, onDone: { dialogue },  // все пункты объявлены → предостережение (8:18) и ответ народа
//   }
//
// Игрок подходит к каждой группе (E или кнопка действия) и объявляет её пункт. Пункт объявлен —
// деревня меняется на глазах: люди уходят, поля окрашиваются. Выход открывается, когда
// объявлены все. Если зона начата заново (или открыта с dev.html), уже объявленное показано сразу.
class VillageMechanic {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.finaleStarted = this.done;
    this.px = ([x, y]) => scene.tileCenter(x, y);
    this.groups = cfg.groups.map((g) => {
      const figures = g.members.map((m) => {
        const p = this.px([m.x, m.y]);
        return scene.add.rectangle(p.x, p.y, m.w || 14, m.h || 18, m.color).setStrokeStyle(1, 0x2e3440).setDepth(6);
      });
      const changed = !!GameState.flags[g.doneFlag];
      const group = { cfg: g, figures, changed, center: this.px([g.x, g.y]) };
      if (changed) this.applyChange(group, false);
      return group;
    });
  }

  get announced() {
    return this.groups.filter((g) => g.changed).length;
  }

  // Группа, к которой можно подойти и объявить пункт
  groupNear() {
    const p = this.scene.player;
    const T = CONFIG.TILE_SIZE;
    return this.groups.find((g) => !GameState.flags[g.cfg.doneFlag] && Phaser.Math.Distance.Between(p.x, p.y, g.center.x, g.center.y) <= (g.cfg.radius || 2) * T);
  }

  canInteract() {
    return !this.done && !!this.groupNear();
  }

  interact() {
    const g = this.groupNear();
    if (!g) return false;
    this.scene.openDialogue(g.cfg.dialogue);
    return true;
  }

  update() {
    // пункт объявлен (флаг из диалога) — деревня меняется
    this.groups.forEach((g) => {
      if (!g.changed && GameState.flags[g.cfg.doneFlag]) {
        g.changed = true;
        this.applyChange(g, true);
      }
    });
    if (!this.finaleStarted && this.groups.every((g) => g.changed)) this.finale();
  }

  // Смена без насилия: фигуры уходят (тает на месте назначения), поля — в «царский» цвет
  applyChange(group, animate) {
    const { scene } = this;
    const ch = group.cfg.change || {};
    (ch.moves || []).forEach((mv) => {
      const to = this.px(mv.to);
      mv.members.forEach((i, k) => {
        const f = group.figures[i];
        if (!f) return;
        const tx = to.x + (k % 3) * 10 - 10;
        const ty = to.y + Math.floor(k / 3) * 10;
        if (!animate) {
          f.setPosition(tx, ty).setAlpha(mv.fade ? 0 : 1);
          return;
        }
        scene.tweens.add({ targets: f, x: tx, y: ty, duration: 1600 + k * 150, ease: 'Sine.easeInOut' });
        if (mv.fade) scene.tweens.add({ targets: f, alpha: 0, delay: 1400 + k * 150, duration: 500 });
      });
    });
    (ch.recolor || []).forEach((id) => {
      const prop = (scene.props || []).find((p) => p.data.id === id);
      if (!prop) return;
      if (!animate) {
        prop.shape.setFillStyle(ch.color, prop.baseAlpha);
        return;
      }
      const from = Phaser.Display.Color.IntegerToColor(prop.data.color);
      const toC = Phaser.Display.Color.IntegerToColor(ch.color);
      const t = { v: 0 };
      scene.tweens.add({
        targets: t,
        v: 100,
        duration: 1400,
        onUpdate: () => {
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, toC, 100, t.v);
          prop.shape.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), prop.baseAlpha);
        },
      });
    });
    if (animate && group.cfg.journal) {
      const j = group.cfg.journal;
      GameState.logEntry({ type: 'compare', ref_ru: j.ref_ru, ref_he: j.ref_he, about: group.cfg.id });
      scene.showToast(UI.t(j.key));
    }
  }

  // Все пункты объявлены: оставшиеся жители собираются на площади, затем предостережение (8:18)
  // и ответ народа (8:19–20)
  finale() {
    const { scene, cfg } = this;
    this.finaleStarted = true;
    const plaza = this.px(cfg.plaza);
    let k = 0;
    this.groups.forEach((g) =>
      g.figures.forEach((f) => {
        if (f.alpha === 0) return;
        const i = k++;
        scene.tweens.add({ targets: f, x: plaza.x + ((i % 6) - 2.5) * 16, y: plaza.y + Math.floor(i / 6) * 18 - 20, duration: 1800, delay: 600, ease: 'Sine.easeInOut' });
      })
    );
    scene.time.delayedCall(2800, () => {
      this.done = true;
      GameState.flags[cfg.doneFlag] = true;
      scene.refreshExits();
      if (cfg.onDone && cfg.onDone.dialogue && !scene.gameOver) scene.openDialogue(cfg.onDone.dialogue);
    });
  }

  hudLine() {
    if (this.done) return null;
    return UI.t('hud_village', { value: `${this.announced}/${this.groups.length}` });
  }
}
