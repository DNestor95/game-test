// ─── Hacking Terminal Minigame ─────────────────────────────────────────────
//
//  The player must crack a 4-symbol cipher code.
//  A matrix of symbols is shown.  The player clicks symbols in row order
//  to match the target sequence.  There is a time limit.
//

const HACK_SYMBOLS = ['◆', '■', '▲', '●', '◈', '◉', '⬡', '⬟', '★', '◇'];
const HACK_COLS    = 6;
const HACK_ROWS    = 4;
const HACK_TARGET_LEN = 4;
const HACK_TIME    = 30; // seconds

class HackingGame {
  constructor() {
    this.active      = false;
    this.terminal    = null;
    this.matrix      = [];     // [row][col] symbol index
    this.target      = [];     // sequence of symbol indices
    this.selected    = [];     // player selected cells [{row,col}]
    this.curRow      = 0;      // player must pick from this row
    this.timeLeft    = 0;
    this.solved      = false;
    this.failed      = false;
    this.flashTimer  = 0;
    this.resultTimer = 0;
    this.onSuccess   = null;
    this.onFail      = null;
    this.hoveredCell = null;
  }

  start(terminal, onSuccess, onFail) {
    this.active      = true;
    this.terminal    = terminal;
    this.timeLeft    = HACK_TIME;
    this.solved      = false;
    this.failed      = false;
    this.selected    = [];
    this.curRow      = 0;
    this.resultTimer = 0;
    this.hoveredCell = null;
    this.onSuccess   = onSuccess;
    this.onFail      = onFail;

    // Generate symbol matrix
    this.matrix = [];
    for (let r = 0; r < HACK_ROWS; r++) {
      const row = [];
      for (let c = 0; c < HACK_COLS; c++) {
        row.push(Math.floor(Math.random() * HACK_SYMBOLS.length));
      }
      this.matrix.push(row);
    }

    // Generate target by picking symbols that appear in alternating rows
    this.target = [];
    let row = 0;
    for (let i = 0; i < HACK_TARGET_LEN; i++) {
      const col  = Math.floor(Math.random() * HACK_COLS);
      this.target.push(this.matrix[row % HACK_ROWS][col]);
      row++;
    }
  }

  update(dt) {
    if (!this.active) return;

    if (this.solved || this.failed) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) {
        this.active = false;
        if (this.solved && this.onSuccess) this.onSuccess();
        else if (this.failed && this.onFail)  this.onFail();
      }
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft    = 0;
      this.failed      = true;
      this.resultTimer = 1.5;
    }
  }

  handleClick(mouseX, mouseY, vw, vh) {
    if (!this.active || this.solved || this.failed) return;
    const cell = this._cellAt(mouseX, mouseY, vw, vh);
    if (!cell) return;

    // Player must click from the current row (alternating row constraint)
    if (cell.row !== this.curRow % HACK_ROWS) return;

    const sym  = this.matrix[cell.row][cell.col];
    const need = this.target[this.selected.length];
    this.selected.push({ row: cell.row, col: cell.col, correct: sym === need });

    if (sym !== need) {
      // Wrong — fail
      this.failed      = true;
      this.resultTimer = 1.5;
      return;
    }

    this.curRow++;

    if (this.selected.length === HACK_TARGET_LEN) {
      this.solved      = true;
      this.resultTimer = 1.5;
    }
  }

  handleMouseMove(mouseX, mouseY, vw, vh) {
    if (!this.active || this.solved || this.failed) return;
    this.hoveredCell = this._cellAt(mouseX, mouseY, vw, vh);
  }

  _cellAt(mx, my, vw, vh) {
    const { x0, y0, cellW, cellH } = this._layout(vw, vh);
    const col = Math.floor((mx - x0) / cellW);
    const row = Math.floor((my - y0) / cellH);
    if (col < 0 || col >= HACK_COLS || row < 0 || row >= HACK_ROWS) return null;
    return { row, col };
  }

  _layout(vw, vh) {
    const panelW = 520;
    const panelH = 440;
    const px     = (vw - panelW) / 2;
    const py     = (vh - panelH) / 2;
    const matX   = px + 30;
    const matY   = py + 130;
    const cellW  = (panelW - 60) / HACK_COLS;
    const cellH  = 52;
    return { panelW, panelH, px, py, x0: matX, y0: matY, cellW, cellH };
  }

  render(ctx, vw, vh) {
    if (!this.active) return;
    const { panelW, panelH, px, py, x0, y0, cellW, cellH } = this._layout(vw, vh);

    // Overlay
    ctx.fillStyle = 'rgba(0,5,15,0.88)';
    ctx.fillRect(0, 0, vw, vh);

    // Panel
    ctx.fillStyle   = 'rgba(0,10,25,0.98)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = C.TERMINAL;
    ctx.lineWidth   = 2;
    ctx.strokeRect(px + 1, py + 1, panelW - 2, panelH - 2);

    // Scan-line effect
    for (let ly = py; ly < py + panelH; ly += 4) {
      ctx.fillStyle = 'rgba(0,255,159,0.02)';
      ctx.fillRect(px, ly, panelW, 2);
    }

    // Header
    ctx.fillStyle  = C.TERMINAL;
    ctx.font       = 'bold 18px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('[ BREACH PROTOCOL ]', px + panelW / 2, py + 28);

    ctx.fillStyle = '#336655';
    ctx.font      = '11px monospace';
    ctx.fillText('SELECT SYMBOLS IN SEQUENCE — CURRENT ROW IS HIGHLIGHTED', px + panelW / 2, py + 46);

    // Timer bar
    const timerRatio = this.timeLeft / HACK_TIME;
    const barW = panelW - 60;
    ctx.fillStyle = '#001a0d';
    ctx.fillRect(px + 30, py + 58, barW, 8);
    ctx.fillStyle = timerRatio > 0.5 ? C.TERMINAL : timerRatio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(px + 30, py + 58, barW * timerRatio, 8);

    ctx.fillStyle = '#aaaaaa';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(this.timeLeft)}s`, px + 30 + barW, py + 56);

    // Target sequence display
    ctx.fillStyle  = '#aaddcc';
    ctx.font       = 'bold 11px monospace';
    ctx.textAlign  = 'left';
    ctx.fillText('TARGET SEQUENCE:', px + 30, py + 88);

    for (let i = 0; i < HACK_TARGET_LEN; i++) {
      const tx      = px + 30 + 140 + i * 50;
      const done    = i < this.selected.length;
      ctx.fillStyle = done ? (this.selected[i]?.correct ? C.TERMINAL : '#ff4444') : '#224433';
      ctx.fillRect(tx - 18, py + 76, 36, 24);
      ctx.strokeStyle = done ? (this.selected[i]?.correct ? C.TERMINAL : '#ff4444') : '#336655';
      ctx.lineWidth   = 1;
      ctx.strokeRect(tx - 18, py + 76, 36, 24);
      ctx.fillStyle  = done ? '#ffffff' : '#447766';
      ctx.font       = 'bold 14px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(HACK_SYMBOLS[this.target[i]], tx, py + 93);
    }

    // Matrix grid
    for (let r = 0; r < HACK_ROWS; r++) {
      const isActiveRow = (r === this.curRow % HACK_ROWS) && !this.solved && !this.failed;
      for (let c = 0; c < HACK_COLS; c++) {
        const cx = x0 + c * cellW;
        const cy = y0 + r * cellH;
        const hov = this.hoveredCell && this.hoveredCell.row === r && this.hoveredCell.col === c;
        const sym = HACK_SYMBOLS[this.matrix[r][c]];

        // Check if already selected
        const selIdx = this.selected.findIndex(s => s.row === r && s.col === c);
        const wasSel = selIdx >= 0;

        let bgColor, borderColor, textColor;
        if (wasSel) {
          bgColor    = this.selected[selIdx].correct ? '#00331a' : '#330000';
          borderColor = this.selected[selIdx].correct ? C.TERMINAL  : '#ff4444';
          textColor  = this.selected[selIdx].correct ? C.TERMINAL  : '#ff4444';
        } else if (isActiveRow) {
          bgColor    = hov ? '#003322' : '#001a11';
          borderColor = hov ? C.TERMINAL : '#226644';
          textColor  = hov ? C.TERMINAL  : '#44bb88';
        } else {
          bgColor    = '#000e1a';
          borderColor = '#0d2233';
          textColor  = '#1a4433';
        }

        ctx.fillStyle   = bgColor;
        ctx.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth   = isActiveRow && !wasSel ? 1.5 : 1;
        ctx.strokeRect(cx + 2, cy + 2, cellW - 4, cellH - 4);

        ctx.fillStyle  = textColor;
        ctx.font       = 'bold 22px monospace';
        ctx.textAlign  = 'center';
        ctx.fillText(sym, cx + cellW / 2, cy + cellH / 2 + 8);
      }
    }

    // Row indicator
    const rowLabelX = x0 - 20;
    for (let r = 0; r < HACK_ROWS; r++) {
      const isActiveRow = r === this.curRow % HACK_ROWS;
      ctx.fillStyle  = isActiveRow ? C.TERMINAL : '#224433';
      ctx.font       = isActiveRow ? 'bold 12px monospace' : '10px monospace';
      ctx.textAlign  = 'right';
      ctx.fillText(isActiveRow ? '▶' : `${r + 1}`, rowLabelX, y0 + r * cellH + cellH / 2 + 5);
    }

    // Result overlay
    if (this.solved) {
      ctx.fillStyle = 'rgba(0,30,15,0.9)';
      ctx.fillRect(px + 20, py + panelH / 2 - 40, panelW - 40, 80);
      ctx.strokeStyle = C.TERMINAL;
      ctx.lineWidth   = 2;
      ctx.strokeRect(px + 20, py + panelH / 2 - 40, panelW - 40, 80);
      ctx.fillStyle  = C.TERMINAL;
      ctx.font       = 'bold 26px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('ACCESS GRANTED', px + panelW / 2, py + panelH / 2 + 10);
    } else if (this.failed) {
      ctx.fillStyle = 'rgba(30,0,0,0.9)';
      ctx.fillRect(px + 20, py + panelH / 2 - 40, panelW - 40, 80);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth   = 2;
      ctx.strokeRect(px + 20, py + panelH / 2 - 40, panelW - 40, 80);
      ctx.fillStyle  = '#ff4444';
      ctx.font       = 'bold 26px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('ACCESS DENIED', px + panelW / 2, py + panelH / 2 + 10);
    }

    ctx.textAlign = 'left'; // reset
  }
}
