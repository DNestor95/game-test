import Phaser from 'phaser';
import {
  PLAYER_SPEED, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  PLAYER_MAX_HP, PLAYER_INVINCIBLE_MS,
} from '../config/GameConfig';

export class Player extends Phaser.GameObjects.Container {
  private body_!: Phaser.Physics.Arcade.Body;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;
    hack: Phaser.Input.Keyboard.Key;
  };

  hp = PLAYER_MAX_HP;
  maxHp = PLAYER_MAX_HP;

  isDashing = false;
  dashCooldownRemaining = 0;
  dashCooldownMs: number;

  isHacking = false;
  hackProgress = 0;

  private invincibleTimer = 0;
  private dashTimer = 0;
  private flashTimer = 0;
  private circle!: Phaser.GameObjects.Arc;
  private indicator!: Phaser.GameObjects.Triangle;

  facingX = 0;
  facingY = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.dashCooldownMs = DASH_COOLDOWN;
    this.build();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body_ = this.body as Phaser.Physics.Arcade.Body;
    this.body_.setCollideWorldBounds(true);
    this.body_.setCircle(18, -18, -18);

    const kb = scene.input.keyboard!;
    this.keys = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      dash:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      hack:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
  }

  private build() {
    this.circle = this.scene.add.arc(0, 0, 18, 0, 360, false, 0x00ffcc, 1);
    this.circle.setStrokeStyle(2, 0x00ffff);
    this.indicator = this.scene.add.triangle(0, -24, -6, 0, 6, 0, 0, -10, 0x00ffff);
    this.add([this.circle, this.indicator]);
  }

  update(delta: number) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= delta;
    if (this.dashCooldownRemaining > 0) this.dashCooldownRemaining -= delta;
    if (this.dashTimer > 0) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) this.isDashing = false;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      this.circle.setAlpha(Math.sin(this.flashTimer * 0.03) > 0 ? 1 : 0.3);
    } else {
      this.circle.setAlpha(1);
    }

    if (this.isDashing) return;

    let vx = 0, vy = 0;
    if (this.keys.left.isDown)  vx -= 1;
    if (this.keys.right.isDown) vx += 1;
    if (this.keys.up.isDown)    vy -= 1;
    if (this.keys.down.isDown)  vy += 1;

    const speed = PLAYER_SPEED;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    if (vx !== 0 || vy !== 0) {
      this.facingX = vx / len;
      this.facingY = vy / len;
    }

    this.body_.setVelocity((vx / len) * speed || 0, (vy / len) * speed || 0);
    if (vx === 0 && vy === 0) this.body_.setVelocity(0, 0);

    const angle = Math.atan2(this.facingY, this.facingX) + Math.PI / 2;
    this.indicator.setRotation(angle);

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) && this.dashCooldownRemaining <= 0) {
      this.isDashing = true;
      this.dashTimer = DASH_DURATION;
      this.dashCooldownRemaining = this.dashCooldownMs;
      const dx = this.facingX || 0;
      const dy = this.facingY || -1;
      this.body_.setVelocity(dx * DASH_SPEED, dy * DASH_SPEED);
      this.circle.setFillStyle(0xffffff);
      this.scene.time.delayedCall(DASH_DURATION, () => {
        this.circle.setFillStyle(0x00ffcc);
      });
    }
  }

  isHackKeyDown(): boolean {
    return this.keys.hack.isDown;
  }

  takeDamage(amount: number): boolean {
    if (this.invincibleTimer > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = PLAYER_INVINCIBLE_MS;
    this.flashTimer = PLAYER_INVINCIBLE_MS;
    return true;
  }

  isAlive(): boolean { return this.hp > 0; }

  healBy(amount: number) { this.hp = Math.min(this.maxHp, this.hp + amount); }
}
