// 3D 골목 월드 (three.js) — 아기자기한 로우폴리 디오라마
import * as THREE from '../vendor/three.module.min.js';
import { ROAD_W } from './osm.js';
import { rng } from './geo.js';

const SKY = 0xbfe8f7;
const WALLS = [0xffd9d2, 0xffe8b8, 0xd8f0e0, 0xd9e6ff, 0xf3dcff, 0xfff3d6, 0xffd2b0, 0xcfeef2];
const ROOFS = [0xff8f7a, 0xf2a65a, 0x7fc8a9, 0x7aa7e0, 0xb58be0, 0xe86f8f, 0xa98274];
const ROAD_COL = { main: 0xfbf3df, street: 0xf7e9cb, alley: 0xf3deb8, foot: 0xf9eedb };
const ROAD_Y = { main: 0.05, street: 0.08, alley: 0.11, foot: 0.14 };

export function createWorld(canvas, map) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 160, 520);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 1500);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2c4, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 400 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0xd3edbd }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- 길 ----------
  const segs = []; // 이동 제한 + 가게 배치용 선분
  {
    const pos = [], col = [];
    const c = new THREE.Color();
    const tri = (ax, az, bx, bz, cx, cz, y) => { pos.push(ax, y, az, bx, y, bz, cx, y, cz); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b); };
    const ribbon = (p, w, y) => {
      const h = w / 2;
      for (let i = 0; i < p.length; i++) {
        const [x, z] = p[i];
        for (let k = 0; k < 8; k++) { // 꺾이는 곳을 둥글게
          const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
          tri(x, z, x + Math.cos(a0) * h, z + Math.sin(a0) * h, x + Math.cos(a1) * h, z + Math.sin(a1) * h, y);
        }
        if (i === p.length - 1) break;
        const [x2, z2] = p[i + 1];
        const dx = x2 - x, dz = z2 - z, l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * h, nz = (dx / l) * h;
        tri(x + nx, z + nz, x - nx, z - nz, x2 + nx, z2 + nz, y);
        tri(x2 + nx, z2 + nz, x - nx, z - nz, x2 - nx, z2 - nz, y);
      }
    };
    for (const r of map.roads) { c.set(0xffffff); ribbon(r.p, ROAD_W[r.k] + 1.4, ROAD_Y[r.k] - 0.04); }
    for (const r of map.roads) {
      c.set(ROAD_COL[r.k]); ribbon(r.p, ROAD_W[r.k], ROAD_Y[r.k]);
      for (let i = 0; i < r.p.length - 1; i++) segs.push({ ax: r.p[i][0], az: r.p[i][1], bx: r.p[i + 1][0], bz: r.p[i + 1][1], w: ROAD_W[r.k], k: r.k });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    scene.add(m);
  }

  // 선분 공간 격자
  const CELL = 40, grid = new Map();
  const gk = (i, j) => i + ',' + j;
  segs.forEach((s) => {
    const i0 = Math.floor(Math.min(s.ax, s.bx) / CELL) - 1, i1 = Math.floor(Math.max(s.ax, s.bx) / CELL) + 1;
    const j0 = Math.floor(Math.min(s.az, s.bz) / CELL) - 1, j1 = Math.floor(Math.max(s.az, s.bz) / CELL) + 1;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = gk(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(s); }
  });
  function nearestRoad(x, z) {
    let list = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list || !list.length) list = segs;
    let best = null;
    for (const s of list) {
      const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
      const px = s.ax + dx * t, pz = s.az + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d - s.w / 2 < best.d - best.w / 2) best = { px, pz, d, w: s.w };
    }
    return best;
  }

  // ---------- 건물 ----------
  {
    const pos = [], nor = [], col = [];
    const wall = new THREE.Color(), roof = new THREE.Color();
    for (const b of map.buildings) {
      const rand = rng(Math.abs(Math.round(b.p[0][0] * 31 + b.p[0][1] * 17)) + 7);
      wall.set(WALLS[Math.floor(rand() * WALLS.length)]);
      roof.set(ROOFS[Math.floor(rand() * ROOFS.length)]);
      try {
        const shape = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
        const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(3, b.h * 0.6), bevelEnabled: false }).rotateX(-Math.PI / 2);
        const gg = g.index ? g.toNonIndexed() : g;
        const P = gg.attributes.position.array, N = gg.attributes.normal.array;
        for (let i = 0; i < P.length; i += 3) {
          pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]);
          if (N[i + 1] > 0.5) col.push(roof.r, roof.g, roof.b);
          else { const s = P[i + 1] < 0.1 ? 0.8 : 1; col.push(wall.r * s, wall.g * s, wall.b * s); }
        }
        g.dispose();
      } catch {}
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true }));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  // ---------- 가로수 ----------
  {
    const spots = [], rand = rng(77);
    for (const r of map.roads) {
      if (r.k === 'alley' || r.k === 'foot') continue;
      let acc = 0;
      for (let i = 0; i < r.p.length - 1 && spots.length < 420; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1], l = Math.hypot(bx - ax, bz - az) || 1;
        for (let d = 24 - acc; d < l; d += 24) {
          const side = rand() < 0.5 ? 1 : -1, off = ROAD_W[r.k] / 2 + 1.6;
          spots.push([ax + ((bx - ax) * d) / l + (-(bz - az) / l) * off * side, az + ((bz - az) * d) / l + ((bx - ax) / l) * off * side, 0.8 + rand() * 0.5]);
        }
        acc = (acc + l) % 24;
      }
    }
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.36, 2.4, 6), new THREE.MeshToonMaterial({ color: 0xa9795a }), spots.length);
    const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.9, 1), new THREE.MeshToonMaterial({ color: 0x8fd18a }), spots.length);
    const pink = new THREE.Color(0xffb3cd), green = new THREE.Color(0x8fd18a), o = new THREE.Object3D();
    spots.forEach(([x, z, s], i) => {
      o.position.set(x, 1.2 * s, z); o.scale.setScalar(s); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
      o.position.set(x, 3.6 * s, z); o.updateMatrix(); leaf.setMatrixAt(i, o.matrix);
      leaf.setColorAt(i, i % 4 === 0 ? pink : green);
    });
    trunk.castShadow = leaf.castShadow = true;
    scene.add(trunk, leaf);
  }

  // ---------- 글자 스프라이트 ----------
  function label(text, { bg = '#ffffff', fg = '#5b4636', size = 1, border = '#ffb3cd' } = {}) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const font = '700 44px "Jua","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 56;
    cv.width = w; cv.height = 84;
    ctx.font = font; ctx.textBaseline = 'middle';
    ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(4, 4, w - 8, 76, 38); ctx.fill(); ctx.stroke();
    ctx.fillStyle = fg; ctx.fillText(text, 28, 45);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set((w / 84) * 3.2 * size, 3.2 * size, 1);
    sp.renderOrder = 10;
    return sp;
  }

  // 길 이름 + 역
  {
    const seen = new Set();
    for (const r of map.roads) {
      if (!r.n || seen.has(r.n) || seen.size > 40) continue;
      seen.add(r.n);
      const mid = r.p[Math.floor(r.p.length / 2)];
      const sp = label(r.n, { bg: 'rgba(255,255,255,.85)', border: '#e8d9b8', size: 0.75 });
      sp.position.set(mid[0], 1.6, mid[1]);
      scene.add(sp);
    }
    for (const p of map.pois || []) {
      if (p.type !== 'station') continue;
      const sp = label('🚇 ' + p.name, { bg: '#fff4c2', border: '#ffc94d', size: 1.1 });
      sp.position.set(p.x, 12, p.z);
      scene.add(sp);
    }
  }

  // ---------- 주인공 "모랑" (모란 꽃봉오리 요정) ----------
  const player = new THREE.Group();
  const body = new THREE.Group();
  {
    const toon = (c) => new THREE.MeshToonMaterial({ color: c });
    const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), toon(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; body.add(m); return m; };
    ball(1.15, 0xffe9ef, 0, 1.55, 0, 1, 0.95, 1); // 얼굴
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ball(0.72, i % 2 ? 0xff7fa8 : 0xff9dbd, Math.sin(a) * 0.78, 2.35, Math.cos(a) * 0.78 - 0.12, 1, 0.75, 1); }
    ball(0.6, 0xffc94d, 0, 2.72, -0.1, 1, 0.6, 1); // 꽃술
    ball(0.13, 0x4a3628, -0.38, 1.62, 1.03); ball(0.13, 0x4a3628, 0.38, 1.62, 1.03); // 눈
    ball(0.2, 0xffa7bd, -0.68, 1.33, 0.86, 1, 0.6, 0.5); ball(0.2, 0xffa7bd, 0.68, 1.33, 0.86, 1, 0.6, 0.5); // 볼터치
    body.userData.feet = [ball(0.32, 0x7fc8a9, -0.42, 0.3, 0.05, 1, 0.75, 1.25), ball(0.32, 0x7fc8a9, 0.42, 0.3, 0.05, 1, 0.75, 1.25)];
    body.scale.setScalar(1.25);
    player.add(body);
    const ring = new THREE.Mesh(new THREE.RingGeometry(19.4, 20, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7fa8, transparent: true, opacity: 0.55, depthWrite: false }));
    ring.position.y = 0.3; player.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(19.4, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7fa8, transparent: true, opacity: 0.08, depthWrite: false }));
    disc.position.y = 0.28; player.add(disc);
    player.userData.ring = ring;
  }
  scene.add(player);

  // 꽃잎
  const PETALS = 90, petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.38), new THREE.MeshBasicMaterial({ color: 0xffa9c6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), PETALS);
  const pet = Array.from({ length: PETALS }, () => ({ x: (Math.random() - 0.5) * 120, y: Math.random() * 30, z: (Math.random() - 0.5) * 120, r: Math.random() * 6, s: 0.6 + Math.random() }));
  petals.frustumCulled = false; scene.add(petals);

  // ---------- 가게 마커 ----------
  const shopObjs = new Map();
  function setShop(shop, st) { // st: 'hidden' | 'hint' | 'found'
    let o = shopObjs.get(shop.id);
    if (o && o.st === st) return;
    if (o) scene.remove(o.g);
    const g = new THREE.Group();
    g.position.set(shop.x, 0, shop.z);
    if (st === 'hint') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), new THREE.MeshToonMaterial({ color: 0xffd66b }));
      box.position.y = 2.6; box.castShadow = true;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 0.5), new THREE.MeshToonMaterial({ color: 0xff7fa8 }));
      rib.position.y = 2.6;
      const q = label('?', { bg: '#ff7fa8', fg: '#fff', border: '#fff', size: 1.3 }); q.position.y = 6.2;
      g.add(box, rib, q); g.userData.bob = box; g.userData.rib = rib;
    } else if (st === 'found') {
      const c = new THREE.Color(shop.color);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 24), new THREE.MeshToonMaterial({ color: c }));
      base.position.y = 0.3;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 9, 6), new THREE.MeshToonMaterial({ color: 0xffffff }));
      pole.position.y = 4.5;
      const hut = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 4), new THREE.MeshToonMaterial({ color: c }));
      hut.position.y = 2.6; hut.rotation.y = Math.PI / 4;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), new THREE.MeshToonMaterial({ color: 0xfff7ea }));
      hb.position.y = 1.1; hb.castShadow = hut.castShadow = true;
      const tag = label(`${shop.emoji} ${shop.name}`, { border: shop.color }); tag.position.y = 10.4;
      g.add(base, pole, hb, hut, tag); g.userData.tag = tag;
    }
    if (st !== 'hidden') scene.add(g);
    shopObjs.set(shop.id, { g, st });
  }

  // ---------- 입력 ----------
  const P = { x: 0, z: 0, tx: 0, tz: 0, heading: 0, moving: 0 };
  const homeZoom = () => (canvas.clientWidth < canvas.clientHeight ? 1.7 : 1.1);
  let mode = 'explore', zoom = homeZoom(), panX = 0, panZ = 0;
  const joy = { on: false, sx: 0, sy: 0, dx: 0, dy: 0 };
  const keys = new Set();
  const ptrs = new Map();
  let pinch0 = 0, zoom0 = 1;
  const stick = document.getElementById('stick'), knob = stick.firstElementChild;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      Object.assign(joy, { on: true, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 });
      if (mode === 'explore') { stick.style.display = 'block'; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; knob.style.transform = ''; }
    } else if (ptrs.size === 2) {
      joy.on = false; stick.style.display = 'none';
      const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const mx = e.clientX - p.x, my = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      zoom = clampZoom(zoom0 * (pinch0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))));
    } else if (joy.on) {
      if (mode === 'explore') {
        joy.dx = e.clientX - joy.sx; joy.dy = e.clientY - joy.sy;
        const l = Math.hypot(joy.dx, joy.dy), m = Math.min(l, 46) / (l || 1);
        knob.style.transform = `translate(${joy.dx * m}px,${joy.dy * m}px)`;
      } else { const k = 0.16 * zoom; panX -= mx * k; panZ -= my * k * 1.3; }
    }
  });
  const up = (e) => { ptrs.delete(e.pointerId); joy.on = false; joy.dx = joy.dy = 0; stick.style.display = 'none'; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = clampZoom(zoom * (e.deltaY > 0 ? 1.1 : 0.9)); }, { passive: false });
  addEventListener('keydown', (e) => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  const clampZoom = (z) => Math.max(0.45, Math.min(4.5, z));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // ---------- 루프 ----------
  const listeners = [];
  const o3 = new THREE.Object3D();
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    let vx = 0, vz = 0;
    if (mode === 'explore') {
      if (joy.on && Math.hypot(joy.dx, joy.dy) > 8) { const l = Math.hypot(joy.dx, joy.dy); vx = joy.dx / l; vz = joy.dy / l; }
      if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
      if (keys.has('arrowright') || keys.has('d')) vx += 1;
      if (keys.has('arrowup') || keys.has('w')) vz -= 1;
      if (keys.has('arrowdown') || keys.has('s')) vz += 1;
      const l = Math.hypot(vx, vz);
      if (l > 0) {
        const sp = 13 * dt / l;
        let nx = P.x + vx * sp, nz = P.z + vz * sp;
        const nr = nearestRoad(nx, nz);
        if (nr) { const lim = nr.w / 2 + 1.2; if (nr.d > lim) { nx = nr.px + ((nx - nr.px) / nr.d) * lim; nz = nr.pz + ((nz - nr.pz) / nr.d) * lim; } }
        P.heading = Math.atan2(nx - P.x, nz - P.z); P.x = P.tx = nx; P.z = P.tz = nz;
      }
      P.moving = l > 0 ? 1 : 0;
    } else { // GPS: 목표 지점으로 부드럽게
      const dx = P.tx - P.x, dz = P.tz - P.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const k = Math.min(1, dt * 2.5); P.x += dx * k; P.z += dz * k; P.heading = Math.atan2(dx, dz); P.moving = d > 0.8 ? 1 : 0; } else P.moving = 0;
    }
    player.position.set(P.x, 0, P.z);
    let dh = P.heading - body.rotation.y; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); body.rotation.y += dh * Math.min(1, dt * 10);
    body.position.y = P.moving ? Math.abs(Math.sin(t * 11)) * 0.5 : Math.sin(t * 2.2) * 0.08 + 0.08;
    body.userData.feet.forEach((f, i) => (f.position.z = 0.05 + (P.moving ? Math.sin(t * 11 + i * Math.PI) * 0.4 : 0)));
    player.userData.ring.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;

    for (const { g, st } of shopObjs.values()) {
      if (st === 'hint') { const y = 2.6 + Math.abs(Math.sin(t * 4)) * 1.3; g.userData.bob.position.y = g.userData.rib.position.y = y; g.userData.bob.rotation.y = g.userData.rib.rotation.y = t * 1.5; }
      else if (st === 'found') g.userData.tag.position.y = 10.4 + Math.sin(t * 2 + g.position.x) * 0.35;
    }
    pet.forEach((p, i) => {
      p.y -= dt * (1.4 + p.s); p.x += Math.sin(t + p.r) * dt * 1.6; p.r += dt;
      if (p.y < 0) { p.y = 26 + Math.random() * 8; p.x = (Math.random() - 0.5) * 120; p.z = (Math.random() - 0.5) * 120; }
      o3.position.set(P.x + p.x, p.y, P.z + p.z); o3.rotation.set(p.r, p.r * 0.7, p.r * 1.3); o3.scale.setScalar(p.s); o3.updateMatrix(); petals.setMatrixAt(i, o3.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;

    const cx = P.x + panX, cz = P.z + panZ;
    camera.position.set(cx, 64 * zoom, cz + 50 * zoom);
    camera.lookAt(cx, 2, cz);
    scene.fog.near = 150 * Math.max(1, zoom); scene.fog.far = 520 * Math.max(1, zoom);
    sun.position.set(cx + 60, 120, cz + 40); sun.target.position.set(cx, 0, cz);
    renderer.render(scene, camera);
    listeners.forEach((f) => f(dt));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    segs, nearestRoad, setShop,
    get pos() { return { x: P.x, z: P.z }; },
    setMode(m) { mode = m; panX = panZ = 0; joy.on = false; stick.style.display = 'none'; },
    teleport(x, z) { P.x = P.tx = x; P.z = P.tz = z; },
    moveTo(x, z) { if (Math.hypot(x - P.x, z - P.z) > 150) { P.x = x; P.z = z; } P.tx = x; P.tz = z; },
    recenter() { panX = panZ = 0; zoom = homeZoom(); },
    onUpdate(f) { listeners.push(f); },
  };
}
