// Whisper Thief — bootstrap and the game loop.
// Loads the game into the page, runs the screens (title, intro, play,
// paused, caught, level complete, victory), and stages the deterministic
// screenshot scenes when the page is opened with ?shot=<name>&seed=<n>.

import { STEP } from './config.js';
import { Game, EVENT_CAUGHT, EVENT_COMPLETE, EVENT_GEM, EVENT_SPOTTED } from './world.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { render, fitCanvas } from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'whisper-thief-best';

function loadBest() {
  try {
    const v = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // No storage (private mode, file://): the best score just does not persist.
  }
}

function main() {
  const params = new URLSearchParams(window.location.search);
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const seed = Number(params.get('seed') || '1') || 1;
  let game = new Game(seed);
  let best = loadBest();

  // --- screenshot mode: stage one scene, draw it once, stop. ---
  const shot = params.get('shot');
  if (shot) {
    const { screen } = stageShot(shot, game);
    const fit = fitCanvas(canvas, window.innerWidth, window.innerHeight);
    ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.ox, fit.oy);
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    render(ctx, game, screen, best);
    document.title = `Whisper Thief — ${shot}`;
    return;
  }

  // --- the playable game ---
  const input = new Input();
  input.attach(window);
  const sound = new Sound();
  let screen = 'title';
  let stepSoundTimer = 0;

  function resize() {
    const fit = fitCanvas(canvas, window.innerWidth, window.innerHeight);
    ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.ox, fit.oy);
  }
  window.addEventListener('resize', resize);
  resize();

  function handleEvents(events) {
    if (events & EVENT_GEM) sound.gem();
    if (events & EVENT_SPOTTED) sound.spotted();
    if (events & EVENT_CAUGHT) {
      sound.caught();
      screen = 'caught';
    }
    if (events & EVENT_COMPLETE) {
      sound.win();
      screen = 'levelComplete';
    }
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Audio starts only after a real gesture, never on page load.
    if (input.pressed.size > 0 || input.clicked) sound.ensure();
    if (input.wasPressed('KeyM')) sound.muted = !sound.muted;

    if (screen === 'title' && input.anyConfirm) {
      screen = 'intro';
    } else if (screen === 'intro' && input.wasPressed('Enter')) {
      screen = 'play';
    } else if (screen === 'play') {
      if (input.wasPressed('KeyP')) {
        screen = 'paused';
      } else if (input.wasPressed('KeyR')) {
        game.retryLevel();
      } else {
        acc += dt;
        while (acc >= STEP) {
          acc -= STEP;
          const events = game.world.step(STEP, input);
          handleEvents(events);
          if (screen !== 'play') {
            acc = 0;
            break;
          }
        }
        // Footsteps while running.
        const p = game.world.player;
        if (p.moving && !p.sneak) {
          stepSoundTimer -= dt;
          if (stepSoundTimer <= 0) {
            stepSoundTimer = 0.32;
            sound.step();
          }
        }
      }
    } else if (screen === 'paused' && input.wasPressed('KeyP')) {
      screen = 'play';
    } else if (screen === 'caught' && input.wasPressed('KeyR')) {
      game.retryLevel();
      screen = 'play';
    } else if (screen === 'levelComplete' && input.wasPressed('Enter')) {
      if (game.finishLevel()) {
        screen = 'intro';
      } else {
        if (game.totalScore > best) {
          best = game.totalScore;
          saveBest(best);
        }
        screen = 'victory';
      }
    } else if (screen === 'victory' && input.wasPressed('KeyR')) {
      game = new Game(seed);
      screen = 'title';
    }

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    render(ctx, game, screen, best);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
