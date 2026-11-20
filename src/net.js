/* 실시간 연결. 내 상태의 바뀐 부분만 모아 보내고, 같은 방 사람들의 상태를 받아 둔다.
   끊기면 몇 초 뒤 같은 방으로 다시 붙는다 */

const SEND_EVERY = 100; // ms

export function createNet({ room, onPeers, onKey, onEvent, onStatus }) {
  let ws = null;
  let tries = 0;
  let retryT = null;
  let pingT = null;
  let sendT = null;
  let lastSend = 0;
  let pending = null;
  let closed = false;
  let want = room;
  const me = { id: null, p: {} };
  const peers = new Map(); // id → 상태

  const emit = () => onPeers && onPeers(peers);
  const status = (s) => onStatus && onStatus(s);

  function flush(full) {
    if (!ws || ws.readyState !== 1) return;
    const p = full ? me.p : pending;
    pending = null;
    if (!p || !Object.keys(p).length) return;
    ws.send(JSON.stringify({ t: 'p', p }));
    lastSend = performance.now();
  }

  function retry() {
    if (closed) return;
    tries++;
    clearTimeout(retryT);
    retryT = setTimeout(connect, Math.min(8000, 1500 * tries));
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    const url = proto + location.host + '/ws' + (want ? '?room=' + encodeURIComponent(want) : '');
    let sock;
    try {
      sock = new WebSocket(url);
    } catch {
      retry();
      return;
    }
    ws = sock;

    sock.onmessage = (ev) => {
      if (sock !== ws || ev.data === 'pong') return;
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.t === 'hello') {
        tries = 0;
        me.id = m.id;
        peers.clear();
        for (const p of m.peers || []) peers.set(p.id, p.p || {});
        const moved = want && String(want) !== String(m.room);
        want = String(m.room);
        status({ online: true, room: want, cap: m.cap, moved });
        flush(true);
        emit();
      } else if (m.t === 'join') {
        peers.set(m.id, m.p || {});
        emit();
      } else if (m.t === 'leave') {
        peers.delete(m.id);
        emit();
      } else if (m.t === 'p' && m.p) {
        const cur = peers.get(m.id) || {};
        for (const k in m.p) {
          if (m.p[k] === null) delete cur[k];
          else cur[k] = m.p[k];
        }
        peers.set(m.id, cur);
        emit();
      } else if (m.t === 'k') {
        if (onKey) onKey(m.id, m.c);
      } else if (m.t === 'e') {
        if (onEvent) onEvent(m.id, m.k);
      }
    };

    sock.onclose = () => {
      if (sock !== ws) return;
      ws = null;
      clearInterval(pingT);
      peers.clear();
      emit();
      status({ online: false, room: want });
      retry();
    };

    clearInterval(pingT);
    pingT = setInterval(() => {
      if (sock.readyState === 1) sock.send('ping');
    }, 30000);
  }

  connect();

  return {
    peers,
    get room() {
      return want;
    },
    /* 내 상태 일부를 바꾼다. 값이 null이면 그 항목을 지운다 */
    presence(patch) {
      let changed = false;
      for (const k in patch) {
        let diff = false;
        if (patch[k] === null) {
          if (k in me.p) {
            delete me.p[k];
            diff = true;
          }
        } else if (me.p[k] !== patch[k]) {
          me.p[k] = patch[k];
          diff = true;
        }
        if (diff) {
          (pending ||= {})[k] = patch[k];
          changed = true;
        }
      }
      if (!changed || sendT) return;
      const wait = SEND_EVERY - (performance.now() - lastSend);
      if (wait <= 0) flush();
      else
        sendT = setTimeout(() => {
          sendT = null;
          flush();
        }, wait);
    },
    key(code) {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'k', c: code }));
    },
    event(kind) {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'e', k: kind }));
    },
    switchRoom(n) {
      want = String(n);
      if (ws) ws.close(); // onclose가 새 방으로 다시 연결한다
      tries = 0;
    },
    close() {
      closed = true;
      clearTimeout(retryT);
      clearInterval(pingT);
      if (ws) {
        try {
          ws.send(JSON.stringify({ t: 'bye' }));
          ws.close(1000, 'bye');
        } catch {}
      }
    },
  };
}
