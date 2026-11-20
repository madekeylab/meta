import * as THREE from 'three';

/* 캐릭터 '키룡이': 모자를 뒤로 쓴 초록 아기 공룡.
   원화(public/assets/img/kiryong.webp)의 색과 생김새를 따라 도형을 조합해 만든다.
   몸은 모두 같은 키룡이이고, 모자 색으로 서로를 구분한다 */

export const PALETTE = {
  body: '#b9d68c',
  spike: '#9bbd76',
  belly: '#f5ebca',
  cheek: '#f2a98a',
  line: '#67542b',
  tongue: '#e8806e',
};
export const CAP_COLORS = ['#727669', '#e9967a', '#6f9bd1', '#f2c14e', '#b08ad6', '#ef8fb0', '#3f4a5a', '#f5ebca'];
export const AVATAR_COLORS = CAP_COLORS;

const mat = (color, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough });
const M = {
  body: mat(PALETTE.body),
  spike: mat(PALETTE.spike),
  belly: mat(PALETTE.belly),
  line: new THREE.MeshBasicMaterial({ color: PALETTE.line }),
  cheek: new THREE.MeshBasicMaterial({ color: PALETTE.cheek }),
  tongue: new THREE.MeshBasicMaterial({ color: PALETTE.tongue }),
  white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  outline: new THREE.MeshBasicMaterial({ color: PALETTE.line, side: THREE.BackSide }),
};
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  dome: new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 4),
  tail: new THREE.ConeGeometry(1, 1, 14),
  disc: new THREE.CircleGeometry(1, 20),
  brim: new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, 0, Math.PI),
  arc: new THREE.TorusGeometry(1, 0.22, 8, 16, Math.PI),
};

function part(parent, geo, material, sx, sy, sz, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}
/* 원화의 갈색 외곽선: 살짝 큰 뒷면만 그린 도형을 겹친다 */
function outlined(parent, geo, material, sx, sy, sz, x, y, z) {
  const m = part(parent, geo, material, sx, sy, sz, x, y, z);
  const o = new THREE.Mesh(geo, M.outline);
  o.scale.setScalar(1.045);
  m.add(o);
  return m;
}

function tagTexture(name, bubble) {
  const cv = document.createElement('canvas');
  cv.width = 320;
  cv.height = 80;
  const g = cv.getContext('2d');
  g.font = '700 34px system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const w = Math.min(300, g.measureText(name).width + 44);
  g.fillStyle = bubble ? '#fff3c4' : '#fffaf0';
  g.strokeStyle = PALETTE.line;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect((320 - w) / 2, 10, w, 58, 29);
  g.fill();
  g.stroke();
  g.fillStyle = PALETTE.line;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 160, 41, 270);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeAvatar(colorIdx = 0, name = '') {
  const group = new THREE.Group();
  const rig = new THREE.Group(); // 걸을 때 통통 튀는 부분
  group.add(rig);
  const capMat = mat(CAP_COLORS[colorIdx % CAP_COLORS.length], 0.9);

  // 몸통과 배
  outlined(rig, G.sphere, M.body, 0.4, 0.42, 0.37, 0, 0.52, 0);
  part(rig, G.sphere, M.belly, 0.27, 0.3, 0.12, 0, 0.47, 0.27, false);

  // 머리 (몸보다 큰 2등신)
  const head = new THREE.Group();
  head.position.y = 1.2;
  rig.add(head);
  outlined(head, G.sphere, M.body, 0.56, 0.5, 0.5, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(head, G.sphere, M.line, 0.06, 0.085, 0.03, s * 0.2, 0.02, 0.47, false);
    part(head, G.sphere, M.white, 0.02, 0.025, 0.012, s * 0.2 + 0.02, 0.055, 0.495, false);
    const ch = part(head, G.disc, M.cheek, 0.09, 0.075, 1, s * 0.36, -0.13, 0.385, false);
    ch.rotation.y = s * 0.72;
  }
  part(head, G.sphere, M.line, 0.095, 0.075, 0.03, 0, -0.14, 0.478, false); // 벌린 입
  part(head, G.sphere, M.tongue, 0.055, 0.035, 0.02, 0, -0.175, 0.488, false);

  // 뒤로 쓴 모자: 둥근 통 + 뒤쪽 챙 + 앞쪽 조절 구멍 + 꼭지 단추
  const cap = new THREE.Group();
  cap.position.set(0, 0.1, -0.02);
  cap.rotation.x = -0.12;
  head.add(cap);
  outlined(cap, G.dome, capMat, 0.59, 0.5, 0.54, 0, 0, 0);
  const brim = part(cap, G.brim, capMat, 0.46, 0.05, 0.5, 0, 0.02, -0.42);
  brim.rotation.set(0.18, Math.PI / 2, 0);
  const hole = part(cap, G.arc, M.body, 0.15, 0.13, 0.1, 0, 0.1, 0.5, false);
  hole.rotation.x = -0.35;
  part(cap, G.sphere, capMat, 0.07, 0.045, 0.07, 0, 0.5, 0);

  // 등 가시: 머리 뒤에서 꼬리까지
  [[1.42, -0.5, 0.15], [1.12, -0.56, 0.16], [0.82, -0.4, 0.14], [0.56, -0.44, 0.13]].forEach(([y, z, s]) => {
    const sp = part(rig, G.cone, M.spike, s, s * 1.5, s * 0.6, 0, y, z);
    sp.rotation.x = -1.1;
  });

  // 꼬리 (끝이 위로 들린 모양)
  const tail = new THREE.Group();
  tail.position.set(0, 0.34, -0.3);
  rig.add(tail);
  const t1 = part(tail, G.tail, M.body, 0.2, 0.6, 0.2, 0, 0.08, -0.26);
  t1.rotation.x = -1.15;
  const ts = part(tail, G.cone, M.spike, 0.1, 0.15, 0.06, 0, 0.3, -0.28);
  ts.rotation.x = -0.6;

  // 팔과 발
  const armL = part(rig, G.sphere, M.body, 0.1, 0.16, 0.1, -0.36, 0.62, 0.14);
  const armR = part(rig, G.sphere, M.body, 0.1, 0.16, 0.1, 0.36, 0.62, 0.14);
  armL.rotation.set(-0.7, 0, -0.35);
  armR.rotation.set(-0.7, 0, 0.35);
  const footL = part(group, G.sphere, M.body, 0.14, 0.1, 0.19, -0.18, 0.1, 0.05);
  const footR = part(group, G.sphere, M.body, 0.14, 0.1, 0.19, 0.18, 0.1, 0.05);

  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  tag.scale.set(1.6, 0.4, 1);
  tag.position.y = 2.15;
  group.add(tag);

  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  bubble.scale.set(1.9, 0.475, 1);
  bubble.position.y = 2.62;
  bubble.visible = false;
  group.add(bubble);

  const av = { group, rig, bubble, sayT: 0, jY: 0, jV: 0, head, tail, armL, armR, footL, footR, mat: capMat, tag, phase: Math.random() * 6, t: Math.random() * 10, name: null, color: colorIdx };
  setAvatarName(av, name);
  return av;
}

export function setAvatarName(av, name) {
  if (av.name === name) return;
  av.name = name;
  if (av.tag.material.map) av.tag.material.map.dispose();
  av.tag.material.map = name ? tagTexture(name) : null;
  av.tag.material.needsUpdate = true;
  av.tag.visible = !!name;
}

export function setAvatarColor(av, colorIdx) {
  if (av.color === colorIdx) return;
  av.color = colorIdx;
  av.mat.color.set(CAP_COLORS[colorIdx % CAP_COLORS.length]);
}

/* 머리 위 말풍선을 잠깐 띄우고 손을 흔든다 */
export function sayAvatar(av, text) {
  if (av.bubble.material.map) av.bubble.material.map.dispose();
  av.bubble.material.map = tagTexture(text, true);
  av.bubble.material.needsUpdate = true;
  av.bubble.visible = true;
  av.sayT = 2.6;
}

export function jumpAvatar(av) {
  if (av.jY === 0) av.jV = 5.4;
}

/* speed: 0=서 있음, 1=걷기, 그 이상=달리기 */
export function animateAvatar(av, speed, dt) {
  av.t += dt;
  if (av.jV || av.jY) {
    av.jV -= 15 * dt;
    av.jY = Math.max(0, av.jY + av.jV * dt);
    if (av.jY === 0) av.jV = 0;
  }
  av.group.position.y = av.jY;
  if (av.sayT > 0 && (av.sayT -= dt) <= 0) av.bubble.visible = false;
  av.tail.rotation.y = Math.sin(av.t * (speed > 0 ? 9 : 2.2)) * (speed > 0 ? 0.45 : 0.22);
  if (speed > 0) {
    av.phase += dt * 10 * Math.min(speed, 1.6);
    const s = Math.sin(av.phase);
    av.footL.position.z = 0.05 + s * 0.2;
    av.footR.position.z = 0.05 - s * 0.2;
    av.footL.position.y = 0.1 + Math.max(0, s) * 0.09;
    av.footR.position.y = 0.1 + Math.max(0, -s) * 0.09;
    av.armL.rotation.x = -0.7 - s * 0.5;
    av.armR.rotation.x = -0.7 + s * 0.5;
    av.rig.position.y = Math.abs(Math.cos(av.phase)) * 0.06;
    av.rig.rotation.z = s * 0.05;
    av.head.rotation.x = 0;
  } else {
    const k = 1 - Math.exp(-12 * dt);
    av.footL.position.z += (0.05 - av.footL.position.z) * k;
    av.footR.position.z += (0.05 - av.footR.position.z) * k;
    av.footL.position.y = av.footR.position.y = 0.1;
    av.armL.rotation.x += (-0.7 - av.armL.rotation.x) * k;
    av.armR.rotation.x += (-0.7 - av.armR.rotation.x) * k;
    av.rig.rotation.z += (0 - av.rig.rotation.z) * k;
    av.rig.position.y += (Math.sin(av.t * 2.2) * 0.012 - av.rig.position.y) * k; // 숨쉬기
    av.head.rotation.x = Math.sin(av.t * 1.1) * 0.03;
  }
  if (av.sayT > 0) {
    // 인사하는 동안 오른팔을 들어 흔든다
    av.armR.rotation.x = -2.6;
    av.armR.rotation.z = 0.5 + Math.sin(av.t * 14) * 0.35;
    av.armR.position.y = 0.78;
  } else {
    av.armR.rotation.z = 0.35;
    av.armR.position.y = 0.62;
  }
}

export function disposeAvatar(av) {
  av.mat.dispose();
  if (av.tag.material.map) av.tag.material.map.dispose();
  av.tag.material.dispose();
  if (av.bubble.material.map) av.bubble.material.map.dispose();
  av.bubble.material.dispose();
}
