// Rooms for Штурм особняка: players meet here by a 6-letter code, exchange WebRTC offers,
// and if a direct connection cannot be made, game messages are relayed through this room.
// One Durable Object per room, WebSocket hibernation, nothing is stored.
//
//   GET /room/CODE?peer=ID&name=NAME   (WebSocket upgrade)
//   messages: {to?: peerId, ...} — to one peer, or to everyone else when "to" is missing
import { DurableObject } from 'cloudflare:workers';

const cors = { 'access-control-allow-origin': '*' };
// a phone that switched apps or networks gets this long to come back before the others hear "left"
const GRACE = 15000;
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
    // ten players at most (five a side)
    if (socks.filter((s) => s.deserializeAttachment()?.peer !== peer && !s.deserializeAttachment()?.replaced).length >= 10) return new Response('full', { status: 409 });
    // a reconnect with the same id replaces the old socket, keeps its place in the queue (who is host)
    // and must not announce a "leave" when the old socket finally closes
    let joined = Date.now();
    // back within the grace period: the same place in the queue (the host stays the host)
    const gone = await this.ctx.storage.get('gone:' + peer);
    if (gone) {
      joined = Math.min(joined, gone.joined);
      await this.ctx.storage.delete('gone:' + peer);
    }
    for (const s of this.ctx.getWebSockets(peer)) {
      const old = s.deserializeAttachment();
      if (old?.joined) joined = Math.min(joined, old.joined);
      try {
        s.serializeAttachment({ ...old, replaced: true });
        s.close(4000, 'replaced');
      } catch {}
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [peer]);
    const me = { peer, name, joined };
    server.serializeAttachment(me);
    const peers = (await this.list()).filter((p) => p.peer !== peer);
    server.send(JSON.stringify({ t: 'hello', you: me, peers, back: !!gone }));
    this.send({ t: 'join', peer, name, joined: me.joined, back: !!gone }, peer);
    return new Response(null, { status: 101, webSocket: client });
  }

  // everyone here, and those who dropped out a moment ago and may come back
  async list() {
    const live = this.ctx
      .getWebSockets()
      .map((s) => s.deserializeAttachment())
      .filter((a) => a && !a.replaced);
    const away = [...(await this.ctx.storage.list({ prefix: 'gone:' })).values()].filter((g) => !live.some((a) => a.peer === g.peer));
    return [...live, ...away.map(({ peer, name, joined }) => ({ peer, name, joined }))].sort((a, b) => a.joined - b.joined);
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
    // players only send offers/candidates and game messages; join/leave/hello come from the room alone
    if (m.t !== 'sig' && m.t !== 'g') return;
    m.from = from;
    const to = m.to;
    delete m.to;
    if (to) this.send(m, null, String(to));
    else this.send(m, from);
  }

  async webSocketClose(ws, code) {
    // finish the closing handshake, or the player's browser waits a long time to notice and reconnect
    try {
      ws.close(code >= 3000 && code < 5000 ? code : 1000, 'bye');
    } catch {}
    const me = ws.deserializeAttachment();
    if (!me || me.replaced) return;
    try {
      ws.serializeAttachment({ ...me, replaced: true });
    } catch {}
    // still here on another socket (a reconnect raced the close): not a leave
    if (this.ctx.getWebSockets(me.peer).some((s) => s !== ws && !s.deserializeAttachment()?.replaced)) return;
    // the leave is announced only if they do not come back in time
    await this.ctx.storage.put('gone:' + me.peer, { peer: me.peer, name: me.name, joined: me.joined, at: Date.now() });
    const when = Date.now() + GRACE;
    const cur = await this.ctx.storage.getAlarm();
    if (!cur || cur > when) await this.ctx.storage.setAlarm(when);
  }

  async alarm() {
    const now = Date.now();
    let next = 0;
    for (const [key, g] of await this.ctx.storage.list({ prefix: 'gone:' })) {
      if (now - g.at < GRACE - 100) {
        next = next ? Math.min(next, g.at + GRACE) : g.at + GRACE;
        continue;
      }
      await this.ctx.storage.delete(key);
      if (!this.ctx.getWebSockets(g.peer).some((s) => !s.deserializeAttachment()?.replaced)) this.send({ t: 'leave', peer: g.peer }, g.peer);
    }
    if (next) await this.ctx.storage.setAlarm(next);
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }
}
