# gamemetric.dev

Free browser games by TEMIRLAB, no download and no sign-up. The home page is a list of the games; each game is a folder of plain ES modules with no build step.

- [`/oyu/`](https://gamemetric.dev/oyu/): **Ою**, a pixel puzzle. Colored shooters ride a belt around a picture and knock out pixels of their own color; finished pictures become patches of a carpet. Levels are generated from a known solution (the picture is peeled lap by lap, each lap becomes a shooter, shooters are dealt into queues keeping their order), so every level can be won. `oyu/tools/bot.js` plays them for tuning. `node oyu/tools/test.mjs` checks the whole game in headless Chrome; `node oyu/tools/build-portal.mjs` makes the CrazyGames build in `dist/`, `node oyu/tools/covers.mjs --ffmpeg <path>` renders its covers and videos.
- [`/asem/`](https://gamemetric.dev/asem/): **Әсем Жол**, a racing game through Almaty and around Kazakhstan, see [asem/README.md](asem/README.md). It used to live at asemface.com, which now forwards here and brings the player's saves along.
- [`/jekpe/`](https://gamemetric.dev/jekpe/): **Жекпе-жек**, a fighting game with Kazakh characters and no blood, see [jekpe/README.md](jekpe/README.md). It used to be the home page; old online room links (`/#room=...`) are forwarded.
- [`/test/`](https://gamemetric.dev/test/): a gamer brain test (reaction, aim, clicks, memory).

The list itself is `index.html`, `hub.css` and `hub.js`; card pictures and the short clips that play on hover are in `img/`.

Play counter: every game sends anonymous events (open, start, win/fail) to `stats/worker.js`, a Cloudflare Worker with one SQLite Durable Object that keeps daily totals. No cookies, no names, no IP addresses; a random id in localStorage tells new players from returning ones. Open a game once with `?nopulse` to stop counting your device. `node stats/deploy.mjs <token file> <key file>` updates the worker, `node stats/report.mjs <key file> [days]` prints the numbers.

Code under the MIT license.
