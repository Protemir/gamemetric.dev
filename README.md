# gamemetric.dev

**Жекпе-жек**: a browser fighting game, one on one, with Kazakh characters. Batyr with a shield and a lasso against Apa with a ladle and hot baursaks. Rounds, combos, throws, a computer opponent with three levels, two players on one keyboard, touch controls on phones. No blood: knockouts end with stars over the head, and the finishers are an eagle that carries the loser away and a kara zhorga dance until they drop.

Plain ES modules in `js/`, no build step, no images, no requests. Everything is drawn on canvas, sound and music are made with WebAudio.

- `js/fight.js`: the fight itself (fighters, moves, hitboxes, rounds), no DOM
- `js/fighters.js`: fighter data, frame data, phrases
- `js/pose.js`, `js/draw.js`: skeleton, poses and drawing
- `js/arena.js`: the aul at sunset and the crowd
- `js/ai.js`: the computer opponent
- `js/main.js`: menus, HUD, camera, loop

Run it with any static server (modules don't load from `file://`). `?debug` exposes `window.__fight` to step frames and press buttons by hand, `?boxes` shows hitboxes, `?og` renders the frame used for `og.png`.

The reaction test that used to be the home page lives in [`/test/`](https://gamemetric.dev/test/): reaction, aim, clicks per second and memory, with a rank and a challenge link.

`og.png`, `icon-180.png` and `test/og.png` are headless Chrome screenshots of `?og`, `tools/icon.html` and `tools/og-test.html`.
