/* 이벤트 존 키캡 뽑기: 재미있는 문구가 적힌 키캡을 무작위로 뽑아 모은다.
   모은 키캡은 이 기기(브라우저)에 저장된다 */

// r: 0=일반, 1=레어, 2=전설
export const CAPS = [
  { t: '칼퇴 기원', r: 0 }, { t: '오히려 좋아', r: 0 }, { t: '가보자고', r: 0 }, { t: '점메추 좀', r: 0 }, { t: '저메추 받음', r: 0 },
  { t: '커피 수혈', r: 0 }, { t: '월급 루팡', r: 0 }, { t: '야근 요정', r: 0 }, { t: '내일의 나에게', r: 0 }, { t: '일단 저장', r: 0 },
  { t: '쉿 집중 중', r: 0 }, { t: '무지성 타건', r: 0 }, { t: '오운완', r: 0 }, { t: '내돈내산', r: 0 }, { t: '킹받네', r: 0 },
  { t: '할많하않', r: 0 }, { t: '퇴사 각', r: 0 }, { t: '억텐 금지', r: 0 },
  { t: '갓생 사는 중', r: 1 }, { t: '도파민 충전', r: 1 }, { t: '폼 미쳤다', r: 1 }, { t: '알잘딱깔센', r: 1 }, { t: '이왜진', r: 1 },
  { t: '스불재', r: 1 }, { t: '느좋', r: 1 }, { t: '어쩔키보드', r: 1 },
  { t: '중꺾마', r: 2 }, { t: '완전 럭키비키', r: 2 }, { t: '도각도각 장인', r: 2 }, { t: '키룡이 최애', r: 2 },
];
export const RARITY = [
  { name: '일반', cap: '#f6efe0', side: '#d9cfb8', ink: '#4a6650', weight: 70 },
  { name: '레어', cap: '#c9bbe3', side: '#a493cf', ink: '#4b3d7a', weight: 25 },
  { name: '전설', cap: '#f3cf6b', side: '#d3a93c', ink: '#6b4a12', weight: 5 },
];

/* 키캡 그림: 위에서 비스듬히 본 키캡에 문구를 적는다 */
export function drawCap(cv, cap) {
  const g = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  g.clearRect(0, 0, w, h);
  if (!cap) {
    g.fillStyle = '#e6dcc6';
    g.beginPath();
    g.roundRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84, w * 0.16);
    g.fill();
    g.fillStyle = '#bfb193';
    g.font = `900 ${h * 0.4}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', w / 2, h * 0.52);
    return;
  }
  const R = RARITY[cap.r];
  g.fillStyle = R.side;
  g.beginPath();
  g.roundRect(w * 0.04, h * 0.1, w * 0.92, h * 0.86, w * 0.16);
  g.fill();
  g.fillStyle = R.cap;
  g.beginPath();
  g.roundRect(w * 0.12, h * 0.06, w * 0.76, h * 0.72, w * 0.13);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.beginPath();
  g.roundRect(w * 0.17, h * 0.1, w * 0.66, h * 0.1, w * 0.05);
  g.fill();
  g.fillStyle = R.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // 문구가 길면 두 줄로 나눈다
  const words = cap.t.split(' ');
  const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [cap.t];
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(h * 0.24, (w * 0.64) / Math.max(2, longest) * 1.05);
  g.font = `900 ${size}px system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  lines.forEach((l, i) => g.fillText(l, w / 2, h * 0.45 + (i - (lines.length - 1) / 2) * size * 1.15));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem('mk-caps') || '{}') || {};
  } catch {
    return {};
  }
}

export function createGacha({ $, audio, onSpin, onResult }) {
  const owned = load(); // 문구 번호 → 뽑은 횟수
  let busy = false;

  function pick() {
    const total = RARITY.reduce((s, r) => s + r.weight, 0);
    let x = Math.random() * total;
    let r = 0;
    for (; r < RARITY.length - 1; r++) if ((x -= RARITY[r].weight) < 0) break;
    const pool = CAPS.map((c, i) => i).filter((i) => CAPS[i].r === r);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderGrid() {
    const grid = $('gaGrid');
    grid.textContent = '';
    CAPS.forEach((c, i) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 96;
      drawCap(cv, owned[i] ? c : null);
      cv.title = owned[i] ? `${c.t} · ${RARITY[c.r].name} · ${owned[i]}개` : '아직 못 뽑은 키캡';
      grid.appendChild(cv);
    });
    $('gaCount').textContent = Object.keys(owned).length + ' / ' + CAPS.length;
  }

  function spin() {
    if (busy) return;
    busy = true;
    $('gaSpin').disabled = true;
    $('gaMsg').textContent = '돌리는 중… 달그락달그락';
    $('gaCap').classList.add('shake');
    drawCap($('gaCap'), null);
    audio.chime([330, 392, 330, 392]);
    onSpin();
    setTimeout(() => {
      const i = pick();
      const c = CAPS[i];
      const fresh = !owned[i];
      owned[i] = (owned[i] || 0) + 1;
      try {
        localStorage.setItem('mk-caps', JSON.stringify(owned));
      } catch {}
      $('gaCap').classList.remove('shake');
      drawCap($('gaCap'), c);
      $('gaMsg').textContent = `「${c.t}」 키캡을 뽑았어요!` + (fresh ? ' (새 키캡)' : ` (${owned[i]}개째)`);
      $('gaRare').textContent = RARITY[c.r].name;
      $('gaRare').dataset.r = c.r;
      $('gaRare').hidden = false;
      audio.chime(c.r === 2 ? [523, 659, 784, 1047, 1319] : c.r === 1 ? [523, 784, 1047] : [660, 880]);
      renderGrid();
      onResult(i);
      busy = false;
      $('gaSpin').disabled = false;
      $('gaSpin').textContent = '한 번 더 뽑기';
    }, 1100);
  }
  $('gaSpin').onclick = spin;

  return {
    open() {
      drawCap($('gaCap'), null);
      $('gaMsg').textContent = '손잡이를 돌리면 문구가 적힌 키캡이 나와요';
      $('gaRare').hidden = true;
      $('gaSpin').textContent = '뽑기 돌리기';
      renderGrid();
    },
    spin,
  };
}
