import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { HackNode } from '../objects/HackNode';
import { Enemy } from '../objects/Enemy';
import { Projectile } from '../objects/Projectile';
import { RoundManager } from '../systems/RoundManager';
import { ScoreManager } from '../systems/ScoreManager';
import { UIScene } from './UIScene';
import {
  GAME_WIDTH, GAME_HEIGHT,
  WORLD_WIDTH, WORLD_HEIGHT,
  HEAT_PER_HACK, HEAT_DAMAGE_SPIKE,
  FINAL_NODE_MONEY, NODE_HACK_MONEY,
  PROJECTILE_HIT_RADIUS,
  WeaponConfig, WEAPONS,
  Upgrade, StatBoostType,
} from '../config/GameConfig';

type RoundPhase = 'INTRO' | 'ACTIVE' | 'ROUND_RESULT' | 'GAME_OVER';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private nodes: HackNode[] = [];
  private enemies!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private roundMgr!: RoundManager;
  private scoreMgr!: ScoreManager;

  private heat = 0;
  private roundTimerMs = 0;
  private phase: RoundPhase = 'INTRO';
  private introTimer = 0;
  private introCountdown = 3;

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 4000;

  /** Currently equipped weapon config */
  private currentWeapon: WeaponConfig = WEAPONS[0];
  /** Weapon IDs the player owns (can equip) */
  private ownedWeaponIds: Set<string> = new Set(['pistol']);
  /** Countdown until next shot can fire (ms) */
  private fireTimer = 0;

  private introText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.roundMgr = new RoundManager();
    this.scoreMgr = new ScoreManager();
    this.heat = 0;
    this.phase = 'INTRO';
    this.introTimer = 1000;
    this.introCountdown = 3;
    this.currentWeapon = WEAPONS[0];
    this.ownedWeaponIds = new Set(['pistol']);
    this.fireTimer = 0;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawBackground();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.enemies = this.add.group();
    this.projectiles = this.add.group();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    this.introText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '64px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.startRound();
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x050a0a);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    g.lineStyle(1, 0x0a1a14, 1);
    for (let x = 0; x < WORLD_WIDTH; x += 80) g.lineBetween(x, 0, x, WORLD_HEIGHT);
    for (let y = 0; y < WORLD_HEIGHT; y += 80) g.lineBetween(0, y, WORLD_WIDTH, y);
    const colors = [0x0c1c14, 0x0a1410, 0x101010];
    for (let i = 0; i < 40; i++) {
      const w = Phaser.Math.Between(60, 200);
      const h = Phaser.Math.Between(60, 200);
      const rx = Phaser.Math.Between(0, WORLD_WIDTH - w);
      const ry = Phaser.Math.Between(0, WORLD_HEIGHT - h);
      g.fillStyle(Phaser.Utils.Array.GetRandom(colors) as number);
      g.fillRect(rx, ry, w, h);
      g.lineStyle(1, 0x1a3322, 0.5);
      g.strokeRect(rx, ry, w, h);
    }
  }

  private startRound() {
    const cfg = this.roundMgr.getRoundConfig();
    this.roundTimerMs = cfg.timerSec * 1000;
    this.phase = 'INTRO';
    this.introTimer = 1000;
    this.introCountdown = 3;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = Math.max(1500, 4000 - this.roundMgr.round * 200);

    this.nodes.forEach(n => n.destroy());
    this.nodes = [];
    this.enemies.clear(true, true);
    // Destroy any lingering projectiles
    (this.projectiles.getChildren() as Projectile[]).forEach(p => p.destroy());
    this.projectiles.clear(false, false);

    // Spawn regular nodes
    const total = cfg.nodesRequired + 2;
    for (let i = 0; i < total; i++) {
      const nx = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const ny = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
      this.nodes.push(new HackNode(this, nx, ny, false));
    }

    // Spawn the EXIT node (stage completion target) — placed far from player spawn
    const exitX = Phaser.Math.Between(100, WORLD_WIDTH - 100);
    const exitY = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
    this.nodes.push(new HackNode(this, exitX, exitY, true));

    this.introText.setText('3');
  }

  private applyUpgrade(upgrade: Upgrade) {
    const p = this.player;
    switch (upgrade.id) {
      case 'hackSpeed':
        this.nodes.forEach(n => { n.hackTimeMs *= 0.6; });
        break;
      case 'moveSpeed':
        p.moveSpeed += 35; // Upgrade bonus is larger than the node stat boost (15) intentionally
        break;
      case 'dashCooldown':
        p.dashCooldownMs = p.dashCooldownMs * 0.65;
        break;
      case 'scoreMultiplier':
        this.scoreMgr.addMultiplier(0.5);
        break;
      case 'hpRegen':
        p.healBy(40);
        break;
      case 'comboWindow':
        this.scoreMgr.extendComboWindow(1500);
        break;
    }
  }

  private applyStatBoost(boostType: StatBoostType, value: number) {
    const p = this.player;
    switch (boostType) {
      case 'speed':
        p.moveSpeed += value;
        this.showStatusMessage(`+${value} SPEED`, '#00ffcc');
        break;
      case 'damage':
        p.weaponDamage += value;
        this.showStatusMessage(`+${value} DAMAGE`, '#ff8844');
        break;
      case 'projectile':
        p.extraProjectiles += value;
        this.showStatusMessage('+1 PROJECTILE', '#ffff44');
        break;
    }
  }

  override update(_time: number, delta: number) {
    if (!this.player || !this.player.isAlive()) {
      if (this.phase !== 'GAME_OVER') this.endRun();
      return;
    }

    this.player.update(delta);

    const cfg = this.roundMgr.getRoundConfig();

    if (this.phase === 'INTRO') {
      this.introTimer -= delta;
      if (this.introTimer <= 0) {
        this.introCountdown -= 1;
        if (this.introCountdown > 0) {
          this.introText.setText(String(this.introCountdown));
          this.introTimer = 1000;
        } else {
          this.introText.setText('JACK IN!');
          this.time.delayedCall(600, () => {
            this.introText.setText('');
            this.phase = 'ACTIVE';
          });
        }
      }
      this.updateHUD(cfg);
      return;
    }

    if (this.phase !== 'ACTIVE') return;

    this.roundTimerMs -= delta;
    if (this.roundTimerMs <= 0) {
      this.roundTimerMs = 0;
      this.endRun();
      return;
    }

    this.heat = Math.max(0, this.heat - 0.0005 * delta);

    this.enemySpawnTimer -= delta;
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy(cfg.enemySpeedMult, cfg.enemyCountMult);
      const interval = this.enemySpawnInterval / (1 + this.heat * 3);
      this.enemySpawnTimer = Math.max(600, interval);
    }

    // Enemy movement and collision with player
    const enemies = this.enemies.getChildren() as Enemy[];
    enemies.forEach(e => {
      e.update(delta, this.player.x, this.player.y);
      if (e.canHit()) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          const hit = this.player.takeDamage(e.damage);
          if (hit) {
            e.onHit();
            this.scoreMgr.breakCombo();
            this.heat = Math.min(1, this.heat + HEAT_DAMAGE_SPIKE);
            this.getUIScene()?.showMessage('TRACED!', '#ff2200', 800);
          }
        }
      }
    });

    // Weapon auto-fire while left mouse button is held
    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }
    if (this.input.activePointer.isDown && this.fireTimer <= 0) {
      this.fireWeapon();
      this.fireTimer = this.currentWeapon.fireRate;
    }

    // Update projectiles; check collision with enemies
    const projectiles = this.projectiles.getChildren() as Projectile[];
    for (let pi = projectiles.length - 1; pi >= 0; pi--) {
      const proj = projectiles[pi];
      if (!proj.active) continue;
      if (proj.tickLifetime(delta)) {
        proj.destroy();
        this.projectiles.remove(proj, false, false);
        continue;
      }
      // Check hit against each enemy
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        if (!enemy.active) continue;
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < PROJECTILE_HIT_RADIUS) {
          const killed = enemy.takeDamage(proj.damage);
          proj.destroy();
          this.projectiles.remove(proj, false, false);
          if (killed) {
            this.scoreMgr.addMoney(enemy.moneyReward);
            this.showFloatingMoney(enemy.x, enemy.y, enemy.moneyReward);
            enemy.destroy();
            this.enemies.remove(enemy, false, false);
          }
          break;
        }
      }
    }

    // Node hacking
    this.nodes.forEach(node => {
      if (!node.hacked) {
        const inRange = node.isPlayerInRange(this.player.x, this.player.y);
        node.updateHack(delta, inRange, this.player.isHackKeyDown());
      }
    });

    // Detect newly hacked nodes
    this.nodes.forEach(node => {
      if (node.hacked && node.hackProgress >= 1 && node.hackProgress < 1.1) {
        node.hackProgress = 1.1; // mark as processed

        if (node.isFinalNode) {
          // Exit node — give large money reward and complete the round
          const money = FINAL_NODE_MONEY;
          this.scoreMgr.addMoney(money);
          this.showFloatingScore(node.x, node.y, money);
          this.getUIScene()?.showMessage('STAGE COMPLETE!', '#ffcc00', 1500);
          this.phase = 'ROUND_RESULT';
          this.time.delayedCall(800, () => this.showUpgradeScreen());
        } else {
          // Regular node — money + stat boost + combo points
          this.roundMgr.hackNode();
          const pts = this.scoreMgr.addHackScore(this.time.now);
          const money = NODE_HACK_MONEY;
          this.scoreMgr.addMoney(money);
          this.heat = Math.min(1, this.heat + HEAT_PER_HACK);
          this.showFloatingScore(node.x, node.y, pts + money);
          // Apply the stat boost this node provides
          if (node.statBoostType) {
            this.applyStatBoost(node.statBoostType, node.statBoostValue);
          }
        }
      }
    });

    this.updateHUD(cfg);
  }

  private fireWeapon() {
    const baseAngle = this.player.getAimAngle();
    const wep = this.currentWeapon;
    const totalProjectiles = wep.projectileCount + this.player.extraProjectiles;
    const dmg = wep.damage + this.player.weaponDamage;

    for (let i = 0; i < totalProjectiles; i++) {
      let angle = baseAngle;
      if (totalProjectiles > 1) {
        const spreadStep = wep.spread / (totalProjectiles - 1);
        angle = baseAngle - wep.spread / 2 + i * spreadStep;
      }
      const proj = new Projectile(this, this.player.x, this.player.y, angle, dmg);
      this.projectiles.add(proj);
    }
  }

  private getUIScene(): UIScene | null {
    return this.scene.get('UIScene') as UIScene | null;
  }

  private spawnEnemy(speedMult: number, countMult: number) {
    const maxEnemies = Math.floor(4 * countMult + this.heat * 8);
    const current = this.enemies.getLength();
    if (current >= maxEnemies) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = 420;
    const ex = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 50, WORLD_WIDTH - 50);
    const ey = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 50, WORLD_HEIGHT - 50);
    const enemy = new Enemy(this, ex, ey, speedMult + this.heat * 0.5);
    this.enemies.add(enemy);
  }

  private showUpgradeScreen() {
    const cfg = this.roundMgr.getRoundConfig();
    this.scene.pause('GameScene');
    this.scene.launch('UpgradeScene', {
      round: cfg.round,
      score: this.scoreMgr.score,
      credits: this.scoreMgr.credits,
      ownedWeaponIds: Array.from(this.ownedWeaponIds),
    });

    this.events.once('resume', (_scene: unknown, data: {
      upgrade?: Upgrade;
      newWeaponId?: string;
      creditsSpent: number;
    }) => {
      if (data?.upgrade) {
        this.applyUpgrade(data.upgrade);
      }
      if (data?.newWeaponId) {
        this.ownedWeaponIds.add(data.newWeaponId);
        const wep = WEAPONS.find(w => w.id === data.newWeaponId);
        if (wep) {
          this.currentWeapon = wep;
        }
      }
      if (data?.creditsSpent > 0) {
        this.scoreMgr.spendCredits(data.creditsSpent);
      }
      this.roundMgr.nextRound();
      this.startRound();
    });
  }

  private endRun() {
    this.phase = 'GAME_OVER';
    this.scoreMgr.saveBest();
    this.scene.stop('UIScene');
    this.scene.start('GameOverScene', {
      score: this.scoreMgr.score,
      bestScore: this.scoreMgr.bestScore,
      round: this.roundMgr.round,
    });
  }

  private updateHUD(cfg: ReturnType<RoundManager['getRoundConfig']>) {
    const exitHacked = this.nodes.some(n => n.isFinalNode && n.hacked);
    try {
      this.getUIScene()?.updateHUD({
        score: this.scoreMgr.score,
        credits: this.scoreMgr.credits,
        round: this.roundMgr.round,
        timerSec: this.roundTimerMs / 1000,
        hp: this.player.hp,
        heat: this.heat,
        combo: this.scoreMgr.combo,
        nodesHacked: this.roundMgr.nodesHacked,
        nodesTotal: cfg.nodesRequired + 2,
        dashCooldownFrac: this.player.dashCooldownRemaining / this.player.dashCooldownMs,
        weaponLabel: this.currentWeapon.label,
        exitHacked,
      });
    } catch {
      // UIScene may not be ready yet
    }
  }

  private showFloatingScore(x: number, y: number, pts: number) {
    const t = this.add.text(x, y - 20, `+${pts}`, {
      fontSize: '18px', color: '#00ffcc', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t, y: y - 70, alpha: 0, duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private showFloatingMoney(x: number, y: number, amount: number) {
    const t = this.add.text(x, y - 20, `+¥${amount}`, {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t, y: y - 60, alpha: 0, duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private showStatusMessage(text: string, color: string) {
    const t = this.add.text(
      this.player.x,
      this.player.y - 40,
      text,
      { fontSize: '13px', color, fontFamily: 'Courier New', stroke: '#000', strokeThickness: 2 },
    ).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t, y: this.player.y - 80, alpha: 0, duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}

