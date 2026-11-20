import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CATALOG, BRANDS, priceText, IS_SAMPLE } from './catalog.js';
import { buildKeyboard } from './keyboard.js';

/* 매장: 52 × 28 m. 입구는 +z 쪽 가운데.
   왼쪽 = 커스텀 키보드, 가운데 = 카운터와 둥근 테이블, 오른쪽 = 완제품 키보드(브랜드별 3줄).
   세이지 그린 · 크림 · 나무 · 라벤더 톤의 아기자기한 가게 */

export const ROOM = { x0: -26, x1: 26, z0: -14, z1: 14, wallH: 5.2 };
export const SPAWN = { x: 0, z: 10.5 };
export const BRAND = { name: 'MADEKEY', ko: '메이드키' };
export const THEME = {
  line: '#5d7a5f', // 간판 테두리·글씨에 쓰는 짙은 세이지
  ink: '#4a6650',
  cream: '#f6efe0',
  paper: '#efe5d0',
  sage: '#8fa98b',
  deep: '#6f8c6e',
  wood: '#e3c59c',
  woodDark: '#c9a273',
  lavender: '#c9bbe3',
  pink: '#d99a8c',
  floor: '#ece2d8',
  glow: '#fff1c9',
};
const FONT = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const TABLE = { w: 3, d: 1.4, h: 0.85 };
const MINI = ['#f3c9cf', '#2f3338', '#c9bbe3', '#f6efe0', '#8fa98b', '#34406b', '#f0d9c8', '#d99a8c', '#b9c7d9', '#4f6b62'];

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const mats = {};
const mat = (color, rough = 0.9) => (mats[color + rough] ||= new THREE.MeshStandardMaterial({ color, roughness: rough }));

function add(parent, geo, material, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
const rbox = (parent, w, h, d, color, x, y, z, r = 0.08, opt) => add(parent, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat(color), x, y, z, opt);

/* 글씨·그림 판. px는 텍스처 가로 해상도 */
function sign(parent, w, h, draw, x, y, z, ry = 0, px = 1024) {
  const tex = canvasTex(px, Math.round((px * h) / w), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

/* 테두리를 두른 둥근 판 */
function sticker(g, w, h, fill, r = h * 0.3, lw = h * 0.045, stroke = THEME.line) {
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = lw;
  g.beginPath();
  g.roundRect(lw, lw, w - lw * 2, h - lw * 2, r);
  g.fill();
  g.stroke();
}

/* 메이드키 표식: 키캡 모양 테두리 안에 짧은 줄 세 개 */
function logo(g, cx, cy, s, color) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = s * 0.11;
  g.lineJoin = g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - s * 0.3, cy - s * 0.36);
  g.lineTo(cx + s * 0.3, cy - s * 0.36);
  g.quadraticCurveTo(cx + s * 0.4, cy - s * 0.36, cx + s * 0.43, cy - s * 0.24);
  g.lineTo(cx + s * 0.54, cy + s * 0.22);
  g.quadraticCurveTo(cx + s * 0.57, cy + s * 0.38, cx + s * 0.42, cy + s * 0.38);
  g.lineTo(cx - s * 0.42, cy + s * 0.38);
  g.quadraticCurveTo(cx - s * 0.57, cy + s * 0.38, cx - s * 0.54, cy + s * 0.22);
  g.lineTo(cx - s * 0.43, cy - s * 0.24);
  g.quadraticCurveTo(cx - s * 0.4, cy - s * 0.36, cx - s * 0.3, cy - s * 0.36);
  g.stroke();
  g.beginPath();
  for (const dx of [-0.14, 0, 0.14]) {
    g.moveTo(cx + dx * s, cy - s * 0.16);
    g.lineTo(cx + dx * s, cy - s * 0.04);
  }
  g.stroke();
  g.restore();
}

function bush(parent, x, y, z, s = 1) {
  const a = mat('#7fa873');
  const b = mat('#9cc08a');
  [[0, 0, 0, 0.42, a], [0.3, -0.05, 0.1, 0.3, b], [-0.28, -0.03, -0.08, 0.33, b], [0.05, 0.28, -0.04, 0.27, b]].forEach(([dx, dy, dz, r, m]) => {
    add(parent, new THREE.IcosahedronGeometry(r * s, 1), m, x + dx * s, y + dy * s, z + dz * s);
  });
}
function plant(parent, x, z, s = 1) {
  rbox(parent, 0.62 * s, 0.56 * s, 0.62 * s, THEME.cream, x, 0.28 * s, z, 0.1);
  bush(parent, x, 0.95 * s, z, s);
}

/* 따뜻한 빛이 나는 둥근 등 */
function globe(parent, x, y, z, r = 0.16) {
  add(parent, new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: THEME.glow }), x, y, z, { cast: false });
}
function lantern(parent, x, z) {
  rbox(parent, 0.34, 0.9, 0.34, THEME.woodDark, x, 0.45, z, 0.06);
  rbox(parent, 0.22, 0.5, 0.36, THEME.glow, x, 0.5, z, 0.04, { cast: false });
  globe(parent, x, 1.12, z, 0.24);
}

function pendant(parent, x, z, color) {
  add(parent, new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), mat(THEME.ink), x, ROOM.wallH - 0.1, z, { cast: false });
  add(parent, new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(color), x, ROOM.wallH - 0.85, z, { cast: false });
  globe(parent, x, ROOM.wallH - 0.83, z, 0.13);
}

function stool(parent, x, z) {
  add(parent, new THREE.CylinderGeometry(0.3, 0.3, 0.14, 20), mat(THEME.sage), x, 0.5, z);
  for (const [dx, dz] of [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]]) add(parent, new THREE.CylinderGeometry(0.04, 0.035, 0.44, 8), mat(THEME.woodDark), x + dx, 0.22, z + dz);
}

/* 진열용 작은 키보드 (타건은 안 되는 장식) */
function miniKb(parent, color, x, y, z, ry = 0, tilt = 0.5) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  const t = new THREE.Group();
  t.rotation.x = tilt;
  g.add(t);
  const dark = new THREE.Color(color).getHSL({}).l < 0.4;
  rbox(t, 1.15, 0.07, 0.42, '#' + new THREE.Color(color).multiplyScalar(0.82).getHexString(), 0, 0, 0, 0.03);
  rbox(t, 1.05, 0.06, 0.33, color, 0, 0.05, 0, 0.02, { cast: false });
  rbox(t, 0.14, 0.065, 0.07, dark ? THEME.pink : THEME.sage, 0.4, 0.052, 0.02, 0.01, { cast: false });
  parent.add(g);
}

/* 벽 선반: 나무 수납장 위로 선반 3단, 작은 키보드를 비스듬히 올린다. side=-1 왼쪽 벽, 1 오른쪽 벽 */
function wallShelves(parent, side, z0, z1, seed) {
  const x = side * (ROOM.x1 - 0.45);
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  const ry = -side * Math.PI / 2; // 매장 안쪽을 향하게
  rbox(parent, 0.9, 0.9, len, THEME.wood, x, 0.45, zc, 0.06);
  for (let z = z0 + 0.95; z < z1 - 0.6; z += 1.8) rbox(parent, 0.08, 0.5, 1.3, THEME.cream, x - side * 0.44, 0.45, z, 0.03, { cast: false });
  [1.25, 2.05, 2.85].forEach((y, t) => {
    rbox(parent, 0.7, 0.07, len, THEME.wood, x + side * 0.08, y, zc, 0.03);
    for (let k = 0, z = z0 + 0.9; z < z1 - 0.5; z += 1.5, k++) miniKb(parent, MINI[(k * 3 + t * 5 + seed) % MINI.length], x + side * 0.02, y + 0.2, z, ry, 0.55);
  });
  for (let k = 0, z = z0 + 0.9; z < z1 - 0.5; z += 1.5, k++) miniKb(parent, MINI[(k * 7 + seed + 2) % MINI.length], x - side * 0.02, 1.02, z, ry, 0.2);
}

function rug(parent, w, d, color, x, z, y = 0.012) {
  const shape = new THREE.Shape();
  const r = Math.min(1.2, w / 2, d / 2);
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r);
  shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r);
  shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const m = add(parent, new THREE.ShapeGeometry(shape, 8), mat(color, 1), x, y, z, { cast: false });
  m.rotation.x = -Math.PI / 2;
  return m;
}

const tint = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#fbf6ea'), k).getHexString();

export function buildWorld(scene) {
  const colliders = [];
  const solid = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  const W = ROOM.x1 - ROOM.x0;
  const D = ROOM.z1 - ROOM.z0;
  const BACK = ROOM.z0 + 0.03;

  /* ---- 배경과 빛: 연보라 배경에 따뜻한 조명 ---- */
  scene.background = new THREE.Color('#e3dcec');
  scene.fog = new THREE.Fog('#e3dcec', 80, 240);
  scene.add(new THREE.HemisphereLight('#fff8ee', '#e0d2c0', 1.45));
  const sun = new THREE.DirectionalLight('#ffeacd', 1.7);
  sun.position.set(12, 30, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 24, bottom: -24, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 6;
  scene.add(sun);

  /* ---- 바닥: 연한 분홍빛 타일 ---- */
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = THEME.floor;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(0, 0, w / 2, h / 2);
    g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.strokeStyle = 'rgba(170,150,140,.35)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, w / 2, h / 2);
    g.strokeRect(w / 2, 0, w / 2, h / 2);
    g.strokeRect(0, h / 2, w / 2, h / 2);
    g.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 4, D / 4);
  const floor = add(scene, new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }), 0, 0, 0, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  // 가게가 올라앉은 단
  rbox(scene, W + 1.6, 0.5, D + 1.6, THEME.cream, 0, -0.27, 0, 0.2, { cast: false });
  const ground = add(scene, new THREE.CircleGeometry(200, 48), mat('#ddd5e8', 1), 0, -0.5, 0, { cast: false });
  ground.rotation.x = -Math.PI / 2;

  /* ---- 벽: 안쪽 면만 그려서 카메라가 밖으로 나가도 안이 보인다. 위·아래에 세이지 띠 ---- */
  const wallTex = canvasTex(8, 256, (g, w, h) => {
    g.fillStyle = THEME.cream;
    g.fillRect(0, 0, w, h);
    g.fillStyle = THEME.sage;
    g.fillRect(0, 0, w, h * 0.13);
    g.fillRect(0, h * 0.9, w, h * 0.1);
    g.fillStyle = THEME.deep;
    g.fillRect(0, h * 0.13, w, 2);
  });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 });
  const wall = (w, x, z, ry) => {
    const m = add(scene, new THREE.PlaneGeometry(w, ROOM.wallH), wallMat, x, ROOM.wallH / 2, z, { cast: false });
    m.rotation.y = ry;
  };
  wall(W, 0, ROOM.z0, 0);
  wall(W, 0, ROOM.z1, Math.PI);
  wall(D, ROOM.x0, 0, Math.PI / 2);
  wall(D, ROOM.x1, 0, -Math.PI / 2);

  /* ---- 진열대 하나 (타건할 수 있는 키보드) ---- */
  const stations = [];
  function station(product, x, z, accent) {
    rbox(scene, TABLE.w, 0.12, TABLE.d, THEME.wood, x, TABLE.h - 0.06, z, 0.05);
    rbox(scene, TABLE.w - 0.4, TABLE.h - 0.12, TABLE.d - 0.3, tint(accent, 0.25), x, (TABLE.h - 0.12) / 2, z, 0.1);
    for (const dx of [-0.7, 0.7]) rbox(scene, 1.1, 0.42, 0.06, THEME.cream, x + dx, 0.4, z + TABLE.d / 2 - 0.14, 0.04, { cast: false }); // 서랍
    solid(x, z, TABLE.w, TABLE.d);

    const kb = buildKeyboard(product);
    kb.group.position.set(x, TABLE.h, z + 0.2);
    scene.add(kb.group);

    // 이름·가격표
    const card = sign(scene, 1.7, 0.5, (g, w, h) => {
      sticker(g, w, h, THEME.cream, h * 0.28, h * 0.05);
      g.fillStyle = THEME.ink;
      g.textBaseline = 'middle';
      g.font = `800 ${h * 0.3}px ${FONT}`;
      g.fillText(product.name, h * 0.3, h * 0.36, w - h * 0.6);
      g.font = `700 ${h * 0.24}px ${FONT}`;
      g.fillStyle = THEME.pink;
      g.fillText(priceText(product) + (IS_SAMPLE && product.price != null ? ' (예시)' : ''), h * 0.3, h * 0.7, w - h * 0.6);
    }, x, TABLE.h + 0.42, z - 0.48, 0, 512);
    card.rotation.x = -0.3;

    pendant(scene, x, z, accent);

    const i = stations.length;
    stations.push({
      i,
      product,
      kb,
      x,
      z,
      seat: { x, z: z + TABLE.d / 2 + 0.55, face: Math.PI }, // 테이블 앞에 서서 안쪽을 본다
      look: new THREE.Vector3(x, TABLE.h + 0.05, z + 0.2),
    });
  }

  /* 안쪽 벽 위에 붙인 구역 간판 */
  const zoneSign = (title, sub, color, x) => {
    const y = ROOM.wallH - 0.8;
    rbox(scene, 8.4, 1.4, 0.3, color, x, y, ROOM.z0 + 0.15, 0.5);
    sign(scene, 8.2, 1.2, (g, w, h) => {
      sticker(g, w, h, color, h * 0.45, h * 0.035, THEME.cream);
      g.textBaseline = 'middle';
      g.fillStyle = THEME.cream;
      g.font = `900 ${h * 0.46}px ${FONT}`;
      g.textAlign = 'right';
      g.fillText(title, w * 0.6, h * 0.52);
      g.textAlign = 'left';
      g.font = `700 ${h * 0.17}px ${FONT}`;
      g.fillText(sub, w * 0.64, h * 0.54);
    }, x, y, ROOM.z0 + 0.31);
  };

  /* ---- 가운데: 큰 간판, 나무 아치, 카운터, 수납장 ---- */
  rbox(scene, 10.6, 2.1, 0.5, THEME.sage, 0, ROOM.wallH - 0.55, ROOM.z0 + 0.25, 0.6);
  sign(scene, 10, 1.7, (g, w, h) => {
    sticker(g, w, h, THEME.cream, h * 0.5, h * 0.03, THEME.deep);
    logo(g, w * 0.2, h * 0.5, h * 0.62, THEME.ink);
    g.fillStyle = THEME.ink;
    g.textBaseline = 'middle';
    g.font = `900 ${h * 0.46}px ${FONT}`;
    g.fillText(BRAND.name, w * 0.3, h * 0.42);
    g.font = `800 ${h * 0.17}px ${FONT}`;
    g.fillText('— ' + BRAND.ko.split('').join(' ') + ' —', w * 0.42, h * 0.79);
  }, 0, ROOM.wallH - 0.55, ROOM.z0 + 0.52);

  sign(scene, 4.2, 4.1, (g, w, h) => {
    // 나무 널 아치
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, w / 2);
    g.arc(w / 2, w / 2, w / 2, Math.PI, 0);
    g.lineTo(w, h);
    g.closePath();
    g.fillStyle = THEME.wood;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(160,120,70,.35)';
    g.lineWidth = 3;
    for (let x = w / 12; x < w; x += w / 12) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    g.restore();
    logo(g, w / 2, h * 0.36, w * 0.24, THEME.ink);
    g.fillStyle = THEME.ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${w * 0.1}px ${FONT}`;
    g.fillText(BRAND.name, w / 2, h * 0.52);
    g.font = `800 ${w * 0.05}px ${FONT}`;
    g.fillText('— ' + BRAND.ko + ' —', w / 2, h * 0.6);
  }, 0, 2.05, BACK);
  // 카운터
  rbox(scene, 5, 1.0, 1.3, THEME.sage, 0, 0.5, -11.6, 0.3);
  rbox(scene, 5.3, 0.14, 1.5, THEME.cream, 0, 1.07, -11.6, 0.07);
  solid(0, -11.6, 5.3, 1.5);
  const cs = sign(scene, 0.9, 0.7, (g, w, h) => logo(g, w / 2, h / 2, h * 0.8, THEME.cream), 0, 0.52, -10.94, 0, 256);
  cs.renderOrder = 1;
  rbox(scene, 0.9, 0.6, 0.06, '#3a4046', 0.5, 1.6, -11.7, 0.04); // 모니터
  rbox(scene, 0.1, 0.25, 0.1, '#3a4046', 0.5, 1.22, -11.7, 0.02);
  rbox(scene, 0.22, 0.2, 0.22, THEME.woodDark, -1.6, 1.24, -11.6, 0.04);
  globe(scene, -1.6, 1.5, -11.6, 0.2);
  // 양옆 수납장
  for (const s of [-1, 1]) {
    const x = s * 5.2;
    rbox(scene, 3.4, 4, 0.7, THEME.sage, x, 2, -13.6, 0.1);
    solid(x, -13.6, 3.4, 0.8);
    [1.2, 2.1, 3.0].forEach((y, t) => {
      rbox(scene, 3.1, 0.08, 0.7, THEME.wood, x, y, -13.5, 0.03);
      for (let k = 0; k < 3; k++) {
        if ((k + t + (s > 0)) % 3 === 0) for (let b = 0; b < 3; b++) rbox(scene, 0.12, 0.5, 0.36, [THEME.cream, THEME.lavender, THEME.paper][b], x - 1.05 + k * 1.0 + b * 0.14, y + 0.3, -13.4, 0.02, { cast: false });
        else rbox(scene, 0.62, 0.36, 0.44, (k + t) % 2 ? THEME.cream : THEME.paper, x - 1 + k * 1.0, y + 0.22, -13.4, 0.04, { cast: false });
      }
    });
  }

  /* ---- 가운데 둥근 깔개와 타원 테이블 (쉬어 가는 자리) ---- */
  const round = add(scene, new THREE.CircleGeometry(4, 56), mat('#c9d6bf', 1), 0, 0.012, 2.2, { cast: false });
  round.rotation.x = -Math.PI / 2;
  const ring = add(scene, new THREE.RingGeometry(3.5, 3.62, 56), mat(THEME.cream, 1), 0, 0.016, 2.2, { cast: false });
  ring.rotation.x = -Math.PI / 2;
  const top = add(scene, new THREE.CylinderGeometry(1.15, 1.15, 0.12, 40), mat(THEME.wood), 0, 0.8, 2.2);
  top.scale.x = 1.9;
  for (const dx of [-1.3, 1.3]) add(scene, new THREE.CylinderGeometry(0.1, 0.14, 0.74, 12), mat(THEME.woodDark), dx, 0.37, 2.2);
  solid(0, 2.2, 4.2, 2.1);
  miniKb(scene, THEME.sage, -1.1, 0.9, 2.5, 0, 0.08);
  miniKb(scene, THEME.lavender, 0.2, 0.9, 2.55, 0, 0.08);
  miniKb(scene, '#f3c9cf', 1.25, 0.9, 2.35, -0.3, 0.08);
  rbox(scene, 0.7, 0.5, 0.05, THEME.deep, 0.1, 1.3, 1.75, 0.04);
  rbox(scene, 0.08, 0.2, 0.08, '#3a4046', 0.1, 0.96, 1.75, 0.02);
  for (const [x, z] of [[-1.4, 3.9], [0, 4.1], [1.4, 3.9], [-0.9, 0.5], [0.9, 0.5]]) {
    stool(scene, x, z);
    solid(x, z, 0.5, 0.5);
  }

  /* ---- 커스텀 구역 (왼쪽) ---- */
  zoneSign('커스텀 키보드', 'CUSTOM KEYBOARDS', THEME.deep, -15.5);
  rug(scene, 16, 14.5, tint(THEME.sage, 0.55), -16.2, -3.4);
  const customSpots = [[-20.5, -6], [-12, -6], [-20.5, 0.5], [-12, 0.5]];
  CATALOG.filter((p) => p.kind === 'custom')
    .slice(0, customSpots.length)
    .forEach((p, i) => station(p, customSpots[i][0], customSpots[i][1], i % 2 ? THEME.lavender : THEME.sage));

  // 안쪽 벽 작업대: 부품판, 스위치 병, 조립 중인 키보드
  rbox(scene, 9, 0.12, 1.1, THEME.wood, -16, 0.9, -13.3, 0.05);
  rbox(scene, 8.6, 0.84, 0.9, THEME.sage, -16, 0.42, -13.35, 0.08);
  solid(-16, -13.3, 9, 1.2);
  sign(scene, 8.6, 2.0, (g, w, h) => {
    sticker(g, w, h, THEME.paper, h * 0.1, h * 0.02, THEME.deep);
    g.fillStyle = 'rgba(93,122,95,.22)';
    for (let x = 30; x < w; x += 32) for (let y = 30; y < h; y += 32) g.fillRect(x, y, 4, 4);
    g.fillStyle = THEME.ink;
    g.textBaseline = 'middle';
    g.font = `900 ${h * 0.2}px ${FONT}`;
    g.fillText('CUSTOM LAB', w * 0.04, h * 0.22);
    g.font = `700 ${h * 0.09}px ${FONT}`;
    g.fillText('하우징 · 보강판 · 스위치 · 키캡을 골라 만든 키보드', w * 0.04, h * 0.42);
    MINI.forEach((c, i) => {
      g.fillStyle = c;
      g.strokeStyle = THEME.deep;
      g.lineWidth = 4;
      g.beginPath();
      g.roundRect(w * 0.04 + i * w * 0.092, h * 0.6, w * 0.075, w * 0.075, 14);
      g.fill();
      g.stroke();
    });
  }, -16, 2.3, BACK);
  [THEME.lavender, '#f2c14e', '#8fb0c9', THEME.pink, THEME.sage, '#f3c9cf'].forEach((c, i) => {
    add(scene, new THREE.CylinderGeometry(0.16, 0.16, 0.34, 16), mat(c, 0.35), -19.4 + i * 0.5, 1.13, -13.3);
    add(scene, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), mat(THEME.cream), -19.4 + i * 0.5, 1.32, -13.3);
  });
  rbox(scene, 1.7, 0.06, 0.7, THEME.deep, -13.6, 0.99, -13.25, 0.03); // 작업 매트
  miniKb(scene, THEME.cream, -13.6, 1.06, -13.25, 0, 0);
  wallShelves(scene, -1, -11.5, 3.5, 0);
  solid(ROOM.x0 + 0.45, -4, 0.9, 15);

  // 왼쪽 앞: 소파 자리
  const lr = add(scene, new THREE.CircleGeometry(3, 48), mat(tint(THEME.lavender, 0.45), 1), -20, 0.012, 9.6, { cast: false });
  lr.rotation.x = -Math.PI / 2;
  rbox(scene, 4, 0.5, 1.1, THEME.sage, -20, 0.3, 12.5, 0.2);
  rbox(scene, 4, 0.9, 0.4, THEME.sage, -20, 0.75, 13.2, 0.18);
  for (const dx of [-1.2, 0, 1.2]) rbox(scene, 0.8, 0.5, 0.25, dx ? THEME.cream : THEME.lavender, -20 + dx, 0.82, 12.9, 0.1);
  solid(-20, 12.8, 4, 1.7);
  add(scene, new THREE.CylinderGeometry(0.75, 0.75, 0.1, 28), mat(THEME.wood), -20, 0.5, 10);
  add(scene, new THREE.CylinderGeometry(0.12, 0.3, 0.46, 16), mat(THEME.woodDark), -20, 0.23, 10);
  solid(-20, 10, 1.4, 1.4);
  for (const [dx, c] of [[-0.25, THEME.pink], [0.2, THEME.sage]]) add(scene, new THREE.CylinderGeometry(0.08, 0.065, 0.14, 12), mat(c, 0.5), -20 + dx, 0.62, 10 + dx * 0.4);

  /* ---- 완제품 구역 (오른쪽): 브랜드마다 세로 한 줄 ---- */
  zoneSign('완제품 키보드', 'READY TO USE', THEME.pink, 15.5);
  const brandX = [10, 16, 22];
  const rowZ = [-8, -2, 4];
  BRANDS.slice(0, brandX.length).forEach((brand, b) => {
    const x = brandX[b];
    rug(scene, 5.2, 20, tint(brand.color, 0.62), x, -1.6);
    // 안쪽 벽 브랜드 간판
    sign(scene, 5, 1.5, (g, w, h) => {
      sticker(g, w, h, brand.color, h * 0.45, h * 0.035, THEME.cream);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = THEME.cream;
      g.font = `900 ${h * 0.4}px ${FONT}`;
      g.fillText(brand.name, w / 2, h * 0.42);
      g.font = `600 ${h * 0.15}px ${FONT}`;
      g.fillText(brand.desc || '', w / 2, h * 0.76);
    }, x, 2.6, BACK);
    // 줄 앞 안내판
    rbox(scene, 1.5, 1.4, 0.4, brand.color, x, 0.7, 7.8, 0.18);
    sign(scene, 1.3, 1.2, (g, w, h) => {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = THEME.cream;
      g.font = `900 ${h * 0.2}px ${FONT}`;
      g.fillText(brand.name, w / 2, h * 0.4, w * 0.9);
      g.font = `700 ${h * 0.1}px ${FONT}`;
      g.fillText('▲ 타건해 보기', w / 2, h * 0.68);
    }, x, 0.72, 8.01, 0, 256);
    solid(x, 7.8, 1.5, 0.4);

    CATALOG.filter((p) => p.kind === 'prebuilt' && p.brand === brand.id)
      .slice(0, rowZ.length)
      .forEach((p, r) => station(p, x, rowZ[r], brand.color));
  });
  wallShelves(scene, 1, -11.5, 8, 4);
  solid(ROOM.x1 - 0.45, -1.75, 0.9, 19.5);

  /* ---- 입구: 발판, 화단, 등 ---- */
  rug(scene, 5, 2.2, THEME.deep, 0, 12.5);
  const mat0 = sign(scene, 4.4, 1.8, (g, w, h) => {
    logo(g, w / 2, h * 0.3, h * 0.36, THEME.cream);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = THEME.cream;
    g.font = `900 ${h * 0.2}px ${FONT}`;
    g.fillText(BRAND.name, w / 2, h * 0.62);
    g.font = `700 ${h * 0.11}px ${FONT}`;
    g.fillText('— ' + BRAND.ko + ' —', w / 2, h * 0.84);
  }, 0, 0.03, 12.5, 0, 512);
  mat0.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) {
    rbox(scene, 3.4, 0.7, 1, THEME.cream, s * 5.6, 0.35, 13.1, 0.2);
    for (const dx of [-1, 0, 1]) bush(scene, s * 5.6 + dx, 0.95, 13.1, 0.85);
    solid(s * 5.6, 13.1, 3.4, 1);
    lantern(scene, s * 3.5, 13.2);
    solid(s * 3.5, 13.2, 0.4, 0.4);
  }
  for (const [x, z, s] of [[-25, -13, 1.2], [25, 13, 1.1], [-25, 13, 1.1], [-8.5, -13.2, 1], [8.3, 13, 1]]) {
    plant(scene, x, z, s);
    solid(x, z, 0.75 * s, 0.75 * s);
  }

  return { floor, colliders, stations };
}

/* 반지름 r인 원(사람)을 벽과 가구 밖으로 밀어낸다 */
export function collide(p, colliders, r = 0.4) {
  p.x = Math.max(ROOM.x0 + r, Math.min(ROOM.x1 - r, p.x));
  p.z = Math.max(ROOM.z0 + r, Math.min(ROOM.z1 - r, p.z));
  for (const c of colliders) {
    if (p.x <= c.x0 - r || p.x >= c.x1 + r || p.z <= c.z0 - r || p.z >= c.z1 + r) continue;
    const dl = p.x - (c.x0 - r);
    const dr = c.x1 + r - p.x;
    const db = p.z - (c.z0 - r);
    const df = c.z1 + r - p.z;
    const m = Math.min(dl, dr, db, df);
    if (m === dl) p.x = c.x0 - r;
    else if (m === dr) p.x = c.x1 + r;
    else if (m === db) p.z = c.z0 - r;
    else p.z = c.z1 + r;
  }
}
