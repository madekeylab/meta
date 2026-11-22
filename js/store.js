// 저장소: 진행 상태는 localStorage, 사진은 IndexedDB (모두 이 기기 안에만 저장)
const KEY = 'moran-hanjogak-v3';
const DEFAULTS = {
  nick: '', mode: 'explore', owner: false, pos: null,
  found: {},   // shopId -> { at, visits, lastVisit }
  guest: {},   // shopId -> [{ name, text, at }]
  photos: {},  // shopId -> [{ key, at, caption }]
  custom: [],  // 나의 조각 카드 [{ key, at, caption }]
  shopImg: {}, // shopId -> 이미지 key (사장님 모드로 등록)
  places: [],  // 내가 직접 등록한 가게 [{ id, name, cat, emoji, tagline, lat, lng, at }]
};

export const state = load();
function load() {
  try { return { ...structuredClone(DEFAULTS), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return structuredClone(DEFAULTS); }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export async function resetAll() {
  try { localStorage.removeItem(KEY); } catch {}
  try { const db = await open(); await tx(db, 'readwrite', (s) => s.clear()); } catch {}
}

// ---- IndexedDB (이미지 dataURL) ----
const mem = new Map();
let dbp;
function open() {
  return (dbp ||= new Promise((res, rej) => {
    const rq = indexedDB.open(KEY, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('img');
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }));
}
function tx(db, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction('img', mode);
    const rq = fn(t.objectStore('img'));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = () => rej(t.error);
  });
}
export async function putImg(dataUrl) {
  const key = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  mem.set(key, dataUrl);
  try { await tx(await open(), 'readwrite', (s) => s.put(dataUrl, key)); } catch {}
  return key;
}
export async function getImg(key) {
  if (mem.has(key)) return mem.get(key);
  try { const v = await tx(await open(), 'readonly', (s) => s.get(key)); if (v) mem.set(key, v); return v || null; }
  catch { return null; }
}
export async function delImg(key) {
  mem.delete(key);
  try { await tx(await open(), 'readwrite', (s) => s.delete(key)); } catch {}
}
