import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data: { score: number; bestScore: number; round: number }) {
    this.data.set('score', data.score);
    this.data.set('bestScore', data.bestScore);
    this.data.set('round', data.round);
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const score = this.data.get('score') as number;
    const best = this.data.get('bestScore') as number;
    const round = this.data.get('round') as number;
    const isNewBest = score >= best;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    this.add.text(cx, 100, 'CONNECTION LOST', {
      fontSize: '52px', color: '#ff2200', fontFamily: 'Courier New',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 175, `ROUNDS SURVIVED: ${round - 1}`, {
      fontSize: '20px', color: '#aaaaaa', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, 220, `SCORE: ${score}`, {
      fontSize: '32px', color: '#00ffcc', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    if (isNewBest) {
      this.add.text(cx, 270, '★  NEW BEST SCORE  ★', {
        fontSize: '22px', color: '#ffcc00', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, 270, `BEST: ${best}`, {
        fontSize: '22px', color: '#ffcc00', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    }

    const retryBtn = this.add.text(cx, 370, '[ RUN AGAIN ]', {
      fontSize: '26px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => this.scene.start('GameScene'));

    const menuBtn = this.add.text(cx, 440, '[ MAIN MENU ]', {
      fontSize: '18px', color: '#446655', fontFamily: 'Courier New',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard!.once('keydown-R', () => this.scene.start('GameScene'));
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
