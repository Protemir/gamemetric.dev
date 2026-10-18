// Игра с другом по сети: браузеры соединяются напрямую (WebRTC), сервер «Жекпе-жека» только
// передаёт коды подключения под 6-буквенным кодом комнаты. Игру считает хост, друг шлёт нажатия.
const API = 'https://jekpe-api.protemir.workers.dev';
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
  const body = unb64(code.slice(1));
  if (code[0] === 'z') {
    const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(body));
}
const slim = (sdp) => sdp.split('\r\n').filter((l) => l && !/^a=(extmap|rtcp-fb|fmtp|rtpmap|ssrc|msid)/.test(l)).join('\r\n') + '\r\n';

async function call(path, opts = {}) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(API + path, { ...opts, signal: ctrl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || String(r.status)), { status: r.status });
    return data;
  } finally { clearTimeout(timer); }
}
const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const netSupported = () => typeof RTCPeerConnection !== 'undefined';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Net {
  constructor(h) { this.h = h; this.pc = null; this.ch = null; this.open = false; this.stopped = false; }
  make() {
    this.pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc.addEventListener('connectionstatechange', () => {
      const st = this.pc?.connectionState;
      if (st === 'failed' || st === 'disconnected' || st === 'closed') this.lost();
    });
  }
  gathered() {
    return new Promise((done) => {
      if (this.pc.iceGatheringState === 'complete') return done();
      const timer = setTimeout(done, 3500);
      this.pc.addEventListener('icegatheringstatechange', () => { if (this.pc.iceGatheringState === 'complete') { clearTimeout(timer); done(); } });
    });
  }
  wire(ch) { // два канала: быстрый без повторов (кадры, нажатия) и надёжный (старт, гол, конец)
    ch.addEventListener('open', () => { if (this.ch?.readyState === 'open' && this.ctl?.readyState === 'open' && !this.open) { this.open = true; this.h.open(); } });
    ch.addEventListener('close', () => this.lost());
    ch.addEventListener('message', (e) => { try { this.h.message(JSON.parse(e.data)); } catch { /* мусор не читаем */ } });
  }
  // хост: создаёт комнату, ждёт ответ друга
  async host(onCode) {
    this.role = 'host'; this.make();
    this.ch = this.pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 }); // свежий кадр важнее старого
    this.ctl = this.pc.createDataChannel('ctl', { ordered: true });
    this.wire(this.ch); this.wire(this.ctl);
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.gathered();
    const { code } = await post('/room', { offer: await pack({ v: 1, sdp: slim(this.pc.localDescription.sdp) }) });
    onCode(code);
    for (let i = 0; i < 300 && !this.stopped; i++) { // до 10 минут
      await sleep(2000);
      const r = await call('/room/' + code).catch(() => null);
      if (r?.answer) { const { sdp } = await unpack(r.answer); await this.pc.setRemoteDescription({ type: 'answer', sdp }); return; }
    }
    throw new Error('timeout');
  }
  // друг: берёт предложение по коду, отвечает
  async join(code) {
    this.role = 'guest';
    const r = await call('/room/' + cleanCode(code));
    if (!r?.offer) throw new Error('room');
    const { sdp } = await unpack(r.offer);
    this.make();
    this.pc.addEventListener('datachannel', (e) => { if (e.channel.label === 'ctl') this.ctl = e.channel; else this.ch = e.channel; this.wire(e.channel); });
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this.gathered();
    await post('/room/' + cleanCode(code), { answer: await pack({ v: 1, sdp: slim(this.pc.localDescription.sdp) }) });
  }
  lost() { if (!this.open) return; this.open = false; this.h.close(); }
  send(obj, reliable) { const c = reliable ? this.ctl : this.ch; if (c?.readyState === 'open') c.send(JSON.stringify(obj)); }
  close() { this.stopped = true; this.open = false; try { this.ch?.close(); this.ctl?.close(); this.pc?.close(); } catch { /* уже закрыто */ } this.pc = null; this.ch = null; }
}
