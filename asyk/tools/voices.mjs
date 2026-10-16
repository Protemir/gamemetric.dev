// Voices for the story through the ElevenLabs API.
//   node asyk/tools/voices.mjs design            — makes a voice for everyone who has none yet (Voice Design)
//   node asyk/tools/voices.mjs samples           — one line per person into asyk/tools/voice-samples/ to listen
//   node asyk/tools/voices.mjs build [--force]   — every dialogue line and shout, both languages, into asyk/voice/
//   node asyk/tools/voices.mjs audition         — library candidates read each person's line (voice-samples/)
//   node asyk/tools/voices.mjs pick <who> <n>    — keeps preview n of that person as their voice
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

// the preview needs 100+ characters: the person's own lines from the story, in Russian
function sampleText(who) {
  const lines = [conf.people[who].sample, ...allLines().filter((l) => l.who === who && l.lang === 'ru').map((l) => l.text)];
  const fill = ['Ну что, ещё разок? Давай, бросай, не бойся!', 'Эх, ладно, смотрите все внимательно!'];
  let text = '';
  for (const l of [...new Set(lines), ...fill]) {
    if (text.length >= 110) break;
    text += (text ? ' ' : '') + l;
  }
  return speech('ru', text);
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
  // Voice Design: a description in, three previews out. They are saved for listening
  // (tools/voice-samples/index.html); 'pick <who> <n>' keeps one of them on the account.
  const dir = path.join(here, 'voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  const only = process.argv[3];
  for (const [who, p] of Object.entries(conf.people)) {
    if (only ? who !== only : p.voice) continue;
    try {
      const r = await api('/text-to-voice/design', {
        method: 'POST',
        body: JSON.stringify({ voice_description: p.describe, model_id: 'eleven_multilingual_ttv_v2', text: sampleText(who), auto_generate_text: false }),
      }).then((x) => x.json());
      p.previews = (r.previews || []).map((pr, i) => {
        fs.writeFileSync(path.join(dir, `${who}-${i + 1}.mp3`), Buffer.from(pr.audio_base_64, 'base64'));
        return pr.generated_voice_id;
      });
      console.log(who, p.previews.length, 'previews');
    } catch (e) {
      p.previews = [];
      p.error = String(e.message).slice(0, 300);
      console.log(who, 'FAILED', p.error);
    }
    fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
  }
  // a page to listen to them all
  const rows = Object.entries(conf.people)
    .map(([who, p]) => {
      const name = PEOPLE[who].name[0];
      const opts = (p.previews || []).map((_, i) => `<label><b>${i + 1}</b><audio controls preload="none" src="${who}-${i + 1}.mp3"></audio></label>`).join('');
      return `<section><h2>${name}</h2><p>${p.sample}</p>${opts || `<p class="err">${p.error || 'нет вариантов'}</p>`}</section>`;
    })
    .join('\n');
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Голоса Асық</title><style>body{font:16px system-ui;background:#f6eedd;color:#3b2416;max-width:760px;margin:24px auto;padding:0 16px}section{background:#fff8ea;border-radius:14px;padding:12px 16px;margin:12px 0}h2{margin:0;color:#8f2f2a}label{display:flex;gap:10px;align-items:center;margin:6px 0}.err{color:#b8352f}</style><h1>Голоса для «Асық»</h1>${rows}`,
  );
  console.log('listen: asyk/tools/voice-samples/index.html');
} else if (cmd === 'audition') {
  // library voices: added to the account for a moment, read the person's line, removed again
  // (so the account's voice slots stay free); 'pick' adds the chosen one for good
  const dir = path.join(here, 'voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  for (const [who, p] of Object.entries(conf.people)) {
    for (const [i, cnd] of (p.candidates || []).entries()) {
      const file = path.join(dir, `${who}-${i + 1}.mp3`);
      if (fs.existsSync(file)) continue;
      try {
        const added = await api(`/voices/add/${cnd.owner}/${cnd.voice}`, { method: 'POST', body: JSON.stringify({ new_name: `try ${who} ${cnd.name}` }) }).then((x) => x.json());
        const body = { text: speech('ru', p.sample), model_id: conf.model, language_code: 'ru', voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35 } };
        const r = await api(`/text-to-speech/${added.voice_id}?output_format=mp3_44100_64`, { method: 'POST', body: JSON.stringify(body) });
        fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        await api(`/voices/${added.voice_id}`, { method: 'DELETE' });
        console.log(who, i + 1, cnd.name);
      } catch (e) {
        cnd.error = String(e.message).slice(0, 200);
        console.log(who, i + 1, cnd.name, 'FAILED', cnd.error);
      }
    }
  }
  fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
  const rows = Object.entries(conf.people)
    .map(([who, p]) => {
      const names = p.candidates ? p.candidates.map((x) => x.name) : (p.previews || []).map((_, i) => `вариант ${i + 1}`);
      const opts = names.map((n, i) => `<label><b>${i + 1}</b> ${n}<audio controls preload="none" src="${who}-${i + 1}.mp3"></audio></label>`).join('');
      return `<section><h2>${PEOPLE[who].name[0]}</h2><p>${p.sample}</p>${opts}</section>`;
    })
    .join('\n');
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Голоса Асық</title><style>body{font:16px system-ui;background:#f6eedd;color:#3b2416;max-width:760px;margin:24px auto;padding:0 16px}section{background:#fff8ea;border-radius:14px;padding:12px 16px;margin:12px 0}h2{margin:0;color:#8f2f2a}label{display:flex;gap:10px;align-items:center;margin:6px 0}audio{height:34px}</style><h1>Голоса для «Асық»</h1><p>Послушай и скажи номер для каждого: например «Бекжан 1, Әсем 2…»</p>${rows}`,
  );
  console.log('listen: asyk/tools/voice-samples/index.html');
} else if (cmd === 'pick') {
  // node voices.mjs pick bekzhan 2  — keeps preview 2 as Bekzhan's voice
  const [who, n] = [process.argv[3], Number(process.argv[4])];
  const p = conf.people[who];
  const cnd = p && p.candidates && p.candidates[n - 1];
  if (cnd) {
    const added = await api(`/voices/add/${cnd.owner}/${cnd.voice}`, { method: 'POST', body: JSON.stringify({ new_name: `Asyk ${PEOPLE[who].name[1]}` }) }).then((x) => x.json());
    p.voice = added.voice_id;
    p.from = cnd.name;
    fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
    console.log(who, '→', cnd.name, p.voice);
    process.exit(0);
  }
  const id = p && p.previews && p.previews[n - 1];
  if (!id) throw new Error('no such preview');
  const saved = await api('/text-to-voice', {
    method: 'POST',
    body: JSON.stringify({ voice_name: `Asyk ${PEOPLE[who].name[1]}`, voice_description: p.describe, generated_voice_id: id }),
  }).then((x) => x.json());
  p.voice = saved.voice_id;
  fs.writeFileSync(CONF, JSON.stringify(conf, null, 2) + '\n');
  console.log(who, '→', p.voice);
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
  // three at a time: as many as the plan lets run at once
  const todo = allLines().filter((l) => force || !fs.existsSync(path.join(root, voiceFile(l.lang, l.who, l.text))));
  const work = async () => {
    for (let l; (l = todo.shift()); ) {
      const file = path.join(root, voiceFile(l.lang, l.who, l.text));
      try {
        await say(l.who, l.lang, l.text, file);
      } catch (e) {
        console.log('FAILED', l.who, l.lang, l.text, String(e.message).slice(0, 160));
        continue;
      }
      made++;
      chars += l.text.length;
      if (made % 25 === 0) console.log(made, 'files');
    }
  };
  await Promise.all([work(), work(), work()]);
  console.log(`done: ${made} new files, ${chars} characters`);
} else if (cmd === 'sfx') {
  // sounds of the yard from the Sound Effects model, into asyk/sfx/
  const SFX = {
    hen: ['a single village hen clucking softly nearby, outdoors, evening, no other sounds', 2.5],
    rooster: ['a rooster crowing once in the distance in a quiet village, evening', 3],
    dog: ['a village dog barking twice far away, outdoors, slight echo', 2],
    crickets: ['calm summer evening ambience in a village: crickets chirping, very distant birds, light breeze, seamless loop', 10],
    wind: ['a gust of dry mountain wind sweeping over a dusty school yard, leaves rustling', 4],
  };
  const dir = path.join(root, 'sfx');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, [text, duration_seconds]] of Object.entries(SFX)) {
    const file = path.join(dir, name + '.mp3');
    if (fs.existsSync(file)) continue;
    const r = await api('/sound-generation?output_format=mp3_44100_64', { method: 'POST', body: JSON.stringify({ text, duration_seconds, prompt_influence: 0.6 }) });
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    console.log('sfx', name);
  }
} else if (cmd === 'count') {
  const lines = allLines();
  console.log(lines.length, 'files,', lines.reduce((s, l) => s + l.text.length, 0), 'characters');
} else {
  console.log('usage: design [who] | pick <who> <n> | samples | build [--force] | count');
}
