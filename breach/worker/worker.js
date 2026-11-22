// Rooms for Штурм особняка: players meet here by a 6-letter code, exchange WebRTC offers,
// and if a direct connection cannot be made, game messages are relayed through this room.
// One Durable Object per room, WebSocket hibernation, nothing is stored.
//
//   GET /room/CODE?peer=ID&name=NAME   (WebSocket upgrade)
//   messages: {to?: peerId, ...} — to one peer, or to everyone else when "to" is missing
import { DurableObject } from 'cloudflare:workers';

const cors = { 'access-control-allow-origin': '*' };
const clean = (v, n) => String(v ?? '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, n);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{4,8})$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426, headers: cors });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    return new Response('breach rooms', { headers: cors });
  },
};

export class Room extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    const peer = clean(url.searchParams.get('peer'), 16).replace(/\s/g, '');
    const name = clean(url.searchParams.get('name'), 18) || 'Игрок';
    if (!peer) return new Response('no peer', { status: 400 });
    const socks = this.ctx.getWebSockets();
    // a reconnect with the same id replaces the old socket
    for (const s of this.ctx.getWebSockets(peer)) {
      try {
        s.close(4000, 'replaced');
      } catch {}
    }
    if (socks.filter((s) => s.deserializeAttachment()?.peer !== peer).length >= 12) return new Response('full', { status: 409 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [peer]);
    const me = { peer, name, joined: Date.now() };
    server.serializeAttachment(me);
    const peers = this.list().filter((p) => p.peer !== peer);
    server.send(JSON.stringify({ t: 'hello', you: me, peers }));
    this.send({ t: 'join', peer, name, joined: me.joined }, peer);
    return new Response(null, { status: 101, webSocket: client });
  }

  list() {
    return this.ctx
      .getWebSockets()
      .map((s) => s.deserializeAttachment())
      .filter(Boolean)
      .sort((a, b) => a.joined - b.joined);
  }

  send(msg, except, to) {
    const text = JSON.stringify(msg);
    const targets = to ? this.ctx.getWebSockets(to) : this.ctx.getWebSockets();
    for (const s of targets) {
      if (except && s.deserializeAttachment()?.peer === except) continue;
      try {
        s.send(text);
      } catch {}
    }
  }

  webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > 60000) return;
    let m;
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    const from = ws.deserializeAttachment()?.peer;
    if (!from) return;
    m.from = from;
    const to = m.to;
    delete m.to;
    if (to) this.send(m, null, String(to));
    else this.send(m, from);
  }

  webSocketClose(ws) {
    const me = ws.deserializeAttachment();
    if (me) this.send({ t: 'leave', peer: me.peer }, me.peer);
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }
}
