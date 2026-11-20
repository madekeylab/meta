import { CATALOG, BRANDS } from './catalog.js';

/* 녹음실: 키보드를 골라 마이크로 타건 소리를 녹음한다.
   녹음에서 키를 누른 순간을 찾아 0.2초 조각으로 자르고, 매장 타건음 형식(조각을 이어 붙인 WAV)으로 만든다.
   - '이 키보드에 적용' : 이 기기(브라우저)에 저장되어 매장에서 바로 그 소리가 난다
   - 'WAV 내려받기'    : public/assets/snd/ 에 넣고 catalog.js의 sound에 경로를 적으면 모든 손님에게 적용된다 */

const SLICE = 0.2; // audio.js와 같은 값
const MAX_SEC = 30;
const MAX_SLICES = 24;

/* ---- 저장소 (IndexedDB) ---- */
function db() {
  return new Promise((res) => {
    try {
      const rq = indexedDB.open('mk-sounds', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('s');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
async function dbDo(mode, fn) {
  const d = await db();
  if (!d) return null;
  return new Promise((res) => {
    const tx = d.transaction('s', mode);
    const rq = fn(tx.objectStore('s'));
    tx.oncomplete = () => res(rq ? rq.result : null);
    tx.onerror = () => res(null);
  });
}

/* 전에 저장해 둔 녹음을 불러와 매장 소리에 입힌다 (첫 소리 재생 전에 한 번 부른다) */
export async function loadSavedSounds(audio) {
  const keys = (await dbDo('readonly', (s) => s.getAllKeys())) || [];
  for (const id of keys) {
    const wav = await dbDo('readonly', (s) => s.get(id));
    if (!wav) continue;
    try {
      audio.setSample(id, await audio.context().decodeAudioData(wav.slice(0)));
    } catch {}
  }
  return keys;
}

/* ---- 소리 다루기 ---- */
/* 키를 누른 순간들을 찾아 같은 길이의 조각으로 자른다 */
function slicesOf(data, sr) {
  const win = Math.max(1, Math.floor(sr * 0.004));
  const env = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let s = 0;
    for (let j = 0; j < win; j++) s += data[i + j] * data[i + j];
    env.push(Math.sqrt(s / win));
  }
  const peak = Math.max(0, ...env);
  if (peak < 0.01) return { slices: [], onsets: [] };
  const noise = [...env].sort((a, b) => a - b)[Math.floor(env.length / 2)];
  const thr = Math.max(peak * 0.18, noise * 5);
  const gap = Math.ceil(0.13 / 0.004);
  const len = Math.round(SLICE * sr);
  const onsets = [];
  let last = -gap;
  let armed = true; // 소리가 한 번 잦아든 뒤에야 다음 타건으로 친다
  for (let i = 0; i < env.length; i++) {
    if (env[i] < thr * 0.5) armed = true;
    else if (env[i] > thr && armed && i - last >= gap) {
      onsets.push(Math.max(0, i * win - Math.floor(sr * 0.006)));
      last = i;
      armed = false;
    }
  }
  const fadeIn = Math.floor(sr * 0.002);
  const fadeOut = Math.floor(sr * 0.04);
  const slices = onsets.map((o) => {
    const out = new Float32Array(len);
    out.set(data.subarray(o, Math.min(data.length, o + len)));
    for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
    for (let i = 0; i < fadeOut; i++) out[len - 1 - i] *= i / fadeOut;
    return out;
  });
  return { slices, onsets };
}
const peakOf = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

function wavOf(samples, sr) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return buf;
}

export function createRecorder({ $, audio, toast }) {
  let productId = null;
  let brandId = null;
  let kind = 'key'; // key = 일반 키, space = 스페이스바
  const takes = { key: null, space: null }; // { slices, raw, onsets, sr }
  let rec = null; // 녹음 중 상태
  let saved = new Set();

  const product = () => CATALOG.find((p) => p.id === productId);
  const fmt = (s) => '00:' + String(Math.floor(s)).padStart(2, '0');

  /* ---- 키보드 고르기 ---- */
  function renderPick() {
    const tabs = $('rcBrands');
    tabs.textContent = '';
    [...BRANDS.map((b) => [b.id, b.name]), ['custom', '커스텀']].forEach(([id, name]) => {
      const b = document.createElement('button');
      b.className = 'seg';
      b.textContent = name;
      b.setAttribute('aria-pressed', id === brandId);
      b.onclick = () => {
        brandId = id;
        productId = list()[0]?.id || null;
        resetTakes();
        renderPick();
      };
      tabs.appendChild(b);
    });
    const box = $('rcProducts');
    box.textContent = '';
    list().forEach((p) => {
      const b = document.createElement('button');
      b.className = 'item';
      b.setAttribute('aria-pressed', p.id === productId);
      const n = document.createElement('span');
      n.textContent = p.name;
      const st = document.createElement('small');
      st.textContent = saved.has(p.id) ? '녹음 적용됨' : p.sound ? '기본 녹음' : '합성음';
      if (saved.has(p.id)) st.className = 'on';
      b.append(n, st);
      b.onclick = () => {
        productId = p.id;
        resetTakes();
        renderPick();
      };
      box.appendChild(b);
    });
    $('rcTarget').textContent = product() ? product().name : '키보드를 골라 주세요';
    $('rcClear').hidden = !saved.has(productId);
    render();
  }
  const list = () => CATALOG.filter((p) => (brandId === 'custom' ? p.kind === 'custom' : p.brand === brandId));

  function resetTakes() {
    takes.key = takes.space = null;
  }

  /* ---- 화면 갱신 ---- */
  function render() {
    const recording = !!rec;
    const t = takes[kind];
    $('rcStart').hidden = recording;
    $('rcStop').hidden = !recording;
    $('rcStart').disabled = !productId;
    $('rcStart').textContent = t ? '● 다시 녹음' : '● 녹음 시작';
    document.querySelectorAll('#rcKinds .seg').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.kind === kind);
      b.disabled = recording;
      const n = takes[b.dataset.kind];
      b.querySelector('small').textContent = n ? n.slices.length + '개' : '없음';
    });
    $('rcHint').textContent = recording
      ? kind === 'key'
        ? '글자 키를 하나씩 또박또박 10번 넘게 눌러 주세요'
        : '스페이스바를 천천히 3~5번 눌러 주세요'
      : t
        ? t.slices.length
          ? `타건 ${t.slices.length}개를 찾았어요. 파형의 세로선이 찾은 위치예요`
          : '타건 소리를 찾지 못했어요. 마이크를 키보드 가까이 두고 다시 녹음해 주세요'
        : '조용한 곳에서 마이크를 키보드 10~20cm 앞에 두면 좋아요';
    const ready = !!(takes.key?.slices.length || takes.space?.slices.length);
    $('rcPlay').disabled = !ready || recording;
    $('rcApply').disabled = !ready || recording;
    $('rcSave').disabled = !ready || recording;
    if (!recording) {
      $('rcTime').textContent = fmt(0) + ' / ' + fmt(MAX_SEC);
      $('rcLevel').style.width = '0%';
      $('rcDot').classList.remove('live');
      drawWave(t);
    }
  }

  function drawWave(t) {
    const cv = $('rcWave');
    const g = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#efe5d0';
    g.fillRect(0, h / 2 - 1, w, 2);
    if (!t) return;
    const step = Math.max(1, Math.floor(t.raw.length / w));
    const gain = 0.9 / Math.max(0.05, peakOf(t.raw));
    g.fillStyle = '#8fa98b';
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let i = x * step; i < Math.min(t.raw.length, (x + 1) * step); i += 8) m = Math.max(m, Math.abs(t.raw[i]));
      const y = Math.max(1, m * gain * h * 0.5);
      g.fillRect(x, h / 2 - y, 1, y * 2);
    }
    g.fillStyle = '#d99a8c';
    t.onsets.forEach((o) => g.fillRect((o / t.raw.length) * w, 0, 2, h));
  }

  /* ---- 녹음 ---- */
  async function start() {
    if (rec || !productId) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('이 브라우저에서는 마이크 녹음을 쓸 수 없어요');
      return;
    }
    let stream;
    try {
      // 타건음이 뭉개지지 않도록 통화용 보정(울림 제거·잡음 억제·자동 음량)을 끈다
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      toast(e && e.name === 'NotAllowedError' ? '마이크 사용을 허용해 주세요 (주소창의 마이크 아이콘)' : '마이크를 찾지 못했어요');
      return;
    }
    const ac = audio.context();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => finish(chunks, mr.mimeType);
    const meter = new Float32Array(an.fftSize);
    rec = { stream, src, mr, t0: performance.now(), raf: 0 };
    const tick = () => {
      if (!rec) return;
      const sec = (performance.now() - rec.t0) / 1000;
      an.getFloatTimeDomainData(meter);
      $('rcLevel').style.width = Math.min(100, peakOf(meter) * 140) + '%';
      $('rcTime').textContent = fmt(sec) + ' / ' + fmt(MAX_SEC);
      if (sec >= MAX_SEC) stop();
      else rec.raf = requestAnimationFrame(tick);
    };
    mr.start();
    $('rcDot').classList.add('live');
    render();
    tick();
  }

  function stop() {
    if (!rec) return;
    cancelAnimationFrame(rec.raf);
    try {
      rec.mr.stop();
    } catch {}
    rec.stream.getTracks().forEach((t) => t.stop());
    rec.src.disconnect();
    rec = null;
    $('rcHint').textContent = '녹음을 정리하는 중…';
    $('rcStop').hidden = true;
  }

  async function finish(chunks, type) {
    try {
      const ab = await new Blob(chunks, { type }).arrayBuffer();
      const buf = await audio.context().decodeAudioData(ab);
      const raw = buf.getChannelData(0).slice();
      takes[kind] = { raw, sr: buf.sampleRate, ...slicesOf(raw, buf.sampleRate) };
    } catch {
      toast('녹음을 읽지 못했어요. 다시 시도해 주세요');
    }
    render();
  }

  /* 일반 키 조각들 + 맨 끝에 스페이스바 조각 하나 (audio.js의 형식) */
  function compose() {
    const sr = (takes.key || takes.space).sr;
    const keys = (takes.key?.slices || []).slice(0, MAX_SLICES);
    const spaces = takes.space?.slices || [];
    const space = spaces.length ? spaces.reduce((a, b) => (peakOf(b) > peakOf(a) ? b : a)) : null;
    const all = space ? [...keys, space] : keys;
    const len = Math.round(SLICE * sr);
    const out = new Float32Array(all.length * len);
    all.forEach((s, i) => out.set(s.subarray(0, len), i * len));
    const gain = 0.9 / Math.max(0.05, peakOf(out)); // 전체 음량 맞추기
    for (let i = 0; i < out.length; i++) out[i] *= gain;
    return { out, sr, n: all.length, hasSpace: !!space };
  }
  function bufferOf(c) {
    const b = audio.context().createBuffer(1, c.out.length, c.sr);
    b.copyToChannel(c.out, 0);
    return b;
  }

  function play() {
    const c = compose();
    const ac = audio.context();
    const src = ac.createBufferSource();
    src.buffer = bufferOf(c);
    src.connect(ac.destination);
    src.start();
  }

  async function apply() {
    const c = compose();
    audio.setSample(productId, bufferOf(c));
    await dbDo('readwrite', (s) => s.put(wavOf(c.out, c.sr), productId));
    saved.add(productId);
    toast(`${product().name}에 녹음을 적용했어요 (타건 ${c.n}개${c.hasSpace ? ', 스페이스바 포함' : ''})`);
    renderPick();
  }

  function download() {
    const c = compose();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([wavOf(c.out, c.sr)], { type: 'audio/wav' }));
    a.download = productId + '.wav';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 3000);
    toast(a.download + ' 파일을 내려받았어요');
  }

  async function clear() {
    audio.setSample(productId, null);
    await dbDo('readwrite', (s) => s.delete(productId));
    saved.delete(productId);
    toast('녹음을 지우고 원래 소리로 되돌렸어요');
    renderPick();
  }

  $('rcStart').onclick = start;
  $('rcStop').onclick = stop;
  $('rcPlay').onclick = play;
  $('rcApply').onclick = apply;
  $('rcSave').onclick = download;
  $('rcClear').onclick = clear;
  document.querySelectorAll('#rcKinds .seg').forEach((b) => {
    b.onclick = () => {
      kind = b.dataset.kind;
      render();
    };
  });

  return {
    setSaved(ids) {
      saved = new Set(ids);
    },
    open() {
      if (!brandId) {
        brandId = BRANDS[0].id;
        productId = list()[0]?.id || null;
      }
      renderPick();
    },
    close() {
      stop();
    },
    get recording() {
      return !!rec;
    },
  };
}
