import * as THREE from 'three';

/* 캐릭터: 둥근 몸에 키캡 모자를 쓴 손님. 색만 고를 수 있다 */

export const AVATAR_COLORS = ['#2f6bff', '#ff7a59', '#34b38a', '#f2c14e', '#9b6cf0', '#ef6fa8', '#4c5564', '#f4f2ee'];

const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.5, 6, 16);
const headGeo = new THREE.SphereGeometry(0.34, 20, 16);
const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
const footGeo = new THREE.SphereGeometry(0.13, 10, 8);
const hatGeo = new THREE.BoxGeometry(0.3, 0.16, 0.3);
const shadowGeo = new THREE.CircleGeometry(0.42, 20);
const eyeMat = new THREE.MeshBasicMaterial({ color: '#1b1d22' });
const skinMat = new THREE.MeshStandardMaterial({ color: '#ffe3c9', roughness: 0.8 });
const footMat = new THREE.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.8 });
const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false });

function tagTexture(name) {
  const cv = document.createElement('canvas');
  cv.width = 320;
  cv.height = 72;
  const g = cv.getContext('2d');
  g.font = '600 34px "Pretendard", system-ui, sans-serif';
  const w = Math.min(300, g.measureText(name).width + 40);
  g.fillStyle = 'rgba(22,24,29,.78)';
  g.beginPath();
  g.roundRect((320 - w) / 2, 8, w, 56, 28);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 160, 38, 280);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeAvatar(colorIdx = 0, name = '') {
  const group = new THREE.Group();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

  const rig = new THREE.Group(); // 걸을 때 통통 튀는 부분
  group.add(rig);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.75;
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.45;
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.12, 1.5, 0.31);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  const hat = new THREE.Mesh(hatGeo, mat);
  hat.position.y = 1.84;
  rig.add(body, head, eyeL, eyeR, hat);

  const footL = new THREE.Mesh(footGeo, footMat);
  footL.position.set(-0.17, 0.13, 0);
  const footR = footL.clone();
  footR.position.x = 0.17;
  group.add(footL, footR);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  tag.scale.set(1.6, 0.36, 1);
  tag.position.y = 2.25;
  group.add(tag);

  const av = { group, rig, footL, footR, mat, tag, phase: Math.random() * 6, name: null, color: colorIdx };
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
  av.mat.color.set(AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]);
}

/* speed: 0=서 있음, 1=걷기, 그 이상=달리기 */
export function animateAvatar(av, speed, dt) {
  if (speed > 0) {
    av.phase += dt * 10 * Math.min(speed, 1.6);
    const s = Math.sin(av.phase);
    av.footL.position.z = s * 0.2;
    av.footR.position.z = -s * 0.2;
    av.footL.position.y = 0.13 + Math.max(0, s) * 0.08;
    av.footR.position.y = 0.13 + Math.max(0, -s) * 0.08;
    av.rig.position.y = Math.abs(Math.cos(av.phase)) * 0.05;
  } else {
    const k = 1 - Math.exp(-12 * dt);
    av.footL.position.z += (0 - av.footL.position.z) * k;
    av.footR.position.z += (0 - av.footR.position.z) * k;
    av.footL.position.y = av.footR.position.y = 0.13;
    av.rig.position.y += (0 - av.rig.position.y) * k;
  }
}

export function disposeAvatar(av) {
  av.mat.dispose();
  if (av.tag.material.map) av.tag.material.map.dispose();
  av.tag.material.dispose();
}
