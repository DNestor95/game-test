import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { HackNode } from '../objects/HackNode';
import { Enemy } from '../objects/Enemy';
import { RoundManager } from '../systems/RoundManager';
import { ScoreManager } from '../systems/ScoreManager';
import { UIScene } from './UIScene';
import {
  GAME_WIDTH, GAME_HEIGHT,
  WORLD_WIDTH, WORLD_HEIGHT,
  HEAT_PER_HACK, HEAT_DAMAGE_SPIKE,
  Upgrade,
} from '../config/GameConfig';

type RoundPhase = 'INTRO' | 'ACTIVE' | 'ROUND_RESULT' | 'GAME_OVER';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private nodes: HackNode[] = [];
  private enemies!: Phaser.GameObjects.Group;
  private roundMgr!: RoundManager;
  private scoreMgr!: ScoreManager;

  private heat = 0;
  private roundTimerMs = 0;
  private phase: RoundPhase = 'INTRO';
  private introTimer = 0;
  private introCountdown = 3;

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 4000;

  private introText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.roundMgr = new RoundManager();
    this.scoreMgr = new ScoreManager();
    this.heat = 0;
    this.phase = 'INTRO';
    this.introTimer = 1000;
    this.introCountdown = 3;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawBackground();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.enemies = this.add.group();

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

    const total = cfg.nodesRequired + 2;
    for (let i = 0; i < total; i++) {
      const nx = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const ny = Phaser.Math.Between(100, WORLD_HEIGHT - 100);
      this.nodes.push(new HackNode(this, nx, ny));
    }

    this.introText.setText('3');
  }

  private applyUpgrade(upgrade: Upgrade) {
    const p = this.player;
    switch (upgrade.id) {
      case 'hackSpeed':
        this.nodes.forEach(n => { n.hackTimeMs *= 0.6; });
        break;
      case 'moveSpeed':
        // speed boost applied via player base speed — no direct mutable field in this impl
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

    this.nodes.forEach(node => {
      if (!node.hacked) {
        const inRange = node.isPlayerInRange(this.player.x, this.player.y);
        node.updateHack(delta, inRange, this.player.isHackKeyDown());
      }
    });

    this.nodes.forEach(node => {
      if (node.hacked && node.hackProgress >= 1 && node.hackProgress < 1.1) {
        node.hackProgress = 1.1;
        this.roundMgr.hackNode();
        const pts = this.scoreMgr.addHackScore(this.time.now);
        this.heat = Math.min(1, this.heat + HEAT_PER_HACK);
        this.showFloatingScore(node.x, node.y, pts);
      }
    });

    if (this.roundMgr.isRoundComplete(cfg)) {
      this.phase = 'ROUND_RESULT';
      this.showUpgradeScreen();
      return;
    }

    this.updateHUD(cfg);
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
    this.scene.launch('UpgradeScene', { round: cfg.round, score: this.scoreMgr.score });

    this.events.once('resume', (_scene: unknown, data: { upgrade?: Upgrade }) => {
      if (data?.upgrade) {
        this.applyUpgrade(data.upgrade);
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
    try {
      this.getUIScene()?.updateHUD({
        score: this.scoreMgr.score,
        round: this.roundMgr.round,
        timerSec: this.roundTimerMs / 1000,
        hp: this.player.hp,
        heat: this.heat,
        combo: this.scoreMgr.combo,
        nodesHacked: this.roundMgr.nodesHacked,
        nodesRequired: cfg.nodesRequired,
        dashCooldownFrac: this.player.dashCooldownRemaining / this.player.dashCooldownMs,
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
}
