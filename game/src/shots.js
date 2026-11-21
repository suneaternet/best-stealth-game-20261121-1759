// Whisper Thief — staged screenshot scenes.
// The game renders its own screenshots: each named scene plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame. Load the game with
// ?shot=start|play|alert|end&seed=1 to stage one.

import { STEP } from './config.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 18;
const ALERT_SECONDS = 25;

// A fake input that walks the player toward waypoints, in tile coords.
// It closes over the world, so world.step can call axis() with no args.
function makePilot(world, waypoints, sneak) {
  let index = 0;
  return {
    axis() {
      while (index < waypoints.length) {
        const [c, r] = waypoints[index];
        const tx = (c + 0.5) * 32;
        const ty = (r + 0.5) * 32;
        const dx = tx - world.player.x;
        const dy = ty - world.player.y;
        if (Math.hypot(dx, dy) < 10) {
          index += 1;
          continue;
        }
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx / len, y: dy / len };
      }
      return { x: 0, y: 0 };
    },
    get sneak() {
      return sneak;
    },
  };
}

function maxSuspicion(world) {
  let m = 0;
  for (const g of world.guards) m = Math.max(m, g.suspicion);
  return m;
}

// The direction away from the nearest dangerous guard (one whose lantern
// is on you, or one very close), or null when no guard threatens you.
function dangerDir(world) {
  let worst = null;
  let worstD = Infinity;
  for (const g of world.guards) {
    const d = Math.hypot(g.x - world.player.x, g.y - world.player.y);
    if (world.spotRate(g) > 0 || d < 120) {
      if (d < worstD) {
        worstD = d;
        worst = g;
      }
    }
  }
  if (!worst) return null;
  const dx = world.player.x - worst.x;
  const dy = world.player.y - worst.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// It is safe to move when no guard is close and no lantern is on you.
function isSafe(world) {
  return dangerDir(world) === null;
}

// Play forward with `pilot` until `seconds` run out or `stopWhen` says so.
// A cautious thief backs away from a lantern, freezes while suspicion is
// rising, and only follows the path when the way is clear. A reckless one
// (cautious false) just runs the path — useful for the spotted scene.
function playForward(world, pilot, seconds, stopWhen, cautious) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.caught || world.complete) break;
    let input = pilot;
    if (cautious) {
      const flee = dangerDir(world);
      if (flee) {
        input = { axis: () => flee, sneak: true };
      } else if (maxSuspicion(world) > 0.3) {
        input = { axis: () => ({ x: 0, y: 0 }), sneak: true };
      }
    }
    world.step(STEP, input);
    if (stopWhen && stopWhen(world)) break;
  }
}

// Level 2, mid-game: the thief slips up the quiet left side and into the
// open gallery, freezing whenever a lantern sweeps near.
const PLAY_PATH = [
  [1, 13],
  [1, 9],
  [1, 6],
  [4, 6],
  [4, 9],
  [7, 9],
  [7, 7],
  [10, 7],
  [10, 9],
  [13, 9],
  [13, 6],
  [17, 6],
  [17, 9],
  [17, 8],
  [20, 8],
];

// Level 3: the thief runs for the top gem and blunders into a patrol —
// the frame catches the moment the lantern finds them.
const ALERT_PATH = [
  [1, 13],
  [1, 10],
  [5, 10],
  [5, 6],
  [10, 6],
  [10, 4],
  [13, 4],
  [15, 4],
  [15, 2],
];

/**
 * Set `game` to the named scene (start, play, alert or end; any other name
 * is start) and return the screen to draw over it.
 */
export function stageShot(name, game) {
  if (name === 'play') {
    game.startLevel(1);
    const pilot = makePilot(game.world, PLAY_PATH, true);
    playForward(game.world, pilot, PLAY_SECONDS, null, true);
    return { screen: 'play' };
  }
  if (name === 'alert') {
    game.startLevel(2);
    const pilot = makePilot(game.world, ALERT_PATH, false);
    playForward(
      game.world,
      pilot,
      ALERT_SECONDS,
      (world) => maxSuspicion(world) > 0.75,
      false,
    );
    return { screen: 'play' };
  }
  if (name === 'end') {
    game.startLevel(2);
    // The heist is done: every gem taken, the exit open, the score banked,
    // so the HUD behind the victory screen tells the same story as it.
    for (const gem of game.world.gems) gem.taken = true;
    if (game.world.exit) game.world.exit.open = true;
    game.world.score = 2450;
    game.totalScore = 2450;
    playForward(game.world, makePilot(game.world, [], true), START_SECONDS, null, true);
    return { screen: 'victory' };
  }
  // start (and anything else): the title over the first wing, guards
  // already on patrol.
  game.startLevel(0);
  playForward(game.world, makePilot(game.world, [], true), START_SECONDS, null, true);
  return { screen: 'title' };
}

export const SHOT_NAMES = ['start', 'play', 'alert', 'end'];
