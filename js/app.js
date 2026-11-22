// 모란 한 조각 — 게임 로직 + 화면
import { state, save, putImg, getImg, delImg, resetAll } from './store.js';
import { SHOPS, CATS } from './shops.js';
import { loadMap } from './osm.js';
import { toLocal, toLatLng, MAP_RADIUS } from './geo.js';
import { GOOGLE_MAPS_KEY } from './config.js';
import { api, toServerXY } from './api.js';
import { createWorld } from './world.js';
import { cropSquare, pickPhoto, photoFrame, courseImage, shareCanvas, shareText } from './share.js';

const HINT_R = 55;  // 이 거리 안에 들어오면 알람
const FIND_R = 20;  // 이 거리 안에서 발견 가능
const VISIT_R = 25; // 이 거리 안에서 방문 도장·사진·방명록 가능

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
const today = () => new Date().toDateString();
const shopById = (id) => SHOPS.find((s) => s.id === id);
const foundList = () => SHOPS.filter((s) => !s.unlocated && state.found[s.id]).sort((a, b) => state.found[a.id].at - state.found[b.id].at);

let lastPos = null, lastAcc = Infinity, view = 'game', gmap = null, gPlayer = null, gLoad = null;
const gMarkers = new Map();
let map, world, watchId = null, tab = 'map', albumFilter = 'all', coursePick = [];
const alerted = new Set();

// ---------- 알림 ----------
let ac;
function chime(notes = [880, 1175]) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.14;
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.45);
    });
  } catch {}
}
let toastTimer;
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- 가게 배치 (실제 좌표가 있는 곳만) ----------
let ACTIVE = [];
function placeShops() {
  for (const shop of SHOPS) {
    shop.color = CATS[shop.cat].color;
    if (shop.lat && shop.lng) [shop.x, shop.z] = toLocal(shop.lat, shop.lng); else shop.unlocated = true;
  }
  ACTIVE = SHOPS.filter((s) => !s.unlocated);
  (state.places || []).forEach(addPlace);
}
// 고객이 직접 등록한 가게
function addPlace(p) {
  const [x, z] = toLocal(p.lat, p.lng);
  const shop = { ...p, mine: true, menu: [], events: [], color: CATS[p.cat].color, x, z };
  SHOPS.push(shop); ACTIVE.push(shop);
  return shop;
}
function renderRegister() {
  if (state.mode === 'gps' && !(lastAcc <= 50)) return toast('GPS가 아직 정확하지 않아요 (±50m 이내 필요). 잠시 후 다시 시도해 주세요.', 3500);
  const { x, z } = world.pos, near = ACTIVE.find((s) => state.found[s.id] && Math.hypot(s.x - x, s.z - z) < 8);
  if (near) return toast(`바로 옆에 이미 ${near.name}이(가) 등록돼 있어요`);
  modal(`<div class="modal-box"><h3>📍 가게 등록</h3><p class="hint">지금 서 있는 자리에 가게가 등록돼요${state.mode === 'gps' ? ` (GPS ±${Math.round(lastAcc)}m)` : ' (둘러보기 모드: 캐릭터 위치)'}</p>
    <form class="reg-form"><input class="input" name="name" maxlength="20" placeholder="가게 이름" required>
      <select class="input" name="cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}</select>
      <input class="input" name="tagline" maxlength="40" placeholder="한 줄 소개 (선택)">
      <div class="row"><button type="button" class="btn ghost" data-act="close-modal">취소</button><button class="btn">등록하기</button></div></form></div>`);
}

// ---------- 서버 동기화 (madekey.kr) ----------
const srv = { online: false, posts: [], user: null };
const catKey = (label) => Object.keys(CATS).find((k) => CATS[k].label === label) || 'life';
async function syncServer() {
  let g;
  try { g = await api.game(); } catch { srv.online = false; return false; }
  srv.online = true; srv.user = g.user; srv.posts = g.posts || [];
  const ids = new Set((g.places || []).map((p) => p.id));
  for (const s of SHOPS.filter((s) => s.server && !ids.has(s.id))) { // 서버에서 사라진 가게
    world.setShop(s, 'hidden'); SHOPS.splice(SHOPS.indexOf(s), 1); ACTIVE.splice(ACTIVE.indexOf(s), 1);
  }
  for (const p of g.places || []) {
    if (shopById(p.id) || !(p.lat && p.lng)) continue;
    const cat = catKey(p.category), [x, z] = toLocal(p.lat, p.lng);
    const shop = { id: p.id, server: true, name: p.name, cat, emoji: p.icon || CATS[cat].emoji, lat: p.lat, lng: p.lng, address: p.address,
      tagline: p.description && p.description !== p.name ? p.description : '골목 탐험가가 찾아 등록한 가게', menu: [], events: [], color: CATS[cat].color, x, z };
    SHOPS.push(shop); ACTIVE.push(shop);
  }
  for (const v of g.visits || []) { // 다른 기기에서 방문한 기록도 카드로
    if (shopById(v.shop) && !state.found[v.shop]) state.found[v.shop] = { at: v.created || Date.now(), visits: 1, lastVisit: '' };
  }
  save(); updateCount();
  return true;
}
// 방문 기록을 서버에도 남긴다 (실패해도 게임은 계속)
function sendVisit(shop) {
  if (!srv.online) return;
  const data = state.mode === 'gps' && lastPos ? { mode: 'gps', ...lastPos } : toServerXY(...Object.values(curLatLng()));
  api.act('visit', { shop: shop.id, ...data }).catch(() => {});
}
const serverPosts = (id) => srv.posts.filter((p) => p.shop === id);

// ---------- 지도 보기 전환 (게임 지도 / 구글 지도) ----------
const curLatLng = () => toLatLng(world.pos.x, world.pos.z);
function setView(v) {
  view = v;
  $('#gmap').hidden = v !== 'google';
  document.querySelectorAll('.viewtabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'google') openGoogle();
}
function loadGoogle() {
  return (gLoad ||= new Promise((res, rej) => {
    window.__gmReady = () => res();
    window.gm_authFailure = () => { toast('구글 지도 키를 확인해 주세요', 4000); };
    const sc = document.createElement('script');
    sc.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({ key: GOOGLE_MAPS_KEY, language: 'ko', region: 'KR', callback: '__gmReady' });
    sc.onerror = () => { gLoad = null; rej(); };
    document.head.appendChild(sc);
  }));
}
async function openGoogle() {
  const el = $('#gmapBody'), c = curLatLng();
  if (!GOOGLE_MAPS_KEY) { // 키 없이: 현재 위치를 찍은 구글 지도
    el.innerHTML = `<iframe title="구글 지도" src="https://www.google.com/maps?q=${c.lat.toFixed(6)},${c.lng.toFixed(6)}&z=19&hl=ko&output=embed" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    $('#gmRefresh').hidden = false;
    return;
  }
  try {
    await loadGoogle();
    if (!gmap) {
      gmap = new google.maps.Map(el, { center: c, zoom: 19, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false });
      gPlayer = new google.maps.Marker({ map: gmap, position: c, label: '🌸', zIndex: 999, title: '나' });
    }
    syncGoogle(true);
  } catch { toast('구글 지도를 불러오지 못했어요'); }
}
function syncGoogle(center) {
  if (!gmap) return;
  const c = curLatLng();
  gPlayer.setPosition(c); if (center) gmap.panTo(c);
  for (const s of ACTIVE) { // 발견한 가게만 표시 (숨은 가게는 비밀)
    if (!state.found[s.id] || gMarkers.has(s.id)) continue;
    const m = new google.maps.Marker({ map: gmap, position: { lat: s.lat, lng: s.lng }, label: s.emoji, title: s.name });
    m.addListener('click', () => renderShop(s.id)); gMarkers.set(s.id, m);
  }
  for (const [id, m] of gMarkers) if (!shopById(id)) { m.setMap(null); gMarkers.delete(id); }
}
const foundCount = () => ACTIVE.filter((s) => state.found[s.id]).length;

// ---------- 모드 (GPS / 둘러보기) ----------
function setMode(m) {
  state.mode = m; save();
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  world.setMode(m);
  $('#modeBtn').textContent = m === 'gps' ? '📍 GPS 탐험 중' : '🕹️ 둘러보기';
  $('#gpsChip').hidden = m !== 'gps';
  $('#recenter').hidden = m !== 'gps';
  if (m !== 'gps') return;
  if (!navigator.geolocation) { toast('이 기기는 위치 기능을 쓸 수 없어요. 둘러보기 모드로 시작해요.'); return setMode('explore'); }
  $('#gpsChip').textContent = '위치 찾는 중…';
  watchId = navigator.geolocation.watchPosition((p) => {
    const [x, z] = toLocal(p.coords.latitude, p.coords.longitude);
    if (Math.hypot(x, z) > MAP_RADIUS + 150) {
      toast('지금은 모란 골목 밖이에요. 둘러보기 모드로 구경해요 🌸', 4000);
      return setMode('explore');
    }
    world.moveTo(x, z);
    lastAcc = p.coords.accuracy;
    lastPos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, timestamp: p.timestamp };
    $('#gpsChip').textContent = `GPS ±${Math.round(p.coords.accuracy)}m`;
  }, () => { toast('위치 권한이 필요해요. 둘러보기 모드로 전환했어요.', 4000); setMode('explore'); },
  { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}

// ---------- 근접 감지 ----------
let acc = 0, action = null;
function tick(dt) {
  acc += dt; if (acc < 0.25) return; acc = 0;
  const { x, z } = world.pos;
  let nearHidden = null, nearFound = null;
  for (const s of ACTIVE) {
    const d = Math.hypot(s.x - x, s.z - z); s.d = d;
    if (state.found[s.id]) { world.setShop(s, 'found'); if (d <= VISIT_R && (!nearFound || d < nearFound.d)) nearFound = s; continue; }
    world.setShop(s, d <= HINT_R ? 'hint' : 'hidden');
    if (!nearHidden || d < nearHidden.d) nearHidden = s;
    if (d <= HINT_R && !alerted.has(s.id)) {
      alerted.add(s.id); chime(); navigator.vibrate?.([120, 60, 120]);
      toast(s.item ? '🔔 두근두근! 근처에 키링이 숨어 있어요' : '🔔 두근두근! 근처에 숨은 가게가 있어요');
    } else if (d > HINT_R + 30) alerted.delete(s.id);
  }
  const radar = $('#radar');
  if (!nearHidden) { radar.textContent = '🎉 숨은 조각을 모두 찾았어요!'; radar.className = 'radar'; }
  else if (nearHidden.d <= FIND_R) { radar.textContent = '✨ 바로 여기예요!'; radar.className = 'radar hot'; }
  else if (nearHidden.d <= HINT_R) { radar.textContent = `🔔 숨은 조각까지 약 ${Math.round(nearHidden.d / 5) * 5}m`; radar.className = 'radar warm'; }
  else if (nearHidden.d <= 150) { radar.textContent = '👃 어디선가 좋은 냄새가…'; radar.className = 'radar'; }
  else { radar.textContent = '🍃 골목이 조용해요'; radar.className = 'radar'; }

  const next = nearHidden && nearHidden.d <= FIND_R ? { type: 'find', shop: nearHidden } : nearFound ? { type: 'enter', shop: nearFound } : null;
  const btn = $('#actionBtn');
  if ((next && next.type + next.shop.id) !== (action && action.type + action.shop.id)) {
    action = next; btn.hidden = !next || tab !== 'map';
    if (next) { btn.textContent = next.type === 'find' ? (next.shop.item ? '✨ 숨은 키링 줍기!' : '✨ 숨은 가게 발견하기!') : next.shop.item ? `${next.shop.emoji} ${next.shop.name} 보기` : `🚪 ${next.shop.name} 들어가기`; btn.className = 'action ' + next.type; }
  }
  if (state.mode === 'explore') state.pos = [Math.round(x), Math.round(z)];
  if (view === 'google') syncGoogle(state.mode === 'gps');
}

function discover(shop) {
  state.found[shop.id] = { at: Date.now(), visits: 0, lastVisit: '' };
  stamp(shop, true); save(); world.setShop(shop, 'found');
  chime([784, 988, 1175, 1568]); navigator.vibrate?.([80, 40, 80, 40, 200]);
  updateCount();
  modal(`<div class="modal-box reveal"><div class="spark">✨</div><h3>${shop.item ? '키링 발견!' : '숨은 가게 발견!'}</h3>
    <div class="big">${cardHTML(shop)}</div><p class="hint">카드첩에 새 카드가 들어왔어요</p>
    <div class="row"><button class="btn ghost" data-act="close-modal">계속 탐험</button><button class="btn" data-act="open-shop" data-id="${shop.id}">${shop.item ? '자세히 보기' : '가게 구경하기'}</button></div></div>`);
}
function stamp(shop, quiet) {
  const f = state.found[shop.id];
  if (!f || f.lastVisit === today()) return;
  f.visits++; f.lastVisit = today(); save(); sendVisit(shop);
  if (!quiet) toast(`방문 도장 꾹! ${shop.name} ${f.visits}번째 방문 💮`);
}
const isNear = (shop) => Math.hypot(shop.x - world.pos.x, shop.z - world.pos.z) <= VISIT_R;
const level = (shop) => { const v = state.found[shop.id]?.visits || 0; return v >= 7 ? 3 : v >= 3 ? 2 : 1; };
const LV = ['', '첫 발견', '단골', '찐단골'];

// ---------- 카드 ----------
function cardFace(shop) {
  const key = state.shopImg[shop.id];
  if (key) return `<img data-key="${key}" alt="">`;
  if (shop.image) return `<img src="${esc(shop.image)}" alt="">`;
  return `<span class="emoji">${shop.emoji}</span>`;
}
function cardHTML(shop) {
  const cat = CATS[shop.cat];
  if (shop.unlocated) return `<div class="card locked soon"><div class="card-img"><span class="emoji">${shop.emoji}</span></div><div class="card-name">${esc(shop.name)}</div><div class="card-meta">위치 확인 중</div></div>`;
  if (!state.found[shop.id]) return `<div class="card locked"><div class="card-img"><span class="emoji">?</span></div><div class="card-name">???</div><div class="card-meta">${cat.label}</div></div>`;
  const lv = level(shop);
  return `<button class="card lv${lv}" data-act="open-shop" data-id="${shop.id}" style="--c:${cat.color}">
    <div class="card-img">${cardFace(shop)}</div><div class="card-name">${esc(shop.name)}</div>
    <div class="card-meta">${cat.label} · ${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}</div></button>`;
}
async function hydrate(root = document) {
  for (const img of root.querySelectorAll('img[data-key]:not([src])')) { const v = await getImg(img.dataset.key); if (v) img.src = v; }
}
function updateCount() {
  $('#count').textContent = `🃏 ${foundCount()}/${ACTIVE.length}`;
}

// ---------- 시트 / 모달 ----------
function sheet(html) { const el = $('#sheet'); $('#sheetBody').innerHTML = html; el.classList.add('show'); $('#sheetBody').scrollTop = 0; hydrate(el); }
function closeSheet() { $('#sheet').classList.remove('show'); }
function modal(html) { const el = $('#modal'); el.innerHTML = html; el.classList.add('show'); hydrate(el); }
function closeModal() { $('#modal').classList.remove('show'); $('#modal').innerHTML = ''; }

function setTab(t) {
  tab = t;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $('#actionBtn').hidden = !action || t !== 'map';
  if (t === 'map') return closeSheet();
  if (t === 'album') renderAlbum(); else renderCourse();
}

// ---------- 가게 페이지 ----------
function renderShop(id) {
  const shop = shopById(id), f = state.found[id];
  if (!f) return;
  const near = isNear(shop), cat = CATS[shop.cat];
  if (near) stamp(shop);
  if (shop.item) return sheet(`<div class="shop-head" style="--c:${cat.color}"><div class="thumb">${cardFace(shop)}</div>
      <div><span class="chip" style="background:${cat.color}">${cat.label}</span><h2>${esc(shop.name)}</h2><p>📍 ${esc(shop.tagline)}</p></div></div>
    <div class="stamps">💮 ${f.visits}번 찾아옴 · ${LV[level(shop)]} 카드 <span>${day(f.at)} 발견</span></div>
    <p class="empty" style="margin-top:16px">골목에 숨어 있던 키링이에요. 카드첩에 보관됐어요!</p>`);
  const photos = state.photos[id] || [], guest = state.guest[id] || [];
  const sp = serverPosts(id), sPhotos = sp.filter((p) => p.photo), sGuest = sp.filter((p) => p.body);
  const lock = near ? '' : '<p class="lock">📍 가게 근처(25m 안)에 있을 때만 남길 수 있어요</p>';
  sheet(`<div class="shop-head" style="--c:${cat.color}">
      <div class="thumb">${cardFace(shop)}</div>
      <div><span class="chip" style="background:${cat.color}">${cat.label}</span>${shop.mine ? '<span class="chip gray">내가 등록</span>' : ''}
        <h2>${esc(shop.name)}</h2><p>${esc(shop.tagline)}</p>${shop.address ? `<p class="sub">📍 ${esc(shop.address)}</p>` : ''}${shop.hours ? `<p class="sub">🕒 ${esc(shop.hours)}</p>` : ''}</div></div>
    <div class="stamps">💮 방문 ${f.visits}회 · ${LV[level(shop)]} 카드 <span>${day(f.at)} 발견</span></div>
    <div class="row"><button class="btn ghost" data-act="share-shop" data-id="${id}">🔗 가게 공유</button>
      ${state.owner || shop.mine ? `<button class="btn ghost" data-act="owner-img" data-id="${id}">🖼️ 카드 사진 등록</button>` : ''}
      ${shop.mine ? `<button class="btn ghost danger" data-act="del-place" data-id="${id}">🗑️ 등록 삭제</button>` : ''}</div>
    ${shop.special === 'cardmaker' ? `<section class="maker"><h3>✂️ 나만의 조각 카드 만들기</h3>
      <p>원하는 사진을 올리면 정사각형 카드로 만들어 카드첩에 넣어드려요.</p>
      <button class="btn" data-act="make-card" ${near ? '' : 'disabled'}>사진 올려서 카드 만들기</button>${lock}</section>` : ''}
    <section><h3>🎉 진행 중인 이벤트</h3>${(shop.events || []).length ? shop.events.map((e) => `<div class="event"><b>${esc(e.title)}</b><p>${esc(e.desc)}</p><span>${esc(e.until || '')}</span></div>`).join('') : '<p class="empty">지금은 진행 중인 이벤트가 없어요</p>'}</section>
    <section><h3>📋 메뉴판</h3>${(shop.menu || []).length ? `<ul class="menu">${shop.menu.map((m) => `<li><span>${esc(m.name)}</span><i></i><b>${esc(m.price)}</b></li>`).join('')}</ul>` : '<p class="empty">메뉴 정보는 가게 확인 후 등록돼요</p>'}</section>
    <section><h3>📸 담벼락 <small>${photos.length + sPhotos.length}</small></h3>
      <button class="btn" data-act="add-photo" data-id="${id}" ${near ? '' : 'disabled'}>사진 찍어 담벼락에 남기기</button>${lock}
      <div class="wall">${photos.map((p, i) => `<button data-act="view-photo" data-id="${id}" data-i="${i}"><img data-key="${p.key}" alt="${esc(p.caption)}"></button>`).join('') + sPhotos.map((p) => `<button data-act="view-sphoto" data-pid="${esc(p.id)}"><img src="${api.photoUrl(p.photo)}" loading="lazy" alt="방문자가 남긴 사진"></button>`).join('') || '<p class="empty">첫 번째 사진의 주인공이 되어보세요</p>'}</div></section>
    <section><h3>✍️ 방명록 <small>${guest.length + sGuest.length}</small></h3>
      <form class="guest-form" data-id="${id}">${srv.online ? `<p class="sub">${esc(srv.user?.name || '골목 탐험가')} 이름으로 모두에게 공개돼요</p>` : `<input name="name" maxlength="12" placeholder="닉네임" value="${esc(state.nick)}" ${near ? '' : 'disabled'}>`}
        <textarea name="text" maxlength="120" rows="2" placeholder="다녀간 흔적을 남겨주세요" ${near ? '' : 'disabled'}></textarea>
        <button class="btn" ${near ? '' : 'disabled'}>남기기</button></form>${lock}
      ${guest.map((g) => `<div class="guest"><b>${esc(g.name)}</b><span>${day(g.at)}</span><p>${esc(g.text)}</p></div>`).join('') + sGuest.map((g) => `<div class="guest"><b>${esc(g.name)}</b><span>${day(g.created)}</span><p>${esc(g.body)}</p></div>`).join('') || '<p class="empty">아직 방명록이 없어요</p>'}</section>`);
}

// ---------- 카드첩 ----------
function renderAlbum() {
  const list = SHOPS.filter((s) => albumFilter === 'all' || s.cat === albumFilter);
  const n = foundCount(), total = ACTIVE.length;
  sheet(`<h2>🃏 카드첩</h2>
    <div class="progress"><i style="width:${(n / total) * 100}%"></i></div>
    <p class="sub">지도에 숨은 조각 ${total}개 중 ${n}개 발견 · 자주 방문하면 카드 등급이 올라가요<br>골목에서 새 가게를 만나면 📍 가게 등록으로 직접 추가해 보세요</p>
    <div class="chips">${[['all', '전체'], ...Object.entries(CATS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button class="${albumFilter === k ? 'on' : ''}" data-act="filter" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="grid">${list.map(cardHTML).join('')}</div>
    <h3>✂️ 나의 조각 카드 <small>${state.custom.length}</small></h3>
    <div class="grid">${state.custom.map((c, i) => `<button class="card custom" data-act="view-custom" data-i="${i}"><div class="card-img"><img data-key="${c.key}" alt=""></div><div class="card-name">${esc(c.caption || '나의 조각')}</div><div class="card-meta">${day(c.at)}</div></button>`).join('') || '<p class="empty wide">메이드키에 방문하면 내 사진으로 카드를 만들 수 있어요</p>'}</div>`);
}

// ---------- 코스 ----------
function renderCourse() {
  const list = foundList().filter((s) => !s.item);
  coursePick = coursePick.filter((id) => state.found[id] && shopById(id));
  sheet(`<h2>💌 나의 골목 코스</h2><p class="sub">다녀온 가게를 순서대로 골라 데이트 코스로 공유해요</p>
    ${list.length ? `<input id="courseTitle" class="input" maxlength="20" placeholder="코스 이름 (예: 모란 골목 반나절 데이트)">
    <div class="course-list">${list.map((s) => { const i = coursePick.indexOf(s.id); return `<button class="${i >= 0 ? 'on' : ''}" data-act="pick" data-id="${s.id}"><em>${i >= 0 ? i + 1 : ''}</em>${s.emoji} ${esc(s.name)}<span>${CATS[s.cat].label}</span></button>`; }).join('')}</div>
    <button class="btn" data-act="make-course" ${coursePick.length < 2 ? 'disabled' : ''}>코스 이미지 만들기 (${coursePick.length}곳)</button>
    <div id="courseOut"></div>` : '<p class="empty">아직 발견한 가게가 없어요. 골목을 걸으며 숨은 가게를 찾아보세요!</p>'}`);
}

// ---------- 설정 ----------
function renderSettings() {
  modal(`<div class="modal-box"><h3>⚙️ 설정</h3>
    <label class="field">닉네임<input id="nick" class="input" maxlength="12" value="${esc(state.nick)}" placeholder="방명록에 쓸 이름"></label>
    <label class="check"><input type="checkbox" id="owner" ${state.owner ? 'checked' : ''}> 사장님 모드 (가게 카드 이미지 등록)</label>
    <p class="sub">지도: ${map.source === 'fallback' ? '임시 지도 (실제 지도를 받아오지 못했어요)' : '실제 도로 좌표 (OpenStreetMap)' + (map.decorBuildings ? ' · 건물은 장식용' : '')}<br>서버: ${srv.online ? `연결됨 · ${esc(srv.user?.name || '')} (가게·사진·방명록이 모두와 공유돼요)` : '연결 안 됨 (기록은 이 기기에만 저장돼요)'}</p>
    <div class="row"><button class="btn ghost danger" data-act="reset">기록 초기화</button><button class="btn" data-act="save-settings">확인</button></div></div>`);
}

// ---------- 동작 ----------
const acts = {
  'close-modal': closeModal,
  register: renderRegister,
  'gm-refresh': openGoogle,
  'del-place': async (d) => {
    if (!confirm('내가 등록한 이 가게를 지울까요? 사진과 방명록도 함께 지워져요.')) return;
    const shop = shopById(d.id); world.setShop(shop, 'hidden');
    for (const p of state.photos[d.id] || []) await delImg(p.key);
    if (state.shopImg[d.id]) await delImg(state.shopImg[d.id]);
    for (const k of ['found', 'photos', 'guest', 'shopImg']) delete state[k][d.id];
    state.places = state.places.filter((p) => p.id !== d.id);
    SHOPS.splice(SHOPS.indexOf(shop), 1); ACTIVE.splice(ACTIVE.indexOf(shop), 1);
    action = null; $('#actionBtn').hidden = true; save(); updateCount(); setTab('map'); toast('등록한 가게를 지웠어요');
  },
  'close-sheet': () => setTab('map'),
  'open-shop': (d) => { closeModal(); renderShop(d.id); },
  filter: (d) => { albumFilter = d.k; renderAlbum(); },
  pick: (d) => { const i = coursePick.indexOf(d.id); i >= 0 ? coursePick.splice(i, 1) : coursePick.push(d.id); const t = $('#courseTitle')?.value; renderCourse(); if (t) $('#courseTitle').value = t; },
  'make-course': () => {
    const title = $('#courseTitle').value.trim();
    const stops = coursePick.map(shopById).map((s) => ({ ...s, catLabel: CATS[s.cat].label }));
    const cv = courseImage(title, stops, map);
    const out = $('#courseOut'); out.innerHTML = '<button class="btn" data-act="share-course">📤 SNS로 공유하기</button>';
    cv.className = 'course-img'; out.prepend(cv);
    out._share = () => shareCanvas(cv, 'moran-course', `${title || '나의 모란 골목 코스'} 🌸\n${stops.map((s, i) => `${i + 1}. ${s.name}`).join(' → ')}\n#모란한조각 #모란골목 #도담길`);
    out.scrollIntoView({ behavior: 'smooth' });
  },
  'share-course': async () => shareResult(await $('#courseOut')._share()),
  'share-shop': async (d) => { const s = shopById(d.id); shareResult(await shareText(`${s.emoji} ${s.name} — ${s.tagline}\n모란 골목에서 찾은 숨은 가게! #모란한조각 #도담길`)); },
  'add-photo': async (d) => {
    const file = await pickPhoto({ camera: true }); if (!file) return;
    const r = await cropSquare(file, { title: '담벼락에 남길 사진' }); if (!r) return;
    if (srv.online) {
      try { toast('사진을 올리는 중…', 8000); await api.act('post', { shop: d.id, body: r.caption, photo: await api.upload(r.data, d.id) }); await syncServer(); toast('담벼락에 사진을 남겼어요 📸'); }
      catch (e) { toast(e.message || '사진을 올리지 못했어요', 3500); }
      return renderShop(d.id);
    }
    (state.photos[d.id] ||= []).unshift({ key: await putImg(r.data), at: Date.now(), caption: r.caption }); save();
    toast('담벼락에 사진을 남겼어요 📸'); renderShop(d.id);
  },
  'view-sphoto': (d) => {
    const p = srv.posts.find((q) => q.id === d.pid); if (!p) return;
    modal(`<div class="modal-box"><img class="full" src="${api.photoUrl(p.photo)}" alt=""><p>${esc(p.body)}</p><p class="sub">${esc(p.name)} · ${day(p.created)}</p>
      <div class="row"><button class="btn ghost" data-act="close-modal">닫기</button><button class="btn" data-act="share-sphoto" data-pid="${esc(p.id)}">📤 공유</button></div></div>`);
  },
  'share-sphoto': async (d) => {
    const p = srv.posts.find((q) => q.id === d.pid), s = shopById(p.shop);
    shareResult(await shareCanvas(await photoFrame(api.photoUrl(p.photo), s, p.body), 'moran-' + s.id, `${s.emoji} ${s.name}에 다녀왔어요! #모란한조각 #모란골목 #도담길`));
  },
  'view-photo': (d) => {
    const p = state.photos[d.id][+d.i];
    modal(`<div class="modal-box"><img class="full" data-key="${p.key}" alt=""><p>${esc(p.caption)}</p><p class="sub">${day(p.at)}</p>
      <div class="row"><button class="btn ghost danger" data-act="del-photo" data-id="${d.id}" data-i="${d.i}">삭제</button><button class="btn ghost" data-act="close-modal">닫기</button><button class="btn" data-act="share-photo" data-id="${d.id}" data-i="${d.i}">📤 공유</button></div></div>`);
  },
  'share-photo': async (d) => {
    const p = state.photos[d.id][+d.i], s = shopById(d.id);
    shareResult(await shareCanvas(await photoFrame(await getImg(p.key), s, p.caption), 'moran-' + s.id, `${s.emoji} ${s.name}에 다녀왔어요! #모란한조각 #모란골목 #도담길`));
  },
  'del-photo': async (d) => { const [p] = state.photos[d.id].splice(+d.i, 1); await delImg(p.key); save(); closeModal(); renderShop(d.id); },
  'make-card': async () => {
    const file = await pickPhoto(); if (!file) return;
    const r = await cropSquare(file, { title: '나만의 조각 카드' }); if (!r) return;
    const c = { key: await putImg(r.data), at: Date.now(), caption: r.caption }; state.custom.unshift(c); save();
    chime([784, 988, 1175, 1568]);
    modal(`<div class="modal-box reveal"><div class="spark">✂️</div><h3>조각 카드 완성!</h3>
      <div class="big"><div class="card custom"><div class="card-img"><img data-key="${c.key}" alt=""></div><div class="card-name">${esc(c.caption || '나의 조각')}</div><div class="card-meta">${day(c.at)}</div></div></div>
      <div class="row"><button class="btn" data-act="close-modal">카드첩에 넣기</button></div></div>`);
  },
  'view-custom': (d) => {
    const c = state.custom[+d.i];
    modal(`<div class="modal-box"><img class="full" data-key="${c.key}" alt=""><p>${esc(c.caption || '나의 조각')}</p>
      <div class="row"><button class="btn ghost danger" data-act="del-custom" data-i="${d.i}">삭제</button><button class="btn ghost" data-act="close-modal">닫기</button><button class="btn" data-act="share-custom" data-i="${d.i}">📤 공유</button></div></div>`);
  },
  'share-custom': async (d) => {
    const c = state.custom[+d.i];
    shareResult(await shareCanvas(await photoFrame(await getImg(c.key), shopById('maidkey'), c.caption || '나의 조각 카드'), 'moran-card', '모란 골목에서 만든 나만의 조각 카드 🌸 #모란한조각 #메이드키'));
  },
  'del-custom': async (d) => { const [c] = state.custom.splice(+d.i, 1); await delImg(c.key); save(); closeModal(); renderAlbum(); },
  'owner-img': async (d) => {
    const file = await pickPhoto(); if (!file) return;
    const r = await cropSquare(file, { title: '가게 카드 이미지', caption: false }); if (!r) return;
    if (state.shopImg[d.id]) await delImg(state.shopImg[d.id]);
    state.shopImg[d.id] = await putImg(r.data); save(); toast('가게 카드 이미지를 등록했어요'); renderShop(d.id);
  },
  'save-settings': () => { state.nick = $('#nick').value.trim(); state.owner = $('#owner').checked; save(); closeModal(); },
  reset: async () => { if (confirm('발견한 가게·카드·사진 기록을 모두 지울까요?')) { await resetAll(); location.reload(); } },
};
function shareResult(r) {
  if (r === 'saved') toast('이미지를 저장하고 문구를 복사했어요. SNS에 올려보세요!', 3500);
  else if (r === 'copied') toast('공유 문구를 복사했어요');
  else if (r === 'fail') toast('이 브라우저에서는 공유를 쓸 수 없어요');
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && acts[el.dataset.act]) acts[el.dataset.act](el.dataset);
});
document.addEventListener('submit', (e) => {
  const rf = e.target.closest('.reg-form');
  if (rf) {
    e.preventDefault();
    const name = rf.name.value.trim(); if (!name) return;
    const cat = rf.cat.value, c = curLatLng();
    const p = { id: 'p' + Date.now().toString(36), name, cat, emoji: CATS[cat].emoji, tagline: rf.tagline.value.trim() || '골목에서 직접 찾은 가게', lat: c.lat, lng: c.lng, at: Date.now() };
    const done = () => {
      state.found[p.id] = { at: Date.now(), visits: 1, lastVisit: today() };
      save(); updateCount(); closeModal(); chime([784, 988, 1175, 1568]);
      toast(`${name} 등록 완료! 카드첩에 카드가 생겼어요 🃏`, 3200); renderShop(p.id);
    };
    if (srv.online) { // 서버에 등록 → 모든 고객의 지도에 숨은 가게로 등장
      const btn = rf.querySelector('.btn:not(.ghost)'); btn.disabled = true;
      api.addPlace({ name, category: CATS[cat].label, address: '', lat: c.lat, lng: c.lng })
        .then(async (r) => { p.id = r.id; await syncServer(); if (!shopById(p.id)) throw Error('등록은 됐지만 목록을 새로 불러오지 못했어요'); sendVisit(shopById(p.id)); done(); })
        .catch((err) => { btn.disabled = false; toast(err.message || '가게를 등록하지 못했어요', 3500); });
      return;
    }
    (state.places ||= []).push(p); addPlace(p); done();
    return;
  }
  const f = e.target.closest('.guest-form'); if (!f) return;
  e.preventDefault();
  const text = f.text.value.trim(); if (!text) return;
  if (srv.online) {
    api.act('post', { shop: f.dataset.id, body: text, photo: null }).then(syncServer).then(() => { toast('방명록을 남겼어요 ✍️'); renderShop(f.dataset.id); })
      .catch((err) => toast(err.message || '방명록을 남기지 못했어요', 3500));
    return;
  }
  state.nick = f.name?.value.trim() || state.nick;
  (state.guest[f.dataset.id] ||= []).unshift({ name: state.nick || '모란 탐험가', text, at: Date.now() }); save();
  toast('방명록을 남겼어요 ✍️'); renderShop(f.dataset.id);
});
document.querySelectorAll('.tabbar button').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
$('#actionBtn').onclick = () => { if (!action) return; action.type === 'find' ? discover(action.shop) : renderShop(action.shop.id); };
$('#modeBtn').onclick = () => setMode(state.mode === 'gps' ? 'explore' : 'gps');
$('#recenter').onclick = () => world.recenter();
$('#gear').onclick = renderSettings;
document.querySelectorAll('.viewtabs button').forEach((b) => (b.onclick = () => setView(b.dataset.view)));

// ---------- 시작 ----------
(async function boot() {
  map = await loadMap();
  world = createWorld($('#scene'), map);
  placeShops();
  await syncServer();
  setInterval(() => { if (!document.hidden) syncServer(); }, 60000); // 다른 고객이 등록한 가게 받아오기
  const start = state.pos || (() => { const n = world.nearestRoad(-100, 100); return n ? [n.px, n.pz] : [0, 0]; })(); // 메이드키에서 조금 떨어진 골목에서 출발
  world.teleport(start[0], start[1]);
  world.onUpdate(tick);
  updateCount();
  if (map.source === 'fallback') $('#mapNote').textContent = '임시 지도로 실행 중';
  window.__game = { state, world, SHOPS, map }; // 디버그용
  $('#splashMsg').textContent = '골목 탐험 준비 완료!';
  document.querySelectorAll('#splash button').forEach((b) => {
    b.disabled = false;
    b.onclick = () => { $('#splash').classList.add('hide'); chime([660, 880]); setMode(b.dataset.mode); if (b.dataset.mode === 'explore') toast('화면을 끌어서 골목을 걸어보세요 🕹️', 3500); };
  });
})();
