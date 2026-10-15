# Әсем Жол

A racing game in the browser, set in Almaty, the mountains around it and, for New Year, in Astana.

There is a story of seven chapters. Asem gets a late order: hot baursaks to Shymbulak by sunrise. Each chapter is one lap of its own map with a finish line, checkpoints that add time and up to three stars for a fast run:

1. Almaty by night: Abay, Al-Farabi, up to Kok-Tobe and back along Dostyk.
2. The road to Medeu: snow, switchbacks, avalanche galleries, oncoming traffic.
3. Shymbulak at dawn: pink snow on the peaks, the cable car, the pass.
4. Kapchagay at sunset: steppe, trucks, yurts, camels, wind turbines and the lake.
5. Charyn: red table mountains, rock pillars and the ash grove.
6. Kolsai in the rain: autumn, the village of Saty with its blue windows, a spruce gorge, the road across Lake Kaindy between drowned trees, and herds of horses on the way to the lake. The wipers sweep the rain off every few seconds.
7. New Year in Astana: a night blizzard on the airport road, Baiterek, Khan Shatyr and the Nur Alem sphere on the skyline, firs with garlands, snowplows that throw snow at your windscreen, black ice that takes the steering away, and Ayaz Ata waving by the road.

Five friends race along in every run, each in their own car: Daur in a Skoda, Ora in a Sorento, Saken in a Kia, Era in a Volkswagen and Tima in a Changan. Their names float over the cars, they shout at you in Kazakh when you pass them or they pass you, and the HUD shows your place. The horn (H, or the button on a phone) makes people jump away early, slow cars move over and friends answer back. Traffic cops with radar guns stand behind a 200 sign: pass faster and you lose three seconds, pass at the limit and you get a little nitro. Flocks of sheep wander across the steppe and mountain roads; hitting one nearly stops the car, the horn sends the flock to the shoulders. Close calls, overtakes, legal passes, cleared flocks, clean sections and hot baursaks picked up from the road score style points with a combo multiplier; a crash or a fine breaks the combo. Points tick up quietly under the style total in the HUD, nothing pops up in the middle of the road. Twenty-one achievements, potholes and speed bumps with zebra crossings in the city, a melon truck on the Kapchagay highway that loses watermelons, fireworks over the night city, and the camera leans into the bends. A wedding convoy of white cars with ribbons and balloons honks its way through the city and the steppe: overtake all of it for confetti, bump into it and the balloons fly off. A black Lada with neon underneath weaves between the lanes and plays a tune on its horn when it passes you. Tumbleweeds roll across the steppe and canyon roads, puddles, slush and mud splash the windscreen until the wipers clear it, and an eagle glides over the mountains now and then. Overtakes, especially close ones, fill the nitro. Free ride gives endless laps on any map, with a best distance per map. The garage has seven cars, three of them open with stars, and twelve paint colours. Every map has its own generated music. People on the pavements shout and dive out of the way, and inflatable men, snowmen, cones and melon stalls fly when you hit them. The leaderboard has a shared board and private groups for friends; it runs on the small Cloudflare Worker in worker/.

Road settings (in the menu and in the pause menu) have three levels. Everyone starts on Calm, which is just traffic and friends; Fun keeps the wedding, the weaver and the tumbleweeds but drops the sheep, potholes and fines, Full chaos has everything. Every item can also be switched on its own, and so can speech bubbles and camera shake.

Plain canvas and JS modules, no build step, no images, no requests. Everything you see is drawn with canvas shapes. Progress stays in localStorage.

Controls: arrows or A/D to steer, down or space to brake, up, W or Shift for nitro, H for the horn, P to pause, M for sound. On a phone, hold the left or right half of the screen to steer, both halves to brake, and the round buttons for nitro and the horn. The gas is automatic. The menu and the HUD have a full screen button; iPhone Safari cannot do that for a page, so there the game is best added to the Home Screen, from where it opens without the browser bars.

Code: `js/maps.js` holds the maps, chapters, friends and cars, `js/track.js` the road and traffic, `js/render.js` the drawing, `js/sprites.js` every object and vehicle, `js/main.js` the game itself. The road uses the classic pseudo-3D segment projection; Jake Gordon's write-up of his javascript-racer explains it best.

Run it with any static server, for example `npx serve .` (modules do not load from `file://`). `?debug` exposes `window.__asem` for stepping the game by hand, `?og&map=kapchagay` renders the clean frame used for `og.png`.

Play counter: `js/pulse.js` sends anonymous events (open, race started, finished or out of time) to the play counter shared by all games on gamemetric.dev (`../stats/worker.js`). No cookies, no names, no IP addresses; a random id in localStorage tells new players from returning ones. Open the game once with `?nopulse` to stop counting your device.

Made by [TEMIRLAB](https://temirlab.com/) to lift your mood. All characters and events are fictional; any resemblance is coincidental.
