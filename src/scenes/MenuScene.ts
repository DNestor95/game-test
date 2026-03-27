import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BEST_SCORE_KEY } from '../config/GameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.lineStyle(1, 0x003322, 0.4);
    for (let x = 0; x < GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);

    this.add.text(cx, 120, 'NETRUNNER', {
      fontSize: '64px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 185, '.EXE', {
      fontSize: '28px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, 250, 'HACK THE NETWORK. SURVIVE THE HEAT.', {
      fontSize: '14px', color: '#888888', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const best = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
    this.add.text(cx, 300, `BEST SCORE: ${best}`, {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const startBtn = this.add.text(cx, 380, '[ ENTER THE NET ]', {
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

    this.add.text(cx, 530, 'WASD — move  |  SHIFT — dash  |  E — hack node  |  ENTER to start', {
      fontSize: '11px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private startGame() {
    this.scene.start('GameScene');
  }
}
