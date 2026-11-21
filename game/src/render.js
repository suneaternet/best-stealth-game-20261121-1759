// Whisper Thief — rendering. Everything is drawn with canvas primitives:
// a manor floor at night, lantern cones clipped by raycast so walls and
// furniture genuinely occlude them, and a quiet HUD. The same renderer draws
// both the live game and the staged screenshot scenes.

import {
  COLORS,
  COLS,
  CONE_HALF_ANGLE,
  CONE_RANGE,
  CONE_RAYS,
  ROWS,
  TILE,
  WORLD_H,
  WORLD_W,
} from './config.js';

const TAU = Math.PI * 2;

// The vision cone as a polygon: rays fan out from the guard and stop at the
// first wall, piece of furniture or bush they meet, so light never leaks
// through a wall.
function conePolygon(world, guard) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a =
      guard.dir - CONE_HALF_ANGLE + ((2 * CONE_HALF_ANGLE * i) / CONE_RAYS);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let reach = CONE_RANGE;
    for (let d = 8; d <= CONE_RANGE; d += 6) {
      if (world.blocksSight(guard.x + dx * d, guard.y + dy * d)) {
        reach = d;
        break;
      }
    }
    points.push({ x: guard.x + dx * reach, y: guard.y + dy * reach });
  }
  return points;
}

function coneColor(guard) {
  if (guard.state === 'chase') return COLORS.coneAlert;
  if (guard.state === 'suspect' || guard.suspicion >= 0.55) {
    return COLORS.coneSuspect;
  }
  return COLORS.coneCalm;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;
      const ch = world.grid[row][col];
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 's') {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
      }
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawWallsAndFurniture(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = world.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      } else if (ch === 'F') {
        ctx.fillStyle = COLORS.furniture;
        roundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 5);
        ctx.fill();
        ctx.fillStyle = COLORS.furnitureTop;
        ctx.fillRect(x + 4, y + 4, TILE - 8, 7);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 16);
        ctx.lineTo(x + TILE - 5, y + 16);
        ctx.moveTo(x + 5, y + 23);
        ctx.lineTo(x + TILE - 5, y + 23);
        ctx.stroke();
      }
    }
  }
}

function drawExit(ctx, world) {
  const e = world.exit;
  if (!e) return;
  const pulse = 0.6 + 0.4 * Math.sin(world.tick * 0.06);
  if (e.open) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.fillStyle = COLORS.exitGlow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 26, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.exitOpen;
  } else {
    ctx.fillStyle = COLORS.exitLocked;
  }
  roundRect(ctx, e.x - 13, e.y - 15, 26, 30, 4);
  ctx.fill();
  ctx.fillStyle = '#101410';
  ctx.fillRect(e.x - 2, e.y - 4, 4, 8);
  ctx.fillStyle = e.open ? '#0c2b12' : '#d8d8d0';
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(e.open ? 'EXIT' : 'LOCKED', e.x, e.y - 20);
}

function drawGems(ctx, world) {
  for (const gem of world.gems) {
    if (gem.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(world.tick * 0.08 + gem.col);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.3 * pulse;
    ctx.fillStyle = COLORS.gemGlow;
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, 15 + 4 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.gem;
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 10);
    ctx.lineTo(gem.x + 7, gem.y);
    ctx.lineTo(gem.x, gem.y + 10);
    ctx.lineTo(gem.x - 7, gem.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 5);
    ctx.lineTo(gem.x + 3, gem.y);
    ctx.lineTo(gem.x, gem.y + 5);
    ctx.lineTo(gem.x - 3, gem.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawNoise(ctx, world) {
  if (!world.noise) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, world.noise.t) * 0.7;
  ctx.strokeStyle = '#ffd27a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(world.noise.x, world.noise.y, world.noise.r * (1.2 - world.noise.t * 0.2), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawCones(ctx, world) {
  for (const guard of world.guards) {
    const poly = conePolygon(world, guard);
    ctx.fillStyle = coneColor(guard);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGuard(ctx, world, guard) {
  // Body: a night-watchman in a long coat, lantern in hand.
  ctx.fillStyle = COLORS.guardCoat;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 8, 0, TAU);
  ctx.fill();
  // Lantern, held ahead in the facing direction.
  const lx = guard.x + Math.cos(guard.dir) * 15;
  const ly = guard.y + Math.sin(guard.dir) * 15;
  ctx.fillStyle = COLORS.guardLantern;
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = COLORS.guardLantern;
  ctx.beginPath();
  ctx.arc(lx, ly, 9, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Suspicion ring above the guard.
  if (guard.suspicion > 0.03) {
    ctx.strokeStyle = guard.suspicion >= 0.55 ? COLORS.danger : COLORS.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 20, 7, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * TAU);
    ctx.stroke();
  }
  // "?" while investigating, "!" while chasing.
  if (guard.state === 'chase') {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 24);
  } else if (guard.state === 'suspect') {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 24);
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const inBush = world.tileAt(p.x, p.y) === 'B';
  const inShadow = world.tileAt(p.x, p.y) === 's';
  ctx.save();
  if (inBush || inShadow) ctx.globalAlpha = 0.75;
  // Cloak: a dark circle with a gold-trimmed hood pointing where you face.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.sneak ? 11 : 12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.playerTrim;
  ctx.beginPath();
  ctx.arc(
    p.x + Math.cos(p.dir) * 8,
    p.y + Math.sin(p.dir) * 8,
    3,
    0,
    TAU,
  );
  ctx.fill();
  if (p.sneak) {
    ctx.strokeStyle = 'rgba(232, 193, 90, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBushes(ctx, world) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (world.grid[row][col] !== 'B') continue;
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      ctx.fillStyle = COLORS.bush;
      ctx.beginPath();
      ctx.arc(cx - 7, cy + 4, 10, 0, TAU);
      ctx.arc(cx + 7, cy + 5, 11, 0, TAU);
      ctx.arc(cx, cy - 6, 11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COLORS.bushLeaf;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 3, 5, 0, TAU);
      ctx.arc(cx + 6, cy - 4, 5, 0, TAU);
      ctx.arc(cx + 1, cy + 6, 5, 0, TAU);
      ctx.fill();
    }
  }
}

function drawHud(ctx, world, game, screen) {
  const maxSuspicion = Math.max(0, ...world.guards.map((g) => g.suspicion));
  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 10, 0.72)';
  ctx.fillRect(0, 0, WORLD_W, 30);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.level.name, 12, 20);
  ctx.textAlign = 'center';
  const gemsTaken = world.gems.filter((g) => g.taken).length;
  ctx.fillText(
    `◆ ${gemsTaken}/${world.gems.length}   Score ${world.score}   ${Math.floor(world.time)}s`,
    WORLD_W / 2,
    20,
  );
  // The eye: how close the nearest guard is to spotting you.
  ctx.textAlign = 'right';
  const eyeLabel = maxSuspicion >= 0.55 ? 'SEEN!' : maxSuspicion > 0.03 ? 'Suspicious…' : 'Unseen';
  ctx.fillStyle = maxSuspicion >= 0.55 ? COLORS.danger : COLORS.hud;
  ctx.fillText(`◉ ${eyeLabel}`, WORLD_W - 12, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(WORLD_W - 132, 24, 120, 3);
  ctx.fillStyle = maxSuspicion >= 0.55 ? COLORS.danger : COLORS.gold;
  ctx.fillRect(WORLD_W - 132, 24, 120 * maxSuspicion, 3);
  ctx.restore();
  if (screen === 'play') {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 10, 0.55)';
    ctx.fillRect(0, WORLD_H - 22, WORLD_W, 22);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'WASD / arrows — move    Shift — sneak    P — pause    R — retry    M — mute',
      WORLD_W / 2,
      WORLD_H - 7,
    );
    ctx.restore();
  }
}

function overlay(ctx, lines, title) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 6, 10, 0.78)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.textAlign = 'center';
  let y = WORLD_H / 2 - lines.length * 16;
  if (title) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(title, WORLD_W / 2, y);
    y += 56;
  }
  ctx.fillStyle = COLORS.hud;
  ctx.font = '16px Georgia, serif';
  for (const line of lines) {
    ctx.fillText(line, WORLD_W / 2, y);
    y += 30;
  }
  ctx.restore();
}

function drawScreens(ctx, game, screen, best) {
  const world = game.world;
  if (screen === 'title') {
    overlay(
      ctx,
      [
        'You are Wren, the Whisper Thief. Tonight: the Blackwood Manor,',
        'three wings, nine gems, and the Starlight Sapphire waiting in the Vault.',
        '',
        'Move with WASD or the arrow keys. Hold Shift to sneak — slow, silent,',
        'and hard to spot. Running is loud: guards hear it and come looking.',
        'Hide behind furniture, slip through the bushes, keep to the shadows.',
        'Take every gem, then reach the green door unseen.',
        '',
        'Press Enter or click to begin.',
        best > 0 ? `Best score: ${best}` : '',
      ],
      'WHISPER THIEF',
    );
  } else if (screen === 'intro') {
    overlay(
      ctx,
      [
        game.level.sub,
        '',
        'Take every gem, then reach the green door unseen.',
        '',
        'Press Enter to slip in.',
      ],
      game.level.name,
    );
  } else if (screen === 'paused') {
    overlay(ctx, ['Paused.', '', 'Press P to keep sneaking.'], 'Paused');
  } else if (screen === 'caught') {
    overlay(
      ctx,
      [
        'A lantern found you, and the manor woke up.',
        '',
        'Press R to try this wing again.',
      ],
      'SPOTTED!',
    );
  } else if (screen === 'levelComplete') {
    overlay(
      ctx,
      [
        `Wing cleared in ${Math.floor(world.time)}s.`,
        `Score: ${world.score}`,
        '',
        game.lastLevel ? 'Press Enter to see the Vault’s prize.' : 'Press Enter for the next wing.',
      ],
      'Silent as shadow.',
    );
  } else if (screen === 'victory') {
    overlay(
      ctx,
      [
        'The Starlight Sapphire is yours. Nine gems, three wings,',
        'and not a single guard the wiser.',
        '',
        `Final score: ${game.totalScore}`,
        best > 0 ? `Best score: ${Math.max(best, game.totalScore)}` : '',
        '',
        'Press R to steal it all over again.',
      ],
      'The Vault is empty.',
    );
  }
}

// Draw the whole game into `ctx`, which is already scaled and translated so
// the world fills the canvas. `screen` is one of: title, intro, play,
// paused, caught, levelComplete, victory.
export function render(ctx, game, screen, best) {
  const world = game.world;
  drawFloor(ctx, world);
  drawExit(ctx, world);
  drawGems(ctx, world);
  drawNoise(ctx, world);
  drawCones(ctx, world);
  drawWallsAndFurniture(ctx, world);
  drawBushes(ctx, world);
  drawPlayer(ctx, world);
  for (const guard of world.guards) drawGuard(ctx, world, guard);
  drawHud(ctx, world, game, screen);
  if (screen !== 'play') drawScreens(ctx, game, screen, best);
}

// Fit the 1280x480 world into a canvas of (w, h), letterboxed.
export function fitCanvas(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const scale = Math.min(w / WORLD_W, h / WORLD_H) * dpr;
  const ox = (canvas.width - WORLD_W * scale) / 2;
  const oy = (canvas.height - WORLD_H * scale) / 2;
  return { scale, ox, oy, dpr };
}
