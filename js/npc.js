// ─── NPC Classes ───────────────────────────────────────────────────────────

class NPC {
  constructor(tx, ty, type) {
    this.x     = tile2px(tx);
    this.y     = tile2px(ty);
    this.tx    = tx;
    this.ty    = ty;
    this.type  = type;
    this.facing = 0;
    this.path   = [];
    this.pathIdx = 0;
    this.moving  = false;
    this.pulse   = Math.random() * Math.PI * 2;
    this.alive   = true;
  }

  _followPath(dt, speed) {
    this.moving = false;
    if (this.path.length === 0 || this.pathIdx >= this.path.length) return;

    const target = this.path[this.pathIdx];
    const tx     = tile2px(target.x);
    const ty     = tile2px(target.y);
    const dx     = tx - this.x;
    const dy     = ty - this.y;
    const d      = Math.sqrt(dx * dx + dy * dy);

    if (d < speed * dt + 1) {
      this.x = tx;
      this.y = ty;
      this.tx = target.x;
      this.ty = target.y;
      this.pathIdx++;
      if (this.pathIdx >= this.path.length) {
        this.path    = [];
        this.pathIdx = 0;
      }
    } else {
      this.facing = Math.atan2(dy, dx);
      this.x += (dx / d) * speed * dt;
      this.y += (dy / d) * speed * dt;
      this.moving = true;
    }
  }
}

// ─── Police ────────────────────────────────────────────────────────────────

const POLICE_STATE = Object.freeze({
  PATROL: 'patrol',
  ALERT:  'alert',
  CHASE:  'chase',
  BRIBED: 'bribed',
});

class Police extends NPC {
  constructor(tx, ty) {
    super(tx, ty, NPC_TYPE.POLICE);
    this.state        = POLICE_STATE.PATROL;
    this.patrolPath   = [];
    this.patrolIdx    = 0;
    this.patrolTimer  = 0;
    this.alertTimer   = 0;
    this.bribed       = false;
    this.bribeTimer   = 0;
    this.lightFlash   = 0;
    this.homeX        = tx;
    this.homeY        = ty;
    this._patrolRadius = randInt(8, 20);
  }

  update(dt, world, player) {
    if (!this.alive) return;
    this.pulse     += dt * 3;
    this.lightFlash = (this.lightFlash + dt * 5) % (Math.PI * 2);

    // Bribe timer
    if (this.bribed) {
      this.bribeTimer -= dt;
      if (this.bribeTimer <= 0) { this.bribed = false; this.state = POLICE_STATE.PATROL; }
      this._followPath(dt, POLICE_PATROL_SPEED * 0.5);
      return;
    }

    const d = dist(this.x, this.y, player.x, player.y);
    const playerDetectable = !player.disguised;
    const detectRange = this.state === POLICE_STATE.CHASE
      ? TILE_SIZE * 18
      : TILE_SIZE * (player.heat >= HEAT_CHASE_THRESH ? 14 : 10);

    switch (this.state) {
      case POLICE_STATE.PATROL:
        this.patrolTimer -= dt;
        if (this.path.length === 0 || this.pathIdx >= this.path.length) {
          if (this.patrolTimer <= 0) {
            this._setNewPatrolTarget(world);
            this.patrolTimer = randFloat(2, 5);
          }
        }
        this._followPath(dt, POLICE_PATROL_SPEED);

        if (playerDetectable && d < detectRange && player.heat >= HEAT_DETECT_THRESH) {
          this.state      = POLICE_STATE.ALERT;
          this.alertTimer = 2;
        }
        break;

      case POLICE_STATE.ALERT:
        this.alertTimer -= dt;
        // Face player
        this.facing = Math.atan2(player.y - this.y, player.x - this.x);
        if (playerDetectable && d < detectRange && player.heat >= HEAT_CHASE_THRESH) {
          this.state = POLICE_STATE.CHASE;
        }
        if (this.alertTimer <= 0 || d > detectRange) {
          this.state = POLICE_STATE.PATROL;
        }
        break;

      case POLICE_STATE.CHASE: {
        // Re-path every 0.8s towards player
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0 || this.path.length === 0) {
          const gx = px2tile(player.x);
          const gy = px2tile(player.y);
          this.path    = findPath(world, this.tx, this.ty, gx, gy, 60);
          this.pathIdx = 0;
          this.patrolTimer = 0.8;
        }
        this._followPath(dt, POLICE_CHASE_SPEED);

        // Caught player?
        if (d < TILE_SIZE * 1.2) {
          this._arrestPlayer(player);
        }

        // Stop chasing if player too far / lost sight / disguised
        if (!playerDetectable || d > TILE_SIZE * 22 || player.heat < HEAT_DETECT_THRESH) {
          this.state   = POLICE_STATE.PATROL;
          this.path    = [];
          this.pathIdx = 0;
        }
        break;
      }
    }
  }

  _arrestPlayer(player) {
    player.arrested++;
    if (player.hasWeapon) {
      player.takeDamage(25);
    } else {
      // Confiscate half credits
      player.credits = Math.floor(player.credits / 2);
      player.heat    = clamp(player.heat - 20, 0, HEAT_MAX);
    }
    // Push player away
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.x += Math.cos(angle) * TILE_SIZE * 4;
    player.y += Math.sin(angle) * TILE_SIZE * 4;
    player.stopMoving();

    this.state = POLICE_STATE.PATROL;
    this.path  = [];
  }

  _setNewPatrolTarget(world) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = randInt(4, this._patrolRadius);
    const gx     = clamp(this.homeX + Math.round(Math.cos(angle) * radius), 1, MAP_W - 2);
    const gy     = clamp(this.homeY + Math.round(Math.sin(angle) * radius), 1, MAP_H - 2);
    const newPath = findPath(world, this.tx, this.ty, gx, gy, 40);
    if (newPath.length > 0) {
      this.path    = newPath;
      this.pathIdx = 0;
    }
  }

  render(ctx, cam, vw, vh) {
    const { sx, sy } = worldToScreen(this.x, this.y, cam, vw, vh);
    if (sx < -30 || sx > vw + 30 || sy < -30 || sy > vh + 30) return;

    // Police lights flashing
    const flash = Math.sin(this.lightFlash);
    if (this.state === POLICE_STATE.CHASE || this.state === POLICE_STATE.ALERT) {
      ctx.beginPath();
      ctx.arc(sx, sy, 26, 0, Math.PI * 2);
      ctx.fillStyle = flash > 0
        ? 'rgba(255,50,50,0.12)'
        : 'rgba(50,100,255,0.12)';
      ctx.fill();
    }

    // Shadow
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.facing);

    // Body
    ctx.fillStyle = this.bribed ? '#4444aa' : C.POLICE_BODY;
    ctx.fillRect(-8, -10, 16, 14);

    // Badge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -7, 6, 5);

    // Head
    ctx.fillStyle = '#bbccee';
    ctx.fillRect(-6, -17, 12, 10);

    // Lights on top (blue/red)
    const lightColor = flash > 0 ? C.POLICE_LIGHT_R : C.POLICE_LIGHT_B;
    ctx.fillStyle = lightColor;
    ctx.fillRect(-5, -22, 4, 5);
    ctx.fillStyle = flash > 0 ? C.POLICE_LIGHT_B : C.POLICE_LIGHT_R;
    ctx.fillRect(1, -22, 4, 5);

    ctx.restore();

    // State label
    if (this.state === POLICE_STATE.CHASE) {
      ctx.fillStyle = C.POLICE_LIGHT_R;
      ctx.font      = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHASE', sx, sy - 26);
    } else if (this.state === POLICE_STATE.ALERT) {
      ctx.fillStyle = '#ffaa00';
      ctx.font      = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - 26);
    }
  }
}

// ─── Civilian ──────────────────────────────────────────────────────────────

class Civilian extends NPC {
  constructor(tx, ty) {
    super(tx, ty, NPC_TYPE.CIVILIAN);
    this.wanderTimer = randFloat(1, 4);
    this.homeX       = tx;
    this.homeY       = ty;
    this.color       = choice(['#ffcc44','#ff9966','#99ccff','#cc99ff','#88ddaa']);
    this.scared      = false;
    this.scaredTimer = 0;
  }

  update(dt, world, player) {
    if (!this.alive) return;
    this.pulse      += dt * 2;
    this.wanderTimer -= dt;

    if (this.scared) {
      this.scaredTimer -= dt;
      if (this.scaredTimer <= 0) this.scared = false;
    }

    // Run from police chasing
    if (player.heat >= HEAT_CHASE_THRESH && dist(this.x, this.y, player.x, player.y) < TILE_SIZE * 6) {
      this.scared      = true;
      this.scaredTimer = 5;
    }

    if (this.wanderTimer <= 0 && (this.path.length === 0 || this.pathIdx >= this.path.length)) {
      this._setWanderTarget(world);
      this.wanderTimer = randFloat(2, 6);
    }

    const speed = this.scared ? CIVILIAN_SPEED * 2 : CIVILIAN_SPEED;
    this._followPath(dt, speed);
  }

  _setWanderTarget(world) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = randInt(3, 12);
    const gx     = clamp(this.homeX + Math.round(Math.cos(angle) * radius), 1, MAP_W - 2);
    const gy     = clamp(this.homeY + Math.round(Math.sin(angle) * radius), 1, MAP_H - 2);
    const newPath = findPath(world, this.tx, this.ty, gx, gy, 30);
    if (newPath.length > 0) {
      this.path    = newPath;
      this.pathIdx = 0;
    }
  }

  render(ctx, cam, vw, vh) {
    const { sx, sy } = worldToScreen(this.x, this.y, cam, vw, vh);
    if (sx < -30 || sx > vw + 30 || sy < -30 || sy > vh + 30) return;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.facing);

    ctx.fillStyle = this.scared ? '#ff5533' : this.color;
    ctx.fillRect(-7, -9, 14, 12);

    ctx.fillStyle = this.scared ? '#ff8866' : '#ffe8bb';
    ctx.fillRect(-5, -16, 10, 10);

    ctx.restore();
  }
}
