// 사진 정사각형 자르기 · 공유용 이미지 만들기 · SNS 공유
import { ROAD_W } from './osm.js';

const FONT = '"Jua","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// 사진을 골라 정사각형으로 자른다 (끌어서 위치, 슬라이더로 확대). 결과: JPEG dataURL 또는 null
// 결과: { data: JPEG dataURL, caption } 또는 null
export async function cropSquare(file, { size = 720, title = '사진 자르기', caption = true } = {}) {
  const url = URL.createObjectURL(file);
  let img;
  try { img = await loadImg(url); } catch { URL.revokeObjectURL(url); return null; }
  return new Promise((resolve) => {
    const V = 600;
    const el = document.createElement('div');
    el.className = 'modal show';
    el.innerHTML = `<div class="modal-box crop"><h3>${title}</h3>
      <canvas width="${V}" height="${V}"></canvas>
      <p class="hint">사진을 끌어서 위치를 맞추세요 · 정사각형으로 저장돼요</p>
      <input type="range" min="1" max="3" step="0.01" value="1" aria-label="확대">
      ${caption ? '<input type="text" class="cap" maxlength="30" placeholder="한 줄 메모 (선택)">' : ''}
      <div class="row"><button class="btn ghost" data-a="x">취소</button><button class="btn" data-a="ok">이 사진으로</button></div></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), range = el.querySelector('input[type=range]');
    const min = V / Math.min(img.width, img.height);
    let sc = min, ox = (V - img.width * sc) / 2, oy = (V - img.height * sc) / 2;
    const draw = () => {
      ox = Math.min(0, Math.max(V - img.width * sc, ox)); oy = Math.min(0, Math.max(V - img.height * sc, oy));
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, V, V); ctx.drawImage(img, ox, oy, img.width * sc, img.height * sc);
    };
    draw();
    let drag = null;
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; };
    cv.onpointermove = (e) => { if (!drag) return; const k = V / cv.clientWidth; ox += (e.clientX - drag.x) * k; oy += (e.clientY - drag.y) * k; drag = { x: e.clientX, y: e.clientY }; draw(); };
    cv.onpointerup = cv.onpointercancel = () => (drag = null);
    range.oninput = () => { const n = min * +range.value, cx = (V / 2 - ox) / sc, cy = (V / 2 - oy) / sc; sc = n; ox = V / 2 - cx * sc; oy = V / 2 - cy * sc; draw(); };
    el.onclick = (e) => {
      const a = e.target.dataset.a; if (!a) return;
      let out = null;
      if (a === 'ok') { const o = document.createElement('canvas'); o.width = o.height = size; o.getContext('2d').drawImage(cv, 0, 0, size, size); out = { data: o.toDataURL('image/jpeg', 0.86), caption: (el.querySelector('.cap')?.value || '').trim() }; }
      URL.revokeObjectURL(url); el.remove(); resolve(out);
    };
  });
}

export function pickPhoto({ camera = false } = {}) {
  return new Promise((res) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; if (camera) inp.capture = 'environment';
    inp.onchange = () => res(inp.files[0] || null);
    inp.oncancel = () => res(null);
    inp.click();
  });
}

function header(ctx, W, sub) {
  ctx.fillStyle = '#ff7fa8'; ctx.font = `700 64px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('🌸 모란 한 조각', 60, 110);
  ctx.fillStyle = '#9b8573'; ctx.font = `400 34px ${FONT}`; ctx.fillText(sub, 62, 162);
}

// 가게 담벼락 사진 → 프레임이 있는 공유용 이미지
export async function photoFrame(dataUrl, shop, caption) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff7ea'; ctx.fillRect(0, 0, W, H);
  const img = await loadImg(dataUrl);
  ctx.save(); ctx.beginPath(); ctx.roundRect(60, 60, 960, 960, 48); ctx.clip(); ctx.drawImage(img, 60, 60, 960, 960); ctx.restore();
  ctx.fillStyle = '#5b4636'; ctx.font = `700 70px ${FONT}`; ctx.fillText(`${shop.emoji} ${shop.name}`, 64, 1130);
  ctx.fillStyle = '#9b8573'; ctx.font = `400 40px ${FONT}`; ctx.fillText((caption || shop.tagline || '').slice(0, 26), 66, 1196);
  ctx.fillStyle = '#ff7fa8'; ctx.font = `700 40px ${FONT}`; ctx.fillText('🌸 모란 한 조각 · 모란 골목에서', 66, 1284);
  return cv;
}

// 데이트 코스 이미지 (실제 골목 지도 위에 경로 표시)
export function courseImage(title, stops, map) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff7ea'; ctx.fillRect(0, 0, W, H);
  header(ctx, W, title || '나의 모란 골목 코스');

  const mx = 60, my = 200, mw = 960, mh = 560;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  stops.forEach((s) => { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); });
  const pad = 70; x0 -= pad; x1 += pad; z0 -= pad; z1 += pad;
  const sc = Math.min(mw / (x1 - x0), mh / (z1 - z0));
  const tx = (x) => mx + mw / 2 + (x - (x0 + x1) / 2) * sc, tz = (z) => my + mh / 2 + (z - (z0 + z1) / 2) * sc;
  ctx.save(); ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 40); ctx.clip();
  ctx.fillStyle = '#d9efc6'; ctx.fillRect(mx, my, mw, mh);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (const r of map.roads) {
    ctx.strokeStyle = pass ? '#fbf0d6' : '#ffffff'; ctx.lineWidth = Math.max(2, ROAD_W[r.k] * sc) + (pass ? 0 : 5);
    ctx.beginPath(); r.p.forEach(([x, z], i) => (i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z)))); ctx.stroke();
  }
  ctx.strokeStyle = '#ff7fa8'; ctx.lineWidth = 8; ctx.setLineDash([4, 18]);
  ctx.beginPath(); stops.forEach((s, i) => (i ? ctx.lineTo(tx(s.x), tz(s.z)) : ctx.moveTo(tx(s.x), tz(s.z)))); ctx.stroke(); ctx.setLineDash([]);
  stops.forEach((s, i) => {
    ctx.fillStyle = '#ff7fa8'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(tx(s.x), tz(s.z), 30, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `700 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, tx(s.x), tz(s.z) + 2);
  });
  ctx.restore();

  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const rows = stops.slice(0, 6), rh = Math.min(74, 420 / rows.length);
  rows.forEach((s, i) => {
    const y = 810 + i * rh + rh / 2;
    ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.arc(92, y, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 28px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(i + 1, 92, y + 2); ctx.textAlign = 'left';
    ctx.fillStyle = '#5b4636'; ctx.font = `700 42px ${FONT}`; ctx.fillText(`${s.emoji} ${s.name}`, 136, y + 2);
    ctx.fillStyle = '#b39c88'; ctx.font = `400 30px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(s.catLabel, 1020, y + 2); ctx.textAlign = 'left';
  });
  if (stops.length > 6) { ctx.fillStyle = '#b39c88'; ctx.font = `400 30px ${FONT}`; ctx.fillText(`… 외 ${stops.length - 6}곳`, 136, 1244); }
  ctx.fillStyle = '#ff7fa8'; ctx.font = `700 34px ${FONT}`; ctx.fillText('#모란한조각 #모란골목 #도담길 #데이트코스', 62, 1300);
  return cv;
}

// 공유: 기기 공유 시트(인스타·카톡 등) → 안 되면 이미지 저장 + 문구 복사
export async function shareCanvas(cv, name, text) {
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
  const file = new File([blob], name + '.jpg', { type: 'image/jpeg' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '모란 한 조각', text }); return 'shared'; }
  } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.jpg'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(text); } catch {}
  return 'saved';
}
export async function shareText(text) {
  try { if (navigator.share) { await navigator.share({ title: '모란 한 조각', text, url: location.href }); return 'shared'; } }
  catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  try { await navigator.clipboard.writeText(text + '\n' + location.href); return 'copied'; } catch { return 'fail'; }
}
