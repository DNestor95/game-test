import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { HackNode } from '../objects/HackNode';
import { Enemy } from '../objects/Enemy';
import { Obstacle } from '../objects/Obstacle';
import { Projectile, ProjectileOptions } from '../objects/Projectile';
import { RoundManager } from '../systems/RoundManager';
import { ScoreManager } from '../systems/ScoreManager';
import { UIScene, WeaponSlotHUD } from './UIScene';
import {
  GAME_WIDTH, GAME_HEIGHT,
  WORLD_WIDTH, WORLD_HEIGHT,
  HEAT_PER_HACK, HEAT_DAMAGE_SPIKE,
  FINAL_NODE_MONEY, NODE_HACK_MONEY,
  PROJECTILE_HIT_RADIUS,
  GRENADE_RADIUS, GRENADE_SPEED, GRENADE_FUSE_MS,
  WeaponConfig, WEAPONS,
  Upgrade, StatBoostType,
  AttachmentConfig, ATTACHMENTS,
  XP_PER_KILL, XP_PER_HACK, XP_PER_EXIT,
  BASE_LEVEL_SEED, createSeededRNG,
  OVERTIME_COUNT_MULT, OVERTIME_HP_MULT,
  MAX_WEAPON_SLOTS,
} from '../config/GameConfig';

type RoundPhase = 'INTRO' | 'ACTIVE' | 'ROUND_RESULT' | 'GAME_OVER';

/** Shape of data sent back to GameScene when any overlay scene resumes it. */
interface ResumeData {
  upgrade?: Upgrade;
  newWeaponId?: string | null;
  /** Attachments purchased in the mid-game attachment shop */
  newAttachments?: Array<{ weaponId: string; attachmentId: string }>;
  creditsSpent: number;
  /** true → advance to next round; false → level-up or attachment shop mid-round */
  nextRound: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private nodes: HackNode[] = [];
  private enemies!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private obstacles: Obstacle[] = [];
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private roundMgr!: RoundManager;
  private scoreMgr!: ScoreManager;

  private heat = 0;
  private overtimeMode = false;
  private overtimeElapsedMs = 0;
  private roundTimerMs = 0;
  private phase: RoundPhase = 'INTRO';
  private introTimer = 0;
  private introCountdown = 3;

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 4000;

  // ── 3-slot weapon inventory ──
  /** Up to MAX_WEAPON_SLOTS weapon configs (null = empty slot) */
  private weaponSlots: (WeaponConfig | null)[] = [WEAPONS[0], null, null];
  /** Currently active slot index (0-based) */
  private activeSlotIndex = 0;
  /** Per-slot magazine shot counts */
  private slotMagazines: number[] = [WEAPONS[0].magazineSize, 0, 0];
  /** Per-slot reload timers (ms remaining); 0 = not reloading */
  private slotReloadTimers: number[] = [0, 0, 0];
  /** Countdown until next shot can fire from the active slot (ms) */
  private fireTimer = 0;

  /** Accumulated fire-rate multiplier from OVERCLOCK upgrades */
  private weaponFireRateMult = 1.0;
  /** Accumulated hack-speed multiplier from FAST INJECT upgrades */
  private hackSpeedMult = 1.0;
  /** Accumulated reload-time multiplier from QUICK RELOAD upgrades */
  private reloadTimeMult = 1.0;

  /** Attachments currently equipped on each weapon: weaponId → AttachmentConfig[] */
  private weaponAttachments: Map<string, AttachmentConfig[]> = new Map();

  /** Prevent multiple level-up overlays stacking simultaneously */
  private levelUpPending = false;

  private introText!: Phaser.GameObjects.Text;
  private keysWeaponSwitch!: Phaser.Input.Keyboard.Key[];

  /** Convenience getter — the active weapon config (falls back to pistol if slot is unexpectedly empty) */
  private get currentWeapon(): WeaponConfig {
    return this.weaponSlots[this.activeSlotIndex] ?? WEAPONS[0];
  }

  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.roundMgr = new RoundManager();
    this.scoreMgr = new ScoreManager();
    this.heat = 0;
    this.overtimeMode = false;
    this.overtimeElapsedMs = 0;
    this.phase = 'INTRO';
    this.introTimer = 1000;
    this.introCountdown = 3;
    this.weaponSlots = [WEAPONS[0], null, null];
    this.activeSlotIndex = 0;
    this.slotMagazines = [WEAPONS[0].magazineSize, 0, 0];
    this.slotReloadTimers = [0, 0, 0];
    this.fireTimer = 0;
    this.weaponFireRateMult = 1.0;
    this.hackSpeedMult = 1.0;
    this.levelUpPending = false;
    this.reloadTimeMult = 1.0;
    this.weaponAttachments = new Map();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawBackground();

    // Persistent static group for obstacle physics bodies
    this.obstacleGroup = this.physics.add.staticGroup();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.enemies = this.add.group();
    this.projectiles = this.add.group();

    // Persistent resume handler — handles LevelUpScene, UpgradeScene, and AttachmentShopScene returns
    this.events.on('resume', this.onSceneResume, this);

    // Weapon-slot hotkeys (keys 1 / 2 / 3)
    const kb = this.input.keyboard!;
    this.keysWeaponSwitch = [
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];

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
    this.overtimeMode = false;
    this.overtimeElapsedMs = 0;
    this.phase = 'INTRO';
    this.introTimer = 1000;
    this.introCountdown = 3;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = Math.max(1500, 4000 - this.roundMgr.round * 200);
    this.levelUpPending = false;

    // Reset magazine for each slot that has a weapon
    for (let i = 0; i < MAX_WEAPON_SLOTS; i++) {
      const wep = this.weaponSlots[i];
      this.slotMagazines[i] = wep ? this.getEffectiveMagazine(wep) : 0;
      this.slotReloadTimers[i] = 0;
    }
    this.fireTimer = 0;

    this.nodes.forEach(n => n.destroy());
    this.nodes = [];
    this.enemies.clear(true, true);
    // Destroy any lingering projectiles
    (this.projectiles.getChildren() as Projectile[]).forEach(p => p.destroy());
    this.projectiles.clear(false, false);

    // Clear previous obstacles and generate new ones using a deterministic seed
    this.obstacleGroup.clear(true, true);
    this.obstacles = [];

    // Seed grows with round count so later stages are more complex
    const seed = BASE_LEVEL_SEED + this.roundMgr.round * 31337;
    const rng = createSeededRNG(seed);

    this.spawnObstacles(rng, cfg.round);
    this.spawnNodes(rng, cfg);

    // Add physics colliders for this round's obstacles
    this.physics.add.collider(this.player, this.obstacleGroup);
    this.physics.add.collider(this.enemies, this.obstacleGroup);

    this.introText.setText('3');
  }

  /**
   * Procedurally place rectangular obstacles using the seeded RNG.
   * Obstacle count and average size scale with the round number.
   */
  private spawnObstacles(rng: () => number, round: number) {
    // Obstacles range from 3 in round 1 up to ~18 in round 10
    const count = Math.min(18, Math.floor(3 + (round - 1) * 1.7));
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;

    for (let i = 0; i < count; i++) {
      // Width / height scale up gently with round number
      const maxW = Math.min(220, 70 + round * 8);
      const maxH = Math.min(140, 35 + round * 5);
      const ow = Math.floor(rng() * (maxW - 50)) + 50;
      const oh = Math.floor(rng() * (maxH - 25)) + 25;

      let ox: number, oy: number;
      let attempts = 0;
      // Retry placement until the obstacle is far enough from the player spawn
      do {
        ox = Math.floor(rng() * (WORLD_WIDTH - 200)) + 100;
        oy = Math.floor(rng() * (WORLD_HEIGHT - 200)) + 100;
        attempts++;
      } while (Math.sqrt((ox - cx) ** 2 + (oy - cy) ** 2) < 160 && attempts < 15);

      const obs = new Obstacle(this, ox, oy, ow, oh);
      this.obstacles.push(obs);
      this.obstacleGroup.add(obs);
    }
  }

  /**
   * Procedurally place hack nodes using the seeded RNG (same seed as obstacles
   * so the full layout is reproducible).
   * Every 3rd round a special shop node is also spawned (opens attachment shop).
   */
  private spawnNodes(rng: () => number, cfg: ReturnType<RoundManager['getRoundConfig']>) {
    const total = cfg.nodesRequired + 2;
    for (let i = 0; i < total; i++) {
      const nx = Math.floor(rng() * (WORLD_WIDTH - 200)) + 100;
      const ny = Math.floor(rng() * (WORLD_HEIGHT - 200)) + 100;
      const node = new HackNode(this, nx, ny, /* isFinal */ false, /* isShop */ false);
      node.hackTimeMs *= this.hackSpeedMult;
      this.nodes.push(node);
    }

    // EXIT node
    const exitX = Math.floor(rng() * (WORLD_WIDTH - 200)) + 100;
    const exitY = Math.floor(rng() * (WORLD_HEIGHT - 200)) + 100;
    const exitNode = new HackNode(this, exitX, exitY, /* isFinal */ true, /* isShop */ false);
    exitNode.hackTimeMs *= this.hackSpeedMult;
    this.nodes.push(exitNode);

    // SHOP node — appears every 3rd round (rounds 3, 6, 9, …)
    if (cfg.round % 3 === 0) {
      const shopX = Math.floor(rng() * (WORLD_WIDTH - 200)) + 100;
      const shopY = Math.floor(rng() * (WORLD_HEIGHT - 200)) + 100;
      const shopNode = new HackNode(this, shopX, shopY, false, true);
      shopNode.hackTimeMs *= this.hackSpeedMult;
      this.nodes.push(shopNode);
    }
  }

  private applyUpgrade(upgrade: Upgrade) {
    const p = this.player;
    switch (upgrade.id) {
      case 'hackSpeed':
        this.hackSpeedMult *= 0.6;
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
      case 'fireRateBoost':
        this.weaponFireRateMult = Math.max(0.2, this.weaponFireRateMult * 0.8);
        this.showStatusMessage('-20% FIRE DELAY', '#ff8844');
        break;
      case 'damageBoost':
        p.weaponDamage += 8;
        this.showStatusMessage('+8 DAMAGE', '#ff8844');
        break;
      case 'multiShot':
        p.extraProjectiles += 1;
        this.showStatusMessage('+1 PROJECTILE', '#ffff44');
        break;
      case 'reloadSpeed':
        this.reloadTimeMult = Math.max(0.25, this.reloadTimeMult * 0.75);
        this.showStatusMessage('-25% RELOAD TIME', '#44ffcc');
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

  /**
   * Persistent resume handler for LevelUpScene (mid-round), UpgradeScene
   * (end-of-stage), and AttachmentShopScene (mid-round shop node).
   * The `nextRound` flag distinguishes the end-of-stage case.
   */
  private onSceneResume(_scene: unknown, data: ResumeData) {
    this.levelUpPending = false;

    if (data?.upgrade) {
      this.applyUpgrade(data.upgrade);
    }

    // New weapon purchased from UpgradeScene
    if (data?.newWeaponId) {
      const wep = WEAPONS.find(w => w.id === data.newWeaponId);
      if (wep) {
        // Put weapon in first empty slot; if all full, replace active slot
        const emptyIdx = this.weaponSlots.findIndex(s => s === null);
        const targetSlot = emptyIdx >= 0 ? emptyIdx : this.activeSlotIndex;
        this.weaponSlots[targetSlot] = wep;
        this.slotMagazines[targetSlot] = this.getEffectiveMagazine(wep);
        this.slotReloadTimers[targetSlot] = 0;
        // Equip the purchased weapon immediately
        this.activeSlotIndex = targetSlot;
        this.fireTimer = 0;
      }
    }

    // Attachments purchased from AttachmentShopScene
    if (data?.newAttachments && data.newAttachments.length > 0) {
      for (const { weaponId, attachmentId } of data.newAttachments) {
        const attCfg = ATTACHMENTS.find(a => a.id === attachmentId);
        if (!attCfg) continue;
        if (!this.weaponAttachments.has(weaponId)) this.weaponAttachments.set(weaponId, []);
        this.weaponAttachments.get(weaponId)!.push(attCfg);
        // Refresh magazine size for the affected weapon's slot
        const slotIdx = this.weaponSlots.findIndex(w => w?.id === weaponId);
        if (slotIdx >= 0 && this.weaponSlots[slotIdx]) {
          this.slotMagazines[slotIdx] = this.getEffectiveMagazine(this.weaponSlots[slotIdx]!);
        }
      }
      this.showStatusMessage('ATTACHMENTS INSTALLED', '#cc44ff');
    }

    if (data?.creditsSpent > 0) {
      this.scoreMgr.spendCredits(data.creditsSpent);
    }

    if (data?.nextRound) {
      this.roundMgr.nextRound();
      this.startRound();
    }
  }

  // ── Weapon slot helpers ──────────────────────────────────────────────────

  /**
   * Switch to the given weapon slot if it contains a weapon.
   * Preserves magazine and reload state for both old and new slots.
   */
  private switchToSlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= MAX_WEAPON_SLOTS) return;
    if (!this.weaponSlots[slotIndex]) return; // empty slot
    if (slotIndex === this.activeSlotIndex) return; // already active
    this.activeSlotIndex = slotIndex;
    this.fireTimer = 0; // allow immediate shot after switch (reward for weapon switching)
    const wep = this.weaponSlots[slotIndex]!;
    this.showStatusMessage(wep.label, '#00ffcc');
  }

  /**
   * Calculate the effective magazine size for a weapon, including any
   * magazine-capacity bonuses from equipped attachments.
   */
  private getEffectiveMagazine(wep: WeaponConfig): number {
    const attachments = this.weaponAttachments.get(wep.id) ?? [];
    let mag = wep.magazineSize;
    for (const att of attachments) mag += att.magazineBonus ?? 0;
    return mag;
  }

  /**
   * Build effective per-shot stats for the currently active weapon,
   * factoring in player upgrades and weapon-specific attachments.
   */
  private getEffectiveWeaponStats(wep: WeaponConfig) {
    const attachments = this.weaponAttachments.get(wep.id) ?? [];
    let damage    = wep.damage + this.player.weaponDamage;
    let fireRate  = wep.fireRate * this.weaponFireRateMult;
    let spread    = wep.spread;
    let reloadT   = wep.reloadTime * this.reloadTimeMult;
    let projCount = wep.projectileCount + this.player.extraProjectiles;
    for (const att of attachments) {
      damage    += att.damageBonus    ?? 0;
      fireRate  *= att.fireRateMult   ?? 1;
      spread    *= att.spreadMult     ?? 1;
      reloadT   *= att.reloadTimeMult ?? 1;
      projCount += att.projectileBonus ?? 0;
    }
    return { damage, fireRate, spread, reloadT, projCount };
  }

  override update(_time: number, delta: number) {
    if (!this.player || !this.player.isAlive()) {
      if (this.phase !== 'GAME_OVER') this.endRun();
      return;
    }

    this.player.update(delta);

    // Auto-aim: update player indicator toward closest enemy
    const autoTarget = this.getClosestEnemy();
    if (autoTarget) {
      this.player.updateIndicatorToTarget(autoTarget.x, autoTarget.y);
    }

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
      if (!this.overtimeMode) {
        this.overtimeMode = true;
        this.overtimeElapsedMs = 0;
        this.getUIScene()?.showMessage('⚠ OVERTIME! ⚠', '#ff4400', 2500);
      }
    }

    if (this.overtimeMode) {
      this.overtimeElapsedMs += delta;
    }

    this.heat = Math.max(0, this.heat - 0.0005 * delta);

    this.enemySpawnTimer -= delta;
    if (this.enemySpawnTimer <= 0) {
      let countMult = cfg.enemyCountMult;
      let hpMult = cfg.enemyHpMult;
      if (this.overtimeMode) {
        const overtimeSecs = this.overtimeElapsedMs / 1000;
        // Spawn count cap grows exponentially with overtime duration
        const spawnRateMult = Math.exp(overtimeSecs * OVERTIME_SPAWN_GROWTH);
        countMult *= spawnRateMult;
        // HP grows quadratically: (x²/4) added per OVERTIME_HP_TIME_UNIT seconds
        const x = overtimeSecs / OVERTIME_HP_TIME_UNIT;
        hpMult *= 1 + (x * x) / 4;
      }
      this.spawnEnemy(cfg.enemySpeedMult, countMult, hpMult);
      const interval = this.enemySpawnInterval / (1 + this.heat * 3);
      // In overtime the minimum spawn interval shrinks exponentially as well
      const minInterval = this.overtimeMode
        ? Math.max(OVERTIME_MIN_SPAWN_INTERVAL_MS, MIN_SPAWN_INTERVAL_MS / Math.exp((this.overtimeElapsedMs / 1000) * OVERTIME_SPAWN_GROWTH))
        : MIN_SPAWN_INTERVAL_MS;
      this.enemySpawnTimer = Math.max(minInterval, interval);
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

    // Weapon slot switching (keys 1 / 2 / 3)
    for (let i = 0; i < this.keysWeaponSwitch.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.keysWeaponSwitch[i])) {
        this.switchToSlot(i);
      }
    }

    // Auto-fire at the closest enemy (no mouse click required)
    // Tick all per-slot reload timers
    for (let i = 0; i < MAX_WEAPON_SLOTS; i++) {
      if (this.slotReloadTimers[i] > 0) {
        this.slotReloadTimers[i] -= delta;
        if (this.slotReloadTimers[i] <= 0) {
          const wep = this.weaponSlots[i];
          if (wep) {
            this.slotMagazines[i] = this.getEffectiveMagazine(wep);
            if (i === this.activeSlotIndex) {
              this.getUIScene()?.showMessage('RELOADED!', '#00ffcc', 600);
            }
          }
        }
      }
    }

    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }
    const closestEnemy = this.getClosestEnemy();
    const activeReloading = this.slotReloadTimers[this.activeSlotIndex] > 0;
    const activeMag = this.slotMagazines[this.activeSlotIndex];
    if (closestEnemy && this.fireTimer <= 0 && !activeReloading && activeMag > 0) {
      const stats = this.getEffectiveWeaponStats(this.currentWeapon);
      this.fireWeapon(closestEnemy.x, closestEnemy.y, stats);
      this.fireTimer = stats.fireRate;
      this.slotMagazines[this.activeSlotIndex] -= 1;
      if (this.slotMagazines[this.activeSlotIndex] <= 0) {
        // Magazine empty — begin reload cooldown
        this.slotReloadTimers[this.activeSlotIndex] = this.getEffectiveWeaponStats(this.currentWeapon).reloadT;
      }
    }

    // Update projectiles; check collision with enemies
    const projectiles = this.projectiles.getChildren() as Projectile[];
    for (let pi = projectiles.length - 1; pi >= 0; pi--) {
      const proj = projectiles[pi];
      if (!proj.active) continue;
      if (proj.tickLifetime(delta)) {
        // Area-damage projectile (grenade): explode at current position on fuse expiry
        if (proj.isAreaDamage) {
          this.triggerExplosion(proj.x, proj.y, proj.areaRadius, proj.damage, proj.effectType, proj.effectDuration);
        }
        proj.destroy();
        this.projectiles.remove(proj, false, false);
        continue;
      }
      // Area-damage projectiles only explode when their fuse expires, not on contact
      if (proj.isAreaDamage) continue;

      // Check hit against each enemy
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const enemy = enemies[ei];
        if (!enemy.active) continue;
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < PROJECTILE_HIT_RADIUS) {
          const killed = enemy.takeDamage(proj.damage);
          // Apply status effect (slow / disorient) if the weapon has one
          if (proj.effectType && proj.effectDuration) {
            enemy.applyEffect(proj.effectType, proj.effectDuration);
          }
          proj.destroy();
          this.projectiles.remove(proj, false, false);
          if (killed) {
            this.scoreMgr.addMoney(enemy.moneyReward);
            this.showFloatingMoney(enemy.x, enemy.y, enemy.moneyReward);
            enemy.destroy();
            this.enemies.remove(enemy, false, false);
            // Award XP for the kill and check for level up
            this.awardXP(XP_PER_KILL);
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

        if (node.isShopNode) {
          // Shop node — open the attachment shop overlay
          this.getUIScene()?.showMessage('SHOP FOUND!', '#cc44ff', 1000);
          this.time.delayedCall(400, () => this.showAttachmentShop());
        } else if (node.isFinalNode) {
          // Exit node — give large money reward and complete the round
          const money = FINAL_NODE_MONEY;
          this.scoreMgr.addMoney(money);
          this.showFloatingScore(node.x, node.y, money);
          this.getUIScene()?.showMessage('STAGE COMPLETE!', '#ffcc00', 1500);
          this.phase = 'ROUND_RESULT';
          // Award XP for exit node hack
          this.scoreMgr.addXP(XP_PER_EXIT);
          this.time.delayedCall(800, () => this.showUpgradeScreen());
        } else {
          // Regular node — money + stat boost + combo points + XP
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
          // Award XP for hacking and check for level up
          this.awardXP(XP_PER_HACK);
        }
      }
    });

    this.updateHUD(cfg);
  }

  /**
   * Award XP to the player and trigger a level-up overlay if the threshold
   * is reached.  Only one overlay is shown at a time.
   */
  private awardXP(amount: number) {
    const leveled = this.scoreMgr.addXP(amount);
    if (leveled && !this.levelUpPending && this.phase === 'ACTIVE') {
      this.levelUpPending = true;
      this.showLevelUpScreen();
    }
  }

  private fireWeapon(targetX: number, targetY: number, stats: ReturnType<GameScene['getEffectiveWeaponStats']>) {
    const baseAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    const wep = this.currentWeapon;
    const totalProjectiles = stats.projCount;
    const dmg = stats.damage;
    const spread = stats.spread;
    const projOptions = this.buildProjectileOptions(wep);

    for (let i = 0; i < totalProjectiles; i++) {
      let angle = baseAngle;
      if (totalProjectiles > 1) {
        const spreadStep = spread / (totalProjectiles - 1);
        angle = baseAngle - spread / 2 + i * spreadStep;
      }
      const proj = new Projectile(this, this.player.x, this.player.y, angle, dmg, projOptions);
      this.projectiles.add(proj);
    }
  }

  /** Build the visual and behaviour options for a projectile based on its weapon config. */
  private buildProjectileOptions(wep: WeaponConfig): ProjectileOptions {
    if (wep.areaRadius) {
      // Grenade: slow orange orb that explodes on fuse expiry
      return {
        speed: GRENADE_SPEED,
        lifetime: GRENADE_FUSE_MS,
        color: 0xff4400,
        strokeColor: 0xffaa00,
        visualRadius: 7,
        isAreaDamage: true,
        areaRadius: wep.areaRadius,
        effectType: wep.effectType,
        effectDuration: wep.effectDuration,
      };
    }
    if (wep.effectType) {
      // Status-effect weapon (EMP slow = blue, disorient = purple)
      return {
        color: wep.effectType === 'slow' ? 0x44aaff : 0xcc44ff,
        strokeColor: wep.effectType === 'slow' ? 0x0044ff : 0xaa00ff,
        visualRadius: 5,
        effectType: wep.effectType,
        effectDuration: wep.effectDuration,
      };
    }
    // Standard weapon — default yellow bullet
    return {};
  }

  /** Return the enemy closest to the player, or null if no enemies exist. */
  private getClosestEnemy(): Enemy | null {
    const enemies = this.enemies.getChildren() as Enemy[];
    let closest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = e;
      }
    }
    return closest;
  }

  /**
   * Trigger a grenade explosion: damage all enemies in radius, show visual.
   */
  private triggerExplosion(
    x: number, y: number,
    radius: number,
    damage: number,
    effectType?: 'slow' | 'disorient',
    effectDuration?: number,
  ) {
    const radiusSq = radius * radius;
    const enemies = this.enemies.getChildren() as Enemy[];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const enemy = enemies[ei];
      if (!enemy.active) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        const killed = enemy.takeDamage(damage);
        if (effectType && effectDuration) {
          enemy.applyEffect(effectType, effectDuration);
        }
        if (killed) {
          this.scoreMgr.addMoney(enemy.moneyReward);
          this.showFloatingMoney(enemy.x, enemy.y, enemy.moneyReward);
          enemy.destroy();
          this.enemies.remove(enemy, false, false);
          this.awardXP(XP_PER_KILL);
        }
      }
    }
    this.showExplosion(x, y, radius);
  }

  /** Visual expanding ring for a grenade explosion. */
  private showExplosion(x: number, y: number, radius: number) {
    const ring = this.add.arc(x, y, radius, 0, 360, false, 0xff6600, 0.55);
    ring.setStrokeStyle(3, 0xffcc00, 1);
    ring.setDepth(20);
    ring.setScale(0.05);
    this.tweens.add({
      targets: ring,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private getUIScene(): UIScene | null {
    return this.scene.get('UIScene') as UIScene | null;
  }

  private spawnEnemy(speedMult: number, countMult: number, hpMult: number) {
    const maxEnemies = Math.floor(4 * countMult + this.heat * 8);
    const current = this.enemies.getLength();
    if (current >= maxEnemies) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = 420;
    const ex = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 50, WORLD_WIDTH - 50);
    const ey = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 50, WORLD_HEIGHT - 50);
    const enemy = new Enemy(this, ex, ey, speedMult + this.heat * 0.5, hpMult);
    this.enemies.add(enemy);
  }

  /**
   * Pause GameScene and show the XP level-up overlay (LevelUpScene).
   * Only one can be active at a time.
   */
  private showLevelUpScreen() {
    this.scene.pause('GameScene');
    this.scene.launch('LevelUpScene', {
      playerLevel: this.scoreMgr.playerLevel,
      xpToNext: this.scoreMgr.xpToNext,
    });
  }

  /** Pause GameScene and show the weapon shop (UpgradeScene) after stage completion. */
  private showUpgradeScreen() {
    const cfg = this.roundMgr.getRoundConfig();
    this.scene.pause('GameScene');
    this.scene.launch('UpgradeScene', {
      round: cfg.round,
      score: this.scoreMgr.score,
      credits: this.scoreMgr.credits,
      weaponSlots: this.weaponSlots.map(w => w?.id ?? null),
      activeSlotIndex: this.activeSlotIndex,
    });
  }

  /** Pause GameScene and show the attachment shop (AttachmentShopScene) after a shop node hack. */
  private showAttachmentShop() {
    if (this.phase !== 'ACTIVE') return;
    this.scene.pause('GameScene');
    const equippedAttachments: Record<string, string[]> = {};
    for (const [weaponId, atts] of this.weaponAttachments.entries()) {
      equippedAttachments[weaponId] = atts.map(a => a.id);
    }
    this.scene.launch('AttachmentShopScene', {
      credits: this.scoreMgr.credits,
      weaponSlots: this.weaponSlots.map(w => w?.id ?? null),
      equippedAttachments,
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

    // Build per-slot HUD info
    const weaponSlots = this.weaponSlots.map((wep, i) => {
      if (!wep) return null;
      const effMag   = this.getEffectiveMagazine(wep);
      const reloading = this.slotReloadTimers[i] > 0;
      const effReload = this.getEffectiveWeaponStats(wep).reloadT;
      return {
        label: wep.label,
        magRemaining: this.slotMagazines[i],
        magSize: effMag,
        isReloading: reloading,
        reloadFrac: reloading ? 1 - this.slotReloadTimers[i] / effReload : 0,
      };
    });

    try {
      this.getUIScene()?.updateHUD({
        score: this.scoreMgr.score,
        credits: this.scoreMgr.credits,
        round: this.roundMgr.round,
        timerSec: this.roundTimerMs / 1000,
        bonusMode: this.overtimeMode,
        hp: this.player.hp,
        heat: this.heat,
        combo: this.scoreMgr.combo,
        nodesHacked: this.roundMgr.nodesHacked,
        nodesTotal: cfg.nodesRequired + 2,
        dashCooldownFrac: this.player.dashCooldownRemaining / this.player.dashCooldownMs,
        exitHacked,
        playerLevel: this.scoreMgr.playerLevel,
        xp: this.scoreMgr.xp,
        xpToNext: this.scoreMgr.xpToNext,
        weaponSlots,
        activeSlotIndex: this.activeSlotIndex,
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
