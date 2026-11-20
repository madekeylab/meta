import * as THREE from 'three';

/* 캐릭터 '키룡이': 모자를 뒤로 쓴 연두색 아기 공룡 (2등신).
   캐릭터 시트의 생김새와 색을 따라 둥근 도형을 조합해 점토 인형처럼 만든다.
   몸은 모두 같은 키룡이이고, 모자 색으로 서로를 구분한다 */

export const PALETTE = {
  body: '#b6dc7c',
  spike: '#a3d062',
  belly: '#f5e8cb',
  cheek: '#f9bda0',
  brown: '#6f4e2e',
  eye: '#5a3a22',
  tongue: '#f08f86',
};
export const CAP_COLORS = ['#5b5d57', '#d99a8c', '#8fb0c9', '#e3bf5e', '#b3a2dc', '#ef9bb5', '#3f4a5a', '#f5e8cb'];

// 그늘에서도 탁해지지 않게 제 색을 조금 스스로 낸다 (점토 인형 느낌)
const clay = (color, rough = 0.62, glow = 0.22) => new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: color, emissiveIntensity: glow });
const flat = (color) => new THREE.MeshBasicMaterial({ color });
const M = {
  body: clay(PALETTE.body),
  spike: clay(PALETTE.spike),
  belly: clay(PALETTE.belly, 0.75, 0.4),
  brown: clay(PALETTE.brown, 0.7),
  cheek: clay(PALETTE.cheek, 0.8, 0.55),
  eye: flat(PALETTE.eye),
  tongue: flat(PALETTE.tongue),
  white: flat('#ffffff'),
};
const G = {
  sphere: new THREE.SphereGeometry(1, 32, 24),
  dome: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
  rim: new THREE.TorusGeometry(1, 0.07, 10, 40),
  brim: new THREE.CylinderGeometry(1, 1, 1, 32, 1, false, 0, Math.PI),
  arch: new THREE.TorusGeometry(1, 0.2, 10, 20, Math.PI),
  half: new THREE.CircleGeometry(1, 20, 0, Math.PI),
  leg: new THREE.CapsuleGeometry(1, 0.6, 6, 14),
};

function part(parent, geo, material, sx, sy, sz, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  parent.add(m);
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
  g.strokeStyle = PALETTE.brown;
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect((320 - w) / 2, 10, w, 58, 29);
  g.fill();
  g.stroke();
  g.fillStyle = PALETTE.brown;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 160, 41, 270);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function arm(rig, side) {
  const a = new THREE.Group();
  a.position.set(side * 0.33, 0.66, 0.04);
  a.rotation.z = side * 0.75;
  part(a, G.sphere, M.body, 0.105, 0.19, 0.105, 0, -0.12, 0);
  // 손가락 세 개
  for (const dx of [-0.055, 0, 0.055]) part(a, G.sphere, M.body, 0.042, 0.05, 0.045, dx, -0.29, 0.02, false);
  rig.add(a);
  return a;
}

export function makeAvatar(colorIdx = 0, name = '') {
  const group = new THREE.Group();
  const rig = new THREE.Group(); // 걸을 때 통통 튀는 부분
  group.add(rig);
  const capMat = clay(CAP_COLORS[colorIdx % CAP_COLORS.length], 0.8, 0.12);

  // 몸통과 배
  part(rig, G.sphere, M.body, 0.37, 0.4, 0.34, 0, 0.55, 0);
  part(rig, G.sphere, M.belly, 0.24, 0.27, 0.12, 0, 0.5, 0.245, false);

  // 머리: 옆으로 넓적한 큰 공
  const head = new THREE.Group();
  head.position.y = 1.24;
  rig.add(head);
  part(head, G.sphere, M.body, 0.62, 0.5, 0.52, 0, 0, 0);
  const eyeL = part(head, G.sphere, M.eye, 0.058, 0.085, 0.03, -0.21, -0.02, 0.475, false);
  const eyeR = part(head, G.sphere, M.eye, 0.058, 0.085, 0.03, 0.21, -0.02, 0.475, false);
  eyeL.rotation.y = -0.38;
  eyeR.rotation.y = 0.38;
  for (const s of [-1, 1]) {
    part(head, G.sphere, M.white, 0.016, 0.02, 0.01, s * 0.2 + 0.018, 0.015, 0.505, false);
    part(head, G.sphere, M.cheek, 0.1, 0.085, 0.03, s * 0.385, -0.15, 0.385, false).rotation.y = s * 0.78;
  }
  // 웃는 입: 아래로 둥근 반원 + 혀
  const mouth = part(head, G.half, M.eye, 0.085, 0.085, 1, 0, -0.14, 0.512, false);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = 0.12;
  part(head, G.sphere, M.tongue, 0.045, 0.028, 0.012, 0, -0.195, 0.508, false);

  // 뒤로 쓴 모자: 둥근 통 + 갈색 테 + 뒤쪽 챙 + 앞쪽 조절 구멍 + 꼭지 단추
  const cap = new THREE.Group();
  cap.position.set(0, 0.1, -0.02);
  cap.rotation.set(-0.16, 0, 0.05);
  head.add(cap);
  part(cap, G.dome, capMat, 0.65, 0.5, 0.57, 0, 0, 0);
  const rim = part(cap, G.rim, M.brown, 0.645, 0.565, 0.5, 0, -0.01, 0, false);
  rim.rotation.x = Math.PI / 2;
  const brim = part(cap, G.brim, capMat, 0.52, 0.06, 0.58, 0, -0.03, -0.42);
  brim.rotation.set(0.32, Math.PI / 2, 0);
  const brimRim = part(cap, G.brim, M.brown, 0.54, 0.03, 0.6, 0, -0.07, -0.43, false);
  brimRim.rotation.set(0.32, Math.PI / 2, 0);
  part(cap, G.sphere, M.body, 0.17, 0.12, 0.06, 0, 0.13, 0.5, false).rotation.x = -0.32; // 구멍으로 보이는 이마
  const arch = part(cap, G.arch, capMat, 0.17, 0.14, 0.2, 0, 0.1, 0.515, false);
  arch.rotation.x = -0.32;
  part(cap, G.sphere, M.brown, 0.085, 0.06, 0.085, 0, 0.5, 0);

  // 둥근 등 가시: 모자 뒤통수, 머리 양옆 뒤, 등
  [[0.36, -0.42, 0.11, -0.9], [0.14, -0.55, 0.12, -1.35]].forEach(([y, z, s, rx]) => {
    part(cap, G.sphere, M.spike, s * 0.8, s * 1.25, s * 0.7, 0, y, z).rotation.x = rx;
  });
  for (const s of [-1, 1]) part(head, G.sphere, M.spike, 0.1, 0.13, 0.09, s * 0.33, 0.1, -0.44).rotation.set(-0.9, 0, -s * 0.5);
  [[0.86, -0.3, 0.1], [0.62, -0.36, 0.105]].forEach(([y, z, s]) => {
    part(rig, G.sphere, M.spike, s * 0.8, s * 1.2, s * 0.75, 0, y, z).rotation.x = -1.2;
  });

  // 굵고 위로 말린 꼬리: 점점 작아지는 공을 이어 붙인다
  const tail = new THREE.Group();
  tail.position.set(0, 0.36, -0.24);
  rig.add(tail);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const a = t * 1.5; // 뒤로 뻗다가 위로 휜다
    const r = 0.21 - t * 0.15;
    part(tail, G.sphere, M.body, r, r, r, 0, Math.sin(a) * 0.52 * t + t * 0.06, -(0.1 + Math.sin(Math.min(a, 1.2)) * 0.42));
  }
  part(tail, G.sphere, M.spike, 0.065, 0.09, 0.06, 0, 0.3, -0.3).rotation.x = -0.9;

  // 팔과 다리
  const armL = arm(rig, -1);
  const armR = arm(rig, 1);
  const footL = part(group, G.leg, M.body, 0.125, 0.125, 0.14, -0.17, 0.14, 0.02);
  const footR = part(group, G.leg, M.body, 0.125, 0.125, 0.14, 0.17, 0.14, 0.02);

  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  tag.scale.set(1.6, 0.4, 1);
  tag.position.y = 2.2;
  group.add(tag);
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  bubble.scale.set(2.1, 0.525, 1);
  bubble.position.y = 2.68;
  bubble.visible = false;
  group.add(bubble);

  const av = { group, rig, head, tail, armL, armR, footL, footR, eyeR, mat: capMat, tag, bubble, sayT: 0, wave: false, jY: 0, jV: 0, phase: Math.random() * 6, t: Math.random() * 10, name: null, color: colorIdx };
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

/* 머리 위 말풍선을 잠깐 띄운다. wave=true면 손을 흔들며 윙크한다 */
export function sayAvatar(av, text, wave = true) {
  if (av.bubble.material.map) av.bubble.material.map.dispose();
  av.bubble.material.map = tagTexture(text, true);
  av.bubble.material.needsUpdate = true;
  av.bubble.visible = true;
  av.sayT = 2.8;
  av.wave = wave;
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
  const waving = av.sayT > 0 && av.wave;

  av.tail.rotation.y = Math.sin(av.t * (speed > 0 ? 9 : 2.2)) * (speed > 0 ? 0.4 : 0.2);
  let swing = 0;
  if (speed > 0) {
    av.phase += dt * 10 * Math.min(speed, 1.6);
    const s = Math.sin(av.phase);
    swing = s;
    av.footL.position.z = 0.02 + s * 0.17;
    av.footR.position.z = 0.02 - s * 0.17;
    av.footL.position.y = 0.14 + Math.max(0, s) * 0.08;
    av.footR.position.y = 0.14 + Math.max(0, -s) * 0.08;
    av.rig.position.y = Math.abs(Math.cos(av.phase)) * 0.06;
    av.rig.rotation.z = s * 0.06;
    av.head.rotation.x = 0;
  } else {
    const k = 1 - Math.exp(-12 * dt);
    av.footL.position.z += (0.02 - av.footL.position.z) * k;
    av.footR.position.z += (0.02 - av.footR.position.z) * k;
    av.footL.position.y = av.footR.position.y = 0.14;
    av.rig.rotation.z += (0 - av.rig.rotation.z) * k;
    av.rig.position.y += (Math.sin(av.t * 2.2) * 0.014 - av.rig.position.y) * k; // 숨쉬기
    av.head.rotation.x = Math.sin(av.t * 1.1) * 0.03;
    av.head.rotation.z = Math.sin(av.t * 0.8) * 0.025;
  }
  av.armL.rotation.x = -swing * 0.6;
  av.armR.rotation.x = waving ? 0 : swing * 0.6;
  av.armR.rotation.z = waving ? 2.5 + Math.sin(av.t * 14) * 0.3 : 0.75;
  av.eyeR.scale.y = waving ? 0.02 : 0.085; // 윙크
}

export function disposeAvatar(av) {
  av.mat.dispose();
  if (av.tag.material.map) av.tag.material.map.dispose();
  av.tag.material.dispose();
  if (av.bubble.material.map) av.bubble.material.map.dispose();
  av.bubble.material.dispose();
}
