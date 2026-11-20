import * as THREE from 'three';
import { CATALOG, SWITCHES } from './catalog.js';
import { buildKeyboard } from './keyboard.js';

/* 매장: 36 × 24 m. 입구는 +z 쪽, 안쪽 벽(-z)에 간판.
   가운데에 키보드 진열 테이블 6개, 오른쪽 구석에 쉬는 자리 */

export const ROOM = { x0: -18, x1: 18, z0: -12, z1: 12, wallH: 4.2 };
export const SPAWN = { x: 0, z: 9 };
export const BRAND = { name: 'madekey', tagline: 'ONLINE TYPING SHOP', accent: '#2f6bff', ink: '#16181d' };

const TABLE = { w: 3, d: 1.3, h: 0.85 };

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

function box(parent, w, h, d, color, x, y, z, rough = 0.85) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: rough }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function sign(parent, w, h, draw, x, y, z, ry = 0) {
  const tex = canvasTex(1024, Math.round((1024 * h) / w), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

function plant(parent, x, z) {
  box(parent, 0.7, 0.6, 0.7, '#e9e4da', x, 0.3, z);
  const leaf = new THREE.MeshStandardMaterial({ color: '#4f8a63', roughness: 0.9 });
  [[0, 1.25, 0, 0.55], [0.25, 0.95, 0.15, 0.38], [-0.22, 1.0, -0.12, 0.4]].forEach(([dx, y, dz, r]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), leaf);
    s.position.set(x + dx, y, z + dz);
    parent.add(s);
  });
}

export function buildWorld(scene) {
  const colliders = [];
  const solid = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  const W = ROOM.x1 - ROOM.x0;
  const D = ROOM.z1 - ROOM.z0;

  // 조명
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d2c5', 1.5));
  const sun = new THREE.DirectionalLight('#fff4e3', 1.6);
  sun.position.set(8, 16, 10);
  scene.add(sun);

  // 바닥: 밝은 나무 널
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e4d6c1';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(120,90,60,.06)';
      g.fillRect(0, i * 64, w, 64);
      g.fillStyle = 'rgba(90,65,40,.22)';
      g.fillRect(0, i * 64, w, 2);
      g.fillRect(((i * 197) % 512), i * 64, 2, 64);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 4, D / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 바깥 바닥
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#cfd6dc', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // 벽: 안쪽을 향한 면만 그려서, 카메라가 벽 밖으로 나가도 매장 안이 보인다
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.95 });
  const wall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ROOM.wallH), wallMat);
    m.position.set(x, ROOM.wallH / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  wall(W, 0, ROOM.z0, 0);
  wall(W, 0, ROOM.z1, Math.PI);
  wall(D, ROOM.x0, 0, Math.PI / 2);
  wall(D, ROOM.x1, 0, -Math.PI / 2);
  // 안쪽 벽 아래 포인트 띠
  box(scene, W, 0.12, 0.06, BRAND.accent, 0, 0.06, ROOM.z0 + 0.03);

  // 간판
  sign(scene, 12, 3, (g, w, h) => {
    g.fillStyle = BRAND.ink;
    g.font = `800 ${h * 0.5}px "Pretendard", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(BRAND.name, w / 2, h * 0.42);
    g.fillStyle = BRAND.accent;
    g.font = `600 ${h * 0.11}px "Pretendard", system-ui, sans-serif`;
    g.fillText(BRAND.tagline.split('').join(' '), w / 2, h * 0.8);
  }, 0, 2.5, ROOM.z0 + 0.02);

  // 진열 테이블 + 키보드
  const stations = [];
  const spots = [];
  for (const z of [-4.5, 2.5]) for (const x of [-9, 0, 9]) spots.push({ x, z });
  CATALOG.slice(0, spots.length).forEach((product, i) => {
    const { x, z } = spots[i];
    box(scene, TABLE.w, 0.08, TABLE.d, '#ffffff', x, TABLE.h - 0.04, z, 0.5);
    box(scene, TABLE.w - 0.3, TABLE.h - 0.08, TABLE.d - 0.3, '#2a2d34', x, (TABLE.h - 0.08) / 2, z);
    solid(x, z, TABLE.w, TABLE.d);

    const kb = buildKeyboard(product);
    kb.group.position.set(x, TABLE.h, z + 0.2);
    scene.add(kb.group);

    // 제품 이름표
    const card = sign(scene, 1.9, 0.4, (g, w, h) => {
      g.fillStyle = '#16181d';
      g.beginPath();
      g.roundRect(0, 0, w, h, 40);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `700 ${h * 0.34}px "Pretendard", system-ui, sans-serif`;
      g.textBaseline = 'middle';
      g.fillText(product.name, 50, h * 0.52, w * 0.62);
      g.fillStyle = '#9fb7ff';
      g.font = `600 ${h * 0.24}px "Pretendard", system-ui, sans-serif`;
      g.textAlign = 'right';
      g.fillText(SWITCHES[product.sw] || '', w - 50, h * 0.53, w * 0.24);
    }, x, TABLE.h + 0.45, z - 0.45);
    card.rotation.x = -0.25;

    // 테이블 위 조명
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.22, 20), new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.6 }));
    lamp.position.set(x, 3.95, z);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), new THREE.MeshBasicMaterial({ color: "#fff3d6" }));
    glow.rotation.x = Math.PI / 2;
    glow.position.set(x, 3.83, z);
    scene.add(lamp, glow);

    stations.push({
      i,
      product,
      kb,
      x,
      z,
      seat: { x, z: z + TABLE.d / 2 + 0.55, face: Math.PI }, // 테이블 앞에 서서 안쪽을 본다
      look: new THREE.Vector3(x, TABLE.h + 0.05, z + 0.2),
    });
  });

  // 쉬는 자리 (오른쪽 앞)
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3, 40), new THREE.MeshStandardMaterial({ color: '#dfe6f7', roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(13.5, 0.01, 8);
  scene.add(rug);
  box(scene, 3.2, 0.5, 1, '#3a4152', 13.5, 0.25, 10.6);
  box(scene, 3.2, 0.7, 0.3, '#3a4152', 13.5, 0.75, 11.05);
  solid(13.5, 10.75, 3.2, 1.3);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.45, 24), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }));
  coffee.position.set(13.5, 0.225, 8.4);
  scene.add(coffee);
  solid(13.5, 8.4, 1.2, 1.2);

  // 화분
  for (const [x, z] of [[-17, -11], [17, -11], [-17, 11], [9.5, 11]]) {
    plant(scene, x, z);
    solid(x, z, 0.8, 0.8);
  }

  // 입구 안내
  sign(scene, 5, 0.9, (g, w, h) => {
    g.fillStyle = BRAND.ink;
    g.font = `700 ${h * 0.42}px "Pretendard", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('키보드 앞에서 E를 눌러 타건해 보세요', w / 2, h / 2);
  }, -11, 2.2, ROOM.z1 - 0.02, Math.PI);

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
