export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SPEED = 200;
export const DASH_SPEED = 550;
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
export const ENEMY_DAMAGE = 20;
export const ENEMY_HIT_COOLDOWN = 800;
export const ENEMY_HP = 30;
export const ENEMY_KILL_MONEY = 30;

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

/** XP awarded for killing an enemy */
export const XP_PER_KILL = 15;
/** XP awarded for hacking a regular node */
export const XP_PER_HACK = 50;
/** XP awarded for hacking the exit node */
export const XP_PER_EXIT = 100;
/** XP needed per level (flat per level — resets each time) */
export const XP_PER_LEVEL = 200;

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
}

export const WEAPONS: WeaponConfig[] = [
  { id: 'pistol',   label: '🔫 PISTOL',   desc: 'Balanced auto-fire',           cost: 0,   fireRate: 400,  damage: 5,  projectileCount: 1, spread: 0    },
  { id: 'smg',      label: '⚡ SMG',       desc: 'Rapid fire, lower damage',     cost: 150, fireRate: 130,  damage: 7,  projectileCount: 1, spread: 0.05 },
  { id: 'shotgun',  label: '💥 SHOTGUN',  desc: '3-shot burst, slow reload',     cost: 300, fireRate: 750,  damage: 18, projectileCount: 3, spread: 0.3  },
  { id: 'sniper',   label: '🎯 SNIPER',   desc: 'High damage, slow fire',        cost: 500, fireRate: 1400, damage: 45, projectileCount: 1, spread: 0    },
  { id: 'grenade',  label: '💣 GRENADE',  desc: 'Area blast, disorienting foes', cost: 400, fireRate: 1600, damage: 40, projectileCount: 1, spread: 0,   areaRadius: 100, effectType: 'disorient', effectDuration: 1500 },
  { id: 'emp',      label: '🧊 EMP RIFLE', desc: 'Slows enemies on hit',          cost: 450, fireRate: 800,  damage: 12, projectileCount: 1, spread: 0,   effectType: 'slow', effectDuration: 2000 },
];

export const UPGRADES: Upgrade[] = [
  { id: 'hackSpeed',       label: '⚡ FAST INJECT',  desc: '+40% hack speed'         },
  { id: 'moveSpeed',       label: '🏃 GHOST STEP',   desc: '+35 move speed'          },
  { id: 'dashCooldown',    label: '⚙️  QUICK BOOST',  desc: '-35% dash cooldown'      },
  { id: 'scoreMultiplier', label: '💰 DATA BROKER',   desc: '+0.5× score multiplier'  },
  { id: 'hpRegen',         label: '💉 NANO-PATCH',    desc: 'Restore 40 HP'           },
  { id: 'comboWindow',     label: '🔗 CHAIN HACK',    desc: '+1.5s combo window'      },
  { id: 'fireRateBoost',   label: '🔥 OVERCLOCK',     desc: '-20% weapon fire delay'  },
  { id: 'damageBoost',     label: '⚔️ NEURAL AMP',    desc: '+8 weapon damage'        },
  { id: 'multiShot',       label: '🔱 SPLIT SHOT',    desc: '+1 projectile/shot'      },
];

export interface Upgrade {
  id: string;
  label: string;
  desc: string;
}

export const BEST_SCORE_KEY = 'netrunner_best_score';
