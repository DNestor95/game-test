import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, Upgrade } from '../config/GameConfig';

export class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'UpgradeScene' }); }

  init(data: { round: number; score: number }) {
    this.data.set('round', data.round);
    this.data.set('score', data.score);
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const round = this.data.get('round') as number;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    this.add.text(cx, 60, `ROUND ${round} COMPLETE`, {
      fontSize: '36px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 110, 'CHOOSE AN AUGMENT', {
      fontSize: '18px', color: '#888888', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const pool = Phaser.Utils.Array.Shuffle([...UPGRADES]).slice(0, 3) as Upgrade[];

    pool.forEach((upgrade, i) => {
      const cardX = 150 + i * 250;
      const cardY = GAME_HEIGHT / 2;
      const card = this.add.rectangle(cardX, cardY, 210, 160, 0x001a11)
        .setStrokeStyle(2, 0x00ff88)
        .setInteractive({ useHandCursor: true });

      this.add.text(cardX, cardY - 35, upgrade.label, {
        fontSize: '16px', color: '#00ffcc', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 190 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY + 15, upgrade.desc, {
        fontSize: '13px', color: '#888888', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 190 },
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(3, 0x00ffff));
      card.on('pointerout', () => card.setStrokeStyle(2, 0x00ff88));
      card.on('pointerdown', () => this.selectUpgrade(upgrade));
      this.input.keyboard!.once(`keydown-${i + 1}`, () => this.selectUpgrade(upgrade));
    });

    this.add.text(cx, GAME_HEIGHT - 40, 'CLICK OR PRESS 1 / 2 / 3 TO SELECT', {
      fontSize: '11px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private selectUpgrade(upgrade: Upgrade) {
    this.scene.stop('UpgradeScene');
    this.scene.resume('GameScene', { upgrade });
  }
}
