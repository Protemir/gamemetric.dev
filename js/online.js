// Playing over the internet without a server of our own. The host makes a link with a WebRTC
// offer inside, the friend opens it and sends back an answer code. After that both browsers talk
// directly over a data channel and exchange only button presses. The fight runs in lockstep:
// every frame waits for both players' buttons, a few frames of delay hide the ping.
// To find each other through home routers the browsers ask a public STUN server (Google's).

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));

async function pack(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + b64(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return 'j' + b64(new TextEncoder().encode(json));
}

async function unpack(code) {
  const clean = code.trim().replace(/^.*#join=/, '').replace(/\s+/g, '');
  const body = unb64(clean.slice(1));
  if (clean[0] === 'z') {
    const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(body));
}

// keep only what a data channel needs, the code gets much shorter
function slim(sdp) {
  return sdp.split('\r\n').filter((l) => l && !/^a=(extmap|rtcp-fb|fmtp|rtpmap|ssrc|msid)/.test(l)).join('\r\n') + '\r\n';
}

export const netSupported = () => typeof RTCPeerConnection !== 'undefined';

export class Net {
  constructor(h) {
    this.h = h;
    this.pc = null;
    this.ch = null;
    this.role = null;
    this.open = false;
  }

  make() {
    this.pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc.addEventListener('connectionstatechange', () => {
      const st = this.pc && this.pc.connectionState;
      if (st === 'failed' || st === 'disconnected' || st === 'closed') this.lost();
    });
  }

  async host() {
    this.role = 'host';
    this.make();
    this.ch = this.pc.createDataChannel('game', { ordered: true });
    this.wire(this.ch);
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.gathered();
    return pack({ v: 1, sdp: slim(this.pc.localDescription.sdp) });
  }

  async join(code) {
    this.role = 'guest';
    const { sdp } = await unpack(code);
    this.make();
    this.pc.addEventListener('datachannel', (e) => {
      this.ch = e.channel;
      this.wire(this.ch);
    });
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this.gathered();
    return pack({ v: 1, sdp: slim(this.pc.localDescription.sdp) });
  }

  async accept(code) {
    const { sdp } = await unpack(code);
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
  }

  gathered() {
    return new Promise((done) => {
      if (this.pc.iceGatheringState === 'complete') return done();
      const timer = setTimeout(done, 3500);
      this.pc.addEventListener('icegatheringstatechange', () => {
        if (this.pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          done();
        }
      });
    });
  }

  wire(ch) {
    ch.addEventListener('open', () => {
      this.open = true;
      this.h.open();
    });
    ch.addEventListener('close', () => this.lost());
    ch.addEventListener('message', (e) => {
      try {
        this.h.message(JSON.parse(e.data));
      } catch {
        /* ignore anything odd */
      }
    });
  }

  lost() {
    if (!this.open && !this.pc) return;
    const was = this.open;
    this.open = false;
    if (was) this.h.close();
  }

  send(obj) {
    if (this.ch && this.ch.readyState === 'open') this.ch.send(JSON.stringify(obj));
  }

  close() {
    this.open = false;
    try {
      if (this.ch) this.ch.close();
      if (this.pc) this.pc.close();
    } catch {
      /* already closed */
    }
    this.pc = null;
    this.ch = null;
  }
}

// buttons travel as one small number per frame
const BITS = ['left', 'right', 'up', 'down', 'block', 'punch', 'kick', 'special', 'taunt'];
export const encode = (inp) => BITS.reduce((a, b, k) => a | (inp[b] ? 1 << k : 0), 0);
export const decode = (n) => Object.fromEntries(BITS.map((b, k) => [b, !!(n & (1 << k))]));

// a tiny fingerprint of the fight to notice if the two browsers ever disagree
export function fingerprint(m) {
  let h = m.frame;
  for (const f of m.f) h = (h * 31 + Math.round(f.x * 4) * 7 + Math.round(f.y * 4) * 13 + f.hp * 17) | 0;
  return h;
}
