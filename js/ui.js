// ─── HUD & UI Rendering ────────────────────────────────────────────────────

const ABILITY_NAMES   = ['HACK', 'STEAL', 'BRIBE', 'SPRINT'];
const ABILITY_KEYS    = ['1', '2', '3', '4'];
const ABILITY_DESC    = [
  'Hack nearby terminal',
  'Pickpocket civilian',
  'Pay off police $150',
  'Temporary sprint',
];
const ABILITY_COLORS  = [C.TERMINAL, '#ffcc44', '#4488ff', '#ff9944'];

class UI {
  constructor() {
    this.messages      = [];   // [{text, timer, color}]
    this.tooltipText   = null;
    this.tooltipTimer  = 0;
    this.minimapScale  = 1.8;  // pixels per tile on minimap
  }

  addMessage(text, color = C.HUD_TEXT, duration = 3) {
    this.messages.unshift({ text, timer: duration, color });
    if (this.messages.length > 6) this.messages.length = 6;
  }

  update(dt) {
    for (const m of this.messages) m.timer -= dt;
    this.messages = this.messages.filter(m => m.timer > 0);
  }

  render(ctx, player, world, npcs, cam, vw, vh) {
    this._drawHUD(ctx, player, vw, vh);
    this._drawAbilityBar(ctx, player, vw, vh);
    this._drawMinimap(ctx, player, world, npcs, vw, vh);
    this._drawMessages(ctx, vw, vh);
    this._drawNamedLocations(ctx, world, cam, vw, vh);
    this._drawTerminalIndicators(ctx, player, world, cam, vw, vh);
  }

  // ── Top-left HUD strip ───────────────────────────────────────────────────
  _drawHUD(ctx, player, vw, vh) {
    const x = 12, y = 12, w = 240, h = 112;

    ctx.fillStyle   = C.HUD_BG;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.HUD_BORDER;
    ctx.lineWidth   = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    // Title
    ctx.fillStyle = C.HUD_TEXT;
    ctx.font      = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CRIME.EXE', x + 10, y + 16);

    ctx.fillStyle = '#223344';
    ctx.font      = '9px monospace';
    ctx.fillText('v0.1-ALPHA', x + 78, y + 16);

    // Health bar
    const hpRatio = player.health / player.maxHealth;
    ctx.fillStyle = '#001a0d';
    ctx.fillRect(x + 10, y + 24, w - 20, 12);
    ctx.fillStyle = hpRatio > 0.5 ? '#00cc55' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(x + 10, y + 24, (w - 20) * hpRatio, 12);
    ctx.strokeStyle = '#223344';
    ctx.strokeRect(x + 10, y + 24, w - 20, 12);
    ctx.fillStyle  = '#ffffff';
    ctx.font       = '8px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(`HP  ${player.health} / ${player.maxHealth}`, x + w / 2, y + 33);

    // Heat bar
    const htRatio = player.heat / HEAT_MAX;
    const htColor = htRatio < 0.4 ? C.HUD_HEAT_LOW : htRatio < 0.7 ? C.HUD_HEAT_MED : C.HUD_HEAT_HIGH;
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(x + 10, y + 44, w - 20, 12);
    ctx.fillStyle = htColor;
    ctx.fillRect(x + 10, y + 44, (w - 20) * htRatio, 12);
    ctx.strokeStyle = '#332222';
    ctx.strokeRect(x + 10, y + 44, w - 20, 12);
    ctx.fillStyle  = '#ffffff';
    ctx.font       = '8px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(`HEAT  ${Math.round(player.heat)}%`, x + w / 2, y + 53);

    // Credits
    ctx.fillStyle = C.ITEM_CREDITS;
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${player.credits}`, x + 10, y + 74);

    ctx.fillStyle = '#446655';
    ctx.font      = '9px monospace';
    ctx.fillText('CREDITS', x + 10 + 55, y + 74);

    // Status badges
    let bx = x + 10;
    const by = y + 90;
    if (player.disguised) {
      this._drawBadge(ctx, bx, by, 'DISGUISED', '#ff69b4');
      bx += 85;
    }
    if (player.hasWeapon) {
      this._drawBadge(ctx, bx, by, 'ARMED', '#ff5533');
      bx += 60;
    }
    if (player.sprinting) {
      this._drawBadge(ctx, bx, by, 'SPRINT', '#ff9944');
    }

    ctx.textAlign = 'left';
  }

  _drawBadge(ctx, x, y, text, color) {
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle   = color + '33';
    ctx.fillRect(x, y - 10, w, 13);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y - 10, w, 13);
    ctx.fillStyle   = color;
    ctx.font        = 'bold 8px monospace';
    ctx.textAlign   = 'left';
    ctx.fillText(text, x + 5, y);
  }

  // ── Bottom ability bar ───────────────────────────────────────────────────
  _drawAbilityBar(ctx, player, vw, vh) {
    const btnW = 140;
    const btnH = 60;
    const gap  = 8;
    const totalW = 4 * btnW + 3 * gap;
    const x0 = (vw - totalW) / 2;
    const y0 = vh - btnH - 12;

    for (let i = 0; i < 4; i++) {
      const x  = x0 + i * (btnW + gap);
      const cd = player.abilityCooldown[i];
      const maxCd = ABILITY_COOLDOWN[i];
      const ready = cd === 0;

      // Background
      ctx.fillStyle = C.ABILITY_BG;
      ctx.fillRect(x, y0, btnW, btnH);
      ctx.strokeStyle = ready ? ABILITY_COLORS[i] + '88' : C.HUD_BORDER;
      ctx.lineWidth   = ready ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, y0 + 0.5, btnW - 1, btnH - 1);

      // Cooldown overlay
      if (!ready) {
        const ratio = cd / maxCd;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x + 1, y0 + 1, (btnW - 2) * ratio, btnH - 2);
      }

      // Key binding
      ctx.fillStyle  = ready ? ABILITY_COLORS[i] : C.HUD_TEXT_DIM;
      ctx.font       = 'bold 16px monospace';
      ctx.textAlign  = 'left';
      ctx.fillText(`[${ABILITY_KEYS[i]}]`, x + 8, y0 + 20);

      // Ability name
      ctx.fillStyle = ready ? '#ccffee' : '#334455';
      ctx.font      = 'bold 11px monospace';
      ctx.fillText(ABILITY_NAMES[i], x + 8, y0 + 36);

      // Cooldown timer
      if (!ready) {
        ctx.fillStyle = '#ff9944';
        ctx.font      = '10px monospace';
        ctx.fillText(`${cd.toFixed(1)}s`, x + 8, y0 + 50);
      } else {
        ctx.fillStyle = '#446655';
        ctx.font      = '9px monospace';
        ctx.fillText(ABILITY_DESC[i], x + 8, y0 + 50);
      }
    }

    ctx.textAlign = 'left';
  }

  // ── Minimap ──────────────────────────────────────────────────────────────
  _drawMinimap(ctx, player, world, npcs, vw, vh) {
    const scale  = this.minimapScale;
    const mmW    = Math.round(MAP_W * scale);
    const mmH    = Math.round(MAP_H * scale);
    const mmX    = vw - mmW - 12;
    const mmY    = 12;

    // Background
    ctx.fillStyle   = C.MINIMAP_BG;
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = C.HUD_BORDER;
    ctx.lineWidth   = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // Tiles (draw blocks of pixels)
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = world.getTile(tx, ty);
        if (t === TILE.WALL) {
          ctx.fillStyle = C.MINIMAP_WALL;
          ctx.fillRect(mmX + tx * scale, mmY + ty * scale, scale, scale);
        } else if (t === TILE.TERMINAL) {
          ctx.fillStyle = C.TERMINAL_DIM;
          ctx.fillRect(mmX + tx * scale, mmY + ty * scale, scale, scale);
        }
        // FLOOR = background color, skip for speed
      }
    }

    // Items
    for (const item of world.items) {
      if (item.picked) continue;
      ctx.fillStyle = C.MINIMAP_ITEM;
      ctx.fillRect(mmX + item.tx * scale, mmY + item.ty * scale, scale, scale);
    }

    // Police
    for (const npc of npcs) {
      if (npc.type === NPC_TYPE.POLICE) {
        ctx.fillStyle = C.MINIMAP_POLICE;
        const nx = mmX + px2tile(npc.x) * scale;
        const ny = mmY + px2tile(npc.y) * scale;
        ctx.fillRect(nx - 1, ny - 1, scale + 2, scale + 2);
      }
    }

    // Player dot
    const ptx = px2tile(player.x);
    const pty = px2tile(player.y);
    ctx.fillStyle = C.MINIMAP_PLAYER;
    ctx.beginPath();
    ctx.arc(mmX + ptx * scale + scale / 2, mmY + pty * scale + scale / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Viewport rectangle on minimap
    const vpTilesW = Math.ceil(vw / TILE_SIZE);
    const vpTilesH = Math.ceil(vh / TILE_SIZE);
    const vcx = px2tile(player.x);
    const vcy = px2tile(player.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(
      mmX + (vcx - vpTilesW / 2) * scale,
      mmY + (vcy - vpTilesH / 2) * scale,
      vpTilesW * scale,
      vpTilesH * scale
    );

    // Label
    ctx.fillStyle = C.HUD_TEXT_DIM;
    ctx.font      = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MAP', mmX + mmW - 3, mmY + mmH - 3);
    ctx.textAlign = 'left';
  }

  // ── Floating messages ─────────────────────────────────────────────────────
  _drawMessages(ctx, vw, vh) {
    const x = 12;
    let y   = vh - 80;

    for (let i = 0; i < this.messages.length; i++) {
      const m     = this.messages[i];
      const alpha = Math.min(1, m.timer);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = m.color;
      ctx.font        = i === 0 ? 'bold 13px monospace' : '11px monospace';
      ctx.textAlign   = 'left';
      ctx.fillText('▸ ' + m.text, x, y);
      y -= 17;
    }
    ctx.globalAlpha = 1;
  }

  // ── Named location labels in world ────────────────────────────────────────
  _drawNamedLocations(ctx, world, cam, vw, vh) {
    for (const loc of world.namedLocs) {
      const wx = tile2px(loc.x);
      const wy = tile2px(loc.y);
      const { sx, sy } = worldToScreen(wx, wy, cam, vw, vh);
      if (sx < -100 || sx > vw + 100 || sy < -20 || sy > vh + 20) continue;

      ctx.fillStyle  = loc.color + 'aa';
      ctx.font       = 'bold 9px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(`⬡ ${loc.name}`, sx, sy - 18);
    }
    ctx.textAlign = 'left';
  }

  // ── Terminal "E to hack" indicators ───────────────────────────────────────
  _drawTerminalIndicators(ctx, player, world, cam, vw, vh) {
    const ptx = px2tile(player.x);
    const pty = px2tile(player.y);
    for (const t of world.terminals) {
      if (t.hacked) continue;
      const dx = Math.abs(t.x - ptx);
      const dy = Math.abs(t.y - pty);
      if (dx > 2 || dy > 2) continue;
      const { sx, sy } = worldToScreen(tile2px(t.x), tile2px(t.y), cam, vw, vh);
      ctx.fillStyle  = C.TERMINAL;
      ctx.font       = 'bold 9px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('[1] HACK', sx, sy - 18);
    }
    ctx.textAlign = 'left';
  }
}
