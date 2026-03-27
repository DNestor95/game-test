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

export const ROUND_BASE_TIMER_S = 35;
export const ROUND_BASE_NODES = 4;

export const UPGRADES: Upgrade[] = [
  { id: 'hackSpeed',       label: '⚡ FAST INJECT',  desc: '+40% hack speed'         },
  { id: 'moveSpeed',       label: '🏃 GHOST STEP',   desc: '+35 move speed'          },
  { id: 'dashCooldown',    label: '⚙️  QUICK BOOST',  desc: '-35% dash cooldown'      },
  { id: 'scoreMultiplier', label: '💰 DATA BROKER',   desc: '+0.5× score multiplier'  },
  { id: 'hpRegen',         label: '💉 NANO-PATCH',    desc: 'Restore 40 HP'           },
  { id: 'comboWindow',     label: '🔗 CHAIN HACK',    desc: '+1.5s combo window'      },
];

export interface Upgrade {
  id: string;
  label: string;
  desc: string;
}

export const BEST_SCORE_KEY = 'netrunner_best_score';
