// Whisper Thief — keyboard (and click) input.
// Tracks the keys held down and exposes the movement axis, sneak state and
// the one-shot action keys (Enter to start, R to retry, P to pause, M to
// mute). Arrow keys and Space are prevented from scrolling the page.

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

const PREVENT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.clicked = false;
    this.onKeyDown = (event) => {
      if (PREVENT.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    };
    this.onKeyUp = (event) => {
      this.down.delete(event.code);
    };
    this.onMouseDown = () => {
      this.clicked = true;
    };
    this.onBlur = () => {
      this.down.clear();
    };
  }

  attach(target) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('mousedown', this.onMouseDown);
    target.addEventListener('blur', this.onBlur);
  }

  // Movement axis from the held keys, normalized to length 1.
  axis() {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const d = MOVE_KEYS[code];
      if (d) {
        x += d[0];
        y += d[1];
      }
    }
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  get sneak() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }

  // True once after the key goes down; call endFrame() to clear it.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  get anyConfirm() {
    return (
      this.pressed.has('Enter') ||
      this.pressed.has('Space') ||
      this.clicked
    );
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
