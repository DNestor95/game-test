// ─── Game Configuration ────────────────────────────────────────────────────

const TILE = Object.freeze({
  FLOOR:    0,
  WALL:     1,
  TERMINAL: 2,
  DOOR:     3,
});

const TILE_SIZE  = 32;
const MAP_W      = 100;
const MAP_H      = 100;

// Speeds (pixels / second)
const PLAYER_SPEED        = 130;
const SPRINT_SPEED        = 220;
const POLICE_PATROL_SPEED = 55;
const POLICE_CHASE_SPEED  = 115;
const CIVILIAN_SPEED      = 45;

// Heat (wanted level)
const HEAT_MAX             = 100;
const HEAT_DECAY_RATE      = 1.5;   // per second while hidden
const HEAT_DETECT_THRESH   = 30;    // police notice you
const HEAT_CHASE_THRESH    = 60;    // police actively chase

// Ability cooldowns (seconds)
const ABILITY_COOLDOWN = [6, 10, 18, 4]; // Hack, Steal, Bribe, Sprint

// Item types
const ITEM = Object.freeze({
  CREDITS:    'credits',
  HACK_TOOL:  'hack_tool',
  DISGUISE:   'disguise',
  WEAPON:     'weapon',
  MED_KIT:    'med_kit',
});

// NPC types
const NPC_TYPE = Object.freeze({
  POLICE:   'police',
  CIVILIAN: 'civilian',
});

// Game states
const STATE = Object.freeze({
  MENU:      'menu',
  PLAYING:   'playing',
  INVENTORY: 'inventory',
  HACKING:   'hacking',
  GAME_OVER: 'game_over',
  WIN:       'win',
});

// Colours
const C = Object.freeze({
  BG:              '#070b14',
  FLOOR:           '#111827',
  FLOOR_ALT:       '#0f1720',
  ROAD:            '#141d2e',
  WALL:            '#0a1224',
  WALL_FACE:       '#152040',
  WALL_TOP:        '#1a2d50',
  TERMINAL:        '#00ff9f',
  TERMINAL_DIM:    '#005533',
  TERMINAL_BG:     '#001a0d',
  DOOR:            '#e94560',
  DOOR_OPEN:       '#ff8a9a',

  PLAYER:          '#00ff9f',
  PLAYER_GLOW:     'rgba(0,255,159,0.25)',
  PLAYER_DARK:     '#009960',

  POLICE:          '#4488ff',
  POLICE_LIGHT_R:  '#ff3333',
  POLICE_LIGHT_B:  '#3399ff',
  POLICE_BODY:     '#1a3a99',

  CIVILIAN:        '#ffcc44',
  CIVILIAN_DARK:   '#996600',

  ITEM_CREDITS:    '#ffd700',
  ITEM_HACK_TOOL:  '#00ccff',
  ITEM_DISGUISE:   '#ff69b4',
  ITEM_WEAPON:     '#ff5533',
  ITEM_MED_KIT:    '#ff4444',

  HUD_BG:          'rgba(7,11,20,0.88)',
  HUD_BORDER:      '#1e3a5f',
  HUD_TEXT:        '#00ff9f',
  HUD_TEXT_DIM:    '#336655',
  HUD_WARN:        '#ff4444',
  HUD_HEAT_LOW:    '#00ff44',
  HUD_HEAT_MED:    '#ffaa00',
  HUD_HEAT_HIGH:   '#ff4444',

  MINIMAP_BG:      'rgba(7,11,20,0.9)',
  MINIMAP_WALL:    '#1a2d50',
  MINIMAP_FLOOR:   '#111827',
  MINIMAP_PLAYER:  '#00ff9f',
  MINIMAP_POLICE:  '#4488ff',
  MINIMAP_ITEM:    '#ffd700',

  ABILITY_BG:      'rgba(10,18,38,0.92)',
  ABILITY_READY:   '#00ff9f',
  ABILITY_COOL:    '#223344',
  ABILITY_TEXT:    '#aaddcc',

  TOOLTIP_BG:      'rgba(0,10,20,0.95)',
  TOOLTIP_BORDER:  '#00ff9f',
  TOOLTIP_TEXT:    '#ccffee',
});
