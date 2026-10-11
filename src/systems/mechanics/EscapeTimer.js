// Побег на время (зона: timer + hazards).
//
//   timer:   { seconds: 45, fail: 'fail_timer', label: 'hud_timer' }
//   hazards: [{ path: [[x, y], [x, y], ...], speed?, size?, penalty?, sprite? }]
//
// sprite (необязательно) — id из CONFIG.CHARACTER_SPRITES (например, servant_jar — слуга с
// кувшином, А3): вместо квадрата рисуется фигура, идущая по маршруту (анимация ходьбы в сторону
// движения, Player.makeCharacterSprite — тот же механизм, что у Enemy/NPC). Нет sprite, или лист
// не загрузился — остаётся цветной квадрат текстуры 'hazard', как раньше. Хитбокс столкновения
// (size) от картинки не зависит — считается по дистанции в update() EscapeTimerMechanic.
//
// Время идёт, только пока игра не на паузе. Препятствия ходят по маршруту туда-обратно;
// столкновение отнимает penalty секунд и отбрасывает игрока. Время вышло — сцена проваливается.
class Hazard {
  constructor(scene, data) {
    const T = CONFIG.TILE_SIZE;
    this.points = data.path.map(([tx, ty]) => ({ x: tx * T + T / 2, y: ty * T + T / 2 }));
    this.speed = data.speed || 70;
    this.size = data.size || 22;
    this.penalty = data.penalty !== undefined ? data.penalty : 5;
    this.x = this.points[0].x;
    this.y = this.points[0].y;
    this.target = Math.min(1, this.points.length - 1);
    this.dir = 1;
    this.facing = 'down';

    this.charSprite = data.sprite ? Player.makeCharacterSprite(scene, data.sprite, this.x, this.y) : null;
    if (this.charSprite) this.charSprite.setDepth(6);
    else this.sprite = scene.add.image(this.x, this.y, 'hazard').setDisplaySize(this.size, this.size).setDepth(6);
  }

  update(delta) {
    const p = this.points[this.target];
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      if (this.target + this.dir < 0 || this.target + this.dir >= this.points.length) this.dir *= -1;
      this.target += this.dir;
      return;
    }
    const step = Math.min(dist, (this.speed * delta) / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (this.charSprite) {
      this.facing = Player.facingOf(dx, dy);
      this.charSprite.setPosition(this.x, this.y);
      this.charSprite.play(`${this.charSprite.charLook.key}-walk-${this.facing}`, true);
    } else {
      this.sprite.setPosition(this.x, this.y);
    }
  }
}

class EscapeTimerMechanic {
  constructor(scene, timer, hazards) {
    this.scene = scene;
    this.cfg = timer;
    this.remaining = timer.seconds * 1000;
    this.hazards = (hazards || []).map((h) => new Hazard(scene, h));
    this.immuneUntil = 0;
  }

  update(time, delta) {
    this.remaining -= delta;
    const player = this.scene.player;

    this.hazards.forEach((h) => {
      h.update(delta);
      const touching = Math.hypot(player.x - h.x, player.y - h.y) < (h.size + CONFIG.PLAYER.size) / 2;
      if (touching && time >= this.immuneUntil) {
        this.immuneUntil = time + 800;
        this.remaining -= h.penalty * 1000;
        player.knockFrom(h.x, h.y, time);
        this.scene.showToast(UI.t('toast_penalty', { value: `−${h.penalty}` }));
      }
    });

    if (this.remaining <= 0) this.scene.failZone(this.cfg.fail || 'fail_timer');
  }

  hudLine() {
    return UI.t(this.cfg.label || 'hud_timer', { seconds: Math.max(0, Math.ceil(this.remaining / 1000)) });
  }
}
