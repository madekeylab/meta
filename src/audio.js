/* 타건음.
   제품에 실제 녹음(product.sound)이 있으면 그 파일을 쓰고, 없으면 스위치 종류에 맞춘 합성음을 낸다.

   녹음 파일 규칙: 키 한 번 누르는 소리를 SLICE초 길이 조각으로 잘라 한 파일에 이어 붙인다.
   마지막 조각은 스페이스바·엔터 같은 큰 키 소리로 쓴다. 조각이 하나뿐이면 모든 키가 그 소리를 낸다 */

const SLICE = 0.2;

// 합성음 성격: f=잡음 중심 주파수, q=날카로움, d=길이, v=크기, b=바닥 치는 낮은 음, click=딸깍 소리
const PRESET = {
  linear: { f: 1900, q: 1.1, d: 0.07, v: 0.5, b: 150, click: 0 },
  tactile: { f: 1400, q: 1.6, d: 0.085, v: 0.55, b: 120, click: 0 },
  clicky: { f: 3200, q: 2.2, d: 0.06, v: 0.5, b: 170, click: 0.22 },
  silent: { f: 700, q: 0.8, d: 0.06, v: 0.22, b: 95, click: 0 },
};
const BIG = new Set(['Space', 'Enter', 'Backspace', 'ShiftLeft', 'ShiftRight']);

export function createAudio() {
  let ac = null;
  let master = null;
  let noise = null;
  let muted = false;
  const samples = new Map(); // product.id → AudioBuffer | 'loading' | 'none'

  function ensure() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ac.destination);
      noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function load(product) {
    if (!product.sound || samples.has(product.id)) return;
    samples.set(product.id, 'loading');
    fetch(product.sound)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((ab) => ac.decodeAudioData(ab))
      .then((buf) => samples.set(product.id, buf))
      .catch(() => samples.set(product.id, 'none'));
  }

  function playSample(buf, big, vol) {
    const n = Math.max(1, Math.round(buf.duration / SLICE));
    const i = n === 1 ? 0 : big ? n - 1 : Math.floor(Math.random() * (n - 1));
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    src.playbackRate.value = 0.97 + Math.random() * 0.06;
    g.gain.value = vol;
    src.connect(g).connect(master);
    src.start(0, i * SLICE, Math.min(SLICE, buf.duration));
  }

  function playSynth(sw, big, vol) {
    const p = PRESET[sw] || PRESET.linear;
    const t = ac.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;

    const src = ac.createBufferSource();
    const bp = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = noise;
    bp.type = 'bandpass';
    bp.frequency.value = p.f * (big ? 0.6 : 1) * jitter;
    bp.Q.value = p.q;
    g.gain.setValueAtTime(p.v * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p.d);
    src.connect(bp).connect(g).connect(master);
    src.start(t, Math.random() * 0.1);
    src.stop(t + p.d + 0.02);

    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.setValueAtTime(p.b * (big ? 0.7 : 1) * jitter, t);
    o.frequency.exponentialRampToValueAtTime(p.b * 0.5, t + 0.07);
    og.gain.setValueAtTime(p.v * 0.7 * vol, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 0.1);

    if (p.click) {
      const c = ac.createOscillator();
      const cg = ac.createGain();
      c.type = 'square';
      c.frequency.value = 4200 * jitter;
      cg.gain.setValueAtTime(p.click * vol, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
      c.connect(cg).connect(master);
      c.start(t);
      c.stop(t + 0.02);
    }
  }

  return {
    /* 브라우저는 사용자가 한 번 누른 뒤에만 소리를 허용하므로 입장 버튼에서 부른다 */
    unlock: ensure,
    key(product, code, vol = 1) {
      if (muted) return;
      ensure();
      load(product);
      const buf = samples.get(product.id);
      const big = BIG.has(code);
      if (buf && typeof buf === 'object') playSample(buf, big, vol);
      else playSynth(product.sw, big, vol);
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 1;
    },
    get muted() {
      return muted;
    },
  };
}
