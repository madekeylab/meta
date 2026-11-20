import * as THREE from 'three';
import { brandOf, priceText, specsOf, IS_SAMPLE } from './catalog.js';
import { buildWorld, collide, SPAWN } from './world.js';
import { makeAvatar, animateAvatar, setAvatarName, setAvatarColor, disposeAvatar, sayAvatar, jumpAvatar, CAP_COLORS } from './avatar.js';
import { KB_WIDTH } from './keyboard.js';
import { productImage } from './thumb.js';
import { createAudio } from './audio.js';
import { createNet } from './net.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

/* ---- 렌더러 ---- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);

const world = buildWorld(scene);
const audio = createAudio();

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ---- 상태 ---- */
const me = { x: SPAWN.x, z: SPAWN.z, face: Math.PI, name: '', color: 0, seat: -1, av: null };
let mode = 'entry'; // entry | walk | type
let net = null;
let goal = null;
const held = {};
const cam = { yaw: 0, pitch: 0.5, dist: 13 };
const remotes = new Map(); // id → { av, x, z, f, seat }
let near = null;
let typed = 0;
let typeStart = 0;

const mark = new THREE.Mesh(
  new THREE.RingGeometry(0.22, 0.34, 28),
  new THREE.MeshBasicMaterial({ color: '#67542b', transparent: true, opacity: 0.75, depthWrite: false }),
);
mark.rotation.x = -Math.PI / 2;
mark.position.y = 0.04;
mark.visible = false;
scene.add(mark);

function goTo(x, z) {
  goal = { x, z, best: 1e9, stuck: 0 };
  mark.position.set(x, 0.04, z);
  mark.visible = true;
}

/* ---- 입장 화면 ---- */
const nickInput = $('nick');
nickInput.value = store.get('mk-nick') || '';
me.color = Math.min(CAP_COLORS.length - 1, parseInt(store.get('mk-color') || '0', 10) || 0);
CAP_COLORS.forEach((hex, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.style.background = hex;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', '모자 색 ' + (i + 1));
  b.setAttribute('aria-checked', i === me.color);
  b.onclick = () => {
    me.color = i;
    [...$('colors').children].forEach((c, j) => c.setAttribute('aria-checked', j === i));
  };
  $('colors').appendChild(b);
});

function cleanNick(s) {
  return s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
}

function enter() {
  me.name = cleanNick(nickInput.value) || '키룡이' + Math.floor(100 + Math.random() * 900);
  store.set('mk-nick', me.name);
  store.set('mk-color', String(me.color));
  me.x = SPAWN.x + (Math.random() - 0.5) * 3;
  me.z = SPAWN.z + (Math.random() - 0.5) * 1.5;
  me.av = makeAvatar(me.color, me.name);
  scene.add(me.av.group);
  audio.unlock();
  $('entry').hidden = true;
  $('hud').hidden = false;
  mode = 'walk';

  const wantRoom = new URLSearchParams(location.search).get('room') || '1';
  net = createNet({ room: wantRoom, onPeers: syncPeers, onKey: remoteKey, onEvent: remoteEvent, onStatus: netStatus });
  net.presence({ nm: me.name, c: me.color, x: round(me.x), z: round(me.z), f: round(me.face) });
}
$('go').onclick = enter;
nickInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) enter();
});

/* ---- 서버(방) 표시 ---- */
let roomCap = 100;
let online = false;
function renderRoom() {
  $('roomName').textContent = (net ? net.room : '1') + '서버';
  $('roomCnt').textContent = online ? String(remotes.size + 1).padStart(2, '0') + '/' + roomCap : '연결 중…';
}
function netStatus(s) {
  online = s.online;
  if (s.cap) roomCap = s.cap;
  if (s.online) {
    try {
      history.replaceState(null, '', '?room=' + encodeURIComponent(s.room));
    } catch {}
    if (s.moved) toast('고른 서버가 가득 차서 ' + s.room + '서버로 들어왔어요');
  }
  renderRoom();
}
$('roomBtn').onclick = async () => {
  const pop = $('roomPop');
  pop.hidden = !pop.hidden;
  $('roomBtn').setAttribute('aria-expanded', !pop.hidden);
  if (pop.hidden) return;
  pop.textContent = '불러오는 중…';
  try {
    const { rooms } = await (await fetch('/api/rooms')).json();
    pop.textContent = '';
    rooms.forEach((r) => {
      const here = net && r.room === String(net.room);
      const b = document.createElement('button');
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', here);
      b.disabled = !here && r.n >= r.cap;
      const name = document.createElement('span');
      name.textContent = r.room + '서버';
      const cnt = document.createElement('small');
      cnt.textContent = r.n + '/' + r.cap;
      b.append(name, cnt);
      b.onclick = () => {
        pop.hidden = true;
        if (!here) {
          if (mode === 'type') stand();
          net.switchRoom(r.room);
        }
      };
      pop.appendChild(b);
    });
  } catch {
    pop.textContent = '서버 목록을 불러오지 못했어요';
  }
};

$('mute').onclick = () => {
  audio.setMuted(!audio.muted);
  $('mute').textContent = audio.muted ? '소리 꺼짐' : '소리 켜짐';
  $('mute').setAttribute('aria-pressed', audio.muted);
};

// 구역 바로 가기: 그 구역 입구까지 걸어간다
const ZONE_GATE = { custom: [-12, 2.5], prebuilt: [10, 6] };
document.querySelectorAll('[data-go]').forEach((b) => {
  b.onclick = () => {
    if (mode === 'type') stand();
    if (mode === 'walk') goTo(...ZONE_GATE[b.dataset.go]);
  };
});

let toastT = null;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => ($('toast').hidden = true), 3000);
}

/* ---- 제품 정보 창 ---- */
let infoFor = -1;
function showInfo(st) {
  const box = $('info');
  if (!st) {
    box.hidden = true;
    infoFor = -1;
    return;
  }
  if (infoFor !== st.i) {
    infoFor = st.i;
    const p = st.product;
    const brand = brandOf(p);
    $('inImg').src = productImage(p);
    $('inImg').alt = p.name + ' 제품 사진';
    $('inBrand').textContent = brand ? brand.name : '커스텀 빌드';
    $('inBrand').style.background = brand ? brand.color : '';
    $('inBrand').style.color = brand ? '#fffaf0' : '';
    $('inKind').textContent = p.kind === 'custom' ? '커스텀' : '완제품';
    $('inName').textContent = p.name;
    $('inPrice').textContent = priceText(p);
    $('inSample').hidden = !(IS_SAMPLE && p.price != null);
    const dl = $('inSpecs');
    dl.textContent = '';
    for (const [k, v] of specsOf(p)) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    }
    $('buy').hidden = !p.url;
    if (p.url) $('buy').href = p.url;
  }
  const typing = mode === 'type';
  box.classList.toggle('typing', typing);
  $('sitBtn').hidden = typing;
  $('stand').hidden = !typing;
  $('inStat').hidden = !typing;
  box.hidden = false;
}
$('inFold').onclick = () => {
  const f = $('info').classList.toggle('folded');
  $('inFold').textContent = f ? '자세히' : '접기';
  $('inFold').setAttribute('aria-expanded', !f);
};

/* ---- 다른 접속자 ---- */
function syncPeers(peers) {
  for (const [id, r] of remotes) {
    if (!peers.has(id)) {
      scene.remove(r.av.group);
      disposeAvatar(r.av);
      remotes.delete(id);
    }
  }
  for (const [id, p] of peers) {
    if (typeof p.x !== 'number' || typeof p.z !== 'number' || !p.nm) continue; // 아직 입장 전
    let r = remotes.get(id);
    if (!r) {
      r = { av: makeAvatar(p.c || 0, p.nm), x: p.x, z: p.z, f: p.f || 0, seat: -1 };
      r.av.group.position.set(p.x, 0, p.z);
      r.av.group.rotation.y = r.f;
      scene.add(r.av.group);
      remotes.set(id, r);
    }
    setAvatarName(r.av, p.nm);
    setAvatarColor(r.av, p.c || 0);
    const seat = Number.isInteger(p.s) && world.stations[p.s] ? p.s : -1;
    if (r.seat >= 0 && seat !== r.seat) world.stations[r.seat].kb.releaseAll();
    r.seat = seat;
    if (seat >= 0) {
      const s = world.stations[seat].seat;
      r.x = s.x;
      r.z = s.z;
      r.f = s.face;
    } else {
      r.x = p.x;
      r.z = p.z;
      r.f = p.f || 0;
    }
  }
  renderRoom();
}

function seatTaken(i) {
  for (const r of remotes.values()) if (r.seat === i) return true;
  return false;
}

function remoteKey(id, code) {
  const r = remotes.get(id);
  if (!r || r.seat < 0 || r.seat === me.seat) return;
  const st = world.stations[r.seat];
  if (!st.kb.has(code)) return;
  st.kb.press(code, true);
  setTimeout(() => st.kb.press(code, false), 110);
  // 가까이 있으면 옆 사람 타건음이 작게 들린다
  const d = Math.hypot(st.x - me.x, st.z - me.z);
  if (d < 7) audio.key(st.product, code, 0.3 * (1 - d / 7));
}

/* ---- 점프 · 인사 ---- */
const HELLO = ['안녕하세요!', '반가워요!', '같이 타건해요!', '도각도각!'];
function jump() {
  if (mode !== 'walk' || !me.av || me.av.jY > 0) return;
  jumpAvatar(me.av);
  net.event('jump');
}
function hello() {
  if (mode !== 'walk' || !me.av) return;
  sayAvatar(me.av, HELLO[Math.floor(Math.random() * HELLO.length)]);
  net.event('hi');
}
function remoteEvent(id, kind) {
  const r = remotes.get(id);
  if (!r) return;
  if (kind === 'jump') jumpAvatar(r.av);
  else if (kind === 'hi') sayAvatar(r.av, HELLO[0]);
}
$('actJump').onclick = jump;
$('actHi').onclick = hello;

/* ---- 타건 ---- */
function sit(i) {
  if (mode !== 'walk' || seatTaken(i)) return;
  const st = world.stations[i];
  me.seat = i;
  me.x = st.seat.x;
  me.z = st.seat.z;
  me.face = st.seat.face;
  goal = null;
  mark.visible = false;
  mode = 'type';
  typed = 0;
  typeStart = 0;
  $('tyCount').textContent = '0';
  $('tyRate').textContent = '0';
  $('hint').hidden = true;
  showInfo(st);
  net.presence({ s: i, x: round(me.x), z: round(me.z), f: round(me.face) });
}

function stand() {
  if (mode !== 'type') return;
  world.stations[me.seat].kb.releaseAll();
  me.seat = -1;
  mode = 'walk';
  for (const k in held) delete held[k];
  $('hint').hidden = false;
  net.presence({ s: null });
}
$('stand').onclick = stand;
$('sitBtn').onclick = () => near && sit(near.i);

function strike(code, on) {
  const st = world.stations[me.seat];
  if (!st || !st.kb.has(code)) return;
  st.kb.press(code, on);
  if (!on) return;
  audio.key(st.product, code);
  net.key(code);
  typed++;
  if (!typeStart) typeStart = performance.now();
  $('tyCount').textContent = typed;
  const min = (performance.now() - typeStart) / 60000;
  $('tyRate').textContent = min > 0.03 ? Math.round(typed / min) : typed;
}

/* ---- 입력 ---- */
addEventListener('keydown', (e) => {
  if (mode === 'entry' || e.target === nickInput) return;
  if (mode === 'type') {
    if (e.code === 'Escape') {
      stand();
      return;
    }
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (!e.repeat) strike(e.code, true);
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  held[e.code] = true;
  if (e.code === 'KeyE' && near) sit(near.i);
  if (e.code === 'Space' && !e.repeat) jump();
  if (e.code === 'KeyH' && !e.repeat) hello();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => {
  if (mode === 'type') strike(e.code, false);
  delete held[e.code];
});
addEventListener('blur', () => {
  for (const k in held) delete held[k];
  if (mode === 'type') world.stations[me.seat].kb.releaseAll();
});

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let drag = null;
function castAt(e, objects) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObjects(objects, false)[0] || null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (mode === 'entry') return;
  $('roomPop').hidden = true;
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, moved: false, cap: null };
  if (mode === 'type') {
    // 화면의 키캡을 직접 눌러서도 타건할 수 있다 (휴대폰)
    const hit = castAt(e, world.stations[me.seat].kb.caps);
    if (hit) {
      drag.cap = hit.object.userData.code;
      strike(drag.cap, true);
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || mode !== 'walk') return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  cam.yaw -= dx * 0.006;
  cam.pitch = Math.max(0.15, Math.min(1.35, cam.pitch + dy * 0.005));
  drag.x = e.clientX;
  drag.y = e.clientY;
});
function pointerEnd(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.cap) {
    strike(d.cap, false);
    return;
  }
  if (mode !== 'walk' || d.moved || e.type === 'pointercancel') return;
  const hit = castAt(e, [world.floor]);
  if (hit) goTo(hit.point.x, hit.point.z);
}
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (mode === 'walk') cam.dist = Math.max(4, Math.min(26, cam.dist * (1 + Math.sign(e.deltaY) * 0.1)));
  },
  { passive: false },
);

/* ---- 루프 ---- */
const round = (v) => Math.round(v * 100) / 100;
const tmp = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookNow = new THREE.Vector3(0, 1.2, 0);
let last = performance.now();
let camReady = false;

function angleLerp(a, b, k) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  let speed = 0;

  if (mode === 'walk') {
    const ix = (held.KeyD || held.ArrowRight ? 1 : 0) - (held.KeyA || held.ArrowLeft ? 1 : 0);
    const iz = (held.KeyS || held.ArrowDown ? 1 : 0) - (held.KeyW || held.ArrowUp ? 1 : 0);
    let vx = 0;
    let vz = 0;
    let run = held.ShiftLeft || held.ShiftRight ? 1.7 : 1;
    if (ix || iz) {
      const l = Math.hypot(ix, iz);
      vx = (Math.cos(cam.yaw) * ix + Math.sin(cam.yaw) * iz) / l;
      vz = (-Math.sin(cam.yaw) * ix + Math.cos(cam.yaw) * iz) / l;
      goal = null;
      mark.visible = false;
    } else if (goal) {
      const gx = goal.x - me.x;
      const gz = goal.z - me.z;
      const gd = Math.hypot(gx, gz);
      if (gd < 0.15) goal = null;
      else {
        vx = gx / gd;
        vz = gz / gd;
        run = gd > 6 ? 1.5 : 1;
        // 가구에 막혀 더 가까워지지 못하면 멈춘다
        if (gd < goal.best - 0.02) {
          goal.best = gd;
          goal.stuck = 0;
        } else if ((goal.stuck += dt) > 0.6) goal = null;
      }
      if (!goal) mark.visible = false;
    }
    if (vx || vz) {
      const sp = 4.4 * run * dt;
      tmp.set(me.x + vx * sp, 0, me.z + vz * sp);
      collide(tmp, world.colliders);
      me.x = tmp.x;
      me.z = tmp.z;
      me.face = angleLerp(me.face, Math.atan2(vx, vz), Math.min(1, dt * 12));
      speed = run;
    }

    // 가까운 빈 키보드 찾기 → 제품 정보 창
    near = null;
    let best = 1.6;
    for (const st of world.stations) {
      const d = Math.hypot(st.seat.x - me.x, st.seat.z - me.z);
      if (d < best && !seatTaken(st.i)) {
        best = d;
        near = st;
      }
    }
    showInfo(near);

    if (net) net.presence({ x: round(me.x), z: round(me.z), f: round(me.face) });
  }

  if (me.av) {
    me.av.group.position.set(me.x, 0, me.z);
    me.av.group.rotation.y = me.face;
    animateAvatar(me.av, speed, dt);
    $('acts').hidden = mode !== 'walk';
    me.av.group.visible = mode !== 'type'; // 타건 중에는 내 캐릭터가 키보드를 가리지 않게
  }

  // 다른 접속자는 받은 위치로 부드럽게 따라간다
  const k = 1 - Math.exp(-10 * dt);
  for (const r of remotes.values()) {
    const g = r.av.group;
    const d = Math.hypot(r.x - g.position.x, r.z - g.position.z);
    if (d > 8) g.position.set(r.x, g.position.y, r.z);
    else {
      g.position.x += (r.x - g.position.x) * k;
      g.position.z += (r.z - g.position.z) * k;
    }
    g.rotation.y = angleLerp(g.rotation.y, r.f, k);
    animateAvatar(r.av, d > 0.05 ? Math.min(1.7, d * 3) : 0, dt);
    // 내가 타건 중일 때 바로 옆에 선 사람도 화면을 가리지 않게 숨긴다
    g.visible = !(mode === 'type' && Math.hypot(g.position.x - me.x, g.position.z - me.z) < 1.8);
  }

  for (const st of world.stations) st.kb.update(dt);

  // 카메라
  if (mode === 'type') {
    const st = world.stations[me.seat];
    // 키보드 전체가 화면 너비에 들어오도록 거리를 맞춘다
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(1.2, (KB_WIDTH * 0.66) / (half * camera.aspect));
    camTarget.copy(st.look);
    camPos.set(st.look.x, st.look.y + dist * 0.93, st.look.z + dist * 0.37);
  } else {
    camTarget.set(me.x, 1.0, me.z);
    const c = Math.cos(cam.pitch);
    camPos.set(me.x + Math.sin(cam.yaw) * c * cam.dist, 1.0 + Math.sin(cam.pitch) * cam.dist, me.z + Math.cos(cam.yaw) * c * cam.dist);
  }
  const ck = camReady ? 1 - Math.exp(-7 * dt) : 1;
  camReady = true;
  camera.position.lerp(camPos, ck);
  lookNow.lerp(camTarget, ck);
  camera.lookAt(lookNow);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('pagehide', () => net && net.close());
