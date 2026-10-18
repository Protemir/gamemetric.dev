// Small drawn portraits for the people who speak, until painted ones arrive.
const face = (skin = '#e2b48c') => `<ellipse cx="32" cy="36" rx="12" ry="14" fill="${skin}"/>
  <circle cx="27.5" cy="35" r="1.6" fill="#2a1a10"/><circle cx="36.5" cy="35" r="1.6" fill="#2a1a10"/>`;
// every portrait needs its own gradient id: inline SVGs on one page share ids
let uid = 0;
const frame = (bg, body) => {
  const id = 'av' + uid++;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="url(#${id})"/>${body}</svg>`;
};

const PEOPLE = {
  // Aria: a tall white saukele with red and gold, braids
  aria: frame(['#9d7be0', '#4b2d7d'], `
    <path d="M14 64c2-12 9-17 18-17s16 5 18 17z" fill="#6b3fb0"/>
    <path d="M20 40c-3 8-2 16-4 22h6c0-7 1-13 1-20zM44 40c3 8 2 16 4 22h-6c0-7-1-13-1-20z" fill="#2c1a12"/>
    ${face()}
    <path d="M20 31c1-6 6-9 12-9s11 3 12 9c-4-2-8-3-12-3s-8 1-12 3z" fill="#2c1a12"/>
    <path d="M22 26L27 4h10l5 22z" fill="#f6f0e4" stroke="#c9a24a" stroke-width="1.2"/>
    <path d="M25 18h14M24 22h16" stroke="#b8322a" stroke-width="2"/>
    <circle cx="32" cy="5" r="2.5" fill="#d8b04a"/>
    <path d="M28.5 42q3.5 2 7 0" stroke="#8a3a2a" stroke-width="1.4" fill="none"/>`),
  // Karasai: a pointed iron helmet with a red plume, a heavy moustache
  karasai: frame(['#b04a3a', '#4a120c'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#3b2a22"/>
    <path d="M14 64c3-10 9-14 18-14s15 4 18 14" fill="none" stroke="#8a8f96" stroke-width="3"/>
    ${face('#c99472')}
    <path d="M24 42q8-5 16 0q-2 4-8 3q-6 1-8-3z" fill="#24160e"/>
    <path d="M18 32q0-14 14-22q14 8 14 22z" fill="#8a8f96" stroke="#4a4e54" stroke-width="1.4"/>
    <path d="M18 32h28" stroke="#c9a24a" stroke-width="2.4"/>
    <path d="M32 10q4-8 0-9q-5 3 0 9z" fill="#c43a2c"/>`),
  // Temir: a fox-fur borik, a short beard
  temir: frame(['#e8c069', '#7a5212'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#2f5a7a"/>
    <path d="M26 50l6 6 6-6" fill="none" stroke="#d8b04a" stroke-width="2"/>
    ${face()}
    <path d="M22 42q10 10 20 0q-1 7-10 8q-9-1-10-8z" fill="#3a2416"/>
    <path d="M17 30q2-16 15-17q13 1 15 17z" fill="#a8582a"/>
    <path d="M16 31q16-6 32 0" stroke="#e8d2a8" stroke-width="5" stroke-linecap="round" fill="none"/>`),
  // Zaltyr: a hood, a sharp look, a scar
  zaltyr: frame(['#5a6a4a', '#1e2618'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#3d4a30"/>
    ${face('#c99472')}
    <path d="M14 40q0-26 18-28q18 2 18 28q-4-14-18-16q-14 2-18 16z" fill="#2c3622"/>
    <path d="M24 33l6 1M34 34l6-1" stroke="#2a1a10" stroke-width="1.6"/>
    <path d="M38 38l3 6" stroke="#8a4a3a" stroke-width="1.2"/>
    <path d="M27 44q5 2 10 0" stroke="#3a2416" stroke-width="1.4" fill="none"/>`),
  // Sarman: a white turban, a rich chapan, a trimmed beard
  sarman: frame(['#c9a06a', '#5a3a12'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#7a2a4a"/>
    <path d="M24 50l8 14 8-14" fill="#d8b04a"/>
    ${face()}
    <path d="M23 43q9 9 18 0q-2 6-9 6q-7 0-9-6z" fill="#3a2416"/>
    <path d="M17 30q0-14 15-15q15 1 15 15q-15-6-30 0z" fill="#f4efe2" stroke="#c9b48a"/>
    <circle cx="32" cy="20" r="2.4" fill="#2a7a6a"/>`),
  // Orazbai: the elder, a tall fur hat, a long white beard, a staff
  orazbai: frame(['#8a7a5a', '#2e2618'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#4a3a6a"/>
    ${face('#d9a882')}
    <path d="M21 40q11 26 22 0q-3 5-11 5q-8 0-11-5z" fill="#f4f2ec"/>
    <path d="M20 31q1-20 12-21q11 1 12 21q-12-5-24 0z" fill="#7a5232"/>
    <path d="M19 31q13-6 26 0" stroke="#e8d8b8" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M52 64V22" stroke="#6a4a2a" stroke-width="2.4"/>`),
  scouts: frame(['#6a7a5a', '#2a3420'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#4a5a3a"/>${face('#c99472')}
    <path d="M18 31q14-14 28 0q-14-5-28 0z" fill="#3a3020"/>`),
  merchants: frame(['#c9a06a', '#6a4a22'], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="#7a3a5a"/>${face()}
    <path d="M18 30q2-12 14-12t14 12q-14-4-28 0z" fill="#f2e6cc"/><path d="M24 42q8 6 16 0" stroke="#3a2416" stroke-width="3" fill="none"/>`),
};

// an elder of a tribe: a white felt kalpak and a long beard, in the tribe's colour
export function elder(rgb) {
  const c = `rgb(${rgb.join(',')})`;
  return frame([c, `rgb(${rgb.map((v) => (v * 0.4) | 0).join(',')})`], `
    <path d="M12 64c2-13 10-18 20-18s18 5 20 18z" fill="${c}" stroke="#2a1a10" stroke-opacity=".3"/>
    ${face('#d9a882')}
    <path d="M22 40q10 22 20 0q-3 4-10 4q-7 0-10-4z" fill="#eeeae2"/>
    <path d="M19 31l5-17h16l5 17q-13-4-26 0z" fill="#f4efe2" stroke="#9a8a6a"/>
    <path d="M19 31q13-5 26 0" stroke="#2a1a10" stroke-width="2" fill="none"/>`);
}

// each copy on the page gets its own gradient id: a hidden copy would otherwise own the shared one
let copy = 0;
const fresh = (svg) => { const k = ++copy; return svg.replace(/av(\d+)/g, (_, n) => `av${n}_${k}`); };
export const avatar = (who) => fresh(PEOPLE[who] || PEOPLE.temir);

// the opening picture: a saddled horse alone on the steppe at dusk
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
