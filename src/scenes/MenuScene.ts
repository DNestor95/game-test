import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BEST_SCORE_KEY, LEADERBOARD_MAX_NAME_LENGTH } from '../config/GameConfig';
import { LeaderboardManager } from '../systems/LeaderboardManager';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.lineStyle(1, 0x003322, 0.4);
    for (let x = 0; x < GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);

    this.add.text(cx, 60, 'NETRUNNER', {
      fontSize: '64px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 125, '.EXE', {
      fontSize: '28px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, 166, 'HACK THE NETWORK. SURVIVE THE HEAT.', {
      fontSize: '14px', color: '#888888', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const best = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
    this.add.text(cx, 196, `BEST SCORE: ${best}`, {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const startBtn = this.add.text(cx, 240, '[ ENTER THE NET ]', {
      fontSize: '24px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      alpha: 0.5, duration: 800,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    startBtn.on('pointerdown', () => this.startGame());

    this.input.keyboard!.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard!.once('keydown-SPACE', () => this.startGame());

    // ── LEADERBOARD ──
    this.drawLeaderboard(cx);

    this.add.text(cx, GAME_HEIGHT - 20, 'WASD — move  |  SHIFT — dash  |  E — hack node  |  ENTER to start', {
      fontSize: '11px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private drawLeaderboard(cx: number) {
    const entries = LeaderboardManager.getEntries();

    // Leaderboard header
    const headerY = 290;
    this.add.text(cx, headerY, '── TOP RUNNERS ──', {
      fontSize: '16px', color: '#ff8844', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    if (entries.length === 0) {
      this.add.text(cx, headerY + 30, 'NO RUNS RECORDED YET', {
        fontSize: '13px', color: '#446655', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      return;
    }

    // Column headers
    const ROW_START_Y = headerY + 28;
    const ROW_H = 22;
    const RANK_X = cx - 280;
    const NAME_X = cx - 220;
    const SCORE_X = cx + 120;
    const ROUNDS_X = cx + 240;

    this.add.text(RANK_X, ROW_START_Y, '#', {
      fontSize: '11px', color: '#557755', fontFamily: 'Courier New',
    });
    this.add.text(NAME_X, ROW_START_Y, 'HANDLE', {
      fontSize: '11px', color: '#557755', fontFamily: 'Courier New',
    });
    this.add.text(SCORE_X, ROW_START_Y, 'SCORE', {
      fontSize: '11px', color: '#557755', fontFamily: 'Courier New',
    }).setOrigin(1, 0);
    this.add.text(ROUNDS_X, ROW_START_Y, 'ROUNDS', {
      fontSize: '11px', color: '#557755', fontFamily: 'Courier New',
    }).setOrigin(1, 0);

    // Divider line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x224433, 0.6);
    lineG.lineBetween(RANK_X, ROW_START_Y + 16, ROUNDS_X, ROW_START_Y + 16);

    // Entries
    entries.forEach((entry, i) => {
      const y = ROW_START_Y + 20 + i * ROW_H;
      const rank = i + 1;

      // Rank colors: gold, silver, bronze for top 3
      let rankColor = '#446655';
      let nameColor = '#88aa88';
      let scoreColor = '#00cc88';
      if (rank === 1) { rankColor = '#ffcc00'; nameColor = '#ffcc00'; scoreColor = '#ffcc00'; }
      else if (rank === 2) { rankColor = '#cccccc'; nameColor = '#cccccc'; scoreColor = '#cccccc'; }
      else if (rank === 3) { rankColor = '#cc8844'; nameColor = '#cc8844'; scoreColor = '#cc8844'; }

      this.add.text(RANK_X, y, `${rank}.`, {
        fontSize: '12px', color: rankColor, fontFamily: 'Courier New',
      });

      const displayName = entry.name.length > LEADERBOARD_MAX_NAME_LENGTH
        ? entry.name.substring(0, LEADERBOARD_MAX_NAME_LENGTH)
        : entry.name;
      this.add.text(NAME_X, y, displayName, {
        fontSize: '12px', color: nameColor, fontFamily: 'Courier New',
      });

      this.add.text(SCORE_X, y, `${entry.score}`, {
        fontSize: '12px', color: scoreColor, fontFamily: 'Courier New',
      }).setOrigin(1, 0);

      this.add.text(ROUNDS_X, y, `${entry.rounds}`, {
        fontSize: '12px', color: '#668866', fontFamily: 'Courier New',
      }).setOrigin(1, 0);
    });
  }

  private startGame() {
    this.scene.start('GameScene');
  }
}
