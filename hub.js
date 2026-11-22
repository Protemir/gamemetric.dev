// The game list: language switch and short clips that play over the cover pictures.
const TEXT = {
  en: {
    title: 'GameMetric — free browser games: shooter, puzzles, racing, fighting',
    h1: 'Games you can play right now',
    perk1: 'Free',
    perk2: 'No download, no sign-up',
    perk3: 'Phone and PC',
    featured: 'Featured',
    random: 'Random game',
    online: 'Online 5v5',
    allGames: 'All games',
    genres: 'Genres',
    'cat.all': 'All',
    'cat.action': 'Action',
    'cat.puzzle': 'Puzzles',
    'cat.strategy': 'Strategy',
    'cat.sport': 'Racing & sports',
    'cat.story': 'Story',
    'cat.friends': 'With friends',
    'breach.short': 'Assault team against the guards, hostages inside. Storm the mansion with bots or invite friends with a link.',
    'kokpar.short': 'Grab the serke at a gallop, ram your rivals and win the Zhetysu Champions League with your own club.',
    'lookaway.short': 'A hospital at night where the dead move only while you are not looking at them.',
    'sybys.short': 'You are the new khan. Win over three clans, catch forged orders and find the plotter before the kurultai.',
    games: 'Games',
    new: 'New',
    play: 'Play',
    fight: 'Fight',
    check: 'Test yourself',
    proto: 'Prototype',
    'breach.name': 'Mansion Breach',
    'breach.genre': 'Tactical shooter · 3D',
    'breach.meta': '5v5 · online',
    'breach.desc': 'Assault team against the guards in a mansion with hostages. Buy your guns, storm the house through the courtyard, the garage or the kitchen and lead the hostages out to the gate. Play against bots or invite friends with a link — up to 10 people in a room.',
    'lookaway.name': 'Hold Their Gaze',
    'lookaway.genre': 'Horror · 3D',
    'lookaway.meta': '14 levels · 2 chapters',
    'lookaway.desc': 'A hospital at night where the dead move only while you are not looking at them. Find the key, hold them with your gaze, blind them with the flash and get out before your torch dies.',
    'caravan.name': 'The Last Caravan',
    'caravan.genre': 'Adventure · 3D',
    'caravan.meta': 'Chapter 1 · PC',
    'caravan.desc': "A letter from his missing father leads Yusuf to an old caravan road. A storm, a traveller without water and a ledger dated when it shouldn't be. Early build with grey models.",
    'shift-depot.name': 'Shift Depot',
    'shift-depot.genre': 'Puzzle',
    'shift-depot.meta': '38 levels',
    'shift-depot.desc': 'Slide rows and columns of a tiny warehouse. Parcels ride along with the floor, then every conveyor takes one more step. Deliver every parcel to its dock.',
    'sybys.name': 'Whispers of the Steppe',
    'sybys.genre': 'Strategy & intrigue',
    'sybys.meta': '3D · 6 endings',
    'sybys.desc': "The old khan's horse came back without its rider. You are Temir, the new khan. Win three clans with your word, catch forged orders, fight off the horde's raids and find who is behind the plot before the kurultai.",
    'kokpar.name': 'Kokpar',
    'kokpar.genre': '3D horseback sport',
    'kokpar.meta': '3v3 · your own club',
    'kokpar.desc': 'Build your own club and win the Zhetysu Champions League. Grab the serke at a gallop, rip it away in a tug of war, ram your rivals and throw the carcass into the kazan — by day, at sunset, in a snowstorm and in a floodlit night final.',
    'oyu.name': 'Oyu',
    'oyu.genre': 'Puzzle',
    'oyu.meta': '60 levels',
    'oyu.desc': 'Send colored shooters onto the belt and they knock out pixels of their own color. Every picture you clear becomes a pattern in your carpet.',
    'aryq.name': 'Aryk',
    'aryq.genre': 'Strategy',
    'aryq.meta': '3 valleys',
    'aryq.desc': 'Dig canals from the river to orchards and yurts. Water only runs downhill, and by autumn the glacier melts less: water everyone in time.',
    'asyk.name': 'Asyk',
    'asyk.genre': 'Story & physics',
    'asyk.meta': 'Summer of 1987',
    'asyk.desc': 'A village under the mountains, evening, the kids next door have set up the kon. Throw your knucklebone from your hand, knock the bones out and beat Erlan-aga and Dauren-aga.',
    'survivors.name': 'Noob Survivors',
    'survivors.genre': '3D party',
    'survivors.meta': 'Up to 24 noobs',
    'survivors.desc': 'A floating arena, giant hammers, spinning sweepers, rolling balls and a floor that falls apart. Dodge, dash into rivals and be the last noob standing.',
    'asem.name': 'Asem Road',
    'asem.genre': 'Racing',
    'asem.meta': '7 tracks',
    'asem.desc': 'Almaty by night, Medeu, Shymbulak, Kapchagay, Charyn Canyon and Astana at New Year. A 7-chapter story, a garage, nitro and a shared leaderboard.',
    'jekpe.name': 'Jekpe-jek',
    'jekpe.genre': 'Fighting',
    'jekpe.meta': 'Two players and online',
    'jekpe.desc': 'Batyr, Apa, the Eagle Hunter, the Taxi Driver, the Wrestler, the Akyn and the giant Dau. Story arcade, two players on one screen or online, funny finishers with no blood.',
    'test.name': 'Gamer brain test',
    'test.genre': 'Test',
    'test.meta': '4 tests',
    'test.desc': 'Reaction, aim, clicking speed and memory. Get a game-style rank and challenge a friend with a link.',
    'xo.name': 'Tic-Tac-Toe',
    'xo.genre': 'Classic',
    'xo.meta': 'Two players or vs bot',
    'xo.desc': 'Three in a row wins. Play a friend on one screen or take on the bot: easy, medium or unbeatable.',
    made: 'Games by',
  },
};

const saved = (() => {
  try {
    return localStorage.getItem('gm.lang');
  } catch {
    return null;
  }
})();
const fromUrl = new URLSearchParams(location.search).get('lang');
const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
let lang = fromUrl || saved || (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en');
if (lang !== 'ru' && lang !== 'en') lang = 'en';

// the Russian text is the page itself; keep it to switch back
const ru = { title: document.title };
document.querySelectorAll('[data-t]').forEach((n) => (ru[n.dataset.t] = n.textContent));
document.querySelectorAll('[data-t-label]').forEach((n) => (ru[n.dataset.tLabel] = n.getAttribute('aria-label')));

const links = () => document.querySelectorAll('.card, .slide');

function apply() {
  const dict = lang === 'ru' ? ru : TEXT.en;
  document.documentElement.lang = lang;
  document.title = dict.title;
  document.querySelectorAll('[data-t]').forEach((n) => {
    if (dict[n.dataset.t] != null) n.textContent = dict[n.dataset.t];
  });
  document.querySelectorAll('[data-t-label]').forEach((n) => n.setAttribute('aria-label', dict[n.dataset.tLabel]));
  document.querySelectorAll('[data-t-title]').forEach((n) => n.setAttribute('title', dict[n.dataset.tTitle]));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  // the games pick the language up from the address
  links().forEach((a) => {
    const u = new URL(a.getAttribute('href'), location.href);
    u.searchParams.set('lang', lang);
    a.href = u.pathname + u.search;
  });
}

document.querySelectorAll('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try {
      localStorage.setItem('gm.lang', lang);
    } catch {
      /* private mode */
    }
    apply();
  }),
);
apply();

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function playClip(box) {
  const v = box.querySelector('video');
  if (!v || calm || saveData) return;
  if (!v.src) v.src = v.dataset.src;
  const p = v.play();
  if (p) p.then(() => box.classList.add('playing')).catch(() => {});
  else box.classList.add('playing');
}
function stopClip(box) {
  const v = box.querySelector('video');
  if (!v) return;
  v.pause();
  box.classList.remove('playing');
}

// ---------- featured carousel ----------
const stage = document.querySelector('.stage');
const slides = [...stage.querySelectorAll('.slide')];
const tabs = [...stage.querySelectorAll('.thumbs button')];
const DUR = 7000;
let cur = 0;
let timer = 0;
let paused = false;
stage.style.setProperty('--dur', DUR + 'ms');

function show(i) {
  stopClip(slides[cur]);
  cur = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    s.classList.toggle('on', k === cur);
    s.tabIndex = k === cur ? 0 : -1;
    s.setAttribute('aria-hidden', String(k !== cur));
  });
  tabs.forEach((t, k) => {
    t.setAttribute('aria-selected', String(k === cur));
    // restart the progress line
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  });
  playClip(slides[cur]);
  schedule();
}
function schedule() {
  clearTimeout(timer);
  if (!paused && !calm) timer = setTimeout(() => show(cur + 1), DUR);
}
function pause(on) {
  paused = on;
  stage.classList.toggle('paused', on);
  schedule();
}
tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
if (hover) {
  stage.addEventListener('mouseenter', () => pause(true));
  stage.addEventListener('mouseleave', () => pause(false));
}
stage.addEventListener('focusin', () => pause(true));
stage.addEventListener('focusout', () => pause(false));
document.addEventListener('visibilitychange', () => pause(document.hidden));
stage.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') show(cur + 1);
  else if (e.key === 'ArrowLeft') show(cur - 1);
});
// swipe on phones
let sx = 0;
let sy = 0;
let swiped = false;
stage.addEventListener('touchstart', (e) => {
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
  swiped = false;
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    swiped = true;
    show(cur + (dx < 0 ? 1 : -1));
  }
}, { passive: true });
slides.forEach((s) =>
  s.addEventListener('click', (e) => {
    if (swiped) {
      e.preventDefault();
      swiped = false;
    }
  }),
);
show(0);

// ---------- genre filter ----------
const cards = [...document.querySelectorAll('.card')];
const count = document.getElementById('count');
const filterBtns = [...document.querySelectorAll('[data-cat]')].filter((b) => b.tagName === 'BUTTON');
filterBtns.forEach((b) =>
  b.addEventListener('click', () => {
    const cat = b.dataset.cat;
    filterBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    let n = 0;
    for (const c of cards) {
      const on = cat === 'all' || c.dataset.cat.split(' ').includes(cat);
      c.hidden = !on;
      if (on) {
        n++;
        // replay the entrance so the change is visible
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = '';
        c.style.animationDelay = Math.min(n - 1, 8) * 40 + 'ms';
      }
    }
    count.textContent = n;
  }),
);
count.textContent = cards.length;

// ---------- random game ----------
document.getElementById('random').addEventListener('click', () => {
  const pool = cards.filter((c) => !c.hidden);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  location.href = pick.href;
});

// ---------- clips on the tiles: on hover with a mouse, or while the tile is on screen on a phone ----------
const clipCards = cards.filter((c) => c.querySelector('video'));
if (hover) {
  for (const c of clipCards) {
    c.addEventListener('mouseenter', () => playClip(c));
    c.addEventListener('mouseleave', () => stopClip(c));
    c.addEventListener('focus', () => playClip(c));
    c.addEventListener('blur', () => stopClip(c));
  }
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.intersectionRatio > 0.6 ? playClip(e.target) : stopClip(e.target);
    },
    { threshold: [0, 0.6, 1] },
  );
  clipCards.forEach((c) => io.observe(c));
}
