// Тач-управление в GameScene — только на тач-устройствах (CONFIG.TOUCH), клавиатура и мышь
// работают как прежде.
//
//   Джойстик — «плавающий»: появляется там, где палец коснулся левой половины экрана.
//     База и стик внутри; стик следует за пальцем в пределах базы. Направление и сила
//     смещения — направление и скорость движения (как WASD, но плавно). Палец убран —
//     стик возвращается в центр, движение останавливается.
//   «Призрачный» джойстик — подсказка, где управление: полупрозрачная база со стиком и
//     стрелками слева внизу (слева и в иврите — управление не зеркалится). Касаний не ловит.
//     Гаснет, пока палец держит настоящий джойстик, и когда двигаться нельзя: окно поверх
//     игры (диалог, инвентарь, меню, пролог и заставки), провал или смерть, переход,
//     сцена-«рассказ» (look: 'story'), сцена идёт сама (cutscene).
//   Атака — круглая кнопка с мечом справа внизу, на месте. Нажатие = Пробел.
//   Действие (E) — круг поменьше рядом с атакой; виден и активен, только когда рядом есть
//     NPC или место действия (как подсказка «E» над NPC).
//   Уворот и блок — два круга со стрелкой и щитом (с подписями) над атакой и левее, только в
//     боевых зонах. Уворот — нажатие (как Shift), блок — удержание (как Ctrl).
//   Сумка и меню — иконки в верхнем углу (напротив полоски здоровья): инвентарь (I) и меню (Esc).
//
// Касание мира (не кнопки): сначала его получает механика зоны (например, отметить воина в Г3),
// иначе в левой половине — джойстик. После смерти касание начинает зону заново (как R).
class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.cfg = CONFIG.TOUCH_UI;
    this.vector = { x: 0, y: 0 }; // направление × сила (0…1)
    this.stickPointer = null;
    this.objects = [];
    scene.input.addPointer(2); // джойстик + кнопка атаки одновременно

    this.buildJoystick();
    this.buildGhost();
    this.buildButtons();
    this.buildIcons();

    const input = scene.input;
    this.onDown = (pointer, over) => this.pointerDown(pointer, over);
    this.onMove = (pointer) => this.pointerMove(pointer);
    this.onUp = (pointer) => pointer === this.stickPointer && this.releaseStick();
    input.on('pointerdown', this.onDown);
    input.on('pointermove', this.onMove);
    input.on('pointerup', this.onUp);
    input.on('pointerupoutside', this.onUp);
    // Окно поверх игры (диалог, инвентарь) забирает палец — джойстик отпускаем
    // окно поверх игры забрало пальцы — отпускаем и джойстик, и блок
    this.onPause = () => {
      this.releaseStick();
      this.blockHeld = false;
      this.ghost.setAlpha(0); // под окном (диалог, инвентарь, меню) подсказки нет
    };
    scene.events.on('pause', this.onPause);
    // призрачный джойстик — каждый кадр, даже когда GameScene.update выходит рано (провал, переход)
    this.onFrame = (time, delta) => this.updateGhost(delta);
    scene.events.on('update', this.onFrame);
    scene.events.once('shutdown', () => this.destroy());
  }

  // --- построение ------------------------------------------------------------

  fixed(obj, depth = 170) {
    this.objects.push(obj);
    return obj.setScrollFactor(0).setDepth(depth);
  }

  buildJoystick() {
    const R = this.cfg.stickRadius;
    this.base = this.fixed(this.scene.add.circle(0, 0, R, 0x2e3440, 0.45).setStrokeStyle(3, 0xd8dee9, 0.6).setVisible(false));
    this.stick = this.fixed(this.scene.add.circle(0, 0, R * 0.42, 0xd8dee9, 0.75).setStrokeStyle(2, 0x2e3440, 0.8).setVisible(false), 171);
  }

  // Призрачный джойстик: база, стик в центре и четыре стрелки. Только рисунок — без
  // setInteractive, касания проходят сквозь него к обычной логике (джойстик под пальцем).
  buildGhost() {
    const R = this.cfg.stickRadius;
    const inset = this.cfg.ghostInset;
    this.ghostPos = { x: inset.left + R, y: CONFIG.HEIGHT - inset.bottom - R };
    const g = this.scene.add.graphics();
    g.fillStyle(0x2e3440, 0.8).fillCircle(0, 0, R);
    g.lineStyle(3, 0xd8dee9, 1).strokeCircle(0, 0, R);
    g.fillStyle(0xd8dee9, 0.9).fillCircle(0, 0, R * 0.42);
    // стрелки направлений — у края базы, едва заметные
    const a = R * 0.78;
    const s = R * 0.13;
    g.fillStyle(0xd8dee9, 0.55);
    g.fillTriangle(0, -a - s, -s, -a + s * 0.6, s, -a + s * 0.6);
    g.fillTriangle(0, a + s, -s, a - s * 0.6, s, a - s * 0.6);
    g.fillTriangle(-a - s, 0, -a + s * 0.6, -s, -a + s * 0.6, s);
    g.fillTriangle(a + s, 0, a - s * 0.6, -s, a - s * 0.6, s);
    g.setPosition(this.ghostPos.x, this.ghostPos.y);
    this.ghost = this.fixed(g, 165).setAlpha(0);
  }

  // Когда подсказка видна: палец не держит джойстик и игрок может двигаться
  get ghostWanted() {
    const sc = this.scene;
    return !this.stickPointer && !sc.gameOver && !sc.transitioning && !sc.cutscene && !sc.deadWaitingRestart && sc.zone.look !== 'story';
  }

  // Плавно к нужной прозрачности: гаснет быстро (палец уже на экране), появляется мягче
  updateGhost(delta) {
    const target = this.ghostWanted ? this.cfg.ghostAlpha : 0;
    const cur = this.ghost.alpha;
    if (cur === target) return;
    const step = (delta / (target > cur ? 300 : 120)) * this.cfg.ghostAlpha;
    this.ghost.setAlpha(target > cur ? Math.min(target, cur + step) : Math.max(target, cur - step));
  }

  // Круглая кнопка с иконкой; hitPad — насколько область нажатия шире круга
  roundButton(x, y, r, icon, iconScale, onPress, hitPad = 8) {
    const bg = this.fixed(this.scene.add.circle(x, y, r, 0x2e3440, 0.7).setStrokeStyle(3, 0xebcb8b, 0.9));
    const img = this.fixed(this.scene.add.image(x, y, icon).setDisplaySize(r * iconScale * 2, r * iconScale * 2), 171);
    bg.setInteractive(new Phaser.Geom.Circle(r, r, r + hitPad), Phaser.Geom.Circle.Contains);
    bg.isTouchUi = true;
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x4c566a, 0.9);
      onPress();
    });
    const lift = () => bg.setFillStyle(0x2e3440, 0.7);
    bg.on('pointerup', lift);
    bg.on('pointerout', lift);
    return { bg, img, setVisible: (v) => [bg, img].forEach((o) => o.setVisible(v)) };
  }

  buildButtons() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const a = this.cfg.attackRadius;
    const e = this.cfg.actionRadius;
    // Атака — справа внизу; действие — левее и ниже, у большого пальца
    this.attackPos = { x: W - a - 26, y: H - a - 40 };
    this.attackBtn = this.roundButton(this.attackPos.x, this.attackPos.y, a, 'icon-sword', 0.72, () => {
      const p = this.scene.player;
      if (!this.scene.gameOver) p.attack(this.scene.time.now);
    });
    this.actionPos = { x: this.attackPos.x - a - e - 24, y: H - e - 26 };
    this.actionBtn = this.roundButton(this.actionPos.x, this.actionPos.y, e, 'icon-hand', 0.68, () => {
      if (!this.scene.gameOver) this.scene.talk();
    });
    this.actionBtn.bg.setStrokeStyle(2, 0xa3be8c, 0.9);
    this.actionBtn.setVisible(false);

    // Защита — только в боевых зонах. Уворот — над атакой; блок (удерживать) — левее,
    // выше кнопки действия. Обе — в правой половине, джойстику не мешают. Подписи — над кнопками.
    const d = this.cfg.defenseRadius;
    this.blockHeld = false;
    if (!this.scene.combatZone) return;
    this.dodgePos = { x: this.attackPos.x, y: this.attackPos.y - a - 16 - d };
    this.dodgeBtn = this.roundButton(this.dodgePos.x, this.dodgePos.y, d, 'icon-dodge', 0.66, () => {
      if (!this.scene.gameOver) this.scene.player.dodge(this.scene.time.now);
    });
    this.dodgeBtn.bg.setStrokeStyle(2, 0xa3be8c, 0.9);
    this.blockPos = { x: this.attackPos.x - a - 46, y: this.attackPos.y - a - 16 };
    this.blockBtn = this.roundButton(this.blockPos.x, this.blockPos.y, d, 'icon-shield', 0.66, () => (this.blockHeld = true));
    this.blockBtn.bg.setStrokeStyle(2, 0x88c0d0, 0.9);
    const release = () => (this.blockHeld = false);
    this.blockBtn.bg.on('pointerup', release);
    this.blockBtn.bg.on('pointerout', release);
    this.blockBtn.bg.on('pointerupoutside', release);
    const label = (pos, key) =>
      this.fixed(addUiText(this.scene, pos.x, pos.y - d - 18, UI.t(key), { center: true, size: 10, color: '#d8dee9', background: '#2e3440cc', padding: { x: 3, y: 1 } }), 172);
    this.dodgeLabel = label(this.dodgePos, 'touch_dodge');
    this.blockLabel = label(this.blockPos, 'touch_block');
  }

  // Сумка и меню — в верхнем углу со стороны, противоположной полоске здоровья
  buildIcons() {
    const s = this.cfg.iconSize;
    const y = 12 + s / 2;
    const make = (fromEdge, icon, onPress) => {
      const x = UI.x(CONFIG.WIDTH - fromEdge - s / 2);
      const bg = this.fixed(this.scene.add.rectangle(x, y, s, s, 0x2e3440, 0.75).setStrokeStyle(2, 0x88c0d0, 0.9));
      this.fixed(this.scene.add.image(x, y, icon).setDisplaySize(s * 0.78, s * 0.78), 171);
      bg.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-6, -6, s + 12, s + 12), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      bg.isTouchUi = true;
      bg.on('pointerdown', onPress);
      return bg;
    };
    this.menuIcon = make(12, 'icon-menu', () => this.scene.openMenu());
    this.bagIcon = make(12 + s + 10, 'icon-bag', () => this.scene.openInventory());
  }

  // Нижняя граница иконок — HUD ставит под ними кнопки языка
  get iconsBottom() {
    return 12 + this.cfg.iconSize;
  }

  // Левый край иконок (в раскладке для русского) — текст HUD не должен заходить за него
  get iconsLeft() {
    return CONFIG.WIDTH - 12 - this.cfg.iconSize * 2 - 10;
  }

  // Верхний край кнопок (атака, уворот и блок с подписями) — всплывающие сообщения ставятся выше
  get buttonsTop() {
    if (this.dodgePos) return this.dodgePos.y - this.cfg.defenseRadius - 20;
    return this.attackPos.y - this.cfg.attackRadius;
  }

  // --- ввод ------------------------------------------------------------------

  pointerDown(pointer, over) {
    const scene = this.scene;
    if (over.some((o) => o.isTouchUi || o.input)) return; // кнопка, иконка, кнопка языка
    if (scene.deadWaitingRestart) {
      scene.restartAfterDeath();
      return;
    }
    if (scene.gameOver || scene.transitioning) return;
    // касание мира: механика зоны (отметить воина в Г3…)
    const world = pointer.positionToCamera(scene.cameras.main);
    if (scene.tapWorld(world.x, world.y)) return;
    if (pointer.x < CONFIG.WIDTH / 2 && !this.stickPointer) this.grabStick(pointer);
  }

  grabStick(pointer) {
    this.stickPointer = pointer;
    // база — под пальцем, но целиком в левой половине и на экране (не заходит на кнопки)
    const R = this.cfg.stickRadius;
    this.origin = {
      x: Phaser.Math.Clamp(pointer.x, R + 4, CONFIG.WIDTH / 2 - R),
      y: Phaser.Math.Clamp(pointer.y, R + 4, CONFIG.HEIGHT - R - 4),
    };
    this.base.setPosition(this.origin.x, this.origin.y).setVisible(true);
    this.stick.setVisible(true);
    this.pointerMove(pointer);
  }

  pointerMove(pointer) {
    if (pointer !== this.stickPointer) return;
    const R = this.cfg.stickRadius;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.hypot(dx, dy);
    const k = dist > R ? R / dist : 1; // стик не выходит за базу
    this.stick.setPosition(this.origin.x + dx * k, this.origin.y + dy * k);
    // сила: 0 в мёртвой зоне, 1 — у края базы
    const dz = this.cfg.stickDeadZone;
    const strength = Phaser.Math.Clamp((dist / R - dz) / (1 - dz), 0, 1);
    this.vector = dist ? { x: (dx / dist) * strength, y: (dy / dist) * strength } : { x: 0, y: 0 };
  }

  releaseStick() {
    this.stickPointer = null;
    this.vector = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.stick.setVisible(false);
  }

  get moving() {
    return this.vector.x !== 0 || this.vector.y !== 0;
  }

  // Каждый кадр: кнопка действия видна, только когда действие возможно; уворот тускнеет,
  // пока перезаряжается; блок подсвечен, пока его держат
  update() {
    if (this.dodgeBtn) {
      const ready = this.scene.time.now >= this.scene.player.nextDodgeAt;
      this.dodgeBtn.img.setAlpha(ready ? 1 : 0.35);
      this.blockBtn.bg.setFillStyle(this.blockHeld ? 0x4c566a : 0x2e3440, this.blockHeld ? 0.95 : 0.7);
    }
    const can = !this.scene.gameOver && this.scene.canInteract();
    if (can !== this.actionVisible) {
      this.actionVisible = can;
      this.actionBtn.setVisible(can);
      if (can) {
        this.actionBtn.bg.setScale(0.6);
        this.scene.tweens.add({ targets: this.actionBtn.bg, scale: 1, duration: 150, ease: 'Back.easeOut' });
      }
    }
  }

  destroy() {
    const input = this.scene.input;
    input.off('pointerdown', this.onDown);
    input.off('pointermove', this.onMove);
    input.off('pointerup', this.onUp);
    input.off('pointerupoutside', this.onUp);
    this.scene.events.off('pause', this.onPause);
    this.scene.events.off('update', this.onFrame);
  }
}
