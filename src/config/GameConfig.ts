export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SPEED = 140;
export const DASH_SPEED = 400;
export const DASH_DURATION = 180;
export const DASH_COOLDOWN = 2500;

export const PLAYER_MAX_HP = 100;
export const PLAYER_INVINCIBLE_MS = 1000;

export const HACK_RADIUS = 90;
export const HACK_TIME_MS = 1500;
export const HACK_COMBO_WINDOW_MS = 3500;

export const BASE_SCORE = 100;

export const HEAT_PER_HACK = 0.08;
export const HEAT_DAMAGE_SPIKE = 0.12;

export const ENEMY_BASE_SPEED = 75;
export const ENEMY_DAMAGE = 25;
export const ENEMY_HIT_COOLDOWN = 800;
export const ENEMY_HP = 60;
export const ENEMY_KILL_MONEY = 30;

// ── SPAWN DIRECTOR CONFIGURATION ─────────────────────
/** Base spawn budget added every round */
export const SPAWN_BUDGET_BASE = 18;
/** Linear scaling factor: budget += LINEAR * round */
export const SPAWN_BUDGET_LINEAR = 5;
/** Exponential scaling factor: budget += EXPO * round^1.25 */
export const SPAWN_BUDGET_EXPO = 2;
/** Minimum distance (px) from the player for a new spawn */
export const SPAWN_MIN_RADIUS = 300;
/** Maximum distance (px) from the player for a new spawn */
export const SPAWN_MAX_RADIUS = 500;
/** Extra spawn distance per unit of enemy base speed (fairness for fast enemies) */
export const SPAWN_SPEED_FACTOR = 0.6;
/** Hard cap on simultaneous alive enemies in the world */
export const SPAWN_MAX_ENEMIES = 60;

export const NODE_HACK_MONEY = 250;
export const FINAL_NODE_MONEY = 500;

export const PROJECTILE_SPEED = 650;
export const PROJECTILE_LIFETIME = 1800;
export const PROJECTILE_HIT_RADIUS = 20;

export const GRENADE_RADIUS = 100;
export const GRENADE_SPEED = 380;
export const GRENADE_FUSE_MS = 900;
export const SLOW_SPEED_MULT = 0.35;

export const ROUND_BASE_TIMER_S = 35;
export const ROUND_BASE_NODES = 4;

/**
 * Exponential growth constant for overtime spawn rate.
 * The spawn count cap is multiplied by e^(overtimeSecs * OVERTIME_SPAWN_GROWTH),
 * and the minimum spawn interval floor decreases at the same rate.
 * At this value the spawn rate roughly doubles every ~17 seconds of overtime.
 */
export const OVERTIME_SPAWN_GROWTH = 0.04;

/**
 * Time unit (in seconds) for the overtime HP scaling formula.
 * Enemy HP multiplier in overtime = base * (1 + (overtimeSecs / OVERTIME_HP_TIME_UNIT)² / 4).
 * Every OVERTIME_HP_TIME_UNIT seconds of overtime adds 0.25× to the HP multiplier.
 */
export const OVERTIME_HP_TIME_UNIT = 10;

/**
 * Minimum spawn interval (ms) under normal conditions.
 * Heat further reduces the effective interval, but it is capped at this floor.
 */
export const MIN_SPAWN_INTERVAL_MS = 400;

/**
 * Absolute minimum spawn interval (ms) that overtime escalation can reach.
 * Prevents spawning from becoming instantaneous at very long overtime durations.
 */
export const OVERTIME_MIN_SPAWN_INTERVAL_MS = 100;

/**
 * Base lull duration (ms) inserted between wave cycles within a stage.
 * Gives the player brief breathing room to complete hack nodes.
 * Decreases as the round and wave index increase.
 */
export const WAVE_LULL_BASE_MS = 5000;

/**
 * Minimum lull duration (ms) between wave cycles.
 * The lull will never fall below this value regardless of round or wave index.
 */
export const WAVE_LULL_MIN_MS = 2000;

/**
 * Fractional budget growth applied each time a new wave cycle starts within
 * a stage (e.g. 0.3 = +30% budget per wave cycle).  Ramps up pressure as
 * the player lingers without completing the exit node.
 */
export const WAVE_INTENSITY_SCALE = 0.3;

/**
 * How many ms the lull shortens per round number.
 * Higher rounds experience shorter breathing windows between wave cycles.
 */
export const WAVE_LULL_ROUND_DECREASE_MS = 150;

/**
 * How many ms the lull shortens per completed wave cycle within a stage.
 * Later waves press harder with less recovery time between them.
 */
export const WAVE_LULL_WAVE_DECREASE_MS = 400;

/** XP awarded for killing an enemy */
export const XP_PER_KILL = 15;
/** XP awarded for hacking a regular node */
export const XP_PER_HACK = 50;
/** XP awarded for hacking the exit node */
export const XP_PER_EXIT = 100;
/** XP needed per level (flat per level — resets each time) */
export const XP_PER_LEVEL = 100;

/** Maximum number of weapon slots the player can carry */
export const MAX_WEAPON_SLOTS = 3;

/** Base seed constant for procedural level generation */
export const BASE_LEVEL_SEED = 0xDEAD;

/**
 * Create a deterministic pseudo-random number generator (Mulberry32).
 * The seed determines the full sequence, making levels reproducible.
 */
export function createSeededRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StatBoostType = 'speed' | 'damage' | 'projectile';

export const STAT_BOOST_VALUES: Record<StatBoostType, number> = {
  speed: 15,
  damage: 5,
  projectile: 1,
};

export interface WeaponConfig {
  id: string;
  label: string;
  desc: string;
  cost: number;
  fireRate: number;
  damage: number;
  projectileCount: number;
  spread: number;
  /** If set, projectile explodes in an area on impact or fuse expiry */
  areaRadius?: number;
  /** Status effect applied to enemies hit by this weapon */
  effectType?: 'slow' | 'disorient';
  /** Duration of the status effect in ms */
  effectDuration?: number;
  /** Number of shots before a mandatory reload cooldown */
  magazineSize: number;
  /** Duration of the reload cooldown in ms */
  reloadTime: number;
}

export const WEAPONS: WeaponConfig[] = [
  { id: 'pistol',   label: '🔫 PISTOL',   desc: 'Balanced auto-fire',           cost: 0,   fireRate: 800,  damage: 5,  projectileCount: 1, spread: 0,    magazineSize: 6,  reloadTime: 2500 },
  { id: 'smg',      label: '⚡ SMG',       desc: 'Rapid fire, lower damage',     cost: 150, fireRate: 130,  damage: 7,  projectileCount: 1, spread: 0.05, magazineSize: 20, reloadTime: 3000 },
  { id: 'shotgun',  label: '💥 SHOTGUN',  desc: '3-shot burst, slow reload',     cost: 300, fireRate: 750,  damage: 18, projectileCount: 3, spread: 0.3,  magazineSize: 4,  reloadTime: 3000 },
  { id: 'sniper',   label: '🎯 SNIPER',   desc: 'High damage, slow fire',        cost: 500, fireRate: 1400, damage: 45, projectileCount: 1, spread: 0,    magazineSize: 3,  reloadTime: 3500 },
  { id: 'grenade',  label: '💣 GRENADE',  desc: 'Area blast, disorienting foes', cost: 400, fireRate: 1600, damage: 40, projectileCount: 1, spread: 0,    magazineSize: 2,  reloadTime: 4000, areaRadius: 100, effectType: 'disorient', effectDuration: 1500 },
  { id: 'emp',      label: '🧊 EMP RIFLE', desc: 'Slows enemies on hit',          cost: 450, fireRate: 800,  damage: 12, projectileCount: 1, spread: 0,    magazineSize: 4,  reloadTime: 3200, effectType: 'slow', effectDuration: 2000 },
];

export const UPGRADES: Upgrade[] = [
  { id: 'hackSpeed',       label: '⚡ FAST INJECT',   desc: '+40% hack speed'         },
  { id: 'moveSpeed',       label: '🏃 GHOST STEP',    desc: '+35 move speed'          },
  { id: 'dashCooldown',    label: '⚙️  QUICK BOOST',   desc: '-35% dash cooldown'      },
  { id: 'scoreMultiplier', label: '💰 DATA BROKER',    desc: '+0.5× score multiplier'  },
  { id: 'hpRegen',         label: '💉 NANO-PATCH',     desc: 'Restore 40 HP'           },
  { id: 'comboWindow',     label: '🔗 CHAIN HACK',     desc: '+1.5s combo window'      },
  { id: 'fireRateBoost',   label: '🔥 OVERCLOCK',      desc: '-20% weapon fire delay'  },
  { id: 'damageBoost',     label: '⚔️ NEURAL AMP',     desc: '+8 weapon damage'        },
  { id: 'multiShot',       label: '🔱 SPLIT SHOT',     desc: '+1 projectile/shot'      },
  { id: 'reloadSpeed',     label: '🔄 QUICK RELOAD',   desc: '-25% reload time'        },
];

export interface Upgrade {
  id: string;
  label: string;
  desc: string;
}

export const BEST_SCORE_KEY = 'netrunner_best_score';

/**
 * Weapon attachment that can be bought from mid-game shop nodes and applied
 * to a specific weapon to augment its stats.
 */
export interface AttachmentConfig {
  id: string;
  label: string;
  desc: string;
  cost: number;
  /** If set, only applies to weapons with these IDs; if absent, applies to any weapon */
  weaponFilter?: string[];
  /** Flat bonus added to base damage */
  damageBonus?: number;
  /** Fire-rate multiplier (< 1 = faster) */
  fireRateMult?: number;
  /** Extra shots added to the weapon's magazine capacity */
  magazineBonus?: number;
  /** Spread multiplier applied to the weapon's base spread (< 1 = tighter) */
  spreadMult?: number;
  /** Reload-time multiplier (< 1 = faster) */
  reloadTimeMult?: number;
  /** Extra projectiles added per shot */
  projectileBonus?: number;
}

export const ATTACHMENTS: AttachmentConfig[] = [
  { id: 'scope',     label: '🔭 SCOPE',          desc: '+20 damage (pistol/sniper)', cost: 200, weaponFilter: ['pistol', 'sniper'],   damageBonus: 20 },
  { id: 'extmag',    label: '📎 EXT. MAGAZINE',  desc: '+4 magazine capacity',       cost: 150,                                      magazineBonus: 4 },
  { id: 'suppressor',label: '🔇 SUPPRESSOR',     desc: '-20% fire delay',            cost: 180,                                      fireRateMult: 0.8 },
  { id: 'foregrip',  label: '🤝 FOREGRIP',       desc: '-50% spread (SMG/Shotgun)',  cost: 160, weaponFilter: ['smg', 'shotgun'],     spreadMult: 0.5 },
  { id: 'drum',      label: '🥁 DRUM MAG',       desc: '+10 mag (SMG/Shotgun)',      cost: 250, weaponFilter: ['smg', 'shotgun'],     magazineBonus: 10 },
  { id: 'hollowpt',  label: '💀 HOLLOW POINT',   desc: '+10 damage',                 cost: 220,                                      damageBonus: 10 },
  { id: 'quickdraw', label: '⚡ QUICK DRAW',     desc: '-25% reload time',           cost: 200,                                      reloadTimeMult: 0.75 },
  { id: 'fragrnds',  label: '💥 FRAG ROUNDS',    desc: '+1 projectile/shot (shotgun/grenade)', cost: 300, weaponFilter: ['shotgun', 'grenade'], projectileBonus: 1 },
];
