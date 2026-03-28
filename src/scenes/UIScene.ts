import Phaser from 'phaser';
import { GAME_WIDTH, PLAYER_MAX_HP } from '../config/GameConfig';

/** Per-slot weapon info for the HUD display */
export interface WeaponSlotHUD {
  label: string;
  magRemaining: number;
  magSize: number;
  isReloading: boolean;
  reloadFrac: number;
}

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private creditsText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private heatBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private comboText!: Phaser.GameObjects.Text;
  private nodesText!: Phaser.GameObjects.Text;
  private dashText!: Phaser.GameObjects.Text;
  private weaponSlotTexts!: Phaser.GameObjects.Text[];
  private weaponSlotBgs!: Phaser.GameObjects.Rectangle[];
  private exitText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'UIScene' }); }

  create() {
    // Top bar
    this.add.rectangle(GAME_WIDTH / 2, 20, GAME_WIDTH, 40, 0x000000, 0.7);

    this.scoreText = this.add.text(10, 8, 'SCORE: 0', {
      fontSize: '13px', color: '#00ffcc', fontFamily: 'Courier New',
    });

    this.creditsText = this.add.text(10, 23, '¥ 0', {
      fontSize: '11px', color: '#ffcc00', fontFamily: 'Courier New',
    });

    this.roundText = this.add.text(GAME_WIDTH / 2, 8, 'ROUND 1', {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(GAME_WIDTH - 10, 8, 'TIME: 35', {
      fontSize: '14px', color: '#ff8800', fontFamily: 'Courier New',
    }).setOrigin(1, 0);

    // Bottom bar (taller to accommodate 3 weapon slots)
    this.add.rectangle(GAME_WIDTH / 2, 576, GAME_WIDTH, 48, 0x000000, 0.7);

    this.add.text(10, 564, 'HP', {
      fontSize: '11px', color: '#ff4444', fontFamily: 'Courier New',
    });
    this.hpBar = this.add.graphics();

    this.add.text(200, 564, 'HEAT', {
      fontSize: '11px', color: '#ff6600', fontFamily: 'Courier New',
    });
    this.heatBar = this.add.graphics();

    this.comboText = this.add.text(GAME_WIDTH / 2, 564, '', {
      fontSize: '13px', color: '#00ffcc', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0);

    this.nodesText = this.add.text(GAME_WIDTH - 10, 564, 'NODES: 0/4', {
      fontSize: '12px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(1, 0);

    // Dash cooldown indicator
    this.dashText = this.add.text(GAME_WIDTH / 2, 42, '', {
      fontSize: '11px', color: '#888888', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0);

    // 3 weapon-slot displays in the lower strip (y≈584)
    const SLOT_W = Math.floor(GAME_WIDTH / 3);
    this.weaponSlotBgs = [];
    this.weaponSlotTexts = [];
    for (let i = 0; i < 3; i++) {
      const slotX = i * SLOT_W;
      const bg = this.add.rectangle(slotX + SLOT_W / 2, 585, SLOT_W - 4, 20, 0x111122)
        .setStrokeStyle(1, 0x223344);
      this.weaponSlotBgs.push(bg);
      const t = this.add.text(slotX + 6, 577, `[${i + 1}] ---`, {
        fontSize: '10px', color: '#445566', fontFamily: 'Courier New',
      });
      this.weaponSlotTexts.push(t);
    }

    // Exit node status indicator
    this.exitText = this.add.text(GAME_WIDTH - 10, 552, '', {
      fontSize: '11px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(1, 0);

    // XP bar (just above the bottom bar) — label "LVL" + level number on the right side
    this.levelText = this.add.text(GAME_WIDTH - 10, 551, 'LVL 1', {
      fontSize: '11px', color: '#00aaff', fontFamily: 'Courier New',
    }).setOrigin(1, 1);
    this.xpBar = this.add.graphics();
  }

  updateHUD(data: {
    score: number;
    credits: number;
    round: number;
    timerSec: number;
    bonusMode: boolean;
    hp: number;
    heat: number;
    combo: number;
    nodesHacked: number;
    nodesTotal: number;
    dashCooldownFrac: number;
    exitHacked: boolean;
    playerLevel: number;
    xp: number;
    xpToNext: number;
    weaponSlots: (WeaponSlotHUD | null)[];
    activeSlotIndex: number;
  }) {
    this.scoreText.setText(`SCORE: ${data.score}`);
    this.creditsText.setText(`¥ ${data.credits}`);
    this.roundText.setText(`ROUND ${data.round}`);
    if (data.bonusMode) {
      this.timerText.setText('OVERTIME!');
      this.timerText.setColor('#ff4400');
    } else {
      this.timerText.setText(`TIME: ${Math.ceil(data.timerSec)}`);
      const timerColor = data.timerSec < 10 ? '#ff2200' : '#ff8800';
      this.timerText.setColor(timerColor);
    }

    this.hpBar.clear();
    const hpFrac = Math.max(0, data.hp / PLAYER_MAX_HP);
    const hpColor = hpFrac > 0.5 ? 0x00cc44 : hpFrac > 0.25 ? 0xffcc00 : 0xff2200;
    this.hpBar.fillStyle(0x333333);
    this.hpBar.fillRect(28, 566, 140, 10);
    this.hpBar.fillStyle(hpColor);
    this.hpBar.fillRect(28, 566, Math.floor(140 * hpFrac), 10);

    this.heatBar.clear();
    const heatFrac = Math.min(1, Math.max(0, data.heat));
    this.heatBar.fillStyle(0x333333);
    this.heatBar.fillRect(235, 566, 130, 10);
    const heatColor = heatFrac > 0.7 ? 0xff2200 : heatFrac > 0.4 ? 0xff6600 : 0xff9900;
    this.heatBar.fillStyle(heatColor);
    this.heatBar.fillRect(235, 566, Math.floor(130 * heatFrac), 10);

    if (data.combo > 0) {
      this.comboText.setText(`COMBO x${data.combo + 1}`);
      this.comboText.setColor(data.combo >= 5 ? '#ffcc00' : '#00ffcc');
    } else {
      this.comboText.setText('');
    }

    this.nodesText.setText(`NODES: ${data.nodesHacked}/${data.nodesTotal}`);

    if (data.dashCooldownFrac > 0) {
      this.dashText.setText(`DASH: ${Math.ceil(data.dashCooldownFrac * 100)}%`);
      this.dashText.setColor('#888888');
    } else {
      this.dashText.setText('DASH READY');
      this.dashText.setColor('#00ffcc');
    }

    // Update 3 weapon-slot displays
    const SLOT_W = Math.floor(GAME_WIDTH / 3);
    for (let i = 0; i < 3; i++) {
      const slot = data.weaponSlots[i];
      const isActive = i === data.activeSlotIndex;
      const bg = this.weaponSlotBgs[i];
      const t = this.weaponSlotTexts[i];
      if (!slot) {
        bg.setStrokeStyle(1, 0x223344).setFillStyle(0x111122);
        t.setText(`[${i + 1}] ---`);
        t.setColor('#334455');
      } else if (slot.isReloading) {
        const pct = Math.ceil(slot.reloadFrac * 100);
        bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0xff8844 : 0x553322).setFillStyle(isActive ? 0x221100 : 0x110800);
        t.setText(`[${i + 1}] ${slot.label}  RELOAD ${pct}%`);
        t.setColor(isActive ? '#ff8844' : '#775533');
      } else {
        const low = slot.magRemaining <= Math.ceil(slot.magSize * 0.25);
        bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0x00ffcc : 0x223344).setFillStyle(isActive ? 0x001a11 : 0x111122);
        t.setText(`[${i + 1}] ${slot.label}  ${slot.magRemaining}/${slot.magSize}`);
        t.setColor(isActive ? (low ? '#ff4444' : '#00ffcc') : '#446655');
      }
      // Position text within the slot
      t.setX(i * SLOT_W + 6);
    }

    if (data.exitHacked) {
      this.exitText.setText('');
    } else {
      this.exitText.setText('[EXIT NODE: FIND IT]');
    }

    // XP bar — drawn just above the bottom bar (y ≈ 549)
    this.xpBar.clear();
    const xpFrac = data.xpToNext > 0 ? Math.min(1, data.xp / data.xpToNext) : 0;
    const XP_X = 390;
    const XP_W = 180;
    this.xpBar.fillStyle(0x222244);
    this.xpBar.fillRect(XP_X, 550, XP_W, 8);
    this.xpBar.fillStyle(0x0088ff);
    this.xpBar.fillRect(XP_X, 550, Math.floor(XP_W * xpFrac), 8);
    this.levelText.setText(`LVL ${data.playerLevel}`);
  }

  showMessage(text: string, color = '#ffffff', duration = 2000) {
    const msg = this.add.text(GAME_WIDTH / 2, 300, text, {
      fontSize: '28px', color, fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.time.delayedCall(duration, () => msg.destroy());
  }
}

