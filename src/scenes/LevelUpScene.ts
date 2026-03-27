import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, Upgrade } from '../config/GameConfig';

interface LevelUpData {
  playerLevel: number;
  xpToNext: number;
}

/**
 * Displayed mid-round whenever the player reaches a new level through
 * hacking nodes or killing enemies.  The GameScene is paused while this
 * overlay is active; it resumes once the player picks an augmentation.
 */
export class LevelUpScene extends Phaser.Scene {
  private selectedUpgrade: Upgrade | null = null;

  constructor() { super({ key: 'LevelUpScene' }); }

  init(_data: LevelUpData) {
    this.selectedUpgrade = null;
  }

  create(data: LevelUpData) {
    const cx = GAME_WIDTH / 2;
    const playerLevel = data?.playerLevel ?? 2;

    // Dark translucent overlay covering the whole viewport
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    // ── HEADER ──
    this.add.text(cx, 30, 'NEURAL UPGRADE', {
      fontSize: '36px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 74, `LEVEL ${playerLevel} REACHED`, {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const divG = this.add.graphics();
    divG.lineStyle(1, 0x224433, 1);
    divG.lineBetween(40, 94, GAME_WIDTH - 40, 94);

    this.add.text(cx, 108, 'SELECT AN AUGMENTATION', {
      fontSize: '13px', color: '#667766', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // ── 3 UPGRADE CARDS ──
    const pool = Phaser.Utils.Array.Shuffle([...UPGRADES]).slice(0, 3) as Upgrade[];

    const AUG_W = 200;
    const AUG_H = 115;
    const AUG_GAP = 18;
    const AUG_Y = GAME_HEIGHT / 2 + 10;
    const augTotalW = 3 * AUG_W + 2 * AUG_GAP;
    const augStartX = (GAME_WIDTH - augTotalW) / 2 + AUG_W / 2;

    pool.forEach((upgrade, i) => {
      const cardX = augStartX + i * (AUG_W + AUG_GAP);
      const card = this.add.rectangle(cardX, AUG_Y, AUG_W, AUG_H, 0x001a11)
        .setStrokeStyle(2, 0x00ff88)
        .setInteractive({ useHandCursor: true });

      this.add.text(cardX, AUG_Y - 32, upgrade.label, {
        fontSize: '15px', color: '#00ffcc', fontFamily: 'Courier New',
        align: 'center', wordWrap: { width: AUG_W - 16 },
      }).setOrigin(0.5);

      this.add.text(cardX, AUG_Y + 5, upgrade.desc, {
        fontSize: '13px', color: '#aaaaaa', fontFamily: 'Courier New',
        align: 'center', wordWrap: { width: AUG_W - 16 },
      }).setOrigin(0.5);

      this.add.text(cardX, AUG_Y + 34, `[ press ${i + 1} ]`, {
        fontSize: '11px', color: '#336644', fontFamily: 'Courier New',
      }).setOrigin(0.5);

      const select = () => {
        this.selectedUpgrade = upgrade;
        this.deploy();
      };

      card.on('pointerover', () => card.setStrokeStyle(3, 0x00ffff));
      card.on('pointerout',  () => card.setStrokeStyle(2, 0x00ff88));
      card.on('pointerdown', select);
      this.input.keyboard!.once(`keydown-${i + 1}`, select);
    });

    this.add.text(cx, GAME_HEIGHT - 18, 'CLICK OR PRESS 1 – 3 TO INSTALL AUGMENT  •  FREE OF CHARGE', {
      fontSize: '10px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private deploy() {
    this.scene.stop('LevelUpScene');
    this.scene.resume('GameScene', {
      upgrade: this.selectedUpgrade,
      creditsSpent: 0,
      nextRound: false,
    });
  }
}
