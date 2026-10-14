# gamemetric.dev

**Жекпе-жек**: a browser fighting game, one on one, with Kazakh characters and no blood. Knockouts end with stars over the head or a trip into the sky, the finishers are silly on purpose.

Fighters: Batyr (shield and lasso), Apa (ladle, kazan and baursaks), the eagle hunter Burkitshi, the dombra player, the taxi driver with a white Camry, the kures wrestler Baluan, the aitys poet Akyn, and the giant Dau as the arcade boss (playable once the arcade is cleared). Arenas: an aul at sunset, the Medeu ice rink (slippery), Kok-Tobe at night, the Charyn canyon, the bazaar and a boulevard in Astana, with a sheep, tumbleweeds, watermelons or a gust of steppe wind now and then.

Modes: arcade (six fights and Dau, a story and an ending for every fighter, scores and local records), versus the computer on three levels, two players on one keyboard or with gamepads, online with a friend over WebRTC (no server: a link with an offer and an answer code back, a public Google STUN server only helps the browsers find each other; rollback with a two-frame delay, so ping is barely felt), training with a dummy and hitboxes, a replay of the last round. Stars unlock big heads, gold costumes, turbo, the Dostyq finisher and Dau.

Plain ES modules in `js/`, no build step, no images. Everything is drawn on canvas, sound and music are made with WebAudio, the announcer uses the browser's speech synthesis.

- `js/fight.js`: the fight (fighters, moves, specials, finishers, hazards, rounds), no DOM, deterministic
- `js/fighters.js`: fighter data, frame data, phrases, stories
- `js/pose.js`, `js/looks.js`, `js/paint.js`, `js/draw.js`: skeleton, poses, what everyone looks like, effects
- `js/arena.js`: the six arenas and the crowd
- `js/ai.js`: the computer opponent
- `js/arcade.js`, `js/online.js`, `js/server.js`, `js/voice.js`, `js/input.js`, `js/audio.js`, `js/music.js`
- `js/main.js`: menus, HUD, camera, loop

Run it with any static server (modules don't load from `file://`). `?debug` exposes `window.__fight` to step frames, press buttons and freeze the loop, `?boxes` shows hitboxes, `?og` renders the frame used for `og.png`.

The server is optional. `worker/worker.js` is a Cloudflare Worker with one KV namespace: shared arcade records and six-letter room codes, so friends don't have to pass the long WebRTC codes around. Deploy it with `node worker/deploy.mjs <file with a Cloudflare API token>` and put the printed address into `PROD` in `js/server.js`. Until then records stay on the device and online play uses the long link. `node tools/mock-api.mjs 8788` runs the same worker locally with an in-memory KV, then open the game with `?api=http://localhost:8788`. `?lag=120` delays every online message to try the rollback.

The reaction test that used to be the home page lives in [`/test/`](https://gamemetric.dev/test/).
