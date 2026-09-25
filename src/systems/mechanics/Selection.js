// «Ограниченное внимание» (зона: selection) — Г3, отбор у воды у источника Харод.
//
//   selection: {
//     activeFlag: 'fearful_left',     // после переклички (22 000 ушли) начинается отбор
//     army: { start: 32000, afterFear: 10000, final: 300 },   // числа на экране
//     seconds: 40, maxMarks: 30,      // время и сколько воинов можно отметить
//     markRange: 34,                  // как близко подойти, чтобы отметить (px)
//     markMs: 450,                    // сколько длится отметка (нельзя отметить мгновенно всех)
//     searchedSeconds: 3,             // сколько пробыть у точки, чтобы она считалась осмотренной
//     locations: [{ id, label, x, y, w, h, count, lappers, shade? }, ...],
//     doneFlag: 'army_300',
//     onDone: { dialogue: 'g3_three_hundred' },
//   }
//
// У каждой точки своё соотношение «сторожевых» (пьют из ладони стоя — у них время от времени
// мелькает короткий сигнал «взгляд по сторонам») и «коленопреклонённых» (без сигнала).
// Игрок подходит и отмечает воинов клавишей E. Дойти до всех точек за отведённое время нельзя —
// нужно выбрать, где смотреть.
//
// Итог не оценивает точность. В журнал (GameState.journal) пишется, где игрок искал и сколько
// отметил. В Мерило («мудрость и разумение») идёт только то, ГДЕ искал — широта поиска:
//   осмотрел 2 точки → +1 свет, 3 точки → +2 света; одну — без изменений.
// Точка считается осмотренной, если в ней отмечен хотя бы один воин или игрок пробыл
// там не меньше searchedSeconds.
// Финал одинаков для всех: войско на экране сокращается до 300.
// Завершение: вышло время ИЛИ отмечено maxMarks — поэтому зону нельзя «заклинить».
class SelectionMechanic {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.state = GameState.flags[cfg.doneFlag] ? 'done' : 'muster'; // muster → counting → select → finale → done
    this.army = this.state === 'done' ? cfg.army.final : GameState.flags[cfg.activeFlag] ? cfg.army.afterFear : cfg.army.start;
    this.remaining = cfg.seconds * 1000;
    this.marks = 0;
    this.markBusyUntil = 0;
    this.gfx = scene.add.graphics().setDepth(7);
    this.presence = {};
    this.buildWarriors();
  }

  buildWarriors() {
    const { scene, cfg } = this;
    const T = CONFIG.TILE_SIZE;
    this.locations = cfg.locations.map((loc) => {
      const rect = new Phaser.Geom.Rectangle(loc.x * T, loc.y * T, loc.w * T, loc.h * T);
      if (loc.shade) scene.add.rectangle(rect.x, rect.y, rect.width, rect.height, 0x000000, 0.28).setOrigin(0).setDepth(2);
      scene.add
        .rectangle(rect.x, rect.y, rect.width, rect.height)
        .setOrigin(0)
        .setStrokeStyle(1, 0x88c0d0, 0.35)
        .setDepth(2);
      addUiText(scene, rect.centerX, rect.y - 20, UI.t(loc.label), { center: true, size: 12, color: '#88c0d0' }).setDepth(20);
      this.presence[loc.id] = 0;
      return { ...loc, rect, marks: 0, lapperMarks: 0 };
    });

    // воины: сетка внутри прямоугольника точки; «сторожевые» — случайные из них
    this.warriors = [];
    if (this.state === 'done') return;
    this.locations.forEach((loc) => {
      const cells = [];
      for (let ty = loc.y; ty < loc.y + loc.h; ty++) {
        for (let tx = loc.x; tx < loc.x + loc.w; tx++) {
          if (scene.walkable[ty] && scene.walkable[ty][tx]) cells.push([tx, ty]);
        }
      }
      Phaser.Utils.Array.Shuffle(cells);
      const picked = cells.slice(0, loc.count);
      const lapperSet = new Set(Phaser.Utils.Array.Shuffle([...picked.keys()]).slice(0, loc.lappers));
      picked.forEach(([tx, ty], i) => {
        const { x, y } = scene.tileCenter(tx, ty);
        const body = scene.add.rectangle(x, y, 16, 16, 0xc7b89a).setDepth(6).setStrokeStyle(1, 0x2e3440);
        this.warriors.push({
          x,
          y,
          body,
          loc: loc.id,
          lapper: lapperSet.has(i),
          marked: false,
          // сигнал «взгляд по сторонам»: короткая вспышка раз в 2,5–4,5 с, у каждого своя фаза
          period: Phaser.Math.Between(2500, 4500),
          phase: Phaser.Math.Between(0, 4500),
        });
      });
    });
  }

  update(time, delta) {
    if (this.state === 'done') return;
    if (this.state === 'muster' && GameState.flags[this.cfg.activeFlag]) this.startCounting();
    if (this.state === 'select') this.updateSelect(time, delta);
    this.draw(time);
  }

  // Часть 1: число на экране уменьшается 32 000 → 10 000 (без участия игрока)
  startCounting() {
    this.state = 'counting';
    this.tweenArmy(this.cfg.army.afterFear, 2500, () => {
      this.state = 'select';
      this.scene.showToast(UI.t('toast_selection_start', { seconds: this.cfg.seconds, marks: this.cfg.maxMarks }));
    });
  }

  tweenArmy(to, duration, onComplete) {
    const counter = { v: this.army };
    this.scene.tweens.add({
      targets: counter,
      v: to,
      duration,
      onUpdate: () => (this.army = Math.round(counter.v)),
      onComplete: () => {
        this.army = to;
        if (onComplete) onComplete();
      },
    });
  }

  updateSelect(time, delta) {
    this.remaining -= delta;
    const p = this.scene.player;
    this.locations.forEach((loc) => {
      if (loc.rect.contains(p.x, p.y)) this.presence[loc.id] += delta / 1000;
    });
    if (this.remaining <= 0 || this.marks >= this.cfg.maxMarks) this.finish();
  }

  // E рядом с воином — отметить его
  interact(time) {
    if (this.state !== 'select' || time < this.markBusyUntil) return false;
    const p = this.scene.player;
    let best = null;
    let bestD = this.cfg.markRange;
    this.warriors.forEach((w) => {
      if (w.marked) return;
      const d = Phaser.Math.Distance.Between(p.x, p.y, w.x, w.y);
      if (d <= bestD) {
        best = w;
        bestD = d;
      }
    });
    if (!best) return false;
    best.marked = true;
    this.marks += 1;
    this.markBusyUntil = time + this.cfg.markMs;
    const loc = this.locations.find((l) => l.id === best.loc);
    loc.marks += 1;
    if (best.lapper) loc.lapperMarks += 1;
    return true;
  }

  finish() {
    if (this.state !== 'select') return;
    this.state = 'finale';
    const { cfg, scene } = this;
    const searched = this.locations.filter((l) => l.marks > 0 || this.presence[l.id] >= cfg.searchedSeconds).map((l) => l.id);

    GameState.logEntry({
      type: 'selection',
      searched,
      presence: Object.fromEntries(Object.entries(this.presence).map(([k, v]) => [k, Math.round(v * 10) / 10])),
      marks: Object.fromEntries(this.locations.map((l) => [l.id, l.marks])),
      lapperMarks: Object.fromEntries(this.locations.map((l) => [l.id, l.lapperMarks])),
      total: this.marks,
    });
    // Мерило: только то, где искал (не точность)
    if (searched.length >= 2) GameState.addMeasure('wisdom', searched.length - 1);

    // Войско сокращается до 300 — одинаково для всех
    this.warriors.forEach((w, i) => {
      const keep = i % Math.ceil(this.warriors.length / 6) === 0; // горстка «трёхсот» на экране
      scene.tweens.add({ targets: w.body, alpha: keep ? 1 : 0, duration: 1200, delay: 200 });
    });
    this.tweenArmy(cfg.army.final, 2500, () => {
      this.state = 'done';
      GameState.flags[cfg.doneFlag] = true;
      scene.refreshExits();
      if (cfg.onDone && cfg.onDone.dialogue) scene.time.delayedCall(600, () => scene.openDialogue(cfg.onDone.dialogue));
    });
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    this.warriors.forEach((w) => {
      if (w.body.alpha === 0) return;
      if (w.marked) g.lineStyle(2, 0xeceff4, 0.9).strokeCircle(w.x, w.y, 13);
      // сигнал у «сторожевых»: короткий «взгляд» — светлая чёрточка над головой
      if (w.lapper && this.state === 'select' && (time + w.phase) % w.period < 350) {
        g.fillStyle(0xffffff, 1).fillRect(w.x - 7, w.y - 14, 14, 3);
      }
    });
  }

  hudLine() {
    const lines = [UI.t('hud_army', { value: this.army.toLocaleString('ru-RU').replace(/ /g, ' ') })];
    if (this.state === 'select') {
      lines.push(
        UI.t('hud_selection', {
          seconds: Math.max(0, Math.ceil(this.remaining / 1000)),
          marks: `${this.marks}/${this.cfg.maxMarks}`,
        })
      );
    }
    return lines.join('\n');
  }
}
