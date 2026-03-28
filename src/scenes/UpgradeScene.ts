import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WEAPONS, MAX_WEAPON_SLOTS } from '../config/GameConfig';

interface ShopData {
  round: number;
  score: number;
  credits: number;
  /** Ordered list of weapon IDs in each slot (null = empty) */
  weaponSlots: (string | null)[];
  /** Index of the currently active slot */
  activeSlotIndex: number;
}

/**
 * Displayed after completing a stage (hacking the exit node).
 * Shows the weapon shop so players can spend credits earned in the run.
 * Free upgrades/augmentations come from the XP-based level-up system (LevelUpScene).
 * Players can carry up to MAX_WEAPON_SLOTS (3) weapons; buying a new one fills
 * an empty slot, or — when all slots are full — replaces whichever slot the player
 * selects in the loadout section.
 */
export class UpgradeScene extends Phaser.Scene {
  private credits = 0;
  private creditsSpent = 0;
  private selectedWeaponId: string | null = null;
  private weaponSlots: (string | null)[] = [];
  private activeSlotIndex = 0;
  /** Index of the slot the player chose to replace (only relevant when all slots full) */
  private replaceSlotIndex = 0;
  private creditsDisplay!: Phaser.GameObjects.Text;
  /** Whether all weapon slots are occupied */
  private allSlotsFull = false;

  // Interactive slot UI elements (created once, updated on selection changes)
  private slotCards: Phaser.GameObjects.Rectangle[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotNote!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'UpgradeScene' }); }

  init(data: ShopData) {
    this.data.set('round', data.round);
    this.data.set('score', data.score);
    this.credits = data.credits;
    this.creditsSpent = 0;
    this.selectedWeaponId = null;
    this.weaponSlots = data.weaponSlots ?? ['pistol', null, null];
    this.activeSlotIndex = data.activeSlotIndex ?? 0;
    this.replaceSlotIndex = data.activeSlotIndex ?? 0;
    this.allSlotsFull = this.weaponSlots.every(s => s !== null);
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

    // ── CURRENT LOADOUT (interactive slot cards) ──
    this.add.text(cx, 94, '── CURRENT LOADOUT ──', {
      fontSize: '13px', color: '#44aa66', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.slotCards = [];
    this.slotLabels = [];

    const SLOT_W = 210;
    const SLOT_H = 26;
    const SLOT_GAP = 12;
    const totalSlotsW = MAX_WEAPON_SLOTS * SLOT_W + (MAX_WEAPON_SLOTS - 1) * SLOT_GAP;
    const slotsStartX = (GAME_WIDTH - totalSlotsW) / 2 + SLOT_W / 2;
    const slotsY = 115;

    for (let i = 0; i < MAX_WEAPON_SLOTS; i++) {
      const sx = slotsStartX + i * (SLOT_W + SLOT_GAP);
      const id = this.weaponSlots[i];
      const wep = id ? WEAPONS.find(w => w.id === id) : null;
      const active = i === this.activeSlotIndex ? '▶' : ' ';
      const label = `${active}[${i + 1}] ${wep ? wep.label : '--- EMPTY ---'}`;

      const card = this.add.rectangle(sx, slotsY, SLOT_W, SLOT_H, 0x0a1a14)
        .setStrokeStyle(1, 0x224433);
      this.slotCards.push(card);

      const txt = this.add.text(sx, slotsY, label, {
        fontSize: '11px', color: '#669966', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      this.slotLabels.push(txt);

      // Slot replacement interaction — only when all slots full and a weapon is selected
      if (this.allSlotsFull) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => {
          if (this.selectedWeaponId && this.replaceSlotIndex !== i) {
            card.setStrokeStyle(2, 0xffcc44);
          }
        });
        card.on('pointerout', () => {
          if (this.replaceSlotIndex !== i) {
            card.setStrokeStyle(1, 0x224433);
          }
        });
        card.on('pointerdown', () => {
          if (!this.selectedWeaponId) return; // only allow slot selection when a weapon is chosen
          this.replaceSlotIndex = i;
          this.refreshSlotHighlights();
        });
      }
    }

    // Slot replacement note
    const emptySlot = this.weaponSlots.findIndex(s => s === null);
    const noteText = this.allSlotsFull
      ? 'All slots full — click a slot above to choose which to replace'
      : `Empty slot [${emptySlot + 1}] available`;
    this.slotNote = this.add.text(cx, slotsY + 20, noteText, {
      fontSize: '10px', color: '#446655', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const divG2 = this.add.graphics();
    divG2.lineStyle(1, 0x224433, 1);
    divG2.lineBetween(40, 148, GAME_WIDTH - 40, 148);

    // ── WEAPON SHOP SECTION ──
    this.add.text(cx, 158, '── WEAPON SHOP ──', {
      fontSize: '15px', color: '#ff8844', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.add.text(cx, 176, 'Spend credits to arm up for the next stage', {
      fontSize: '11px', color: '#556644', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const ownedIds = this.weaponSlots.filter((id): id is string => id !== null);
    const buyableWeapons = WEAPONS.filter(w => !ownedIds.includes(w.id));
    const weaponCards: Phaser.GameObjects.Rectangle[] = [];

    // Weapon card geometry — up to 3 per row, 2 rows max
    const WEP_W = 174;
    const WEP_H = 96;
    const WEP_COLS = 3;
    const WEP_COL_GAP = 16;
    const WEP_ROW_GAP = 10;
    const WEP_ROW1_Y = 190 + WEP_H / 2;

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

      this.add.text(cardX, cardY - 28, wep.label, {
        fontSize: '14px', color: canAfford ? '#ffaa44' : '#664422',
        fontFamily: 'Courier New', align: 'center', wordWrap: { width: WEP_W - 12 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY - 4, wep.desc, {
        fontSize: '11px', color: canAfford ? '#888888' : '#443322',
        fontFamily: 'Courier New', align: 'center', wordWrap: { width: WEP_W - 12 },
      }).setOrigin(0.5);

      this.add.text(cardX, cardY + 20, `¥ ${wep.cost}`, {
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
          this.refreshSlotHighlights();
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

    this.add.text(cx, GAME_HEIGHT - 12,
      `CLICK WEAPON TO BUY  •  ENTER TO DEPLOY  •  MAX ${MAX_WEAPON_SLOTS} WEAPONS  •  AUGMENTS FROM LEVEL-UPS`, {
        fontSize: '10px', color: '#446655', fontFamily: 'Courier New',
      }).setOrigin(0.5);
  }

  /**
   * Update slot card highlights based on whether a weapon is selected and which
   * slot is targeted for replacement (when all slots are full).
   */
  private refreshSlotHighlights() {
    for (let i = 0; i < this.slotCards.length; i++) {
      const card = this.slotCards[i];
      const label = this.slotLabels[i];
      if (this.allSlotsFull && this.selectedWeaponId && i === this.replaceSlotIndex) {
        card.setStrokeStyle(2, 0xff4444);
        label.setColor('#ff6666');
      } else {
        card.setStrokeStyle(1, 0x224433);
        label.setColor('#669966');
      }
    }

    // Update slot note text
    if (this.allSlotsFull && this.selectedWeaponId) {
      const wep = this.weaponSlots[this.replaceSlotIndex];
      const wepCfg = wep ? WEAPONS.find(w => w.id === wep) : null;
      this.slotNote.setText(
        `Replacing slot [${this.replaceSlotIndex + 1}] ${wepCfg ? wepCfg.label : ''} — click another slot to change`
      );
      this.slotNote.setColor('#ff6666');
    } else if (this.allSlotsFull) {
      this.slotNote.setText('All slots full — click a slot above to choose which to replace');
      this.slotNote.setColor('#446655');
    }
  }

  private deploy() {
    this.scene.stop('UpgradeScene');
    this.scene.resume('GameScene', {
      upgrade: null,
      newWeaponId: this.selectedWeaponId,
      replaceSlotIndex: this.allSlotsFull ? this.replaceSlotIndex : undefined,
      creditsSpent: this.creditsSpent,
      nextRound: true,
    });
  }
}

