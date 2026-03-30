import Phaser from 'phaser';
import { ENEMY_BASE_SPEED, ENEMY_DAMAGE, ENEMY_HIT_COOLDOWN, ENEMY_HP, ENEMY_KILL_MONEY, SLOW_SPEED_MULT } from '../config/GameConfig';
import { EnemyTypeConfig } from '../config/EnemyTypes';

export class Enemy extends Phaser.GameObjects.Container {
  private body_!: Phaser.Physics.Arcade.Body;
  private core!: Phaser.GameObjects.Arc;
  private eye!: Phaser.GameObjects.Arc;
  speed: number;
  private hitCooldown = 0;

  hp: number;
  maxHp: number;
  readonly moneyReward: number;

  /** The enemy type config (null for legacy single-type enemies) */
  readonly typeConfig: EnemyTypeConfig | null;

  /** Remaining ms of slow effect (reduces move speed) */
  private slowTimer = 0;
  /** Remaining ms of disorient effect (random movement) */
  private disorientTimer = 0;
  private disorientChangeTimer = 0;
  private disorientVx = 0;
  private disorientVy = 0;

  /** Default stroke colour for this enemy (used to restore after status effects) */
  private defaultStrokeColor: number;
  /** Default core fill colour */
  private defaultCoreColor: number;

  /**
   * Create a new enemy.
   *
   * When `typeConfig` is provided the enemy uses per-type stats and visuals.
   * The legacy overload (`speedMult`, `hpMult`) still works for backwards
   * compatibility — it produces a generic "grunt-like" enemy.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, speedMult?: number, hpMult?: number, typeConfig?: EnemyTypeConfig) {
    super(scene, x, y);

    if (typeConfig) {
      // ── Typed enemy ──────────────────────────────────────────────────
      this.typeConfig = typeConfig;
      const sMult = speedMult ?? 1;
      const hMult = hpMult ?? 1;
      this.speed = typeConfig.baseSpeed * sMult;
      this.hp = Math.round(typeConfig.baseHp * hMult);
      this.maxHp = this.hp;
      this.moneyReward = typeConfig.moneyReward;
      this.defaultStrokeColor = typeConfig.strokeColor;
      this.defaultCoreColor = typeConfig.coreColor;
      this.buildTyped(typeConfig);
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.body_ = this.body as Phaser.Physics.Arcade.Body;
      this.body_.setCircle(typeConfig.bodyRadius, -typeConfig.bodyRadius, -typeConfig.bodyRadius);
    } else {
      // ── Legacy single-type enemy ─────────────────────────────────────
      this.typeConfig = null;
      const sMult = speedMult ?? 1;
      const hMult = hpMult ?? 1;
      this.speed = ENEMY_BASE_SPEED * sMult;
      this.hp = Math.round(ENEMY_HP * hMult);
      this.maxHp = this.hp;
      this.moneyReward = ENEMY_KILL_MONEY;
      this.defaultStrokeColor = 0xff2200;
      this.defaultCoreColor = 0x220000;
      this.buildLegacy();
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.body_ = this.body as Phaser.Physics.Arcade.Body;
      this.body_.setCircle(14, -14, -14);
    }
  }

  // ── Visual builders ───────────────────────────────────────────────────

  private buildLegacy() {
    this.core = this.scene.add.arc(0, 0, 14, 0, 360, false, 0x220000, 1);
    this.core.setStrokeStyle(2, 0xff2200, 1);
    this.eye = this.scene.add.arc(0, -5, 4, 0, 360, false, 0xff4444, 1);
    this.add([this.core, this.eye]);
  }

  private buildTyped(cfg: EnemyTypeConfig) {
    this.core = this.scene.add.arc(0, 0, cfg.bodyRadius, 0, 360, false, cfg.coreColor, 1);
    this.core.setStrokeStyle(2, cfg.strokeColor, 1);

    const eyeOffset = cfg.bodyRadius * 0.35;
    const eyeRadius = Math.max(3, cfg.bodyRadius * 0.25);
    this.eye = this.scene.add.arc(0, -eyeOffset, eyeRadius, 0, 360, false, cfg.eyeColor, 1);

    this.add([this.core, this.eye]);

    // Boss / elite get a double-ring indicator
    if (cfg.id === 'boss') {
      const outerRing = this.scene.add.arc(0, 0, cfg.bodyRadius + 5, 0, 360, false, 0x000000, 0);
      outerRing.setStrokeStyle(2, 0xff0044, 0.7);
      this.add(outerRing);
    } else if (cfg.id === 'elite') {
      const outerRing = this.scene.add.arc(0, 0, cfg.bodyRadius + 4, 0, 360, false, 0x000000, 0);
      outerRing.setStrokeStyle(1, 0xaa44ff, 0.6);
      this.add(outerRing);
    } else if (cfg.id === 'exploder') {
      // Pulsing glow effect for exploders
      const glow = this.scene.add.arc(0, 0, cfg.bodyRadius + 3, 0, 360, false, 0xff6600, 0.15);
      this.add(glow);
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.4 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
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
        this.core.setStrokeStyle(2, this.defaultStrokeColor, 1);
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
        this.core.setStrokeStyle(2, this.defaultStrokeColor, 1);
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
    const eyeDist = this.typeConfig ? this.typeConfig.bodyRadius * 0.5 : 7;
    this.eye.setPosition(Math.cos(eyeAngle) * eyeDist, Math.sin(eyeAngle) * eyeDist);
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
      if (this.active) this.core.setFillStyle(this.defaultCoreColor);
    });
    return false;
  }

  get damage(): number {
    return this.typeConfig ? this.typeConfig.baseDamage : ENEMY_DAMAGE;
  }
}

