import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WEAPONS, ATTACHMENTS, AttachmentConfig, WeaponConfig } from '../config/GameConfig';

interface ShopNodeData {
  credits: number;
  weaponSlots: (string | null)[];
  /** Map of weaponId → attachment ids already equipped */
  equippedAttachments: Record<string, string[]>;
}

interface PurchasedAttachment {
  weaponId: string;
  attachmentId: string;
}

const MAX_ATTACHMENTS_PER_WEAPON = 2;

/**
 * Mid-game attachment shop opened by hacking a special shop node.
 * Players select one of their equipped weapons, then buy an attachment for it.
 * Multiple attachments can be purchased in a single shop visit.
 */
export class AttachmentShopScene extends Phaser.Scene {
  private credits = 0;
  private creditsSpent = 0;
  private weaponSlots: (string | null)[] = [];
  private equippedAttachments: Record<string, string[]> = {};
  /** Weapon selected for attaching */
  private selectedWeaponId: string | null = null;
  private purchased: PurchasedAttachment[] = [];

  private creditsDisplay!: Phaser.GameObjects.Text;
  private attachmentGrid!: Phaser.GameObjects.Container;
  private weaponButtons: Phaser.GameObjects.Rectangle[] = [];
  private weaponButtonTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'AttachmentShopScene' }); }

  init(data: ShopNodeData) {
    this.credits = data.credits;
    this.creditsSpent = 0;
    this.weaponSlots = data.weaponSlots ?? [];
    this.equippedAttachments = data.equippedAttachments ?? {};
    this.selectedWeaponId = null;
    this.purchased = [];
    // Pre-select first available weapon
    const first = this.weaponSlots.find(id => id !== null);
    if (first) this.selectedWeaponId = first;
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Dark overlay
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.93);

    // Header
    this.add.text(cx, 26, '⚙ ATTACHMENT SHOP ⚙', {
      fontSize: '32px', color: '#cc44ff', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.creditsDisplay = this.add.text(cx, 64, `¥ ${this.credits} CREDITS`, {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    const divG = this.add.graphics();
    divG.lineStyle(1, 0x442266, 1);
    divG.lineBetween(40, 80, GAME_WIDTH - 40, 80);

    // Weapon selector row
    this.add.text(cx, 92, '— SELECT WEAPON TO UPGRADE —', {
      fontSize: '13px', color: '#aa44cc', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.buildWeaponButtons();

    // Divider
    const div2 = this.add.graphics();
    div2.lineStyle(1, 0x442266, 1);
    div2.lineBetween(40, 166, GAME_WIDTH - 40, 166);

    this.add.text(cx, 178, '— AVAILABLE ATTACHMENTS —', {
      fontSize: '13px', color: '#aa44cc', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // Attachment grid (built fresh each time selection changes)
    this.attachmentGrid = this.add.container(0, 0);
    this.buildAttachmentGrid();

    // Close / deploy button
    const closeBtn = this.add.text(cx, GAME_HEIGHT - 36, '[ CLOSE SHOP ]', {
      fontSize: '22px', color: '#00ffcc', fontFamily: 'Courier New',
      backgroundColor: '#001a11', padding: { x: 24, y: 10 },
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#00ffcc'));
    closeBtn.on('pointerdown', () => this.closeShop());
    this.input.keyboard!.once('keydown-ENTER', () => this.closeShop());
    this.input.keyboard!.once('keydown-SPACE', () => this.closeShop());
    this.input.keyboard!.once('keydown-ESC',   () => this.closeShop());

    this.add.text(cx, GAME_HEIGHT - 14, 'CLICK ATTACHMENT TO BUY  •  MAX 2 PER WEAPON  •  ESC / ENTER TO CLOSE', {
      fontSize: '10px', color: '#554466', fontFamily: 'Courier New',
    }).setOrigin(0.5);
  }

  private buildWeaponButtons() {
    // Destroy old buttons if any
    this.weaponButtons.forEach(b => b.destroy());
    this.weaponButtonTexts.forEach(t => t.destroy());
    this.weaponButtons = [];
    this.weaponButtonTexts = [];

    const ownedWeapons = this.weaponSlots.filter((id): id is string => id !== null);
    const BTN_W = 200;
    const BTN_H = 44;
    const BTN_GAP = 12;
    const totalW = ownedWeapons.length * BTN_W + (ownedWeapons.length - 1) * BTN_GAP;
    const startX = (GAME_WIDTH - totalW) / 2 + BTN_W / 2;
    const btnY = 130;

    ownedWeapons.forEach((weaponId, i) => {
      const weaponCfg = WEAPONS.find(w => w.id === weaponId);
      if (!weaponCfg) return;
      const isSelected = this.selectedWeaponId === weaponId;
      const equippedCount = (this.equippedAttachments[weaponId] ?? []).length;
      const atLimit = equippedCount >= MAX_ATTACHMENTS_PER_WEAPON;

      const strokeColor = isSelected ? 0xcc44ff : 0x553366;
      const btn = this.add.rectangle(startX + i * (BTN_W + BTN_GAP), btnY, BTN_W, BTN_H, 0x1a0033)
        .setStrokeStyle(isSelected ? 3 : 1, strokeColor)
        .setInteractive({ useHandCursor: true });
      this.weaponButtons.push(btn);

      const slotNum = this.weaponSlots.indexOf(weaponId) + 1;
      const attLabel = atLimit ? '⚠ FULL' : `${equippedCount}/${MAX_ATTACHMENTS_PER_WEAPON} attach.`;
      const t = this.add.text(
        startX + i * (BTN_W + BTN_GAP), btnY,
        `[${slotNum}] ${weaponCfg.label}\n${attLabel}`,
        { fontSize: '11px', color: isSelected ? '#cc44ff' : '#886699', fontFamily: 'Courier New', align: 'center' },
      ).setOrigin(0.5);
      this.weaponButtonTexts.push(t);

      btn.on('pointerover', () => { if (this.selectedWeaponId !== weaponId) btn.setStrokeStyle(2, 0x9944bb); });
      btn.on('pointerout',  () => { if (this.selectedWeaponId !== weaponId) btn.setStrokeStyle(1, 0x553366); });
      btn.on('pointerdown', () => {
        this.selectedWeaponId = weaponId;
        this.buildWeaponButtons();
        this.buildAttachmentGrid();
      });
    });
  }

  private buildAttachmentGrid() {
    this.attachmentGrid.removeAll(true);

    const cx = GAME_WIDTH / 2;
    const selectedWeapon = this.selectedWeaponId
      ? WEAPONS.find(w => w.id === this.selectedWeaponId)
      : null;
    const equippedIds = this.selectedWeaponId
      ? (this.equippedAttachments[this.selectedWeaponId] ?? [])
      : [];
    const atLimit = equippedIds.length >= MAX_ATTACHMENTS_PER_WEAPON;

    if (!selectedWeapon) {
      const msg = this.attachmentGrid.scene.add.text(cx, 280, 'Select a weapon above', {
        fontSize: '14px', color: '#556655', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      this.attachmentGrid.add(msg);
      return;
    }

    // Filter attachments: compatible with selected weapon and not yet equipped
    const available = ATTACHMENTS.filter(att => {
      if (equippedIds.includes(att.id)) return false;
      if (att.weaponFilter && !att.weaponFilter.includes(selectedWeapon.id)) return false;
      return true;
    });

    if (available.length === 0) {
      const msg = this.attachmentGrid.scene.add.text(cx, 280,
        atLimit ? 'WEAPON ATTACHMENT LIMIT REACHED' : 'NO COMPATIBLE ATTACHMENTS',
        { fontSize: '14px', color: '#554422', fontFamily: 'Courier New' },
      ).setOrigin(0.5);
      this.attachmentGrid.add(msg);
      return;
    }

    const CARD_W = 168;
    const CARD_H = 88;
    const COLS = 4;
    const COL_GAP = 12;
    const ROW_GAP = 10;
    const GRID_Y = 196;

    available.forEach((att, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const rowCount = Math.min(COLS, available.length - row * COLS);
      const rowW = rowCount * CARD_W + (rowCount - 1) * COL_GAP;
      const rowStartX = (GAME_WIDTH - rowW) / 2 + CARD_W / 2;
      const cardX = rowStartX + col * (CARD_W + COL_GAP);
      const cardY = GRID_Y + row * (CARD_H + ROW_GAP) + CARD_H / 2;

      const canAfford = !atLimit && this.credits >= att.cost;
      const strokeColor = canAfford ? 0x9944cc : 0x443355;

      const card = this.attachmentGrid.scene.add.rectangle(cardX, cardY, CARD_W, CARD_H, 0x110022)
        .setStrokeStyle(2, strokeColor);
      if (canAfford) card.setInteractive({ useHandCursor: true });
      this.attachmentGrid.add(card);

      const lbl = this.attachmentGrid.scene.add.text(cardX, cardY - 22, att.label, {
        fontSize: '12px', color: canAfford ? '#cc44ff' : '#553366',
        fontFamily: 'Courier New', align: 'center',
      }).setOrigin(0.5);
      this.attachmentGrid.add(lbl);

      const desc = this.attachmentGrid.scene.add.text(cardX, cardY + 1, att.desc, {
        fontSize: '10px', color: canAfford ? '#888888' : '#443355',
        fontFamily: 'Courier New', align: 'center', wordWrap: { width: CARD_W - 10 },
      }).setOrigin(0.5);
      this.attachmentGrid.add(desc);

      const cost = this.attachmentGrid.scene.add.text(cardX, cardY + 26, `¥ ${att.cost}`, {
        fontSize: '12px', color: canAfford ? '#ffcc00' : '#553300',
        fontFamily: 'Courier New',
      }).setOrigin(0.5);
      this.attachmentGrid.add(cost);

      if (canAfford) {
        card.on('pointerover', () => card.setStrokeStyle(3, 0xee66ff));
        card.on('pointerout',  () => card.setStrokeStyle(2, 0x9944cc));
        card.on('pointerdown', () => this.buyAttachment(att, selectedWeapon));
      }
    });

    if (atLimit) {
      const msg = this.attachmentGrid.scene.add.text(
        cx,
        GRID_Y + Math.ceil(available.length / COLS) * (CARD_H + ROW_GAP) + CARD_H / 2 + 10,
        '⚠ ATTACHMENT LIMIT REACHED FOR THIS WEAPON',
        { fontSize: '11px', color: '#cc4400', fontFamily: 'Courier New' },
      ).setOrigin(0.5);
      this.attachmentGrid.add(msg);
    }
  }

  private buyAttachment(att: AttachmentConfig, weapon: WeaponConfig) {
    if (this.credits < att.cost) return;
    const equippedIds = this.equippedAttachments[weapon.id] ?? [];
    if (equippedIds.length >= MAX_ATTACHMENTS_PER_WEAPON) return;

    this.credits -= att.cost;
    this.creditsSpent += att.cost;
    if (!this.equippedAttachments[weapon.id]) this.equippedAttachments[weapon.id] = [];
    this.equippedAttachments[weapon.id].push(att.id);
    this.purchased.push({ weaponId: weapon.id, attachmentId: att.id });

    this.creditsDisplay.setText(`¥ ${this.credits} CREDITS`);

    // Flash confirmation
    const flash = this.add.text(GAME_WIDTH / 2, 150, `✓ ${att.label} INSTALLED`, {
      fontSize: '16px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(99);
    this.tweens.add({ targets: flash, y: 130, alpha: 0, duration: 1200, onComplete: () => flash.destroy() });

    // Rebuild grid and weapon buttons to reflect new state
    this.buildWeaponButtons();
    this.buildAttachmentGrid();
  }

  private closeShop() {
    this.scene.stop('AttachmentShopScene');
    this.scene.resume('GameScene', {
      upgrade: null,
      newWeaponId: null,
      newAttachments: this.purchased,
      creditsSpent: this.creditsSpent,
      nextRound: false,
    });
  }
}
