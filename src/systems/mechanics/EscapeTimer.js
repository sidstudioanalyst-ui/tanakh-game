// Побег на время (зона: timer + hazards).
//
//   timer:   { seconds: 45, fail: 'fail_timer', label: 'hud_timer' }
//   hazards: [{ path: [[x, y], [x, y], ...], speed?, size?, penalty? }]
//
// Время идёт, только пока игра не на паузе. Препятствия ходят по маршруту туда-обратно;
// столкновение отнимает penalty секунд и отбрасывает игрока. Время вышло — сцена проваливается.
//
// Вид препятствия — слуга с кувшином (CONFIG.CHARACTER_SPRITES.servant_jar): идёт лицом туда,
// куда движется, на развороте в конце пути — стойка. Удара у него нет: он только сталкивается.
// Это только картинка — столкновение, как и раньше, по расстоянию до (x, y) и size. Нет листа —
// прежний квадрат 'hazard'.
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
    this.sprite = Player.makeCharacterSprite(scene, 'servant_jar', this.x, this.y);
    this.animated = !!this.sprite;
    if (!this.sprite) this.sprite = scene.add.image(this.x, this.y, 'hazard').setDisplaySize(this.size, this.size);
    this.sprite.setDepth(6);
    if (this.animated) this.look(this.points[this.target].x - this.x, this.points[this.target].y - this.y, false);
  }

  // Сторона — по вектору к следующей точке пути; идёт — ходьба, стоит (разворот) — стойка
  look(dx, dy, walking) {
    const dir = Player.facingOf(dx, dy);
    if (walking) {
      this.sprite.charLook.dir = dir;
      this.sprite.play(`${this.sprite.charLook.key}-walk-${dir}`, true);
    } else Player.showStand(this.sprite, dir);
  }

  update(delta) {
    const p = this.points[this.target];
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      if (this.target + this.dir < 0 || this.target + this.dir >= this.points.length) this.dir *= -1;
      this.target += this.dir;
      // разворот: в этот кадр стоит, лицом уже к следующей точке
      if (this.animated) this.look(this.points[this.target].x - this.x, this.points[this.target].y - this.y, false);
      return;
    }
    const step = Math.min(dist, (this.speed * delta) / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.sprite.setPosition(this.x, this.y);
    if (this.animated) this.look(dx, dy, true);
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
