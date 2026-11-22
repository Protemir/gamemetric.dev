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
    this.peers = []; // [{peer, name, joined}]
    this.links = new Map(); // peer -> { pc, r, u, open, relay }
    this.hostId = null;
    this.closed = false;
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
    ws.onclose = () => {
      if (this.closed) return;
      this.h.onStatus?.('lost');
      // try once more after a short pause (a phone switching networks, a sleepy tab)
      setTimeout(() => !this.closed && this.connect(), 1500);
    };
    ws.onerror = () => {};
  }

  close() {
    this.closed = true;
    try {
      this.ws?.close();
    } catch {}
    for (const l of this.links.values()) {
      try {
        l.pc?.close();
      } catch {}
    }
    this.links.clear();
  }

  wsSend(m) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  onWs(m) {
    if (m.t === 'hello') {
      this.peers = [m.you, ...m.peers].sort((a, b) => a.joined - b.joined);
      this.updateHost();
      this.h.onStatus?.('ok');
      // the host links to everyone already waiting
      if (this.isHost) for (const p of this.peers) if (p.peer !== this.id) this.linkTo(p.peer);
      this.h.onPeers?.(this.peers);
    } else if (m.t === 'join') {
      if (!this.peers.some((p) => p.peer === m.peer)) this.peers.push({ peer: m.peer, name: m.name, joined: m.joined });
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
    else if (m.t === 'g') this.h.onMessage?.(m.from, m.d);
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
      if (pc.connectionState === 'failed') l.relay = true;
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
    // relay: unreliable traffic is thinned to save the room's budget
    if (!reliable) {
      l && (l.skip = (l.skip || 0) + 1);
      if (l && l.skip % 2) return;
    }
    this.wsSend({ t: 'g', to: peer, d });
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
