// Portal builds (tools/build-portal.mjs) set window.TABUN_PORTAL and start the portal's SDK before the game
// loads (window.TABUN_SDK). On gamemetric.dev both are unset and everything here does nothing.
// Playgama (Bridge): game_ready once the menu is up, gameplay started/stopped, the platform's sound and pause,
// a full-screen ad between levels (the Bridge keeps its own minimum gap).
// CrazyGames (SDK v3): loadingStop once the menu is up, gameplayStart/Stop, a midgame ad between levels,
// happytime on a won match, the portal's mute setting.
export const PORTAL = window.TABUN_PORTAL || null;
let sdk = null, bridge = null, cg = null;
function bind(s) {
  sdk = s;
  bridge = PORTAL === 'playgama' ? s : null;
  cg = PORTAL === 'crazygames' ? s : null;
}
bind(window.TABUN_SDK || null);

const say = (msg) => {
  try {
    const r = bridge.platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};
const safe = (fn) => {
  try {
    const r = fn();
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

let readySent = false, readyWanted = false;
export function portalReady() {
  readyWanted = true;
  if (readySent || !(bridge || cg)) return;
  readySent = true;
  if (bridge) say('game_ready');
  else safe(() => cg.game.loadingStop());
}

// called every frame with "is a match being played right now"; the portal hears only changes
let playing = false, started = false;
// end: 'win' or 'lose' when the match is over, 'quit' when left for the menu, nothing for a pause
export function portalGameplay(on, end) {
  if (!(bridge || cg)) return;
  on = on && !portalHold();
  if (on === playing) {
    if (!on && end && started && bridge) {
      say(end === 'win' ? 'level_completed' : 'level_failed');
      started = false;
    }
    return;
  }
  playing = on;
  if (cg) {
    safe(() => (on ? cg.game.gameplayStart() : cg.game.gameplayStop()));
    return;
  }
  if (on) {
    say(started ? 'level_resumed' : 'level_started');
    started = true;
  } else if (end) {
    say(end === 'win' ? 'level_completed' : 'level_failed');
    started = false;
  } else say('level_paused');
}

// a match won: CrazyGames' little celebration
export function portalHappy() {
  if (cg) safe(() => cg.game.happytime());
}

// an ad on screen or the platform's own pause: the run stands still meanwhile
let adOn = false, platformPaused = false;
const holdFns = [];
function setHold(ad, paused) {
  const was = adOn || platformPaused;
  adOn = ad;
  platformPaused = paused;
  if (!was && (adOn || platformPaused)) for (const fn of holdFns) safe(fn);
}
export const portalHold = () => adOn || platformPaused;
// fn() when an ad opens or the platform pauses the game
export function onPortalHold(fn) {
  holdFns.push(fn);
}
function holdEvents() {
  if (bridge)
    try {
      bridge.advertisement.on(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (s) => {
        if (s === 'opened') setHold(true, platformPaused);
        else if (s === 'closed' || s === 'failed') setHold(false, platformPaused);
        if (s === 'opened') lastAdAt = performance.now();
      });
      bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, (s) => {
        if (s === 'opened') { setHold(true, platformPaused); lastAdAt = performance.now(); }
        else if (s === 'closed' || s === 'failed') setHold(false, platformPaused);
        if (s === 'rewarded' && rewardFn) { const f = rewardFn; rewardFn = null; f(); }
        if ((s === 'closed' || s === 'failed') && rewardEnd) { const f = rewardEnd; rewardEnd = null; rewardFn = null; f(s === 'failed'); }
      });
      bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => setHold(adOn, !!p));
    } catch {
      /* no events */
    }
}
// any ad seen (forced or chosen) buys the player a quiet stretch: no forced ad within QUIET ms of it
let lastAdAt = -1e9, rewardFn = null, rewardEnd = null;
const QUIET = 90000;
holdEvents();

// «×2 for an ad» on the results: only where the platform has rewarded ads (Playgama)
export const portalRewardedOk = () => {
  try {
    return !!bridge && bridge.advertisement.isRewardedSupported !== false;
  } catch {
    return false;
  }
};
// onReward() once the ad was watched to the end; onEnd(failed) when it is gone either way
export function portalRewarded(onReward, onEnd) {
  if (!portalRewardedOk()) return onEnd(true);
  rewardFn = onReward;
  rewardEnd = onEnd;
  try {
    const r = bridge.advertisement.showRewarded('double_coins');
    if (r && r.catch) r.catch(() => {});
  } catch {
    rewardFn = rewardEnd = null;
    onEnd(true);
  }
}

// between levels: a full-screen ad if the platform has one (it decides the timing); mute(true/false) around it
let muteForAd = () => {};
export function portalInterstitial() {
  if (performance.now() - lastAdAt < QUIET) return;
  if (bridge) {
    safe(() => bridge.advertisement.showInterstitial('level_end'));
    return;
  }
  if (cg) {
    safe(() =>
      cg.ad.requestAd('midgame', {
        adStarted: () => {
          setHold(true, false);
          muteForAd(true);
        },
        adFinished: () => {
          setHold(false, false);
          muteForAd(false);
        },
        adError: () => {
          setHold(false, false);
          muteForAd(false);
        },
      }),
    );
  }
}

// fn(muted) whenever the platform's sound, its pause, an ad or a hidden tab should silence the game
let muteFn = null;
export function onPortalMute(fn) {
  muteFn = fn;
  if (cg) {
    const st = { setting: false, ad: false };
    const tell = () => fn(st.setting || st.ad);
    muteForAd = (on) => {
      st.ad = on;
      tell();
    };
    try {
      st.setting = !!cg.game.settings.muteAudio;
      cg.game.addSettingsChangeListener((s) => {
        st.setting = !!s.muteAudio;
        tell();
      });
    } catch {
      /* no settings */
    }
    tell();
    return;
  }
  if (!bridge) return;
  const b = bridge;
  const st = { audio: true, ad: false, paused: false, hidden: document.hidden };
  const tell = () => fn(!st.audio || st.ad || st.paused || st.hidden);
  document.addEventListener('visibilitychange', () => {
    st.hidden = document.hidden;
    tell();
  });
  try {
    st.audio = b.platform.isAudioEnabled !== false;
    b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => {
      st.audio = on !== false;
      tell();
    });
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => {
      st.paused = !!p;
      tell();
    });
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (s) => {
      st.ad = s === 'opened';
      tell();
    });
    b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (s) => {
      if (s === 'opened') st.ad = true;
      else if (s === 'closed' || s === 'failed') st.ad = false;
      tell();
    });
  } catch {
    /* no events: the volume setting still works */
  }
  tell();
}

// the SDK started after the game had already loaded: hook it up now
addEventListener('tabun-sdk', () => {
  if (sdk || !window.TABUN_SDK) return;
  bind(window.TABUN_SDK);
  holdEvents();
  if (muteFn) onPortalMute(muteFn);
  // the menu is already up (CrazyGames never heard loadingStart, so no loadingStop either)
  if (readyWanted && bridge) portalReady();
  playing = false;
});

// Custom events for the Playgama dashboard (Bridge analytics): level results, nothing else and nowhere else.
const opened = performance.now();
export function track(name, params = {}) {
  if (!bridge) return;
  try {
    if (!bridge.analytics || !bridge.analytics.send) return;
    const r = bridge.analytics.send(name, { ...params, min: Math.floor((performance.now() - opened) / 60000) });
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* counting never breaks the game */
  }
}

