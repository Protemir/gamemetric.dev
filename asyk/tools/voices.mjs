// Voices for the story through the ElevenLabs API.
//   node asyk/tools/voices.mjs design            — makes a voice for everyone who has none yet (Voice Design)
//   node asyk/tools/voices.mjs samples           — one line per person into asyk/tools/voice-samples/ to listen
//   node asyk/tools/voices.mjs build [--force]   — every dialogue line and shout, both languages, into asyk/voice/
// The key lives in E:\PS\.secrets\elevenlabs.txt (one line). Voice ids are kept in tools/voices.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS, BARKS, PEOPLE } from '../js/story.js';
import { voiceFile, speech } from '../js/voice.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const KEY = fs.readFileSync('E:/PS/.secrets/elevenlabs.txt', 'utf8').trim();
const CONF = path.join(here, 'voices.json');
const conf = JSON.parse(fs.readFileSync(CONF, 'utf8'));
const API = 'https://api.elevenlabs.io/v1';

async function api(p, opts = {}) {
  const r = await fetch(API + p, { ...opts, headers: { 'xi-api-key': KEY, 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
  return r;
}

// who speaks what: every dialogue line with its speaker, and every shout for every kid
function allLines() {
  const out = [];
  for (const ch of CHAPTERS)
    for (const k of ch.kons)
      for (const part of ['intro', 'win', 'lose'])
        for (const [who, ru, en] of k[part] || []) {
          out.push({ who, lang: 'ru', text: ru });
          out.push({ who, lang: 'en', text: en });
        }
  const kids = Object.keys(PEOPLE).filter((id) => PEOPLE[id].kid != null);
  for (const list of Object.values(BARKS))
    for (const [ru, en] of list)
      for (const who of kids) {
        out.push({ who, lang: 'ru', text: ru });
        out.push({ who, lang: 'en', text: en });
      }
  return out;
}

async function say(who, lang, text, file) {
  const p = conf.people[who];
  if (!p || !p.voice) throw new Error(`no voice for ${who}`);
  const body = {
    text: speech(lang, text),
    model_id: conf.model,
    language_code: lang,
    voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, ...(p.settings || {}) },
  };
  const r = await api(`/text-to-speech/${p.voice}?output_format=mp3_44100_64`, { method: 'POST', body: JSON.stringify(body) });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

const cmd = process.argv[2];

if (cmd === 'design') {
  // Voice Design: a description in, three previews out; the first one is kept and saved to the account
  for (const [who, p] of Object.entries(conf.people)) {
    if (p.voice) continue;
    const r = await api('/text-to-voice/design', {
      method: 'POST',
      body: JSON.stringify({ voice_description: p.describe, model_id: 'eleven_multilingual_ttv_v2', text: p.sample, auto_generate_text: false }),
    }).then((x) => x.json());
    const prev = r.previews && r.previews[0];
    if (!prev) {
      console.log(who, 'no preview', JSON.stringify(r).slice(0, 200));
      continue;
    }
    const saved = await api('/text-to-voice', {
      method: 'POST',
      body: JSON.stringify({ voice_name: `Asyk ${PEOPLE[who].name[1]}`, voice_description: p.describe, generated_voice_id: prev.generated_voice_id }),
    }).then((x) => x.json());
    p.voice = saved.voice_id;
    fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
    console.log(who, '→', p.voice);
  }
} else if (cmd === 'samples') {
  const dir = path.join(here, 'voice-samples');
  for (const [who, p] of Object.entries(conf.people)) {
    if (!p.voice) continue;
    await say(who, 'ru', p.sample, path.join(dir, `${who}-ru.mp3`));
    console.log('sample', who);
  }
} else if (cmd === 'build') {
  const force = process.argv.includes('--force');
  let made = 0;
  let chars = 0;
  for (const l of allLines()) {
    const file = path.join(root, voiceFile(l.lang, l.who, l.text));
    if (!force && fs.existsSync(file)) continue;
    await say(l.who, l.lang, l.text, file);
    made++;
    chars += l.text.length;
    if (made % 20 === 0) console.log(made, 'files');
  }
  console.log(`done: ${made} new files, ${chars} characters`);
} else if (cmd === 'count') {
  const lines = allLines();
  console.log(lines.length, 'files,', lines.reduce((s, l) => s + l.text.length, 0), 'characters');
} else {
  console.log('usage: design | samples | build [--force] | count');
}
