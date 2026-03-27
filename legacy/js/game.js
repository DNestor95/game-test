// ─── Main Game Class ───────────────────────────────────────────────────────

class Game {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.vw      = canvas.width;
    this.vh      = canvas.height;

    this.state   = STATE.MENU;
    this.world   = null;
    this.player  = null;
    this.npcs    = [];
    this.ui      = new UI();
    this.hacking = new HackingGame();

    this.camera  = { x: 0, y: 0 };  // tracks player

    this.mouseX  = 0;
    this.mouseY  = 0;
    this.keys    = {};

    this.menuPulse  = 0;
    this.frameCount = 0;

    // Win condition: hack 10 terminals
    this.hackTarget = 10;

    this._bindEvents();
  }

  // ── Initialisation ────────────────────────────────────────────────────────
  init() {
    this._resize();
    window.requestAnimationFrame(ts => this._loop(ts));
  }

  _newGame() {
    this.world  = new World();
    const sp    = this.world.spawnPlayer;
    this.player = new Player(sp.x, sp.y);
    this.camera = { x: this.player.x, y: this.player.y };
    this.npcs   = [];

    // Spawn police
    for (const sp of this.world.spawnPolice) {
      this.npcs.push(new Police(sp.x, sp.y));
    }

    // Add some extra police scattered around
    for (let i = 0; i < 4; i++) {
      const pos = this.world._randomFloorTile();
      if (pos) this.npcs.push(new Police(pos.x, pos.y));
    }

    // Spawn civilians
    for (const sp of this.world.spawnCivilian) {
      this.npcs.push(new Civilian(sp.x, sp.y));
    }

    // Add more civilians
    for (let i = 0; i < 6; i++) {
      const pos = this.world._randomFloorTile();
      if (pos) this.npcs.push(new Civilian(pos.x, pos.y));
    }

    this.ui = new UI();
    this.ui.addMessage('WELCOME TO THE UNDERGROUND', C.TERMINAL, 5);
    this.ui.addMessage('Click to move  |  1-4 for abilities', '#aaddcc', 6);
    this.ui.addMessage('I = Inventory', '#aaddcc', 7);
    this.state = STATE.PLAYING;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  _loop(timestamp) {
    if (!this._lastTs) this._lastTs = timestamp;
    const dt = Math.min((timestamp - this._lastTs) / 1000, 0.05); // cap at 50ms
    this._lastTs = timestamp;
    this.frameCount++;

    this._update(dt);
    this._render();
    window.requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _update(dt) {
    switch (this.state) {
      case STATE.MENU:
        this.menuPulse += dt * 1.2;
        break;

      case STATE.PLAYING:
        this._updatePlaying(dt);
        break;

      case STATE.INVENTORY:
        // Inventory is mostly static; player not moving
        break;

      case STATE.HACKING:
        this.hacking.update(dt);
        if (!this.hacking.active) this.state = STATE.PLAYING;
        break;

      case STATE.GAME_OVER:
      case STATE.WIN:
        break;
    }
  }

  _updatePlaying(dt) {
    if (!this.player.alive) {
      this.state = STATE.GAME_OVER;
      return;
    }

    this.player.update(dt, this.world);
    this.ui.update(dt);

    // Update items
    for (const item of this.world.items) item.update(dt);

    // Update NPCs
    for (const npc of this.npcs) {
      if (npc.type === NPC_TYPE.POLICE) {
        npc.update(dt, this.world, this.player);
      } else {
        npc.update(dt, this.world, this.player);
      }
    }

    // Item pickup (auto on proximity)
    for (const item of this.world.items) {
      if (item.picked) continue;
      if (dist(this.player.x, this.player.y, item.x, item.y) < TILE_SIZE * 1.2) {
        item.picked = true;
        if (item.type === ITEM.CREDITS) {
          const amount = ITEM_DEF[ITEM.CREDITS].value;
          this.player.credits += amount;
          this.ui.addMessage(`PICKED UP $${amount}`, C.ITEM_CREDITS);
        } else {
          const added = this.player.inventory.addItem(item.type);
          if (added) {
            this.ui.addMessage(`FOUND: ${ITEM_DEF[item.type].name.toUpperCase()}`, ITEM_COLOR[item.type]);
          } else {
            // Inventory full — auto-use or drop
            const def = ITEM_DEF[item.type];
            if (item.type === ITEM.MED_KIT) {
              this.player.applyItem(def);
              this.ui.addMessage('AUTO-USED MED-KIT (INV FULL)', C.ITEM_MED_KIT);
            } else {
              this.ui.addMessage('INVENTORY FULL', C.HUD_WARN);
            }
          }
        }
      }
    }

    // Smooth camera
    this.camera.x = lerp(this.camera.x, this.player.x, 0.1);
    this.camera.y = lerp(this.camera.y, this.player.y, 0.1);

    // Heat pauses decay near police in chase
    const nearChasing = this.npcs.some(
      n => n.type === NPC_TYPE.POLICE && n.state === POLICE_STATE.CHASE &&
           dist(this.player.x, this.player.y, n.x, n.y) < TILE_SIZE * 12
    );
    if (nearChasing) {
      this.player.heat = Math.min(HEAT_MAX, this.player.heat + dt * 1.5); // heat rises near chasing cops
    }

    // Check win: enough terminals hacked
    const hacked = this.world.terminals.filter(t => t.hacked).length;
    if (hacked >= this.hackTarget) {
      this.state = STATE.WIN;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.vw, this.vh);

    switch (this.state) {
      case STATE.MENU:      this._renderMenu(ctx);      break;
      case STATE.PLAYING:   this._renderPlaying(ctx);   break;
      case STATE.INVENTORY: this._renderPlaying(ctx); this._renderInventory(ctx); break;
      case STATE.HACKING:   this._renderPlaying(ctx); this.hacking.render(ctx, this.vw, this.vh); break;
      case STATE.GAME_OVER: this._renderPlaying(ctx); this._renderGameOver(ctx); break;
      case STATE.WIN:       this._renderPlaying(ctx); this._renderWin(ctx); break;
    }
  }

  _renderPlaying(ctx) {
    // Background
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, this.vw, this.vh);

    this._renderWorld(ctx);

    // Items
    for (const item of this.world.items) {
      item.render(ctx, this.camera, this.vw, this.vh);
    }

    // NPCs (behind player)
    for (const npc of this.npcs) {
      npc.render(ctx, this.camera, this.vw, this.vh);
    }

    // Player
    this.player.render(ctx, this.camera, this.vw, this.vh);

    // UI HUD
    this.ui.render(ctx, this.player, this.world, this.npcs, this.camera, this.vw, this.vh);
  }

  _renderWorld(ctx) {
    const cam = this.camera;
    const ts  = TILE_SIZE;

    // Compute visible tile range with 1-tile padding
    const startX = Math.max(0, Math.floor((cam.x - this.vw / 2) / ts) - 1);
    const endX   = Math.min(MAP_W - 1, Math.ceil((cam.x + this.vw / 2) / ts) + 1);
    const startY = Math.max(0, Math.floor((cam.y - this.vh / 2) / ts) - 1);
    const endY   = Math.min(MAP_H - 1, Math.ceil((cam.y + this.vh / 2) / ts) + 1);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const t  = this.world.getTile(tx, ty);
        const sx = tx * ts - cam.x + this.vw / 2;
        const sy = ty * ts - cam.y + this.vh / 2;

        switch (t) {
          case TILE.FLOOR: {
            // Checkerboard variation
            const alt = (tx + ty) % 2 === 0;
            ctx.fillStyle = alt ? C.FLOOR : C.FLOOR_ALT;
            ctx.fillRect(sx, sy, ts, ts);
            break;
          }
          case TILE.WALL: {
            // Building face (lighter top edge illusion)
            ctx.fillStyle = C.WALL;
            ctx.fillRect(sx, sy, ts, ts);
            ctx.fillStyle = C.WALL_FACE;
            ctx.fillRect(sx, sy, ts, ts - 4);
            ctx.fillStyle = C.WALL_TOP;
            ctx.fillRect(sx, sy, ts, 4);
            break;
          }
          case TILE.TERMINAL: {
            // Animated terminal tile
            const glow = 0.4 + 0.35 * Math.sin(this.frameCount * 0.07);
            ctx.fillStyle = C.TERMINAL_BG;
            ctx.fillRect(sx, sy, ts, ts);
            // Terminal screen
            ctx.fillStyle = `rgba(0,${Math.round(160 + glow * 95)},${Math.round(80 + glow * 60)},1)`;
            ctx.fillRect(sx + 6, sy + 6, ts - 12, ts - 12);
            // > prompt
            ctx.fillStyle = '#001a0d';
            ctx.font      = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('>', sx + 9, sy + ts - 10);
            break;
          }
          case TILE.DOOR: {
            ctx.fillStyle = C.WALL;
            ctx.fillRect(sx, sy, ts, ts);
            ctx.fillStyle = C.DOOR;
            ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx + ts / 2 - 2, sy + ts / 2 - 6, 4, 12);
            break;
          }
        }
      }
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth   = 0.5;
    for (let tx = startX; tx <= endX; tx++) {
      const sx = tx * ts - cam.x + this.vw / 2;
      ctx.beginPath(); ctx.moveTo(sx, startY * ts - cam.y + this.vh / 2);
      ctx.lineTo(sx, endY * ts + ts - cam.y + this.vh / 2); ctx.stroke();
    }
    for (let ty = startY; ty <= endY; ty++) {
      const sy = ty * ts - cam.y + this.vh / 2;
      ctx.beginPath(); ctx.moveTo(startX * ts - cam.x + this.vw / 2, sy);
      ctx.lineTo(endX * ts + ts - cam.x + this.vw / 2, sy); ctx.stroke();
    }

    ctx.textAlign = 'left';
  }

  _renderInventory(ctx) {
    this.player.inventory.render(ctx, this.vw, this.vh, this.mouseX, this.mouseY);
  }

  _renderMenu(ctx) {
    // Background gradient
    const grd = ctx.createRadialGradient(this.vw/2, this.vh/2, 0, this.vw/2, this.vh/2, this.vw * 0.7);
    grd.addColorStop(0, '#060e1e');
    grd.addColorStop(1, '#020508');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // Scanlines
    for (let y = 0; y < this.vh; y += 4) {
      ctx.fillStyle = 'rgba(0,255,159,0.013)';
      ctx.fillRect(0, y, this.vw, 2);
    }

    const cx = this.vw / 2;
    const cy = this.vh / 2;
    const pulse = 0.7 + 0.3 * Math.sin(this.menuPulse);

    // Title glow
    ctx.shadowBlur  = 40;
    ctx.shadowColor = `rgba(0,255,159,${(pulse * 0.6).toFixed(2)})`;
    ctx.fillStyle   = C.TERMINAL;
    ctx.font        = 'bold 64px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('CRIME.EXE', cx, cy - 80);

    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#336655';
    ctx.font       = '16px monospace';
    ctx.fillText('A DYSTOPIAN CRIMINAL UNDERGROUND RPG', cx, cy - 40);

    // Feature list
    ctx.fillStyle = '#223344';
    ctx.font      = '12px monospace';
    const features = [
      '◆ Procedural city generation',
      '◆ Mouse-click movement',
      '◆ Hack terminals · Steal · Bribe police',
      '◆ Inventory system · Wanted level',
    ];
    for (let i = 0; i < features.length; i++) {
      ctx.fillText(features[i], cx, cy + 10 + i * 20);
    }

    // Start button
    const blink = Math.sin(this.menuPulse * 2) > 0;
    ctx.fillStyle = blink ? C.TERMINAL : '#004422';
    ctx.font      = 'bold 22px monospace';
    ctx.fillText('[ PRESS ENTER OR CLICK TO START ]', cx, cy + 110);

    // Controls hint
    ctx.fillStyle = '#1a3322';
    ctx.font      = '11px monospace';
    ctx.fillText('CLICK to move  |  1 HACK  |  2 STEAL  |  3 BRIBE  |  4 SPRINT  |  I INVENTORY', cx, cy + 145);

    ctx.textAlign = 'left';
  }

  _renderGameOver(ctx) {
    ctx.fillStyle = 'rgba(10,0,0,0.85)';
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.fillStyle  = '#ff3333';
    ctx.font       = 'bold 56px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('SYSTEM FAILURE', this.vw / 2, this.vh / 2 - 60);

    ctx.fillStyle = '#aa2222';
    ctx.font      = '18px monospace';
    ctx.fillText('You have been neutralised.', this.vw / 2, this.vh / 2 - 10);

    ctx.fillStyle = '#664444';
    ctx.font      = '13px monospace';
    const p = this.player;
    ctx.fillText(`Credits: $${p.credits}  |  Hacked: ${p.terminalHacked}  |  Stolen: ${p.stolen}  |  Arrested: ${p.arrested}`, this.vw / 2, this.vh / 2 + 25);

    const blink = Math.sin(Date.now() / 400) > 0;
    ctx.fillStyle = blink ? '#ff6666' : '#441111';
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('[ PRESS ENTER TO RETRY ]', this.vw / 2, this.vh / 2 + 70);
    ctx.textAlign = 'left';
  }

  _renderWin(ctx) {
    ctx.fillStyle = 'rgba(0,15,10,0.88)';
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.shadowBlur  = 30;
    ctx.shadowColor = C.TERMINAL;
    ctx.fillStyle   = C.TERMINAL;
    ctx.font        = 'bold 52px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('NETWORK BREACHED', this.vw / 2, this.vh / 2 - 60);
    ctx.shadowBlur  = 0;

    ctx.fillStyle = '#336655';
    ctx.font      = '18px monospace';
    ctx.fillText(`You hacked ${this.hackTarget} terminals and escaped!`, this.vw / 2, this.vh / 2 - 10);

    const p = this.player;
    ctx.fillStyle = '#224433';
    ctx.font      = '13px monospace';
    ctx.fillText(`Final score: $${p.credits} credits  |  Heat: ${Math.round(p.heat)}%  |  Stolen: ${p.stolen}x`, this.vw / 2, this.vh / 2 + 25);

    const blink = Math.sin(Date.now() / 400) > 0;
    ctx.fillStyle = blink ? C.TERMINAL : '#003322';
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('[ PRESS ENTER TO PLAY AGAIN ]', this.vw / 2, this.vh / 2 + 70);
    ctx.textAlign = 'left';
  }

  // ── Event handling ────────────────────────────────────────────────────────
  _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    this.canvas.addEventListener('click', e => this._onClick(e));
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      if (this.state === STATE.HACKING) {
        this.hacking.handleMouseMove(this.mouseX, this.mouseY, this.vw, this.vh);
      }
    });

    window.addEventListener('keydown', e => this._onKeyDown(e));
  }

  _resize() {
    this.vw = this.canvas.width  = window.innerWidth;
    this.vh = this.canvas.height = window.innerHeight;
  }

  _onClick(e) {
    const r  = this.canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    switch (this.state) {
      case STATE.MENU:
        this._newGame();
        break;

      case STATE.PLAYING: {
        // Convert screen click to world tile
        const { wx, wy } = screenToWorld(mx, my, this.camera, this.vw, this.vh);
        const tx = px2tile(wx);
        const ty = px2tile(wy);
        this.player.setTarget(this.world, tx, ty);
        break;
      }

      case STATE.INVENTORY: {
        const slot = this.player.inventory.getClickedSlot(mx, my, this.vw, this.vh);
        if (slot >= 0) {
          const used = this.player.inventory.useItem(slot, this.player);
          if (used) this.ui.addMessage(`USED: ${used.name.toUpperCase()}`, ITEM_COLOR[used.type] || '#fff');
        }
        break;
      }

      case STATE.HACKING:
        this.hacking.handleClick(mx, my, this.vw, this.vh);
        break;

      case STATE.GAME_OVER:
      case STATE.WIN:
        // Nothing on click, use Enter
        break;
    }
  }

  _onKeyDown(e) {
    const key = e.key;

    // Global
    if (key === 'Enter' || key === 'Return') {
      if (this.state === STATE.MENU) { this._newGame(); return; }
      if (this.state === STATE.GAME_OVER || this.state === STATE.WIN) { this._newGame(); return; }
    }

    if (this.state === STATE.PLAYING || this.state === STATE.INVENTORY) {
      if (key === 'i' || key === 'I') {
        this.state = this.state === STATE.INVENTORY ? STATE.PLAYING : STATE.INVENTORY;
        return;
      }
    }

    if (this.state === STATE.PLAYING) {
      if (key === 'Escape') { this.player.stopMoving(); return; }

      const abilityKeys = ['1', '2', '3', '4'];
      const idx = abilityKeys.indexOf(key);
      if (idx >= 0) {
        const msg = this.player.useAbility(idx, this.world, this.npcs, this.hacking);
        if (this.hacking.active) {
          this.state = STATE.HACKING;
          // Set up callbacks
          const hackingRef = this.hacking;
          const terminal   = this.hacking.terminal;
          hackingRef.onSuccess = () => {
            terminal.hacked = true;
            const reward = 80 + Math.round(80 * this.player.hackSpeed);
            this.player.credits     += reward;
            this.player.terminalHacked++;
            this.player.heat = Math.max(0, this.player.heat - 8);
            const hacked = this.world.terminals.filter(t => t.hacked).length;
            this.ui.addMessage(`TERMINAL BREACHED  +$${reward}`, C.TERMINAL);
            this.ui.addMessage(`${hacked}/${this.hackTarget} terminals hacked`, '#aaddcc');
          };
          hackingRef.onFail = () => {
            this.player.heat = clamp(this.player.heat + 22, 0, HEAT_MAX);
            this.ui.addMessage('HACK FAILED — HEAT +22', C.HUD_WARN);
          };
        } else if (msg) {
          this.ui.addMessage(msg, msg.startsWith('NO') || msg.startsWith('NEED') ? C.HUD_WARN : C.HUD_TEXT);
        }
        return;
      }
    }

    if (this.state === STATE.HACKING && (key === 'Escape')) {
      this.hacking.active = false;
      this.state = STATE.PLAYING;
    }
  }
}
