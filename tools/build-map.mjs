// data/roads.json (madekey.kr 과 같은 실제 도로 좌표, OpenStreetMap · ODbL) → data/map.json
// 사용법: node tools/build-map.mjs
// 건물 외곽선 데이터는 없어서, 골목 옆 빈 자리에 장식용 집을 자동으로 세웁니다(실제 건물과 다름).
import { readFileSync, writeFileSync } from 'node:fs';
import { KIND, ROAD_W } from '../js/osm.js';
import { CENTER, MAP_RADIUS, toLocal, rng } from '../js/geo.js';

const src = JSON.parse(readFileSync(new URL('../data/roads.json', import.meta.url), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const LIM = MAP_RADIUS + 60;
const roads = [];
for (const w of src.ways) {
  const k = KIND[w.highway];
  if (!k) continue;
  const p = w.points.map(([lat, lng]) => toLocal(lat, lng).map(r1));
  // 반경 밖 구간은 잘라낸다
  let run = [];
  const flush = () => { if (run.length > 1) roads.push(w.name ? { k, n: w.name, p: run } : { k, p: run }); run = []; };
  for (const q of p) (Math.hypot(q[0], q[1]) <= LIM ? run.push(q) : flush());
  flush();
}

// 장식용 집
const segs = [];
for (const r of roads) for (let i = 0; i < r.p.length - 1; i++) segs.push({ a: r.p[i], b: r.p[i + 1], w: ROAD_W[r.k], k: r.k });
const dSeg = (x, z, s) => {
  const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) - s.w / 2;
};
const rand = rng(1004), buildings = [], centers = [];
for (const s of segs) {
  if (s.k === 'foot') continue;
  const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = Math.hypot(dx, dz);
  if (l < 9) continue;
  const ux = dx / l, uz = dz / l, nx = -uz, nz = ux;
  for (let d = 5; d < l - 4; d += 10.5) for (const side of [1, -1]) {
    const W = 7 + rand() * 2.5, D = 6 + rand() * 3, off = s.w / 2 + 1.6 + D / 2;
    const cx = s.a[0] + ux * d + nx * off * side, cz = s.a[1] + uz * d + nz * off * side;
    if (Math.hypot(cx, cz) > MAP_RADIUS) continue;
    if (segs.some((o) => o !== s && dSeg(cx, cz, o) < Math.max(W, D) / 2 + 1.2)) continue;
    if (centers.some((c) => Math.abs(c[0] - cx) < 11 && Math.abs(c[1] - cz) < 11 && Math.hypot(c[0] - cx, c[1] - cz) < 10.5)) continue;
    centers.push([cx, cz]);
    const c = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [-W / 2, -D / 2]];
    buildings.push({ h: 5 + Math.floor(rand() * 4) * 2, p: c.map(([a, b]) => [r1(cx + ux * a + nx * b), r1(cz + uz * a + nz * b)]) });
  }
}
const map = { center: CENTER, source: 'madekey-roads', decorBuildings: true, roads, buildings, pois: [] };
writeFileSync(new URL('../data/map.json', import.meta.url), JSON.stringify(map));
console.log(`길 ${roads.length}개, 장식 건물 ${buildings.length}개 → data/map.json`);
