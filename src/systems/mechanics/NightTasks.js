// Ночная вылазка (зона: night) — Г1: разрушить жертвенник Баала и Ашеру, построить новый
// жертвенник, принести в жертву быка. Три действия по очереди, на месте, по клавише E.
//
//   night: {
//     activeFlag: 'night',        // пока флага нет — день, механика ждёт
//     darkness: 0.55,             // затемнение экрана ночью
//     modes: {                    // флаг выбора → множители (выбор делается в диалоге)
//       sortie_alone:    { speed: 1,    work: 1.5, noise: 0.7 },
//       sortie_servants: { speed: 0.85, work: 0.6, noise: 1.4, followers: 2 },
//     },
//     tasks: [{ id, x, y, duration, label, done_color? }, ...],  // по порядку; x, y — тайл
//     sleepers: [{ x, y }, ...],  // спящие горожане и слуги отца — условные «стражи»
//     noise: { workRadius, walkRadius, walkWeight, scale },
//     noticedFlag: 'noticed',     // кто-то проснулся — НЕ провал, а флаг для утренней сцены
//     doneFlag: 'altar_done',
//     onDone: { dialogue: 'g1_morning' },
//   }
//
// Шум: пока идёт работа (стук и свет факела), у каждого спящего в радиусе workRadius каждую
// секунду есть шанс проснуться — тем больше, чем он ближе: (1 − d/R) / scale за секунду.
// Шаги шумят слабее: радиус walkRadius и вес walkWeight. Радиусы умножаются на noise режима,
// время работы — на work. Итог — плавный шанс, а не порог: в одиночку работа дольше, но тише,
// со слугами — короче, но громче (при нынешних числах ≈ 1/3 и ≈ 3/5 «заметили»).
// Проснулся кто-то → noticedFlag (не провал). Все три действия всегда можно довести до конца.
class NightTasksMechanic {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.active = false;
    this.taskIndex = 0;
    this.progress = 0;
    this.working = false;
    this.done = !!GameState.flags[cfg.doneFlag];
    this.sleepers = [];
    this.gfx = scene.add.graphics().setDepth(8);
    this.sites = cfg.tasks.map((t) => ({ ...t, ...scene.tileCenter(t.x, t.y) }));
    this.drawSites();
    if (this.done) this.taskIndex = cfg.tasks.length;
  }

  // Множители выбранного режима (один / со слугами)
  get mode() {
    const entry = Object.entries(this.cfg.modes).find(([flag]) => GameState.flags[flag]);
    return entry ? entry[1] : { speed: 1, work: 1, noise: 1 };
  }

  activate() {
    this.active = true;
    const { scene, cfg } = this;
    this.dark = scene.add.rectangle(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 0x0b1020, cfg.darkness).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.sleepers = cfg.sleepers.map((s) => {
      const { x, y } = scene.tileCenter(s.x, s.y);
      const body = scene.add.rectangle(x, y, 22, 14, 0x81a1c1).setDepth(6).setStrokeStyle(1, 0x2e3440);
      const zz = scene.add.text(x, y - 16, 'z', { fontFamily: CONFIG.UI_FONT, fontSize: '11px', color: '#88c0d0' }).setOrigin(0.5).setDepth(51);
      const bar = scene.add.graphics().setDepth(51);
      return { x, y, body, zz, bar, unrest: 0, awake: false };
    });
    this.scene.player.speedFactor = this.mode.speed;
    // слуги идут следом (только для вида)
    this.followers = [];
    for (let i = 0; i < (this.mode.followers || 0); i++) {
      const f = scene.add.rectangle(scene.player.x, scene.player.y, 16, 16, 0xa3825c).setDepth(9).setStrokeStyle(1, 0x2e3440);
      this.followers.push({ obj: f, lag: 18 + i * 16 });
    }
    this.trail = [];
  }

  update(time, delta) {
    if (this.done) return;
    if (!this.active) {
      if (GameState.flags[this.cfg.activeFlag]) this.activate();
      else return;
    }
    const player = this.scene.player;
    const dt = delta / 1000;
    const site = this.sites[this.taskIndex];

    // работа идёт, пока игрок стоит у места; ушёл — пауза (прогресс сохраняется)
    if (this.working && Phaser.Math.Distance.Between(player.x, player.y, site.x, site.y) > this.siteRadius) this.working = false;
    if (this.working) {
      this.progress += delta / (site.duration * 1000 * this.mode.work);
      if (this.progress >= 1) this.completeTask();
    }

    this.makeNoise(dt, player);
    this.updateFollowers(player);
    this.drawSites();
    this.updatePrompt(player);
  }

  // «E — разрушить жертвенник…» над местом, когда игрок рядом и ещё не начал
  updatePrompt(player) {
    const site = this.sites[this.taskIndex];
    const near = site && !this.done && Phaser.Math.Distance.Between(player.x, player.y, site.x, site.y) <= this.siteRadius;
    const text = near && !this.working ? UI.t('task_prompt', { task: UI.t(site.label) }) : '';
    if (this.prompt && this.promptLang !== UI.lang) {
      this.prompt.destroy(); // язык сменился — у подписи другое направление текста
      this.prompt = null;
    }
    if (!this.prompt) {
      this.promptLang = UI.lang;
      this.prompt = addUiText(this.scene, 0, 0, '', { center: true, size: 12, color: '#2e3440', background: '#ebcb8b', padding: { x: 5, y: 2 } }).setDepth(60);
    }
    if (this.prompt.text !== text) this.prompt.setText(text);
    this.prompt.setVisible(!!text);
    if (site) this.prompt.setPosition(site.x, site.y - 52);
  }

  get siteRadius() {
    return CONFIG.TILE_SIZE * 1.2;
  }

  // E у места действия
  interact() {
    if (!this.active || this.done) return false;
    const site = this.sites[this.taskIndex];
    const p = this.scene.player;
    if (Phaser.Math.Distance.Between(p.x, p.y, site.x, site.y) > this.siteRadius) return false;
    this.working = true;
    return true;
  }

  completeTask() {
    const site = this.sites[this.taskIndex];
    this.working = false;
    this.progress = 0;
    this.scene.showToast(UI.t('task_done', { task: UI.t(site.label) }));
    this.taskIndex += 1;
    if (this.taskIndex >= this.sites.length) this.finish();
  }

  finish() {
    const { scene, cfg } = this;
    this.done = true;
    GameState.flags[cfg.doneFlag] = true;
    scene.player.speedFactor = 1;
    this.drawSites();
    if (this.prompt) this.prompt.setVisible(false);
    scene.tweens.add({ targets: this.dark, fillAlpha: 0, duration: 900 }); // светает
    if (cfg.onDone && cfg.onDone.dialogue) scene.time.delayedCall(900, () => scene.openDialogue(cfg.onDone.dialogue));
  }

  makeNoise(dt, player) {
    const n = this.cfg.noise;
    const moving = player.body.velocity.lengthSq() > 100;
    let radius = 0;
    let weight = 0;
    if (this.working) {
      radius = n.workRadius * this.mode.noise;
      weight = 1;
    } else if (moving) {
      radius = n.walkRadius * this.mode.noise;
      weight = n.walkWeight;
    }
    this.noiseRadius = radius;
    this.sleepers.forEach((s) => {
      if (s.awake) return;
      const d = Phaser.Math.Distance.Between(player.x, player.y, s.x, s.y);
      if (radius && d < radius) {
        const hazard = (weight * (1 - d / radius) * dt) / n.scale; // шанс проснуться за этот кадр
        s.unrest += hazard;
        if (Math.random() < hazard) this.wake(s);
      }
      // полоска над спящим — насколько он уже неспокоен (накопленный шанс)
      s.bar.clear();
      if (s.unrest > 0 && !s.awake) {
        s.bar.fillStyle(0x000000, 0.6).fillRect(s.x - 12, s.y - 26, 24, 4);
        s.bar.fillStyle(0xebcb8b, 1).fillRect(s.x - 12, s.y - 26, 24 * (1 - Math.exp(-s.unrest)), 4);
      }
    });
  }

  wake(s) {
    s.awake = true;
    s.bar.clear();
    s.body.setFillStyle(0xebcb8b);
    s.zz.setText('!').setColor('#bf616a').setFontSize(16);
    if (!GameState.flags[this.cfg.noticedFlag]) this.scene.showToast(UI.t('toast_someone_woke'));
    GameState.flags[this.cfg.noticedFlag] = true;
  }

  updateFollowers(player) {
    if (!this.followers.length) return;
    this.trail.unshift({ x: player.x, y: player.y });
    if (this.trail.length > 60) this.trail.pop();
    this.followers.forEach((f) => {
      const p = this.trail[Math.min(this.trail.length - 1, f.lag)];
      f.obj.setPosition(p.x, p.y);
    });
  }

  drawSites() {
    const g = this.gfx;
    g.clear();
    const T = CONFIG.TILE_SIZE;
    this.sites.forEach((s, i) => {
      const done = i < this.taskIndex;
      const current = i === this.taskIndex && this.active && !this.done;
      const color = done ? s.done_color || 0x4c566a : s.color || 0xbf616a;
      g.fillStyle(color, done ? 0.9 : current ? 1 : 0.6).fillRect(s.x - T / 2 + 4, s.y - T / 2 + 4, T - 8, T - 8);
      if (current) g.lineStyle(2, 0xebcb8b, 1).strokeRect(s.x - T / 2 + 1, s.y - T / 2 + 1, T - 2, T - 2);
    });
    const site = this.sites[this.taskIndex];
    if (site && this.active && !this.done) {
      // прогресс над местом
      g.fillStyle(0x000000, 0.7).fillRect(site.x - 20, site.y - 30, 40, 6);
      g.fillStyle(0xa3be8c, 1).fillRect(site.x - 20, site.y - 30, 40 * this.progress, 6);
      if (this.noiseRadius) g.lineStyle(1, this.working ? 0xd08770 : 0x88c0d0, 0.5).strokeCircle(this.scene.player.x, this.scene.player.y, this.noiseRadius);
    }
  }

  hudLine() {
    if (!this.active || this.done) return null;
    const site = this.sites[this.taskIndex];
    const step = UI.t('task_step', { task: UI.t(site.label), n: `${this.taskIndex + 1}/${this.sites.length}` });
    return GameState.flags[this.cfg.noticedFlag] ? `${step}\n${UI.t('hud_noticed')}` : step;
  }
}
