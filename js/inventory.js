// ─── Inventory System ──────────────────────────────────────────────────────

const INV_COLS    = 4;
const INV_ROWS    = 5;
const INV_SLOT_SZ = 60;

const ITEM_DEF = {
  [ITEM.CREDITS]: {
    type:  ITEM.CREDITS,
    name:  'Credits',
    desc:  'Street currency. Useful for bribes.',
    color: C.ITEM_CREDITS,
    value: 50,
    icon:  '$',
  },
  [ITEM.HACK_TOOL]: {
    type:  ITEM.HACK_TOOL,
    name:  'Hack Tool',
    desc:  '+0.5x hack speed. Stackable.',
    color: C.ITEM_HACK_TOOL,
    value: 0,
    icon:  '◈',
  },
  [ITEM.DISGUISE]: {
    type:  ITEM.DISGUISE,
    name:  'Disguise',
    desc:  'Reduces heat by 35. Lasts 30s.',
    color: C.ITEM_DISGUISE,
    value: 0,
    icon:  '◉',
  },
  [ITEM.WEAPON]: {
    type:  ITEM.WEAPON,
    name:  'Sidearm',
    desc:  'Resist arrest. Fight back.',
    color: C.ITEM_WEAPON,
    value: 0,
    icon:  '▲',
  },
  [ITEM.MED_KIT]: {
    type:  ITEM.MED_KIT,
    name:  'Med-Kit',
    desc:  'Restore 40 HP.',
    color: C.ITEM_MED_KIT,
    value: 0,
    icon:  '+',
  },
};

class Inventory {
  constructor() {
    this.slots  = new Array(INV_COLS * INV_ROWS).fill(null);
    this.hovered = -1;
  }

  addItem(type) {
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { ...ITEM_DEF[type] };
        return true;
      }
    }
    return false; // full
  }

  removeItem(index) {
    const item = this.slots[index];
    this.slots[index] = null;
    return item;
  }

  useItem(index, player) {
    const item = this.slots[index];
    if (!item) return null;
    player.applyItem(item);
    this.slots[index] = null;
    return item;
  }

  // ── Render full inventory screen ─────────────────────────────────────────
  render(ctx, vw, vh, mouseX, mouseY) {
    const panelW = INV_COLS * INV_SLOT_SZ + 80;
    const panelH = INV_ROWS * INV_SLOT_SZ + 120;
    const px     = (vw - panelW) / 2;
    const py     = (vh - panelH) / 2;

    // Panel background
    ctx.fillStyle   = 'rgba(5,10,25,0.97)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = C.HUD_BORDER;
    ctx.lineWidth   = 2;
    ctx.strokeRect(px + 1, py + 1, panelW - 2, panelH - 2);

    // Title
    ctx.fillStyle  = C.HUD_TEXT;
    ctx.font       = 'bold 16px monospace';
    ctx.textAlign  = 'left';
    ctx.fillText('▸ INVENTORY', px + 20, py + 28);
    ctx.fillStyle  = C.HUD_TEXT_DIM;
    ctx.font       = '11px monospace';
    ctx.fillText('[I] CLOSE  |  [CLICK] USE ITEM', px + 20, py + 50);

    // Grid
    const gridX = px + 20;
    const gridY = py + 65;
    this.hovered = -1;

    for (let i = 0; i < this.slots.length; i++) {
      const col = i % INV_COLS;
      const row = Math.floor(i / INV_COLS);
      const sx  = gridX + col * INV_SLOT_SZ;
      const sy  = gridY + row * INV_SLOT_SZ;
      const inside = mouseX >= sx && mouseX < sx + INV_SLOT_SZ - 4 &&
                     mouseY >= sy && mouseY < sy + INV_SLOT_SZ - 4;
      if (inside) this.hovered = i;

      // Slot background
      ctx.fillStyle = inside ? 'rgba(0,80,50,0.5)' : 'rgba(10,20,40,0.7)';
      ctx.fillRect(sx, sy, INV_SLOT_SZ - 4, INV_SLOT_SZ - 4);
      ctx.strokeStyle = inside ? C.TERMINAL : C.HUD_BORDER;
      ctx.lineWidth   = inside ? 2 : 1;
      ctx.strokeRect(sx, sy, INV_SLOT_SZ - 4, INV_SLOT_SZ - 4);

      const item = this.slots[i];
      if (item) {
        // Item background glow
        ctx.fillStyle = item.color + '22';
        ctx.fillRect(sx + 1, sy + 1, INV_SLOT_SZ - 6, INV_SLOT_SZ - 6);

        // Icon
        ctx.fillStyle  = item.color;
        ctx.font       = 'bold 22px monospace';
        ctx.textAlign  = 'center';
        ctx.fillText(item.icon, sx + (INV_SLOT_SZ - 4) / 2, sy + 32);

        // Name
        ctx.fillStyle = '#aaccbb';
        ctx.font      = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(item.name.toUpperCase(), sx + (INV_SLOT_SZ - 4) / 2, sy + 48);
      }
    }

    // Tooltip for hovered item
    if (this.hovered >= 0 && this.slots[this.hovered]) {
      const item = this.slots[this.hovered];
      const col  = this.hovered % INV_COLS;
      const row  = Math.floor(this.hovered / INV_COLS);
      const ttx  = gridX + col * INV_SLOT_SZ + INV_SLOT_SZ;
      const tty  = gridY + row * INV_SLOT_SZ;
      const ttw  = 200;
      const tth  = 60;

      const ftx = Math.min(ttx, vw - ttw - 20);
      ctx.fillStyle   = C.TOOLTIP_BG;
      ctx.fillRect(ftx, tty, ttw, tth);
      ctx.strokeStyle = item.color;
      ctx.lineWidth   = 1;
      ctx.strokeRect(ftx, tty, ttw, tth);

      ctx.fillStyle  = item.color;
      ctx.font       = 'bold 12px monospace';
      ctx.textAlign  = 'left';
      ctx.fillText(item.name.toUpperCase(), ftx + 10, tty + 18);
      ctx.fillStyle  = C.TOOLTIP_TEXT;
      ctx.font       = '10px monospace';
      ctx.fillText(item.desc, ftx + 10, tty + 35);
      ctx.fillStyle  = '#aaaaaa';
      ctx.font       = '9px monospace';
      ctx.fillText('[CLICK] to use', ftx + 10, tty + 50);
    }
  }

  getClickedSlot(mouseX, mouseY, vw, vh) {
    const panelW = INV_COLS * INV_SLOT_SZ + 80;
    const panelH = INV_ROWS * INV_SLOT_SZ + 120;
    const px     = (vw - panelW) / 2;
    const py     = (vh - panelH) / 2;
    const gridX  = px + 20;
    const gridY  = py + 65;

    for (let i = 0; i < this.slots.length; i++) {
      const col = i % INV_COLS;
      const row = Math.floor(i / INV_COLS);
      const sx  = gridX + col * INV_SLOT_SZ;
      const sy  = gridY + row * INV_SLOT_SZ;
      if (mouseX >= sx && mouseX < sx + INV_SLOT_SZ - 4 &&
          mouseY >= sy && mouseY < sy + INV_SLOT_SZ - 4) {
        return i;
      }
    }
    return -1;
  }
}
