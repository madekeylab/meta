// 좌표 변환: 위경도 <-> 로컬 미터 좌표 (x = 동쪽, z = 남쪽). 1 단위 = 1m
// 지도의 기준점 = 메이드키 (madekey.kr 과 동일한 좌표)
export const CENTER = { lat: 37.4308875, lng: 127.131921875 };
export const MAP_RADIUS = 600; // 지도 반경(m)

const R = 6378137, RAD = Math.PI / 180;
const KX = RAD * R * Math.cos(CENTER.lat * RAD), KZ = RAD * R;

export const toLocal = (lat, lng) => [(lng - CENTER.lng) * KX, -(lat - CENTER.lat) * KZ];
export const toLatLng = (x, z) => ({ lat: CENTER.lat - z / KZ, lng: CENTER.lng + x / KX });
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// 결정적 난수 (같은 지도 → 같은 배치)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
