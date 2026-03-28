import Phaser from 'phaser';
import { HACK_RADIUS, HACK_TIME_MS, StatBoostType, STAT_BOOST_VALUES } from '../config/GameConfig';

export class HackNode extends Phaser.GameObjects.Container {
  hacked = false;
  hackProgress = 0;
  hackTimeMs: number;

  /** True if this node is the stage exit node */
  isFinalNode = false;
  /** True if this node is a mid-stage shop node (opens attachment shop on hack) */
  isShopNode = false;
  /** Stat boost this node grants when hacked (null for exit/shop nodes) */
  statBoostType: StatBoostType | null;
  statBoostValue: number;

  private ring!: Phaser.GameObjects.Arc;
  private core!: Phaser.GameObjects.Arc;
  private progressBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private glowTween!: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, isFinal = false, isShop = false) {
    super(scene, x, y);
    this.hackTimeMs = HACK_TIME_MS;
    this.isFinalNode = isFinal;
    this.isShopNode = isShop;

    // Assign random stat boost for regular nodes
    if (!isFinal && !isShop) {
      const types = Object.keys(STAT_BOOST_VALUES) as StatBoostType[];
      this.statBoostType = types[Math.floor(Math.random() * types.length)];
      this.statBoostValue = STAT_BOOST_VALUES[this.statBoostType];
    } else {
      this.statBoostType = null;
      this.statBoostValue = 0;
    }

    let ringColor: number;
    let ringStroke: number;
    let coreColor: number;
    let coreStroke: number;
    let labelText: string;
    let labelColor: string;

    if (isShop) {
      ringColor  = 0x1a0033;
      ringStroke = 0xcc44ff;
      coreColor  = 0x220044;
      coreStroke = 0xcc44ff;
      labelText  = '[SHOP]';
      labelColor = '#cc44ff';
    } else if (isFinal) {
      ringColor  = 0x443300;
      ringStroke = 0xffcc00;
      coreColor  = 0x332200;
      coreStroke = 0xffcc00;
      labelText  = '[EXIT]';
      labelColor = '#ffcc00';
    } else {
      ringColor  = 0x004433;
      ringStroke = 0x00ff88;
      coreColor  = 0x003322;
      coreStroke = 0x00ff88;
      labelText  = '[NODE]';
      labelColor = '#00ff88';
    }

    this.ring = scene.add.arc(0, 0, HACK_RADIUS, 0, 360, false, ringColor, 0.25);
    this.ring.setStrokeStyle(1, ringStroke, 0.5);

    this.core = scene.add.arc(0, 0, isFinal ? 20 : 16, 0, 360, false, coreColor, 1);
    this.core.setStrokeStyle(2, coreStroke, 1);

    this.label = scene.add.text(0, -30, labelText, {
      fontSize: '11px', color: labelColor, fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.progressBar = scene.add.graphics();

    const children: Phaser.GameObjects.GameObject[] = [this.ring, this.core, this.progressBar, this.label];

    if (!isFinal && !isShop && this.statBoostType) {
      const boostLabels: Record<StatBoostType, string> = {
        speed: '+SPD', damage: '+DMG', projectile: '+PRJ',
      };
      const boostLabel = scene.add.text(0, -42, boostLabels[this.statBoostType], {
        fontSize: '9px', color: '#888888', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      children.push(boostLabel);
    }

    if (isShop) {
      const shopSub = scene.add.text(0, -42, 'ATTACHMENTS', {
        fontSize: '9px', color: '#aa44cc', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      children.push(shopSub);
    }

    this.add(children);
    scene.add.existing(this);

    this.glowTween = scene.tweens.add({
      targets: this.core,
      scaleX: 1.2, scaleY: 1.2,
      duration: isFinal ? 500 : isShop ? 400 : 800,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  updateHack(delta: number, playerInRange: boolean, hackKeyDown: boolean) {
    if (this.hacked) return;
    if (playerInRange && hackKeyDown) {
      this.hackProgress += delta / this.hackTimeMs;
      if (this.hackProgress >= 1) {
        this.hackProgress = 1;
        this.markHacked();
      }
    } else {
      this.hackProgress = Math.max(0, this.hackProgress - (delta / this.hackTimeMs) * 0.5);
    }
    this.drawProgress();
  }

  private drawProgress() {
    this.progressBar.clear();
    if (this.hackProgress <= 0) return;
    const r = 22;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + this.hackProgress * Math.PI * 2;
    const color = this.isFinalNode ? 0xffcc00 : this.isShopNode ? 0xcc44ff : 0x00ffcc;
    this.progressBar.lineStyle(4, color, 1);
    this.progressBar.beginPath();
    this.progressBar.arc(0, 0, r, startAngle, endAngle, false);
    this.progressBar.strokePath();
  }

  private markHacked() {
    this.hacked = true;
    this.glowTween.stop();
    const doneColor = this.isFinalNode ? 0xffcc00 : this.isShopNode ? 0xcc44ff : 0x00ff88;
    this.core.setFillStyle(doneColor);
    this.core.setStrokeStyle(2, 0xffffff, 1);
    this.label.setText(this.isFinalNode ? '[EXITED]' : this.isShopNode ? '[OPEN]' : '[OWNED]');
    this.label.setColor('#ffffff');
  }


  isPlayerInRange(px: number, py: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < HACK_RADIUS;
  }
}

