# gamemetric.dev

Four small browser tests: reaction time, aim, clicks per second and sequence memory. At the end you get a game-style rank (Iron to Grandmaster) and a link you can send to a friend so they can try to beat you.

Plain HTML, CSS and JS, no build step, no requests to anything. Results stay in localStorage and in the `#c=...` part of the share link.

Run locally with any static server, for example `npx serve .`, and open the page.

Rank thresholds live in `CURVES` at the top of `app.js`. They are rough, based on typical results from public browser tests, so if they feel off, open an issue.

`og.png` and `icon-180.png` are screenshots of `tools/og.html` and `tools/icon.html` from headless Chrome.
