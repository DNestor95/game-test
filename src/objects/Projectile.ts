import Phaser from 'phaser';
import { PROJECTILE_SPEED, PROJECTILE_LIFETIME } from '../config/GameConfig';

export class Projectile extends Phaser.GameObjects.Arc {
  private body_!: Phaser.Physics.Arcade.Body;
  damage: number;
  private lifetime: number;
  private elapsed = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    damage: number,
    speed = PROJECTILE_SPEED,
    lifetime = PROJECTILE_LIFETIME,
  ) {
    super(scene, x, y, 4, 0, 360, false, 0xffff44, 1);
    this.damage = damage;
    this.lifetime = lifetime;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body_ = this.body as Phaser.Physics.Arcade.Body;
    this.body_.setCircle(4);
    this.body_.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setDepth(10);
    this.setStrokeStyle(1, 0xffaa00, 1);
  }

  /** Returns true when the projectile should be destroyed */
  tickLifetime(delta: number): boolean {
    this.elapsed += delta;
    return this.elapsed >= this.lifetime;
  }
}
