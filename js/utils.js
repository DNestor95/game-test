// ─── Utility Functions ─────────────────────────────────────────────────────

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t)     { return a + (b - a) * t; }
function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Pixel position → tile coordinate
function px2tile(px) { return Math.floor(px / TILE_SIZE); }
// Tile coordinate → pixel centre of that tile
function tile2px(tx) { return tx * TILE_SIZE + TILE_SIZE / 2; }

// ─── BFS Pathfinding ───────────────────────────────────────────────────────
// Returns array of {x,y} tile coords from start to goal (inclusive), or [].
function findPath(world, sx, sy, gx, gy, maxDist) {
  sx = clamp(Math.round(sx), 0, MAP_W - 1);
  sy = clamp(Math.round(sy), 0, MAP_H - 1);
  gx = clamp(Math.round(gx), 0, MAP_W - 1);
  gy = clamp(Math.round(gy), 0, MAP_H - 1);

  if (!world.isWalkable(sx, sy)) return [];

  // If goal is a wall, find nearest walkable tile
  if (!world.isWalkable(gx, gy)) {
    let best = null, bestD = Infinity;
    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && world.isWalkable(nx, ny)) {
            const d = Math.abs(dx) + Math.abs(dy);
            if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
          }
        }
      }
      if (best) break;
    }
    if (!best) return [];
    gx = best.x; gy = best.y;
  }

  if (sx === gx && sy === gy) return [];

  const size = MAP_W * MAP_H;
  const visited = new Uint8Array(size);
  const parent  = new Int32Array(size).fill(-1);
  const queue   = [];
  let head = 0;

  const startIdx = sy * MAP_W + sx;
  const goalIdx  = gy * MAP_W + gx;
  visited[startIdx] = 1;
  queue.push(startIdx);

  const DIRS = [-MAP_W, MAP_W, -1, 1]; // up down left right

  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === goalIdx) break;
    if (maxDist !== undefined) {
      const cx = cur % MAP_W, cy = Math.floor(cur / MAP_W);
      if (Math.abs(cx - sx) + Math.abs(cy - sy) > maxDist) continue;
    }
    const cx = cur % MAP_W, cy = Math.floor(cur / MAP_W);
    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i];
      // Bounds check
      if (i === 2 && cx === 0) continue;
      if (i === 3 && cx === MAP_W - 1) continue;
      const ni = cur + dir;
      if (ni < 0 || ni >= size) continue;
      if (visited[ni]) continue;
      const nx = ni % MAP_W, ny = Math.floor(ni / MAP_W);
      if (!world.isWalkable(nx, ny)) continue;
      visited[ni] = 1;
      parent[ni]  = cur;
      queue.push(ni);
    }
  }

  if (parent[goalIdx] === -1 && goalIdx !== startIdx) return [];

  // Reconstruct path
  const path = [];
  let cur = goalIdx;
  while (cur !== -1) {
    path.push({ x: cur % MAP_W, y: Math.floor(cur / MAP_W) });
    cur = parent[cur];
  }
  path.reverse();
  return path.slice(1); // skip start tile
}

// ─── Camera helpers ────────────────────────────────────────────────────────
// World pixel → screen pixel  (camera is the pixel position of screen centre)
function worldToScreen(wx, wy, cam, vw, vh) {
  return {
    sx: wx - cam.x + vw / 2,
    sy: wy - cam.y + vh / 2,
  };
}

// Screen pixel → world pixel
function screenToWorld(sx, sy, cam, vw, vh) {
  return {
    wx: sx + cam.x - vw / 2,
    wy: sy + cam.y - vh / 2,
  };
}

// ─── Simple Perlin-like noise (for world variation) ────────────────────────
// Seeded pseudo-random value grid (integer hash)
function seededHash(x, y, seed) {
  let h = (x * 1619 + y * 31337 + seed * 6971) & 0x7fffffff;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  return ((h >>> 16) ^ h) / 0x7fffffff;
}
