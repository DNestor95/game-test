import Phaser from 'phaser';
import { HACK_RADIUS, HACK_TIME_MS, StatBoostType, STAT_BOOST_VALUES } from '../config/GameConfig';

export class HackNode extends Phaser.GameObjects.Container {
  hacked = false;
  hackProgress = 0;
  hackTimeMs: number;

  /** True if this node is the stage exit node */
  isFinalNode = false;
  /** Stat boost this node grants when hacked (null for exit node — they give money instead) */
  statBoostType: StatBoostType | null;
  statBoostValue: number;

  private ring!: Phaser.GameObjects.Arc;
  private core!: Phaser.GameObjects.Arc;
  private progressBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private glowTween!: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, isFinal = false) {
    super(scene, x, y);
    this.hackTimeMs = HACK_TIME_MS;
    this.isFinalNode = isFinal;

    // Assign random stat boost for regular nodes
    if (!isFinal) {
      const types = Object.keys(STAT_BOOST_VALUES) as StatBoostType[];
      this.statBoostType = types[Math.floor(Math.random() * types.length)];
      this.statBoostValue = STAT_BOOST_VALUES[this.statBoostType];
    } else {
      this.statBoostType = null;
      this.statBoostValue = 0;
    }

    const ringColor = isFinal ? 0x443300 : 0x004433;
    const ringStroke = isFinal ? 0xffcc00 : 0x00ff88;
    const coreColor = isFinal ? 0x332200 : 0x003322;
    const coreStroke = isFinal ? 0xffcc00 : 0x00ff88;
    const labelText = isFinal ? '[EXIT]' : '[NODE]';
    const labelColor = isFinal ? '#ffcc00' : '#00ff88';

    this.ring = scene.add.arc(0, 0, HACK_RADIUS, 0, 360, false, ringColor, 0.25);
    this.ring.setStrokeStyle(1, ringStroke, 0.5);

    this.core = scene.add.arc(0, 0, isFinal ? 20 : 16, 0, 360, false, coreColor, 1);
    this.core.setStrokeStyle(2, coreStroke, 1);

    this.label = scene.add.text(0, -30, labelText, {
      fontSize: '11px', color: labelColor, fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.progressBar = scene.add.graphics();

    const children: Phaser.GameObjects.GameObject[] = [this.ring, this.core, this.progressBar, this.label];

    if (!isFinal && this.statBoostType) {
      const boostLabels: Record<StatBoostType, string> = {
        speed: '+SPD', damage: '+DMG', projectile: '+PRJ',
      };
      const boostLabel = scene.add.text(0, -42, boostLabels[this.statBoostType], {
        fontSize: '9px', color: '#888888', fontFamily: 'Courier New',
      }).setOrigin(0.5);
      children.push(boostLabel);
    }

    this.add(children);
    scene.add.existing(this);

    this.glowTween = scene.tweens.add({
      targets: this.core,
      scaleX: 1.2, scaleY: 1.2,
      duration: isFinal ? 500 : 800,
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
    const color = this.isFinalNode ? 0xffcc00 : 0x00ffcc;
    this.progressBar.lineStyle(4, color, 1);
    this.progressBar.beginPath();
    this.progressBar.arc(0, 0, r, startAngle, endAngle, false);
    this.progressBar.strokePath();
  }

  private markHacked() {
    this.hacked = true;
    this.glowTween.stop();
    const doneColor = this.isFinalNode ? 0xffcc00 : 0x00ff88;
    this.core.setFillStyle(doneColor);
    this.core.setStrokeStyle(2, 0xffffff, 1);
    this.label.setText(this.isFinalNode ? '[EXITED]' : '[OWNED]');
    this.label.setColor('#ffffff');
  }

  isPlayerInRange(px: number, py: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < HACK_RADIUS;
  }
}

