import Phaser from 'phaser';
import { HACK_RADIUS, HACK_TIME_MS } from '../config/GameConfig';

export class HackNode extends Phaser.GameObjects.Container {
  hacked = false;
  hackProgress = 0;
  hackTimeMs: number;

  private ring!: Phaser.GameObjects.Arc;
  private core!: Phaser.GameObjects.Arc;
  private progressBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private glowTween!: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.hackTimeMs = HACK_TIME_MS;

    this.ring = scene.add.arc(0, 0, HACK_RADIUS, 0, 360, false, 0x004433, 0.25);
    this.ring.setStrokeStyle(1, 0x00ff88, 0.4);

    this.core = scene.add.arc(0, 0, 16, 0, 360, false, 0x003322, 1);
    this.core.setStrokeStyle(2, 0x00ff88, 1);

    this.label = scene.add.text(0, -28, '[NODE]', {
      fontSize: '11px', color: '#00ff88', fontFamily: 'Courier New',
    }).setOrigin(0.5);

    this.progressBar = scene.add.graphics();
    this.add([this.ring, this.core, this.progressBar, this.label]);
    scene.add.existing(this);

    this.glowTween = scene.tweens.add({
      targets: this.core,
      scaleX: 1.2, scaleY: 1.2,
      duration: 800,
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
    this.progressBar.lineStyle(4, 0x00ffcc, 1);
    this.progressBar.beginPath();
    this.progressBar.arc(0, 0, r, startAngle, endAngle, false);
    this.progressBar.strokePath();
  }

  private markHacked() {
    this.hacked = true;
    this.glowTween.stop();
    this.core.setFillStyle(0x00ff88);
    this.core.setStrokeStyle(2, 0xffffff, 1);
    this.label.setText('[OWNED]');
    this.label.setColor('#ffffff');
  }

  isPlayerInRange(px: number, py: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < HACK_RADIUS;
  }
}
