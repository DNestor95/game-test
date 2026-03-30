/**
 * SpawnDirector — budget-based spawn system with pulse cadence, weight tables,
 * position rules, and an AI director layer.
 *
 * Integrates with the existing RoundManager (round number, HP multiplier) and
 * the GameScene (player state, enemy group).
 */

import { EnemyTypeId, EnemyTypeConfig, ENEMY_TYPES, getSpawnWeights, pickEnemyType } from '../config/EnemyTypes';
import {
  WORLD_WIDTH, WORLD_HEIGHT,
  SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS, SPAWN_SPEED_FACTOR,
  SPAWN_BUDGET_BASE, SPAWN_BUDGET_LINEAR, SPAWN_BUDGET_EXPO,
  SPAWN_MAX_ENEMIES,
} from '../config/GameConfig';

// ── Budget helpers ──────────────────────────────────────────────────────────

/** Compute the total spawn budget for a given round. */
export function roundBudget(round: number): number {
  return SPAWN_BUDGET_BASE + SPAWN_BUDGET_LINEAR * round + SPAWN_BUDGET_EXPO * Math.pow(round, 1.25);
}

/** Number of spawn pulses inside the round. */
export function pulseCount(round: number): number {
  return 3 + Math.floor(round / 3);
}

/** Seconds between consecutive pulses. */
export function pulseDelay(round: number): number {
  return Math.max(0.5, 2.8 - 0.1 * round);
}

// ── Director state ──────────────────────────────────────────────────────────

export interface DirectorContext {
  /** Player's current HP fraction (0-1) */
  playerHpFrac: number;
  /** Number of alive enemies currently in the world */
  aliveEnemies: number;
  /** Hard cap on simultaneous enemies */
  maxAllowedEnemies: number;
}

export class SpawnDirector {
  // ── Round-level state ─────────────────────────────────────────────────
  private _round = 0;
  private _totalBudget = 0;
  private _remainingBudget = 0;
  private _pulseCount = 0;
  private _pulseBudget = 0;
  private _pulseDelayMs = 0;
  private _pulseTimer = 0;
  private _pulseIndex = 0;
  private _hpMult = 1;
  private _speedMult = 1;

  /** Whether a boss has been reserved this round */
  private _bossReserved = false;
  private _bossSpawned = false;
  /** Fraction of budget reserved for elites on elite rounds */
  private _eliteReserveFrac = 0;

  // ── Director aggression ───────────────────────────────────────────────
  /** Multiplier applied to each pulse budget by the AI director (0.85–1.15) */
  private _aggressionMult = 1;

  /**
   * Initialise the director for a new round.
   * Call once at the start of each round (before the first update tick).
   */
  startRound(round: number, hpMult: number, speedMult: number) {
    this._round = round;
    this._hpMult = hpMult;
    this._speedMult = speedMult;
    this._totalBudget = roundBudget(round);
    this._pulseCount = pulseCount(round);
    this._pulseDelayMs = pulseDelay(round) * 1000;
    this._pulseIndex = 0;
    this._aggressionMult = 1;

    // Boss rounds: every 10 rounds
    this._bossReserved = round > 0 && round % 10 === 0;
    this._bossSpawned = false;

    // Elite rounds: every 4 rounds — reserve 20% budget for elites
    this._eliteReserveFrac = (round >= 4 && round % 4 === 0) ? 0.20 : 0;

    // If boss round, subtract boss cost from the budget
    let budget = this._totalBudget;
    if (this._bossReserved) {
      budget -= ENEMY_TYPES.boss.cost;
    }
    this._remainingBudget = budget;
    this._pulseBudget = this._remainingBudget / this._pulseCount;

    // Start the first pulse immediately
    this._pulseTimer = 0;
  }

  /** Current round number. */
  get round() { return this._round; }

  /** True once every pulse in the round has been spent. */
  get roundSpawningDone() {
    return this._pulseIndex >= this._pulseCount && this._remainingBudget <= 0;
  }

  /**
   * Tick the director.
   * @returns An array of enemy spawn requests for this frame (may be empty).
   */
  update(delta: number, ctx: DirectorContext, playerX: number, playerY: number): SpawnRequest[] {
    if (this._pulseIndex >= this._pulseCount && !this._bossNeedSpawn()) return [];

    this._pulseTimer -= delta;
    if (this._pulseTimer > 0) return [];

    // Reset timer for next pulse
    this._pulseTimer = this._pulseDelayMs;

    // ── AI Director aggression adjustment ──────────────────────────────
    const threat = ctx.aliveEnemies / Math.max(1, ctx.maxAllowedEnemies);
    if (threat > 0.9) {
      // Field is full → delay this pulse (skip it, timer resets)
      return [];
    }
    if (ctx.playerHpFrac < 0.35) {
      this._aggressionMult = 0.85;
    } else if (ctx.playerHpFrac > 0.9 && threat < 0.3) {
      this._aggressionMult = 1.15;
    } else {
      this._aggressionMult = 1;
    }

    const requests: SpawnRequest[] = [];

    // ── Boss spawn (first pulse of a boss round) ───────────────────────
    if (this._bossNeedSpawn()) {
      const pos = this._pickSpawnPos(ENEMY_TYPES.boss, playerX, playerY);
      requests.push({ type: ENEMY_TYPES.boss, x: pos.x, y: pos.y, hpMult: this._hpMult, speedMult: this._speedMult });
      this._bossSpawned = true;
    }

    // ── Spend pulse budget on regular enemies ──────────────────────────
    if (this._pulseIndex < this._pulseCount) {
      let pulseBudget = this._pulseBudget * this._aggressionMult;
      // On elite rounds inject extra elites into some pulses
      const weights = getSpawnWeights(this._round);

      const spawnCap = ctx.maxAllowedEnemies - ctx.aliveEnemies;
      let spawned = 0;

      while (pulseBudget >= 1 && this._remainingBudget >= 1 && spawned < spawnCap) {
        let typeId: EnemyTypeId;

        // On elite rounds, force some elites
        if (this._eliteReserveFrac > 0 && Math.random() < this._eliteReserveFrac && this._remainingBudget >= ENEMY_TYPES.elite.cost) {
          typeId = 'elite';
        } else {
          typeId = pickEnemyType(weights);
        }

        const typeCfg = ENEMY_TYPES[typeId];
        if (typeCfg.cost > this._remainingBudget || typeCfg.cost > pulseBudget) {
          // Can't afford this type — fall back to grunt
          if (ENEMY_TYPES.grunt.cost > this._remainingBudget) break;
          typeId = 'grunt';
        }

        const cfg = ENEMY_TYPES[typeId];
        const pos = this._pickSpawnPos(cfg, playerX, playerY);
        requests.push({ type: cfg, x: pos.x, y: pos.y, hpMult: this._hpMult, speedMult: this._speedMult });
        pulseBudget -= cfg.cost;
        this._remainingBudget -= cfg.cost;
        spawned++;
      }

      this._pulseIndex++;
    }

    return requests;
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private _bossNeedSpawn(): boolean {
    return this._bossReserved && !this._bossSpawned;
  }

  /**
   * Pick a spawn position in a ring around the player.
   * Fast enemies are pushed farther out for fairness.
   */
  private _pickSpawnPos(cfg: EnemyTypeConfig, playerX: number, playerY: number): { x: number; y: number } {
    const effectiveMinRadius = SPAWN_MIN_RADIUS + cfg.baseSpeed * SPAWN_SPEED_FACTOR;
    const minR = effectiveMinRadius;
    const maxR = Math.max(minR + 40, SPAWN_MAX_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    const dist = minR + Math.random() * (maxR - minR);
    const x = Phaser.Math.Clamp(playerX + Math.cos(angle) * dist, 50, WORLD_WIDTH - 50);
    const y = Phaser.Math.Clamp(playerY + Math.sin(angle) * dist, 50, WORLD_HEIGHT - 50);
    return { x, y };
  }
}

// We need Phaser for Math.Clamp — import at module level
import Phaser from 'phaser';

/** A single enemy spawn request emitted by the director. */
export interface SpawnRequest {
  type: EnemyTypeConfig;
  x: number;
  y: number;
  hpMult: number;
  speedMult: number;
}
