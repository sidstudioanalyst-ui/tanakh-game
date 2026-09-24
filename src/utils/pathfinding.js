// Поиск пути на сетке тайлов (BFS, 4 направления).
// grid[ty][tx] === true — клетка проходима.
// Возвращает массив клеток [{tx, ty}, ...] от start до goal включительно или null.
function findPath(grid, start, goal) {
  const h = grid.length;
  const w = grid[0].length;
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  if (!inside(start.tx, start.ty) || !inside(goal.tx, goal.ty)) return null;
  if (!grid[goal.ty][goal.tx]) return null;

  const key = (x, y) => y * w + x;
  const cameFrom = new Map([[key(start.tx, start.ty), null]]);
  const queue = [start];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length) {
    const cur = queue.shift();
    if (cur.tx === goal.tx && cur.ty === goal.ty) {
      const path = [];
      for (let c = cur; c; c = cameFrom.get(key(c.tx, c.ty))) path.push(c);
      return path.reverse();
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.tx + dx;
      const ny = cur.ty + dy;
      const k = key(nx, ny);
      if (inside(nx, ny) && grid[ny][nx] && !cameFrom.has(k)) {
        cameFrom.set(k, cur);
        queue.push({ tx: nx, ty: ny });
      }
    }
  }
  return null;
}
