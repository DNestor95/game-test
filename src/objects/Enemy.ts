import Phaser from 'phaser';
import { ENEMY_BASE_SPEED, ENEMY_DAMAGE, ENEMY_HIT_COOLDOWN, ENEMY_HP, ENEMY_KILL_MONEY, SLOW_SPEED_MULT } from '../config/GameConfig';

export class Enemy extends Phaser.GameObjects.Container {
  private body_!: Phaser.Physics.Arcade.Body;
  private core!: Phaser.GameObjects.Arc;
  private eye!: Phaser.GameObjects.Arc;
  speed: number;
  private hitCooldown = 0;

  hp: number;
  maxHp: number;
  readonly moneyReward = ENEMY_KILL_MONEY;

  /** Remaining ms of slow effect (reduces move speed) */
  private slowTimer = 0;
  /** Remaining ms of disorient effect (random movement) */
  private disorientTimer = 0;
  private disorientChangeTimer = 0;
  private disorientVx = 0;
  private disorientVy = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speedMult = 1, hpMult = 1) {
    super(scene, x, y);
    this.speed = ENEMY_BASE_SPEED * speedMult;
    this.hp = Math.round(ENEMY_HP * hpMult);
    this.maxHp = this.hp;
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

  /** Apply a status effect to this enemy */
  applyEffect(type: 'slow' | 'disorient', duration: number) {
    if (type === 'slow') {
      this.slowTimer = Math.max(this.slowTimer, duration);
      this.core.setStrokeStyle(2, 0x4488ff, 1);
    } else {
      this.disorientTimer = Math.max(this.disorientTimer, duration);
      this.disorientChangeTimer = 0; // pick a new random direction immediately
      this.core.setStrokeStyle(2, 0xcc44ff, 1);
    }
  }

  update(delta: number, px: number, py: number) {
    if (this.hitCooldown > 0) this.hitCooldown -= delta;

    // Tick status effects
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.core.setStrokeStyle(2, 0xff2200, 1);
      }
    }
    if (this.disorientTimer > 0) {
      this.disorientTimer -= delta;
      this.disorientChangeTimer -= delta;
      if (this.disorientChangeTimer <= 0) {
        const rAngle = Math.random() * Math.PI * 2;
        this.disorientVx = Math.cos(rAngle);
        this.disorientVy = Math.sin(rAngle);
        this.disorientChangeTimer = 500;
      }
      if (this.disorientTimer <= 0) {
        this.core.setStrokeStyle(2, 0xff2200, 1);
      }
    }

    let dx: number, dy: number, dist: number;
    if (this.disorientTimer > 0) {
      dx = this.disorientVx;
      dy = this.disorientVy;
      dist = 1;
    } else {
      dx = px - this.x;
      dy = py - this.y;
      dist = Math.sqrt(dx * dx + dy * dy) || 1;
    }

    const speedMult = this.slowTimer > 0 ? SLOW_SPEED_MULT : 1;
    this.body_.setVelocity((dx / dist) * this.speed * speedMult, (dy / dist) * this.speed * speedMult);

    const eyeAngle = this.disorientTimer > 0
      ? Math.atan2(this.disorientVy, this.disorientVx)
      : Math.atan2(dy, dx);
    this.eye.setPosition(Math.cos(eyeAngle) * 7, Math.sin(eyeAngle) * 7);
  }

  canHit(): boolean { return this.hitCooldown <= 0; }

  onHit() {
    this.hitCooldown = ENEMY_HIT_COOLDOWN;
  }

  /**
   * Deal damage to this enemy.
   * @returns true if the enemy dies from this hit
   */
  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) return true;
    // Flash red on hit
    this.core.setFillStyle(0xff4400);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.core.setFillStyle(0x220000);
    });
    return false;
  }

  get damage() { return ENEMY_DAMAGE; }
}

