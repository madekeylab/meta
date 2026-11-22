// OpenStreetMap(Overpass) 원본 → 게임용 지도 데이터로 변환. 브라우저/Node 공용.
import { CENTER, MAP_RADIUS, toLocal, rng } from './geo.js';

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const OVERPASS_QUERY = `[out:json][timeout:25];(
way["highway"](around:${MAP_RADIUS},${CENTER.lat},${CENTER.lng});
way["building"](around:${MAP_RADIUS},${CENTER.lat},${CENTER.lng});
nwr["name"~"도담"](around:2000,${CENTER.lat},${CENTER.lng});
node["railway"~"station|subway_entrance"](around:500,${CENTER.lat},${CENTER.lng});
);out body geom;`;

export const KIND = {
  motorway: 'main', trunk: 'main', primary: 'main', secondary: 'main',
  motorway_link: 'main', trunk_link: 'main', primary_link: 'main', secondary_link: 'main',
  tertiary: 'street', tertiary_link: 'street', unclassified: 'street',
  residential: 'alley', living_street: 'alley', service: 'alley', road: 'alley',
  pedestrian: 'foot', footway: 'foot', path: 'foot', steps: 'foot', cycleway: 'foot', track: 'foot',
};
export const ROAD_W = { main: 14, street: 8, alley: 5, foot: 2.6 };

const r1 = (v) => Math.round(v * 10) / 10;

export function normalizeOSM(raw) {
  const roads = [], buildings = [], pois = [];
  for (const e of raw.elements || []) {
    const t = e.tags || {};
    if (e.type === 'node') {
      if (t.railway && (t.name || t.ref)) {
        const [x, z] = toLocal(e.lat, e.lon);
        pois.push({ type: t.railway === 'station' ? 'station' : 'exit', name: t.railway === 'station' ? t.name : `${t.ref || ''}번 출구`, x: r1(x), z: r1(z) });
      }
      continue;
    }
    if (e.type !== 'way' || !e.geometry) continue;
    const p = e.geometry.map((g) => toLocal(g.lat, g.lon).map(r1));
    if (t.highway) {
      const k = KIND[t.highway];
      if (!k) continue;
      if (k === 'foot' && (t.tunnel || t.indoor || +t.layer < 0 || t.footway === 'sidewalk' || t.footway === 'crossing')) continue;
      if (t.tunnel === 'yes' || +t.layer < 0) continue;
      const road = { k, p };
      if (t.name) road.n = t.name;
      roads.push(road);
    } else if (t.building && p.length >= 4) {
      const rand = rng(e.id);
      const h = t['building:levels'] ? Math.min(+t['building:levels'], 12) * 3 : 5 + Math.floor(rand() * 4) * 2;
      buildings.push({ h, p });
    }
  }
  return { center: CENTER, source: 'osm', roads, buildings, pois };
}

// 지도를 받아오지 못했을 때 쓰는 임시(가상) 골목. 실제 지형과 다릅니다.
export function fallbackMap() {
  const rand = rng(20261121);
  const roads = [], buildings = [];
  const S = MAP_RADIUS - 40;
  roads.push({ k: 'main', n: '성남대로(임시)', p: [[0, -S], [0, S]] });
  roads.push({ k: 'main', n: '둔촌대로(임시)', p: [[-S, 20], [S, 20]] });
  const xs = [], zs = [];
  for (let x = -S; x <= S; x += 58) if (Math.abs(x) > 20) xs.push(x + (rand() - 0.5) * 10);
  for (let z = -S; z <= S; z += 46) if (Math.abs(z - 20) > 20) zs.push(z + (rand() - 0.5) * 8);
  xs.forEach((x, i) => roads.push({ k: i % 4 === 1 ? 'street' : 'alley', p: [[r1(x), -S], [r1(x + (rand() - 0.5) * 12), 0], [r1(x), S]] }));
  zs.forEach((z, i) => roads.push({ k: i % 5 === 2 ? 'street' : 'alley', n: i === 3 ? '도담길(임시)' : undefined, p: [[-S, r1(z)], [0, r1(z + (rand() - 0.5) * 8)], [S, r1(z)]] }));
  const ax = [-S, ...xs, S].sort((a, b) => a - b), az = [-S, ...zs, S].sort((a, b) => a - b);
  for (let i = 0; i < ax.length - 1; i++) for (let j = 0; j < az.length - 1; j++) {
    const x0 = ax[i] + 6, x1 = ax[i + 1] - 6, z0 = az[j] + 6, z1 = az[j + 1] - 6;
    if (x1 - x0 < 14 || z1 - z0 < 10) continue;
    if ((x0 < 12 && x1 > -12) || (z0 < 32 && z1 > 8)) continue;
    const n = Math.max(1, Math.round((x1 - x0) / 16)), w = (x1 - x0) / n;
    for (let c = 0; c < n; c++) for (let r = 0; r < 2; r++) {
      if (rand() < 0.08) continue;
      const bx0 = x0 + c * w + 0.8, bx1 = x0 + (c + 1) * w - 0.8, zm = (z0 + z1) / 2;
      const bz0 = r ? zm + 0.8 : z0, bz1 = r ? z1 : zm - 0.8;
      buildings.push({ h: 5 + Math.floor(rand() * 4) * 2, p: [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1], [bx0, bz0]].map((q) => q.map(r1)) });
    }
  }
  return { center: CENTER, source: 'fallback', roads, buildings, pois: [{ type: 'station', name: '모란역', x: 0, z: 20 }] };
}

// data/map.json(미리 받아둔 실제 지도) → 실시간 Overpass → 임시 지도 순으로 시도
export async function loadMap() {
  try {
    const r = await fetch('./data/map.json', { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch {}
  const CACHE = 'moran-map-v1'; // 한 번 받은 실제 지도는 기기에 보관
  try { const c = JSON.parse(localStorage.getItem(CACHE)); if (c && c.roads.length > 10) return c; } catch {}
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(OVERPASS_QUERY), signal: ctl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const m = normalizeOSM(await r.json());
      if (m.roads.length > 10) { try { localStorage.setItem(CACHE, JSON.stringify(m)); } catch {} return m; }
    }
  } catch {}
  return fallbackMap();
}
