// Whisper Thief — the rules: the manor, the thief, the guards.
// A level is a tile map (see config.js). Guards patrol waypoints with a
// lantern cone; walls, furniture and bushes block their sight. Running is
// loud, sneaking is quiet, shadows hide you. Take every gem, then slip out
// through the green door before any guard's suspicion fills up.

import {
  BUSH_HIDE_DISTANCE,
  COLS,
  CONE_HALF_ANGLE,
  CONE_RANGE,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SEARCH_TIME,
  GUARD_SUSPECT_SPEED,
  GUARD_WAIT,
  LEVEL_BONUS_BASE,
  LEVEL_BONUS_MIN,
  LEVEL_BONUS_PER_SECOND,
  LEVELS,
  NOISE_GEM_RADIUS,
  NOISE_RUN_INTERVAL,
  NOISE_RUN_RADIUS,
  PLAYER_RADIUS,
  PLAYER_RUN_SPEED,
  PLAYER_SNEAK_SPEED,
  ROWS,
  SHADOW_SPOT_FACTOR,
  SNEAK_SPOT_FACTOR,
  STEP,
  SUSPECT_THRESHOLD,
  SUSPICION_BASE_RATE,
  SUSPICION_DECAY,
  TILE,
} from './config.js';
import { mulberry32 } from './random.js';

export const EVENT_GEM = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_COMPLETE = 4;
export const EVENT_SPOTTED = 8;
export const EVENT_NOISE = 16;

const TAU = Math.PI * 2;

function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

export class World {
  constructor(levelIndex, seed) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.rng = mulberry32(seed);
    this.tick = 0;
    this.time = 0;
    this.score = 0;
    this.caught = false;
    this.complete = false;
    this.completeShown = false;
    this.noise = null; // {x, y, r, t} — a fading noise ring
    this.noiseTimer = 0;
    this.reset();
  }

  reset() {
    const level = this.level;
    this.grid = level.map.map((row) => row.split(''));
    this.gems = [];
    this.guards = [];
    this.exit = null;
    this.player = null;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const ch = this.grid[row][col];
        const at = tileCenter(col, row);
        if (ch === 'p') {
          this.player = {
            x: at.x,
            y: at.y,
            dir: -Math.PI / 2,
            sneak: false,
            moving: false,
          };
          this.grid[row][col] = '.';
        } else if (ch === 'G') {
          this.gems.push({ x: at.x, y: at.y, taken: false, col, row });
          this.grid[row][col] = '.';
        } else if (ch === 'E') {
          this.exit = { x: at.x, y: at.y, col, row, open: false };
          this.grid[row][col] = '.';
        }
      }
    }
    for (const def of level.guards) {
      const points = def.waypoints.map(([c, r]) => tileCenter(c, r));
      const start = points[0];
      this.guards.push({
        x: start.x,
        y: start.y,
        dir: 0,
        waypoints: points,
        wp: 1,
        forward: 1,
        wait: 0,
        state: 'patrol',
        suspicion: 0,
        lastSeen: null,
        search: 0,
        lookDir: 0,
      });
    }
    this.tick = 0;
    this.time = 0;
    this.caught = false;
    this.complete = false;
    this.completeShown = false;
    this.noise = null;
    this.noiseTimer = 0;
  }

  get gemsLeft() {
    let n = 0;
    for (const gem of this.gems) if (!gem.taken) n += 1;
    return n;
  }

  tileAt(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
    return this.grid[row][col];
  }

  blocksMove(px, py) {
    const ch = this.tileAt(px, py);
    return ch === '#' || ch === 'F';
  }

  blocksSight(px, py) {
    const ch = this.tileAt(px, py);
    return ch === '#' || ch === 'F' || ch === 'B';
  }

  // Is the straight line from (x0,y0) to (x1,y1) free of sight blockers?
  losClear(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (this.blocksSight(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  // Can this guard see the player right now? Returns a spotting rate
  // (suspicion per second) or 0 when the player is unseen.
  spotRate(guard) {
    const p = this.player;
    const dx = p.x - guard.x;
    const dy = p.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, guard.dir)) > CONE_HALF_ANGLE) return 0;
    // Hidden in a bush unless the guard is right on top of you.
    if (this.tileAt(p.x, p.y) === 'B' && dist > BUSH_HIDE_DISTANCE) return 0;
    if (!this.losClear(guard.x, guard.y, p.x, p.y)) return 0;
    let rate = SUSPICION_BASE_RATE * (1.6 - dist / CONE_RANGE);
    if (p.sneak) rate *= SNEAK_SPOT_FACTOR;
    if (this.tileAt(p.x, p.y) === 's') rate *= SHADOW_SPOT_FACTOR;
    return rate;
  }

  // Move a circle (x, y, radius) by (dx, dy), sliding along walls.
  moveCircle(body, dx, dy, radius) {
    let nx = body.x + dx;
    if (
      this.blocksMove(nx - radius, body.y - radius) ||
      this.blocksMove(nx + radius, body.y - radius) ||
      this.blocksMove(nx - radius, body.y + radius) ||
      this.blocksMove(nx + radius, body.y + radius)
    ) {
      nx = body.x;
    }
    let ny = body.y + dy;
    if (
      this.blocksMove(nx - radius, ny - radius) ||
      this.blocksMove(nx + radius, ny - radius) ||
      this.blocksMove(nx - radius, ny + radius) ||
      this.blocksMove(nx + radius, ny + radius)
    ) {
      ny = body.y;
    }
    body.x = nx;
    body.y = ny;
  }

  step(dt, input) {
    let events = 0;
    if (this.caught || this.complete) return events;
    this.tick += 1;
    this.time += dt;

    // --- the thief ---
    const p = this.player;
    const axis = input ? input.axis() : { x: 0, y: 0 };
    const sneak = input ? input.sneak : false;
    p.sneak = sneak;
    p.moving = axis.x !== 0 || axis.y !== 0;
    if (p.moving) {
      p.dir = Math.atan2(axis.y, axis.x);
      const speed = sneak ? PLAYER_SNEAK_SPEED : PLAYER_RUN_SPEED;
      this.moveCircle(p, axis.x * speed * dt, axis.y * speed * dt, PLAYER_RADIUS);
      if (!sneak) {
        this.noiseTimer -= dt;
        if (this.noiseTimer <= 0) {
          this.noiseTimer = NOISE_RUN_INTERVAL;
          this.noise = { x: p.x, y: p.y, r: NOISE_RUN_RADIUS, t: 1 };
          events |= EVENT_NOISE;
        }
      }
    }
    if (this.noise) {
      this.noise.t -= dt * 1.4;
      if (this.noise.t <= 0) this.noise = null;
    }

    // --- gems ---
    for (const gem of this.gems) {
      if (gem.taken) continue;
      if (Math.hypot(gem.x - p.x, gem.y - p.y) < 24) {
        gem.taken = true;
        this.score += 100;
        this.noise = { x: gem.x, y: gem.y, r: NOISE_GEM_RADIUS, t: 1 };
        events |= EVENT_GEM | EVENT_NOISE;
        if (this.gemsLeft === 0 && this.exit) this.exit.open = true;
      }
    }

    // --- the exit ---
    if (this.exit && this.exit.open) {
      if (Math.hypot(this.exit.x - p.x, this.exit.y - p.y) < 26) {
        this.complete = true;
        const bonus = Math.max(
          LEVEL_BONUS_MIN,
          LEVEL_BONUS_BASE - Math.floor(this.time) * LEVEL_BONUS_PER_SECOND,
        );
        this.score += bonus;
        events |= EVENT_COMPLETE;
        return events;
      }
    }

    // --- the guards ---
    for (const guard of this.guards) {
      const rate = this.spotRate(guard);
      if (rate > 0) {
        guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
        guard.lastSeen = { x: p.x, y: p.y };
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
      }
      if (guard.suspicion >= 1) {
        this.caught = true;
        events |= EVENT_CAUGHT;
        return events;
      }
      if (guard.suspicion >= SUSPECT_THRESHOLD && guard.state === 'patrol') {
        guard.state = 'suspect';
        guard.search = GUARD_SEARCH_TIME;
        events |= EVENT_SPOTTED;
      }
      // A noise nearby draws a patrolling guard to investigate.
      if (this.noise && guard.state === 'patrol') {
        const d = Math.hypot(this.noise.x - guard.x, this.noise.y - guard.y);
        if (d < this.noise.r + 30) {
          guard.state = 'suspect';
          guard.lastSeen = { x: this.noise.x, y: this.noise.y };
          guard.search = GUARD_SEARCH_TIME;
        }
      }

      if (guard.state === 'patrol') {
        const target = guard.waypoints[guard.wp];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          guard.wait += dt;
          if (guard.wait >= GUARD_WAIT) {
            guard.wait = 0;
            guard.wp += guard.forward;
            if (guard.wp >= guard.waypoints.length || guard.wp < 0) {
              guard.forward *= -1;
              guard.wp += guard.forward * 2;
            }
          }
        } else {
          guard.dir = Math.atan2(dy, dx);
          const stepLen = Math.min(dist, GUARD_PATROL_SPEED * dt);
          this.moveCircle(
            guard,
            (dx / dist) * stepLen,
            (dy / dist) * stepLen,
            13,
          );
        }
      } else if (guard.state === 'suspect') {
        const target = guard.lastSeen || guard.waypoints[guard.wp];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          guard.dir = Math.atan2(dy, dx);
          const stepLen = Math.min(dist, GUARD_SUSPECT_SPEED * dt);
          this.moveCircle(
            guard,
            (dx / dist) * stepLen,
            (dy / dist) * stepLen,
            13,
          );
        } else {
          // Stare around the spot, then give up and go back on patrol.
          guard.search -= dt;
          guard.lookDir += dt * 2.4;
          guard.dir = guard.lookDir;
          if (guard.search <= 0) {
            guard.state = 'patrol';
            guard.suspicion = Math.max(0, guard.suspicion - 0.3);
          }
        }
      }
      // A guard that clearly sees you chases: suspicion keeps climbing
      // while you stay in the cone, so breaking line of sight is survival.
      if (rate > 0 && guard.suspicion >= SUSPECT_THRESHOLD) {
        guard.state = 'chase';
      }
      if (guard.state === 'chase') {
        if (rate <= 0) {
          guard.state = 'suspect';
          guard.search = GUARD_SEARCH_TIME;
        } else {
          const dx = p.x - guard.x;
          const dy = p.y - guard.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 8) {
            // The guard caught you by touch.
            this.caught = true;
            events |= EVENT_CAUGHT;
            return events;
          }
          guard.dir = Math.atan2(dy, dx);
          const stepLen = Math.min(dist, GUARD_CHASE_SPEED * dt);
          this.moveCircle(
            guard,
            (dx / dist) * stepLen,
            (dy / dist) * stepLen,
            13,
          );
        }
      }
    }
    return events;
  }
}

// A whole run across the levels: keeps the total score and the level index.
export class Game {
  constructor(seed) {
    this.seed = seed;
    this.levelIndex = 0;
    this.totalScore = 0;
    this.world = new World(0, seed);
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  get lastLevel() {
    return this.levelIndex >= LEVELS.length - 1;
  }

  startLevel(index) {
    this.levelIndex = index;
    this.world = new World(index, this.seed + index * 101);
    this.world.score = this.totalScore;
  }

  // The current level is done: bank its score and move on.
  finishLevel() {
    this.totalScore = this.world.score;
    if (this.lastLevel) return false;
    this.startLevel(this.levelIndex + 1);
    return true;
  }

  retryLevel() {
    const keep = this.totalScore;
    this.world = new World(this.levelIndex, this.seed + this.levelIndex * 101);
    this.world.score = keep;
  }
}

export { STEP };
