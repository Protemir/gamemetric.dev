// The game list: language switch and short clips that play over the cover pictures.
const TEXT = {
  en: {
    title: 'GameMetric — free browser games: puzzle, racing, fighting',
    h1: 'Games you can play right now',
    lead: 'Free, no download, no sign-up. On your phone and on your computer.',
    games: 'Games',
    new: 'New',
    play: 'Play',
    fight: 'Fight',
    check: 'Test yourself',
    'sybys.name': 'Whispers of the Steppe',
    'sybys.genre': 'Strategy & intrigue',
    'sybys.meta': '3D · 2 seasons · 6 endings',
    'sybys.desc': "The old khan's horse came back without its rider. You are Temir, the new khan. Win three clans with your word, catch forged orders, fight off the horde's raids and find who is behind the plot before the kurultai.",
    'kokpar.name': 'Kokpar',
    'kokpar.genre': '3D horseback sport',
    'kokpar.meta': '3v3 · Champions League · your own club',
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
    made: 'Games by',
    source: 'Source code',
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

function apply() {
  const dict = lang === 'ru' ? ru : TEXT.en;
  document.documentElement.lang = lang;
  document.title = dict.title;
  document.querySelectorAll('[data-t]').forEach((n) => {
    if (dict[n.dataset.t] != null) n.textContent = dict[n.dataset.t];
  });
  document.querySelectorAll('[data-t-label]').forEach((n) => n.setAttribute('aria-label', dict[n.dataset.tLabel]));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  // the games pick the language up from the address
  document.querySelectorAll('.card').forEach((a) => {
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

// clips: on hover with a mouse, or while the card is on screen on a phone
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function start(card) {
  const v = card.querySelector('video');
  if (!v || calm || saveData) return;
  if (!v.src) v.src = v.dataset.src;
  const p = v.play();
  if (p) p.then(() => card.classList.add('playing')).catch(() => {});
  else card.classList.add('playing');
}
function stop(card) {
  const v = card.querySelector('video');
  if (!v) return;
  v.pause();
  card.classList.remove('playing');
}

const cards = [...document.querySelectorAll('.card')].filter((c) => c.querySelector('video'));
if (hover) {
  for (const c of cards) {
    c.addEventListener('mouseenter', () => start(c));
    c.addEventListener('mouseleave', () => stop(c));
    c.addEventListener('focus', () => start(c));
    c.addEventListener('blur', () => stop(c));
  }
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.intersectionRatio > 0.6 ? start(e.target) : stop(e.target);
    },
    { threshold: [0, 0.6, 1] },
  );
  cards.forEach((c) => io.observe(c));
}
