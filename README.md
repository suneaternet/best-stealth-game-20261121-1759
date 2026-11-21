# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/suneaternet/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/suneaternet/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Whisper Thief is a complete top-down stealth game: you are Wren, a cat burglar in the Blackwood Manor, slipping past patrolling guards whose lantern cones are clipped by real line of sight, hiding behind furniture and in bushes, keeping to the shadows, taking every gem, and reaching the green exit unseen. Three wings of rising difficulty, a suspicion meter, noise that draws guards, synthesized sound, and a deterministic screenshot mode that stages its own renders.

## Run it

```sh
node serve.mjs
# then open http://localhost:8080/ in desktop Chrome
```

## Controls

- WASD / arrow keys — move
- Shift — sneak (slow, silent, hard to spot)
- P — pause, R — retry the wing, M — mute, Enter — start / continue

## Layout

- `game/index.html` — the page and its canvas
- `game/src/main.js` — bootstrap, game loop and screens
- `game/src/world.js` — the rules: movement, guard AI, vision, noise, scoring
- `game/src/render.js` — all drawing, including the raycast vision cones
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=start|play|alert|end&seed=1`)
- `game/src/config.js` — constants and the three level maps
- `game/src/input.js`, `game/src/audio.js`, `game/src/random.js` — input, synthesized sound, seeded RNG
- `main.ts` — the entrypoint: hands game/, screenshots/ and dossier.json to /output
- `vendor/makefun-game.ts` — the make.fun dossier library, copied from the kit unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=q0fbnzcq&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
