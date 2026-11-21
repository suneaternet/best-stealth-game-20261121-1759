// Whisper Thief — a small seeded random number generator.
// Deterministic: the same seed always gives the same stream, so a staged
// screenshot scene renders the same frame every time it runs.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element of `items` using `rng`; returns the item.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A number in [min, max) using `rng`.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
