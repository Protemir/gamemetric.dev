// Portraits as medallions: a figure in profile against the light, a thin gold rim — like a seal or a coin.
// Each one is told apart by what he wears on his head: Temir's fur borik, Aria's tall saukele,
// Karasai's helmet with a plume, Zaltyr's hood, Sarman's turban, Orazbai's tall kalpak and staff,
// the elders of the clans in white felt kalpaks.

let uid = 0;
const HEAD = 'M27 22C33 18 41 21 42 28L44.5 32.5 42.2 33.4 43 36.3C42 38.3 40.2 39 38.4 39.2L37.6 43 29 44.5C26 40.5 24.2 36 24.2 30.5 24.2 26.5 25.2 24 27 22Z';
const BODY = 'M28.5 42.5 36.8 42 37.8 48.2C46.5 50 52.4 55.2 54.6 64H9.4C11.6 55 17.6 50.2 26.8 48.4Z';

// a medallion: the glow behind (the person's colour), the figure, the rim
function medal(tone, parts, ring = '#c99a3e') {
  const id = 'av' + uid++;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="${id}" cx="38%" cy="36%" r="70%"><stop offset="0" stop-color="${tone}"/><stop offset=".62" stop-color="${tone}" stop-opacity=".35"/><stop offset="1" stop-color="#0b0806"/></radialGradient>
<clipPath id="${id}c"><circle cx="32" cy="32" r="30"/></clipPath></defs>
<circle cx="32" cy="32" r="31" fill="#0b0806"/><circle cx="32" cy="32" r="30" fill="url(#${id})"/>
<g clip-path="url(#${id}c)" fill="#120c08" stroke="${tone}" stroke-opacity=".55" stroke-width=".9" stroke-linejoin="round">
<path d="${BODY}"/>${parts.under || ''}<path d="${HEAD}"/>${parts.over || ''}</g>
<circle cx="32" cy="32" r="30.4" fill="none" stroke="${ring}" stroke-width="1.7"/><circle cx="32" cy="32" r="28.2" fill="none" stroke="${ring}" stroke-opacity=".35" stroke-width=".7"/></svg>`;
}

const PEOPLE = {
  // Temir: a fox-fur borik with a broad rim, a short beard
  temir: medal('#c8942e', {
    over: `<path d="M22.5 27C22 17 31 12.5 39.5 15.2 43.6 16.6 45.4 20.6 44.4 25 38 21.8 30 22.3 22.5 27Z"/>
<path d="M21.6 28.6C29.5 22.8 39.5 22.6 45.6 25.6L45.4 28.6C38.6 25.8 30.2 26.2 21.8 31.4Z"/>
<path d="M37.8 39.3C40 41.6 39.4 44.4 36.4 45L35 41Z"/>`,
  }),
  // Aria: the tall saukele with hanging strings of beads, a braid down the back
  aria: medal('#8a5cd6', {
    under: `<path d="M26 30C21.5 38 21 46 23 53L25.4 52.6C24 46 24.8 39 27.6 32Z"/>`,
    over: `<path d="M25.2 25.4 30.6 2.6H37.2L41.6 24.6C35.4 21.2 30 21.6 25.2 25.4Z"/>
<path d="M24.6 25.8 22.4 44M26.4 25 25.2 46" fill="none" stroke-dasharray="1.4 1.6"/>
<circle cx="33.9" cy="3.2" r="2.2"/>`,
  }, '#d4aa58'),
  // Karasai: a pointed helmet with a plume, mail down the neck, a heavy moustache
  karasai: medal('#b23a2a', {
    over: `<path d="M23.6 27.6C23.4 16 29.4 9.6 34 6.2 38.6 9.8 44.6 15.2 44.6 26.4 37.6 22.2 30.2 22.4 23.6 27.6Z"/>
<path d="M34 6.6C30.4 0 25.2-1.6 20.6 2.4 26 2.4 30 4 33 7.6Z"/>
<path d="M23.8 27.6 21.8 41 29.4 43.4 28.6 30Z"/>
<path d="M38 37.6C41.6 37.4 43.2 39.4 43.4 42 41 40.6 39.4 40.4 37.6 40.6Z"/>`,
  }),
  // Zaltyr: a deep hood, the face in its shadow
  zaltyr: medal('#6f8a4e', {
    over: `<path d="M20.8 41.8C18.4 27.6 23.4 15.4 34.2 14.6 42.8 14.2 46.8 21.6 46.6 30.4L44.6 33.6 44.8 37.6C41 42.6 34.6 44.8 27.6 46.8Z"/>`,
  }),
  // Sarman: a wound turban with a jewel, a trimmed merchant's beard
  sarman: medal('#2f8a76', {
    over: `<path d="M22.4 27.4C20.4 18.6 27.2 13.4 34.4 13.4 41.4 13.4 46.6 17.6 46.4 24.6 40.4 21.2 31 21 22.4 27.4Z"/>
<path d="M24 22.6C30 17.6 39 17 45.6 20.6M23.2 25.2C30 20.6 39.4 20.2 46.2 23.4" fill="none"/>
<circle cx="36.4" cy="16.6" r="1.8" fill="${'#2f8a76'}"/>
<path d="M37.6 38.6C40.8 41.6 39.8 46.2 35.4 46.6L34.6 41.6Z"/>`,
  }),
  // Orazbai: the elder — a tall kalpak, a long white beard, a carved staff
  orazbai: medal('#9a8a6a', {
    over: `<path d="M24.8 26.4 28.4 9.6C32.2 7.6 36.4 7.6 39.4 10.8L43.4 24.2C37.4 21 31 21.6 24.8 26.4Z"/>
<path d="M36.6 37.4C43.4 40.4 43.4 50.6 37 57.6 34.6 51 32.2 47 29.6 43.6Z" fill="#d8d0bf" stroke="#d8d0bf"/>
<path d="M50 64V14" fill="none" stroke="#7a5a32" stroke-opacity="1" stroke-width="2.2"/>`,
  }),
};
PEOPLE.scouts = PEOPLE.zaltyr;
PEOPLE.merchants = PEOPLE.sarman;

// an elder of a clan: a white felt kalpak with its brim turned up, a beard; the rim in the clan's colour
export function elder(rgb) {
  const c = `rgb(${rgb.join(',')})`;
  return medal(c, {
    over: `<path d="M25 26.4 28.6 12 37.4 11 42.4 24.4C36.4 21.4 30.4 22 25 26.4Z" fill="#e8e0cf" stroke="#e8e0cf"/>
<path d="M23.6 27.6C30 22.6 38.6 22.4 44 25.2L44.8 22.4C38 19.6 30 20.2 23.2 24.6Z" fill="#cfc6b2" stroke="#cfc6b2"/>
<path d="M37 38.6C41.4 41 41 47 36.6 50.4 34.6 46.6 32.8 44.4 30.6 43.4Z" fill="#cfc6b2" stroke="#cfc6b2"/>`,
  }, c);
}

// each copy on the page gets its own ids: a hidden copy would otherwise own the shared gradient
let copy = 0;
const fresh = (svg) => { const k = ++copy; return svg.replace(/av(\d+)/g, (_, n) => `av${n}_${k}`); };
export const avatar = (who) => fresh(PEOPLE[who] || PEOPLE.temir);

// the opening picture for the 2D fallback: a saddled horse alone on the steppe at dusk
export const LONE_HORSE = `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="loneSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a4a"/><stop offset=".55" stop-color="#d7834a"/><stop offset="1" stop-color="#f2c06a"/></linearGradient></defs>
<rect width="320" height="140" rx="12" fill="url(#loneSky)"/><circle cx="240" cy="92" r="22" fill="#ffd88a" opacity=".85"/>
<path d="M0 100q60-14 120-4t110-6t90 4v46H0z" fill="#5a3a2a"/><path d="M0 112q80-10 160-2t160-4v34H0z" fill="#3a2418"/>
<g fill="#1e120c" transform="translate(150 66)">
<ellipse cx="0" cy="18" rx="26" ry="10"/>
<path d="M18 14 L30 -8 Q34 -14 40 -12 L48 -4 Q50 0 46 1 L38 -2 L30 18 Z"/>
<path d="M30 -10 Q26 -16 22 -6 L26 2 Z"/>
<rect x="-22" y="22" width="5" height="22" rx="2"/><rect x="-12" y="24" width="5" height="20" rx="2" transform="rotate(8 -10 24)"/>
<rect x="12" y="22" width="5" height="22" rx="2"/><rect x="20" y="22" width="5" height="21" rx="2" transform="rotate(-10 22 22)"/>
<path d="M-24 12 Q-38 14 -40 34 Q-34 26 -26 20 Z"/>
</g>
<path d="M140 74 q10 -6 20 0 l-2 8 h-16 z" fill="#7a3a22"/><path d="M150 82 v14" stroke="#7a3a22" stroke-width="2"/></svg>`;

// thin gold line icons for the bars (no emoji: they read as a toy)
const ic = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICONS = {
  horse: ic('<path d="M7 21c-.5-4 .5-7.5 3-9.5L8.5 7.5 10 6l2 2.2C13 5 15.5 3.6 18 4l-.8 2.2c1.6 1 2.6 2.8 2.8 5L18 12.6l-1.5-1.8c-1 .8-1.6 2.2-1.7 3.8L15 21"/><circle cx="15.6" cy="8.2" r=".6" fill="currentColor"/>'),
  scroll: ic('<path d="M7 4h11a2 2 0 0 1 2 2v1H9"/><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M9 10h6M9 13h6M9 16h4"/>'),
  expand: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  shrink: ic('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  map: ic('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  pause: ic('<path d="M9 5v14M15 5v14"/>'),
  play: ic('<path d="M7 5l12 7-12 7z"/>'),
  soundOn: ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  crown: ic('<path d="M4 18h16l-1.5-9-4 4L12 6l-2.5 7-4-4z"/>'),
  seal: ic('<circle cx="12" cy="10" r="5"/><path d="M9 14.5 7.5 21 12 19l4.5 2-1.5-6.5"/>'),
};
