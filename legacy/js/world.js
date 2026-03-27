// ─── Procedural World Generation ──────────────────────────────────────────

class World {
  constructor(seed) {
    this.seed        = seed || Math.floor(Math.random() * 99999);
    this.tiles       = new Uint8Array(MAP_W * MAP_H); // TILE values
    this.terminals   = [];  // [{x,y,hacked}]
    this.items       = [];  // Item instances
    this.spawnPlayer = { x: 0, y: 0 };
    this.spawnPolice = [];
    this.spawnCivilian = [];
    this.namedLocs   = []; // [{x,y,name,color}]
    this._generate();
  }

  // ── Tile access ──────────────────────────────────────────────────────────
  idx(x, y)          { return y * MAP_W + x; }
  getTile(x, y)      { return this.tiles[this.idx(x, y)] ?? TILE.WALL; }
  setTile(x, y, t)   { if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) this.tiles[this.idx(x, y)] = t; }
  isWalkable(x, y) {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
    const t = this.tiles[this.idx(x, y)];
    return t === TILE.FLOOR || t === TILE.TERMINAL || t === TILE.DOOR;
  }

  // ── World generation ─────────────────────────────────────────────────────
  _generate() {
    // Step 1: fill with FLOOR (streets everywhere)
    this.tiles.fill(TILE.FLOOR);

    // Step 2: place buildings — divide map into blocks
    const BLOCK = 14;   // one block cell = 14 tiles
    const PAD   = 2;    // minimum alley width

    for (let bx = 0; bx < MAP_W; bx += BLOCK) {
      for (let by = 0; by < MAP_H; by += BLOCK) {
        // Leave PAD-tile border around each cell as alley
        const innerX = bx + PAD;
        const innerY = by + PAD;
        const innerW = Math.min(BLOCK - PAD * 2, MAP_W - innerX);
        const innerH = Math.min(BLOCK - PAD * 2, MAP_H - innerY);
        if (innerW <= 0 || innerH <= 0) continue;

        // 65% chance: solid building block
        if (seededHash(bx, by, this.seed) < 0.65) {
          // Random building smaller than the full inner block
          const bw = randInt(Math.max(3, innerW - 3), innerW);
          const bh = randInt(Math.max(3, innerH - 3), innerH);
          const ox  = randInt(0, innerW - bw);
          const oy  = randInt(0, innerH - bh);

          for (let x = innerX + ox; x < innerX + ox + bw; x++) {
            for (let y = innerY + oy; y < innerY + oy + bh; y++) {
              this.setTile(x, y, TILE.WALL);
            }
          }

          // Add a door on a random walkable edge
          this._addDoor(innerX + ox, innerY + oy, bw, bh);
        }
        // else: 35% chance — open lot / alley plaza (stays FLOOR)
      }
    }

    // Step 3: place terminals
    this._placeTerminals(28);

    // Step 4: place items
    this._placeItems(50);

    // Step 5: set spawn points
    this._setSpawns();

    // Step 6: named locations for atmosphere
    this._setNamedLocations();
  }

  _addDoor(bx, by, bw, bh) {
    const side = randInt(0, 3);
    let dx, dy;
    switch (side) {
      case 0: dx = randInt(bx, bx + bw - 1); dy = by;         break; // top
      case 1: dx = randInt(bx, bx + bw - 1); dy = by + bh - 1; break; // bottom
      case 2: dx = bx;          dy = randInt(by, by + bh - 1); break; // left
      case 3: dx = bx + bw - 1; dy = randInt(by, by + bh - 1); break; // right
    }
    this.setTile(dx, dy, TILE.DOOR);
  }

  _randomFloorTile() {
    for (let attempts = 0; attempts < 2000; attempts++) {
      const x = randInt(1, MAP_W - 2);
      const y = randInt(1, MAP_H - 2);
      if (this.getTile(x, y) === TILE.FLOOR) return { x, y };
    }
    return null;
  }

  _placeTerminals(count) {
    for (let i = 0; i < count; i++) {
      const pos = this._randomFloorTile();
      if (!pos) continue;
      // Don't overlap existing terminals
      if (this.terminals.some(t => t.x === pos.x && t.y === pos.y)) continue;
      this.setTile(pos.x, pos.y, TILE.TERMINAL);
      this.terminals.push({ x: pos.x, y: pos.y, hacked: false, id: i });
    }
  }

  _placeItems(count) {
    const types = [
      ITEM.CREDITS, ITEM.CREDITS, ITEM.CREDITS, ITEM.CREDITS,
      ITEM.HACK_TOOL, ITEM.HACK_TOOL,
      ITEM.DISGUISE, ITEM.DISGUISE,
      ITEM.WEAPON,
      ITEM.MED_KIT, ITEM.MED_KIT,
    ];
    for (let i = 0; i < count; i++) {
      const pos = this._randomFloorTile();
      if (!pos) continue;
      const type = choice(types);
      this.items.push(new WorldItem(pos.x, pos.y, type));
    }
  }

  _setSpawns() {
    // Player spawn: top-left quadrant
    for (let attempts = 0; attempts < 5000; attempts++) {
      const x = randInt(2, MAP_W / 2);
      const y = randInt(2, MAP_H / 2);
      if (this.getTile(x, y) === TILE.FLOOR) {
        this.spawnPlayer = { x, y };
        break;
      }
    }

    // Police spawns: spread around map (bottom-right quadrant + others)
    const policeZones = [
      { minX: MAP_W / 2, maxX: MAP_W - 2, minY: MAP_H / 2, maxY: MAP_H - 2 },
      { minX: MAP_W / 2, maxX: MAP_W - 2, minY: 2,         maxY: MAP_H / 2 },
      { minX: 2,         maxX: MAP_W / 2, minY: MAP_H / 2, maxY: MAP_H - 2 },
    ];
    for (const zone of policeZones) {
      for (let a = 0; a < 500; a++) {
        const x = randInt(zone.minX, zone.maxX);
        const y = randInt(zone.minY, zone.maxY);
        if (this.getTile(x, y) === TILE.FLOOR) {
          this.spawnPolice.push({ x, y });
          break;
        }
      }
    }

    // Civilian spawns
    for (let i = 0; i < 8; i++) {
      const pos = this._randomFloorTile();
      if (pos) this.spawnCivilian.push(pos);
    }
  }

  _setNamedLocations() {
    const names = [
      { name: 'BLACK MARKET',   color: '#ff4488' },
      { name: 'POLICE STATION', color: '#4488ff' },
      { name: 'HACKER DEN',     color: '#00ff9f' },
      { name: 'UNDERGROUND BAR', color: '#ffaa22' },
      { name: 'SLUM DISTRICT',  color: '#aaaaaa' },
    ];
    for (const n of names) {
      const pos = this._randomFloorTile();
      if (pos) this.namedLocs.push({ ...pos, ...n });
    }
  }
}

// ─── WorldItem (items lying on the ground) ─────────────────────────────────
class WorldItem {
  constructor(tx, ty, type) {
    this.tx     = tx;
    this.ty     = ty;
    this.x      = tile2px(tx);
    this.y      = tile2px(ty);
    this.type   = type;
    this.picked = false;
    this.pulse  = Math.random() * Math.PI * 2; // animation phase
  }

  update(dt) {
    this.pulse += dt * 3;
  }

  render(ctx, cam, vw, vh) {
    if (this.picked) return;
    const { sx, sy } = worldToScreen(this.x, this.y, cam, vw, vh);
    if (sx < -20 || sx > vw + 20 || sy < -20 || sy > vh + 20) return;

    const glow = 0.55 + 0.45 * Math.sin(this.pulse);
    const color = ITEM_COLOR[this.type] || '#ffffff';
    const size  = ITEM_SIZE[this.type]  || 8;

    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.globalAlpha = 1;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle   = color;
    ctx.font        = 'bold 9px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(ITEM_LABEL[this.type] || '?', sx, sy + size + 10);
    ctx.restore();
  }
}

const ITEM_COLOR = {
  [ITEM.CREDITS]:   C.ITEM_CREDITS,
  [ITEM.HACK_TOOL]: C.ITEM_HACK_TOOL,
  [ITEM.DISGUISE]:  C.ITEM_DISGUISE,
  [ITEM.WEAPON]:    C.ITEM_WEAPON,
  [ITEM.MED_KIT]:   C.ITEM_MED_KIT,
};
const ITEM_SIZE = {
  [ITEM.CREDITS]:   7,
  [ITEM.HACK_TOOL]: 8,
  [ITEM.DISGUISE]:  8,
  [ITEM.WEAPON]:    8,
  [ITEM.MED_KIT]:   7,
};
const ITEM_LABEL = {
  [ITEM.CREDITS]:   '$',
  [ITEM.HACK_TOOL]: 'TOOL',
  [ITEM.DISGUISE]:  'DISG',
  [ITEM.WEAPON]:    'GUN',
  [ITEM.MED_KIT]:   'MED',
};
