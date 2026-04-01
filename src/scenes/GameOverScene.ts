import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, LEADERBOARD_MAX_NAME_LENGTH, LeaderboardEntry } from '../config/GameConfig';
import { LeaderboardManager } from '../systems/LeaderboardManager';

export class GameOverScene extends Phaser.Scene {
  private playerName = '';
  private nameText!: Phaser.GameObjects.Text;
  private cursorBlink!: Phaser.Time.TimerEvent;
  private showCursor = true;
  private submitted = false;
  private rankText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private retryBtn!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GameOverScene' }); }

  init(data: { score: number; bestScore: number; round: number }) {
    this.data.set('score', data.score);
    this.data.set('bestScore', data.bestScore);
    this.data.set('round', data.round);
    this.playerName = '';
    this.submitted = false;
    this.showCursor = true;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const score = this.data.get('score') as number;
    const best = this.data.get('bestScore') as number;
    const round = this.data.get('round') as number;
    const isNewBest = score >= best;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    this.add.text(cx, GAME_HEIGHT * 0.10, 'CONNECTION LOST', {
      fontSize: '52px', color: '#ff2200', fontFamily: 'Courier New',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT * 0.19, `ROUNDS SURVIVED: ${round - 1}`, {
      fontSize: '20px', color: '#aaaaaa', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT * 0.25, `SCORE: ${score}`, {
      fontSize: '32px', color: '#00ffcc', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    if (isNewBest) {
      this.add.text(cx, GAME_HEIGHT * 0.31, '★  NEW BEST SCORE  ★', {
        fontSize: '22px', color: '#ffcc00', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, GAME_HEIGHT * 0.31, `BEST: ${best}`, {
        fontSize: '22px', color: '#ffcc00', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    }

    // Name input section
    this.promptText = this.add.text(cx, GAME_HEIGHT * 0.40, 'ENTER YOUR HANDLE:', {
      fontSize: '18px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // Input box background
    this.add.rectangle(cx, GAME_HEIGHT * 0.46, 320, 40, 0x001a11)
      .setStrokeStyle(2, 0x00ff88);

    this.nameText = this.add.text(cx, GAME_HEIGHT * 0.46, '_', {
      fontSize: '24px', color: '#00ffcc', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // Blinking cursor
    this.cursorBlink = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (this.submitted) return;
        this.showCursor = !this.showCursor;
        this.updateNameDisplay();
      },
    });

    this.actionHint = this.add.text(cx, GAME_HEIGHT * 0.52, 'TYPE YOUR NAME AND PRESS ENTER TO SUBMIT', {
      fontSize: '11px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.rankText = this.add.text(cx, GAME_HEIGHT * 0.57, '', {
      fontSize: '20px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // Retry and menu buttons (initially hidden until name submitted)
    this.retryBtn = this.add.text(cx, GAME_HEIGHT * 0.66, '[ RUN AGAIN ]', {
      fontSize: '26px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    this.retryBtn.on('pointerdown', () => this.scene.start('GameScene'));

    this.menuBtn = this.add.text(cx, GAME_HEIGHT * 0.74, '[ MAIN MENU ]', {
      fontSize: '18px', color: '#446655', fontFamily: 'Courier New',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    this.menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Keyboard input handling
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.submitted) {
        if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
          this.scene.start('GameScene');
        } else if (event.key === 'Escape') {
          this.scene.start('MenuScene');
        }
        return;
      }

      if (event.key === 'Enter') {
        this.submitName();
        return;
      }

      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        this.updateNameDisplay();
        return;
      }

      // Only allow printable characters (single char, no special keys)
      if (event.key.length === 1 && this.playerName.length < LEADERBOARD_MAX_NAME_LENGTH) {
        const char = event.key;
        // Allow alphanumeric, spaces, dashes, underscores
        if (/^[a-zA-Z0-9 _\-.]$/.test(char)) {
          this.playerName += char;
          this.updateNameDisplay();
        }
      }
    });
  }

  private updateNameDisplay() {
    const cursor = (!this.submitted && this.showCursor) ? '_' : '';
    const display = this.playerName.length > 0 ? this.playerName + cursor : cursor;
    this.nameText.setText(display);
  }

  private submitName() {
    const score = this.data.get('score') as number;
    const round = this.data.get('round') as number;

    // Default name if empty
    const name = this.playerName.trim() || 'ANONYMOUS';
    this.playerName = name;
    this.submitted = true;

    // Save to leaderboard
    const entry: LeaderboardEntry = {
      name,
      score,
      rounds: round - 1,
      date: new Date().toISOString(),
    };
    const rank = LeaderboardManager.addEntry(entry);

    // Update display
    this.updateNameDisplay();
    this.promptText.setText('HANDLE REGISTERED');
    this.actionHint.setText('ENTER / R — RUN AGAIN  |  ESC — MAIN MENU');

    if (rank > 0) {
      this.rankText.setText(`LEADERBOARD RANK: #${rank}`);
    } else {
      this.rankText.setText('SCORE DID NOT MAKE TOP 15');
    }

    // Show navigation buttons
    this.retryBtn.setVisible(true);
    this.menuBtn.setVisible(true);
  }
}
