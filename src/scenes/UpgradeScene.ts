import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WEAPONS } from '../config/GameConfig';

interface ShopData {
  round: number;
  score: number;
  credits: number;
  ownedWeaponIds: string[];
}

/**
 * Displayed after completing a stage (hacking the exit node).
 * Shows the weapon shop so players can spend credits earned in the run.
 * Free upgrades/augmentations are no longer awarded here — they come
 * from the XP-based level-up system (LevelUpScene) instead.
 */
export class UpgradeScene extends Phaser.Scene {
  private credits = 0;
  private creditsSpent = 0;
  private selectedWeaponId: string | null = null;
  private ownedWeaponIds: string[] = [];
  private creditsDisplay!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'UpgradeScene' }); }

  init(data: ShopData) {
    this.data.set('round', data.round);
    this.data.set('score', data.score);
    this.credits = data.credits;
    this.creditsSpent = 0;
    this.selectedWeaponId = null;
    this.ownedWeaponIds = data.ownedWeaponIds ?? ['pistol'];
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const round = this.data.get('round') as number;

    // Dark overlay — full canvas
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.93);

    // ── HEADER ──
    this.add.text(cx, 26, `STAGE ${round} COMPLETE`, {
      fontSize: '38px', color: '#ffcc00', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.creditsDisplay = this.add.text(cx, 66, `¥ ${this.credits} CREDITS`, {
      fontSize: '20px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const divG = this.add.graphics();
    divG.lineStyle(1, 0x224433, 1);
    divG.lineBetween(40, 84, GAME_WIDTH - 40, 84);

    // ── WEAPON SHOP SECTION ──
    this.add.text(cx, 98, '── WEAPON SHOP ──', {
      fontSize: '15px', color: '#ff8844', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, 116, 'Spend credits to arm up for the next stage', {
      fontSize: '11px', color: '#556644', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const buyableWeapons = WEAPONS.filter(w => !this.ownedWeaponIds.includes(w.id));
    const weaponCards: Phaser.GameObjects.Rectangle[] = [];

    // Weapon card geometry — up to 3 per row, 2 rows max
    const WEP_W = 174;
    const WEP_H = 100;
    const WEP_COLS = 3;
    const WEP_COL_GAP = 16;
    const WEP_ROW_GAP = 12;
    const WEP_ROW1_Y = 134 + WEP_H / 2;

    buyableWeapons.forEach((wep, i) => {
      const row = Math.floor(i / WEP_COLS);
      const col = i % WEP_COLS;
      const rowCount = Math.min(WEP_COLS, buyableWeapons.length - row * WEP_COLS);
      const rowTotalW = rowCount * WEP_W + (rowCount - 1) * WEP_COL_GAP;
      const rowStartX = (GAME_WIDTH - rowTotalW) / 2 + WEP_W / 2;
      const cardX = rowStartX + col * (WEP_W + WEP_COL_GAP);
      const cardY = WEP_ROW1_Y + row * (WEP_H + WEP_ROW_GAP);

      const canAfford = this.credits >= wep.cost;
      const strokeColor = canAfford ? 0xff8800 : 0x554422;

      const card = this.add.rectangle(cardX, cardY, WEP_W, WEP_H, 0x1a0e00)
        .setStrokeStyle(2, strokeColor);
      if (canAfford) card.setInteractive({ useHandCursor: true });
      weaponCards.push(card);

      this.add.text(cardX, cardY - 30, wep.label, {
        fontSize: '14px', color: canAfford ? '#ffaa44' : '#664422',
        fontFamily: 'Courier New', align: 'center', wordWrap: { width: WEP_W - 12 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY - 4, wep.desc, {
        fontSize: '11px', color: canAfford ? '#888888' : '#443322',
        fontFamily: 'Courier New', align: 'center', wordWrap: { width: WEP_W - 12 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY + 22, `¥ ${wep.cost}`, {
        fontSize: '14px', color: canAfford ? '#ffcc00' : '#664422',
        fontFamily: 'Courier New',
      }).setOrigin(0.5);

      if (canAfford) {
        card.on('pointerover', () => { if (this.selectedWeaponId !== wep.id) card.setStrokeStyle(3, 0xffcc44); });
        card.on('pointerout', () => { if (this.selectedWeaponId !== wep.id) card.setStrokeStyle(2, 0xff8800); });
        card.on('pointerdown', () => {
          if (this.selectedWeaponId === wep.id) {
            // Deselect
            this.selectedWeaponId = null;
            this.credits += wep.cost;
            this.creditsSpent -= wep.cost;
            card.setStrokeStyle(2, 0xff8800);
          } else {
            // Deselect previously selected weapon
            if (this.selectedWeaponId) {
              const prev = buyableWeapons.find(w => w.id === this.selectedWeaponId);
              if (prev) {
                this.credits += prev.cost;
                this.creditsSpent -= prev.cost;
                weaponCards[buyableWeapons.indexOf(prev)]?.setStrokeStyle(2, 0xff8800);
              }
            }
            this.selectedWeaponId = wep.id;
            this.credits -= wep.cost;
            this.creditsSpent += wep.cost;
            card.setStrokeStyle(3, 0xffff44);
          }
          this.creditsDisplay.setText(`¥ ${this.credits} CREDITS`);
        });
      }
    });

    if (buyableWeapons.length === 0) {
      this.add.text(cx, WEP_ROW1_Y, 'ALL WEAPONS UNLOCKED', {
        fontSize: '15px', color: '#446644', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    }

    // ── DEPLOY BUTTON ──
    const wepRows = Math.ceil(Math.max(buyableWeapons.length, 1) / WEP_COLS);
    const wepGridBottom = WEP_ROW1_Y + (wepRows - 1) * (WEP_H + WEP_ROW_GAP) + WEP_H / 2;
    const deployY = Math.min(wepGridBottom + 46, GAME_HEIGHT - 44);

    const deployBtn = this.add.text(cx, deployY, '[ DEPLOY TO NEXT STAGE ]', {
      fontSize: '22px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 24, y: 12 },
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    deployBtn.on('pointerover', () => deployBtn.setColor('#ffffff'));
    deployBtn.on('pointerout', () => deployBtn.setColor('#00ffcc'));
    deployBtn.on('pointerdown', () => this.deploy());
    this.input.keyboard!.once('keydown-ENTER', () => this.deploy());
    this.input.keyboard!.once('keydown-SPACE', () => this.deploy());

    this.add.text(cx, GAME_HEIGHT - 12, 'CLICK WEAPON TO BUY  •  ENTER TO DEPLOY  •  AUGMENTS FROM LEVEL-UPS', {
      fontSize: '10px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private deploy() {
    this.scene.stop('UpgradeScene');
    this.scene.resume('GameScene', {
      upgrade: null,
      newWeaponId: this.selectedWeaponId,
      creditsSpent: this.creditsSpent,
      nextRound: true,
    });
  }
}
