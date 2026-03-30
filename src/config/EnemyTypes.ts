/**
 * Enemy type definitions for the budget-based spawn system.
 *
 * Each type has distinct stats, visuals, spawn cost, and (optionally) special
 * behaviour such as the Exploder's on-death detonation.
 */

export type EnemyTypeId = 'grunt' | 'fast' | 'tank' | 'exploder' | 'elite' | 'boss';

export interface EnemyTypeConfig {
  id: EnemyTypeId;
  label: string;
  /** Budget cost consumed when this enemy is spawned */
  cost: number;
  /** Base hit-points before round scaling */
  baseHp: number;
  /** Base move speed (px/s) before round scaling */
  baseSpeed: number;
  /** Contact damage dealt to the player */
  baseDamage: number;
  /** Physics + visual body radius */
  bodyRadius: number;
  /** Core circle fill colour */
  coreColor: number;
  /** Core circle stroke colour */
  strokeColor: number;
  /** "Eye" highlight colour */
  eyeColor: number;
  /** Credits awarded on kill */
  moneyReward: number;
  /** If set, the enemy detonates on death in this radius (px) */
  explodeRadius?: number;
  /** Damage dealt by the on-death explosion */
  explodeDamage?: number;
}

// ── Type definitions ────────────────────────────────────────────────────────

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeConfig> = {
  grunt: {
    id: 'grunt',
    label: 'Grunt',
    cost: 1,
    baseHp: 50,
    baseSpeed: 75,
    baseDamage: 20,
    bodyRadius: 14,
    coreColor: 0x220000,
    strokeColor: 0xff2200,
    eyeColor: 0xff4444,
    moneyReward: 25,
  },
  fast: {
    id: 'fast',
    label: 'Runner',
    cost: 1.5,
    baseHp: 30,
    baseSpeed: 140,
    baseDamage: 15,
    bodyRadius: 11,
    coreColor: 0x001a22,
    strokeColor: 0x00ccff,
    eyeColor: 0x66eeff,
    moneyReward: 30,
  },
  tank: {
    id: 'tank',
    label: 'Tank',
    cost: 4,
    baseHp: 200,
    baseSpeed: 45,
    baseDamage: 35,
    bodyRadius: 20,
    coreColor: 0x1a1a00,
    strokeColor: 0xccaa00,
    eyeColor: 0xffdd44,
    moneyReward: 60,
  },
  exploder: {
    id: 'exploder',
    label: 'Exploder',
    cost: 3,
    baseHp: 60,
    baseSpeed: 85,
    baseDamage: 20,
    bodyRadius: 13,
    coreColor: 0x220a00,
    strokeColor: 0xff6600,
    eyeColor: 0xff9944,
    moneyReward: 45,
    explodeRadius: 80,
    explodeDamage: 30,
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    cost: 10,
    baseHp: 300,
    baseSpeed: 65,
    baseDamage: 40,
    bodyRadius: 18,
    coreColor: 0x0a001a,
    strokeColor: 0xaa44ff,
    eyeColor: 0xcc88ff,
    moneyReward: 100,
  },
  boss: {
    id: 'boss',
    label: 'Boss',
    cost: 35,
    baseHp: 1000,
    baseSpeed: 50,
    baseDamage: 50,
    bodyRadius: 28,
    coreColor: 0x1a0000,
    strokeColor: 0xff0044,
    eyeColor: 0xff4488,
    moneyReward: 250,
  },
};

// ── Spawn weight tables (probability by round bracket) ──────────────────────

export interface SpawnWeightEntry {
  type: EnemyTypeId;
  weight: number;
}

export type SpawnWeightTable = SpawnWeightEntry[];

const WEIGHTS_EARLY: SpawnWeightTable = [
  { type: 'grunt', weight: 75 },
  { type: 'fast', weight: 20 },
  { type: 'tank', weight: 5 },
];

const WEIGHTS_MID: SpawnWeightTable = [
  { type: 'grunt', weight: 50 },
  { type: 'fast', weight: 25 },
  { type: 'tank', weight: 15 },
  { type: 'exploder', weight: 10 },
];

const WEIGHTS_LATE: SpawnWeightTable = [
  { type: 'grunt', weight: 35 },
  { type: 'fast', weight: 20 },
  { type: 'tank', weight: 20 },
  { type: 'exploder', weight: 15 },
  { type: 'elite', weight: 10 },
];

const WEIGHTS_ENDGAME: SpawnWeightTable = [
  { type: 'grunt', weight: 25 },
  { type: 'fast', weight: 20 },
  { type: 'tank', weight: 20 },
  { type: 'exploder', weight: 15 },
  { type: 'elite', weight: 15 },
  // Boss handled separately (every 10 rounds)
];

/**
 * Return the spawn weight table appropriate for the given round number.
 */
export function getSpawnWeights(round: number): SpawnWeightTable {
  if (round <= 3) return WEIGHTS_EARLY;
  if (round <= 7) return WEIGHTS_MID;
  if (round <= 12) return WEIGHTS_LATE;
  return WEIGHTS_ENDGAME;
}

/**
 * Pick a random enemy type from a weight table.
 */
export function pickEnemyType(weights: SpawnWeightTable): EnemyTypeId {
  const total = weights.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return weights[weights.length - 1].type;
}
