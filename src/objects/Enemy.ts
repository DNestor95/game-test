import Phaser from 'phaser';
import { ENEMY_BASE_SPEED, ENEMY_DAMAGE, ENEMY_HIT_COOLDOWN } from '../config/GameConfig';

export class Enemy extends Phaser.GameObjects.Container {
  private body_!: Phaser.Physics.Arcade.Body;
  private core!: Phaser.GameObjects.Arc;
  private eye!: Phaser.GameObjects.Arc;
  speed: number;
  private hitCooldown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speedMult = 1) {
    super(scene, x, y);
    this.speed = ENEMY_BASE_SPEED * speedMult;
    this.build();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body_ = this.body as Phaser.Physics.Arcade.Body;
    this.body_.setCircle(14, -14, -14);
  }

  private build() {
    this.core = this.scene.add.arc(0, 0, 14, 0, 360, false, 0x220000, 1);
    this.core.setStrokeStyle(2, 0xff2200, 1);
    this.eye = this.scene.add.arc(0, -5, 4, 0, 360, false, 0xff4444, 1);
    this.add([this.core, this.eye]);
  }

  update(delta: number, px: number, py: number) {
    if (this.hitCooldown > 0) this.hitCooldown -= delta;
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.body_.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);

    const angle = Math.atan2(dy, dx);
    this.eye.setPosition(Math.cos(angle) * 7, Math.sin(angle) * 7);
  }

  canHit(): boolean { return this.hitCooldown <= 0; }

  onHit() {
    this.hitCooldown = ENEMY_HIT_COOLDOWN;
  }

  get damage() { return ENEMY_DAMAGE; }
}
