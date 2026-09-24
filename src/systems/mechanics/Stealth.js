// Скрытность: стража с конусом зрения (зона: guards: [...]).
//
// Страж в данных зоны:
//   { x, y, facing: 'up'|'down'|'left'|'right'|<градусы>, patrol: [[x, y], ...], loop?, range?, fov? }
// Координаты — тайлы. Без patrol страж стоит на месте и смотрит в сторону facing.
// Маршрут из двух и более точек проходится туда-обратно (loop: true — по кругу).
//
// Конус строится лучами, которые обрываются о стены и закрытые двери — за колонной
// можно спрятаться. Если страж видит игрока, у которого есть оружие (надетое или в сумке),
// сцена проваливается и зона начинается заново.
const FACINGS = { right: 0, down: 90, left: 180, up: 270 };

class Guard {
  constructor(scene, data) {
    const T = CONFIG.TILE_SIZE;
    const toPx = ([tx, ty]) => ({ x: tx * T + T / 2, y: ty * T + T / 2 });
    this.scene = scene;
    this.range = data.range || CONFIG.GUARD.range;
    this.fov = Phaser.Math.DegToRad(data.fov || CONFIG.GUARD.fov);
    this.speed = data.speed || CONFIG.GUARD.speed;
    this.loop = !!data.loop;

    const start = toPx([data.x, data.y]);
    this.x = start.x;
    this.y = start.y;
    const f = typeof data.facing === 'number' ? data.facing : FACINGS[data.facing || 'down'];
    this.facing = Phaser.Math.DegToRad(f);

    this.points = (data.patrol || []).map(toPx);
    this.target = 0;
    this.dir = 1;
    this.pauseUntil = 0;

    this.sprite = scene.add.image(this.x, this.y, 'guard').setDepth(7);
  }

  update(time, delta) {
    if (this.points.length) this.move(time, delta);
    this.sprite.setPosition(this.x, this.y);
  }

  move(time, delta) {
    const p = this.points[this.target];
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (time < this.pauseUntil) {
      this.turnTowards(Math.atan2(dy, dx), delta);
      return;
    }
    if (dist < 2) {
      this.nextTarget();
      this.pauseUntil = time + CONFIG.GUARD.pauseMs;
      return;
    }
    const step = Math.min(dist, (this.speed * delta) / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.turnTowards(Math.atan2(dy, dx), delta);
  }

  nextTarget() {
    if (this.points.length < 2) return;
    if (this.loop) {
      this.target = (this.target + 1) % this.points.length;
      return;
    }
    if (this.target + this.dir < 0 || this.target + this.dir >= this.points.length) this.dir *= -1;
    this.target += this.dir;
  }

  // Плавный поворот — чтобы конус не «перескакивал» на развороте
  turnTowards(angle, delta) {
    const diff = Phaser.Math.Angle.Wrap(angle - this.facing);
    const maxTurn = (4 * delta) / 1000;
    this.facing += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
  }

  // Точка, где луч под углом a упирается в стену (или конец дальности)
  castRay(a) {
    const step = 6;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (let d = step; d <= this.range; d += step) {
      const px = this.x + cos * d;
      const py = this.y + sin * d;
      if (this.scene.isOpaqueAt(px, py)) return { x: this.x + cos * (d - step), y: this.y + sin * (d - step) };
    }
    return { x: this.x + cos * this.range, y: this.y + sin * this.range };
  }

  conePolygon() {
    const rays = CONFIG.GUARD.rays;
    const pts = [{ x: this.x, y: this.y }];
    for (let i = 0; i <= rays; i++) {
      pts.push(this.castRay(this.facing - this.fov / 2 + (this.fov * i) / rays));
    }
    return pts;
  }

  sees(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < CONFIG.GUARD.size) return true; // столкнулся вплотную — заметит в любом случае
    if (dist > this.range) return false;
    if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.facing)) > this.fov / 2) return false;
    // Прямая видимость: на линии взгляда нет стен и закрытых дверей
    for (let d = 6; d < dist; d += 6) {
      if (this.scene.isOpaqueAt(this.x + (dx / dist) * d, this.y + (dy / dist) * d)) return false;
    }
    return true;
  }
}

class StealthMechanic {
  constructor(scene, guards) {
    this.scene = scene;
    this.guards = guards.map((g) => new Guard(scene, g));
    this.cones = scene.add.graphics().setDepth(3);
    this.alert = false;
  }

  update(time, delta) {
    const player = this.scene.player;
    this.guards.forEach((g) => g.update(time, delta));

    const spotted = GameState.isArmed() && this.guards.some((g) => g.sees(player));
    this.draw(spotted);
    if (spotted) this.scene.failZone('fail_spotted');
  }

  draw(alert) {
    const g = this.cones;
    g.clear();
    g.fillStyle(alert ? CONFIG.COLORS.coneAlert : CONFIG.COLORS.cone, alert ? 0.35 : 0.16);
    this.guards.forEach((guard) => g.fillPoints(guard.conePolygon(), true));
  }

  hudLine() {
    return null;
  }
}
