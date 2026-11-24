// Online play: a room on the Cloudflare Worker introduces players, the first one in is the host.
// The host opens a WebRTC data channel to every other player (star); if a direct connection
// cannot be made in time, messages go through the room's WebSocket instead.
export const ROOM_URL = 'wss://breach-rooms.protemir.workers.dev/room/';
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

export function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export function myPeerId() {
  let id = null;
  try {
    id = sessionStorage.getItem('breach.peer');
  } catch {}
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    try {
      sessionStorage.setItem('breach.peer', id);
    } catch {}
  }
  return id;
}

export class Net {
  constructor(code, name, h) {
    this.code = code;
    this.name = name;
    this.id = myPeerId();
    this.h = h; // { onPeers(list), onMessage(from, msg), onLeave(peer), onHostLeft(), onStatus(text) }
    // the network is back: try right away instead of waiting for the next retry
    this.onOnline = () => {
      if (this.closed || !this.ws || this.ws.readyState !== 3) return;
      clearTimeout(this.retryT);
      this.connect();
    };
    addEventListener('online', this.onOnline);
    this.peers = []; // [{peer, name, joined}]
    this.links = new Map(); // peer -> { pc, r, u, open, relay }
    this.hostId = null;
    this.closed = false;
    this.queue = [];
    this.connect();
  }

  get isHost() {
    return this.hostId === this.id;
  }

  connect() {
    const url = `${ROOM_URL}${this.code}?peer=${encodeURIComponent(this.id)}&name=${encodeURIComponent(this.name)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (e) => this.onWs(JSON.parse(e.data));
    ws.onopen = () => {
      // what we said while the socket was down goes out now
      for (const q of this.queue.splice(0)) ws.send(q);
    };
    ws.onclose = (e) => {
      if (this.closed) return;
      // replaced by this same player in another tab: stop fighting over the seat
      if (e.code === 4000) return;
      this.h.onStatus?.('lost');
      // try again after a short pause (a phone switching networks, a sleepy tab); a full room gives up
      this.fails = (this.fails || 0) + 1;
      if (this.fails === 41) this.h.onStatus?.('dead');
      clearTimeout(this.retryT);
      this.retryT = setTimeout(() => !this.closed && this.connect(), this.fails > 40 ? 10000 : 1500);
    };
    ws.onerror = () => {};
  }

  close() {
    this.closed = true;
    clearTimeout(this.retryT);
    removeEventListener('online', this.onOnline);
    try {
      this.ws?.close(4001, 'bye');
    } catch {}
    for (const l of this.links.values()) {
      try {
        l.pc?.close();
      } catch {}
    }
    this.links.clear();
  }

  wsSend(m) {
    const text = JSON.stringify(m);
    if (this.ws?.readyState === 1) this.ws.send(text);
    // keep reliable game messages for the reconnect (moves and snapshots go stale anyway)
    else if (m.t === 'g' && m.r && this.queue.length < 300) this.queue.push(text);
  }

  onWs(m) {
    if (m.t === 'hello') {
      this.fails = 0;
      const again = this.hadHello;
      this.hadHello = true;
      const before = this.peers.map((p) => p.peer), hostBefore = this.hostId;
      this.peers = [m.you, ...m.peers].sort((a, b) => a.joined - b.joined);
      this.updateHost();
      // people who left while we were cut off: the server told only those who were connected
      const gone = again ? before.filter((id) => id !== this.id && !this.peers.some((p) => p.peer === id)) : [];
      for (const id of gone) {
        const l = this.links.get(id);
        if (l) {
          try {
            l.pc?.close();
          } catch {}
          this.links.delete(id);
        }
      }
      this.h.onStatus?.('ok');
      // the host links to everyone already waiting
      if (this.isHost) for (const p of this.peers) if (p.peer !== this.id) this.linkTo(p.peer);
      this.h.onPeers?.(this.peers);
      if (again && !this.isHost) {
        const old = this.links.get(this.hostId);
        if (old) {
          try {
            old.pc?.close();
          } catch {}
          this.links.delete(this.hostId);
        }
      }
      for (const id of gone) this.h.onLeave?.(id);
      if (again && hostBefore && gone.includes(hostBefore)) this.h.onHostLeft?.();
      if (again) this.h.onReconnected?.();
    } else if (m.t === 'join') {
      const known = this.peers.some((p) => p.peer === m.peer);
      // somebody we already have came back (a new tab or a reconnect): the old direct link is dead, make a new one
      if (known && this.isHost && m.peer !== this.id) {
        const old = this.links.get(m.peer);
        if (old) {
          try {
            old.pc?.close();
          } catch {}
          this.links.delete(m.peer);
        }
      }
      if (!known) this.peers.push({ peer: m.peer, name: m.name, joined: m.joined });
      this.peers.sort((a, b) => a.joined - b.joined);
      const wasHost = this.hostId;
      this.updateHost();
      if (this.isHost && m.peer !== this.id) this.linkTo(m.peer);
      if (wasHost && wasHost !== this.hostId) this.h.onHostLeft?.();
      this.h.onPeers?.(this.peers);
    } else if (m.t === 'leave') {
      const hostLeft = m.peer === this.hostId;
      this.peers = this.peers.filter((p) => p.peer !== m.peer);
      const l = this.links.get(m.peer);
      if (l) {
        try {
          l.pc?.close();
        } catch {}
        this.links.delete(m.peer);
      }
      this.updateHost();
      this.h.onLeave?.(m.peer);
      if (hostLeft) this.h.onHostLeft?.();
      this.h.onPeers?.(this.peers);
    } else if (m.t === 'sig') this.onSignal(m.from, m);
    // a player only takes game messages from the host (the host from everyone)
    else if (m.t === 'g' && (this.isHost || m.from === this.hostId)) this.h.onMessage?.(m.from, m.d);
  }

  updateHost() {
    this.hostId = this.peers.length ? this.peers[0].peer : this.id;
  }

  // ---------- WebRTC ----------
  newLink(peer) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const l = { pc, r: null, u: null, open: false, relay: false };
    this.links.set(peer, l);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.wsSend({ t: 'sig', to: peer, ice: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      // a dead direct link goes back to the relay at once instead of swallowing messages
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        l.open = false;
        l.relay = true;
      } else if (pc.connectionState === 'connected' && l.r?.readyState === 'open' && l.u?.readyState === 'open') l.open = true;
    };
    // no direct link in 7 s: fall back to the relay
    l.timer = setTimeout(() => {
      if (!l.open) l.relay = true;
    }, 7000);
    return l;
  }

  bindChannel(peer, l, ch) {
    ch.onopen = () => {
      if (l.r && l.r.readyState === 'open' && l.u && l.u.readyState === 'open') {
        l.open = true;
        l.relay = false;
        clearTimeout(l.timer);
      }
    };
    ch.onmessage = (e) => this.h.onMessage?.(peer, JSON.parse(e.data));
  }

  async linkTo(peer) {
    if (this.links.has(peer)) return;
    const l = this.newLink(peer);
    l.r = l.pc.createDataChannel('r', { ordered: true });
    l.u = l.pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 });
    this.bindChannel(peer, l, l.r);
    this.bindChannel(peer, l, l.u);
    const offer = await l.pc.createOffer();
    await l.pc.setLocalDescription(offer);
    this.wsSend({ t: 'sig', to: peer, sdp: l.pc.localDescription });
  }

  async onSignal(from, m) {
    let l = this.links.get(from);
    if (m.sdp) {
      if (m.sdp.type === 'offer') {
        if (l) {
          try {
            l.pc.close();
          } catch {}
        }
        l = this.newLink(from);
        l.pc.ondatachannel = (e) => {
          if (e.channel.label === 'r') l.r = e.channel;
          else l.u = e.channel;
          this.bindChannel(from, l, e.channel);
        };
        await l.pc.setRemoteDescription(m.sdp);
        const ans = await l.pc.createAnswer();
        await l.pc.setLocalDescription(ans);
        this.wsSend({ t: 'sig', to: from, sdp: l.pc.localDescription });
        for (const c of l.pending || []) await l.pc.addIceCandidate(c).catch(() => {});
        l.pending = null;
      } else if (l) {
        await l.pc.setRemoteDescription(m.sdp);
        for (const c of l.pending || []) await l.pc.addIceCandidate(c).catch(() => {});
        l.pending = null;
      }
    } else if (m.ice) {
      if (!l || !l.pc.remoteDescription) {
        if (!l) return;
        (l.pending ||= []).push(m.ice);
      } else await l.pc.addIceCandidate(m.ice).catch(() => {});
    }
  }

  // ---------- sending ----------
  send(peer, d, reliable = true) {
    const l = this.links.get(peer);
    if (l && l.open) {
      const ch = reliable ? l.r : l.u;
      if (ch && ch.readyState === 'open') {
        // don't pile up unreliable packets on a slow link
        if (!reliable && ch.bufferedAmount > 64000) return;
        ch.send(JSON.stringify(d));
        return;
      }
    }
    // relay: moves are thinned to save the room's budget, snapshots go out whole
    if (!reliable && d.k !== 's') {
      l && (l.skip = (l.skip || 0) + 1);
      if (l && l.skip % 2) return;
    }
    this.wsSend({ t: 'g', to: peer, d, r: reliable ? 1 : 0 });
  }

  // host -> everyone else
  broadcast(d, reliable = true, except = null) {
    for (const p of this.peers) if (p.peer !== this.id && p.peer !== except) this.send(p.peer, d, reliable);
  }

  toHost(d, reliable = true) {
    if (this.isHost) return;
    this.send(this.hostId, d, reliable);
  }

  linkState(peer) {
    const l = this.links.get(peer);
    return !l ? '…' : l.open ? 'p2p' : l.relay ? 'relay' : '…';
  }
}
