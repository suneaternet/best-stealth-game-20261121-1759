// Whisper Thief — configuration and levels.
// A top-down stealth game: slip past patrolling guards, gather the gems,
// and reach the green exit unseen. All art is drawn in code; all sound is
// synthesized. Nothing is loaded from the network.

// Logical playfield: 40 columns x 15 rows of 32 px tiles.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 15;
export const WORLD_W = COLS * TILE; // 1280
export const WORLD_H = ROWS * TILE; // 480

// One simulation step, in seconds.
export const STEP = 1 / 60;

// Player movement, in pixels per second.
export const PLAYER_RUN_SPEED = 175;
export const PLAYER_SNEAK_SPEED = 92;
export const PLAYER_RADIUS = 12;

// Guard movement, in pixels per second.
export const GUARD_PATROL_SPEED = 72;
export const GUARD_SUSPECT_SPEED = 112;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_RADIUS = 13;

// Vision cone.
export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.66; // ~38 degrees each side
export const CONE_RAYS = 40;

// Suspicion: 0 is calm, 1 is caught.
export const SUSPECT_THRESHOLD = 0.55;
export const SUSPICION_DECAY = 0.45; // per second while unseen
// Base rise rate at point blank, scaled by distance, stance and light.
export const SUSPICION_BASE_RATE = 0.8;
export const SNEAK_SPOT_FACTOR = 0.55; // sneaking is harder to notice
export const SHADOW_SPOT_FACTOR = 0.5; // standing in shadow is harder to notice
export const BUSH_HIDE_DISTANCE = 48; // guards cannot see you in a bush beyond this

// Noise: running and gem pickups alert nearby guards.
export const NOISE_RUN_RADIUS = 105;
export const NOISE_RUN_INTERVAL = 0.28;
export const NOISE_GEM_RADIUS = 70;

// Scoring.
export const GEM_SCORE = 100;
export const LEVEL_BONUS_BASE = 600;
export const LEVEL_BONUS_PER_SECOND = 5;
export const LEVEL_BONUS_MIN = 100;

// Guard pause at each waypoint, in seconds.
export const GUARD_WAIT = 0.9;
// How long a suspicious guard stares at the spot before giving up.
export const GUARD_SEARCH_TIME = 1.6;

// Map legend:
//   '#' wall (blocks movement and sight)
//   '.' floor
//   's' shadow floor (dark: guards spot you half as fast here)
//   'F' furniture (blocks movement and sight)
//   'B' bush (walkable; hides you, blocks sight through it)
//   'G' gem (collect it)
//   'E' exit (opens once every gem is taken)
//   'p' player start

export const LEVELS = [
  {
    name: 'I — The Foyer',
    sub: 'Two guards. Three gems. Reach the green door.',
    map: [
      '########################################',
      '#.....................................E#',
      '#......................................#',
      '#....FF................s...............#',
      '#....FF................s......G........#',
      '#.................B....................#',
      '#......................................#',
      '#...........G...........FF.............#',
      '#.......................FF.....B.......#',
      '#....s.................................#',
      '#....s..................FF.............#',
      '#.......................FF.............#',
      '#...........B..................G.......#',
      '#p.....................................#',
      '########################################',
    ],
    guards: [
      { waypoints: [[16, 2], [28, 2], [28, 5], [16, 5]] },
      { waypoints: [[8, 10], [20, 10], [20, 12], [8, 12]] },
    ],
  },
  {
    name: 'II — The Gallery',
    sub: 'Three guards, longer sightlines. Use the shadows.',
    map: [
      '########################################',
      '#.....G....................FF.........E#',
      '#......................................#',
      '#..FF.........s.........B..............#',
      '#..FF.........s........................#',
      '#......................................#',
      '#.......B...........FF..........s......#',
      '#...................FF..........s..G...#',
      '#......................................#',
      '#..s..............FF...................#',
      '#..s..............FF.......B...........#',
      '#......................................#',
      '#......G...................FF..........#',
      '#p....................FF...............#',
      '########################################',
    ],
    guards: [
      { waypoints: [[10, 2], [24, 2], [24, 4], [10, 4]] },
      { waypoints: [[28, 6], [36, 6], [36, 9], [28, 9]] },
      { waypoints: [[6, 11], [16, 11], [16, 13], [6, 13]] },
    ],
  },
  {
    name: 'III — The Vault',
    sub: 'Four guards, tight halls. Sneak, do not run.',
    map: [
      '########################################',
      '#.....................................E#',
      '#..FF......s...G...FF........B.........#',
      '#..FF......s.......FF..................#',
      '#......................................#',
      '#.......B...........s..........FF......#',
      '#...................s..........FF..G...#',
      '#..s...................................#',
      '#..s........FF..........B..............#',
      '#...........FF.........................#',
      '#......G...................s...........#',
      '#..........................s....FF.....#',
      '#...B......................s....FF.....#',
      '#p.....................................#',
      '########################################',
    ],
    guards: [
      { waypoints: [[10, 2], [22, 2], [22, 4], [10, 4]] },
      { waypoints: [[28, 5], [36, 5], [36, 7], [28, 7]] },
      { waypoints: [[10, 8], [20, 8], [20, 11], [10, 11]] },
      { waypoints: [[26, 11], [34, 11], [34, 13], [26, 13]] },
    ],
  },
];

// Palette: a manor at night, lit by lanterns.
export const COLORS = {
  floorA: '#2b2118',
  floorB: '#241c14',
  floorLine: '#1d1610',
  shadow: '#0e1420',
  wall: '#4a4238',
  wallTop: '#6b5f4d',
  wallEdge: '#2e2820',
  furniture: '#5a3a22',
  furnitureTop: '#7a5230',
  bush: '#1e4d2a',
  bushLeaf: '#2f6b3a',
  gem: '#59e6ff',
  gemGlow: '#b8f4ff',
  exitLocked: '#5a5a52',
  exitOpen: '#39d353',
  exitGlow: '#9dffb0',
  player: '#1c2733',
  playerCloak: '#31485e',
  playerTrim: '#e8c15a',
  guard: '#4d2b2b',
  guardCoat: '#7a3b2e',
  guardLantern: '#ffd27a',
  coneCalm: 'rgba(255, 210, 122, 0.20)',
  coneSuspect: 'rgba(255, 150, 60, 0.30)',
  coneAlert: 'rgba(255, 70, 60, 0.34)',
  hud: '#e8ddc4',
  hudDim: '#9a8f78',
  danger: '#ff5a4e',
  gold: '#e8c15a',
};
