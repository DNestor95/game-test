import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADES, WEAPONS, Upgrade, WeaponConfig } from '../config/GameConfig';

interface ShopData {
  round: number;
  score: number;
  credits: number;
  ownedWeaponIds: string[];
}

export class UpgradeScene extends Phaser.Scene {
  private credits = 0;
  private creditsSpent = 0;
  private selectedUpgrade: Upgrade | null = null;
  private selectedWeaponId: string | null = null;
  private ownedWeaponIds: string[] = [];
  private creditsDisplay!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'UpgradeScene' }); }

  init(data: ShopData) {
    this.data.set('round', data.round);
    this.data.set('score', data.score);
    this.credits = data.credits;
    this.creditsSpent = 0;
    this.selectedUpgrade = null;
    this.selectedWeaponId = null;
    this.ownedWeaponIds = data.ownedWeaponIds ?? ['pistol'];
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const round = this.data.get('round') as number;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.92);

    this.add.text(cx, 30, `STAGE ${round} COMPLETE`, {
      fontSize: '32px', color: '#ffcc00', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Credits display
    this.creditsDisplay = this.add.text(cx, 68, `¥ ${this.credits} CREDITS`, {
      fontSize: '16px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // ── FREE AUGMENT SECTION ──
    this.add.text(cx, 100, '── FREE AUGMENT ──', {
      fontSize: '13px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const pool = Phaser.Utils.Array.Shuffle([...UPGRADES]).slice(0, 3) as Upgrade[];
    const upgradeCards: Phaser.GameObjects.Rectangle[] = [];

    pool.forEach((upgrade, i) => {
      const cardX = 145 + i * 170;
      const cardY = 165;
      const card = this.add.rectangle(cardX, cardY, 155, 90, 0x001a11)
        .setStrokeStyle(2, 0x00ff88)
        .setInteractive({ useHandCursor: true });
      upgradeCards.push(card);

      this.add.text(cardX, cardY - 22, upgrade.label, {
        fontSize: '13px', color: '#00ffcc', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 140 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY + 12, upgrade.desc, {
        fontSize: '11px', color: '#888888', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 140 },
      }).setOrigin(0.5);

      card.on('pointerover', () => { if (this.selectedUpgrade?.id !== upgrade.id) card.setStrokeStyle(3, 0x00ffff); });
      card.on('pointerout', () => { if (this.selectedUpgrade?.id !== upgrade.id) card.setStrokeStyle(2, 0x00ff88); });
      card.on('pointerdown', () => {
        this.selectedUpgrade = upgrade;
        upgradeCards.forEach((c, j) => {
          c.setStrokeStyle(j === i ? 3 : 2, j === i ? 0xffffff : 0x00ff88);
        });
      });
      this.input.keyboard!.once(`keydown-${i + 1}`, () => {
        this.selectedUpgrade = upgrade;
        upgradeCards.forEach((c, j) => {
          c.setStrokeStyle(j === i ? 3 : 2, j === i ? 0xffffff : 0x00ff88);
        });
      });
    });

    // ── WEAPON SHOP SECTION ──
    this.add.text(cx, 222, '── WEAPON SHOP ──', {
      fontSize: '13px', color: '#ff8844', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const buyableWeapons = WEAPONS.filter(w => !this.ownedWeaponIds.includes(w.id));
    const weaponCards: Phaser.GameObjects.Rectangle[] = [];

    buyableWeapons.forEach((wep, i) => {
      const cardX = 120 + i * 180;
      const cardY = 305;
      const canAfford = this.credits >= wep.cost;
      const strokeColor = canAfford ? 0xff8800 : 0x554422;

      const card = this.add.rectangle(cardX, cardY, 165, 110, 0x1a0e00)
        .setStrokeStyle(2, strokeColor);
      if (canAfford) card.setInteractive({ useHandCursor: true });
      weaponCards.push(card);

      this.add.text(cardX, cardY - 32, wep.label, {
        fontSize: '13px', color: canAfford ? '#ffaa44' : '#664422', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 155 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY - 4, wep.desc, {
        fontSize: '10px', color: canAfford ? '#888888' : '#443322', fontFamily: 'Courier New', align: 'center', wordWrap: { width: 155 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY + 22, `¥ ${wep.cost}`, {
        fontSize: '13px', color: canAfford ? '#ffcc00' : '#664422', fontFamily: 'Courier New',
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
            // Deselect previous weapon if any
            if (this.selectedWeaponId) {
              const prev = buyableWeapons.find(w => w.id === this.selectedWeaponId);
              if (prev) {
                this.credits += prev.cost;
                this.creditsSpent -= prev.cost;
                const prevIdx = buyableWeapons.indexOf(prev);
                weaponCards[prevIdx]?.setStrokeStyle(2, 0xff8800);
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
      this.add.text(cx, 305, 'ALL WEAPONS UNLOCKED', {
        fontSize: '13px', color: '#446644', fontFamily: 'Courier New',
      }).setOrigin(0.5);
    }

    // ── DEPLOY BUTTON ──
    const deployBtn = this.add.text(cx, GAME_HEIGHT - 50, '[ DEPLOY TO NEXT STAGE ]', {
      fontSize: '20px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 20, y: 10 },
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    deployBtn.on('pointerover', () => deployBtn.setColor('#ffffff'));
    deployBtn.on('pointerout', () => deployBtn.setColor('#00ffcc'));
    deployBtn.on('pointerdown', () => this.deploy());
    this.input.keyboard!.once('keydown-ENTER', () => this.deploy());
    this.input.keyboard!.once('keydown-SPACE', () => this.deploy());

    this.add.text(cx, GAME_HEIGHT - 22, 'CLICK AUGMENT TO SELECT • CLICK WEAPON TO BUY • ENTER TO DEPLOY', {
      fontSize: '9px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private deploy() {
    this.scene.stop('UpgradeScene');
    this.scene.resume('GameScene', {
      upgrade: this.selectedUpgrade,
      newWeaponId: this.selectedWeaponId,
      creditsSpent: this.creditsSpent,
    });
  }
}

