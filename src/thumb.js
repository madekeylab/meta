/* 제품 사진. product.image가 있으면 그 사진을, 없으면 제품 색으로 그린 그림을 돌려준다 */

const cache = new Map();
const ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
  [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1],
];

export function productImage(product) {
  if (product.image) return product.image;
  if (cache.has(product.id)) return cache.get(product.id);
  const c = product.colors;
  const cv = document.createElement('canvas');
  cv.width = 480;
  cv.height = 300;
  const g = cv.getContext('2d');
  g.fillStyle = '#f5ebca';
  g.fillRect(0, 0, 480, 300);
  // 그림자, 케이스
  g.fillStyle = 'rgba(103,84,43,.18)';
  g.beginPath();
  g.roundRect(34, 86, 420, 160, 20);
  g.fill();
  g.fillStyle = c.case;
  g.strokeStyle = '#67542b';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(26, 70, 428, 160, 20);
  g.fill();
  g.stroke();
  // 키캡
  const u = 25.4;
  ROWS.forEach((row, r) => {
    let x = 37;
    row.forEach((w, i) => {
      const accent = (r === 0 && i === 0) || (r === 2 && i === row.length - 2);
      g.fillStyle = accent ? c.accent : c.cap;
      g.strokeStyle = 'rgba(103,84,43,.55)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(x + 1.5, 82 + r * 27.5, w * u - 3, 24, 5);
      g.fill();
      g.stroke();
      x += w * u;
    });
  });
  const url = cv.toDataURL('image/png');
  cache.set(product.id, url);
  return url;
}
