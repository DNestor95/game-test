// ─── Player ────────────────────────────────────────────────────────────────

class Player {
  constructor(tx, ty) {
    this.x        = tile2px(tx);  // pixel position (centre)
    this.y        = tile2px(ty);
    this.health   = 100;
    this.maxHealth = 100;
    this.heat     = 0;       // wanted level 0-100
    this.credits  = 150;     // starting credits
    this.alive    = true;

    // Movement
    this.path     = [];
    this.pathIdx  = 0;
    this.speed    = PLAYER_SPEED;
    this.sprinting = false;
    this.facing   = 0;  // angle in radians

    // Abilities: [Hack, Steal, Bribe, Sprint]
    this.abilityCooldown  = [0, 0, 0, 0];
    this.abilityActive    = [false, false, false, false];

    // Status effects
    this.disguised    = false;
    this.disguiseTimer = 0;
    this.hasWeapon    = false;
    this.hackSpeed    = 1;

    // Inventory
    this.inventory = new Inventory();

    // Visual
    this.pulse    = 0;
    this.footStep = 0;
    this.moving   = false;

    // Stats for end screen
    this.terminalHacked = 0;
    this.stolen         = 0;
    this.arrested       = 0;
  }

  // ── Path & movement ───────────────────────────────────────────────────────
  setTarget(world, tx, ty) {
    const sx = px2tile(this.x);
    const sy = px2tile(this.y);
    const newPath = findPath(world, sx, sy, tx, ty);
    if (newPath.length > 0) {
      this.path    = newPath;
      this.pathIdx = 0;
    }
  }

  stopMoving() {
    this.path    = [];
    this.pathIdx = 0;
    this.moving  = false;
  }

  update(dt, world) {
    if (!this.alive) return;

    this.pulse    += dt * 2.5;
    this.footStep += dt;

    // Sprint cooldown: ability[3]
    this.sprinting = this.abilityCooldown[3] > ABILITY_COOLDOWN[3] - 2; // 2s sprint
    const spd = this.sprinting ? SPRINT_SPEED : PLAYER_SPEED;

    // Follow path
    this.moving = false;
    if (this.path.length > 0 && this.pathIdx < this.path.length) {
      const target = this.path[this.pathIdx];
      const tx     = tile2px(target.x);
      const ty     = tile2px(target.y);
      const dx     = tx - this.x;
      const dy     = ty - this.y;
      const d      = Math.sqrt(dx * dx + dy * dy);

      if (d < spd * dt + 1) {
        this.x = tx;
        this.y = ty;
        this.pathIdx++;
        if (this.pathIdx >= this.path.length) {
          this.path    = [];
          this.pathIdx = 0;
        }
      } else {
        this.facing = Math.atan2(dy, dx);
        this.x += (dx / d) * spd * dt;
        this.y += (dy / d) * spd * dt;
        this.moving = true;
      }
    }

    // Cooldowns
    for (let i = 0; i < 4; i++) {
      if (this.abilityCooldown[i] > 0) {
        this.abilityCooldown[i] = Math.max(0, this.abilityCooldown[i] - dt);
      }
    }

    // Disguise timer
    if (this.disguised) {
      this.disguiseTimer -= dt;
      if (this.disguiseTimer <= 0) { this.disguised = false; }
    }

    // Heat decay (passive, slower when police nearby handled in game.js)
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - HEAT_DECAY_RATE * dt);
    }
  }

  // ── Abilities ─────────────────────────────────────────────────────────────
  // Returns message string or null if failed
  useAbility(index, world, npcs, hackingGame) {
    if (index === 3) {
      // Sprint: always available if cooldown is 0
      if (this.abilityCooldown[3] === 0) {
        this.abilityCooldown[3] = ABILITY_COOLDOWN[3]; // sets timer = max → sprint active
        return 'SPRINT ACTIVATED';
      }
      return null;
    }

    if (this.abilityCooldown[index] > 0) return null;

    if (index === 0) { // Hack
      const terminal = this._nearbyTerminal(world);
      if (!terminal) return 'NO TERMINAL IN RANGE';
      hackingGame.start(terminal);
      this.abilityCooldown[0] = ABILITY_COOLDOWN[0];
      return null;
    }

    if (index === 1) { // Steal
      const civilian = this._nearbyCivilian(npcs);
      if (!civilian) return 'NO TARGET IN RANGE';
      const amount = randInt(20, 80);
      this.credits += amount;
      this.heat = clamp(this.heat + 18, 0, HEAT_MAX);
      this.stolen++;
      this.abilityCooldown[1] = ABILITY_COOLDOWN[1];
      return `STOLE $${amount}`;
    }

    if (index === 2) { // Bribe
      const police = this._nearbyPolice(npcs);
      if (!police) return 'NO POLICE IN RANGE';
      const cost = 150;
      if (this.credits < cost) return `NEED $${cost} TO BRIBE`;
      this.credits -= cost;
      this.heat = clamp(this.heat - 40, 0, HEAT_MAX);
      police.bribed    = true;
      police.bribeTimer = 8;
      this.abilityCooldown[2] = ABILITY_COOLDOWN[2];
      return 'POLICE BRIBED';
    }

    return null;
  }

  _nearbyTerminal(world) {
    const tx = px2tile(this.x);
    const ty = px2tile(this.y);
    for (const t of world.terminals) {
      if (!t.hacked && Math.abs(t.x - tx) <= 2 && Math.abs(t.y - ty) <= 2) {
        return t;
      }
    }
    return null;
  }

  _nearbyCivilian(npcs) {
    for (const npc of npcs) {
      if (npc.type === NPC_TYPE.CIVILIAN && dist(this.x, this.y, npc.x, npc.y) < TILE_SIZE * 3) {
        return npc;
      }
    }
    return null;
  }

  _nearbyPolice(npcs) {
    for (const npc of npcs) {
      if (npc.type === NPC_TYPE.POLICE && dist(this.x, this.y, npc.x, npc.y) < TILE_SIZE * 5) {
        return npc;
      }
    }
    return null;
  }

  applyItem(itemDef) {
    switch (itemDef.type) {
      case ITEM.CREDITS:
        this.credits += itemDef.value;
        break;
      case ITEM.HACK_TOOL:
        this.hackSpeed = Math.min(2.5, this.hackSpeed + 0.5);
        break;
      case ITEM.DISGUISE:
        this.disguised     = true;
        this.disguiseTimer = 30; // 30 seconds
        this.heat          = Math.max(0, this.heat - 35);
        break;
      case ITEM.WEAPON:
        this.hasWeapon = true;
        break;
      case ITEM.MED_KIT:
        this.health = Math.min(this.maxHealth, this.health + 40);
        break;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive  = false;
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  render(ctx, cam, vw, vh) {
    const { sx, sy } = worldToScreen(this.x, this.y, cam, vw, vh);
    const glow = 0.4 + 0.35 * Math.sin(this.pulse);

    // Glow
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
    grad.addColorStop(0, `rgba(0,255,159,${(glow * 0.5).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(0,255,159,0)');
    ctx.beginPath();
    ctx.arc(sx, sy, 28, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Body (direction indicator)
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.facing);

    // Body rect
    ctx.fillStyle = this.disguised ? '#ff69b4' : C.PLAYER;
    ctx.fillRect(-8, -10, 16, 14);

    // Head
    ctx.fillStyle = this.disguised ? '#ff99cc' : C.PLAYER;
    ctx.fillRect(-6, -16, 12, 10);

    // Eyes (direction)
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, -14, 4, 3);

    ctx.restore();

    // Disguise badge
    if (this.disguised) {
      ctx.fillStyle  = '#ff69b4';
      ctx.font       = 'bold 8px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('DISGUISED', sx, sy - 22);
    }
  }
}
