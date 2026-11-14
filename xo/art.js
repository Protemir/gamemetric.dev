// The marks, and the finished little board that decorates the menu and the pictures made by tools/art.html.

// Both marks live in a 100×100 box. pathLength="1" lets one dash animation draw any of them.
export const MARK = {
  x: '<path pathLength="1" d="M26 26L74 74"/><path pathLength="1" d="M74 26L26 74"/>',
  o: '<path pathLength="1" d="M50 25.5a24.5 24.5 0 1 1 0 49 24.5 24.5 0 1 1 0-49z"/>',
};

// in the order they were played, so they can be drawn one after another
const MOVES = [[0, 'x'], [1, 'o'], [2, 'x'], [5, 'o'], [4, 'x'], [7, 'o'], [8, 'x']];
const STEP = 104; // a 92 px tile and a 12 px gap
const FIRST = 0.3; // seconds before the first mark
const PACE = 0.17; // seconds between marks

export function boardArt() {
  const x = (i) => (i % 3) * STEP;
  const y = (i) => Math.floor(i / 3) * STEP;
  let tiles = '';
  for (let i = 0; i < 9; i++) tiles += `<rect x="${x(i)}" y="${y(i)}" width="92" height="92" rx="21"/>`;
  // a mark box is 100 wide and a tile 92, hence the 4
  const marks = MOVES.map(([i, m], k) => `<g class="m ${m}" style="--d:${(FIRST + k * PACE).toFixed(2)}s" transform="translate(${x(i) - 4} ${y(i) - 4})">${MARK[m]}</g>`).join('');
  const strike = `<path class="win" pathLength="1" style="--d:${(FIRST + MOVES.length * PACE + 0.12).toFixed(2)}s" d="M24 24L276 276"/>`;
  return `<svg viewBox="-12 -12 324 324" aria-hidden="true"><g class="tiles">${tiles}</g>${marks}${strike}</svg>`;
}
