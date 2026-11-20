import * as THREE from 'three';

/* 코드로 만드는 65% 배열 키보드. 키캡 하나하나가 따로 움직인다.
   실제 3D 모델이 준비되면 이 모듈이 돌려주는 모양({ group, press, update, caps })만 맞춰 교체하면 된다 */

// [KeyboardEvent.code, 너비(u), 글자]
const ROWS = [
  [['Backquote', 1, '`'], ['Digit1', 1, '1'], ['Digit2', 1, '2'], ['Digit3', 1, '3'], ['Digit4', 1, '4'], ['Digit5', 1, '5'], ['Digit6', 1, '6'], ['Digit7', 1, '7'], ['Digit8', 1, '8'], ['Digit9', 1, '9'], ['Digit0', 1, '0'], ['Minus', 1, '-'], ['Equal', 1, '='], ['Backspace', 2, '←'], ['Delete', 1, 'Del']],
  [['Tab', 1.5, 'Tab'], ['KeyQ', 1, 'Q'], ['KeyW', 1, 'W'], ['KeyE', 1, 'E'], ['KeyR', 1, 'R'], ['KeyT', 1, 'T'], ['KeyY', 1, 'Y'], ['KeyU', 1, 'U'], ['KeyI', 1, 'I'], ['KeyO', 1, 'O'], ['KeyP', 1, 'P'], ['BracketLeft', 1, '['], ['BracketRight', 1, ']'], ['Backslash', 1.5, '\\'], ['PageUp', 1, 'PgU']],
  [['CapsLock', 1.75, 'Caps'], ['KeyA', 1, 'A'], ['KeyS', 1, 'S'], ['KeyD', 1, 'D'], ['KeyF', 1, 'F'], ['KeyG', 1, 'G'], ['KeyH', 1, 'H'], ['KeyJ', 1, 'J'], ['KeyK', 1, 'K'], ['KeyL', 1, 'L'], ['Semicolon', 1, ';'], ['Quote', 1, "'"], ['Enter', 2.25, 'Enter'], ['PageDown', 1, 'PgD']],
  [['ShiftLeft', 2.25, 'Shift'], ['KeyZ', 1, 'Z'], ['KeyX', 1, 'X'], ['KeyC', 1, 'C'], ['KeyV', 1, 'V'], ['KeyB', 1, 'B'], ['KeyN', 1, 'N'], ['KeyM', 1, 'M'], ['Comma', 1, ','], ['Period', 1, '.'], ['Slash', 1, '/'], ['ShiftRight', 1.75, 'Shift'], ['ArrowUp', 1, '↑'], ['End', 1, 'End']],
  [['ControlLeft', 1.25, 'Ctrl'], ['MetaLeft', 1.25, 'Win'], ['AltLeft', 1.25, 'Alt'], ['Space', 6.25, ''], ['AltRight', 1, 'Alt'], ['ContextMenu', 1, 'Fn'], ['ControlRight', 1, 'Ctrl'], ['ArrowLeft', 1, '←'], ['ArrowDown', 1, '↓'], ['ArrowRight', 1, '→']],
];
const ACCENT = new Set(['Backquote', 'Enter']);
const COLS = 16;
const U = 0.085; // 키 한 칸의 크기(m). 매장에서 잘 보이도록 실제보다 크게 잡았다
export const KB_WIDTH = (COLS + 0.7) * U;
export const KB_DEPTH = (ROWS.length + 0.7) * U;
const CAP_H = 0.45;
const TRAVEL = 0.22;

const geoCache = new Map();
function capGeo(w) {
  if (!geoCache.has(w)) geoCache.set(w, new THREE.BoxGeometry(w - 0.1, CAP_H, 0.9));
  return geoCache.get(w);
}

const texCache = new Map();
function labelTexture(text, bg, fg, w) {
  const key = text + bg + fg + w;
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = Math.round(64 * w);
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, cv.width, cv.height);
  if (text) {
    g.fillStyle = fg;
    g.font = `600 ${text.length > 1 ? 20 : 30}px system-ui, sans-serif`;
    g.textBaseline = 'middle';
    g.fillText(text, 10, text.length > 1 ? 22 : 26);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function buildKeyboard(product) {
  const c = product.colors;
  const group = new THREE.Group();
  const inner = new THREE.Group(); // 1u = 1 단위로 만든 뒤 한꺼번에 줄인다
  inner.scale.setScalar(U);
  group.add(inner);

  const caseMat = new THREE.MeshStandardMaterial({ color: c.case, roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(COLS + 0.7, 0.9, ROWS.length + 0.7), caseMat);
  body.position.y = 0.45;
  body.castShadow = true;
  inner.add(body);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(COLS + 0.1, 0.1, ROWS.length + 0.1),
    new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.9 }),
  );
  plate.position.y = 0.92;
  inner.add(plate);

  const sideMats = {};
  const side = (hex) => (sideMats[hex] ||= new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.86), roughness: 0.7 }));
  const keys = new Map();
  const caps = [];
  const restY = 0.9 + CAP_H / 2 + TRAVEL + 0.05;

  ROWS.forEach((row, r) => {
    let x = -COLS / 2;
    for (const [code, w, label] of row) {
      const accent = ACCENT.has(code);
      const bg = accent ? c.accent : c.cap;
      const fg = accent ? '#ffffff' : c.legend;
      const s = side(bg);
      const top = new THREE.MeshStandardMaterial({ map: labelTexture(label, bg, fg, w), roughness: 0.7 });
      const mesh = new THREE.Mesh(capGeo(w), [s, s, top, s, s, s]);
      mesh.position.set(x + w / 2, restY, r - (ROWS.length - 1) / 2);
      mesh.userData.code = code;
      inner.add(mesh);
      keys.set(code, { mesh, down: false, y: restY });
      caps.push(mesh);
      x += w;
    }
  });

  group.rotation.x = 0.09; // 뒤쪽이 살짝 높게

  return {
    group,
    caps,
    has: (code) => keys.has(code),
    press(code, on) {
      const k = keys.get(code);
      if (k) k.down = !!on;
    },
    releaseAll() {
      keys.forEach((k) => (k.down = false));
    },
    update(dt) {
      const a = 1 - Math.exp(-40 * dt);
      keys.forEach((k) => {
        const target = k.down ? restY - TRAVEL : restY;
        if (Math.abs(k.y - target) > 0.001) {
          k.y += (target - k.y) * a;
          k.mesh.position.y = k.y;
        }
      });
    },
  };
}
