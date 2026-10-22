// Железная колесница Сисры (Бр3). Ездит по своему пути по кругу (path — точки в px) и не
// останавливается ради игрока. Убить её нельзя: удар только высекает искру. Касание бьёт
// и отбрасывает (урон — stats.damage), поэтому колесницы нужно обходить.
// stop() — колесницы встают (Сисра бросил колесницу), после этого не ранят.
//
// 8 направлений вместо 4 (facing8Of/setupDiagAnims): на прямоугольных путях (barak_3.js)
// колесница едет и по диагонали — с одними только up/left/down/right (Player.facingOf, общий
// для всех спрайтов) на диагональных отрезках картинка дёргано скачет между направлениями.
// Доп. ряды листа — CONFIG.CHARACTER_SPRITES.chariot.layout.diagWalk (tools/build_character_
// sheets.py: DIAG_DIRS). Это только у колесницы: общая LPC-система (Player.js/Enemy.js) не
// тронута, остальные спрайты как были на 4 направлениях.
class ChariotEnemy extends Enemy {
  constructor(scene, x, y, typeKey, spawnKey, opts = {}) {
    super(scene, x, y, typeKey, spawnKey);
    this.path = opts.path || [{ x, y }];
    this.seg = 0;
    this.speed = opts.speed || this.stats.speed;
    this.isChariot = true;
    this.canHurt = true;
    this.contactDamage = true; // колесница бьёт касанием, без замаха
    this.noHpBar = true; // неуязвима — полоски здоровья нет
    this.stopped = false;
    this.body.setImmovable(true);
    this.body.pushable = false;
    // «шире, чем выше» — только для цветного квадрата-плейсхолдера; у спрайта (setupSprite в
    // Enemy.js) свой масштаб из CONFIG.CHARACTER_SPRITES.chariot.scale, растягивать его нельзя.
    if (!this.spriteKey) this.setScale(1.4, 0.9);
    this.setupDiagAnims();
  }

  // Анимации диагоналей — один раз на игру (как Player.createLpcAnims, но отдельно: про
  // diagWalk знает только этот класс)
  setupDiagAnims() {
    const sp = this.spriteSp;
    const dw = sp && sp.layout && sp.layout.diagWalk;
    if (!this.spriteKey || !dw) return;
    const key = this.spriteKey;
    if (this.scene.anims.exists(`${key}-walk-${dw.dirs[0]}`)) return;
    const cols = this.spriteCols;
    dw.dirs.forEach((dir, i) => {
      this.scene.anims.create({
        key: `${key}-walk-${dir}`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: (dw.row + i) * cols + dw.from, end: (dw.row + i) * cols + dw.to }),
        frameRate: dw.fps,
        repeat: -1,
      });
    });
  }

  // Ближайшее из 8 направлений по вектору скорости (вместо Player.facingOf — только 4)
  static facing8Of(dx, dy) {
    if (!dx && !dy) return null;
    const deg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    const sector = Math.round(deg / 45) * 45;
    const BY_SECTOR = { 0: 'right', 45: 'down-right', 90: 'down', 135: 'down-left', 180: 'left', '-180': 'left', '-135': 'up-left', '-90': 'up', '-45': 'up-right' };
    return BY_SECTOR[sector] || 'down';
  }

  // Нет diagWalk у спрайта (лист не собран/не загрузился) — обычное поведение Enemy (4 направления)
  updateSpriteAnim(time) {
    const dw = this.spriteSp && this.spriteSp.layout && this.spriteSp.layout.diagWalk;
    if (!this.spriteKey || !dw) {
      super.updateSpriteAnim(time);
      return;
    }
    if (this.body.velocity.lengthSq() > 100) {
      this.facing = ChariotEnemy.facing8Of(this.body.velocity.x, this.body.velocity.y);
      this.play(`${this.spriteKey}-walk-${this.facing}`, true);
      return;
    }
    if (this.anims.isPlaying) this.anims.stop();
    // стойка собрана только на 4 направления (tools/build_character_sheets.py) — диагональ
    // сводим к ближайшей кардинальной, это видно только в единственный момент (колесница встала)
    const TO_CARDINAL = { 'up-right': 'up', 'up-left': 'up', 'down-right': 'down', 'down-left': 'down' };
    const dir = TO_CARDINAL[this.facing] || this.facing || 'down';
    const f = Player.standFrameOf(this.spriteLayout, this.spriteCols, dir);
    if (this.frame.name !== f) this.setFrame(f);
  }

  update() {
    if (this.stopped) {
      this.setVelocity(0, 0);
      return;
    }
    const next = this.path[(this.seg + 1) % this.path.length];
    if (Phaser.Math.Distance.Between(this.x, this.y, next.x, next.y) < 4) this.seg = (this.seg + 1) % this.path.length;
    const to = this.path[(this.seg + 1) % this.path.length];
    this.scene.physics.moveTo(this, to.x, to.y, this.speed);
  }

  // неуязвима: только искра
  takeDamage() {
    this.setTintFill(0xffe8a0);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
  }

  stop() {
    this.stopped = true;
    this.canHurt = false;
    this.setVelocity(0, 0);
    this.setAlpha(0.8);
  }
}

ENEMY_CLASSES.Chariot = ChariotEnemy;
