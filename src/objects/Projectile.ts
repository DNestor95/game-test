import Phaser from 'phaser';
import { PROJECTILE_SPEED, PROJECTILE_LIFETIME } from '../config/GameConfig';

export interface ProjectileOptions {
  speed?: number;
  lifetime?: number;
  color?: number;
  strokeColor?: number;
  /** Visual radius of the projectile arc (pixels) */
  visualRadius?: number;
  /** If true, the projectile deals area damage when it expires or hits */
  isAreaDamage?: boolean;
  /** Blast radius in pixels for area-damage projectiles */
  areaRadius?: number;
  /** Status effect applied to enemies hit */
  effectType?: 'slow' | 'disorient';
  /** Duration of the status effect in ms */
  effectDuration?: number;
}

export class Projectile extends Phaser.GameObjects.Arc {
  private body_!: Phaser.Physics.Arcade.Body;
  damage: number;
  private lifetime: number;
  private elapsed = 0;

  readonly isAreaDamage: boolean;
  readonly areaRadius: number;
  readonly effectType?: 'slow' | 'disorient';
  readonly effectDuration?: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    damage: number,
    options: ProjectileOptions = {},
  ) {
    const {
      speed = PROJECTILE_SPEED,
      lifetime = PROJECTILE_LIFETIME,
      color = 0xffff44,
      strokeColor = 0xffaa00,
      visualRadius = 4,
      isAreaDamage = false,
      areaRadius = 0,
      effectType,
      effectDuration,
    } = options;

    super(scene, x, y, visualRadius, 0, 360, false, color, 1);
    this.damage = damage;
    this.lifetime = lifetime;
    this.isAreaDamage = isAreaDamage;
    this.areaRadius = areaRadius;
    this.effectType = effectType;
    this.effectDuration = effectDuration;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body_ = this.body as Phaser.Physics.Arcade.Body;
    this.body_.setCircle(visualRadius);
    this.body_.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setDepth(10);
    this.setStrokeStyle(1, strokeColor, 1);
  }

  /** Returns true when the projectile should be destroyed */
  tickLifetime(delta: number): boolean {
    this.elapsed += delta;
    return this.elapsed >= this.lifetime;
  }
}
