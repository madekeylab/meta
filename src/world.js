import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CATALOG, BRANDS, priceText, IS_SAMPLE } from './catalog.js';
import { buildKeyboard } from './keyboard.js';

/* 매장: 68 × 32 m. 입구는 +z 쪽 가운데.
   왼쪽 = 커스텀 키보드(2줄×4대), 그 옆 = 녹음실과 이벤트 존, 가운데 = 카운터와 둥근 테이블,
   오른쪽 = 완제품 키보드(브랜드 4줄×4대).
   세이지 그린 · 크림 · 나무 · 라벤더 톤의 아기자기한 가게 */

export const ROOM = { x0: -34, x1: 34, z0: -16, z1: 16, wallH: 5.2 };
export const SPAWN = { x: 0, z: 12.3 };
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
  const spots = []; // 키보드가 아닌 상호작용 자리 (뽑기, 녹음실)
  const W = ROOM.x1 - ROOM.x0;
  const D = ROOM.z1 - ROOM.z0;
  const BACK = ROOM.z0 + 0.03;

  /* ---- 배경과 빛 (낮·노을·밤은 setSky에서 바꾼다) ---- */
  scene.background = new THREE.Color('#e3dcec');
  scene.fog = new THREE.Fog('#e3dcec', 90, 260);
  const hemi = new THREE.HemisphereLight('#fff8ee', '#e0d2c0', 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffeacd', 1.7);
  sun.position.set(12, 30, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 26, bottom: -26, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 6;
  scene.add(sun);
  // 밤에만 켜지는 실내 등
  const nightLights = [[0, -7], [-25, -2], [19, -2], [-13, 2], [0, 9]].map(([x, z]) => {
    const l = new THREE.PointLight('#ffd49a', 0, 30, 1.6);
    l.position.set(x, 4.2, z);
    scene.add(l);
    return l;
  });

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
  rbox(scene, W + 1.6, 0.5, D + 1.6, THEME.cream, 0, -0.27, 0, 0.2, { cast: false }); // 가게가 올라앉은 단
  const groundMat = new THREE.MeshStandardMaterial({ color: '#ddd5e8', roughness: 1 });
  const ground = add(scene, new THREE.CircleGeometry(220, 48), groundMat, 0, -0.5, 0, { cast: false });
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

  /* ---- 책상 네 가지 모양 ---- */
  const T = TABLE;
  const desks = [
    // 0: 나무 상판 + 서랍장
    (x, z, c) => {
      rbox(scene, T.w, 0.12, T.d, THEME.wood, x, T.h - 0.06, z, 0.05);
      rbox(scene, T.w - 0.4, T.h - 0.12, T.d - 0.3, tint(c, 0.25), x, (T.h - 0.12) / 2, z, 0.1);
      for (const dx of [-0.7, 0.7]) rbox(scene, 1.1, 0.42, 0.06, THEME.cream, x + dx, 0.4, z + T.d / 2 - 0.14, 0.04, { cast: false });
    },
    // 1: 크림 상판 + 나무 다리 + 아래 선반
    (x, z, c) => {
      rbox(scene, T.w, 0.1, T.d, THEME.cream, x, T.h - 0.05, z, 0.05);
      for (const dx of [-1.35, 1.35]) for (const dz of [-0.55, 0.55]) add(scene, new THREE.CylinderGeometry(0.06, 0.05, T.h - 0.1, 10), mat(THEME.woodDark), x + dx, (T.h - 0.1) / 2, z + dz);
      rbox(scene, T.w - 0.3, 0.06, T.d - 0.3, THEME.wood, x, 0.22, z, 0.03);
      rbox(scene, 0.7, 0.34, 0.5, tint(c, 0.2), x - 0.8, 0.42, z, 0.05);
      rbox(scene, 0.5, 0.26, 0.4, THEME.paper, x + 0.6, 0.38, z, 0.05);
    },
    // 2: 둥근 통 받침
    (x, z, c) => {
      rbox(scene, T.w, 0.12, T.d, THEME.wood, x, T.h - 0.06, z, 0.3);
      rbox(scene, T.w - 0.3, T.h - 0.12, T.d - 0.2, c, x, (T.h - 0.12) / 2, z, 0.5);
      rbox(scene, T.w - 0.26, 0.1, T.d - 0.16, THEME.cream, x, 0.05, z, 0.05, { cast: false });
    },
    // 3: 두 칸 수납장 (문 두 짝)
    (x, z, c) => {
      rbox(scene, T.w, 0.1, T.d, THEME.cream, x, T.h - 0.05, z, 0.05);
      rbox(scene, T.w - 0.2, T.h - 0.1, T.d - 0.2, THEME.wood, x, (T.h - 0.1) / 2, z, 0.06);
      for (const dx of [-0.68, 0.68]) {
        rbox(scene, 1.28, 0.58, 0.06, tint(c, 0.15), x + dx, 0.4, z + T.d / 2 - 0.1, 0.05, { cast: false });
        add(scene, new THREE.SphereGeometry(0.04, 8, 8), mat(THEME.cream), x + dx * 0.2, 0.42, z + T.d / 2 - 0.05, { cast: false });
      }
    },
  ];
  // 책상 한쪽에 올리는 소품
  const props = [
    (x, z) => {
      rbox(scene, 0.2, 0.18, 0.2, THEME.cream, x, T.h + 0.09, z, 0.04);
      bush(scene, x, T.h + 0.3, z, 0.32);
    },
    (x, z) => {
      rbox(scene, 0.16, 0.14, 0.16, THEME.woodDark, x, T.h + 0.07, z, 0.03);
      globe(scene, x, T.h + 0.25, z, 0.13);
    },
    (x, z, c) => {
      add(scene, new THREE.CylinderGeometry(0.09, 0.075, 0.17, 14), mat(c, 0.5), x, T.h + 0.085, z);
    },
    (x, z, c) => {
      for (let k = 0; k < 3; k++) rbox(scene, 0.15, 0.1, 0.15, [c, THEME.cream, THEME.lavender][k], x + (k - 1) * 0.02, T.h + 0.05 + k * 0.1, z + (k % 2) * 0.02, 0.03, { cast: k === 0 });
    },
  ];

  /* ---- 진열대 하나 (타건할 수 있는 키보드) ---- */
  const stations = [];
  function station(product, x, z, accent) {
    const i = stations.length;
    desks[(i * 5 + Math.floor(i / 4)) % desks.length](x, z, accent);
    props[(i * 3 + 1) % props.length](x + (i % 2 ? 1.22 : -1.22), z - 0.36, accent);
    solid(x, z, T.w, T.d);

    const kb = buildKeyboard(product);
    kb.group.position.set(x, T.h, z + 0.2);
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
    }, x, T.h + 0.42, z - 0.48, 0, 512);
    card.rotation.x = -0.3;

    if (i % 2 === 0) pendant(scene, x, z, accent);

    stations.push({
      i,
      product,
      kb,
      x,
      z,
      seat: { x, z: z + T.d / 2 + 0.55, face: Math.PI }, // 책상 앞에 서서 안쪽을 본다
      look: new THREE.Vector3(x, T.h + 0.05, z + 0.2),
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
  /* 기둥 두 개 위에 올린 간판 (구역 한가운데 세운다) */
  const standSign = (title, sub, color, x, z, w = 4.6) => {
    for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) {
      add(scene, new THREE.CylinderGeometry(0.07, 0.07, 3.3, 10), mat(THEME.cream), x + dx, 1.65, z);
      solid(x + dx, z, 0.2, 0.2);
    }
    rbox(scene, w, 0.95, 0.22, color, x, 3.45, z, 0.4);
    sign(scene, w - 0.2, 0.8, (g, cw, ch) => {
      sticker(g, cw, ch, color, ch * 0.45, ch * 0.045, THEME.cream);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = THEME.cream;
      g.font = `900 ${ch * 0.42}px ${FONT}`;
      g.fillText(title, cw / 2, ch * 0.4);
      g.font = `700 ${ch * 0.17}px ${FONT}`;
      g.fillText(sub, cw / 2, ch * 0.76);
    }, x, 3.45, z + 0.12);
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
  const CZ = ROOM.z0 + 2.4; // 카운터
  rbox(scene, 5, 1.0, 1.3, THEME.sage, 0, 0.5, CZ, 0.3);
  rbox(scene, 5.3, 0.14, 1.5, THEME.cream, 0, 1.07, CZ, 0.07);
  solid(0, CZ, 5.3, 1.5);
  sign(scene, 0.9, 0.7, (g, w, h) => logo(g, w / 2, h / 2, h * 0.8, THEME.cream), 0, 0.52, CZ + 0.66, 0, 256);
  rbox(scene, 0.9, 0.6, 0.06, '#3a4046', 0.5, 1.6, CZ - 0.1, 0.04);
  rbox(scene, 0.1, 0.25, 0.1, '#3a4046', 0.5, 1.22, CZ - 0.1, 0.02);
  rbox(scene, 0.22, 0.2, 0.22, THEME.woodDark, -1.6, 1.24, CZ, 0.04);
  globe(scene, -1.6, 1.5, CZ, 0.2);
  for (const s of [-1, 1]) {
    const x = s * 5.2;
    const z = ROOM.z0 + 0.4;
    rbox(scene, 3.4, 4, 0.7, THEME.sage, x, 2, z, 0.1);
    solid(x, z, 3.4, 0.8);
    [1.2, 2.1, 3.0].forEach((y, t) => {
      rbox(scene, 3.1, 0.08, 0.7, THEME.wood, x, y, z + 0.1, 0.03);
      for (let k = 0; k < 3; k++) {
        if ((k + t + (s > 0)) % 3 === 0) for (let b = 0; b < 3; b++) rbox(scene, 0.12, 0.5, 0.36, [THEME.cream, THEME.lavender, THEME.paper][b], x - 1.05 + k * 1.0 + b * 0.14, y + 0.3, z + 0.2, 0.02, { cast: false });
        else rbox(scene, 0.62, 0.36, 0.44, (k + t) % 2 ? THEME.cream : THEME.paper, x - 1 + k * 1.0, y + 0.22, z + 0.2, 0.04, { cast: false });
      }
    });
  }

  /* ---- 가운데 둥근 깔개와 타원 테이블 (쉬어 가는 자리) ---- */
  const RZ = 3;
  const round = add(scene, new THREE.CircleGeometry(4, 56), mat('#c9d6bf', 1), 0, 0.012, RZ, { cast: false });
  round.rotation.x = -Math.PI / 2;
  const ring = add(scene, new THREE.RingGeometry(3.5, 3.62, 56), mat(THEME.cream, 1), 0, 0.016, RZ, { cast: false });
  ring.rotation.x = -Math.PI / 2;
  const top = add(scene, new THREE.CylinderGeometry(1.15, 1.15, 0.12, 40), mat(THEME.wood), 0, 0.8, RZ);
  top.scale.x = 1.9;
  for (const dx of [-1.3, 1.3]) add(scene, new THREE.CylinderGeometry(0.1, 0.14, 0.74, 12), mat(THEME.woodDark), dx, 0.37, RZ);
  solid(0, RZ, 4.2, 2.1);
  miniKb(scene, THEME.sage, -1.1, 0.9, RZ + 0.3, 0, 0.08);
  miniKb(scene, THEME.lavender, 0.2, 0.9, RZ + 0.35, 0, 0.08);
  miniKb(scene, '#f3c9cf', 1.25, 0.9, RZ + 0.15, -0.3, 0.08);
  rbox(scene, 0.7, 0.5, 0.05, THEME.deep, 0.1, 1.3, RZ - 0.45, 0.04);
  rbox(scene, 0.08, 0.2, 0.08, '#3a4046', 0.1, 0.96, RZ - 0.45, 0.02);
  for (const [x, dz] of [[-1.4, 1.7], [0, 1.9], [1.4, 1.7], [-0.9, -1.7], [0.9, -1.7]]) {
    stool(scene, x, RZ + dz);
    solid(x, RZ + dz, 0.5, 0.5);
  }

  const rowZ = [-10, -4.5, 1, 6.5];

  /* ---- 커스텀 구역 (왼쪽): 2줄 × 4대 ---- */
  zoneSign('커스텀 키보드', 'CUSTOM KEYBOARDS', THEME.deep, -25.2);
  rug(scene, 13.5, 24, tint(THEME.sage, 0.55), -25.2, -2.2);
  const customX = [-28.5, -22];
  CATALOG.filter((p) => p.kind === 'custom')
    .slice(0, customX.length * rowZ.length)
    .forEach((p, i) => station(p, customX[i % 2], rowZ[Math.floor(i / 2)], [THEME.sage, THEME.lavender, THEME.pink, '#8fb0c9'][(i + Math.floor(i / 2)) % 4]));

  // 안쪽 벽 작업대: 부품판, 스위치 병, 조립 중인 키보드
  const LZ = ROOM.z0 + 0.7;
  rbox(scene, 9, 0.12, 1.1, THEME.wood, -25.2, 0.9, LZ, 0.05);
  rbox(scene, 8.6, 0.84, 0.9, THEME.sage, -25.2, 0.42, LZ - 0.05, 0.08);
  solid(-25.2, LZ, 9, 1.2);
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
  }, -25.2, 2.3, BACK);
  [THEME.lavender, '#f2c14e', '#8fb0c9', THEME.pink, THEME.sage, '#f3c9cf'].forEach((c, i) => {
    add(scene, new THREE.CylinderGeometry(0.16, 0.16, 0.34, 16), mat(c, 0.35), -28.6 + i * 0.5, 1.13, LZ);
    add(scene, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), mat(THEME.cream), -28.6 + i * 0.5, 1.32, LZ);
  });
  rbox(scene, 1.7, 0.06, 0.7, THEME.deep, -22.8, 0.99, LZ + 0.05, 0.03);
  miniKb(scene, THEME.cream, -22.8, 1.06, LZ + 0.05, 0, 0);
  wallShelves(scene, -1, -13, 9.5, 0);
  solid(ROOM.x0 + 0.45, -1.75, 0.9, 22.5);

  // 왼쪽 앞: 소파 자리
  const lr = add(scene, new THREE.CircleGeometry(2.6, 48), mat(tint(THEME.lavender, 0.45), 1), -25, 0.014, 12.6, { cast: false });
  lr.rotation.x = -Math.PI / 2;
  rbox(scene, 4, 0.5, 1.1, THEME.sage, -25, 0.3, 14.6, 0.2);
  rbox(scene, 4, 0.9, 0.4, THEME.sage, -25, 0.75, 15.3, 0.18);
  for (const dx of [-1.2, 0, 1.2]) rbox(scene, 0.8, 0.5, 0.25, dx ? THEME.cream : THEME.lavender, -25 + dx, 0.82, 15, 0.1);
  solid(-25, 14.9, 4, 1.7);
  add(scene, new THREE.CylinderGeometry(0.7, 0.7, 0.1, 28), mat(THEME.wood), -25, 0.5, 12.4);
  add(scene, new THREE.CylinderGeometry(0.12, 0.3, 0.46, 16), mat(THEME.woodDark), -25, 0.23, 12.4);
  solid(-25, 12.4, 1.3, 1.3);

  /* ---- 녹음실 (안쪽 벽, 커스텀 구역과 카운터 사이) ---- */
  const BX = -13;
  rug(scene, 5.6, 4.8, '#5a5670', BX, ROOM.z0 + 2.5);
  sign(scene, 5.8, 3.4, (g, w, h) => {
    // 흡음재 벽
    g.fillStyle = '#6a6682';
    g.fillRect(0, 0, w, h);
    const n = 12;
    const s = w / n;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#7a7696' : '#5d5975';
      g.beginPath();
      g.roundRect(x * s + 4, y * s + 4, s - 8, s - 8, 10);
      g.fill();
    }
  }, BX, 1.75, BACK);
  for (const dx of [-3, 3]) {
    rbox(scene, 0.25, 3.5, 4.6, THEME.cream, BX + dx, 1.75, ROOM.z0 + 2.3, 0.1);
    rbox(scene, 0.3, 0.3, 4.7, THEME.sage, BX + dx, 3.6, ROOM.z0 + 2.3, 0.1);
    solid(BX + dx, ROOM.z0 + 2.3, 0.3, 4.6);
  }
  rbox(scene, 6.3, 0.9, 0.3, '#5a5670', BX, 3.95, ROOM.z0 + 4.55, 0.3);
  sign(scene, 6, 0.75, (g, w, h) => {
    g.textBaseline = 'middle';
    g.fillStyle = '#ff8f80';
    g.beginPath();
    g.arc(w * 0.13, h / 2, h * 0.2, 0, 7);
    g.fill();
    g.fillStyle = THEME.cream;
    g.font = `900 ${h * 0.5}px ${FONT}`;
    g.fillText('녹음실', w * 0.2, h * 0.52);
    g.font = `700 ${h * 0.22}px ${FONT}`;
    g.fillText('RECORDING STUDIO', w * 0.5, h * 0.55);
  }, BX, 3.95, ROOM.z0 + 4.71);
  rbox(scene, 3.2, 0.1, 1.2, THEME.wood, BX, 0.85, ROOM.z0 + 1.2, 0.05);
  rbox(scene, 2.9, 0.8, 1.0, THEME.lavender, BX, 0.4, ROOM.z0 + 1.2, 0.1);
  solid(BX, ROOM.z0 + 1.2, 3.2, 1.2);
  miniKb(scene, THEME.cream, BX - 0.2, 0.95, ROOM.z0 + 1.35, 0, 0.06);
  // 마이크와 헤드폰
  add(scene, new THREE.CylinderGeometry(0.16, 0.18, 0.04, 16), mat('#3a4046'), BX + 1.0, 0.92, ROOM.z0 + 1.2);
  const stand = add(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), mat('#3a4046'), BX + 0.9, 1.18, ROOM.z0 + 1.25);
  stand.rotation.z = 0.35;
  const mic = add(scene, new THREE.CapsuleGeometry(0.07, 0.16, 6, 12), mat('#c9bbe3', 0.4), BX + 0.72, 1.5, ROOM.z0 + 1.3);
  mic.rotation.z = 1.2;
  const hp = add(scene, new THREE.TorusGeometry(0.15, 0.03, 8, 20, Math.PI), mat('#3a4046'), BX - 1.2, 1.02, ROOM.z0 + 1.2);
  for (const dx of [-0.15, 0.15]) add(scene, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), mat(THEME.pink), BX - 1.2 + dx, 0.98, ROOM.z0 + 1.2).rotation.z = Math.PI / 2;
  hp.castShadow = false;
  const onAir = add(scene, new THREE.SphereGeometry(0.14, 14, 10), new THREE.MeshBasicMaterial({ color: '#ff8f80' }), BX + 2.4, 3.2, ROOM.z0 + 0.3, { cast: false });
  spots.push({ type: 'rec', x: BX, z: ROOM.z0 + 2.7, r: 1.9, label: '녹음실에서 타건음 녹음하기' });

  /* ---- 이벤트 존: 키캡 뽑기 (녹음실 앞쪽) ---- */
  const EX = -13;
  const EZ = 2;
  const er = add(scene, new THREE.CircleGeometry(3.6, 56), mat(tint(THEME.pink, 0.55), 1), EX, 0.012, EZ, { cast: false });
  er.rotation.x = -Math.PI / 2;
  const er2 = add(scene, new THREE.RingGeometry(3.1, 3.22, 56), mat(THEME.cream, 1), EX, 0.016, EZ, { cast: false });
  er2.rotation.x = -Math.PI / 2;
  standSign('이벤트 존', 'EVENT ZONE · 키캡 뽑기', THEME.pink, EX, EZ - 2.2);
  // 뽑기 기계
  const gacha = new THREE.Group();
  gacha.position.set(EX, 0, EZ - 0.6);
  scene.add(gacha);
  rbox(gacha, 1.5, 1.15, 1.3, THEME.pink, 0, 0.58, 0, 0.2);
  rbox(gacha, 1.62, 0.14, 1.42, THEME.cream, 0, 1.2, 0, 0.07);
  rbox(gacha, 0.7, 0.5, 0.08, THEME.cream, -0.2, 0.62, 0.66, 0.08, { cast: false });
  rbox(gacha, 0.46, 0.22, 0.1, '#5a4a4a', -0.2, 0.42, 0.68, 0.06, { cast: false }); // 나오는 구멍
  const knob = add(gacha, new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20), mat(THEME.cream), 0.42, 0.72, 0.7, { cast: false });
  knob.rotation.x = Math.PI / 2;
  const handle = rbox(gacha, 0.3, 0.07, 0.08, THEME.deep, 0.42, 0.72, 0.77, 0.03, { cast: false });
  const dome = add(gacha, new THREE.SphereGeometry(0.82, 28, 20), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.1 }), 0, 1.95, 0, { cast: false });
  dome.renderOrder = 2;
  const capsules = [];
  const capColors = [THEME.lavender, '#f3cf6b', THEME.sage, '#f3c9cf', '#8fb0c9', THEME.cream, THEME.pink];
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = 0.18 + (i % 4) * 0.14;
    const c = rbox(gacha, 0.26, 0.2, 0.26, capColors[i % capColors.length], Math.cos(a) * r, 1.42 + Math.floor(i / 6) * 0.24 + (i % 3) * 0.04, Math.sin(a) * r, 0.06, { cast: false });
    c.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    c.userData.y = c.position.y;
    capsules.push(c);
  }
  rbox(gacha, 0.5, 0.16, 0.5, THEME.cream, 0, 2.78, 0, 0.07);
  solid(EX, EZ - 0.6, 1.6, 1.4);
  // 선물 상자와 풍선
  rbox(scene, 0.7, 0.6, 0.7, THEME.lavender, EX - 2.2, 0.3, EZ - 1, 0.08);
  rbox(scene, 0.74, 0.12, 0.2, THEME.cream, EX - 2.2, 0.62, EZ - 1, 0.03, { cast: false });
  rbox(scene, 0.5, 0.45, 0.5, '#f3cf6b', EX + 2.1, 0.23, EZ - 0.9, 0.08);
  solid(EX - 2.2, EZ - 1, 0.7, 0.7);
  solid(EX + 2.1, EZ - 0.9, 0.5, 0.5);
  [[-2.2, THEME.sage, 2.5], [-1.85, THEME.pink, 2.9], [2.1, THEME.lavender, 2.6], [2.45, '#f3cf6b', 2.2]].forEach(([dx, c, y]) => {
    add(scene, new THREE.SphereGeometry(0.3, 16, 14), mat(c, 0.4), EX + dx, y, EZ - 1 + (dx > 0 ? 0.1 : 0)).scale.y = 1.15;
    add(scene, new THREE.CylinderGeometry(0.008, 0.008, y - 0.9, 5), mat(THEME.ink), EX + dx, (y + 0.3) / 2, EZ - 1 + (dx > 0 ? 0.1 : 0), { cast: false });
  });
  spots.push({ type: 'gacha', x: EX, z: EZ + 0.85, r: 1.6, label: '키캡 뽑기 돌리기' });

  /* ---- 완제품 구역 (오른쪽): 브랜드마다 세로 한 줄 × 4대 ---- */
  zoneSign('완제품 키보드', 'READY TO USE', THEME.pink, 19.3);
  const brandX = [9.5, 16, 22.5, 29];
  BRANDS.slice(0, brandX.length).forEach((brand, b) => {
    const x = brandX[b];
    rug(scene, 5.4, 24, tint(brand.color, 0.62), x, -2.2);
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
    rbox(scene, 1.5, 1.4, 0.4, brand.color, x, 0.7, 10.4, 0.18);
    sign(scene, 1.3, 1.2, (g, w, h) => {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = THEME.cream;
      g.font = `900 ${h * 0.2}px ${FONT}`;
      g.fillText(brand.name, w / 2, h * 0.4, w * 0.9);
      g.font = `700 ${h * 0.1}px ${FONT}`;
      g.fillText('▲ 타건해 보기', w / 2, h * 0.68);
    }, x, 0.72, 10.61, 0, 256);
    solid(x, 10.4, 1.5, 0.4);

    CATALOG.filter((p) => p.kind === 'prebuilt' && p.brand === brand.id)
      .slice(0, rowZ.length)
      .forEach((p, r) => station(p, x, rowZ[r], brand.color));
  });
  wallShelves(scene, 1, -13, 11, 4);
  solid(ROOM.x1 - 0.45, -1, 0.9, 24);

  /* ---- 입구: 발판, 화단, 등 ---- */
  const EN = ROOM.z1 - 1.5;
  rug(scene, 5, 2.2, THEME.deep, 0, EN);
  const mat0 = sign(scene, 4.4, 1.8, (g, w, h) => {
    logo(g, w / 2, h * 0.3, h * 0.36, THEME.cream);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = THEME.cream;
    g.font = `900 ${h * 0.2}px ${FONT}`;
    g.fillText(BRAND.name, w / 2, h * 0.62);
    g.font = `700 ${h * 0.11}px ${FONT}`;
    g.fillText('— ' + BRAND.ko + ' —', w / 2, h * 0.84);
  }, 0, 0.03, EN, 0, 512);
  mat0.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) {
    rbox(scene, 3.4, 0.7, 1, THEME.cream, s * 5.6, 0.35, EN + 0.6, 0.2);
    for (const dx of [-1, 0, 1]) bush(scene, s * 5.6 + dx, 0.95, EN + 0.6, 0.85);
    solid(s * 5.6, EN + 0.6, 3.4, 1);
    lantern(scene, s * 3.5, EN + 0.7);
    solid(s * 3.5, EN + 0.7, 0.4, 0.4);
  }
  for (const [x, z, s] of [[-33, -15, 1.2], [33, 15, 1.1], [-33, 15, 1.1], [-8.6, -15.2, 1], [8.6, 15, 1], [-17.3, -15.2, 1], [5.5, 9, 1], [-17.5, 12, 1]]) {
    plant(scene, x, z, s);
    solid(x, z, 0.75 * s, 0.75 * s);
  }

  /* ---- 낮 · 노을 · 밤 ---- */
  const SKY = {
    day: { bg: '#e3dcec', ground: '#ddd5e8', hemi: ['#fff8ee', '#e0d2c0', 1.45], sun: ['#ffeacd', 1.7, [12, 30, 20]], lamp: 0, exposure: 1.0 },
    sunset: { bg: '#f6c9a8', ground: '#e6b9a4', hemi: ['#ffdcc0', '#d6ab9c', 1.05], sun: ['#ff9d62', 1.9, [30, 13, 12]], lamp: 22, exposure: 1.0 },
    night: { bg: '#262a45', ground: '#2f3352', hemi: ['#9aa6e0', '#3d3d5c', 0.5], sun: ['#aab8ff', 0.5, [-14, 28, 16]], lamp: 75, exposure: 1.08 },
  };
  function setSky(mode, renderer) {
    const s = SKY[mode] || SKY.day;
    scene.background.set(s.bg);
    scene.fog.color.set(s.bg);
    groundMat.color.set(s.ground);
    hemi.color.set(s.hemi[0]);
    hemi.groundColor.set(s.hemi[1]);
    hemi.intensity = s.hemi[2];
    sun.color.set(s.sun[0]);
    sun.intensity = s.sun[1];
    sun.position.set(...s.sun[2]);
    nightLights.forEach((l) => (l.intensity = s.lamp));
    if (renderer) renderer.toneMappingExposure = s.exposure;
  }

  /* 뽑기 기계가 덜그럭거리는 움직임. t = 돌리기 시작한 뒤 지난 시간(초), 끝났으면 음수 */
  function animateGacha(t) {
    const on = t >= 0 && t < 1.1;
    gacha.rotation.z = on ? Math.sin(t * 40) * 0.035 : 0;
    handle.rotation.z = on ? t * 9 : 0;
    capsules.forEach((c, i) => (c.position.y = c.userData.y + (on ? Math.abs(Math.sin(t * 18 + i)) * 0.16 : 0)));
    onAir.visible = true;
  }

  return { floor, colliders, stations, spots, setSky, animateGacha };
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
