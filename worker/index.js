import { DurableObject } from 'cloudflare:workers';

/* 메이드키 타건샵 실시간 서버
   - 방(서버) 하나 = Durable Object 하나, 방마다 정원 CAP명
   - 각 접속자는 자기 상태(위치·닉네임·앉은 자리)의 바뀐 부분만 보내고, 서버는 같은 방 사람들에게 그대로 전달한다 */

const ROOMS = 5;
const CAP = 100;
const MAX_MSG = 2048;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      let want = parseInt(url.searchParams.get('room') || '1', 10);
      if (!(want >= 1 && want <= ROOMS)) want = 1;
      // 고른 방이 가득 차 있으면 다음 방으로 넘긴다
      for (let i = 0; i < ROOMS; i++) {
        const n = ((want - 1 + i) % ROOMS) + 1;
        const res = await roomStub(env, n).fetch(
          new Request('https://room/ws?room=' + n, { headers: req.headers }),
        );
        if (res.status === 101) return res;
      }
      return new Response('all rooms full', { status: 503 });
    }

    if (url.pathname === '/api/rooms') {
      const rooms = await Promise.all(
        Array.from({ length: ROOMS }, async (_, i) => {
          const res = await roomStub(env, i + 1).fetch('https://room/count');
          const { n } = await res.json();
          return { room: String(i + 1), n, cap: CAP };
        }),
      );
      return Response.json({ rooms }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return env.ASSETS.fetch(req);
  },
};

function roomStub(env, n) {
  return env.ROOM.get(env.ROOM.idFromName('room-' + n));
}

const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);

/* 클라이언트가 보낸 상태에서 허용된 항목만 남긴다. null은 '지움'을 뜻한다 */
function cleanPatch(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {};
  const set = (k, v) => {
    if (p[k] === null) out[k] = null;
    else if (v !== undefined) out[k] = v;
  };
  if ('x' in p) set('x', num(p.x, -200, 200));
  if ('z' in p) set('z', num(p.z, -200, 200));
  if ('f' in p) set('f', num(p.f, -10, 10));
  if ('nm' in p) set('nm', typeof p.nm === 'string' ? p.nm.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || undefined : undefined);
  if ('c' in p) set('c', Number.isInteger(p.c) && p.c >= 0 && p.c < 16 ? p.c : undefined);
  if ('s' in p) set('s', Number.isInteger(p.s) && p.s >= 0 && p.s < 64 ? p.s : undefined);
  return Object.keys(out).length ? out : null;
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // 연결 유지용 ping은 Durable Object를 깨우지 않고 바로 응답한다
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req) {
    const url = new URL(req.url);
    const socks = this.ctx.getWebSockets();
    if (url.pathname === '/count') return Response.json({ n: socks.length });
    if (socks.length >= CAP) return new Response('full', { status: 503 });

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    const peers = socks
      .map((s) => s.deserializeAttachment())
      .filter(Boolean)
      .map((a) => ({ id: a.id, p: a.p }));

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, p: {} });
    server.send(JSON.stringify({ t: 'hello', id, room: url.searchParams.get('room') || '1', cap: CAP, peers }));
    this.broadcast({ t: 'join', id, p: {} }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const att = ws.deserializeAttachment();
    if (!att || !m) return;

    if (m.t === 'p') {
      const patch = cleanPatch(m.p);
      if (!patch) return;
      for (const k in patch) {
        if (patch[k] === null) delete att.p[k];
        else att.p[k] = patch[k];
      }
      ws.serializeAttachment(att);
      this.broadcast({ t: 'p', id: att.id, p: patch }, ws);
    } else if (m.t === 'k') {
      // 키 한 번 누름: 저장하지 않고 바로 전달만 한다
      if (typeof m.c === 'string' && /^[A-Za-z0-9]{1,16}$/.test(m.c)) {
        this.broadcast({ t: 'k', id: att.id, c: m.c }, ws);
      }
    } else if (m.t === 'e') {
      // 점프·인사 같은 한 번짜리 동작
      if (m.k === 'jump' || m.k === 'hi') this.broadcast({ t: 'e', id: att.id, k: m.k }, ws);
    } else if (m.t === 'bye') {
      this.drop(ws);
    }
  }

  webSocketClose(ws) {
    this.drop(ws);
  }

  webSocketError(ws) {
    this.drop(ws);
  }

  drop(ws) {
    const att = ws.deserializeAttachment();
    if (!att || att.gone) return;
    att.gone = true;
    try {
      ws.serializeAttachment(att);
    } catch {}
    try {
      ws.close(1000, 'bye');
    } catch {}
    this.broadcast({ t: 'leave', id: att.id }, ws);
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(s);
      } catch {}
    }
  }
}
