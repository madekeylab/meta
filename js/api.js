// madekey.kr 서버 연결 (가게 등록 · 방문 기록 · 사진/방명록 공유)
import { API_BASE } from './config.js';

async function call(path, opt = {}, ms = 12000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(API_BASE + path, { credentials: 'include', signal: ctl.signal, ...opt });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) throw Error((d && d.error) || '서버에 연결하지 못했어요');
    return d;
  } finally { clearTimeout(timer); }
}
const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// madekey.kr 의 가상 탐험 좌표계 (지도 범위 북서쪽 모서리 기준 미터)
const B = { west: 127.121, north: 37.44 }, KY = 111195, KX = 111195 * Math.cos((37.43 * Math.PI) / 180);
export const toServerXY = (lat, lng) => ({ x: (lng - B.west) * KX, y: (B.north - lat) * KY });

export const api = {
  game: () => call('/api/game', {}, 7000),                       // 내 정보 + 가게 + 방문 + 사진/방명록
  addPlace: (p) => post('/api/places', p),                        // { name, category, address, lat, lng } → { id }
  act: (action, data) => post('/api/game', { action, ...data }),  // visit / post / badge …
  async upload(dataUrl, shop) {                                   // 사진 업로드 → 사진 id
    const fd = new FormData();
    fd.set('file', await (await fetch(dataUrl)).blob(), 'photo.jpg'); fd.set('shop', shop); fd.set('kind', 'photo');
    return (await call('/api/upload', { method: 'POST', body: fd }, 30000)).id;
  },
  photoUrl: (id) => `${API_BASE}/api/photo/${encodeURIComponent(id)}`,
};
