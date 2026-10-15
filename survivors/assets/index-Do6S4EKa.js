var td=Object.defineProperty;var ed=(s,t,e)=>t in s?td(s,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[t]=e;var S=(s,t,e)=>ed(s,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=e(i);fetch(i.href,r)}})();let Kt=null,ya,Fs,Mn,sl,ic=!0,Du=!0,Nu=!1,sc=!1;const so={};function $c(){try{if(!Kt){const s=window.AudioContext||window.webkitAudioContext;if(!s)return;Kt=new s,ya=Kt.createGain(),ya.connect(Kt.destination);const t=Kt.createDynamicsCompressor();t.threshold.value=-14,t.ratio.value=4,t.connect(ya),Fs=Kt.createGain(),Fs.connect(t),Mn=Kt.createGain(),Mn.gain.value=.32,Mn.connect(t),sl=Kt.createBuffer(1,Kt.sampleRate*1,Kt.sampleRate);const e=sl.getChannelData(0);for(let n=0;n<e.length;n++)e[n]=Math.random()*2-1;zr()}Kt.state==="suspended"&&!sc&&Kt.resume()}catch{Kt=null}}function zr(){if(!Kt)return;const s=Kt.currentTime;ya.gain.setTargetAtTime(Nu||sc?0:1,s,.02),Fs.gain.setTargetAtTime(ic?.9:0,s,.02),Mn.gain.setTargetAtTime(Du?.32:0,s,.05)}function nd(s){ic=s,zr()}function id(s){Du=s,zr()}function Yc(s){Nu=s,zr()}function Ca(s){if(sc=s,!!Kt){zr();try{s?Kt.suspend():Kt.resume()}catch{}}}function rc(s,t,e,n,i){s.gain.setValueAtTime(1e-4,t),s.gain.exponentialRampToValueAtTime(n,t+e),s.gain.exponentialRampToValueAtTime(1e-4,t+e+i)}function $t(s,t,e,n,i,r=0,a){if(!Kt)return;const o=Kt.currentTime+r,l=Kt.createOscillator(),c=Kt.createGain();l.type=s,l.frequency.setValueAtTime(t,o),e!==t&&l.frequency.exponentialRampToValueAtTime(Math.max(20,e),o+n),rc(c,o,.005,i,n),l.connect(c),c.connect(a||Fs),l.start(o),l.stop(o+n+.05)}function rn(s,t,e,n,i="bandpass",r=0,a=1,o){if(!Kt)return;const l=Kt.currentTime+r,c=Kt.createBufferSource();c.buffer=sl;const h=Kt.createBiquadFilter();h.type=i,h.Q.value=a,h.frequency.setValueAtTime(e,l),h.frequency.exponentialRampToValueAtTime(Math.max(30,n),l+s);const f=Kt.createGain();rc(f,l,.004,t,s),c.connect(h),h.connect(f),f.connect(o||Fs),c.start(l,Math.random()*.5),c.stop(l+s+.05)}function se(s,t=1,e=1){if(!Kt||!ic||t<=.02)return;const n=Kt.currentTime,i=s==="coin"?.03:.05;if(so[s]&&n-so[s]<i)return;so[s]=n;const r=Math.min(1,t),a=e;switch(s){case"jump":$t("square",280*a,620*a,.12,.09*r),$t("sine",560*a,1240*a,.12,.08*r);break;case"superjump":$t("sine",260,1300,.35,.18*r),$t("triangle",520,2e3,.3,.08*r,.03);break;case"land":$t("sine",140,55,.12,.3*r),rn(.08,.12*r,600,200,"lowpass");break;case"dash":rn(.22,.32*r,700,3200,"bandpass",0,1.2),$t("sine",300,180,.15,.08*r);break;case"hit":$t("triangle",260*a,90*a,.18,.4*r),rn(.07,.35*r,2500,600,"bandpass",0,.8),$t("square",1200*a,900*a,.04,.05*r);break;case"bump":$t("sine",320*a,160*a,.12,.2*r);break;case"boing":if(!Kt)return;{const o=Kt.currentTime,l=Kt.createOscillator(),c=Kt.createGain();l.type="sine",l.frequency.setValueAtTime(180,o),l.frequency.exponentialRampToValueAtTime(560,o+.08),l.frequency.exponentialRampToValueAtTime(260,o+.3);const h=Kt.createOscillator(),f=Kt.createGain();h.frequency.value=28,f.gain.value=40,h.connect(f),f.connect(l.frequency),rc(c,o,.005,.35*r,.35),l.connect(c),c.connect(Fs),l.start(o),h.start(o),l.stop(o+.4),h.stop(o+.4)}break;case"launch":$t("sawtooth",160,1200,.38,.07*r),$t("sine",200,1400,.38,.2*r),rn(.35,.12*r,400,4e3,"bandpass");break;case"coin":$t("square",988*a,988*a,.06,.06*r),$t("square",1319*a,1319*a,.14,.06*r,.06),$t("sine",1976*a,1976*a,.14,.05*r,.06);break;case"power":[523,659,784,1047,1319].forEach((o,l)=>$t("triangle",o,o,.12,.13*r,l*.05)),$t("sine",2093,2093,.3,.05*r,.25);break;case"shieldPop":rn(.15,.3*r,5e3,1500,"highpass"),$t("sine",1600,300,.2,.15*r);break;case"shock":$t("sine",110,35,.6,.55*r),rn(.5,.4*r,1800,120,"lowpass");break;case"whoosh":rn(.35,.25*r,300,1600,"bandpass",0,2);break;case"warn":$t("square",880,880,.1,.07*r),$t("square",660,660,.12,.07*r,.13);break;case"alarm":[0,.18,.36].forEach(o=>$t("sawtooth",700,520,.15,.06*r,o));break;case"crumble":rn(.7,.3*r,300,60,"lowpass"),$t("sine",60,40,.5,.25*r);break;case"thud":$t("sine",90,35,.35,.6*r),rn(.2,.25*r,800,100,"lowpass");break;case"wallup":rn(.5,.25*r,200,900,"bandpass",0,3),$t("sawtooth",70,110,.45,.06*r);break;case"fall":$t("sine",1400*a,260*a,.9,.16*r);break;case"pop":$t("sine",900*a,300*a,.1,.12*r);break;case"splash":rn(.5,.35*r,3e3,400,"highpass"),rn(.3,.25*r,600,200,"lowpass",.05);break;case"count":$t("square",660,660,.14,.12*r),$t("sine",1320,1320,.14,.05*r);break;case"go":[523,784,1047].forEach(o=>$t("square",o,o,.35,.09*r)),$t("sine",2093,2093,.4,.06*r);break;case"win":[523,659,784,1047,784,1047,1319].forEach((o,l)=>{$t("square",o,o,l===6?.6:.14,.09*r,l*.12),$t("triangle",o/2,o/2,l===6?.6:.14,.12*r,l*.12)});break;case"lose":[392,370,349,330].forEach((o,l)=>$t("sawtooth",o*.5,l===3?o*.42:o*.5,l===3?.7:.28,.08*r,l*.3));break;case"ko":$t("square",1047,1047,.08,.08*r),$t("square",1568,1568,.2,.08*r,.08);break;case"dodge":$t("sine",700,1400,.12,.1*r);break;case"click":$t("square",900,700,.04,.06*r);break;case"buy":[784,988,1175,1568].forEach((o,l)=>$t("square",o,o,.1,.07*r,l*.06));break}}const sd=[[48,52,55],[43,47,50],[45,48,52],[41,45,48]],Zc=[0,2,4,7,9,12,14,16];let zi=-1,Gs=0,Sa=0,Kc=null,Pa=[];const Un=s=>440*Math.pow(2,(s-69)/12);function Jc(){Pa=[];for(let s=0;s<32;s++)Pa.push(Math.random()<.55?Zc[Math.floor(Math.random()*Zc.length)]:-1)}function rd(s){if(!Kt)return;const t=Math.floor(Sa/16)%4,e=Sa%16,n=sd[t],i=s-Kt.currentTime,r=zi;if(r>=1&&(e%4===0&&$t("sine",150,45,.16,.5,i,Mn),e%8===4&&rn(.12,.22,2500,1200,"bandpass",i,.7,Mn),(e%2===0||r>=2)&&rn(.03,r>=2?.09:.06,9e3,7e3,"highpass",i,1,Mn)),e%2===0){const o=n[0]-12+(e%8===6?7:0);$t("triangle",Un(o),Un(o),.18,r===0?.12:.2,i,Mn)}if(e%4===2&&r>=1)for(const o of n)$t("square",Un(o+12),Un(o+12),.09,.025,i,Mn);if(r===0&&e===0)for(const o of n)$t("sine",Un(o+12),Un(o+12),1.6,.05,i,Mn);const a=Pa[Sa%32|0];if(r>=1&&a>=0&&e%2===0){const o=72+a+(r>=2?12:0);$t("square",Un(o),Un(o),.12,.03,i,Mn),$t("sine",Un(o),Un(o),.16,.04,i,Mn)}}function ro(s){s!==zi&&(zi<1&&s>=1&&Jc(),zi=s,Pa.length||Jc(),Kc||(Kc=setInterval(()=>{if(!Kt||Kt.state!=="running"||zi<0)return;const e=60/(zi>=2?150:zi===1?132:100)/4;for(Gs<Kt.currentTime&&(Gs=Kt.currentTime+.05);Gs<Kt.currentTime+.12;)rd(Gs),Gs+=e,Sa++},30)))}const Os=typeof window<"u"&&window.NS_PORTAL||null;let He=null,Qc=!1,jc=0;async function ad(){if(Os!=="crazygames")return;const s=window.CrazyGames?.SDK;if(s)try{if(await Promise.race([s.init(),new Promise((t,e)=>setTimeout(()=>e(new Error("timeout")),5e3))]),s.environment==="disabled")return;He=s}catch{He=null}}function Br(s){try{s()}catch{}}function th(s){He&&Br(()=>s?He.game.loadingStart():He.game.loadingStop())}function od(s){!He||s===Qc||(Qc=s,Br(()=>s?He.game.gameplayStart():He.game.gameplayStop()))}function ld(){He&&Br(()=>He.game.happytime())}function cd(){try{return He?.user.systemInfo?.locale||null}catch{return null}}function hd(){He&&Br(()=>{Yc(!!He.game.settings.muteAudio),He.game.addSettingsChangeListener(s=>Yc(!!s.muteAudio))})}function ud(){return He?.data||null}function fd(){return!He||Date.now()-jc<18e4?Promise.resolve():new Promise(s=>{let t=!1;const e=()=>{t||(t=!0,Ca(!1),s())},n=setTimeout(e,4e3);Br(()=>He.ad.requestAd("midgame",{adStarted:()=>{clearTimeout(n),jc=Date.now(),Ca(!0)},adFinished:e,adError:e}))})}const dd={common:60,rare:180,epic:450,legendary:1e3},pd={common:"#9fb4c7",rare:"#3fa9ff",epic:"#b45cff",legendary:"#ffb21e"},hi=[{id:"rookie",name:["Rookie","Новичок"],tier:"common",suit:"#ff7a3d",trim:"#ffd1a8",skin:"#ffe0bd",pants:"#3b4a6b",shoes:"#ffffff"},{id:"bubblegum",name:["Bubblegum","Жвачка"],tier:"common",suit:"#ff6fb1",trim:"#ffd0e6",skin:"#ffe6d1",pants:"#7b3fa0",shoes:"#fff2a8"},{id:"minty",name:["Minty","Мятный"],tier:"common",suit:"#3fd6a6",trim:"#d8fff0",skin:"#f6d7b8",pants:"#24566b",shoes:"#ff6a5c"},{id:"skyboy",name:["Sky Runner","Небесный"],tier:"common",suit:"#4fb8ff",trim:"#e2f4ff",skin:"#e9c49f",pants:"#ffffff",shoes:"#ff9f1c"},{id:"grape",name:["Grape Soda","Виноград"],tier:"common",suit:"#8b5cf6",trim:"#ddd0ff",skin:"#ffd9c2",pants:"#2a2140",shoes:"#ffe14d"},{id:"tomato",name:["Tomato","Помидор"],tier:"common",suit:"#f0433a",trim:"#4bb84b",skin:"#ffe2c4",pants:"#8a1d17",shoes:"#4bb84b"},{id:"banana",name:["Banana Split","Банан"],tier:"rare",suit:"#ffe066",trim:"#ff8fb3",skin:"#d9a679",pants:"#6b3f2a",shoes:"#ffffff"},{id:"tux",name:["Fancy Pants","Франт"],tier:"rare",suit:"#22252e",trim:"#f4f4f4",skin:"#ffe0bd",pants:"#22252e",shoes:"#c22b55"},{id:"astro",name:["Astro Noob","Космонуб"],tier:"rare",suit:"#f2f5f8",trim:"#ff7a1a",skin:"#ffe0bd",pants:"#b7c3cf",shoes:"#4a5563"},{id:"melon",name:["Watermelon","Арбуз"],tier:"rare",suit:"#2fbf5b",trim:"#ff5d73",skin:"#ffe3cc",pants:"#11612e",shoes:"#ff5d73"},{id:"ninja",name:["Sneaky Noob","Ниндзя-нуб"],tier:"rare",suit:"#2b2f45",trim:"#e63946",skin:"#ecc8a5",pants:"#2b2f45",shoes:"#e63946"},{id:"zombie",name:["Sleepy Zombie","Сонный зомби"],tier:"epic",suit:"#6c7f9e",trim:"#94c46a",skin:"#a6d38a",pants:"#4a3b2f",shoes:"#2e2e2e"},{id:"robot",name:["Robo Noob","Робонуб"],tier:"epic",suit:"#aeb8c4",trim:"#4cc9f0",skin:"#d6dde5",pants:"#5c6773",shoes:"#4cc9f0"},{id:"lava",name:["Lava Lamp","Лава"],tier:"epic",suit:"#2a1a1f",trim:"#ff6b1a",skin:"#ffc59e",pants:"#3d1f12",shoes:"#ff6b1a",fx:"lava"},{id:"rainbow",name:["Rainbow Rush","Радуга"],tier:"legendary",suit:"#ff4d6d",trim:"#ffffff",skin:"#ffe0bd",pants:"#ffffff",shoes:"#ffffff",fx:"rainbow"},{id:"gold",name:["Golden Noob","Золотой нуб"],tier:"legendary",suit:"#ffc93c",trim:"#fff1b8",skin:"#ffd88a",pants:"#e0a21a",shoes:"#fff1b8",fx:"gold"},{id:"galaxy",name:["Galaxy Brain","Галактика"],tier:"legendary",suit:"#3a1c71",trim:"#d76d77",skin:"#ffd6e0",pants:"#1b1036",shoes:"#ffaf7b",fx:"galaxy"}],qi=[{id:"none",name:["No hat","Без шапки"],tier:"common"},{id:"propeller",name:["Propeller Cap","Кепка-пропеллер"],tier:"common"},{id:"party",name:["Party Hat","Колпак"],tier:"common"},{id:"beanie",name:["Pom Beanie","Шапка с помпоном"],tier:"common"},{id:"cone",name:["Traffic Cone","Дорожный конус"],tier:"rare"},{id:"chef",name:["Chef Hat","Поварской колпак"],tier:"rare"},{id:"tophat",name:["Top Hat","Цилиндр"],tier:"rare"},{id:"plunger",name:["Plunger","Вантуз"],tier:"rare"},{id:"viking",name:["Viking Helmet","Шлем викинга"],tier:"epic"},{id:"unicorn",name:["Unicorn Horn","Рог единорога"],tier:"epic"},{id:"banana",name:["Banana","Банан на голове"],tier:"epic"},{id:"crown",name:["Crown","Корона"],tier:"legendary"},{id:"halo",name:["Halo","Нимб"],tier:"legendary"}],$i=[{id:"none",name:["No trail","Без следа"],tier:"common",colors:[],kind:"none"},{id:"dust",name:["Dust","Пыль"],tier:"common",colors:["#e9dcc9","#d9c7ad"],kind:"puff"},{id:"bubbles",name:["Bubbles","Пузыри"],tier:"common",colors:["#bdeeff","#e8fbff"],kind:"bubble"},{id:"hearts",name:["Love","Сердечки"],tier:"rare",colors:["#ff4d8d","#ff9cc2"],kind:"heart"},{id:"sparks",name:["Sparkles","Искры"],tier:"rare",colors:["#fff27a","#ffffff","#ffd23f"],kind:"spark"},{id:"fire",name:["Hot Feet","Горячие пятки"],tier:"epic",colors:["#ff4500","#ff9500","#ffd000"],kind:"fire"},{id:"confetti",name:["Confetti","Конфетти"],tier:"epic",colors:["#ff4d6d","#ffd23f","#3ddc97","#4fb8ff","#b45cff"],kind:"confetti"},{id:"rainbow",name:["Rainbow","Радуга"],tier:"legendary",colors:["#ff3b3b","#ff9f1c","#ffe14d","#3ddc97","#4fb8ff","#8b5cf6"],kind:"puff"}],md={skin:"rookie",hat:"propeller",trail:"dust"},Uu=["rookie","propeller","none","dust"],rl=s=>hi.find(t=>t.id===s)||hi[0],gd=s=>$i.find(t=>t.id===s)||$i[0],xd=["Wobbles","Sir Trips","Noodle","Bonkers","Pudding","Captain Oops","Lil Dash","Tofu","Biscuit","Zoomer","Jellybelly","Flop","Dr. Bounce","Pickles","Muffin","Turbo Tim","Squeaky","Waffles","Bumble","Mr. Slippy","Tater","Kazoo","Dumpling","Giggles","Chonk","Yolo Joe","Sprinkles","Nugget","Fizz","Boop"];function vd(s){const t=n=>{const i=s()<.06?n:n.filter(r=>r.tier!=="legendary");return i[Math.floor(s()*i.length)]||n[0]},e=s()<.15?qi[0]:t(qi.slice(1));return{skin:t(hi).id,hat:e.id,trail:s()<.6?"none":t($i.slice(1)).id}}const Fu="noobsurv.v1",Ar=[{id:"survive30",text:["Survive 30 seconds in a round","Продержись 30 секунд в раунде"],target:30,reward:30,stat:"time"},{id:"survive60",text:["Survive 60 seconds in a round","Продержись 60 секунд в раунде"],target:60,reward:60,stat:"time"},{id:"top5",text:["Finish in the top 5","Попади в пятёрку лучших"],target:5,reward:45,stat:"place",low:!0},{id:"top3",text:["Finish in the top 3","Попади в тройку лучших"],target:3,reward:70,stat:"place",low:!0},{id:"win",text:["Win a round","Выиграй раунд"],target:1,reward:120,stat:"won"},{id:"dodge5",text:["Dodge 5 hazards in one round","Увернись от 5 ловушек за раунд"],target:5,reward:40,stat:"dodges"},{id:"ko2",text:["Knock out 2 noobs in one round","Сбрось 2 нубов за раунд"],target:2,reward:55,stat:"kos"},{id:"coins15",text:["Grab 15 coins in one round","Собери 15 монет за раунд"],target:15,reward:40,stat:"coins"},{id:"dash3",text:["Hit 3 noobs with a dash in one round","Толкни рывком 3 нубов за раунд"],target:3,reward:40,stat:"dashHits"},{id:"power2",text:["Grab 2 power-ups in one round","Возьми 2 бонуса за раунд"],target:2,reward:35,stat:"pickups"},{id:"play3",text:["Play 3 rounds","Сыграй 3 раунда"],target:3,reward:30,stat:"rounds"}];function ac(){return{v:1,coins:0,owned:[...Uu],look:{...md},stats:{matches:0,wins:0,bestTime:0,bestPlace:99,kos:0,coinsEarned:0,dodges:0},chal:[{id:"survive30",progress:0},{id:"dodge5",progress:0},{id:"coins15",progress:0}],settings:{music:!0,sfx:!0,quality:"auto",sens:1,shake:!0,hints:!0},tutorial:0,autoLow:!1}}let ur=null,al=null,Bt=ac(),oc=!0;function _d(){try{const s="__ns_test";return localStorage.setItem(s,"1"),localStorage.removeItem(s),localStorage}catch{return null}}function Md(s){ur=s||_d(),oc=!!ur;let t=null;try{t=ur?ur.getItem(Fu):al}catch{t=al}const e=ac();if(!t){Bt=e;return}try{const n=JSON.parse(t);Bt={...e,...n,v:1,coins:Math.max(0,Math.floor(Number(n.coins)||0)),owned:Array.isArray(n.owned)?Array.from(new Set([...Uu,...n.owned.filter(i=>typeof i=="string")])):e.owned,look:{...e.look,...n.look||{}},stats:{...e.stats,...n.stats||{}},settings:{...e.settings,...n.settings||{}},chal:Array.isArray(n.chal)&&n.chal.length===3&&n.chal.every(i=>Ar.some(r=>r.id===i?.id))?n.chal:e.chal};for(const i of["skin","hat","trail"])Bt.owned.includes(Bt.look[i])||(Bt.look[i]=e.look[i])}catch{Bt=e}}let Vs=null;function ni(s=!1){const t=()=>{Vs=null;const e=JSON.stringify(Bt);al=e;try{ur?.setItem(Fu,e)}catch{oc=!1}};s?(Vs&&clearTimeout(Vs),t()):Vs||(Vs=setTimeout(t,300))}function yd(){const s=Bt.settings;Bt=ac(),Bt.settings=s,ni(!0)}function Ou(s,t){const n=(t==="skin"?hi:t==="hat"?qi:$i).find(i=>i.id===s);return n?dd[n.tier]:0}function Sd(s,t){if(Bt.owned.includes(s))return!0;const e=Ou(s,t);return Bt.coins<e?!1:(Bt.coins-=e,Bt.owned.push(s),Bt.look[t]=s,ni(!0),!0)}function eh(s,t){const e=Bt.stats;e.matches++,s.won&&e.wins++,e.kos+=s.kos,e.dodges+=s.dodges;const n=s.time>e.bestTime+.05&&e.matches>1;e.bestTime=Math.max(e.bestTime,s.time),e.bestPlace=Math.min(e.bestPlace,s.place);const i=Math.floor(s.time/3),r=s.won?50:s.place<=3?20:s.place<=5?10:s.place<=Math.ceil(t/2)?4:0,a=s.kos*6,o=s.coins,l=[];for(let h=0;h<Bt.chal.length;h++){const f=Bt.chal[h],u=Ar.find(d=>d.id===f.id);if(u.stat==="rounds"?f.progress++:u.low?f.progress=s.place<=u.target?u.target:f.progress:f.progress=Math.max(f.progress,s[u.stat]),f.progress>=u.target){l.push({def:u,reward:u.reward});const d=Ar.filter(v=>!Bt.chal.some(m=>m.id===v.id)&&v.id!==u.id),g=d[Math.floor(Math.random()*d.length)]||u;Bt.chal[h]={id:g.id,progress:0}}}const c=i+r+a+o+l.reduce((h,f)=>h+f.reward,0);return Bt.coins+=c,e.coinsEarned+=c,ni(!0),{survival:i,placeBonus:r,kos:a,coins:o,challenges:l,total:c,newBest:n}}let Rr=zu(typeof navigator<"u"?navigator.language:"en");function zu(s){return s&&/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(s)?"ru":"en"}function bd(s){s&&(Rr=zu(s)),typeof document<"u"&&(document.documentElement.lang=Rr)}const Hi=s=>Rr==="ru"?s[1]:s[0],wd={play:["PLAY","ИГРАТЬ"],you:["You","Ты"],wardrobe:["Wardrobe","Гардероб"],challenges:["Challenges","Задания"],settings:["Settings","Настройки"],stats:["Stats","Статистика"],back:["Back","Назад"],retry:["PLAY AGAIN","ЕЩЁ РАЗ"],next:["NEXT ROUND","СЛЕДУЮЩИЙ РАУНД"],watch:["Watch","Смотреть"],menu:["Menu","Меню"],resume:["Resume","Продолжить"],paused:["Paused","Пауза"],quit:["Leave round","Выйти из раунда"],eliminated:["ELIMINATED","ВЫЛЕТ"],victory:["VICTORY!","ПОБЕДА!"],lastNoob:["Last noob standing","Последний нуб на арене"],place:["Place","Место"],of:["of","из"],survived:["Survived","На арене"],kos:["Knock-outs","Сброшено"],coins:["Coins","Монеты"],dodges:["Dodges","Увороты"],reward:["Reward","Награда"],best:["Personal best","Личный рекорд"],newBest:["New best!","Новый рекорд!"],alive:["alive","в игре"],go:["GO!","ВПЕРЁД!"],hintMove:["Move","Бег"],hintJump:["Jump","Прыжок"],hintDash:["Dash & shove","Рывок и толчок"],hintCam:["Drag to look","Тяни, чтобы смотреть"],hintGoal:["Stay on the floor. Be the last noob standing!","Не упади. Останься последним нубом!"],music:["Music","Музыка"],sound:["Sound effects","Звуки"],quality:["Graphics","Графика"],qAuto:["Auto","Авто"],qLow:["Low","Низкая"],qMed:["Medium","Средняя"],qHigh:["High","Высокая"],sens:["Camera speed","Скорость камеры"],shake:["Camera shake","Тряска камеры"],hints:["Control hints","Подсказки управления"],fullscreen:["Full screen","На весь экран"],on:["On","Вкл"],off:["Off","Выкл"],skins:["Outfits","Костюмы"],hats:["Hats","Шапки"],trails:["Trails","Следы"],equip:["Wear","Надеть"],equipped:["Wearing","Надето"],buy:["Buy","Купить"],common:["Common","Обычное"],rare:["Rare","Редкое"],epic:["Epic","Эпическое"],legendary:["Legendary","Легендарное"],looksOnly:["Looks only. No pay-to-win: every noob plays the same.","Только внешний вид: на игру не влияет."],done:["Done!","Готово!"],newChallenge:["Challenge done","Задание выполнено"],matches:["Rounds played","Раундов сыграно"],wins:["Wins","Побед"],bestTime:["Longest survival","Дольше всего на арене"],bestPlace:["Best place","Лучшее место"],totalKos:["Noobs knocked out","Сброшено нубов"],arena:["Arena","Арена"],alarm_balls:["BALLS!","ШАРЫ!"],alarm_wall:["WALL!","СТЕНА!"],alarm_floor:["FLOOR FALLING!","ПОЛ РУШИТСЯ!"],alarm_sudden:["SUDDEN DEATH!","ВНЕЗАПНАЯ СМЕРТЬ!"],youKo:["You knocked out","Сброшен"],outBy:["Knocked out by","Виноват"],outHammer:["Bonked by a hammer","Прилетело молотом"],outBall:["Flattened by a ball","Раскатало шаром"],outSweeper:["Swept away","Сбило вертушкой"],outBumper:["Bounced off","Отпружинило"],outWall:["Bulldozed by a wall","Стена вытолкала"],outFloor:["The floor gave way","Пол ушёл из-под ног"],outEdge:["Walked off the edge","Шаг в пропасть"],outShock:["Blown away","Сдуло ударной волной"],spectating:["Watching","Смотрим за"],tapToPlay:["Tap to start","Нажми, чтобы начать"],loading:["Loading…","Загрузка…"],owned:["Owned","Есть"],notEnough:["Not enough coins","Не хватает монет"],credits:["Made in TEMIRLAB","Сделано в TEMIRLAB"],allGames:["← All games","← Все игры"],fictional:["All characters are fictional noobs.","Все персонажи — вымышленные нубы."],reset:["Reset progress","Сбросить прогресс"],resetAsk:["Really reset coins, items and stats?","Точно сбросить монеты, вещи и статистику?"]};function st(s){const t=wd[s];return t?Hi(t):s}function ao(s){if(Rr==="ru")return`${s}-е`;const t=s%100>=11&&s%100<=13?"th":["th","st","nd","rd"][s%10]||"th";return s+t}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const lc="186",Ed=0,nh=1,Td=2,xr=1,Ad=2,fr=3,Yi=0,nn=1,ii=2,ri=0,vr=1,ih=2,sh=3,rh=4,Rd=5,Ts=100,Cd=101,Pd=102,Ld=103,Id=104,Dd=200,Nd=201,Ud=202,Fd=203,Bu=204,ku=205,Od=206,zd=207,Bd=208,kd=209,Hd=210,Gd=211,Vd=212,Wd=213,Xd=214,ol=0,ll=1,cl=2,Cr=3,hl=4,ul=5,fl=6,dl=7,Ya=0,qd=1,$d=2,Wn=0,Hu=1,Gu=2,Vu=3,Wu=4,Xu=5,qu=6,$u=7,Yu=300,Zi=301,zs=302,oo=303,lo=304,Za=306,La=1e3,si=1001,pl=1002,ke=1003,Yd=1004,Wr=1005,Ye=1006,co=1007,Gi=1008,un=1009,Zu=1010,Ku=1011,Pr=1012,cc=1013,qn=1014,Cn=1015,$n=1016,hc=1017,uc=1018,Lr=1020,Ju=35902,Qu=35899,ju=1021,tf=1022,Pn=1023,ui=1026,Vi=1027,fc=1028,dc=1029,Ki=1030,pc=1031,mc=1033,ba=33776,wa=33777,Ea=33778,Ta=33779,ml=35840,gl=35841,xl=35842,vl=35843,_l=36196,Ml=37492,yl=37496,Sl=37488,bl=37489,Ia=37490,wl=37491,El=37808,Tl=37809,Al=37810,Rl=37811,Cl=37812,Pl=37813,Ll=37814,Il=37815,Dl=37816,Nl=37817,Ul=37818,Fl=37819,Ol=37820,zl=37821,Bl=36492,kl=36494,Hl=36495,Gl=36283,Vl=36284,Da=36285,Wl=36286,Zd=3200,Na=0,Kd=1,Ei="",qe="srgb",Ua="srgb-linear",Fa="linear",xe="srgb",ho=7680,Jd=519,Qd=512,jd=513,tp=514,gc=515,ep=516,np=517,xc=518,ip=519,ef=35044,Ir=35048,ah="300 es",Vn=2e3,Dr=2001;function sp(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function Oa(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function rp(){const s=Oa("canvas");return s.style.display="block",s}const oh={};function za(...s){const t="THREE."+s.shift();console.log(t,...s)}function nf(s){const t=s[0];if(typeof t=="string"&&t.startsWith("TSL:")){const e=s[1];e&&e.isStackTrace?s[0]+=" "+e.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function Xt(...s){s=nf(s);const t="THREE."+s.shift();{const e=s[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...s)}}function le(...s){s=nf(s);const t="THREE."+s.shift();{const e=s[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...s)}}function Ls(...s){const t=s.join(" ");t in oh||(oh[t]=!0,Xt(...s))}function ap(s,t,e){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}const op={[ol]:ll,[cl]:fl,[hl]:dl,[Cr]:ul,[ll]:ol,[fl]:cl,[dl]:hl,[ul]:Cr};class Qi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const i=n[t];if(i!==void 0){const r=i.indexOf(e);r!==-1&&i.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let r=0,a=i.length;r<a;r++)i[r].call(this,t);t.target=null}}}const We=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],uo=Math.PI/180,Xl=180/Math.PI;function ai(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(We[s&255]+We[s>>8&255]+We[s>>16&255]+We[s>>24&255]+"-"+We[t&255]+We[t>>8&255]+"-"+We[t>>16&15|64]+We[t>>24&255]+"-"+We[e&63|128]+We[e>>8&255]+"-"+We[e>>16&255]+We[e>>24&255]+We[n&255]+We[n>>8&255]+We[n>>16&255]+We[n>>24&255]).toLowerCase()}function ne(s,t,e){return Math.max(t,Math.min(e,s))}function lp(s,t){return(s%t+t)%t}function fo(s,t,e){return(1-e)*s+e*t}function Gn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:case Uint8ClampedArray:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Me(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Ic=class Ic{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=ne(this.x,t.x,e.x),this.y=ne(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=ne(this.x,t,e),this.y=ne(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ne(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ne(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*i+t.x,this.y=r*i+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Ic.prototype.isVector2=!0;let ct=Ic;class Yn{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,r,a,o){let l=n[i+0],c=n[i+1],h=n[i+2],f=n[i+3],u=r[a+0],d=r[a+1],g=r[a+2],v=r[a+3];if(f!==v||l!==u||c!==d||h!==g){let m=l*u+c*d+h*g+f*v;m<0&&(u=-u,d=-d,g=-g,v=-v,m=-m);let p=1-o;if(m<.9995){const M=Math.acos(m),E=Math.sin(M);p=Math.sin(p*M)/E,o=Math.sin(o*M)/E,l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+v*o}else{l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+v*o;const M=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=M,c*=M,h*=M,f*=M}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,n,i,r,a){const o=n[i],l=n[i+1],c=n[i+2],h=n[i+3],f=r[a],u=r[a+1],d=r[a+2],g=r[a+3];return t[e]=o*g+h*f+l*d-c*u,t[e+1]=l*g+h*u+c*f-o*d,t[e+2]=c*g+h*d+o*u-l*f,t[e+3]=h*g-o*f-l*u-c*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(i/2),f=o(r/2),u=l(n/2),d=l(i/2),g=l(r/2);switch(a){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:Xt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],f=e[10],u=n+o+f;if(u>0){const d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(a-i)*d}else if(n>o&&n>f){const d=2*Math.sqrt(1+n-o-f);this._w=(h-l)/d,this._x=.25*d,this._y=(i+a)/d,this._z=(r+c)/d}else if(o>f){const d=2*Math.sqrt(1+o-n-f);this._w=(r-c)/d,this._x=(i+a)/d,this._y=.25*d,this._z=(l+h)/d}else{const d=2*Math.sqrt(1+f-n-o);this._w=(a-i)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ne(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+i*c-r*l,this._y=i*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-i*o,this._w=a*h-n*o-i*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,i=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,i=-i,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+i*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+i*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Dc=class Dc{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(lh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(lh.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*i,this.y=r[1]*e+r[4]*n+r[7]*i,this.z=r[2]*e+r[5]*n+r[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*i+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*i+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*i+r[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*i-o*n),h=2*(o*e-r*i),f=2*(r*n-a*e);return this.x=e+l*c+a*f-o*h,this.y=n+l*h+o*c-r*f,this.z=i+l*f+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i,this.y=r[1]*e+r[5]*n+r[9]*i,this.z=r[2]*e+r[6]*n+r[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=ne(this.x,t.x,e.x),this.y=ne(this.y,t.y,e.y),this.z=ne(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=ne(this.x,t,e),this.y=ne(this.y,t,e),this.z=ne(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ne(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=i*l-r*o,this.y=r*a-n*l,this.z=n*o-i*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return po.copy(this).projectOnVector(t),this.sub(po)}reflect(t){return this.sub(po.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ne(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Dc.prototype.isVector3=!0;let I=Dc;const po=new I,lh=new Yn,Nc=class Nc{constructor(t,e,n,i,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,a,o,l,c)}set(t,e,n,i,r,a,o,l,c){const h=this.elements;return h[0]=t,h[1]=i,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],v=i[0],m=i[3],p=i[6],M=i[1],E=i[4],y=i[7],w=i[2],T=i[5],C=i[8];return r[0]=a*v+o*M+l*w,r[3]=a*m+o*E+l*T,r[6]=a*p+o*y+l*C,r[1]=c*v+h*M+f*w,r[4]=c*m+h*E+f*T,r[7]=c*p+h*y+f*C,r[2]=u*v+d*M+g*w,r[5]=u*m+d*E+g*T,r[8]=u*p+d*y+g*C,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+i*r*c-i*a*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],f=h*a-o*c,u=o*l-h*r,d=c*r-a*l,g=e*f+n*u+i*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return t[0]=f*v,t[1]=(i*c-h*n)*v,t[2]=(o*n-i*a)*v,t[3]=u*v,t[4]=(h*e-i*l)*v,t[5]=(i*r-o*e)*v,t[6]=d*v,t[7]=(n*l-c*e)*v,t[8]=(a*e-n*r)*v,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-i*c,i*l,-i*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return Ls("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(mo.makeScale(t,e)),this}rotate(t){return Ls("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(mo.makeRotation(-t)),this}translate(t,e){return Ls("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(mo.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Nc.prototype.isMatrix3=!0;let Yt=Nc;const mo=new Yt,ch=new Yt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),hh=new Yt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function cp(){const s={enabled:!0,workingColorSpace:Ua,spaces:{},convert:function(i,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===xe&&(i.r=oi(i.r),i.g=oi(i.g),i.b=oi(i.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===xe&&(i.r=Is(i.r),i.g=Is(i.g),i.b=Is(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Ei?Fa:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,a){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return Ls("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return Ls("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[Ua]:{primaries:t,whitePoint:n,transfer:Fa,toXYZ:ch,fromXYZ:hh,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:qe},outputColorSpaceConfig:{drawingBufferColorSpace:qe}},[qe]:{primaries:t,whitePoint:n,transfer:xe,toXYZ:ch,fromXYZ:hh,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:qe}}}),s}const ae=cp();function oi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Is(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let is;class hp{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{is===void 0&&(is=Oa("canvas")),is.width=t.width,is.height=t.height;const i=is.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),n=is}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Oa("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),r=i.data;for(let a=0;a<r.length;a++)r[a]=oi(r[a]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(oi(e[n]/255)*255):e[n]=oi(e[n]);return{data:e,width:t.width,height:t.height}}else return Xt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let up=0;class vc{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:up++}),this.uuid=ai(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?r.push(go(i[a].image)):r.push(go(i[a]))}else r=go(i);n.url=r}return e||(t.images[this.uuid]=n),n}}function go(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?hp.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(Xt("Texture: Unable to serialize Texture."),{})}let fp=0;const xo=new I;class Ze extends Qi{constructor(t=Ze.DEFAULT_IMAGE,e=Ze.DEFAULT_MAPPING,n=si,i=si,r=Ye,a=Gi,o=Pn,l=un,c=Ze.DEFAULT_ANISOTROPY,h=Ei){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fp++}),this.uuid=ai(),this.name="",this.source=new vc(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ct(0,0),this.repeat=new ct(1,1),this.center=new ct(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Yt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(xo).x}get height(){return this.source.getSize(xo).y}get depth(){return this.source.getSize(xo).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){Xt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){Xt(`Texture.setValues(): property '${e}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Yu)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case La:t.x=t.x-Math.floor(t.x);break;case si:t.x=t.x<0?0:1;break;case pl:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case La:t.y=t.y-Math.floor(t.y);break;case si:t.y=t.y<0?0:1;break;case pl:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ze.DEFAULT_IMAGE=null;Ze.DEFAULT_MAPPING=Yu;Ze.DEFAULT_ANISOTROPY=1;const Uc=class Uc{constructor(t=0,e=0,n=0,i=1){this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*i+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*i+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*i+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*i+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,r;const l=t.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],v=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-v)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+v)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const E=(c+1)/2,y=(d+1)/2,w=(p+1)/2,T=(h+u)/4,C=(f+v)/4,_=(g+m)/4;return E>y&&E>w?E<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(E),i=T/n,r=C/n):y>w?y<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(y),n=T/i,r=_/i):w<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(w),n=C/r,i=_/r),this.set(n,i,r,e),this}let M=Math.sqrt((m-g)*(m-g)+(f-v)*(f-v)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(m-g)/M,this.y=(f-v)/M,this.z=(u-h)/M,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=ne(this.x,t.x,e.x),this.y=ne(this.y,t.y,e.y),this.z=ne(this.z,t.z,e.z),this.w=ne(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=ne(this.x,t,e),this.y=ne(this.y,t,e),this.z=ne(this.z,t,e),this.w=ne(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ne(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Uc.prototype.isVector4=!0;let Te=Uc;class dp extends Qi{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ye,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Te(0,0,t,e),this.scissorTest=!1,this.viewport=new Te(0,0,t,e),this.textures=[];const i={width:t,height:e,depth:n.depth},r=new Ze(i),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){const e={minFilter:Ye,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const i=Object.assign({},t.textures[e].image);this.textures[e].source=new vc(i)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){const e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Sn extends dp{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class sf extends Ze{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=ke,this.minFilter=ke,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class pp extends Ze{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=ke,this.minFilter=ke,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}}const $a=class $a{constructor(t,e,n,i,r,a,o,l,c,h,f,u,d,g,v,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,a,o,l,c,h,f,u,d,g,v,m)}set(t,e,n,i,r,a,o,l,c,h,f,u,d,g,v,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=i,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=u,p[3]=d,p[7]=g,p[11]=v,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new $a().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();const e=this.elements,n=t.elements,i=1/ss.setFromMatrixColumn(t,0).length(),r=1/ss.setFromMatrixColumn(t,1).length(),a=1/ss.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){const u=a*h,d=a*f,g=o*h,v=o*f;e[0]=l*h,e[4]=-l*f,e[8]=c,e[1]=d+g*c,e[5]=u-v*c,e[9]=-o*l,e[2]=v-u*c,e[6]=g+d*c,e[10]=a*l}else if(t.order==="YXZ"){const u=l*h,d=l*f,g=c*h,v=c*f;e[0]=u+v*o,e[4]=g*o-d,e[8]=a*c,e[1]=a*f,e[5]=a*h,e[9]=-o,e[2]=d*o-g,e[6]=v+u*o,e[10]=a*l}else if(t.order==="ZXY"){const u=l*h,d=l*f,g=c*h,v=c*f;e[0]=u-v*o,e[4]=-a*f,e[8]=g+d*o,e[1]=d+g*o,e[5]=a*h,e[9]=v-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){const u=a*h,d=a*f,g=o*h,v=o*f;e[0]=l*h,e[4]=g*c-d,e[8]=u*c+v,e[1]=l*f,e[5]=v*c+u,e[9]=d*c-g,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){const u=a*l,d=a*c,g=o*l,v=o*c;e[0]=l*h,e[4]=v-u*f,e[8]=g*f+d,e[1]=f,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=d*f+g,e[10]=u-v*f}else if(t.order==="XZY"){const u=a*l,d=a*c,g=o*l,v=o*c;e[0]=l*h,e[4]=-f,e[8]=c*h,e[1]=u*f+v,e[5]=a*h,e[9]=d*f-g,e[2]=g*f-d,e[6]=o*h,e[10]=v*f+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(mp,t,gp)}lookAt(t,e,n){const i=this.elements;return ln.subVectors(t,e),ln.lengthSq()===0&&(ln.z=1),ln.normalize(),mi.crossVectors(n,ln),mi.lengthSq()===0&&(Math.abs(n.z)===1?ln.x+=1e-4:ln.z+=1e-4,ln.normalize(),mi.crossVectors(n,ln)),mi.normalize(),Xr.crossVectors(ln,mi),i[0]=mi.x,i[4]=Xr.x,i[8]=ln.x,i[1]=mi.y,i[5]=Xr.y,i[9]=ln.y,i[2]=mi.z,i[6]=Xr.z,i[10]=ln.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],v=n[6],m=n[10],p=n[14],M=n[3],E=n[7],y=n[11],w=n[15],T=i[0],C=i[4],_=i[8],A=i[12],P=i[1],L=i[5],N=i[9],B=i[13],U=i[2],k=i[6],K=i[10],W=i[14],rt=i[3],q=i[7],j=i[11],nt=i[15];return r[0]=a*T+o*P+l*U+c*rt,r[4]=a*C+o*L+l*k+c*q,r[8]=a*_+o*N+l*K+c*j,r[12]=a*A+o*B+l*W+c*nt,r[1]=h*T+f*P+u*U+d*rt,r[5]=h*C+f*L+u*k+d*q,r[9]=h*_+f*N+u*K+d*j,r[13]=h*A+f*B+u*W+d*nt,r[2]=g*T+v*P+m*U+p*rt,r[6]=g*C+v*L+m*k+p*q,r[10]=g*_+v*N+m*K+p*j,r[14]=g*A+v*B+m*W+p*nt,r[3]=M*T+E*P+y*U+w*rt,r[7]=M*C+E*L+y*k+w*q,r[11]=M*_+E*N+y*K+w*j,r[15]=M*A+E*B+y*W+w*nt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],f=t[6],u=t[10],d=t[14],g=t[3],v=t[7],m=t[11],p=t[15],M=l*d-c*u,E=o*d-c*f,y=o*u-l*f,w=a*d-c*h,T=a*u-l*h,C=a*f-o*h;return e*(v*M-m*E+p*y)-n*(g*M-m*w+p*T)+i*(g*E-v*w+p*C)-r*(g*y-v*T+m*C)}determinantAffine(){const t=this.elements,e=t[0],n=t[4],i=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+i*(r*c-a*l)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],f=t[9],u=t[10],d=t[11],g=t[12],v=t[13],m=t[14],p=t[15],M=e*o-n*a,E=e*l-i*a,y=e*c-r*a,w=n*l-i*o,T=n*c-r*o,C=i*c-r*l,_=h*v-f*g,A=h*m-u*g,P=h*p-d*g,L=f*m-u*v,N=f*p-d*v,B=u*p-d*m,U=M*B-E*N+y*L+w*P-T*A+C*_;if(U===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/U;return t[0]=(o*B-l*N+c*L)*k,t[1]=(i*N-n*B-r*L)*k,t[2]=(v*C-m*T+p*w)*k,t[3]=(u*T-f*C-d*w)*k,t[4]=(l*P-a*B-c*A)*k,t[5]=(e*B-i*P+r*A)*k,t[6]=(m*y-g*C-p*E)*k,t[7]=(h*C-u*y+d*E)*k,t[8]=(a*N-o*P+c*_)*k,t[9]=(n*P-e*N-r*_)*k,t[10]=(g*T-v*y+p*M)*k,t[11]=(f*y-h*T-d*M)*k,t[12]=(o*A-a*L-l*_)*k,t[13]=(e*L-n*A+i*_)*k,t[14]=(v*E-g*w-m*M)*k,t[15]=(h*w-f*E+u*M)*k,this}scale(t){const e=this.elements,n=t.x,i=t.y,r=t.z;return e[0]*=n,e[4]*=i,e[8]*=r,e[1]*=n,e[5]*=i,e[9]*=r,e[2]*=n,e[6]*=i,e[10]*=r,e[3]*=n,e[7]*=i,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,h*o+n,h*l-i*a,0,c*l-i*o,h*l+i*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,r,a){return this.set(1,n,r,0,t,1,a,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,f=o+o,u=r*c,d=r*h,g=r*f,v=a*h,m=a*f,p=o*f,M=l*c,E=l*h,y=l*f,w=n.x,T=n.y,C=n.z;return i[0]=(1-(v+p))*w,i[1]=(d+y)*w,i[2]=(g-E)*w,i[3]=0,i[4]=(d-y)*T,i[5]=(1-(u+p))*T,i[6]=(m+M)*T,i[7]=0,i[8]=(g+E)*C,i[9]=(m-M)*C,i[10]=(1-(u+v))*C,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;t.x=i[12],t.y=i[13],t.z=i[14];const r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=ss.set(i[0],i[1],i[2]).length();const o=ss.set(i[4],i[5],i[6]).length(),l=ss.set(i[8],i[9],i[10]).length();r<0&&(a=-a),En.copy(this);const c=1/a,h=1/o,f=1/l;return En.elements[0]*=c,En.elements[1]*=c,En.elements[2]*=c,En.elements[4]*=h,En.elements[5]*=h,En.elements[6]*=h,En.elements[8]*=f,En.elements[9]*=f,En.elements[10]*=f,e.setFromRotationMatrix(En),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,i,r,a,o=Vn,l=!1){const c=this.elements,h=2*r/(e-t),f=2*r/(n-i),u=(e+t)/(e-t),d=(n+i)/(n-i);let g,v;if(l)g=r/(a-r),v=a*r/(a-r);else if(o===Vn)g=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===Dr)g=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,i,r,a,o=Vn,l=!1){const c=this.elements,h=2/(e-t),f=2/(n-i),u=-(e+t)/(e-t),d=-(n+i)/(n-i);let g,v;if(l)g=1/(a-r),v=a/(a-r);else if(o===Vn)g=-2/(a-r),v=-(a+r)/(a-r);else if(o===Dr)g=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};$a.prototype.isMatrix4=!0;let ie=$a;const ss=new I,En=new ie,mp=new I(0,0,0),gp=new I(1,1,1),mi=new I,Xr=new I,ln=new I,uh=new ie,fh=new Yn;class mn{constructor(t=0,e=0,n=0,i=mn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,r=i[0],a=i[4],o=i[8],l=i[1],c=i[5],h=i[9],f=i[2],u=i[6],d=i[10];switch(e){case"XYZ":this._y=Math.asin(ne(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ne(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(ne(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ne(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(ne(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-ne(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:Xt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return uh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(uh,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return fh.setFromEuler(this),this.setFromQuaternion(fh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}mn.DEFAULT_ORDER="XYZ";class rf{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let xp=0;const dh=new I,rs=new Yn,Kn=new ie,qr=new I,Ws=new I,vp=new I,_p=new Yn,ph=new I(1,0,0),mh=new I(0,1,0),gh=new I(0,0,1),xh={type:"added"},Mp={type:"removed"},as={type:"childadded",child:null},vo={type:"childremoved",child:null};class ze extends Qi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:xp++}),this.uuid=ai(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ze.DEFAULT_UP.clone();const t=new I,e=new mn,n=new Yn,i=new I(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ie},normalMatrix:{value:new Yt}}),this.matrix=new ie,this.matrixWorld=new ie,this.matrixAutoUpdate=ze.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ze.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new rf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return rs.setFromAxisAngle(t,e),this.quaternion.multiply(rs),this}rotateOnWorldAxis(t,e){return rs.setFromAxisAngle(t,e),this.quaternion.premultiply(rs),this}rotateX(t){return this.rotateOnAxis(ph,t)}rotateY(t){return this.rotateOnAxis(mh,t)}rotateZ(t){return this.rotateOnAxis(gh,t)}translateOnAxis(t,e){return dh.copy(t).applyQuaternion(this.quaternion),this.position.add(dh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(ph,t)}translateY(t){return this.translateOnAxis(mh,t)}translateZ(t){return this.translateOnAxis(gh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Kn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?qr.copy(t):qr.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Kn.lookAt(Ws,qr,this.up):Kn.lookAt(qr,Ws,this.up),this.quaternion.setFromRotationMatrix(Kn),i&&(Kn.extractRotation(i.matrixWorld),rs.setFromRotationMatrix(Kn),this.quaternion.premultiply(rs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(le("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(xh),as.child=t,this.dispatchEvent(as),as.child=null):le("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Mp),vo.child=t,this.dispatchEvent(vo),vo.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Kn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Kn.multiply(t.parent.matrixWorld)),t.applyMatrix4(Kn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(xh),as.child=t,this.dispatchEvent(as),as.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,t,vp),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,_p,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const t=this.pivot;if(t!==null){const e=t.x,n=t.y,i=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*i,r[13]+=n-r[1]*e-r[5]*n-r[9]*i,r[14]+=i-r[2]*e-r[6]*n-r[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){const r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(t),i.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const f=l[c];r(t.shapes,f)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));i.material=o}else i.material=r(t.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];i.animations.push(r(t.animations,l))}}if(e){const o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),f=a(t.shapes),u=a(t.skeletons),d=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=i,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}ze.DEFAULT_UP=new I(0,1,0);ze.DEFAULT_MATRIX_AUTO_UPDATE=!0;ze.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class fn extends ze{constructor(){super(),this.isGroup=!0,this.type="Group"}}const yp={type:"move"};class _o{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new fn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new fn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new fn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(const v of t.hand.values()){const m=e.getJointPose(v,n),p=this._getHandJoint(c,v);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(yp)))}return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new fn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const af={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},gi={h:0,s:0,l:0},$r={h:0,s:0,l:0};function Mo(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Ft{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=qe){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ae.colorSpaceToWorking(this,e),this}setRGB(t,e,n,i=ae.workingColorSpace){return this.r=t,this.g=e,this.b=n,ae.colorSpaceToWorking(this,i),this}setHSL(t,e,n,i=ae.workingColorSpace){if(t=lp(t,1),e=ne(e,0,1),n=ne(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Mo(a,r,t+1/3),this.g=Mo(a,r,t),this.b=Mo(a,r,t-1/3)}return ae.colorSpaceToWorking(this,i),this}setStyle(t,e=qe){function n(r){r!==void 0&&parseFloat(r)<1&&Xt("Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Xt("Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=i[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);Xt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=qe){const n=af[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Xt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=oi(t.r),this.g=oi(t.g),this.b=oi(t.b),this}copyLinearToSRGB(t){return this.r=Is(t.r),this.g=Is(t.g),this.b=Is(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=qe){return ae.workingToColorSpace(Xe.copy(this),t),Math.round(ne(Xe.r*255,0,255))*65536+Math.round(ne(Xe.g*255,0,255))*256+Math.round(ne(Xe.b*255,0,255))}getHexString(t=qe){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ae.workingColorSpace){ae.workingToColorSpace(Xe.copy(this),e);const n=Xe.r,i=Xe.g,r=Xe.b,a=Math.max(n,i,r),o=Math.min(n,i,r);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const f=a-o;switch(c=h<=.5?f/(a+o):f/(2-a-o),a){case n:l=(i-r)/f+(i<r?6:0);break;case i:l=(r-n)/f+2;break;case r:l=(n-i)/f+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ae.workingColorSpace){return ae.workingToColorSpace(Xe.copy(this),e),t.r=Xe.r,t.g=Xe.g,t.b=Xe.b,t}getStyle(t=qe){ae.workingToColorSpace(Xe.copy(this),t);const e=Xe.r,n=Xe.g,i=Xe.b;return t!==qe?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(gi),this.setHSL(gi.h+t,gi.s+e,gi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(gi),t.getHSL($r);const n=fo(gi.h,$r.h,e),i=fo(gi.s,$r.s,e),r=fo(gi.l,$r.l,e);return this.setHSL(n,i,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*i,this.g=r[1]*e+r[4]*n+r[7]*i,this.b=r[2]*e+r[5]*n+r[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Xe=new Ft;Ft.NAMES=af;class _c{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new Ft(t),this.near=e,this.far=n}clone(){return new _c(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class ql extends ze{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mn,this.environmentIntensity=1,this.environmentRotation=new mn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}}const Tn=new I,Jn=new I,yo=new I,Qn=new I,os=new I,ls=new I,vh=new I,So=new I,bo=new I,wo=new I,Eo=new Te,To=new Te,Ao=new Te;class yn{constructor(t=new I,e=new I,n=new I){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),Tn.subVectors(t,e),i.cross(Tn);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(t,e,n,i,r){Tn.subVectors(i,e),Jn.subVectors(n,e),yo.subVectors(t,e);const a=Tn.dot(Tn),o=Tn.dot(Jn),l=Tn.dot(yo),c=Jn.dot(Jn),h=Jn.dot(yo),f=a*c-o*o;if(f===0)return r.set(0,0,0),null;const u=1/f,d=(c*l-o*h)*u,g=(a*h-o*l)*u;return r.set(1-d-g,g,d)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,Qn)===null?!1:Qn.x>=0&&Qn.y>=0&&Qn.x+Qn.y<=1}static getInterpolation(t,e,n,i,r,a,o,l){return this.getBarycoord(t,e,n,i,Qn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Qn.x),l.addScaledVector(a,Qn.y),l.addScaledVector(o,Qn.z),l)}static getInterpolatedAttribute(t,e,n,i,r,a){return Eo.setScalar(0),To.setScalar(0),Ao.setScalar(0),Eo.fromBufferAttribute(t,e),To.fromBufferAttribute(t,n),Ao.fromBufferAttribute(t,i),a.setScalar(0),a.addScaledVector(Eo,r.x),a.addScaledVector(To,r.y),a.addScaledVector(Ao,r.z),a}static isFrontFacing(t,e,n,i){return Tn.subVectors(n,e),Jn.subVectors(t,e),Tn.cross(Jn).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Tn.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),Tn.cross(Jn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return yn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return yn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,r){return yn.getInterpolation(t,this.a,this.b,this.c,e,n,i,r)}containsPoint(t){return yn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return yn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,r=this.c;let a,o;os.subVectors(i,n),ls.subVectors(r,n),So.subVectors(t,n);const l=os.dot(So),c=ls.dot(So);if(l<=0&&c<=0)return e.copy(n);bo.subVectors(t,i);const h=os.dot(bo),f=ls.dot(bo);if(h>=0&&f<=h)return e.copy(i);const u=l*f-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(os,a);wo.subVectors(t,r);const d=os.dot(wo),g=ls.dot(wo);if(g>=0&&d<=g)return e.copy(r);const v=d*c-l*g;if(v<=0&&c>=0&&g<=0)return o=c/(c-g),e.copy(n).addScaledVector(ls,o);const m=h*g-d*f;if(m<=0&&f-h>=0&&d-g>=0)return vh.subVectors(r,i),o=(f-h)/(f-h+(d-g)),e.copy(i).addScaledVector(vh,o);const p=1/(m+v+u);return a=v*p,o=u*p,e.copy(n).addScaledVector(os,a).addScaledVector(ls,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}class ji{constructor(t=new I(1/0,1/0,1/0),e=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(An.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(An.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=An.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,An):An.fromBufferAttribute(r,a),An.applyMatrix4(t.matrixWorld),this.expandByPoint(An);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Yr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Yr.copy(n.boundingBox)),Yr.applyMatrix4(t.matrixWorld),this.union(Yr)}const i=t.children;for(let r=0,a=i.length;r<a;r++)this.expandByObject(i[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,An),An.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Xs),Zr.subVectors(this.max,Xs),cs.subVectors(t.a,Xs),hs.subVectors(t.b,Xs),us.subVectors(t.c,Xs),xi.subVectors(hs,cs),vi.subVectors(us,hs),Ii.subVectors(cs,us);let e=[0,-xi.z,xi.y,0,-vi.z,vi.y,0,-Ii.z,Ii.y,xi.z,0,-xi.x,vi.z,0,-vi.x,Ii.z,0,-Ii.x,-xi.y,xi.x,0,-vi.y,vi.x,0,-Ii.y,Ii.x,0];return!Ro(e,cs,hs,us,Zr)||(e=[1,0,0,0,1,0,0,0,1],!Ro(e,cs,hs,us,Zr))?!1:(Kr.crossVectors(xi,vi),e=[Kr.x,Kr.y,Kr.z],Ro(e,cs,hs,us,Zr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,An).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(An).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(jn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),jn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),jn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),jn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),jn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),jn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),jn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),jn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(jn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const jn=[new I,new I,new I,new I,new I,new I,new I,new I],An=new I,Yr=new ji,cs=new I,hs=new I,us=new I,xi=new I,vi=new I,Ii=new I,Xs=new I,Zr=new I,Kr=new I,Di=new I;function Ro(s,t,e,n,i){for(let r=0,a=s.length-3;r<=a;r+=3){Di.fromArray(s,r);const o=i.x*Math.abs(Di.x)+i.y*Math.abs(Di.y)+i.z*Math.abs(Di.z),l=t.dot(Di),c=e.dot(Di),h=n.dot(Di);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Ie=new I,Jr=new ct;let Sp=0;class Ge extends Qi{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Sp++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=ef,this.updateRanges=[],this.gpuType=Cn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Jr.fromBufferAttribute(this,e),Jr.applyMatrix3(t),this.setXY(e,Jr.x,Jr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ie.fromBufferAttribute(this,e),Ie.applyMatrix3(t),this.setXYZ(e,Ie.x,Ie.y,Ie.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ie.fromBufferAttribute(this,e),Ie.applyMatrix4(t),this.setXYZ(e,Ie.x,Ie.y,Ie.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ie.fromBufferAttribute(this,e),Ie.applyNormalMatrix(t),this.setXYZ(e,Ie.x,Ie.y,Ie.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ie.fromBufferAttribute(this,e),Ie.transformDirection(t),this.setXYZ(e,Ie.x,Ie.y,Ie.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Gn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Me(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Gn(e,this.array)),e}setX(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Gn(e,this.array)),e}setY(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Gn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Gn(e,this.array)),e}setW(t,e){return this.normalized&&(e=Me(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),i=Me(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t*=this.itemSize,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),i=Me(i,this.array),r=Me(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}}class of extends Ge{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class lf extends Ge{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class ve extends Ge{constructor(t,e,n){super(new Float32Array(t),e,n)}}const bp=new ji,qs=new I,Co=new I;class kr{constructor(t=new I,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):bp.setFromPoints(t).getCenter(n);let i=0;for(let r=0,a=t.length;r<a;r++)i=Math.max(i,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;qs.subVectors(t,this.center);const e=qs.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(qs,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Co.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(qs.copy(t.center).add(Co)),this.expandByPoint(qs.copy(t.center).sub(Co))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}let wp=0;const xn=new ie,Po=new ze,fs=new I,cn=new ji,$s=new ji,Fe=new I;class Be extends Qi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:wp++}),this.uuid=ai(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(sp(t)?lf:of)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Yt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return xn.makeRotationFromQuaternion(t),this.applyMatrix4(xn),this}rotateX(t){return xn.makeRotationX(t),this.applyMatrix4(xn),this}rotateY(t){return xn.makeRotationY(t),this.applyMatrix4(xn),this}rotateZ(t){return xn.makeRotationZ(t),this.applyMatrix4(xn),this}translate(t,e,n){return xn.makeTranslation(t,e,n),this.applyMatrix4(xn),this}scale(t,e,n){return xn.makeScale(t,e,n),this.applyMatrix4(xn),this}lookAt(t){return Po.lookAt(t),Po.updateMatrix(),this.applyMatrix4(Po.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(fs).negate(),this.translate(fs.x,fs.y,fs.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,r=t.length;i<r;i++){const a=t[i];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ve(n,3))}else{const n=Math.min(t.length,e.count);for(let i=0;i<n;i++){const r=t[i];e.setXYZ(i,r.x,r.y,r.z||0)}t.length>e.count&&Xt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ji);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){le("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const r=e[n];cn.setFromBufferAttribute(r),this.morphTargetsRelative?(Fe.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Fe),Fe.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Fe)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&le('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new kr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){le("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(t){const n=this.boundingSphere.center;if(cn.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){const o=e[r];$s.setFromBufferAttribute(o),this.morphTargetsRelative?(Fe.addVectors(cn.min,$s.min),cn.expandByPoint(Fe),Fe.addVectors(cn.max,$s.max),cn.expandByPoint(Fe)):(cn.expandByPoint($s.min),cn.expandByPoint($s.max))}cn.getCenter(n);let i=0;for(let r=0,a=t.count;r<a;r++)Fe.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(Fe));if(e)for(let r=0,a=e.length;r<a;r++){const o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Fe.fromBufferAttribute(o,c),l&&(fs.fromBufferAttribute(t,c),Fe.add(fs)),i=Math.max(i,n.distanceToSquared(Fe))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&le('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){le("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,r=e.uv;let a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new Ge(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));const o=[],l=[];for(let _=0;_<n.count;_++)o[_]=new I,l[_]=new I;const c=new I,h=new I,f=new I,u=new ct,d=new ct,g=new ct,v=new I,m=new I;function p(_,A,P){c.fromBufferAttribute(n,_),h.fromBufferAttribute(n,A),f.fromBufferAttribute(n,P),u.fromBufferAttribute(r,_),d.fromBufferAttribute(r,A),g.fromBufferAttribute(r,P),h.sub(c),f.sub(c),d.sub(u),g.sub(u);const L=1/(d.x*g.y-g.x*d.y);isFinite(L)&&(v.copy(h).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(L),m.copy(f).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(L),o[_].add(v),o[A].add(v),o[P].add(v),l[_].add(m),l[A].add(m),l[P].add(m))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let _=0,A=M.length;_<A;++_){const P=M[_],L=P.start,N=P.count;for(let B=L,U=L+N;B<U;B+=3)p(t.getX(B+0),t.getX(B+1),t.getX(B+2))}const E=new I,y=new I,w=new I,T=new I;function C(_){w.fromBufferAttribute(i,_),T.copy(w);const A=o[_];E.copy(A),E.sub(w.multiplyScalar(w.dot(A))).normalize(),y.crossVectors(T,A);const L=y.dot(l[_])<0?-1:1;a.setXYZW(_,E.x,E.y,E.z,L)}for(let _=0,A=M.length;_<A;++_){const P=M[_],L=P.start,N=P.count;for(let B=L,U=L+N;B<U;B+=3)C(t.getX(B+0)),C(t.getX(B+1)),C(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Ge(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);const i=new I,r=new I,a=new I,o=new I,l=new I,c=new I,h=new I,f=new I;if(t)for(let u=0,d=t.count;u<d;u+=3){const g=t.getX(u+0),v=t.getX(u+1),m=t.getX(u+2);i.fromBufferAttribute(e,g),r.fromBufferAttribute(e,v),a.fromBufferAttribute(e,m),h.subVectors(a,r),f.subVectors(i,r),h.cross(f),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,d=e.count;u<d;u+=3)i.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),f.subVectors(i,r),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Fe.fromBufferAttribute(t,e),Fe.normalize(),t.setXYZ(e,Fe.x,Fe.y,Fe.z)}toNonIndexed(){function t(o,l){const c=o.array,h=o.itemSize,f=o.normalized,u=new c.constructor(l.length*h);let d=0,g=0;for(let v=0,m=l.length;v<m;v++){o.isInterleavedBufferAttribute?d=l[v]*o.data.stride+o.offset:d=l[v]*h;for(let p=0;p<h;p++)u[g++]=c[d++]}return new Ge(u,h,f)}if(this.index===null)return Xt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Be,n=this.index.array,i=this.attributes;for(const o in i){const l=i[o],c=t(l,n);e.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let h=0,f=c.length;h<f;h++){const u=c[h],d=t(u,n);l.push(d)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const i={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){const d=c[f];h.push(d.toJSON(t.data))}h.length>0&&(i[l]=h,r=!0)}r&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const i=t.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],f=r[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let c=0,h=a.length;c<h;c++){const f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ep{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=ef,this.updateRanges=[],this.version=0,this.uuid=ai()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let i=0,r=this.stride;i<r;i++)this.array[t+i]=e.array[n+i];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ai()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ai()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));const e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}}const Je=new I;class Ba{constructor(t,e,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)Je.fromBufferAttribute(this,e),Je.applyMatrix4(t),this.setXYZ(e,Je.x,Je.y,Je.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Je.fromBufferAttribute(this,e),Je.applyNormalMatrix(t),this.setXYZ(e,Je.x,Je.y,Je.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Je.fromBufferAttribute(this,e),Je.transformDirection(t),this.setXYZ(e,Je.x,Je.y,Je.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=Gn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Me(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=Me(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=Gn(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=Gn(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=Gn(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=Gn(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),i=Me(i,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=Me(e,this.array),n=Me(n,this.array),i=Me(i,this.array),r=Me(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this.data.array[t+3]=r,this}clone(t){if(t===void 0){za("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return new Ge(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new Ba(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){za("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const Lo=new I,Tp=new I,Ap=new Yt;class wi{constructor(t=new I(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Lo.subVectors(n,e).cross(Tp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){const i=t.delta(Lo),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(i,a)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Ap.getNormalMatrix(t),i=this.coplanarPoint(Lo).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}}let Rp=0;class ts extends Qi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Rp++}),this.uuid=ai(),this.name="",this.type="Material",this.blending=vr,this.side=Yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Bu,this.blendDst=ku,this.blendEquation=Ts,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ft(0,0,0),this.blendAlpha=0,this.depthFunc=Cr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Jd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ho,this.stencilZFail=ho,this.stencilZPass=ho,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){Xt(`Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){Xt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector2&&n&&n.isVector2||i&&i.isEuler&&n&&n.isEuler||i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(e){const r=i(t.textures),a=i(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ft().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new wi().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ct().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ct().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Mc extends ts{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ft(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let ds;const Ys=new I,ps=new I,ms=new I,gs=new ct,Zs=new ct,cf=new ie,Qr=new I,Ks=new I,jr=new I,_h=new ct,Io=new ct,Mh=new ct;class hf extends ze{constructor(t=new Mc){if(super(),this.isSprite=!0,this.type="Sprite",ds===void 0){ds=new Be;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Ep(e,5);ds.setIndex([0,1,2,0,2,3]),ds.setAttribute("position",new Ba(n,3,0,!1)),ds.setAttribute("uv",new Ba(n,2,3,!1))}this.geometry=ds,this.material=t,this.center=new ct(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&le('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ps.setFromMatrixScale(this.matrixWorld),cf.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),ms.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ps.multiplyScalar(-ms.z);const n=this.material.rotation;let i,r;n!==0&&(r=Math.cos(n),i=Math.sin(n));const a=this.center;ta(Qr.set(-.5,-.5,0),ms,a,ps,i,r),ta(Ks.set(.5,-.5,0),ms,a,ps,i,r),ta(jr.set(.5,.5,0),ms,a,ps,i,r),_h.set(0,0),Io.set(1,0),Mh.set(1,1);let o=t.ray.intersectTriangle(Qr,Ks,jr,!1,Ys);if(o===null&&(ta(Ks.set(-.5,.5,0),ms,a,ps,i,r),Io.set(0,1),o=t.ray.intersectTriangle(Qr,jr,Ks,!1,Ys),o===null))return;const l=t.ray.origin.distanceTo(Ys);l<t.near||l>t.far||e.push({distance:l,point:Ys.clone(),uv:yn.getInterpolation(Ys,Qr,Ks,jr,_h,Io,Mh,new ct),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}}function ta(s,t,e,n,i,r){gs.subVectors(s,e).addScalar(.5).multiply(n),i!==void 0?(Zs.x=r*gs.x-i*gs.y,Zs.y=i*gs.x+r*gs.y):Zs.copy(gs),s.copy(t),s.x+=Zs.x,s.y+=Zs.y,s.applyMatrix4(cf)}const ti=new I,Do=new I,ea=new I,na=new I;class Cp{constructor(t=new I,e=new I(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ti)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=ti.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(ti.copy(this.origin).addScaledVector(this.direction,e),ti.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Do.copy(t).add(e).multiplyScalar(.5),ea.copy(e).sub(t).normalize(),na.copy(this.origin).sub(Do);const r=t.distanceTo(e)*.5,a=-this.direction.dot(ea),o=na.dot(this.direction),l=-na.dot(ea),c=na.lengthSq(),h=Math.abs(1-a*a);let f,u,d,g;if(h>0)if(f=a*l-o,u=a*o-l,g=r*h,f>=0)if(u>=-g)if(u<=g){const v=1/h;f*=v,u*=v,d=f*(f+a*u+2*o)+u*(a*f+u+2*l)+c}else u=r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u=-r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-a*r+o)),u=f>0?-r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-r,-l),r),d=u*(u+2*l)+c):(f=Math.max(0,-(a*r+o)),u=f>0?r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c);else u=a>0?-r:r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),i&&i.copy(Do).addScaledVector(ea,u),d}intersectSphere(t,e){if(t.radius<0)return null;ti.subVectors(t.center,this.origin);const n=ti.dot(this.direction),i=ti.dot(ti)-n*n,r=t.radius*t.radius;if(i>r)return null;const a=Math.sqrt(r-i),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,r,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,i=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,i=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>i||((r>n||isNaN(n))&&(n=r),(a<i||isNaN(i))&&(i=a),f>=0?(o=(t.min.z-u.z)*f,l=(t.max.z-u.z)*f):(o=(t.max.z-u.z)*f,l=(t.min.z-u.z)*f),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,ti)!==null}intersectTriangle(t,e,n,i,r){const a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,f=t.x-a.x,u=t.y-a.y,d=t.z-a.z,g=e.x-a.x,v=e.y-a.y,m=e.z-a.z,p=n.x-a.x,M=n.y-a.y,E=n.z-a.z,y=Math.abs(l),w=Math.abs(c),T=Math.abs(h);let C,_,A,P,L,N,B,U,k,K,W,rt;if(y>=w&&y>=T?(A=l,N=f,k=g,rt=p,l>=0?(C=c,_=h,P=u,L=d,B=v,U=m,K=M,W=E):(C=h,_=c,P=d,L=u,B=m,U=v,K=E,W=M)):w>=T?(A=c,N=u,k=v,rt=M,c>=0?(C=h,_=l,P=d,L=f,B=m,U=g,K=E,W=p):(C=l,_=h,P=f,L=d,B=g,U=m,K=p,W=E)):(A=h,N=d,k=m,rt=E,h>=0?(C=l,_=c,P=f,L=u,B=g,U=v,K=p,W=M):(C=c,_=l,P=u,L=f,B=v,U=g,K=M,W=p)),A===0)return null;const q=C/A,j=_/A,nt=1/A,It=P-q*N,Tt=L-j*N,ue=B-q*k,jt=U-j*k,ce=K-q*rt,Z=W-j*rt,tt=ce*jt-Z*ue,_t=It*Z-Tt*ce,Gt=ue*Tt-jt*It;if(i){if(tt<0||_t<0||Gt<0)return null}else if((tt<0||_t<0||Gt<0)&&(tt>0||_t>0||Gt>0))return null;const bt=tt+_t+Gt;if(bt===0)return null;const Vt=nt*(tt*N+_t*k+Gt*rt);return(bt>0?Vt<0:Vt>0)?null:this.at(Vt/bt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class pn extends ts{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ft(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Ya,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const yh=new ie,Ni=new Cp,ia=new kr,Sh=new I,sa=new I,ra=new I,aa=new I,No=new I,oa=new I,bh=new I,la=new I;class re extends ze{constructor(t=new Be,e=new pn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const o=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const o=this.morphTargetInfluences;if(r&&o){oa.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=o[l],f=r[l];h!==0&&(No.fromBufferAttribute(f,t),a?oa.addScaledVector(No,h):oa.addScaledVector(No.sub(e),h))}e.add(oa)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ia.copy(n.boundingSphere),ia.applyMatrix4(r),Ni.copy(t.ray).recast(t.near),!(ia.containsPoint(Ni.origin)===!1&&(Ni.intersectSphere(ia,Sh)===null||Ni.origin.distanceToSquared(Sh)>(t.far-t.near)**2))&&(yh.copy(r).invert(),Ni.copy(t.ray).applyMatrix4(yh),!(n.boundingBox!==null&&Ni.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Ni)))}_computeIntersections(t,e,n){let i;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,u=r.groups,d=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,v=u.length;g<v;g++){const m=u[g],p=a[m.materialIndex],M=Math.max(m.start,d.start),E=Math.min(o.count,Math.min(m.start+m.count,d.start+d.count));for(let y=M,w=E;y<w;y+=3){const T=o.getX(y),C=o.getX(y+1),_=o.getX(y+2);i=ca(this,p,t,n,c,h,f,T,C,_),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const g=Math.max(0,d.start),v=Math.min(o.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){const M=o.getX(m),E=o.getX(m+1),y=o.getX(m+2);i=ca(this,a,t,n,c,h,f,M,E,y),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,v=u.length;g<v;g++){const m=u[g],p=a[m.materialIndex],M=Math.max(m.start,d.start),E=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let y=M,w=E;y<w;y+=3){const T=y,C=y+1,_=y+2;i=ca(this,p,t,n,c,h,f,T,C,_),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const g=Math.max(0,d.start),v=Math.min(l.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){const M=m,E=m+1,y=m+2;i=ca(this,a,t,n,c,h,f,M,E,y),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}}}function Pp(s,t,e,n,i,r,a,o){let l;if(t.side===nn?l=n.intersectTriangle(a,r,i,!0,o):l=n.intersectTriangle(i,r,a,t.side===Yi,o),l===null)return null;la.copy(o),la.applyMatrix4(s.matrixWorld);const c=e.ray.origin.distanceTo(la);return c<e.near||c>e.far?null:{distance:c,point:la.clone(),object:s}}function ca(s,t,e,n,i,r,a,o,l,c){s.getVertexPosition(o,sa),s.getVertexPosition(l,ra),s.getVertexPosition(c,aa);const h=Pp(s,t,e,n,sa,ra,aa,bh);if(h){const f=new I;yn.getBarycoord(bh,sa,ra,aa,f),i&&(h.uv=yn.getInterpolatedAttribute(i,o,l,c,f,new ct)),r&&(h.uv1=yn.getInterpolatedAttribute(r,o,l,c,f,new ct)),a&&(h.normal=yn.getInterpolatedAttribute(a,o,l,c,f,new I),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:l,c,normal:new I,materialIndex:0};yn.getNormal(sa,ra,aa,u.normal),h.face=u,h.barycoord=f}return h}class uf extends Ze{constructor(t=null,e=1,n=1,i,r,a,o,l,c=ke,h=ke,f,u){super(null,a,o,l,c,h,i,r,f,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class wh extends Ge{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const xs=new ie,Eh=new ie,ha=[],Th=new ji,Lp=new ie,Js=new re,Qs=new kr;class Ci extends re{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new wh(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Lp)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ji),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,xs),Th.copy(t.boundingBox).applyMatrix4(xs),this.boundingBox.union(Th)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new kr),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,xs),Qs.copy(t.boundingSphere).applyMatrix4(xs),this.boundingSphere.union(Qs)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=i[a+o]}raycast(t,e){const n=this.matrixWorld,i=this.count;if(Js.geometry=this.geometry,Js.material=this.material,Js.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Qs.copy(this.boundingSphere),Qs.applyMatrix4(n),t.ray.intersectsSphere(Qs)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,xs),Eh.multiplyMatrices(n,xs),Js.matrixWorld=Eh,Js.raycast(t,ha);for(let a=0,o=ha.length;a<o;a++){const l=ha[a];l.instanceId=r,l.object=this,e.push(l)}ha.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new wh(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new uf(new Float32Array(i*this.count),i,this.count,fc,Cn));const r=this.morphTexture.source.data.data;let a=0;for(let c=0;c<n.length;c++)a+=n[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=i*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Ui=new kr,Ip=new ct(.5,.5),ua=new I;class yc{constructor(t=new wi,e=new wi,n=new wi,i=new wi,r=new wi,a=new wi){this.planes=[t,e,n,i,r,a]}set(t,e,n,i,r,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(i),o[4].copy(r),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Vn,n=!1){const i=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],f=r[5],u=r[6],d=r[7],g=r[8],v=r[9],m=r[10],p=r[11],M=r[12],E=r[13],y=r[14],w=r[15];if(i[0].setComponents(c-a,d-h,p-g,w-M).normalize(),i[1].setComponents(c+a,d+h,p+g,w+M).normalize(),i[2].setComponents(c+o,d+f,p+v,w+E).normalize(),i[3].setComponents(c-o,d-f,p-v,w-E).normalize(),n)i[4].setComponents(l,u,m,y).normalize(),i[5].setComponents(c-l,d-u,p-m,w-y).normalize();else if(i[4].setComponents(c-l,d-u,p-m,w-y).normalize(),e===Vn)i[5].setComponents(c+l,d+u,p+m,w+y).normalize();else if(e===Dr)i[5].setComponents(l,u,m,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ui.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Ui.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ui)}intersectsSprite(t){Ui.center.set(0,0,0);const e=Ip.distanceTo(t.center);return Ui.radius=.7071067811865476+e,Ui.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ui)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(ua.x=i.normal.x>0?t.max.x:t.min.x,ua.y=i.normal.y>0?t.max.y:t.min.y,ua.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(ua)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class ff extends Ze{constructor(t=[],e=Zi,n,i,r,a,o,l,c,h){super(t,e,n,i,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class df extends Ze{constructor(t,e,n,i,r,a,o,l,c){super(t,e,n,i,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Nr extends Ze{constructor(t,e,n=qn,i,r,a,o=ke,l=ke,c,h=ui,f=1){if(h!==ui&&h!==Vi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:t,height:e,depth:f};super(u,i,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new vc(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}}class Dp extends Nr{constructor(t,e=qn,n=Zi,i,r,a=ke,o=ke,l,c=ui){const h={width:t,height:t,depth:1},f=[h,h,h,h,h,h];super(t,t,e,n,i,r,a,o,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class pf extends Ze{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class bn extends Be{constructor(t=1,e=1,n=1,i=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:r,depthSegments:a};const o=this;i=Math.floor(i),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],h=[],f=[];let u=0,d=0;g("z","y","x",-1,-1,n,e,t,a,r,0),g("z","y","x",1,-1,n,e,-t,a,r,1),g("x","z","y",1,1,t,n,e,i,a,2),g("x","z","y",1,-1,t,n,-e,i,a,3),g("x","y","z",1,-1,t,e,n,i,r,4),g("x","y","z",-1,-1,t,e,-n,i,r,5),this.setIndex(l),this.setAttribute("position",new ve(c,3)),this.setAttribute("normal",new ve(h,3)),this.setAttribute("uv",new ve(f,2));function g(v,m,p,M,E,y,w,T,C,_,A){const P=y/C,L=w/_,N=y/2,B=w/2,U=T/2,k=C+1,K=_+1;let W=0,rt=0;const q=new I;for(let j=0;j<K;j++){const nt=j*L-B;for(let It=0;It<k;It++){const Tt=It*P-N;q[v]=Tt*M,q[m]=nt*E,q[p]=U,c.push(q.x,q.y,q.z),q[v]=0,q[m]=0,q[p]=T>0?1:-1,h.push(q.x,q.y,q.z),f.push(It/C),f.push(1-j/_),W+=1}}for(let j=0;j<_;j++)for(let nt=0;nt<C;nt++){const It=u+nt+k*j,Tt=u+nt+k*(j+1),ue=u+(nt+1)+k*(j+1),jt=u+(nt+1)+k*j;l.push(It,Tt,jt),l.push(Tt,ue,jt),rt+=6}o.addGroup(d,rt,A),d+=rt,u+=W}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new bn(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}class Ka extends Be{constructor(t=1,e=1,n=4,i=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:t,height:e,capSegments:n,radialSegments:i,heightSegments:r},e=Math.max(0,e),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),r=Math.max(1,Math.floor(r));const a=[],o=[],l=[],c=[],h=e/2,f=Math.PI/2*t,u=e,d=2*f+u,g=n*2+r,v=i+1,m=new I,p=new I;for(let M=0;M<=g;M++){let E=0,y=0,w=0,T=0;if(M<=n){const A=M/n,P=A*Math.PI/2;y=-h-t*Math.cos(P),w=t*Math.sin(P),T=-t*Math.cos(P),E=A*f}else if(M<=n+r){const A=(M-n)/r;y=-h+A*e,w=t,T=0,E=f+A*u}else{const A=(M-n-r)/n,P=A*Math.PI/2;y=h+t*Math.sin(P),w=t*Math.cos(P),T=t*Math.sin(P),E=f+u+A*f}const C=Math.max(0,Math.min(1,E/d));let _=0;M===0?_=.5/i:M===g&&(_=-.5/i);for(let A=0;A<=i;A++){const P=A/i,L=P*Math.PI*2,N=Math.sin(L),B=Math.cos(L);p.x=-w*B,p.y=y,p.z=w*N,o.push(p.x,p.y,p.z),m.set(-w*B,T,w*N),m.normalize(),l.push(m.x,m.y,m.z),c.push(P+_,C)}if(M>0){const A=(M-1)*v;for(let P=0;P<i;P++){const L=A+P,N=A+P+1,B=M*v+P,U=M*v+P+1;a.push(L,N,B),a.push(N,U,B)}}}this.setIndex(a),this.setAttribute("position",new ve(o,3)),this.setAttribute("normal",new ve(l,3)),this.setAttribute("uv",new ve(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ka(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}}class oe extends Be{constructor(t=1,e=1,n=1,i=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};const c=this;i=Math.floor(i),r=Math.floor(r);const h=[],f=[],u=[],d=[];let g=0;const v=[],m=n/2;let p=0;M(),a===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new ve(f,3)),this.setAttribute("normal",new ve(u,3)),this.setAttribute("uv",new ve(d,2));function M(){const y=new I,w=new I;let T=0;const C=(e-t)/n;for(let _=0;_<=r;_++){const A=[],P=_/r,L=P*(e-t)+t;for(let N=0;N<=i;N++){const B=N/i,U=B*l+o,k=Math.sin(U),K=Math.cos(U);w.x=L*k,w.y=-P*n+m,w.z=L*K,f.push(w.x,w.y,w.z),y.set(k,C,K).normalize(),u.push(y.x,y.y,y.z),d.push(B,1-P),A.push(g++)}v.push(A)}for(let _=0;_<i;_++)for(let A=0;A<r;A++){const P=v[A][_],L=v[A+1][_],N=v[A+1][_+1],B=v[A][_+1];(t>0||A!==0)&&(h.push(P,L,B),T+=3),(e>0||A!==r-1)&&(h.push(L,N,B),T+=3)}c.addGroup(p,T,0),p+=T}function E(y){const w=g,T=new ct,C=new I;let _=0;const A=y===!0?t:e,P=y===!0?1:-1;for(let N=1;N<=i;N++)f.push(0,m*P,0),u.push(0,P,0),d.push(.5,.5),g++;const L=g;for(let N=0;N<=i;N++){const U=N/i*l+o,k=Math.cos(U),K=Math.sin(U);C.x=A*K,C.y=m*P,C.z=A*k,f.push(C.x,C.y,C.z),u.push(0,P,0),T.x=k*.5+.5,T.y=K*.5*P+.5,d.push(T.x,T.y),g++}for(let N=0;N<i;N++){const B=w+N,U=L+N;y===!0?h.push(U,U+1,B):h.push(U+1,U,B),_+=3}c.addGroup(p,_,y===!0?1:2),p+=_}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new oe(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class hn extends oe{constructor(t=1,e=1,n=32,i=1,r=!1,a=0,o=Math.PI*2){super(0,t,e,n,i,r,a,o),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(t){return new hn(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ja extends Be{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const r=[],a=[];o(i),c(n),h(),this.setAttribute("position",new ve(r,3)),this.setAttribute("normal",new ve(r.slice(),3)),this.setAttribute("uv",new ve(a,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function o(M){const E=new I,y=new I,w=new I;for(let T=0;T<e.length;T+=3)d(e[T+0],E),d(e[T+1],y),d(e[T+2],w),l(E,y,w,M)}function l(M,E,y,w){const T=w+1,C=[];for(let _=0;_<=T;_++){C[_]=[];const A=M.clone().lerp(y,_/T),P=E.clone().lerp(y,_/T),L=T-_;for(let N=0;N<=L;N++)N===0&&_===T?C[_][N]=A:C[_][N]=A.clone().lerp(P,N/L)}for(let _=0;_<T;_++)for(let A=0;A<2*(T-_)-1;A++){const P=Math.floor(A/2);A%2===0?(u(C[_][P+1]),u(C[_+1][P]),u(C[_][P])):(u(C[_][P+1]),u(C[_+1][P+1]),u(C[_+1][P]))}}function c(M){const E=new I;for(let y=0;y<r.length;y+=3)E.x=r[y+0],E.y=r[y+1],E.z=r[y+2],E.normalize().multiplyScalar(M),r[y+0]=E.x,r[y+1]=E.y,r[y+2]=E.z}function h(){const M=new I;for(let E=0;E<r.length;E+=3){M.x=r[E+0],M.y=r[E+1],M.z=r[E+2];const y=m(M)/2/Math.PI+.5,w=p(M)/Math.PI+.5;a.push(y,1-w)}g(),f()}function f(){for(let M=0;M<a.length;M+=6){const E=a[M+0],y=a[M+2],w=a[M+4],T=Math.max(E,y,w),C=Math.min(E,y,w);T>.9&&C<.1&&(E<.2&&(a[M+0]+=1),y<.2&&(a[M+2]+=1),w<.2&&(a[M+4]+=1))}}function u(M){r.push(M.x,M.y,M.z)}function d(M,E){const y=M*3;E.x=t[y+0],E.y=t[y+1],E.z=t[y+2]}function g(){const M=new I,E=new I,y=new I,w=new I,T=new ct,C=new ct,_=new ct;for(let A=0,P=0;A<r.length;A+=9,P+=6){M.set(r[A+0],r[A+1],r[A+2]),E.set(r[A+3],r[A+4],r[A+5]),y.set(r[A+6],r[A+7],r[A+8]),T.set(a[P+0],a[P+1]),C.set(a[P+2],a[P+3]),_.set(a[P+4],a[P+5]),w.copy(M).add(E).add(y).divideScalar(3);const L=m(w);v(T,P+0,M,L),v(C,P+2,E,L),v(_,P+4,y,L)}}function v(M,E,y,w){w<0&&M.x===1&&(a[E]=M.x-1),y.x===0&&y.z===0&&(a[E]=w/2/Math.PI+.5)}function m(M){return Math.atan2(M.z,-M.x)}function p(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ja(t.vertices,t.indices,t.radius,t.detail)}}class Zn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Xt("Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(i),e.push(r),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let i=0;const r=n.length;let a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-a,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===a)return i/(r-1);const h=n[i],u=n[i+1]-h,d=(a-h)/u;return(i+d)/(r-1)}getTangent(t,e){let i=t-1e-4,r=t+1e-4;i<0&&(i=0),r>1&&(r=1);const a=this.getPoint(i),o=this.getPoint(r),l=e||(a.isVector2?new ct:new I);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new I,i=[],r=[],a=[],o=new I,l=new ie;for(let d=0;d<=t;d++){const g=d/t;i[d]=this.getTangentAt(g,new I)}r[0]=new I,a[0]=new I;let c=Number.MAX_VALUE;const h=Math.abs(i[0].x),f=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),f<=c&&(c=f,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],o),a[0].crossVectors(i[0],r[0]);for(let d=1;d<=t;d++){if(r[d]=r[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(i[d-1],i[d]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(ne(i[d-1].dot(i[d]),-1,1));r[d].applyMatrix4(l.makeRotationAxis(o,g))}a[d].crossVectors(i[d],r[d])}if(e===!0){let d=Math.acos(ne(r[0].dot(r[t]),-1,1));d/=t,i[0].dot(o.crossVectors(r[0],r[t]))>0&&(d=-d);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(i[g],d*g)),a[g].crossVectors(i[g],r[g])}return{tangents:i,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Sc extends Zn{constructor(t=0,e=0,n=1,i=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new ct){const n=e,i=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(a?r=0:r=i),this.aClockwise===!0&&!a&&(r===i?r=-i:r=r-i);const o=this.aStartAngle+t*r;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),f=Math.sin(this.aRotation),u=l-this.aX,d=c-this.aY;l=u*h-d*f+this.aX,c=u*f+d*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Np extends Sc{constructor(t,e,n,i,r,a){super(t,e,n,n,i,r,a),this.isArcCurve=!0,this.type="ArcCurve"}}function bc(){let s=0,t=0,e=0,n=0;function i(r,a,o,l){s=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){i(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,f){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,d=(o-a)/h-(l-a)/(h+f)+(l-o)/f;u*=h,d*=h,i(a,o,u,d)},calc:function(r){const a=r*r,o=a*r;return s+t*r+e*a+n*o}}}const Ah=new I,Rh=new I,Uo=new bc,Fo=new bc,Oo=new bc;class Up extends Zn{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new I){const n=e,i=this.points,r=i.length,a=(r-(this.closed?0:1))*t;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=i[(o-1)%r]:(Rh.subVectors(i[0],i[1]).add(i[0]),c=Rh);const f=i[o%r],u=i[(o+1)%r];if(this.closed||o+2<r?h=i[(o+2)%r]:(Ah.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=Ah),this.curveType==="centripetal"||this.curveType==="chordal"){const d=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(f),d),v=Math.pow(f.distanceToSquared(u),d),m=Math.pow(u.distanceToSquared(h),d);v<1e-4&&(v=1),g<1e-4&&(g=v),m<1e-4&&(m=v),Uo.initNonuniformCatmullRom(c.x,f.x,u.x,h.x,g,v,m),Fo.initNonuniformCatmullRom(c.y,f.y,u.y,h.y,g,v,m),Oo.initNonuniformCatmullRom(c.z,f.z,u.z,h.z,g,v,m)}else this.curveType==="catmullrom"&&(Uo.initCatmullRom(c.x,f.x,u.x,h.x,this.tension),Fo.initCatmullRom(c.y,f.y,u.y,h.y,this.tension),Oo.initCatmullRom(c.z,f.z,u.z,h.z,this.tension));return n.set(Uo.calc(l),Fo.calc(l),Oo.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new I().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Ch(s,t,e,n,i){const r=(n-t)*.5,a=(i-e)*.5,o=s*s,l=s*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*s+e}function Fp(s,t){const e=1-s;return e*e*t}function Op(s,t){return 2*(1-s)*s*t}function zp(s,t){return s*s*t}function _r(s,t,e,n){return Fp(s,t)+Op(s,e)+zp(s,n)}function Bp(s,t){const e=1-s;return e*e*e*t}function kp(s,t){const e=1-s;return 3*e*e*s*t}function Hp(s,t){return 3*(1-s)*s*s*t}function Gp(s,t){return s*s*s*t}function Mr(s,t,e,n,i){return Bp(s,t)+kp(s,e)+Hp(s,n)+Gp(s,i)}class mf extends Zn{constructor(t=new ct,e=new ct,n=new ct,i=new ct){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new ct){const n=e,i=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Mr(t,i.x,r.x,a.x,o.x),Mr(t,i.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Vp extends Zn{constructor(t=new I,e=new I,n=new I,i=new I){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new I){const n=e,i=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Mr(t,i.x,r.x,a.x,o.x),Mr(t,i.y,r.y,a.y,o.y),Mr(t,i.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class gf extends Zn{constructor(t=new ct,e=new ct){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ct){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ct){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Wp extends Zn{constructor(t=new I,e=new I){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new I){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new I){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class xf extends Zn{constructor(t=new ct,e=new ct,n=new ct){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ct){const n=e,i=this.v0,r=this.v1,a=this.v2;return n.set(_r(t,i.x,r.x,a.x),_r(t,i.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Xp extends Zn{constructor(t=new I,e=new I,n=new I){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new I){const n=e,i=this.v0,r=this.v1,a=this.v2;return n.set(_r(t,i.x,r.x,a.x),_r(t,i.y,r.y,a.y),_r(t,i.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class vf extends Zn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ct){const n=e,i=this.points,r=(i.length-1)*t,a=Math.floor(r),o=r-a,l=i[a===0?a:a-1],c=i[a],h=i[a>i.length-2?i.length-1:a+1],f=i[a>i.length-3?i.length-1:a+2];return n.set(Ch(o,l.x,c.x,h.x,f.x),Ch(o,l.y,c.y,h.y,f.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new ct().fromArray(i))}return this}}var $l=Object.freeze({__proto__:null,ArcCurve:Np,CatmullRomCurve3:Up,CubicBezierCurve:mf,CubicBezierCurve3:Vp,EllipseCurve:Sc,LineCurve:gf,LineCurve3:Wp,QuadraticBezierCurve:xf,QuadraticBezierCurve3:Xp,SplineCurve:vf});class qp extends Zn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new $l[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let r=0;for(;r<i.length;){if(i[r]>=n){const a=i[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,r=this.curves;i<r.length;i++){const a=r[i],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new $l[i.type]().fromJSON(i))}return this}}class Ph extends qp{constructor(t){super(),this.type="Path",this.currentPoint=new ct,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new gf(this.currentPoint.clone(),new ct(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const r=new xf(this.currentPoint.clone(),new ct(t,e),new ct(n,i));return this.curves.push(r),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,r,a){const o=new mf(this.currentPoint.clone(),new ct(t,e),new ct(n,i),new ct(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new vf(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,r,a){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,i,r,a),this}absarc(t,e,n,i,r,a){return this.absellipse(t,e,n,n,i,r,a),this}ellipse(t,e,n,i,r,a,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,i,r,a,o,l),this}absellipse(t,e,n,i,r,a,o,l){const c=new Sc(t,e,n,i,r,a,o,l);if(this.curves.length>0){const f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class _f extends Ph{constructor(t){super(t),this.uuid=ai(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,i=this.holes.length;n<i;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const i=this.holes[e];t.holes.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(new Ph().fromJSON(i))}return this}}function $p(s,t,e=2){const n=t&&t.length,i=n?t[0]*e:s.length;let r=Mf(s,0,i,e,!0);const a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(n&&(r=Qp(s,t,r,e)),s.length>80*e){o=s[0],l=s[1];let h=o,f=l;for(let u=e;u<i;u+=e){const d=s[u],g=s[u+1];d<o&&(o=d),g<l&&(l=g),d>h&&(h=d),g>f&&(f=g)}c=Math.max(h-o,f-l),c=c!==0?32767/c:0}return Ur(r,a,e,o,l,c,0),a}function Mf(s,t,e,n,i){let r;if(i===cm(s,t,e,n)>0)for(let a=t;a<e;a+=n)r=Lh(a/n|0,s[a],s[a+1],r);else for(let a=e-n;a>=t;a-=n)r=Lh(a/n|0,s[a],s[a+1],r);return r&&Bs(r,r.next)&&(Or(r),r=r.next),r}function Ji(s,t){if(!s)return s;t||(t=s);let e=s,n;do if(n=!1,!e.steiner&&(Bs(e,e.next)||Ae(e.prev,e,e.next)===0)){if(Or(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Ur(s,t,e,n,i,r,a){if(!s)return;!a&&r&&im(s,n,i,r);let o=s;for(;s.prev!==s.next;){const l=s.prev,c=s.next;if(r?Zp(s,n,i,r):Yp(s)){t.push(l.i,s.i,c.i),Or(s),s=c.next,o=c.next;continue}if(s=c,s===o){a?a===1?(s=Kp(Ji(s),t),Ur(s,t,e,n,i,r,2)):a===2&&Jp(s,t,e,n,i,r):Ur(Ji(s),t,e,n,i,r,1);break}}}function Yp(s){const t=s.prev,e=s,n=s.next;if(Ae(t,e,n)>=0)return!1;const i=t.x,r=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=Math.min(i,r,a),f=Math.min(o,l,c),u=Math.max(i,r,a),d=Math.max(o,l,c);let g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=u&&g.y>=f&&g.y<=d&&dr(i,o,r,l,a,c,g.x,g.y)&&Ae(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Zp(s,t,e,n){const i=s.prev,r=s,a=s.next;if(Ae(i,r,a)>=0)return!1;const o=i.x,l=r.x,c=a.x,h=i.y,f=r.y,u=a.y,d=Math.min(o,l,c),g=Math.min(h,f,u),v=Math.max(o,l,c),m=Math.max(h,f,u),p=Yl(d,g,t,e,n),M=Yl(v,m,t,e,n);let E=s.prevZ,y=s.nextZ;for(;E&&E.z>=p&&y&&y.z<=M;){if(E.x>=d&&E.x<=v&&E.y>=g&&E.y<=m&&E!==i&&E!==a&&dr(o,h,l,f,c,u,E.x,E.y)&&Ae(E.prev,E,E.next)>=0||(E=E.prevZ,y.x>=d&&y.x<=v&&y.y>=g&&y.y<=m&&y!==i&&y!==a&&dr(o,h,l,f,c,u,y.x,y.y)&&Ae(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;E&&E.z>=p;){if(E.x>=d&&E.x<=v&&E.y>=g&&E.y<=m&&E!==i&&E!==a&&dr(o,h,l,f,c,u,E.x,E.y)&&Ae(E.prev,E,E.next)>=0)return!1;E=E.prevZ}for(;y&&y.z<=M;){if(y.x>=d&&y.x<=v&&y.y>=g&&y.y<=m&&y!==i&&y!==a&&dr(o,h,l,f,c,u,y.x,y.y)&&Ae(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function Kp(s,t){let e=s;do{const n=e.prev,i=e.next.next;!Bs(n,i)&&Sf(n,e,e.next,i)&&Fr(n,i)&&Fr(i,n)&&(t.push(n.i,e.i,i.i),Or(e),Or(e.next),e=s=i),e=e.next}while(e!==s);return Ji(e)}function Jp(s,t,e,n,i,r){let a=s;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&am(a,o)){let l=bf(a,o);a=Ji(a,a.next),l=Ji(l,l.next),Ur(a,t,e,n,i,r,0),Ur(l,t,e,n,i,r,0);return}o=o.next}a=a.next}while(a!==s)}function Qp(s,t,e,n){const i=[];for(let r=0,a=t.length;r<a;r++){const o=t[r]*n,l=r<a-1?t[r+1]*n:s.length,c=Mf(s,o,l,n,!1);c===c.next&&(c.steiner=!0),i.push(rm(c))}i.sort(jp);for(let r=0;r<i.length;r++)e=tm(i[r],e);return e}function jp(s,t){let e=s.x-t.x;if(e===0&&(e=s.y-t.y,e===0)){const n=(s.next.y-s.y)/(s.next.x-s.x),i=(t.next.y-t.y)/(t.next.x-t.x);e=n-i}return e}function tm(s,t){const e=em(s,t);if(!e)return t;const n=bf(e,s);return Ji(n,n.next),Ji(e,e.next)}function em(s,t){let e=t;const n=s.x,i=s.y;let r=-1/0,a;if(Bs(s,e))return e;do{if(Bs(s,e.next))return e.next;if(i<=e.y&&i>=e.next.y&&e.next.y!==e.y){const f=e.x+(i-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>r&&(r=f,a=e.x<e.next.x?e:e.next,f===n))return a}e=e.next}while(e!==t);if(!a)return null;const o=a,l=a.x,c=a.y;let h=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&yf(i<c?n:r,i,l,c,i<c?r:n,i,e.x,e.y)){const f=Math.abs(i-e.y)/(n-e.x);Fr(e,s)&&(f<h||f===h&&(e.x>a.x||e.x===a.x&&nm(a,e)))&&(a=e,h=f)}e=e.next}while(e!==o);return a}function nm(s,t){return Ae(s.prev,s,t.prev)<0&&Ae(t.next,s,s.next)<0}function im(s,t,e,n){let i=s;do i.z===0&&(i.z=Yl(i.x,i.y,t,e,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==s);i.prevZ.nextZ=null,i.prevZ=null,sm(i)}function sm(s){let t,e=1;do{let n=s,i;s=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(i=n,n=n.nextZ,o--):(i=a,a=a.nextZ,l--),r?r.nextZ=i:s=i,i.prevZ=r,r=i;n=a}r.nextZ=null,e*=2}while(t>1);return s}function Yl(s,t,e,n,i){return s=(s-e)*i|0,t=(t-n)*i|0,s=(s|s<<8)&16711935,s=(s|s<<4)&252645135,s=(s|s<<2)&858993459,s=(s|s<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,s|t<<1}function rm(s){let t=s,e=s;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==s);return e}function yf(s,t,e,n,i,r,a,o){return(i-a)*(t-o)>=(s-a)*(r-o)&&(s-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(i-a)*(n-o)}function dr(s,t,e,n,i,r,a,o){return!(s===a&&t===o)&&yf(s,t,e,n,i,r,a,o)}function am(s,t){return s.next.i!==t.i&&s.prev.i!==t.i&&!om(s,t)&&(Fr(s,t)&&Fr(t,s)&&lm(s,t)&&(Ae(s.prev,s,t.prev)||Ae(s,t.prev,t))||Bs(s,t)&&Ae(s.prev,s,s.next)>0&&Ae(t.prev,t,t.next)>0)}function Ae(s,t,e){return(t.y-s.y)*(e.x-t.x)-(t.x-s.x)*(e.y-t.y)}function Bs(s,t){return s.x===t.x&&s.y===t.y}function Sf(s,t,e,n){const i=da(Ae(s,t,e)),r=da(Ae(s,t,n)),a=da(Ae(e,n,s)),o=da(Ae(e,n,t));return!!(i!==r&&a!==o||i===0&&fa(s,e,t)||r===0&&fa(s,n,t)||a===0&&fa(e,s,n)||o===0&&fa(e,t,n))}function fa(s,t,e){return t.x<=Math.max(s.x,e.x)&&t.x>=Math.min(s.x,e.x)&&t.y<=Math.max(s.y,e.y)&&t.y>=Math.min(s.y,e.y)}function da(s){return s>0?1:s<0?-1:0}function om(s,t){let e=s;do{if(e.i!==s.i&&e.next.i!==s.i&&e.i!==t.i&&e.next.i!==t.i&&Sf(e,e.next,s,t))return!0;e=e.next}while(e!==s);return!1}function Fr(s,t){return Ae(s.prev,s,s.next)<0?Ae(s,t,s.next)>=0&&Ae(s,s.prev,t)>=0:Ae(s,t,s.prev)<0||Ae(s,s.next,t)<0}function lm(s,t){let e=s,n=!1;const i=(s.x+t.x)/2,r=(s.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&i<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==s);return n}function bf(s,t){const e=Zl(s.i,s.x,s.y),n=Zl(t.i,t.x,t.y),i=s.next,r=t.prev;return s.next=t,t.prev=s,e.next=i,i.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Lh(s,t,e,n){const i=Zl(s,t,e);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Or(s){s.next.prev=s.prev,s.prev.next=s.next,s.prevZ&&(s.prevZ.nextZ=s.nextZ),s.nextZ&&(s.nextZ.prevZ=s.prevZ)}function Zl(s,t,e){return{i:s,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function cm(s,t,e,n){let i=0;for(let r=t,a=e-n;r<e;r+=n)i+=(s[a]-s[r])*(s[r+1]+s[a+1]),a=r;return i}class hm{static triangulate(t,e,n=2){return $p(t,e,n)}}class Cs{static area(t){const e=t.length;let n=0;for(let i=e-1,r=0;r<e;i=r++)n+=t[i].x*t[r].y-t[r].x*t[i].y;return n*.5}static isClockWise(t){return Cs.area(t)<0}static triangulateShape(t,e){const n=[],i=[],r=[];Ih(t),Dh(n,t);let a=t.length;e.forEach(Ih);for(let l=0;l<e.length;l++)i.push(a),a+=e[l].length,Dh(n,e[l]);const o=hm.triangulate(n,i);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}}function Ih(s){const t=s.length;t>2&&s[t-1].equals(s[0])&&s.pop()}function Dh(s,t){for(let e=0;e<t.length;e++)s.push(t[e].x),s.push(t[e].y)}class wc extends Be{constructor(t=new _f([new ct(.5,.5),new ct(-.5,.5),new ct(-.5,-.5),new ct(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];const n=this,i=[],r=[];for(let o=0,l=t.length;o<l;o++){const c=t[o];a(c)}this.setAttribute("position",new ve(i,3)),this.setAttribute("uv",new ve(r,2)),this.computeVertexNormals();function a(o){const l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,f=e.depth!==void 0?e.depth:1;let u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,d=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:d-.1,v=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3;const p=e.extrudePath,M=e.UVGenerator!==void 0?e.UVGenerator:um;let E,y=!1,w,T,C,_;if(p){E=p.getSpacedPoints(h),y=!0,u=!1;const et=p.isCatmullRomCurve3?p.closed:!1;w=p.computeFrenetFrames(h,et),T=new I,C=new I,_=new I}u||(m=0,d=0,g=0,v=0);const A=o.extractPoints(c);let P=A.shape;const L=A.holes;if(!Cs.isClockWise(P)){P=P.reverse();for(let et=0,at=L.length;et<at;et++){const ot=L[et];Cs.isClockWise(ot)&&(L[et]=ot.reverse())}}function B(et){const ot=10000000000000001e-36;let lt=et[0];for(let ft=1;ft<=et.length;ft++){const kt=ft%et.length,zt=et[kt],Wt=zt.x-lt.x,qt=zt.y-lt.y,D=Wt*Wt+qt*qt,fe=Math.max(Math.abs(zt.x),Math.abs(zt.y),Math.abs(lt.x),Math.abs(lt.y)),te=ot*fe*fe;if(D<=te){et.splice(kt,1),ft--;continue}lt=zt}}B(P),L.forEach(B);const U=L.length,k=P;for(let et=0;et<U;et++){const at=L[et];P=P.concat(at)}function K(et,at,ot){return at||le("ExtrudeGeometry: vec does not exist"),et.clone().addScaledVector(at,ot)}const W=P.length;function rt(et,at,ot){let lt,ft,kt;const zt=et.x-at.x,Wt=et.y-at.y,qt=ot.x-et.x,D=ot.y-et.y,fe=zt*zt+Wt*Wt,te=zt*D-Wt*qt;if(Math.abs(te)>Number.EPSILON){const R=Math.sqrt(fe),x=Math.sqrt(qt*qt+D*D),z=at.x-Wt/R,V=at.y+zt/R,$=ot.x-D/x,ht=ot.y+qt/x,ut=(($-z)*D-(ht-V)*qt)/(zt*D-Wt*qt);lt=z+zt*ut-et.x,ft=V+Wt*ut-et.y;const Y=lt*lt+ft*ft;if(Y<=2)return new ct(lt,ft);kt=Math.sqrt(Y/2)}else{let R=!1;zt>Number.EPSILON?qt>Number.EPSILON&&(R=!0):zt<-Number.EPSILON?qt<-Number.EPSILON&&(R=!0):Math.sign(Wt)===Math.sign(D)&&(R=!0),R?(lt=-Wt,ft=zt,kt=Math.sqrt(fe)):(lt=zt,ft=Wt,kt=Math.sqrt(fe/2))}return new ct(lt/kt,ft/kt)}const q=[];for(let et=0,at=k.length,ot=at-1,lt=et+1;et<at;et++,ot++,lt++)ot===at&&(ot=0),lt===at&&(lt=0),q[et]=rt(k[et],k[ot],k[lt]);const j=[];let nt,It=q.concat();for(let et=0,at=U;et<at;et++){const ot=L[et];nt=[];for(let lt=0,ft=ot.length,kt=ft-1,zt=lt+1;lt<ft;lt++,kt++,zt++)kt===ft&&(kt=0),zt===ft&&(zt=0),nt[lt]=rt(ot[lt],ot[kt],ot[zt]);j.push(nt),It=It.concat(nt)}let Tt;if(m===0)Tt=Cs.triangulateShape(k,L);else{const et=[],at=[];for(let ot=0;ot<m;ot++){const lt=ot/m,ft=d*Math.cos(lt*Math.PI/2),kt=g*Math.sin(lt*Math.PI/2)+v;for(let zt=0,Wt=k.length;zt<Wt;zt++){const qt=K(k[zt],q[zt],kt);_t(qt.x,qt.y,-ft),lt===0&&et.push(qt)}for(let zt=0,Wt=U;zt<Wt;zt++){const qt=L[zt];nt=j[zt];const D=[];for(let fe=0,te=qt.length;fe<te;fe++){const R=K(qt[fe],nt[fe],kt);_t(R.x,R.y,-ft),lt===0&&D.push(R)}lt===0&&at.push(D)}}Tt=Cs.triangulateShape(et,at)}const ue=Tt.length,jt=g+v;for(let et=0;et<W;et++){const at=u?K(P[et],It[et],jt):P[et];y?(C.copy(w.normals[0]).multiplyScalar(at.x),T.copy(w.binormals[0]).multiplyScalar(at.y),_.copy(E[0]).add(C).add(T),_t(_.x,_.y,_.z)):_t(at.x,at.y,0)}for(let et=1;et<=h;et++)for(let at=0;at<W;at++){const ot=u?K(P[at],It[at],jt):P[at];y?(C.copy(w.normals[et]).multiplyScalar(ot.x),T.copy(w.binormals[et]).multiplyScalar(ot.y),_.copy(E[et]).add(C).add(T),_t(_.x,_.y,_.z)):_t(ot.x,ot.y,f/h*et)}for(let et=m-1;et>=0;et--){const at=et/m,ot=d*Math.cos(at*Math.PI/2),lt=g*Math.sin(at*Math.PI/2)+v;for(let ft=0,kt=k.length;ft<kt;ft++){const zt=K(k[ft],q[ft],lt);_t(zt.x,zt.y,f+ot)}for(let ft=0,kt=L.length;ft<kt;ft++){const zt=L[ft];nt=j[ft];for(let Wt=0,qt=zt.length;Wt<qt;Wt++){const D=K(zt[Wt],nt[Wt],lt);y?_t(D.x,D.y+E[h-1].y,E[h-1].x+ot):_t(D.x,D.y,f+ot)}}}ce(),Z();function ce(){const et=i.length/3;if(u){let at=0,ot=W*at;for(let lt=0;lt<ue;lt++){const ft=Tt[lt];Gt(ft[2]+ot,ft[1]+ot,ft[0]+ot)}at=h+m*2,ot=W*at;for(let lt=0;lt<ue;lt++){const ft=Tt[lt];Gt(ft[0]+ot,ft[1]+ot,ft[2]+ot)}}else{for(let at=0;at<ue;at++){const ot=Tt[at];Gt(ot[2],ot[1],ot[0])}for(let at=0;at<ue;at++){const ot=Tt[at];Gt(ot[0]+W*h,ot[1]+W*h,ot[2]+W*h)}}n.addGroup(et,i.length/3-et,0)}function Z(){const et=i.length/3;let at=0;tt(k,at),at+=k.length;for(let ot=0,lt=L.length;ot<lt;ot++){const ft=L[ot];tt(ft,at),at+=ft.length}n.addGroup(et,i.length/3-et,1)}function tt(et,at){let ot=et.length;for(;--ot>=0;){const lt=ot;let ft=ot-1;ft<0&&(ft=et.length-1);for(let kt=0,zt=h+m*2;kt<zt;kt++){const Wt=W*kt,qt=W*(kt+1),D=at+lt+Wt,fe=at+ft+Wt,te=at+ft+qt,R=at+lt+qt;bt(D,fe,te,R)}}}function _t(et,at,ot){l.push(et),l.push(at),l.push(ot)}function Gt(et,at,ot){Vt(et),Vt(at),Vt(ot);const lt=i.length/3,ft=M.generateTopUV(n,i,lt-3,lt-2,lt-1);ge(ft[0]),ge(ft[1]),ge(ft[2])}function bt(et,at,ot,lt){Vt(et),Vt(at),Vt(lt),Vt(at),Vt(ot),Vt(lt);const ft=i.length/3,kt=M.generateSideWallUV(n,i,ft-6,ft-3,ft-2,ft-1);ge(kt[0]),ge(kt[1]),ge(kt[3]),ge(kt[1]),ge(kt[2]),ge(kt[3])}function Vt(et){i.push(l[et*3+0]),i.push(l[et*3+1]),i.push(l[et*3+2])}function ge(et){r.push(et.x),r.push(et.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return fm(e,n,t)}static fromJSON(t,e){const n=[];for(let r=0,a=t.shapes.length;r<a;r++){const o=e[t.shapes[r]];n.push(o)}const i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new $l[i.type]().fromJSON(i)),new wc(n,t.options)}}const um={generateTopUV:function(s,t,e,n,i){const r=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[i*3],h=t[i*3+1];return[new ct(r,a),new ct(o,l),new ct(c,h)]},generateSideWallUV:function(s,t,e,n,i,r){const a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],f=t[n*3+2],u=t[i*3],d=t[i*3+1],g=t[i*3+2],v=t[r*3],m=t[r*3+1],p=t[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new ct(a,1-l),new ct(c,1-f),new ct(u,1-g),new ct(v,1-p)]:[new ct(o,1-l),new ct(h,1-f),new ct(d,1-g),new ct(m,1-p)]}};function fm(s,t,e){if(e.shapes=[],Array.isArray(s))for(let n=0,i=s.length;n<i;n++){const r=s[n];e.shapes.push(r.uuid)}else e.shapes.push(s.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}class Ln extends Ja{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Ln(t.radius,t.detail)}}class Qa extends Ja{constructor(t=1,e=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],i=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,i,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Qa(t.radius,t.detail)}}class li extends Be{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(i),c=o+1,h=l+1,f=t/o,u=e/l,d=[],g=[],v=[],m=[];for(let p=0;p<h;p++){const M=p*u-a;for(let E=0;E<c;E++){const y=E*f-r;g.push(y,-M,0),v.push(0,0,1),m.push(E/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let M=0;M<o;M++){const E=M+c*p,y=M+c*(p+1),w=M+1+c*(p+1),T=M+1+c*p;d.push(E,y,T),d.push(y,w,T)}this.setIndex(d),this.setAttribute("position",new ve(g,3)),this.setAttribute("normal",new ve(v,3)),this.setAttribute("uv",new ve(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new li(t.width,t.height,t.widthSegments,t.heightSegments)}}class Ec extends Be{constructor(t=.5,e=1,n=32,i=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:i,thetaStart:r,thetaLength:a},n=Math.max(3,n),i=Math.max(1,i);const o=[],l=[],c=[],h=[];let f=t;const u=(e-t)/i,d=new I,g=new ct;for(let v=0;v<=i;v++){for(let m=0;m<=n;m++){const p=r+m/n*a;d.x=f*Math.cos(p),d.y=f*Math.sin(p),l.push(d.x,d.y,d.z),c.push(0,0,1),g.x=(d.x/e+1)/2,g.y=(d.y/e+1)/2,h.push(g.x,g.y)}f+=u}for(let v=0;v<i;v++){const m=v*(n+1);for(let p=0;p<n;p++){const M=p+m,E=M,y=M+n+1,w=M+n+2,T=M+1;o.push(E,y,T),o.push(y,w,T)}}this.setIndex(o),this.setAttribute("position",new ve(l,3)),this.setAttribute("normal",new ve(c,3)),this.setAttribute("uv",new ve(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ec(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}}class ye extends Be{constructor(t=1,e=32,n=16,i=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],f=new I,u=new I,d=[],g=[],v=[],m=[];for(let p=0;p<=n;p++){const M=[],E=p/n,y=a+E*o,w=t*Math.cos(y),T=Math.sqrt(t*t-w*w);let C=0;p===0&&a===0?C=.5/e:p===n&&l===Math.PI&&(C=-.5/e);for(let _=0;_<=e;_++){const A=_/e,P=i+A*r;f.x=-T*Math.cos(P),f.y=w,f.z=T*Math.sin(P),g.push(f.x,f.y,f.z),u.copy(f).normalize(),v.push(u.x,u.y,u.z),m.push(A+C,1-E),M.push(c++)}h.push(M)}for(let p=0;p<n;p++)for(let M=0;M<e;M++){const E=h[p][M+1],y=h[p][M],w=h[p+1][M],T=h[p+1][M+1];(p!==0||a>0)&&d.push(E,y,T),(p!==n-1||l<Math.PI)&&d.push(y,w,T)}this.setIndex(d),this.setAttribute("position",new ve(g,3)),this.setAttribute("normal",new ve(v,3)),this.setAttribute("uv",new ve(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ye(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class dn extends Be{constructor(t=1,e=.4,n=12,i=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:r,thetaStart:a,thetaLength:o},n=Math.floor(n),i=Math.floor(i);const l=[],c=[],h=[],f=[],u=new I,d=new I,g=new I;for(let v=0;v<=n;v++){const m=a+v/n*o;for(let p=0;p<=i;p++){const M=p/i*r;d.x=(t+e*Math.cos(m))*Math.cos(M),d.y=(t+e*Math.cos(m))*Math.sin(M),d.z=e*Math.sin(m),c.push(d.x,d.y,d.z),u.x=t*Math.cos(M),u.y=t*Math.sin(M),g.subVectors(d,u).normalize(),h.push(g.x,g.y,g.z),f.push(p/i),f.push(v/n)}}for(let v=1;v<=n;v++)for(let m=1;m<=i;m++){const p=(i+1)*v+m-1,M=(i+1)*(v-1)+m-1,E=(i+1)*(v-1)+m,y=(i+1)*v+m;l.push(p,M,y),l.push(M,E,y)}this.setIndex(l),this.setAttribute("position",new ve(c,3)),this.setAttribute("normal",new ve(h,3)),this.setAttribute("uv",new ve(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new dn(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}}function ks(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];if(Nh(i))i.isRenderTargetTexture?(Xt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone();else if(Array.isArray(i))if(Nh(i[0])){const r=[];for(let a=0,o=i.length;a<o;a++)r[a]=i[a].clone();t[e][n]=r}else t[e][n]=i.slice();else t[e][n]=i}}return t}function je(s){const t={};for(let e=0;e<s.length;e++){const n=ks(s[e]);for(const i in n)t[i]=n[i]}return t}function Nh(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function dm(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function wf(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ae.workingColorSpace}const pm={clone:ks,merge:je};var mm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,gm=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class In extends ts{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=mm,this.fragmentShader=gm,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ks(t.uniforms),this.uniformsGroups=dm(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const a=this.uniforms[i].value;a&&a.isTexture?e.uniforms[i]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[i]={type:"m4",value:a.toArray()}:e.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(const n in t.uniforms){const i=t.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=e[i.value]||null;break;case"c":this.uniforms[n].value=new Ft().setHex(i.value);break;case"v2":this.uniforms[n].value=new ct().fromArray(i.value);break;case"v3":this.uniforms[n].value=new I().fromArray(i.value);break;case"v4":this.uniforms[n].value=new Te().fromArray(i.value);break;case"m3":this.uniforms[n].value=new Yt().fromArray(i.value);break;case"m4":this.uniforms[n].value=new ie().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(const n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}}class xm extends In{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Ds extends ts{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Ft(16777215),this.specular=new Ft(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ft(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Na,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Ya,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class an extends ts{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ft(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ft(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Na,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Ya,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class vm extends ts{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Zd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class _m extends ts{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Ef extends ze{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ft(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class Tc extends Ef{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ze.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ft(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const zo=new ie,Uh=new I,Fh=new I;class Mm{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ct(512,512),this.mapType=un,this.map=null,this.mapPass=null,this.matrix=new ie,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new yc,this._frameExtents=new ct(1,1),this._viewportCount=1,this._viewports=[new Te(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera;Uh.setFromMatrixPosition(t.matrixWorld),e.position.copy(Uh),Fh.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Fh),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,i){zo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(zo,t.coordinateSystem,t.reversedDepth);const r=this._frameExtents,a=i?i.z/r.x:1,o=i?i.w/r.y:1,l=i?i.x/r.x:0,c=i?i.y/r.y:0;t.coordinateSystem===Dr||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(zo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const pa=new I,ma=new Yn,Fn=new I;class Tf extends ze{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ie,this.projectionMatrix=new ie,this.projectionMatrixInverse=new ie,this.coordinateSystem=Vn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(pa,ma,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(pa,ma,Fn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(pa,ma,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(pa,ma,Fn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const _i=new I,Oh=new ct,zh=new ct;class on extends Tf{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Xl*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(uo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Xl*2*Math.atan(Math.tan(uo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){_i.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(_i.x,_i.y).multiplyScalar(-t/_i.z),_i.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(_i.x,_i.y).multiplyScalar(-t/_i.z)}getViewSize(t,e){return this.getViewBounds(t,Oh,zh),e.subVectors(zh,Oh)}setViewOffset(t,e,n,i,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(uo*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,r=-.5*i;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*i/l,e-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}class Ac extends Tf{constructor(t=-1,e=1,n=1,i=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-t,a=n+t,o=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class ym extends Mm{constructor(){super(new Ac(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Rc extends Ef{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ze.DEFAULT_UP),this.updateMatrix(),this.target=new ze,this.shadow=new ym}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}const vs=-90,_s=1;class Sm extends ze{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new on(vs,_s,t,e);i.layers=this.layers,this.add(i);const r=new on(vs,_s,t,e);r.layers=this.layers,this.add(r);const a=new on(vs,_s,t,e);a.layers=this.layers,this.add(a);const o=new on(vs,_s,t,e);o.layers=this.layers,this.add(o);const l=new on(vs,_s,t,e);l.layers=this.layers,this.add(l);const c=new on(vs,_s,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,r,a,o,l]=e;for(const c of e)this.remove(c);if(t===Vn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Dr)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,h]=this.children,f=t.getRenderTarget(),u=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,i),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(f,u,d),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class bm extends on{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}const Fc=class Fc{constructor(t,e,n,i){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,i){const r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=i,this}};Fc.prototype.isMatrix2=!0;let Bh=Fc;function kh(s,t,e,n){const i=wm(n);switch(e){case ju:return s*t;case fc:return s*t/i.components*i.byteLength;case dc:return s*t/i.components*i.byteLength;case Ki:return s*t*2/i.components*i.byteLength;case pc:return s*t*2/i.components*i.byteLength;case tf:return s*t*3/i.components*i.byteLength;case Pn:return s*t*4/i.components*i.byteLength;case mc:return s*t*4/i.components*i.byteLength;case ba:case wa:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Ea:case Ta:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case gl:case vl:return Math.max(s,16)*Math.max(t,8)/4;case ml:case xl:return Math.max(s,8)*Math.max(t,8)/2;case _l:case Ml:case Sl:case bl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case yl:case Ia:case wl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case El:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Tl:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case Al:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case Rl:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Cl:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case Pl:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Ll:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Il:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Dl:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case Nl:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Ul:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case Fl:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case Ol:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case zl:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case Bl:case kl:case Hl:return Math.ceil(s/4)*Math.ceil(t/4)*16;case Gl:case Vl:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Da:case Wl:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function wm(s){switch(s){case un:case Zu:return{byteLength:1,components:1};case Pr:case Ku:case $n:return{byteLength:2,components:1};case hc:case uc:return{byteLength:2,components:4};case qn:case cc:case Cn:return{byteLength:4,components:1};case Ju:case Qu:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:lc}}));typeof window<"u"&&(window.__THREE__?Xt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=lc);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Af(){let s=null,t=!1,e=null,n=null;function i(r,a){n=s.requestAnimationFrame(i),e(r,a)}return{start:function(){t!==!0&&e!==null&&s!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function Em(s){const t=new WeakMap;function e(o,l){const c=o.array,h=o.usage,f=c.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,c,h),o.onUploadCallback();let d;if(c instanceof Float32Array)d=s.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=s.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=s.HALF_FLOAT:d=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=s.SHORT;else if(c instanceof Uint32Array)d=s.UNSIGNED_INT;else if(c instanceof Int32Array)d=s.INT;else if(c instanceof Int8Array)d=s.BYTE;else if(c instanceof Uint8Array)d=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function n(o,l,c){const h=l.array,f=l.updateRanges;if(s.bindBuffer(c,o),f.length===0)s.bufferSubData(c,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){const g=f[u],v=f[d];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++u,f[u]=v)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){const v=f[d];s.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(s.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:i,remove:r,update:a}}var Tm=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Am=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Rm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cm=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Lm=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Im=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Dm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Nm=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Um=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Fm=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Om=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,zm=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Bm=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,km=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Hm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Gm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Wm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Xm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,qm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,$m=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Ym=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Zm=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Km=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Jm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Qm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,jm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,t0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,e0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,n0="gl_FragColor = linearToOutputTexel( gl_FragColor );",i0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,s0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,r0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,a0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,o0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,l0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,c0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,h0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,u0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,f0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,d0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,p0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,m0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,g0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,x0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,v0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,_0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,M0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,y0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,S0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,b0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,w0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,E0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,T0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,A0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,R0=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,C0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,P0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,L0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,I0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,D0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,N0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,U0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,F0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,O0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,z0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,B0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,k0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,H0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,G0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,V0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,W0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,X0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,q0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Y0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Z0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,K0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,J0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Q0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,j0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,tg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,eg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,ng=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ig=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,sg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,rg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ag=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,og=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,lg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,cg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,hg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,ug=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,fg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,dg=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,pg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,mg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,gg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,xg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,vg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,_g=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Mg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,yg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Sg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,bg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Eg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Tg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Ag=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Rg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Lg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ig=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Dg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Ng=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Ug=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Fg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Og=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,kg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Hg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Wg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Xg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,$g=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Yg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Kg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Jg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Qg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,jg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tx=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ex=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,nx=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ix=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sx=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,rx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qt={alphahash_fragment:Tm,alphahash_pars_fragment:Am,alphamap_fragment:Rm,alphamap_pars_fragment:Cm,alphatest_fragment:Pm,alphatest_pars_fragment:Lm,aomap_fragment:Im,aomap_pars_fragment:Dm,batching_pars_vertex:Nm,batching_vertex:Um,begin_vertex:Fm,beginnormal_vertex:Om,bsdfs:zm,iridescence_fragment:Bm,bumpmap_pars_fragment:km,clipping_planes_fragment:Hm,clipping_planes_pars_fragment:Gm,clipping_planes_pars_vertex:Vm,clipping_planes_vertex:Wm,color_fragment:Xm,color_pars_fragment:qm,color_pars_vertex:$m,color_vertex:Ym,common:Zm,cube_uv_reflection_fragment:Km,defaultnormal_vertex:Jm,displacementmap_pars_vertex:Qm,displacementmap_vertex:jm,emissivemap_fragment:t0,emissivemap_pars_fragment:e0,colorspace_fragment:n0,colorspace_pars_fragment:i0,envmap_fragment:s0,envmap_common_pars_fragment:r0,envmap_pars_fragment:a0,envmap_pars_vertex:o0,envmap_physical_pars_fragment:v0,envmap_vertex:l0,fog_vertex:c0,fog_pars_vertex:h0,fog_fragment:u0,fog_pars_fragment:f0,gradientmap_pars_fragment:d0,lightmap_pars_fragment:p0,lights_lambert_fragment:m0,lights_lambert_pars_fragment:g0,lights_pars_begin:x0,lights_toon_fragment:_0,lights_toon_pars_fragment:M0,lights_phong_fragment:y0,lights_phong_pars_fragment:S0,lights_physical_fragment:b0,lights_physical_pars_fragment:w0,lights_fragment_begin:E0,lights_fragment_maps:T0,lights_fragment_end:A0,lightprobes_pars_fragment:R0,logdepthbuf_fragment:C0,logdepthbuf_pars_fragment:P0,logdepthbuf_pars_vertex:L0,logdepthbuf_vertex:I0,map_fragment:D0,map_pars_fragment:N0,map_particle_fragment:U0,map_particle_pars_fragment:F0,metalnessmap_fragment:O0,metalnessmap_pars_fragment:z0,morphinstance_vertex:B0,morphcolor_vertex:k0,morphnormal_vertex:H0,morphtarget_pars_vertex:G0,morphtarget_vertex:V0,normal_fragment_begin:W0,normal_fragment_maps:X0,normal_pars_fragment:q0,normal_pars_vertex:$0,normal_vertex:Y0,normalmap_pars_fragment:Z0,clearcoat_normal_fragment_begin:K0,clearcoat_normal_fragment_maps:J0,clearcoat_pars_fragment:Q0,iridescence_pars_fragment:j0,opaque_fragment:tg,packing:eg,premultiplied_alpha_fragment:ng,project_vertex:ig,dithering_fragment:sg,dithering_pars_fragment:rg,roughnessmap_fragment:ag,roughnessmap_pars_fragment:og,shadowmap_pars_fragment:lg,shadowmap_pars_vertex:cg,shadowmap_vertex:hg,shadowmask_pars_fragment:ug,skinbase_vertex:fg,skinning_pars_vertex:dg,skinning_vertex:pg,skinnormal_vertex:mg,specularmap_fragment:gg,specularmap_pars_fragment:xg,tonemapping_fragment:vg,tonemapping_pars_fragment:_g,transmission_fragment:Mg,transmission_pars_fragment:yg,uv_pars_fragment:Sg,uv_pars_vertex:bg,uv_vertex:wg,worldpos_vertex:Eg,background_vert:Tg,background_frag:Ag,backgroundCube_vert:Rg,backgroundCube_frag:Cg,cube_vert:Pg,cube_frag:Lg,depth_vert:Ig,depth_frag:Dg,distance_vert:Ng,distance_frag:Ug,equirect_vert:Fg,equirect_frag:Og,linedashed_vert:zg,linedashed_frag:Bg,meshbasic_vert:kg,meshbasic_frag:Hg,meshlambert_vert:Gg,meshlambert_frag:Vg,meshmatcap_vert:Wg,meshmatcap_frag:Xg,meshnormal_vert:qg,meshnormal_frag:$g,meshphong_vert:Yg,meshphong_frag:Zg,meshphysical_vert:Kg,meshphysical_frag:Jg,meshtoon_vert:Qg,meshtoon_frag:jg,points_vert:tx,points_frag:ex,shadow_vert:nx,shadow_frag:ix,sprite_vert:sx,sprite_frag:rx},vt={common:{diffuse:{value:new Ft(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Yt},alphaMap:{value:null},alphaMapTransform:{value:new Yt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Yt}},envmap:{envMap:{value:null},envMapRotation:{value:new Yt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Yt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Yt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Yt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Yt},normalScale:{value:new ct(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Yt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Yt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Yt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Yt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ft(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new I},probesMax:{value:new I},probesResolution:{value:new I}},points:{diffuse:{value:new Ft(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Yt},alphaTest:{value:0},uvTransform:{value:new Yt}},sprite:{diffuse:{value:new Ft(16777215)},opacity:{value:1},center:{value:new ct(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Yt},alphaMap:{value:null},alphaMapTransform:{value:new Yt},alphaTest:{value:0}}},Bn={basic:{uniforms:je([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.fog]),vertexShader:Qt.meshbasic_vert,fragmentShader:Qt.meshbasic_frag},lambert:{uniforms:je([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,vt.lights,{emissive:{value:new Ft(0)},envMapIntensity:{value:1}}]),vertexShader:Qt.meshlambert_vert,fragmentShader:Qt.meshlambert_frag},phong:{uniforms:je([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,vt.lights,{emissive:{value:new Ft(0)},specular:{value:new Ft(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qt.meshphong_vert,fragmentShader:Qt.meshphong_frag},standard:{uniforms:je([vt.common,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.roughnessmap,vt.metalnessmap,vt.fog,vt.lights,{emissive:{value:new Ft(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qt.meshphysical_vert,fragmentShader:Qt.meshphysical_frag},toon:{uniforms:je([vt.common,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.gradientmap,vt.fog,vt.lights,{emissive:{value:new Ft(0)}}]),vertexShader:Qt.meshtoon_vert,fragmentShader:Qt.meshtoon_frag},matcap:{uniforms:je([vt.common,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,{matcap:{value:null}}]),vertexShader:Qt.meshmatcap_vert,fragmentShader:Qt.meshmatcap_frag},points:{uniforms:je([vt.points,vt.fog]),vertexShader:Qt.points_vert,fragmentShader:Qt.points_frag},dashed:{uniforms:je([vt.common,vt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qt.linedashed_vert,fragmentShader:Qt.linedashed_frag},depth:{uniforms:je([vt.common,vt.displacementmap]),vertexShader:Qt.depth_vert,fragmentShader:Qt.depth_frag},normal:{uniforms:je([vt.common,vt.bumpmap,vt.normalmap,vt.displacementmap,{opacity:{value:1}}]),vertexShader:Qt.meshnormal_vert,fragmentShader:Qt.meshnormal_frag},sprite:{uniforms:je([vt.sprite,vt.fog]),vertexShader:Qt.sprite_vert,fragmentShader:Qt.sprite_frag},background:{uniforms:{uvTransform:{value:new Yt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qt.background_vert,fragmentShader:Qt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Yt}},vertexShader:Qt.backgroundCube_vert,fragmentShader:Qt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qt.cube_vert,fragmentShader:Qt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qt.equirect_vert,fragmentShader:Qt.equirect_frag},distance:{uniforms:je([vt.common,vt.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qt.distance_vert,fragmentShader:Qt.distance_frag},shadow:{uniforms:je([vt.lights,vt.fog,{color:{value:new Ft(0)},opacity:{value:1}}]),vertexShader:Qt.shadow_vert,fragmentShader:Qt.shadow_frag}};Bn.physical={uniforms:je([Bn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Yt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Yt},clearcoatNormalScale:{value:new ct(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Yt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Yt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Yt},sheen:{value:0},sheenColor:{value:new Ft(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Yt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Yt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Yt},transmissionSamplerSize:{value:new ct},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Yt},attenuationDistance:{value:0},attenuationColor:{value:new Ft(0)},specularColor:{value:new Ft(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Yt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Yt},anisotropyVector:{value:new ct},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Yt}}]),vertexShader:Qt.meshphysical_vert,fragmentShader:Qt.meshphysical_frag};const ga={r:0,b:0,g:0},ax=new ie,Rf=new Yt;Rf.set(-1,0,0,0,1,0,0,0,1);function ox(s,t,e,n,i,r){const a=new Ft(0);let o=i===!0?0:1,l,c,h=null,f=0,u=null;function d(M){let E=M.isScene===!0?M.background:null;if(E&&E.isTexture){const y=M.backgroundBlurriness>0;E=t.get(E,y)}return E}function g(M){let E=!1;const y=d(M);y===null?m(a,o):y&&y.isColor&&(m(y,1),E=!0);const w=s.xr.getEnvironmentBlendMode();w==="additive"?e.buffers.color.setClear(0,0,0,1,r):w==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(s.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function v(M,E){const y=d(E);y&&(y.isCubeTexture||y.mapping===Za)?(c===void 0&&(c=new re(new bn(1,1,1),new In({name:"BackgroundCubeMaterial",uniforms:ks(Bn.backgroundCube.uniforms),vertexShader:Bn.backgroundCube.vertexShader,fragmentShader:Bn.backgroundCube.fragmentShader,side:nn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(w,T,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=y,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(ax.makeRotationFromEuler(E.backgroundRotation)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Rf),c.material.toneMapped=ae.getTransfer(y.colorSpace)!==xe,(h!==y||f!==y.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=y,f=y.version,u=s.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new re(new li(2,2),new In({name:"BackgroundMaterial",uniforms:ks(Bn.background.uniforms),vertexShader:Bn.background.vertexShader,fragmentShader:Bn.background.fragmentShader,side:Yi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=ae.getTransfer(y.colorSpace)!==xe,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||f!==y.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=y,f=y.version,u=s.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function m(M,E){M.getRGB(ga,wf(s)),e.buffers.color.setClear(ga.r,ga.g,ga.b,E,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(M,E=1){a.set(M),o=E,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(M){o=M,m(a,o)},render:g,addToRenderList:v,dispose:p}}function lx(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let r=i,a=!1;function o(L,N,B,U,k){let K=!1;const W=f(L,U,B,N);r!==W&&(r=W,c(r.object)),K=d(L,U,B,k),K&&g(L,U,B,k),k!==null&&t.update(k,s.ELEMENT_ARRAY_BUFFER),(K||a)&&(a=!1,y(L,N,B,U),k!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(k).buffer))}function l(){return s.createVertexArray()}function c(L){return s.bindVertexArray(L)}function h(L){return s.deleteVertexArray(L)}function f(L,N,B,U){const k=U.wireframe===!0;let K=n[N.id];K===void 0&&(K={},n[N.id]=K);const W=L.isInstancedMesh===!0?L.id:0;let rt=K[W];rt===void 0&&(rt={},K[W]=rt);let q=rt[B.id];q===void 0&&(q={},rt[B.id]=q);let j=q[k];return j===void 0&&(j=u(l()),q[k]=j),j}function u(L){const N=[],B=[],U=[];for(let k=0;k<e;k++)N[k]=0,B[k]=0,U[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:B,attributeDivisors:U,object:L,attributes:{},index:null}}function d(L,N,B,U){const k=r.attributes,K=N.attributes;let W=0;const rt=B.getAttributes();for(const q in rt)if(rt[q].location>=0){const nt=k[q];let It=K[q];if(It===void 0&&(q==="instanceMatrix"&&L.instanceMatrix&&(It=L.instanceMatrix),q==="instanceColor"&&L.instanceColor&&(It=L.instanceColor)),nt===void 0||nt.attribute!==It||It&&nt.data!==It.data)return!0;W++}return r.attributesNum!==W||r.index!==U}function g(L,N,B,U){const k={},K=N.attributes;let W=0;const rt=B.getAttributes();for(const q in rt)if(rt[q].location>=0){let nt=K[q];nt===void 0&&(q==="instanceMatrix"&&L.instanceMatrix&&(nt=L.instanceMatrix),q==="instanceColor"&&L.instanceColor&&(nt=L.instanceColor));const It={};It.attribute=nt,nt&&nt.data&&(It.data=nt.data),k[q]=It,W++}r.attributes=k,r.attributesNum=W,r.index=U}function v(){const L=r.newAttributes;for(let N=0,B=L.length;N<B;N++)L[N]=0}function m(L){p(L,0)}function p(L,N){const B=r.newAttributes,U=r.enabledAttributes,k=r.attributeDivisors;B[L]=1,U[L]===0&&(s.enableVertexAttribArray(L),U[L]=1),k[L]!==N&&(s.vertexAttribDivisor(L,N),k[L]=N)}function M(){const L=r.newAttributes,N=r.enabledAttributes;for(let B=0,U=N.length;B<U;B++)N[B]!==L[B]&&(s.disableVertexAttribArray(B),N[B]=0)}function E(L,N,B,U,k,K,W){W===!0?s.vertexAttribIPointer(L,N,B,k,K):s.vertexAttribPointer(L,N,B,U,k,K)}function y(L,N,B,U){v();const k=U.attributes,K=B.getAttributes(),W=N.defaultAttributeValues;for(const rt in K){const q=K[rt];if(q.location>=0){let j=k[rt];if(j===void 0&&(rt==="instanceMatrix"&&L.instanceMatrix&&(j=L.instanceMatrix),rt==="instanceColor"&&L.instanceColor&&(j=L.instanceColor)),j!==void 0){const nt=j.normalized,It=j.itemSize,Tt=t.get(j);if(Tt===void 0)continue;const ue=Tt.buffer,jt=Tt.type,ce=Tt.bytesPerElement,Z=jt===s.INT||jt===s.UNSIGNED_INT||j.gpuType===cc;if(j.isInterleavedBufferAttribute){const tt=j.data,_t=tt.stride,Gt=j.offset;if(tt.isInstancedInterleavedBuffer){for(let bt=0;bt<q.locationSize;bt++)p(q.location+bt,tt.meshPerAttribute);L.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=tt.meshPerAttribute*tt.count)}else for(let bt=0;bt<q.locationSize;bt++)m(q.location+bt);s.bindBuffer(s.ARRAY_BUFFER,ue);for(let bt=0;bt<q.locationSize;bt++)E(q.location+bt,It/q.locationSize,jt,nt,_t*ce,(Gt+It/q.locationSize*bt)*ce,Z)}else{if(j.isInstancedBufferAttribute){for(let tt=0;tt<q.locationSize;tt++)p(q.location+tt,j.meshPerAttribute);L.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let tt=0;tt<q.locationSize;tt++)m(q.location+tt);s.bindBuffer(s.ARRAY_BUFFER,ue);for(let tt=0;tt<q.locationSize;tt++)E(q.location+tt,It/q.locationSize,jt,nt,It*ce,It/q.locationSize*tt*ce,Z)}}else if(W!==void 0){const nt=W[rt];if(nt!==void 0)switch(nt.length){case 2:s.vertexAttrib2fv(q.location,nt);break;case 3:s.vertexAttrib3fv(q.location,nt);break;case 4:s.vertexAttrib4fv(q.location,nt);break;default:s.vertexAttrib1fv(q.location,nt)}}}}M()}function w(){A();for(const L in n){const N=n[L];for(const B in N){const U=N[B];for(const k in U){const K=U[k];for(const W in K)h(K[W].object),delete K[W];delete U[k]}}delete n[L]}}function T(L){if(n[L.id]===void 0)return;const N=n[L.id];for(const B in N){const U=N[B];for(const k in U){const K=U[k];for(const W in K)h(K[W].object),delete K[W];delete U[k]}}delete n[L.id]}function C(L){for(const N in n){const B=n[N];for(const U in B){const k=B[U];if(k[L.id]===void 0)continue;const K=k[L.id];for(const W in K)h(K[W].object),delete K[W];delete k[L.id]}}}function _(L){for(const N in n){const B=n[N],U=L.isInstancedMesh===!0?L.id:0,k=B[U];if(k!==void 0){for(const K in k){const W=k[K];for(const rt in W)h(W[rt].object),delete W[rt];delete k[K]}delete B[U],Object.keys(B).length===0&&delete n[N]}}}function A(){P(),a=!0,r!==i&&(r=i,c(r.object))}function P(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:A,resetDefaultState:P,dispose:w,releaseStatesOfGeometry:T,releaseStatesOfObject:_,releaseStatesOfProgram:C,initAttributes:v,enableAttribute:m,disableUnusedAttributes:M}}function cx(s,t,e){let n;function i(l){n=l}function r(l,c){s.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(s.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];e.update(u,n,1)}this.setMode=i,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function hx(s,t,e,n){let i;function r(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const C=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function a(C){return!(C!==Pn&&n.convert(C)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(C){const _=C===$n&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==un&&C!==Cn&&!_&&n.convert(C)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function l(C){if(C==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(Xt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const f=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Xt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const d=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=s.getParameter(s.MAX_TEXTURE_SIZE),m=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),M=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),E=s.getParameter(s.MAX_VARYING_VECTORS),y=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),w=s.getParameter(s.MAX_SAMPLES),T=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:u,maxTextures:d,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:M,maxVaryings:E,maxFragmentUniforms:y,maxSamples:w,samples:T}}function ux(s){const t=this;let e=null,n=0,i=!1,r=!1;const a=new wi,o=new Yt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){const d=f.length!==0||u||n!==0||i;return i=u,n=f.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,u){e=h(f,u,0)},this.setState=function(f,u,d){const g=f.clippingPlanes,v=f.clipIntersection,m=f.clipShadows,p=s.get(f);if(!i||g===null||g.length===0||r&&!m)r?h(null):c();else{const M=r?0:n,E=M*4;let y=p.clippingState||null;l.value=y,y=h(g,u,E,d);for(let w=0;w!==E;++w)y[w]=e[w];p.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(f,u,d,g){const v=f!==null?f.length:0;let m=null;if(v!==0){if(m=l.value,g!==!0||m===null){const p=d+v*4,M=u.matrixWorldInverse;o.getNormalMatrix(M),(m===null||m.length<p)&&(m=new Float32Array(p));for(let E=0,y=d;E!==v;++E,y+=4)a.copy(f[E]).applyMatrix4(M,o),a.normal.toArray(m,y),m[y+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,m}}const Ps=4,fx=6,dx=20,px=256,js=new Ac,Hh=new Ft;let Bo=null,ko=0,Ho=0,Go=!1;const mx=new I,Fi=new I;class Gh{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,i=100,r={}){const{size:a=256,position:o=mx}=r;Bo=this._renderer.getRenderTarget(),ko=this._renderer.getActiveCubeFace(),Ho=this._renderer.getActiveMipmapLevel(),Go=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,i,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Wh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Bo,ko,Ho),this._renderer.xr.enabled=Go,t.scissorTest=!1,Ms(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Zi||t.mapping===zs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Bo=this._renderer.getRenderTarget(),ko=this._renderer.getActiveCubeFace(),Ho=this._renderer.getActiveMipmapLevel(),Go=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Ye,minFilter:Ye,generateMipmaps:!1,type:$n,format:Pn,colorSpace:Ua,depthBuffer:!1},i=Vh(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Vh(t,e,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=gx(r)),this._blurMaterial=vx(r,t,e),this._ggxMaterial=xx(r,t,e)}return i}_compileMaterial(t){const e=new re(new Be,t);this._renderer.compile(e,js)}_sceneToCubeUV(t,e,n,i,r){const l=new on(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],f=this._renderer,u=f.autoClear,d=f.toneMapping;f.getClearColor(Hh),f.toneMapping=Wn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(i),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new re(new bn,new pn({name:"PMREM.Background",side:nn,depthWrite:!1,depthTest:!1})));const v=this._backgroundBox,m=v.material;let p=!1;const M=t.background;M?M.isColor&&(m.color.copy(M),t.background=null,p=!0):(m.color.copy(Hh),p=!0);for(let E=0;E<6;E++){const y=E%3;y===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):y===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));const w=this._cubeSize;Ms(i,y*w,E>2?w:0,w,w),f.setRenderTarget(i),p&&f.render(v,l),f.render(t,l)}f.toneMapping=d,f.autoClear=u,t.background=M}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===Zi||t.mapping===zs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xh()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Wh());const r=i?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;const o=r.uniforms;o.envMap.value=t;const l=this._cubeSize;Ms(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,js)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodMeshes.length;for(let r=1;r<i;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){const i=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;const l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),f=Math.sqrt(c*c-h*h),u=c*1.25,d=f*u,{_lodMax:g}=this,v=this._sizeLods[n],m=3*v*(n>g-Ps?n-g+Ps:0),p=4*(this._cubeSize-v);l.envMap.value=t.texture,l.roughness.value=d,l.mipInt.value=g-e,Ms(r,m,p,3*v,2*v),i.setRenderTarget(r),i.render(o,js),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Ms(t,m,p,3*v,2*v),i.setRenderTarget(t),i.render(o,js)}_blur(t,e,n,i){const r=this._pingPongRenderTarget,a=Math.min(i,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,i,r){const a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[i];l.material=o;const c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;const h=this._sizeLods[i],f=3*h*(i>this._lodMax-Ps?i-this._lodMax+Ps:0),u=4*(this._cubeSize-h);Ms(e,f,u,3*h,2*h),a.setRenderTarget(e),a.render(l,js)}}function gx(s){const t=[],e=[];let n=s;const i=s-Ps+1+fx;for(let r=0;r<i;r++){const a=Math.pow(2,n);t.push(a);const o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],f=6,u=6,d=3,g=new Float32Array(d*u*f),v=new Float32Array(d*u*f);for(let p=0;p<f;p++){const M=p%3*2/3-1,E=p>2?0:-1,y=[M,E,0,M+2/3,E,0,M+2/3,E+1,0,M,E,0,M+2/3,E+1,0,M,E+1,0];g.set(y,d*u*p);for(let w=0;w<u;w++){const T=h[w*2]*2-1,C=h[w*2+1]*2-1;p===0?Fi.set(1,C,T):p===1?Fi.set(-T,1,-C):p===2?Fi.set(-T,C,1):p===3?Fi.set(-1,C,-T):p===4?Fi.set(-T,-1,C):Fi.set(T,C,-1),Fi.toArray(v,(p*u+w)*d)}}const m=new Be;m.setAttribute("position",new Ge(g,d)),m.setAttribute("outputDirection",new Ge(v,d)),e.push(new re(m,null)),n>Ps&&n--}return{lodMeshes:e,sizeLods:t}}function Vh(s,t,e){const n=new Sn(s,t,e);return n.texture.mapping=Za,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ms(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function xx(s,t,e){return new In({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:px,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:ja(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function vx(s,t,e){return new In({name:"SphericalGaussianBlur",defines:{SAMPLES:dx,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:ja(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function Wh(){return new In({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ja(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function Xh(){return new In({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ja(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function ja(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class Cf extends Sn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new ff(i),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new bn(5,5,5),r=new In({name:"CubemapFromEquirect",uniforms:ks(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:nn,blending:ri});r.uniforms.tEquirect.value=e;const a=new re(i,r),o=e.minFilter;return e.minFilter===Gi&&(e.minFilter=Ye),new Sm(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,i=!0){const r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,i);t.setRenderTarget(r)}}function _x(s){let t=new WeakMap,e=new WeakMap,n=null;function i(u,d=!1){return u==null?null:d?a(u):r(u)}function r(u){if(u&&u.isTexture){const d=u.mapping;if(d===oo||d===lo)if(t.has(u)){const g=t.get(u).texture;return o(g,u.mapping)}else{const g=u.image;if(g&&g.height>0){const v=new Cf(g.height);return v.fromEquirectangularTexture(s,u),t.set(u,v),u.addEventListener("dispose",c),o(v.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){const d=u.mapping,g=d===oo||d===lo,v=d===Zi||d===zs;if(g||v){let m=e.get(u);const p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new Gh(s)),m=g?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{const M=u.image;return g&&M&&M.height>0||v&&M&&l(M)?(n===null&&(n=new Gh(s)),m=g?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function o(u,d){return d===oo?u.mapping=Zi:d===lo&&(u.mapping=zs),u}function l(u){let d=0;const g=6;for(let v=0;v<g;v++)u[v]!==void 0&&d++;return d===g}function c(u){const d=u.target;d.removeEventListener("dispose",c);const g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function h(u){const d=u.target;d.removeEventListener("dispose",h);const g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function f(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:f}}function Mx(s){const t={};function e(n){if(t[n]!==void 0)return t[n];const i=s.getExtension(n);return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&Ls("WebGLRenderer: "+n+" extension not supported."),i}}}function yx(s,t,e,n){const i={},r=new WeakMap;function a(f){const u=f.target;u.index!==null&&t.remove(u.index);for(const g in u.attributes)t.remove(u.attributes[g]);u.removeEventListener("dispose",a),delete i[u.id];const d=r.get(u);d&&(t.remove(d),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(f,u){return i[u.id]===!0||(u.addEventListener("dispose",a),i[u.id]=!0,e.memory.geometries++),u}function l(f){const u=f.attributes;for(const d in u)t.update(u[d],s.ARRAY_BUFFER)}function c(f){const u=[],d=f.index,g=f.attributes.position;let v=0;if(g===void 0)return;if(d!==null){const M=d.array;v=d.version;for(let E=0,y=M.length;E<y;E+=3){const w=M[E+0],T=M[E+1],C=M[E+2];u.push(w,T,T,C,C,w)}}else{const M=g.array;v=g.version;for(let E=0,y=M.length/3-1;E<y;E+=3){const w=E+0,T=E+1,C=E+2;u.push(w,T,T,C,C,w)}}const m=new(g.count>=65535?lf:of)(u,1);m.version=v;const p=r.get(f);p&&t.remove(p),r.set(f,m)}function h(f){const u=r.get(f);if(u){const d=f.index;d!==null&&u.version<d.version&&c(f)}else c(f);return r.get(f)}return{get:o,update:l,getWireframeAttribute:h}}function Sx(s,t,e){let n;function i(f){n=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function l(f,u){s.drawElements(n,u,r,f*a),e.update(u,n,1)}function c(f,u,d){d!==0&&(s.drawElementsInstanced(n,u,r,f*a,d),e.update(u,n,d))}function h(f,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,f,0,d);let v=0;for(let m=0;m<d;m++)v+=u[m];e.update(v,n,1)}this.setMode=i,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function bx(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case s.TRIANGLES:e.triangles+=o*(r/3);break;case s.LINES:e.lines+=o*(r/2);break;case s.LINE_STRIP:e.lines+=o*(r-1);break;case s.LINE_LOOP:e.lines+=o*r;break;case s.POINTS:e.points+=o*r;break;default:le("WebGLInfo: Unknown draw mode:",a);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function wx(s,t,e){const n=new WeakMap,i=new Te;function r(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0;let u=n.get(o);if(u===void 0||u.count!==f){let P=function(){_.dispose(),n.delete(o),o.removeEventListener("dispose",P)};var d=P;u!==void 0&&u.texture.dispose();const g=o.morphAttributes.position!==void 0,v=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],M=o.morphAttributes.normal||[],E=o.morphAttributes.color||[];let y=0;g===!0&&(y=1),v===!0&&(y=2),m===!0&&(y=3);let w=o.attributes.position.count*y,T=1;w>t.maxTextureSize&&(T=Math.ceil(w/t.maxTextureSize),w=t.maxTextureSize);const C=new Float32Array(w*T*4*f),_=new sf(C,w,T,f);_.type=Cn,_.needsUpdate=!0;const A=y*4;for(let L=0;L<f;L++){const N=p[L],B=M[L],U=E[L],k=w*T*4*L;for(let K=0;K<N.count;K++){const W=K*A;g===!0&&(i.fromBufferAttribute(N,K),C[k+W+0]=i.x,C[k+W+1]=i.y,C[k+W+2]=i.z,C[k+W+3]=0),v===!0&&(i.fromBufferAttribute(B,K),C[k+W+4]=i.x,C[k+W+5]=i.y,C[k+W+6]=i.z,C[k+W+7]=0),m===!0&&(i.fromBufferAttribute(U,K),C[k+W+8]=i.x,C[k+W+9]=i.y,C[k+W+10]=i.z,C[k+W+11]=U.itemSize===4?i.w:1)}}u={count:f,texture:_,size:new ct(w,T)},n.set(o,u),o.addEventListener("dispose",P)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",a.morphTexture,e);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const v=o.morphTargetsRelative?1:1-g;l.getUniforms().setValue(s,"morphTargetBaseInfluence",v),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:r}}function Ex(s,t,e,n,i){let r=new WeakMap;function a(c){const h=i.render.frame,f=c.geometry,u=t.get(c,f);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,s.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const d=c.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return u}function o(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}const Tx={[Hu]:"LINEAR_TONE_MAPPING",[Gu]:"REINHARD_TONE_MAPPING",[Vu]:"CINEON_TONE_MAPPING",[Wu]:"ACES_FILMIC_TONE_MAPPING",[qu]:"AGX_TONE_MAPPING",[$u]:"NEUTRAL_TONE_MAPPING",[Xu]:"CUSTOM_TONE_MAPPING"};function Ax(s,t,e,n,i,r){const a=new Sn(t,e,{type:s,depthBuffer:i,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let o=null,l=null;const c=new Be;c.setAttribute("position",new ve([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new ve([0,2,0,0,2,0],2));const h=new xm({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new re(c,h),u=new Ac(-1,1,1,-1,0,1);let d=null,g=null,v=!1,m,p=null,M=[],E=!1;this.setSize=function(y,w){a.setSize(y,w),o!==null&&o.setSize(y,w),l!==null&&l.setSize(y,w);for(let T=0;T<M.length;T++){const C=M[T];C.setSize&&C.setSize(y,w)}},this.setEffects=function(y){M=y,E=M.length>0&&M[0].isRenderPass===!0;const w=a.width,T=a.height;M.length>0&&o===null&&(o=new Sn(w,T,{type:$n,depthBuffer:!1,stencilBuffer:!1}),l=new Sn(w,T,{type:$n,depthBuffer:!1,stencilBuffer:!1}));for(let C=0;C<M.length;C++){const _=M[C];_.setSize&&_.setSize(w,T)}},this.begin=function(y,w){if(v||y.toneMapping===Wn&&M.length===0)return!1;if(p=w,w!==null){const T=w.width,C=w.height;(a.width!==T||a.height!==C)&&this.setSize(T,C)}return E===!1&&y.setRenderTarget(a),m=y.toneMapping,y.toneMapping=Wn,!0},this.hasRenderPass=function(){return E},this.end=function(y,w){y.toneMapping=m,v=!0;let T=a,C=o;for(let _=0;_<M.length;_++){const A=M[_];A.enabled!==!1&&(A.render(y,C,T,w),A.needsSwap!==!1&&(T=C,C=C===o?l:o))}if(d!==y.outputColorSpace||g!==y.toneMapping){d=y.outputColorSpace,g=y.toneMapping,h.defines={},ae.getTransfer(d)===xe&&(h.defines.SRGB_TRANSFER="");const _=Tx[g];_&&(h.defines[_]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=T.texture,y.setRenderTarget(p),y.render(f,u),p=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}const Pf=new Ze,Kl=new Nr(1,1),Lf=new sf,If=new pp,Df=new ff,qh=[],$h=[],Yh=new Float32Array(16),Zh=new Float32Array(9),Kh=new Float32Array(4);function Hs(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let r=qh[i];if(r===void 0&&(r=new Float32Array(i),qh[i]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,s[a].toArray(r,o)}return r}function Ne(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function Ue(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function to(s,t){let e=$h[t];e===void 0&&(e=new Int32Array(t),$h[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function Rx(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Cx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2fv(this.addr,t),Ue(e,t)}}function Px(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ne(e,t))return;s.uniform3fv(this.addr,t),Ue(e,t)}}function Lx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4fv(this.addr,t),Ue(e,t)}}function Ix(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;Kh.set(n),s.uniformMatrix2fv(this.addr,!1,Kh),Ue(e,n)}}function Dx(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;Zh.set(n),s.uniformMatrix3fv(this.addr,!1,Zh),Ue(e,n)}}function Nx(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;Yh.set(n),s.uniformMatrix4fv(this.addr,!1,Yh),Ue(e,n)}}function Ux(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function Fx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2iv(this.addr,t),Ue(e,t)}}function Ox(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;s.uniform3iv(this.addr,t),Ue(e,t)}}function zx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4iv(this.addr,t),Ue(e,t)}}function Bx(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function kx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2uiv(this.addr,t),Ue(e,t)}}function Hx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;s.uniform3uiv(this.addr,t),Ue(e,t)}}function Gx(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4uiv(this.addr,t),Ue(e,t)}}function Vx(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(Kl.compareFunction=e.isReversedDepthBuffer()?xc:gc,r=Kl):r=Pf,e.setTexture2D(t||r,i)}function Wx(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||If,i)}function Xx(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||Df,i)}function qx(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||Lf,i)}function $x(s){switch(s){case 5126:return Rx;case 35664:return Cx;case 35665:return Px;case 35666:return Lx;case 35674:return Ix;case 35675:return Dx;case 35676:return Nx;case 5124:case 35670:return Ux;case 35667:case 35671:return Fx;case 35668:case 35672:return Ox;case 35669:case 35673:return zx;case 5125:return Bx;case 36294:return kx;case 36295:return Hx;case 36296:return Gx;case 35678:case 36198:case 36298:case 36306:case 35682:return Vx;case 35679:case 36299:case 36307:return Wx;case 35680:case 36300:case 36308:case 36293:return Xx;case 36289:case 36303:case 36311:case 36292:return qx}}function Yx(s,t){s.uniform1fv(this.addr,t)}function Zx(s,t){const e=Hs(t,this.size,2);s.uniform2fv(this.addr,e)}function Kx(s,t){const e=Hs(t,this.size,3);s.uniform3fv(this.addr,e)}function Jx(s,t){const e=Hs(t,this.size,4);s.uniform4fv(this.addr,e)}function Qx(s,t){const e=Hs(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function jx(s,t){const e=Hs(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function tv(s,t){const e=Hs(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function ev(s,t){s.uniform1iv(this.addr,t)}function nv(s,t){s.uniform2iv(this.addr,t)}function iv(s,t){s.uniform3iv(this.addr,t)}function sv(s,t){s.uniform4iv(this.addr,t)}function rv(s,t){s.uniform1uiv(this.addr,t)}function av(s,t){s.uniform2uiv(this.addr,t)}function ov(s,t){s.uniform3uiv(this.addr,t)}function lv(s,t){s.uniform4uiv(this.addr,t)}function cv(s,t,e){const n=this.cache,i=t.length,r=to(e,i);Ne(n,r)||(s.uniform1iv(this.addr,r),Ue(n,r));let a;this.type===s.SAMPLER_2D_SHADOW?a=Kl:a=Pf;for(let o=0;o!==i;++o)e.setTexture2D(t[o]||a,r[o])}function hv(s,t,e){const n=this.cache,i=t.length,r=to(e,i);Ne(n,r)||(s.uniform1iv(this.addr,r),Ue(n,r));for(let a=0;a!==i;++a)e.setTexture3D(t[a]||If,r[a])}function uv(s,t,e){const n=this.cache,i=t.length,r=to(e,i);Ne(n,r)||(s.uniform1iv(this.addr,r),Ue(n,r));for(let a=0;a!==i;++a)e.setTextureCube(t[a]||Df,r[a])}function fv(s,t,e){const n=this.cache,i=t.length,r=to(e,i);Ne(n,r)||(s.uniform1iv(this.addr,r),Ue(n,r));for(let a=0;a!==i;++a)e.setTexture2DArray(t[a]||Lf,r[a])}function dv(s){switch(s){case 5126:return Yx;case 35664:return Zx;case 35665:return Kx;case 35666:return Jx;case 35674:return Qx;case 35675:return jx;case 35676:return tv;case 5124:case 35670:return ev;case 35667:case 35671:return nv;case 35668:case 35672:return iv;case 35669:case 35673:return sv;case 5125:return rv;case 36294:return av;case 36295:return ov;case 36296:return lv;case 35678:case 36198:case 36298:case 36306:case 35682:return cv;case 35679:case 36299:case 36307:return hv;case 35680:case 36300:case 36308:case 36293:return uv;case 36289:case 36303:case 36311:case 36292:return fv}}class pv{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=$x(e.type)}}class mv{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=dv(e.type)}}class gv{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let r=0,a=i.length;r!==a;++r){const o=i[r];o.setValue(t,e[o.id],n)}}}const Vo=/(\w+)(\])?(\[|\.)?/g;function Jh(s,t){s.seq.push(t),s.map[t.id]=t}function xv(s,t,e){const n=s.name,i=n.length;for(Vo.lastIndex=0;;){const r=Vo.exec(n),a=Vo.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){Jh(e,c===void 0?new pv(o,s,t):new mv(o,s,t));break}else{let f=e.map[o];f===void 0&&(f=new gv(o),Jh(e,f)),e=f}}}class Aa{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){const o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);xv(o,l,this)}const i=[],r=[];for(const a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?i.push(a):r.push(a);i.length>0&&(this.seq=i.concat(r))}setValue(t,e,n,i){const r=this.map[e];r!==void 0&&r.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let r=0,a=e.length;r!==a;++r){const o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,r=t.length;i!==r;++i){const a=t[i];a.id in e&&n.push(a)}return n}}function Qh(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const vv=37297;let _v=0;function Mv(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=i;a<r;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}const jh=new Yt;function yv(s){ae._getMatrix(jh,ae.workingColorSpace,s);const t=`mat3( ${jh.elements.map(e=>e.toFixed(4))} )`;switch(ae.getTransfer(s)){case Fa:return[t,"LinearTransferOETF"];case xe:return[t,"sRGBTransferOETF"];default:return Xt("WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function tu(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),r=(s.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+Mv(s.getShaderSource(t),o)}else return r}function Sv(s,t){const e=yv(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}const bv={[Hu]:"Linear",[Gu]:"Reinhard",[Vu]:"Cineon",[Wu]:"ACESFilmic",[qu]:"AgX",[$u]:"Neutral",[Xu]:"Custom"};function wv(s,t){const e=bv[t];return e===void 0?(Xt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const xa=new I;function Ev(){ae.getLuminanceCoefficients(xa);const s=xa.x.toFixed(4),t=xa.y.toFixed(4),e=xa.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Tv(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(pr).join(`
`)}function Av(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Rv(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(t,i),a=r.name;let o=1;r.type===s.FLOAT_MAT2&&(o=2),r.type===s.FLOAT_MAT3&&(o=3),r.type===s.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:s.getAttribLocation(t,a),locationSize:o}}return e}function pr(s){return s!==""}function eu(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function nu(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Cv=/^[ \t]*#include +<([\w\d./]+)>/gm;function Jl(s){return s.replace(Cv,Lv)}const Pv=new Map;function Lv(s,t){let e=Qt[t];if(e===void 0){const n=Pv.get(t);if(n!==void 0)e=Qt[n],Xt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Jl(e)}const Iv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function iu(s){return s.replace(Iv,Dv)}function Dv(s,t,e,n){let i="";for(let r=parseInt(t);r<parseInt(e);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function su(s){let t=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}const Nv={[xr]:"SHADOWMAP_TYPE_PCF",[fr]:"SHADOWMAP_TYPE_VSM"};function Uv(s){return Nv[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Fv={[Zi]:"ENVMAP_TYPE_CUBE",[zs]:"ENVMAP_TYPE_CUBE",[Za]:"ENVMAP_TYPE_CUBE_UV"};function Ov(s){return s.envMap===!1?"ENVMAP_TYPE_CUBE":Fv[s.envMapMode]||"ENVMAP_TYPE_CUBE"}const zv={[zs]:"ENVMAP_MODE_REFRACTION"};function Bv(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":zv[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}const kv={[Ya]:"ENVMAP_BLENDING_MULTIPLY",[qd]:"ENVMAP_BLENDING_MIX",[$d]:"ENVMAP_BLENDING_ADD"};function Hv(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":kv[s.combine]||"ENVMAP_BLENDING_NONE"}function Gv(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Vv(s,t,e,n){const i=s.getContext(),r=e.defines;let a=e.vertexShader,o=e.fragmentShader;const l=Uv(e),c=Ov(e),h=Bv(e),f=Hv(e),u=Gv(e),d=Tv(e),g=Av(r),v=i.createProgram();let m,p,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(pr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(pr).join(`
`),p.length>0&&(p+=`
`)):(m=[su(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(pr).join(`
`),p=[su(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Wn?"#define TONE_MAPPING":"",e.toneMapping!==Wn?Qt.tonemapping_pars_fragment:"",e.toneMapping!==Wn?wv("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Qt.colorspace_pars_fragment,Sv("linearToOutputTexel",e.outputColorSpace),Ev(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(pr).join(`
`)),a=Jl(a),a=eu(a,e),a=nu(a,e),o=Jl(o),o=eu(o,e),o=nu(o,e),a=iu(a),o=iu(o),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===ah?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===ah?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const E=M+m+a,y=M+p+o,w=Qh(i,i.VERTEX_SHADER,E),T=Qh(i,i.FRAGMENT_SHADER,y);i.attachShader(v,w),i.attachShader(v,T),e.index0AttributeName!==void 0?i.bindAttribLocation(v,0,e.index0AttributeName):e.hasPositionAttribute===!0&&i.bindAttribLocation(v,0,"position"),i.linkProgram(v);function C(L){if(s.debug.checkShaderErrors){const N=i.getProgramInfoLog(v)||"",B=i.getShaderInfoLog(w)||"",U=i.getShaderInfoLog(T)||"",k=N.trim(),K=B.trim(),W=U.trim();let rt=!0,q=!0;if(i.getProgramParameter(v,i.LINK_STATUS)===!1)if(rt=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,v,w,T);else{const j=tu(i,w,"vertex"),nt=tu(i,T,"fragment");le("WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(v,i.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+k+`
`+j+`
`+nt)}else k!==""?Xt("WebGLProgram: Program Info Log:",k):(K===""||W==="")&&(q=!1);q&&(L.diagnostics={runnable:rt,programLog:k,vertexShader:{log:K,prefix:m},fragmentShader:{log:W,prefix:p}})}i.deleteShader(w),i.deleteShader(T),_=new Aa(i,v),A=Rv(i,v)}let _;this.getUniforms=function(){return _===void 0&&C(this),_};let A;this.getAttributes=function(){return A===void 0&&C(this),A};let P=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=i.getProgramParameter(v,vv)),P},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=_v++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=w,this.fragmentShader=T,this}let Wv=0;class Xv{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){const i=this._getShaderCacheForMaterial(t);return i.has(e)===!1&&(i.add(e),e.usedTimes++),i.has(n)===!1&&(i.add(n),n.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new qv(t),e.set(t,n)),n}}class qv{constructor(t){this.id=Wv++,this.code=t,this.usedTimes=0}}function $v(s){return s===Ki||s===Ia||s===Da}function Yv(s,t,e,n,i,r){const a=new rf,o=new Xv,l=new Set,c=[],h=new Map,f=n.logarithmicDepthBuffer;let u=n.precision;const d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(_){return l.add(_),_===0?"uv":`uv${_}`}function v(_,A,P,L,N,B){const U=L.fog,k=N.geometry,K=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?L.environment:null,W=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,rt=t.get(_.envMap||K,W),q=rt&&rt.mapping===Za?rt.image.height:null,j=d[_.type];_.precision!==null&&(u=n.getMaxPrecision(_.precision),u!==_.precision&&Xt("WebGLProgram.getParameters:",_.precision,"not supported, using",u,"instead."));const nt=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,It=nt!==void 0?nt.length:0;let Tt=0;k.morphAttributes.position!==void 0&&(Tt=1),k.morphAttributes.normal!==void 0&&(Tt=2),k.morphAttributes.color!==void 0&&(Tt=3);let ue,jt,ce,Z;if(j){const be=Bn[j];ue=be.vertexShader,jt=be.fragmentShader}else{ue=_.vertexShader,jt=_.fragmentShader;const be=o.getVertexShaderStage(_),de=o.getFragmentShaderStage(_);o.update(_,be,de),ce=be.id,Z=de.id}const tt=s.getRenderTarget(),_t=s.state.buffers.depth.getReversed(),Gt=N.isInstancedMesh===!0,bt=N.isBatchedMesh===!0,Vt=!!_.map,ge=!!_.matcap,et=!!rt,at=!!_.aoMap,ot=!!_.lightMap,lt=!!_.bumpMap&&_.wireframe===!1,ft=!!_.normalMap,kt=!!_.displacementMap,zt=!!_.emissiveMap,Wt=!!_.metalnessMap,qt=!!_.roughnessMap,D=_.anisotropy>0,fe=_.clearcoat>0,te=_.dispersion>0,R=_.retroreflectivity>0,x=_.iridescence>0,z=_.sheen>0,V=_.transmission>0,$=D&&!!_.anisotropyMap,ht=fe&&!!_.clearcoatMap,ut=fe&&!!_.clearcoatNormalMap,Y=fe&&!!_.clearcoatRoughnessMap,Q=x&&!!_.iridescenceMap,dt=x&&!!_.iridescenceThicknessMap,Nt=z&&!!_.sheenColorMap,xt=z&&!!_.sheenRoughnessMap,pt=!!_.specularMap,Ut=!!_.specularColorMap,Ht=!!_.specularIntensityMap,Zt=V&&!!_.transmissionMap,O=V&&!!_.thicknessMap,mt=!!_.gradientMap,J=!!_.alphaMap,gt=_.alphaTest>0,St=!!_.alphaHash,it=!!_.extensions;let Ot=Wn;_.toneMapped&&(tt===null||tt.isXRRenderTarget===!0)&&(Ot=s.toneMapping);const Pt={shaderID:j,shaderType:_.type,shaderName:_.name,vertexShader:ue,fragmentShader:jt,defines:_.defines,customVertexShaderID:ce,customFragmentShaderID:Z,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:u,batching:bt,batchingColor:bt&&N._colorsTexture!==null,instancing:Gt,instancingColor:Gt&&N.instanceColor!==null,instancingMorph:Gt&&N.morphTexture!==null,outputColorSpace:tt===null?s.outputColorSpace:tt.isXRRenderTarget===!0?tt.texture.colorSpace:ae.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Vt,matcap:ge,envMap:et,envMapMode:et&&rt.mapping,envMapCubeUVHeight:q,aoMap:at,lightMap:ot,bumpMap:lt,normalMap:ft,displacementMap:kt,emissiveMap:zt,normalMapObjectSpace:ft&&_.normalMapType===Kd,normalMapTangentSpace:ft&&_.normalMapType===Na,packedNormalMap:ft&&_.normalMapType===Na&&$v(_.normalMap.format),metalnessMap:Wt,roughnessMap:qt,anisotropy:D,anisotropyMap:$,clearcoat:fe,clearcoatMap:ht,clearcoatNormalMap:ut,clearcoatRoughnessMap:Y,dispersion:te,retroreflection:R,iridescence:x,iridescenceMap:Q,iridescenceThicknessMap:dt,sheen:z,sheenColorMap:Nt,sheenRoughnessMap:xt,specularMap:pt,specularColorMap:Ut,specularIntensityMap:Ht,transmission:V,transmissionMap:Zt,thicknessMap:O,gradientMap:mt,opaque:_.transparent===!1&&_.blending===vr&&_.alphaToCoverage===!1,alphaMap:J,alphaTest:gt,alphaHash:St,combine:_.combine,mapUv:Vt&&g(_.map.channel),aoMapUv:at&&g(_.aoMap.channel),lightMapUv:ot&&g(_.lightMap.channel),bumpMapUv:lt&&g(_.bumpMap.channel),normalMapUv:ft&&g(_.normalMap.channel),displacementMapUv:kt&&g(_.displacementMap.channel),emissiveMapUv:zt&&g(_.emissiveMap.channel),metalnessMapUv:Wt&&g(_.metalnessMap.channel),roughnessMapUv:qt&&g(_.roughnessMap.channel),anisotropyMapUv:$&&g(_.anisotropyMap.channel),clearcoatMapUv:ht&&g(_.clearcoatMap.channel),clearcoatNormalMapUv:ut&&g(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Y&&g(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Q&&g(_.iridescenceMap.channel),iridescenceThicknessMapUv:dt&&g(_.iridescenceThicknessMap.channel),sheenColorMapUv:Nt&&g(_.sheenColorMap.channel),sheenRoughnessMapUv:xt&&g(_.sheenRoughnessMap.channel),specularMapUv:pt&&g(_.specularMap.channel),specularColorMapUv:Ut&&g(_.specularColorMap.channel),specularIntensityMapUv:Ht&&g(_.specularIntensityMap.channel),transmissionMapUv:Zt&&g(_.transmissionMap.channel),thicknessMapUv:O&&g(_.thicknessMap.channel),alphaMapUv:J&&g(_.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&(ft||D),vertexNormals:!!k.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!k.attributes.uv&&(Vt||J),fog:!!U,useFog:_.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||k.attributes.normal===void 0&&ft===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:_t,skinning:N.isSkinnedMesh===!0,hasPositionAttribute:k.attributes.position!==void 0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:It,morphTextureStride:Tt,numSunLights:A.sun.length,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numSunLightShadows:A.sunShadowMap.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&P.length>0,shadowMapType:s.shadowMap.type,toneMapping:Ot,decodeVideoTexture:Vt&&_.map.isVideoTexture===!0&&ae.getTransfer(_.map.colorSpace)===xe,decodeVideoTextureEmissive:zt&&_.emissiveMap.isVideoTexture===!0&&ae.getTransfer(_.emissiveMap.colorSpace)===xe,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===ii,flipSided:_.side===nn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:it&&_.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(it&&_.extensions.multiDraw===!0||bt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Pt.vertexUv1s=l.has(1),Pt.vertexUv2s=l.has(2),Pt.vertexUv3s=l.has(3),l.clear(),Pt}function m(_){const A=[];if(_.shaderID?A.push(_.shaderID):(A.push(_.customVertexShaderID),A.push(_.customFragmentShaderID)),_.defines!==void 0)for(const P in _.defines)A.push(P),A.push(_.defines[P]);return _.isRawShaderMaterial===!1&&(p(A,_),M(A,_),A.push(s.outputColorSpace)),A.push(_.customProgramCacheKey),A.join()}function p(_,A){_.push(A.precision),_.push(A.outputColorSpace),_.push(A.envMapMode),_.push(A.envMapCubeUVHeight),_.push(A.mapUv),_.push(A.alphaMapUv),_.push(A.lightMapUv),_.push(A.aoMapUv),_.push(A.bumpMapUv),_.push(A.normalMapUv),_.push(A.displacementMapUv),_.push(A.emissiveMapUv),_.push(A.metalnessMapUv),_.push(A.roughnessMapUv),_.push(A.anisotropyMapUv),_.push(A.clearcoatMapUv),_.push(A.clearcoatNormalMapUv),_.push(A.clearcoatRoughnessMapUv),_.push(A.iridescenceMapUv),_.push(A.iridescenceThicknessMapUv),_.push(A.sheenColorMapUv),_.push(A.sheenRoughnessMapUv),_.push(A.specularMapUv),_.push(A.specularColorMapUv),_.push(A.specularIntensityMapUv),_.push(A.transmissionMapUv),_.push(A.thicknessMapUv),_.push(A.combine),_.push(A.fogExp2),_.push(A.sizeAttenuation),_.push(A.morphTargetsCount),_.push(A.morphAttributeCount),_.push(A.numSunLights),_.push(A.numDirLights),_.push(A.numPointLights),_.push(A.numSpotLights),_.push(A.numSpotLightMaps),_.push(A.numHemiLights),_.push(A.numRectAreaLights),_.push(A.numSunLightShadows),_.push(A.numDirLightShadows),_.push(A.numPointLightShadows),_.push(A.numSpotLightShadows),_.push(A.numSpotLightShadowsWithMaps),_.push(A.numLightProbes),_.push(A.shadowMapType),_.push(A.toneMapping),_.push(A.numClippingPlanes),_.push(A.numClipIntersection),_.push(A.depthPacking)}function M(_,A){a.disableAll(),A.instancing&&a.enable(0),A.instancingColor&&a.enable(1),A.instancingMorph&&a.enable(2),A.matcap&&a.enable(3),A.envMap&&a.enable(4),A.normalMapObjectSpace&&a.enable(5),A.normalMapTangentSpace&&a.enable(6),A.clearcoat&&a.enable(7),A.iridescence&&a.enable(8),A.alphaTest&&a.enable(9),A.vertexColors&&a.enable(10),A.vertexAlphas&&a.enable(11),A.vertexUv1s&&a.enable(12),A.vertexUv2s&&a.enable(13),A.vertexUv3s&&a.enable(14),A.vertexTangents&&a.enable(15),A.anisotropy&&a.enable(16),A.alphaHash&&a.enable(17),A.batching&&a.enable(18),A.dispersion&&a.enable(19),A.retroreflection&&a.enable(24),A.batchingColor&&a.enable(20),A.gradientMap&&a.enable(21),A.packedNormalMap&&a.enable(22),A.vertexNormals&&a.enable(23),_.push(a.mask),a.disableAll(),A.fog&&a.enable(0),A.useFog&&a.enable(1),A.flatShading&&a.enable(2),A.logarithmicDepthBuffer&&a.enable(3),A.reversedDepthBuffer&&a.enable(4),A.skinning&&a.enable(5),A.morphTargets&&a.enable(6),A.morphNormals&&a.enable(7),A.morphColors&&a.enable(8),A.premultipliedAlpha&&a.enable(9),A.shadowMapEnabled&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.useDepthPacking&&a.enable(13),A.dithering&&a.enable(14),A.transmission&&a.enable(15),A.sheen&&a.enable(16),A.opaque&&a.enable(17),A.pointsUvs&&a.enable(18),A.decodeVideoTexture&&a.enable(19),A.decodeVideoTextureEmissive&&a.enable(20),A.alphaToCoverage&&a.enable(21),A.numLightProbeGrids>0&&a.enable(22),A.hasPositionAttribute&&a.enable(23),_.push(a.mask)}function E(_){const A=d[_.type];let P;if(A){const L=Bn[A];P=pm.clone(L.uniforms)}else P=_.uniforms;return P}function y(_,A){let P=h.get(A);return P!==void 0?++P.usedTimes:(P=new Vv(s,A,_,i),c.push(P),h.set(A,P)),P}function w(_){if(--_.usedTimes===0){const A=c.indexOf(_);c[A]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function T(_){o.remove(_)}function C(){o.dispose()}return{getParameters:v,getProgramCacheKey:m,getUniforms:E,acquireProgram:y,releaseProgram:w,releaseShaderCache:T,programs:c,dispose:C}}function Zv(){let s=new WeakMap;function t(a){return s.has(a)}function e(a){let o=s.get(a);return o===void 0&&(o={},s.set(a,o)),o}function n(a){s.delete(a)}function i(a,o,l){s.get(a)[o]=l}function r(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:r}}function Kv(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.materialVariant!==t.materialVariant?s.materialVariant-t.materialVariant:s.z!==t.z?s.z-t.z:s.id-t.id}function ru(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function au(){const s=[];let t=0;const e=[],n=[],i=[];function r(){t=0,e.length=0,n.length=0,i.length=0}function a(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function o(u,d,g,v,m,p){let M=s[t];return M===void 0?(M={id:u.id,object:u,geometry:d,material:g,materialVariant:a(u),groupOrder:v,renderOrder:u.renderOrder,z:m,group:p},s[t]=M):(M.id=u.id,M.object=u,M.geometry=d,M.material=g,M.materialVariant=a(u),M.groupOrder=v,M.renderOrder=u.renderOrder,M.z=m,M.group=p),t++,M}function l(u,d,g,v,m,p,M){M.reversedDepth===!0&&(m=-m);const E=o(u,d,g,v,m,p);g.transmission>0?n.push(E):g.transparent===!0?i.push(E):e.push(E)}function c(u,d,g,v,m,p){const M=o(u,d,g,v,m,p);g.transmission>0?n.unshift(M):g.transparent===!0?i.unshift(M):e.unshift(M)}function h(u,d){e.length>1&&e.sort(u||Kv),n.length>1&&n.sort(d||ru),i.length>1&&i.sort(d||ru)}function f(){for(let u=t,d=s.length;u<d;u++){const g=s[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:i,init:r,push:l,unshift:c,finish:f,sort:h}}function Jv(){let s=new WeakMap;function t(n,i){const r=s.get(n);let a;return r===void 0?(a=new au,s.set(n,[a])):i>=r.length?(a=new au,r.push(a)):a=r[i],a}function e(){s=new WeakMap}return{get:t,dispose:e}}function Qv(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new I,color:new Ft};break;case"SpotLight":e={position:new I,direction:new I,color:new Ft,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new I,color:new Ft,distance:0,decay:0};break;case"HemisphereLight":e={direction:new I,skyColor:new Ft,groundColor:new Ft};break;case"RectAreaLight":e={color:new Ft,position:new I,halfWidth:new I,halfHeight:new I};break}return s[t.id]=e,e}}}function jv(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let t_=0;function e_(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function n_(s){const t=new Qv,e=jv(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new I);const i=new I,r=new ie,a=new ie;function o(c){let h=0,f=0,u=0;for(let N=0;N<9;N++)n.probe[N].set(0,0,0);let d=0,g=0,v=0,m=0,p=0,M=0,E=0,y=0,w=0,T=0,C=0,_=0,A=0,P=0;c.sort(e_);for(let N=0,B=c.length;N<B;N++){const U=c[N],k=U.color,K=U.intensity,W=U.distance;let rt=null;if(U.shadow&&U.shadow.map&&(U.shadow.map.texture.format===Ki?rt=U.shadow.map.texture:rt=U.shadow.map.depthTexture||U.shadow.map.texture),U.isAmbientLight)h+=k.r*K,f+=k.g*K,u+=k.b*K;else if(U.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(U.sh.coefficients[q],K);P++}else if(U.isSunLight){const q=t.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),U.castShadow){const j=U.shadow,nt=e.get(U);nt.shadowIntensity=j.intensity,nt.shadowBias=j.bias,nt.shadowNormalBias=j.normalBias,nt.shadowRadius=j.radius,nt.shadowMapSize.copy(j.mapSize).multiply(j.getFrameExtents()),n.sunShadow[g]=nt,n.sunShadowMap[g]=rt;const It=j.getViewportCount();for(let Tt=0;Tt<It;Tt++)n.sunShadowMatrix[v+Tt]=j.getMatrix(Tt),n.sunShadowCascade[v+Tt]=j._cascadeData[Tt];v+=It,g++}n.sun[d]=q,d++}else if(U.isDirectionalLight){const q=t.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),U.castShadow){const j=U.shadow,nt=e.get(U);nt.shadowIntensity=j.intensity,nt.shadowBias=j.bias,nt.shadowNormalBias=j.normalBias,nt.shadowRadius=j.radius,nt.shadowMapSize=j.mapSize,n.directionalShadow[m]=nt,n.directionalShadowMap[m]=rt,n.directionalShadowMatrix[m]=U.shadow.matrix,w++}n.directional[m]=q,m++}else if(U.isSpotLight){const q=t.get(U);q.position.setFromMatrixPosition(U.matrixWorld),q.color.copy(k).multiplyScalar(K),q.distance=W,q.coneCos=Math.cos(U.angle),q.penumbraCos=Math.cos(U.angle*(1-U.penumbra)),q.decay=U.decay,n.spot[M]=q;const j=U.shadow;if(U.map&&(n.spotLightMap[_]=U.map,_++,j.updateMatrices(U),U.castShadow&&A++),n.spotLightMatrix[M]=j.matrix,U.castShadow){const nt=e.get(U);nt.shadowIntensity=j.intensity,nt.shadowBias=j.bias,nt.shadowNormalBias=j.normalBias,nt.shadowRadius=j.radius,nt.shadowMapSize=j.mapSize,n.spotShadow[M]=nt,n.spotShadowMap[M]=rt,C++}M++}else if(U.isRectAreaLight){const q=t.get(U);q.color.copy(k).multiplyScalar(K),q.halfWidth.set(U.width*.5,0,0),q.halfHeight.set(0,U.height*.5,0),n.rectArea[E]=q,E++}else if(U.isPointLight){const q=t.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),q.distance=U.distance,q.decay=U.decay,U.castShadow){const j=U.shadow,nt=e.get(U);nt.shadowIntensity=j.intensity,nt.shadowBias=j.bias,nt.shadowNormalBias=j.normalBias,nt.shadowRadius=j.radius,nt.shadowMapSize=j.mapSize,nt.shadowCameraNear=j.camera.near,nt.shadowCameraFar=j.camera.far,n.pointShadow[p]=nt,n.pointShadowMap[p]=rt,n.pointShadowMatrix[p]=U.shadow.matrix,T++}n.point[p]=q,p++}else if(U.isHemisphereLight){const q=t.get(U);q.skyColor.copy(U.color).multiplyScalar(K),q.groundColor.copy(U.groundColor).multiplyScalar(K),n.hemi[y]=q,y++}}E>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=vt.LTC_FLOAT_1,n.rectAreaLTC2=vt.LTC_FLOAT_2):(n.rectAreaLTC1=vt.LTC_HALF_1,n.rectAreaLTC2=vt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;const L=n.hash;(L.sunLength!==d||L.directionalLength!==m||L.pointLength!==p||L.spotLength!==M||L.rectAreaLength!==E||L.hemiLength!==y||L.numSunShadows!==g||L.numDirectionalShadows!==w||L.numPointShadows!==T||L.numSpotShadows!==C||L.numSpotMaps!==_||L.numLightProbes!==P)&&(n.sun.length=d,n.directional.length=m,n.spot.length=M,n.rectArea.length=E,n.point.length=p,n.hemi.length=y,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.directionalShadowMatrix.length=w,n.pointShadow.length=T,n.pointShadowMap.length=T,n.pointShadowMatrix.length=T,n.spotShadow.length=C,n.spotShadowMap.length=C,n.spotLightMatrix.length=C+_-A,n.spotLightMap.length=_,n.numSpotLightShadowsWithMaps=A,n.numLightProbes=P,L.sunLength=d,L.directionalLength=m,L.pointLength=p,L.spotLength=M,L.rectAreaLength=E,L.hemiLength=y,L.numSunShadows=g,L.numDirectionalShadows=w,L.numPointShadows=T,L.numSpotShadows=C,L.numSpotMaps=_,L.numLightProbes=P,n.version=t_++)}function l(c,h){let f=0,u=0,d=0,g=0,v=0,m=0;const p=h.matrixWorldInverse;for(let M=0,E=c.length;M<E;M++){const y=c[M];if(y.isSunLight){const w=n.sun[f];w.direction.setFromMatrixPosition(y.matrixWorld),w.direction.transformDirection(p),f++}else if(y.isDirectionalLight){const w=n.directional[u];w.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),w.direction.sub(i),w.direction.transformDirection(p),u++}else if(y.isSpotLight){const w=n.spot[g];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(p),w.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),w.direction.sub(i),w.direction.transformDirection(p),g++}else if(y.isRectAreaLight){const w=n.rectArea[v];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(p),a.identity(),r.copy(y.matrixWorld),r.premultiply(p),a.extractRotation(r),w.halfWidth.set(y.width*.5,0,0),w.halfHeight.set(0,y.height*.5,0),w.halfWidth.applyMatrix4(a),w.halfHeight.applyMatrix4(a),v++}else if(y.isPointLight){const w=n.point[d];w.position.setFromMatrixPosition(y.matrixWorld),w.position.applyMatrix4(p),d++}else if(y.isHemisphereLight){const w=n.hemi[m];w.direction.setFromMatrixPosition(y.matrixWorld),w.direction.transformDirection(p),m++}}}return{setup:o,setupView:l,state:n}}function ou(s){const t=new n_(s),e=[],n=[],i=[];function r(u){f.camera=u,e.length=0,n.length=0,i.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function l(u){i.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}const f={lightsArray:e,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function i_(s){let t=new WeakMap;function e(i,r=0){const a=t.get(i);let o;return a===void 0?(o=new ou(s),t.set(i,[o])):r>=a.length?(o=new ou(s),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}const s_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,r_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,a_=[new I(1,0,0),new I(-1,0,0),new I(0,1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1)],o_=[new I(0,-1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1),new I(0,-1,0),new I(0,-1,0)],lu=new ie,tr=new I,Wo=new I;function l_(s,t,e){let n=new yc;const i=new ct,r=new ct,a=new Te,o=new vm,l=new _m,c={},h=e.maxTextureSize,f={[Yi]:nn,[nn]:Yi,[ii]:ii},u=new In({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ct},radius:{value:4}},vertexShader:s_,fragmentShader:r_}),d=u.clone();d.defines.HORIZONTAL_PASS=1;const g=new Be;g.setAttribute("position",new Ge(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new re(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=xr;let p=this.type;this.render=function(T,C,_){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;this.type===Ad&&(Xt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=xr);const A=s.getRenderTarget(),P=s.getActiveCubeFace(),L=s.getActiveMipmapLevel(),N=s.state;N.setBlending(ri),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const B=p!==this.type;B&&C.traverse(function(U){U.material&&(Array.isArray(U.material)?U.material.forEach(k=>k.needsUpdate=!0):U.material.needsUpdate=!0)});for(let U=0,k=T.length;U<k;U++){const K=T[U],W=K.shadow;if(W===void 0){Xt("WebGLShadowMap:",K,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;i.copy(W.mapSize);const rt=W.getFrameExtents();i.multiply(rt),r.copy(W.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/rt.x),i.x=r.x*rt.x,W.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/rt.y),i.y=r.y*rt.y,W.mapSize.y=r.y));const q=s.state.buffers.depth.getReversed();if(W.camera._reversedDepth=q,W.map===null||B===!0){if(W.map!==null&&(W.map.depthTexture!==null&&(W.map.depthTexture.dispose(),W.map.depthTexture=null),W.map.dispose()),this.type===fr){if(K.isPointLight){Xt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}W.map=new Sn(i.x,i.y,{format:Ki,type:$n,minFilter:Ye,magFilter:Ye,generateMipmaps:!1}),W.map.texture.name=K.name+".shadowMap",W.map.depthTexture=new Nr(i.x,i.y,Cn),W.map.depthTexture.name=K.name+".shadowMapDepth",W.map.depthTexture.format=ui,W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=ke,W.map.depthTexture.magFilter=ke}else K.isPointLight?(W.map=new Cf(i.x),W.map.depthTexture=new Dp(i.x,qn)):(W.map=new Sn(i.x,i.y),W.map.depthTexture=new Nr(i.x,i.y,qn)),W.map.depthTexture.name=K.name+".shadowMap",W.map.depthTexture.format=ui,this.type===xr?(W.map.depthTexture.compareFunction=q?xc:gc,W.map.depthTexture.minFilter=Ye,W.map.depthTexture.magFilter=Ye):(W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=ke,W.map.depthTexture.magFilter=ke);W.camera.updateProjectionMatrix()}W.map.isWebGLCubeRenderTarget!==!0&&(W.map.width!==i.x||W.map.height!==i.y)&&W.map.setSize(i.x,i.y);const j=W.map.isWebGLCubeRenderTarget?6:W.getViewportCount();K.isPointLight!==!0&&W.updateMatrices(K,_);for(let nt=0;nt<j;nt++){const It=W.getCamera(nt);if(K.isPointLight){const Tt=W.camera,ue=W.matrix,jt=K.distance||Tt.far;jt!==Tt.far&&(Tt.far=jt,Tt.updateProjectionMatrix()),tr.setFromMatrixPosition(K.matrixWorld),Tt.position.copy(tr),Wo.copy(Tt.position),Wo.add(a_[nt]),Tt.up.copy(o_[nt]),Tt.lookAt(Wo),Tt.updateMatrixWorld(),ue.makeTranslation(-tr.x,-tr.y,-tr.z),lu.multiplyMatrices(Tt.projectionMatrix,Tt.matrixWorldInverse),W._frustum.setFromProjectionMatrix(lu,Tt.coordinateSystem,Tt.reversedDepth)}if(W.map.isWebGLCubeRenderTarget)s.setRenderTarget(W.map,nt),s.clear();else{nt===0&&(s.setRenderTarget(W.map),s.clear());const Tt=W.getViewport(nt);a.set(r.x*Tt.x,r.y*Tt.y,r.x*Tt.z,r.y*Tt.w),N.viewport(a)}n=W.getFrustum(nt),y(C,_,It,K,this.type)}W.isPointLightShadow!==!0&&this.type===fr&&M(W,_),W.needsUpdate=!1}p=this.type,m.needsUpdate=!1,s.setRenderTarget(A,P,L)};function M(T,C){const _=t.update(v);u.defines.VSM_SAMPLES!==T.blurSamples&&(u.defines.VSM_SAMPLES=T.blurSamples,d.defines.VSM_SAMPLES=T.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),T.mapPass===null?T.mapPass=new Sn(i.x,i.y,{format:Ki,type:$n}):(T.mapPass.width!==T.map.width||T.mapPass.height!==T.map.height)&&T.mapPass.setSize(T.map.width,T.map.height),u.uniforms.shadow_pass.value=T.map.depthTexture,u.uniforms.resolution.value.set(T.map.width,T.map.height),u.uniforms.radius.value=T.radius,s.setRenderTarget(T.mapPass),s.clear(),s.renderBufferDirect(C,null,_,u,v,null),d.uniforms.shadow_pass.value=T.mapPass.texture,d.uniforms.resolution.value.set(T.map.width,T.map.height),d.uniforms.radius.value=T.radius,s.setRenderTarget(T.map),s.clear(),s.renderBufferDirect(C,null,_,d,v,null)}function E(T,C,_,A){let P=null;const L=_.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(L!==void 0)P=L;else if(P=_.isPointLight===!0?l:o,s.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){const N=P.uuid,B=C.uuid;let U=c[N];U===void 0&&(U={},c[N]=U);let k=U[B];k===void 0&&(k=P.clone(),U[B]=k,C.addEventListener("dispose",w)),P=k}if(P.visible=C.visible,P.wireframe=C.wireframe,A===fr?P.side=C.shadowSide!==null?C.shadowSide:C.side:P.side=C.shadowSide!==null?C.shadowSide:f[C.side],P.alphaMap=C.alphaMap,P.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,P.map=C.map,P.clipShadows=C.clipShadows,P.clippingPlanes=C.clippingPlanes,P.clipIntersection=C.clipIntersection,P.displacementMap=C.displacementMap,P.displacementScale=C.displacementScale,P.displacementBias=C.displacementBias,P.wireframeLinewidth=C.wireframeLinewidth,P.linewidth=C.linewidth,_.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const N=s.properties.get(P);N.light=_}return P}function y(T,C,_,A,P){if(T.visible===!1)return;if(T.layers.test(C.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&P===fr)&&(!T.frustumCulled||T.intersectsFrustum(n))){T.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,T.matrixWorld);const B=t.update(T),U=T.material;if(Array.isArray(U)){const k=B.groups;for(let K=0,W=k.length;K<W;K++){const rt=k[K],q=U[rt.materialIndex];if(q&&q.visible){const j=E(T,q,A,P);T.onBeforeShadow(s,T,C,_,B,j,rt),s.renderBufferDirect(_,null,B,j,T,rt),T.onAfterShadow(s,T,C,_,B,j,rt)}}}else if(U.visible){const k=E(T,U,A,P);T.onBeforeShadow(s,T,C,_,B,k,null),s.renderBufferDirect(_,null,B,k,T,null),T.onAfterShadow(s,T,C,_,B,k,null)}}const N=T.children;for(let B=0,U=N.length;B<U;B++)y(N[B],C,_,A,P)}function w(T){T.target.removeEventListener("dispose",w);for(const _ in c){const A=c[_],P=T.target.uuid;P in A&&(A[P].dispose(),delete A[P])}}}function c_(s,t){function e(){let O=!1;const mt=new Te;let J=null;const gt=new Te(0,0,0,0);return{setMask:function(St){J!==St&&!O&&(s.colorMask(St,St,St,St),J=St)},setLocked:function(St){O=St},setClear:function(St,it,Ot,Pt,be){be===!0&&(St*=Pt,it*=Pt,Ot*=Pt),mt.set(St,it,Ot,Pt),gt.equals(mt)===!1&&(s.clearColor(St,it,Ot,Pt),gt.copy(mt))},reset:function(){O=!1,J=null,gt.set(-1,0,0,0)}}}function n(){let O=!1,mt=!1,J=null,gt=null,St=null;return{setReversed:function(it){if(mt!==it){const Ot=t.get("EXT_clip_control");it?Ot.clipControlEXT(Ot.LOWER_LEFT_EXT,Ot.ZERO_TO_ONE_EXT):Ot.clipControlEXT(Ot.LOWER_LEFT_EXT,Ot.NEGATIVE_ONE_TO_ONE_EXT),mt=it;const Pt=St;St=null,this.setClear(Pt)}},getReversed:function(){return mt},setTest:function(it){it?tt(s.DEPTH_TEST):_t(s.DEPTH_TEST)},setMask:function(it){J!==it&&!O&&(s.depthMask(it),J=it)},setFunc:function(it){if(mt&&(it=op[it]),gt!==it){switch(it){case ol:s.depthFunc(s.NEVER);break;case ll:s.depthFunc(s.ALWAYS);break;case cl:s.depthFunc(s.LESS);break;case Cr:s.depthFunc(s.LEQUAL);break;case hl:s.depthFunc(s.EQUAL);break;case ul:s.depthFunc(s.GEQUAL);break;case fl:s.depthFunc(s.GREATER);break;case dl:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}gt=it}},setLocked:function(it){O=it},setClear:function(it){St!==it&&(St=it,mt&&(it=1-it),s.clearDepth(it))},reset:function(){O=!1,J=null,gt=null,St=null,mt=!1}}}function i(){let O=!1,mt=null,J=null,gt=null,St=null,it=null,Ot=null,Pt=null,be=null;return{setTest:function(de){O||(de?tt(s.STENCIL_TEST):_t(s.STENCIL_TEST))},setMask:function(de){mt!==de&&!O&&(s.stencilMask(de),mt=de)},setFunc:function(de,wn,Dn){(J!==de||gt!==wn||St!==Dn)&&(s.stencilFunc(de,wn,Dn),J=de,gt=wn,St=Dn)},setOp:function(de,wn,Dn){(it!==de||Ot!==wn||Pt!==Dn)&&(s.stencilOp(de,wn,Dn),it=de,Ot=wn,Pt=Dn)},setLocked:function(de){O=de},setClear:function(de){be!==de&&(s.clearStencil(de),be=de)},reset:function(){O=!1,mt=null,J=null,gt=null,St=null,it=null,Ot=null,Pt=null,be=null}}}const r=new e,a=new n,o=new i,l=new WeakMap,c=new WeakMap;let h={},f={},u={},d=new WeakMap,g=[],v=null,m=!1,p=null,M=null,E=null,y=null,w=null,T=null,C=null,_=new Ft(0,0,0),A=0,P=!1,L=null,N=null,B=null,U=null,k=null;const K=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,rt=0;const q=s.getParameter(s.VERSION);q.indexOf("WebGL")!==-1?(rt=parseFloat(/^WebGL (\d)/.exec(q)[1]),W=rt>=1):q.indexOf("OpenGL ES")!==-1&&(rt=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),W=rt>=2);let j=null,nt={};const It=s.getParameter(s.SCISSOR_BOX),Tt=s.getParameter(s.VIEWPORT),ue=new Te().fromArray(It),jt=new Te().fromArray(Tt);function ce(O,mt,J,gt){const St=new Uint8Array(4),it=s.createTexture();s.bindTexture(O,it),s.texParameteri(O,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(O,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Ot=0;Ot<J;Ot++)O===s.TEXTURE_3D||O===s.TEXTURE_2D_ARRAY?s.texImage3D(mt,0,s.RGBA,1,1,gt,0,s.RGBA,s.UNSIGNED_BYTE,St):s.texImage2D(mt+Ot,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,St);return it}const Z={};Z[s.TEXTURE_2D]=ce(s.TEXTURE_2D,s.TEXTURE_2D,1),Z[s.TEXTURE_CUBE_MAP]=ce(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[s.TEXTURE_2D_ARRAY]=ce(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),Z[s.TEXTURE_3D]=ce(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),tt(s.DEPTH_TEST),a.setFunc(Cr),lt(!1),ft(nh),tt(s.CULL_FACE),at(ri);function tt(O){h[O]!==!0&&(s.enable(O),h[O]=!0)}function _t(O){h[O]!==!1&&(s.disable(O),h[O]=!1)}function Gt(O,mt){return u[O]!==mt?(s.bindFramebuffer(O,mt),u[O]=mt,O===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=mt),O===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=mt),!0):!1}function bt(O,mt){let J=g,gt=!1;if(O){J=d.get(mt),J===void 0&&(J=[],d.set(mt,J));const St=O.textures;if(J.length!==St.length||J[0]!==s.COLOR_ATTACHMENT0){for(let it=0,Ot=St.length;it<Ot;it++)J[it]=s.COLOR_ATTACHMENT0+it;J.length=St.length,gt=!0}}else J[0]!==s.BACK&&(J[0]=s.BACK,gt=!0);gt&&s.drawBuffers(J)}function Vt(O){return v!==O?(s.useProgram(O),v=O,!0):!1}const ge={[Ts]:s.FUNC_ADD,[Cd]:s.FUNC_SUBTRACT,[Pd]:s.FUNC_REVERSE_SUBTRACT};ge[Ld]=s.MIN,ge[Id]=s.MAX;const et={[Dd]:s.ZERO,[Nd]:s.ONE,[Ud]:s.SRC_COLOR,[Bu]:s.SRC_ALPHA,[Hd]:s.SRC_ALPHA_SATURATE,[Bd]:s.DST_COLOR,[Od]:s.DST_ALPHA,[Fd]:s.ONE_MINUS_SRC_COLOR,[ku]:s.ONE_MINUS_SRC_ALPHA,[kd]:s.ONE_MINUS_DST_COLOR,[zd]:s.ONE_MINUS_DST_ALPHA,[Gd]:s.CONSTANT_COLOR,[Vd]:s.ONE_MINUS_CONSTANT_COLOR,[Wd]:s.CONSTANT_ALPHA,[Xd]:s.ONE_MINUS_CONSTANT_ALPHA};function at(O,mt,J,gt,St,it,Ot,Pt,be,de){if(O===ri){m===!0&&(_t(s.BLEND),m=!1);return}if(m===!1&&(tt(s.BLEND),m=!0),O!==Rd){if(O!==p||de!==P){if((M!==Ts||w!==Ts)&&(s.blendEquation(s.FUNC_ADD),M=Ts,w=Ts),de)switch(O){case vr:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ih:s.blendFunc(s.ONE,s.ONE);break;case sh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case rh:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:le("WebGLState: Invalid blending: ",O);break}else switch(O){case vr:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ih:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case sh:le("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case rh:le("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:le("WebGLState: Invalid blending: ",O);break}E=null,y=null,T=null,C=null,_.set(0,0,0),A=0,p=O,P=de}return}St=St||mt,it=it||J,Ot=Ot||gt,(mt!==M||St!==w)&&(s.blendEquationSeparate(ge[mt],ge[St]),M=mt,w=St),(J!==E||gt!==y||it!==T||Ot!==C)&&(s.blendFuncSeparate(et[J],et[gt],et[it],et[Ot]),E=J,y=gt,T=it,C=Ot),(Pt.equals(_)===!1||be!==A)&&(s.blendColor(Pt.r,Pt.g,Pt.b,be),_.copy(Pt),A=be),p=O,P=!1}function ot(O,mt){O.side===ii?_t(s.CULL_FACE):tt(s.CULL_FACE);let J=O.side===nn;mt&&(J=!J),lt(J),O.blending===vr&&O.transparent===!1?at(ri):at(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),a.setFunc(O.depthFunc),a.setTest(O.depthTest),a.setMask(O.depthWrite),r.setMask(O.colorWrite);const gt=O.stencilWrite;o.setTest(gt),gt&&(o.setMask(O.stencilWriteMask),o.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),o.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),zt(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?tt(s.SAMPLE_ALPHA_TO_COVERAGE):_t(s.SAMPLE_ALPHA_TO_COVERAGE)}function lt(O){L!==O&&(O?s.frontFace(s.CW):s.frontFace(s.CCW),L=O)}function ft(O){O!==Ed?(tt(s.CULL_FACE),O!==N&&(O===nh?s.cullFace(s.BACK):O===Td?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):_t(s.CULL_FACE),N=O}function kt(O){O!==B&&(W&&s.lineWidth(O),B=O)}function zt(O,mt,J){O?(tt(s.POLYGON_OFFSET_FILL),(U!==mt||k!==J)&&(U=mt,k=J,a.getReversed()&&(mt=-mt),s.polygonOffset(mt,J))):_t(s.POLYGON_OFFSET_FILL)}function Wt(O){O?tt(s.SCISSOR_TEST):_t(s.SCISSOR_TEST)}function qt(O){O===void 0&&(O=s.TEXTURE0+K-1),j!==O&&(s.activeTexture(O),j=O)}function D(O,mt,J){J===void 0&&(j===null?J=s.TEXTURE0+K-1:J=j);let gt=nt[J];gt===void 0&&(gt={type:void 0,texture:void 0},nt[J]=gt),(gt.type!==O||gt.texture!==mt)&&(j!==J&&(s.activeTexture(J),j=J),s.bindTexture(O,mt||Z[O]),gt.type=O,gt.texture=mt)}function fe(){const O=nt[j];O!==void 0&&O.type!==void 0&&(s.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function te(){try{s.compressedTexImage2D(...arguments)}catch(O){le("WebGLState:",O)}}function R(){try{s.compressedTexImage3D(...arguments)}catch(O){le("WebGLState:",O)}}function x(){try{s.texSubImage2D(...arguments)}catch(O){le("WebGLState:",O)}}function z(){try{s.texSubImage3D(...arguments)}catch(O){le("WebGLState:",O)}}function V(){try{s.compressedTexSubImage2D(...arguments)}catch(O){le("WebGLState:",O)}}function $(){try{s.compressedTexSubImage3D(...arguments)}catch(O){le("WebGLState:",O)}}function ht(){try{s.texStorage2D(...arguments)}catch(O){le("WebGLState:",O)}}function ut(){try{s.texStorage3D(...arguments)}catch(O){le("WebGLState:",O)}}function Y(){try{s.texImage2D(...arguments)}catch(O){le("WebGLState:",O)}}function Q(){try{s.texImage3D(...arguments)}catch(O){le("WebGLState:",O)}}function dt(O){return f[O]!==void 0?f[O]:s.getParameter(O)}function Nt(O,mt){f[O]!==mt&&(s.pixelStorei(O,mt),f[O]=mt)}function xt(O){ue.equals(O)===!1&&(s.scissor(O.x,O.y,O.z,O.w),ue.copy(O))}function pt(O){jt.equals(O)===!1&&(s.viewport(O.x,O.y,O.z,O.w),jt.copy(O))}function Ut(O,mt){let J=c.get(mt);J===void 0&&(J=new WeakMap,c.set(mt,J));let gt=J.get(O);gt===void 0&&(gt=s.getUniformBlockIndex(mt,O.name),J.set(O,gt))}function Ht(O,mt){const gt=c.get(mt).get(O);l.get(mt)!==gt&&(s.uniformBlockBinding(mt,gt,O.__bindingPointIndex),l.set(mt,gt))}function Zt(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),a.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},f={},j=null,nt={},u={},d=new WeakMap,g=[],v=null,m=!1,p=null,M=null,E=null,y=null,w=null,T=null,C=null,_=new Ft(0,0,0),A=0,P=!1,L=null,N=null,B=null,U=null,k=null,ue.set(0,0,s.canvas.width,s.canvas.height),jt.set(0,0,s.canvas.width,s.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:tt,disable:_t,bindFramebuffer:Gt,drawBuffers:bt,useProgram:Vt,setBlending:at,setMaterial:ot,setFlipSided:lt,setCullFace:ft,setLineWidth:kt,setPolygonOffset:zt,setScissorTest:Wt,activeTexture:qt,bindTexture:D,unbindTexture:fe,compressedTexImage2D:te,compressedTexImage3D:R,texImage2D:Y,texImage3D:Q,pixelStorei:Nt,getParameter:dt,updateUBOMapping:Ut,uniformBlockBinding:Ht,texStorage2D:ht,texStorage3D:ut,texSubImage2D:x,texSubImage3D:z,compressedTexSubImage2D:V,compressedTexSubImage3D:$,scissor:xt,viewport:pt,reset:Zt}}function h_(s,t,e,n,i,r,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ct,h=new WeakMap,f=new Set;let u;const d=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(R,x){return g?new OffscreenCanvas(R,x):Oa("canvas")}function m(R,x,z){let V=1;const $=te(R);if(($.width>z||$.height>z)&&(V=z/Math.max($.width,$.height)),V<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const ht=Math.floor(V*$.width),ut=Math.floor(V*$.height);u===void 0&&(u=v(ht,ut));const Y=x?v(ht,ut):u;return Y.width=ht,Y.height=ut,Y.getContext("2d").drawImage(R,0,0,ht,ut),Xt("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+ht+"x"+ut+")."),Y}else return"data"in R&&Xt("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),R;return R}function p(R){return R.generateMipmaps}function M(R){s.generateMipmap(R)}function E(R){return R.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?s.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function y(R,x,z,V,$,ht=!1){if(R!==null){if(s[R]!==void 0)return s[R];Xt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let ut;V&&(ut=t.get("EXT_texture_norm16"),ut||Xt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=x;if(x===s.RED&&(z===s.FLOAT&&(Y=s.R32F),z===s.HALF_FLOAT&&(Y=s.R16F),z===s.UNSIGNED_BYTE&&(Y=s.R8),z===s.UNSIGNED_SHORT&&ut&&(Y=ut.R16_EXT),z===s.SHORT&&ut&&(Y=ut.R16_SNORM_EXT)),x===s.RED_INTEGER&&(z===s.UNSIGNED_BYTE&&(Y=s.R8UI),z===s.UNSIGNED_SHORT&&(Y=s.R16UI),z===s.UNSIGNED_INT&&(Y=s.R32UI),z===s.BYTE&&(Y=s.R8I),z===s.SHORT&&(Y=s.R16I),z===s.INT&&(Y=s.R32I)),x===s.RG&&(z===s.FLOAT&&(Y=s.RG32F),z===s.HALF_FLOAT&&(Y=s.RG16F),z===s.UNSIGNED_BYTE&&(Y=s.RG8),z===s.UNSIGNED_SHORT&&ut&&(Y=ut.RG16_EXT),z===s.SHORT&&ut&&(Y=ut.RG16_SNORM_EXT)),x===s.RG_INTEGER&&(z===s.UNSIGNED_BYTE&&(Y=s.RG8UI),z===s.UNSIGNED_SHORT&&(Y=s.RG16UI),z===s.UNSIGNED_INT&&(Y=s.RG32UI),z===s.BYTE&&(Y=s.RG8I),z===s.SHORT&&(Y=s.RG16I),z===s.INT&&(Y=s.RG32I)),x===s.RGB_INTEGER&&(z===s.UNSIGNED_BYTE&&(Y=s.RGB8UI),z===s.UNSIGNED_SHORT&&(Y=s.RGB16UI),z===s.UNSIGNED_INT&&(Y=s.RGB32UI),z===s.BYTE&&(Y=s.RGB8I),z===s.SHORT&&(Y=s.RGB16I),z===s.INT&&(Y=s.RGB32I)),x===s.RGBA_INTEGER&&(z===s.UNSIGNED_BYTE&&(Y=s.RGBA8UI),z===s.UNSIGNED_SHORT&&(Y=s.RGBA16UI),z===s.UNSIGNED_INT&&(Y=s.RGBA32UI),z===s.BYTE&&(Y=s.RGBA8I),z===s.SHORT&&(Y=s.RGBA16I),z===s.INT&&(Y=s.RGBA32I)),x===s.RGB&&(z===s.UNSIGNED_SHORT&&ut&&(Y=ut.RGB16_EXT),z===s.SHORT&&ut&&(Y=ut.RGB16_SNORM_EXT),z===s.UNSIGNED_INT_5_9_9_9_REV&&(Y=s.RGB9_E5),z===s.UNSIGNED_INT_10F_11F_11F_REV&&(Y=s.R11F_G11F_B10F)),x===s.RGBA){const Q=ht?Fa:ae.getTransfer($);z===s.FLOAT&&(Y=s.RGBA32F),z===s.HALF_FLOAT&&(Y=s.RGBA16F),z===s.UNSIGNED_BYTE&&(Y=Q===xe?s.SRGB8_ALPHA8:s.RGBA8),z===s.UNSIGNED_SHORT&&ut&&(Y=ut.RGBA16_EXT),z===s.SHORT&&ut&&(Y=ut.RGBA16_SNORM_EXT),z===s.UNSIGNED_SHORT_4_4_4_4&&(Y=s.RGBA4),z===s.UNSIGNED_SHORT_5_5_5_1&&(Y=s.RGB5_A1)}return(Y===s.R16F||Y===s.R32F||Y===s.RG16F||Y===s.RG32F||Y===s.RGBA16F||Y===s.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function w(R,x){let z;return R?x===null||x===qn||x===Lr?z=s.DEPTH24_STENCIL8:x===Cn?z=s.DEPTH32F_STENCIL8:x===Pr&&(z=s.DEPTH24_STENCIL8,Xt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===qn||x===Lr?z=s.DEPTH_COMPONENT24:x===Cn?z=s.DEPTH_COMPONENT32F:x===Pr&&(z=s.DEPTH_COMPONENT16),z}function T(R,x){return p(R)===!0||R.isFramebufferTexture&&R.minFilter!==ke&&R.minFilter!==Ye?Math.log2(Math.max(x.width,x.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?x.mipmaps.length:1}function C(R){const x=R.target;x.removeEventListener("dispose",C),A(x),x.isVideoTexture&&h.delete(x),x.isHTMLTexture&&f.delete(x)}function _(R){const x=R.target;x.removeEventListener("dispose",_),L(x)}function A(R){const x=n.get(R);if(x.__webglInit===void 0)return;const z=R.source,V=d.get(z);if(V){const $=V[x.__cacheKey];$.usedTimes--,$.usedTimes===0&&P(R),Object.keys(V).length===0&&d.delete(z)}n.remove(R)}function P(R){const x=n.get(R);s.deleteTexture(x.__webglTexture);const z=R.source,V=d.get(z);delete V[x.__cacheKey],a.memory.textures--}function L(R){const x=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(x.__webglFramebuffer[V]))for(let $=0;$<x.__webglFramebuffer[V].length;$++)s.deleteFramebuffer(x.__webglFramebuffer[V][$]);else s.deleteFramebuffer(x.__webglFramebuffer[V]);x.__webglDepthbuffer&&s.deleteRenderbuffer(x.__webglDepthbuffer[V])}else{if(Array.isArray(x.__webglFramebuffer))for(let V=0;V<x.__webglFramebuffer.length;V++)s.deleteFramebuffer(x.__webglFramebuffer[V]);else s.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&s.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&s.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let V=0;V<x.__webglColorRenderbuffer.length;V++)x.__webglColorRenderbuffer[V]&&s.deleteRenderbuffer(x.__webglColorRenderbuffer[V]);x.__webglDepthRenderbuffer&&s.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const z=R.textures;for(let V=0,$=z.length;V<$;V++){const ht=n.get(z[V]);ht.__webglTexture&&(s.deleteTexture(ht.__webglTexture),a.memory.textures--),n.remove(z[V])}n.remove(R)}let N=0;function B(){N=0}function U(){return N}function k(R){N=R}function K(){const R=N;return R>=i.maxTextures&&Xt("WebGLTextures: Trying to use "+(R+1)+" texture units while this GPU supports only "+i.maxTextures),N+=1,R}function W(R){const x=[];return x.push(R.wrapS),x.push(R.wrapT),x.push(R.wrapR||0),x.push(R.magFilter),x.push(R.minFilter),x.push(R.anisotropy),x.push(R.internalFormat),x.push(R.format),x.push(R.type),x.push(R.generateMipmaps),x.push(R.premultiplyAlpha),x.push(R.flipY),x.push(R.unpackAlignment),x.push(R.colorSpace),x.join()}function rt(R,x){const z=n.get(R);if(R.isVideoTexture&&D(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&z.__version!==R.version){const V=R.image;if(V===null)Xt("WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)Xt("WebGLRenderer: Texture marked for update but image is incomplete");else{_t(z,R,x);return}}else R.isExternalTexture&&(z.__webglTexture=R.sourceTexture?R.sourceTexture:null);e.bindTexture(s.TEXTURE_2D,z.__webglTexture,s.TEXTURE0+x)}function q(R,x){const z=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&z.__version!==R.version){_t(z,R,x);return}else R.isExternalTexture&&(z.__webglTexture=R.sourceTexture?R.sourceTexture:null);e.bindTexture(s.TEXTURE_2D_ARRAY,z.__webglTexture,s.TEXTURE0+x)}function j(R,x){const z=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&z.__version!==R.version){_t(z,R,x);return}e.bindTexture(s.TEXTURE_3D,z.__webglTexture,s.TEXTURE0+x)}function nt(R,x){const z=n.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&z.__version!==R.version){Gt(z,R,x);return}e.bindTexture(s.TEXTURE_CUBE_MAP,z.__webglTexture,s.TEXTURE0+x)}const It={[La]:s.REPEAT,[si]:s.CLAMP_TO_EDGE,[pl]:s.MIRRORED_REPEAT},Tt={[ke]:s.NEAREST,[Yd]:s.NEAREST_MIPMAP_NEAREST,[Wr]:s.NEAREST_MIPMAP_LINEAR,[Ye]:s.LINEAR,[co]:s.LINEAR_MIPMAP_NEAREST,[Gi]:s.LINEAR_MIPMAP_LINEAR},ue={[Qd]:s.NEVER,[ip]:s.ALWAYS,[jd]:s.LESS,[gc]:s.LEQUAL,[tp]:s.EQUAL,[xc]:s.GEQUAL,[ep]:s.GREATER,[np]:s.NOTEQUAL};function jt(R,x){if(x.type===Cn&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===Ye||x.magFilter===co||x.magFilter===Wr||x.magFilter===Gi||x.minFilter===Ye||x.minFilter===co||x.minFilter===Wr||x.minFilter===Gi)&&Xt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(R,s.TEXTURE_WRAP_S,It[x.wrapS]),s.texParameteri(R,s.TEXTURE_WRAP_T,It[x.wrapT]),(R===s.TEXTURE_3D||R===s.TEXTURE_2D_ARRAY)&&s.texParameteri(R,s.TEXTURE_WRAP_R,It[x.wrapR]),s.texParameteri(R,s.TEXTURE_MAG_FILTER,Tt[x.magFilter]),s.texParameteri(R,s.TEXTURE_MIN_FILTER,Tt[x.minFilter]),x.compareFunction&&(s.texParameteri(R,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(R,s.TEXTURE_COMPARE_FUNC,ue[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===ke||x.minFilter!==Wr&&x.minFilter!==Gi||x.type===Cn&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const z=t.get("EXT_texture_filter_anisotropic");s.texParameterf(R,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,i.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function ce(R,x){let z=!1;R.__webglInit===void 0&&(R.__webglInit=!0,x.addEventListener("dispose",C));const V=x.source;let $=d.get(V);$===void 0&&($={},d.set(V,$));const ht=W(x);if(ht!==R.__cacheKey){$[ht]===void 0&&($[ht]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,z=!0),$[ht].usedTimes++;const ut=$[R.__cacheKey];ut!==void 0&&($[R.__cacheKey].usedTimes--,ut.usedTimes===0&&P(x)),R.__cacheKey=ht,R.__webglTexture=$[ht].texture}return z}function Z(R,x,z){return Math.floor(Math.floor(R/z)/x)}function tt(R,x,z,V){const ht=R.updateRanges;if(ht.length===0)e.texSubImage2D(s.TEXTURE_2D,0,0,0,x.width,x.height,z,V,x.data);else{ht.sort((Nt,xt)=>Nt.start-xt.start);let ut=0;for(let Nt=1;Nt<ht.length;Nt++){const xt=ht[ut],pt=ht[Nt],Ut=xt.start+xt.count,Ht=Z(pt.start,x.width,4),Zt=Z(xt.start,x.width,4);pt.start<=Ut+1&&Ht===Zt&&Z(pt.start+pt.count-1,x.width,4)===Ht?xt.count=Math.max(xt.count,pt.start+pt.count-xt.start):(++ut,ht[ut]=pt)}ht.length=ut+1;const Y=e.getParameter(s.UNPACK_ROW_LENGTH),Q=e.getParameter(s.UNPACK_SKIP_PIXELS),dt=e.getParameter(s.UNPACK_SKIP_ROWS);e.pixelStorei(s.UNPACK_ROW_LENGTH,x.width);for(let Nt=0,xt=ht.length;Nt<xt;Nt++){const pt=ht[Nt],Ut=Math.floor(pt.start/4),Ht=Math.ceil(pt.count/4),Zt=Ut%x.width,O=Math.floor(Ut/x.width),mt=Ht,J=1;e.pixelStorei(s.UNPACK_SKIP_PIXELS,Zt),e.pixelStorei(s.UNPACK_SKIP_ROWS,O),e.texSubImage2D(s.TEXTURE_2D,0,Zt,O,mt,J,z,V,x.data)}R.clearUpdateRanges(),e.pixelStorei(s.UNPACK_ROW_LENGTH,Y),e.pixelStorei(s.UNPACK_SKIP_PIXELS,Q),e.pixelStorei(s.UNPACK_SKIP_ROWS,dt)}}function _t(R,x,z){let V=s.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(V=s.TEXTURE_2D_ARRAY),x.isData3DTexture&&(V=s.TEXTURE_3D);const $=ce(R,x),ht=x.source;e.bindTexture(V,R.__webglTexture,s.TEXTURE0+z);const ut=n.get(ht);if(ht.version!==ut.__version||$===!0){if(e.activeTexture(s.TEXTURE0+z),(typeof ImageBitmap<"u"&&x.image instanceof ImageBitmap)===!1){const J=ae.getPrimaries(ae.workingColorSpace),gt=x.colorSpace===Ei?null:ae.getPrimaries(x.colorSpace),St=x.colorSpace===Ei||J===gt?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,St)}e.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment);let Q=m(x.image,!1,i.maxTextureSize);Q=fe(x,Q);const dt=r.convert(x.format,x.colorSpace),Nt=r.convert(x.type);let xt=y(x.internalFormat,dt,Nt,x.normalized,x.colorSpace,x.isVideoTexture);jt(V,x);let pt;const Ut=x.mipmaps,Ht=x.isVideoTexture!==!0,Zt=ut.__version===void 0||$===!0,O=ht.dataReady,mt=T(x,Q);if(x.isDepthTexture)xt=w(x.format===Vi,x.type),Zt&&(Ht?e.texStorage2D(s.TEXTURE_2D,1,xt,Q.width,Q.height):e.texImage2D(s.TEXTURE_2D,0,xt,Q.width,Q.height,0,dt,Nt,null));else if(x.isDataTexture)if(Ut.length>0){Ht&&Zt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,Ut[0].width,Ut[0].height);for(let J=0,gt=Ut.length;J<gt;J++)pt=Ut[J],Ht?O&&e.texSubImage2D(s.TEXTURE_2D,J,0,0,pt.width,pt.height,dt,Nt,pt.data):e.texImage2D(s.TEXTURE_2D,J,xt,pt.width,pt.height,0,dt,Nt,pt.data);x.generateMipmaps=!1}else Ht?(Zt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,Q.width,Q.height),O&&tt(x,Q,dt,Nt)):e.texImage2D(s.TEXTURE_2D,0,xt,Q.width,Q.height,0,dt,Nt,Q.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Ht&&Zt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,mt,xt,Ut[0].width,Ut[0].height,Q.depth);for(let J=0,gt=Ut.length;J<gt;J++)if(pt=Ut[J],x.format!==Pn)if(dt!==null)if(Ht){if(O)if(x.layerUpdates.size>0){const St=kh(pt.width,pt.height,x.format,x.type);for(const it of x.layerUpdates){const Ot=pt.data.subarray(it*St/pt.data.BYTES_PER_ELEMENT,(it+1)*St/pt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,J,0,0,it,pt.width,pt.height,1,dt,Ot)}}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,J,0,0,0,pt.width,pt.height,Q.depth,dt,pt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,J,xt,pt.width,pt.height,Q.depth,0,pt.data,0,0);else Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ht?O&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,J,0,0,0,pt.width,pt.height,Q.depth,dt,Nt,pt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,J,xt,pt.width,pt.height,Q.depth,0,dt,Nt,pt.data);x.layerUpdates.size>0&&x.clearLayerUpdates()}else{Ht&&Zt&&e.texStorage2D(s.TEXTURE_2D,mt,xt,Ut[0].width,Ut[0].height);for(let J=0,gt=Ut.length;J<gt;J++)pt=Ut[J],x.format!==Pn?dt!==null?Ht?O&&e.compressedTexSubImage2D(s.TEXTURE_2D,J,0,0,pt.width,pt.height,dt,pt.data):e.compressedTexImage2D(s.TEXTURE_2D,J,xt,pt.width,pt.height,0,pt.data):Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ht?O&&e.texSubImage2D(s.TEXTURE_2D,J,0,0,pt.width,pt.height,dt,Nt,pt.data):e.texImage2D(s.TEXTURE_2D,J,xt,pt.width,pt.height,0,dt,Nt,pt.data)}else if(x.isDataArrayTexture)if(Ht){if(Zt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,mt,xt,Q.width,Q.height,Q.depth),O)if(x.layerUpdates.size>0){const J=kh(Q.width,Q.height,x.format,x.type);for(const gt of x.layerUpdates){const St=Q.data.subarray(gt*J/Q.data.BYTES_PER_ELEMENT,(gt+1)*J/Q.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,gt,Q.width,Q.height,1,dt,Nt,St)}x.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,dt,Nt,Q.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,xt,Q.width,Q.height,Q.depth,0,dt,Nt,Q.data);else if(x.isData3DTexture)Ht?(Zt&&e.texStorage3D(s.TEXTURE_3D,mt,xt,Q.width,Q.height,Q.depth),O&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,dt,Nt,Q.data)):e.texImage3D(s.TEXTURE_3D,0,xt,Q.width,Q.height,Q.depth,0,dt,Nt,Q.data);else if(x.isFramebufferTexture){if(Zt)if(Ht)e.texStorage2D(s.TEXTURE_2D,mt,xt,Q.width,Q.height);else{let J=Q.width,gt=Q.height;for(let St=0;St<mt;St++)e.texImage2D(s.TEXTURE_2D,St,xt,J,gt,0,dt,Nt,null),J>>=1,gt>>=1}}else if(x.isHTMLTexture){if("texElementImage2D"in s){const J=s.canvas;if(J.hasAttribute("layoutsubtree")||J.setAttribute("layoutsubtree","true"),Q.parentNode!==J){J.appendChild(Q),f.add(x),J.onpaint=gt=>{const St=gt.changedElements;for(const it of f)St.includes(it.image)&&(it.needsUpdate=!0)},J.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,Q);else{const St=s.RGBA,it=s.RGBA,Ot=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,St,it,Ot,Q)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(Ut.length>0){if(Ht&&Zt){const J=te(Ut[0]);e.texStorage2D(s.TEXTURE_2D,mt,xt,J.width,J.height)}for(let J=0,gt=Ut.length;J<gt;J++)pt=Ut[J],Ht?O&&e.texSubImage2D(s.TEXTURE_2D,J,0,0,dt,Nt,pt):e.texImage2D(s.TEXTURE_2D,J,xt,dt,Nt,pt);x.generateMipmaps=!1}else if(Ht){if(Zt){const J=te(Q);e.texStorage2D(s.TEXTURE_2D,mt,xt,J.width,J.height)}O&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,dt,Nt,Q)}else e.texImage2D(s.TEXTURE_2D,0,xt,dt,Nt,Q);p(x)&&M(V),ut.__version=ht.version,x.onUpdate&&x.onUpdate(x)}R.__version=x.version}function Gt(R,x,z){if(x.image.length!==6)return;const V=ce(R,x),$=x.source;e.bindTexture(s.TEXTURE_CUBE_MAP,R.__webglTexture,s.TEXTURE0+z);const ht=n.get($);if($.version!==ht.__version||V===!0){e.activeTexture(s.TEXTURE0+z);const ut=ae.getPrimaries(ae.workingColorSpace),Y=x.colorSpace===Ei?null:ae.getPrimaries(x.colorSpace),Q=x.colorSpace===Ei||ut===Y?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Q);const dt=x.isCompressedTexture||x.image[0].isCompressedTexture,Nt=x.image[0]&&x.image[0].isDataTexture,xt=[];for(let it=0;it<6;it++)!dt&&!Nt?xt[it]=m(x.image[it],!0,i.maxCubemapSize):xt[it]=Nt?x.image[it].image:x.image[it],xt[it]=fe(x,xt[it]);const pt=xt[0],Ut=r.convert(x.format,x.colorSpace),Ht=r.convert(x.type),Zt=y(x.internalFormat,Ut,Ht,x.normalized,x.colorSpace),O=x.isVideoTexture!==!0,mt=ht.__version===void 0||V===!0,J=$.dataReady;let gt=T(x,pt);jt(s.TEXTURE_CUBE_MAP,x);let St;if(dt){O&&mt&&e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,Zt,pt.width,pt.height);for(let it=0;it<6;it++){St=xt[it].mipmaps;for(let Ot=0;Ot<St.length;Ot++){const Pt=St[Ot];x.format!==Pn?Ut!==null?O?J&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot,0,0,Pt.width,Pt.height,Ut,Pt.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot,Zt,Pt.width,Pt.height,0,Pt.data):Xt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):O?J&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot,0,0,Pt.width,Pt.height,Ut,Ht,Pt.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot,Zt,Pt.width,Pt.height,0,Ut,Ht,Pt.data)}}}else{if(St=x.mipmaps,O&&mt){St.length>0&&gt++;const it=te(xt[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,Zt,it.width,it.height)}for(let it=0;it<6;it++)if(Nt){O?J&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,xt[it].width,xt[it].height,Ut,Ht,xt[it].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Zt,xt[it].width,xt[it].height,0,Ut,Ht,xt[it].data);for(let Ot=0;Ot<St.length;Ot++){const be=St[Ot].image[it].image;O?J&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot+1,0,0,be.width,be.height,Ut,Ht,be.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot+1,Zt,be.width,be.height,0,Ut,Ht,be.data)}}else{O?J&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,Ut,Ht,xt[it]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Zt,Ut,Ht,xt[it]);for(let Ot=0;Ot<St.length;Ot++){const Pt=St[Ot];O?J&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot+1,0,0,Ut,Ht,Pt.image[it]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,Ot+1,Zt,Ut,Ht,Pt.image[it])}}}p(x)&&M(s.TEXTURE_CUBE_MAP),ht.__version=$.version,x.onUpdate&&x.onUpdate(x)}R.__version=x.version}function bt(R,x,z,V,$,ht){const ut=r.convert(z.format,z.colorSpace),Y=r.convert(z.type),Q=y(z.internalFormat,ut,Y,z.normalized,z.colorSpace),dt=n.get(x),Nt=n.get(z);if(Nt.__renderTarget=x,!dt.__hasExternalTextures){const xt=Math.max(1,x.width>>ht),pt=Math.max(1,x.height>>ht);$===s.TEXTURE_3D||$===s.TEXTURE_2D_ARRAY?e.texImage3D($,ht,Q,xt,pt,x.depth,0,ut,Y,null):e.texImage2D($,ht,Q,xt,pt,0,ut,Y,null)}e.bindFramebuffer(s.FRAMEBUFFER,R),qt(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,V,$,Nt.__webglTexture,0,Wt(x)):($===s.TEXTURE_2D||$>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,V,$,Nt.__webglTexture,ht),e.bindFramebuffer(s.FRAMEBUFFER,null)}function Vt(R,x,z){if(s.bindRenderbuffer(s.RENDERBUFFER,R),x.depthBuffer){const V=x.depthTexture,$=V&&V.isDepthTexture?V.type:null,ht=w(x.stencilBuffer,$),ut=x.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;qt(x)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Wt(x),ht,x.width,x.height):z?s.renderbufferStorageMultisample(s.RENDERBUFFER,Wt(x),ht,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,ht,x.width,x.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,ut,s.RENDERBUFFER,R)}else{const V=x.textures;for(let $=0;$<V.length;$++){const ht=V[$],ut=r.convert(ht.format,ht.colorSpace),Y=r.convert(ht.type),Q=y(ht.internalFormat,ut,Y,ht.normalized,ht.colorSpace);qt(x)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Wt(x),Q,x.width,x.height):z?s.renderbufferStorageMultisample(s.RENDERBUFFER,Wt(x),Q,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,Q,x.width,x.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function ge(R,x,z){const V=x.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(s.FRAMEBUFFER,R),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const $=n.get(x.depthTexture);if($.__renderTarget=x,(!$.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),V){if($.__webglInit===void 0&&($.__webglInit=!0,x.depthTexture.addEventListener("dispose",C)),$.__webglTexture===void 0){$.__webglTexture=s.createTexture(),e.bindTexture(s.TEXTURE_CUBE_MAP,$.__webglTexture),jt(s.TEXTURE_CUBE_MAP,x.depthTexture);const dt=r.convert(x.depthTexture.format),Nt=r.convert(x.depthTexture.type);let xt;x.depthTexture.format===ui?xt=s.DEPTH_COMPONENT24:x.depthTexture.format===Vi&&(xt=s.DEPTH24_STENCIL8);for(let pt=0;pt<6;pt++)s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,xt,x.width,x.height,0,dt,Nt,null)}}else rt(x.depthTexture,0);const ht=$.__webglTexture,ut=Wt(x),Y=V?s.TEXTURE_CUBE_MAP_POSITIVE_X+z:s.TEXTURE_2D,Q=x.depthTexture.format===Vi?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(x.depthTexture.format===ui)qt(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Q,Y,ht,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,Q,Y,ht,0);else if(x.depthTexture.format===Vi)qt(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Q,Y,ht,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,Q,Y,ht,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function et(R){const x=n.get(R),z=R.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==R.depthTexture){const V=R.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),V){const $=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,V.removeEventListener("dispose",$)};V.addEventListener("dispose",$),x.__depthDisposeCallback=$}x.__boundDepthTexture=V}if(R.depthTexture&&!x.__autoAllocateDepthBuffer)if(z)for(let V=0;V<6;V++)ge(x.__webglFramebuffer[V],R,V);else{const V=R.texture.mipmaps;V&&V.length>0?ge(x.__webglFramebuffer[0],R,0):ge(x.__webglFramebuffer,R,0)}else if(z){x.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(e.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer[V]),x.__webglDepthbuffer[V]===void 0)x.__webglDepthbuffer[V]=s.createRenderbuffer(),Vt(x.__webglDepthbuffer[V],R,!1);else{const $=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ht=x.__webglDepthbuffer[V];s.bindRenderbuffer(s.RENDERBUFFER,ht),s.framebufferRenderbuffer(s.FRAMEBUFFER,$,s.RENDERBUFFER,ht)}}else{const V=R.texture.mipmaps;if(V&&V.length>0?e.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=s.createRenderbuffer(),Vt(x.__webglDepthbuffer,R,!1);else{const $=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ht=x.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,ht),s.framebufferRenderbuffer(s.FRAMEBUFFER,$,s.RENDERBUFFER,ht)}}e.bindFramebuffer(s.FRAMEBUFFER,null)}function at(R,x,z){const V=n.get(R);x!==void 0&&bt(V.__webglFramebuffer,R,R.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),z!==void 0&&et(R)}function ot(R){const x=R.texture,z=n.get(R),V=n.get(x);R.addEventListener("dispose",_);const $=R.textures,ht=R.isWebGLCubeRenderTarget===!0,ut=$.length>1;if(ut||(V.__webglTexture===void 0&&(V.__webglTexture=s.createTexture()),V.__version=x.version,a.memory.textures++),ht){z.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(x.mipmaps&&x.mipmaps.length>0){z.__webglFramebuffer[Y]=[];for(let Q=0;Q<x.mipmaps.length;Q++)z.__webglFramebuffer[Y][Q]=s.createFramebuffer()}else z.__webglFramebuffer[Y]=s.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){z.__webglFramebuffer=[];for(let Y=0;Y<x.mipmaps.length;Y++)z.__webglFramebuffer[Y]=s.createFramebuffer()}else z.__webglFramebuffer=s.createFramebuffer();if(ut)for(let Y=0,Q=$.length;Y<Q;Y++){const dt=n.get($[Y]);dt.__webglTexture===void 0&&(dt.__webglTexture=s.createTexture(),a.memory.textures++)}if(R.samples>0&&qt(R)===!1){z.__webglMultisampledFramebuffer=s.createFramebuffer(),z.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let Y=0;Y<$.length;Y++){const Q=$[Y];z.__webglColorRenderbuffer[Y]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,z.__webglColorRenderbuffer[Y]);const dt=r.convert(Q.format,Q.colorSpace),Nt=r.convert(Q.type),xt=y(Q.internalFormat,dt,Nt,Q.normalized,Q.colorSpace,R.isXRRenderTarget===!0),pt=Wt(R);s.renderbufferStorageMultisample(s.RENDERBUFFER,pt,xt,R.width,R.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Y,s.RENDERBUFFER,z.__webglColorRenderbuffer[Y])}s.bindRenderbuffer(s.RENDERBUFFER,null),R.depthBuffer&&(z.__webglDepthRenderbuffer=s.createRenderbuffer(),Vt(z.__webglDepthRenderbuffer,R,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(ht){e.bindTexture(s.TEXTURE_CUBE_MAP,V.__webglTexture),jt(s.TEXTURE_CUBE_MAP,x);for(let Y=0;Y<6;Y++)if(x.mipmaps&&x.mipmaps.length>0)for(let Q=0;Q<x.mipmaps.length;Q++)bt(z.__webglFramebuffer[Y][Q],R,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Q);else bt(z.__webglFramebuffer[Y],R,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);p(x)&&M(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(ut){for(let Y=0,Q=$.length;Y<Q;Y++){const dt=$[Y],Nt=n.get(dt);let xt=s.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(xt=R.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(xt,Nt.__webglTexture),jt(xt,dt),bt(z.__webglFramebuffer,R,dt,s.COLOR_ATTACHMENT0+Y,xt,0),p(dt)&&M(xt)}e.unbindTexture()}else{let Y=s.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(Y=R.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(Y,V.__webglTexture),jt(Y,x),x.mipmaps&&x.mipmaps.length>0)for(let Q=0;Q<x.mipmaps.length;Q++)bt(z.__webglFramebuffer[Q],R,x,s.COLOR_ATTACHMENT0,Y,Q);else bt(z.__webglFramebuffer,R,x,s.COLOR_ATTACHMENT0,Y,0);p(x)&&M(Y),e.unbindTexture()}R.depthBuffer&&et(R)}function lt(R){const x=R.textures;for(let z=0,V=x.length;z<V;z++){const $=x[z];if(p($)){const ht=E(R),ut=n.get($).__webglTexture;e.bindTexture(ht,ut),M(ht),e.unbindTexture()}}}const ft=[],kt=[];function zt(R){if(R.samples>0){if(qt(R)===!1){const x=R.textures,z=R.width,V=R.height;let $=s.COLOR_BUFFER_BIT;const ht=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ut=n.get(R),Y=x.length>1;if(Y)for(let dt=0;dt<x.length;dt++)e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+dt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+dt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,ut.__webglMultisampledFramebuffer);const Q=R.texture.mipmaps;Q&&Q.length>0?e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglFramebuffer[0]):e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglFramebuffer);for(let dt=0;dt<x.length;dt++){if(R.resolveDepthBuffer&&(R.depthBuffer&&($|=s.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&($|=s.STENCIL_BUFFER_BIT)),Y){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,ut.__webglColorRenderbuffer[dt]);const Nt=n.get(x[dt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Nt,0)}s.blitFramebuffer(0,0,z,V,0,0,z,V,$,s.NEAREST),l===!0&&(ft.length=0,kt.length=0,ft.push(s.COLOR_ATTACHMENT0+dt),R.depthBuffer&&R.storeMultisampledDepthBuffer===!1&&(ft.push(ht),kt.push(ht),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,kt)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,ft))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),Y)for(let dt=0;dt<x.length;dt++){e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+dt,s.RENDERBUFFER,ut.__webglColorRenderbuffer[dt]);const Nt=n.get(x[dt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,ut.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+dt,s.TEXTURE_2D,Nt,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ut.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.storeMultisampledDepthBuffer===!1&&l){const x=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[x])}}}function Wt(R){return Math.min(i.maxSamples,R.samples)}function qt(R){const x=n.get(R);return R.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function D(R){const x=a.render.frame;h.get(R)!==x&&(h.set(R,x),R.update())}function fe(R,x){const z=R.colorSpace,V=R.format,$=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||z!==Ua&&z!==Ei&&(ae.getTransfer(z)===xe?(V!==Pn||$!==un)&&Xt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):le("WebGLTextures: Unsupported texture color space:",z)),x}function te(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(c.width=R.naturalWidth||R.width,c.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(c.width=R.displayWidth,c.height=R.displayHeight):(c.width=R.width,c.height=R.height),c}this.allocateTextureUnit=K,this.resetTextureUnits=B,this.getTextureUnits=U,this.setTextureUnits=k,this.setTexture2D=rt,this.setTexture2DArray=q,this.setTexture3D=j,this.setTextureCube=nt,this.rebindTextures=at,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=lt,this.updateMultisampleRenderTarget=zt,this.setupDepthRenderbuffer=et,this.setupFrameBufferTexture=bt,this.useMultisampledRTT=qt,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function u_(s,t){function e(n,i=Ei){let r;const a=ae.getTransfer(i);if(n===un)return s.UNSIGNED_BYTE;if(n===hc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===uc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Ju)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Qu)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===Zu)return s.BYTE;if(n===Ku)return s.SHORT;if(n===Pr)return s.UNSIGNED_SHORT;if(n===cc)return s.INT;if(n===qn)return s.UNSIGNED_INT;if(n===Cn)return s.FLOAT;if(n===$n)return s.HALF_FLOAT;if(n===ju)return s.ALPHA;if(n===tf)return s.RGB;if(n===Pn)return s.RGBA;if(n===ui)return s.DEPTH_COMPONENT;if(n===Vi)return s.DEPTH_STENCIL;if(n===fc)return s.RED;if(n===dc)return s.RED_INTEGER;if(n===Ki)return s.RG;if(n===pc)return s.RG_INTEGER;if(n===mc)return s.RGBA_INTEGER;if(n===ba||n===wa||n===Ea||n===Ta)if(a===xe)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ba)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===wa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ea)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ta)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ba)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===wa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ea)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ta)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ml||n===gl||n===xl||n===vl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===ml)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===gl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===xl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===vl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===_l||n===Ml||n===yl||n===Sl||n===bl||n===Ia||n===wl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===_l||n===Ml)return a===xe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===yl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Sl)return r.COMPRESSED_R11_EAC;if(n===bl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Ia)return r.COMPRESSED_RG11_EAC;if(n===wl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===El||n===Tl||n===Al||n===Rl||n===Cl||n===Pl||n===Ll||n===Il||n===Dl||n===Nl||n===Ul||n===Fl||n===Ol||n===zl)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===El)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Tl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Al)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Rl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Cl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Pl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ll)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Il)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Dl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Nl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ul)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Fl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ol)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===zl)return a===xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Bl||n===kl||n===Hl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Bl)return a===xe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===kl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Hl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Gl||n===Vl||n===Da||n===Wl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Gl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Vl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Da)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Wl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Lr?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}const f_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,d_=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class p_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new pf(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new In({vertexShader:f_,fragmentShader:d_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new re(new li(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class m_ extends Qi{constructor(t,e){super();const n=this;let i=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null;const v=typeof XRWebGLBinding<"u",m=new p_,p={},M=e.getContextAttributes();let E=null,y=null;const w=[],T=[],C=new ct;let _=null,A=null;const P=new on;P.viewport=new Te;const L=new on;L.viewport=new Te;const N=[P,L],B=new bm;let U=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let tt=w[Z];return tt===void 0&&(tt=new _o,w[Z]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(Z){let tt=w[Z];return tt===void 0&&(tt=new _o,w[Z]=tt),tt.getGripSpace()},this.getHand=function(Z){let tt=w[Z];return tt===void 0&&(tt=new _o,w[Z]=tt),tt.getHandSpace()};function K(Z){const tt=T.indexOf(Z.inputSource);if(tt===-1)return;const _t=w[tt];_t!==void 0&&(_t.update(Z.inputSource,Z.frame,c||a),_t.dispatchEvent({type:Z.type,data:Z.inputSource}))}function W(){i.removeEventListener("select",K),i.removeEventListener("selectstart",K),i.removeEventListener("selectend",K),i.removeEventListener("squeeze",K),i.removeEventListener("squeezestart",K),i.removeEventListener("squeezeend",K),i.removeEventListener("end",W),i.removeEventListener("inputsourceschange",rt);for(let Z=0;Z<w.length;Z++){const tt=T[Z];tt!==null&&(T[Z]=null,w[Z].disconnect(tt))}U=null,k=null,m.reset();for(const Z in p)delete p[Z];if(t.setRenderTarget(E),d=null,u=null,f=null,i=null,y=null,ce.stop(),n.isPresenting=!1,t.setPixelRatio(_),t.setSize(C.width,C.height,!1),A!==null){const Z=A.camera;Z.fov=A.fov,Z.zoom=A.zoom,Z.updateProjectionMatrix(),A=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&Xt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&Xt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Z){c=Z},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&v&&(f=new XRWebGLBinding(i,e)),f},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function(Z){if(i=Z,i!==null){if(E=t.getRenderTarget(),i.addEventListener("select",K),i.addEventListener("selectstart",K),i.addEventListener("selectend",K),i.addEventListener("squeeze",K),i.addEventListener("squeezestart",K),i.addEventListener("squeezeend",K),i.addEventListener("end",W),i.addEventListener("inputsourceschange",rt),M.xrCompatible!==!0&&await e.makeXRCompatible(),_=t.getPixelRatio(),t.getSize(C),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let _t=null,Gt=null,bt=null;M.depth&&(bt=M.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,_t=M.stencil?Vi:ui,Gt=M.stencil?Lr:qn);const Vt={colorFormat:e.RGBA8,depthFormat:bt,scaleFactor:r};f=this.getBinding(),u=f.createProjectionLayer(Vt),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new Sn(u.textureWidth,u.textureHeight,{format:Pn,type:un,depthTexture:new Nr(u.textureWidth,u.textureHeight,Gt,void 0,void 0,void 0,void 0,void 0,void 0,_t),stencilBuffer:M.stencil,colorSpace:t.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{const _t={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(i,e,_t),i.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),y=new Sn(d.framebufferWidth,d.framebufferHeight,{format:Pn,type:un,colorSpace:t.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await i.requestReferenceSpace(o),ce.setContext(i),ce.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function rt(Z){for(let tt=0;tt<Z.removed.length;tt++){const _t=Z.removed[tt],Gt=T.indexOf(_t);Gt>=0&&(T[Gt]=null,w[Gt].disconnect(_t))}for(let tt=0;tt<Z.added.length;tt++){const _t=Z.added[tt];let Gt=T.indexOf(_t);if(Gt===-1){for(let Vt=0;Vt<w.length;Vt++)if(Vt>=T.length){T.push(_t),Gt=Vt;break}else if(T[Vt]===null){T[Vt]=_t,Gt=Vt;break}if(Gt===-1)break}const bt=w[Gt];bt&&bt.connect(_t)}}const q=new I,j=new I;function nt(Z,tt,_t){q.setFromMatrixPosition(tt.matrixWorld),j.setFromMatrixPosition(_t.matrixWorld);const Gt=q.distanceTo(j),bt=tt.projectionMatrix.elements,Vt=_t.projectionMatrix.elements,ge=bt[14]/(bt[10]-1),et=bt[14]/(bt[10]+1),at=(bt[9]+1)/bt[5],ot=(bt[9]-1)/bt[5],lt=(bt[8]-1)/bt[0],ft=(Vt[8]+1)/Vt[0],kt=ge*lt,zt=ge*ft,Wt=Gt/(-lt+ft),qt=Wt*-lt;if(tt.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(qt),Z.translateZ(Wt),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),bt[10]===-1)Z.projectionMatrix.copy(tt.projectionMatrix),Z.projectionMatrixInverse.copy(tt.projectionMatrixInverse);else{const D=ge+Wt,fe=et+Wt,te=kt-qt,R=zt+(Gt-qt),x=at*et/fe*D,z=ot*et/fe*D;Z.projectionMatrix.makePerspective(te,R,x,z,D,fe),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function It(Z,tt){tt===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(tt.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(i===null)return;let tt=Z.near,_t=Z.far;m.texture!==null&&(m.depthNear>0&&(tt=m.depthNear),m.depthFar>0&&(_t=m.depthFar)),B.near=L.near=P.near=tt,B.far=L.far=P.far=_t,(U!==B.near||k!==B.far)&&(i.updateRenderState({depthNear:B.near,depthFar:B.far}),U=B.near,k=B.far),B.layers.mask=Z.layers.mask|6,P.layers.mask=B.layers.mask&-5,L.layers.mask=B.layers.mask&-3;const Gt=Z.parent,bt=B.cameras;It(B,Gt);for(let Vt=0;Vt<bt.length;Vt++)It(bt[Vt],Gt);bt.length===2?nt(B,P,L):B.projectionMatrix.copy(P.projectionMatrix),A===null&&Z.isPerspectiveCamera&&(A={camera:Z,fov:Z.fov,zoom:Z.zoom}),Tt(Z,B,Gt)};function Tt(Z,tt,_t){_t===null?Z.matrix.copy(tt.matrixWorld):(Z.matrix.copy(_t.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(tt.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(tt.projectionMatrix),Z.projectionMatrixInverse.copy(tt.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Xl*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function(Z){l=Z,u!==null&&(u.fixedFoveation=Z),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Z)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(B)},this.getCameraTexture=function(Z){return p[Z]};let ue=null;function jt(Z,tt){if(h=tt.getViewerPose(c||a),g=tt,h!==null){const _t=h.views;d!==null&&(t.setRenderTargetFramebuffer(y,d.framebuffer),t.setRenderTarget(y));let Gt=!1;_t.length!==B.cameras.length&&(B.cameras.length=0,Gt=!0);for(let et=0;et<_t.length;et++){const at=_t[et];let ot=null;if(d!==null)ot=d.getViewport(at);else{const ft=f.getViewSubImage(u,at);ot=ft.viewport,et===0&&(t.setRenderTargetTextures(y,ft.colorTexture,ft.depthStencilTexture),t.setRenderTarget(y))}let lt=N[et];lt===void 0&&(lt=new on,lt.layers.enable(et),lt.viewport=new Te,N[et]=lt),lt.matrix.fromArray(at.transform.matrix),lt.matrix.decompose(lt.position,lt.quaternion,lt.scale),lt.projectionMatrix.fromArray(at.projectionMatrix),lt.projectionMatrixInverse.copy(lt.projectionMatrix).invert(),lt.viewport.set(ot.x,ot.y,ot.width,ot.height),et===0&&(B.matrix.copy(lt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Gt===!0&&B.cameras.push(lt)}const bt=i.enabledFeatures;if(bt&&bt.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&v){f=n.getBinding();const et=f.getDepthInformation(_t[0]);et&&et.isValid&&et.texture&&m.init(et,i.renderState)}if(bt&&bt.includes("camera-access")&&v){t.state.unbindTexture(),f=n.getBinding();for(let et=0;et<_t.length;et++){const at=_t[et].camera;if(at){let ot=p[at];ot||(ot=new pf,p[at]=ot);const lt=f.getCameraImage(at);ot.sourceTexture=lt}}}}for(let _t=0;_t<w.length;_t++){const Gt=T[_t],bt=w[_t];Gt!==null&&bt!==void 0&&bt.update(Gt,tt,c||a)}ue&&ue(Z,tt),tt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:tt}),g=null}const ce=new Af;ce.setAnimationLoop(jt),this.setAnimationLoop=function(Z){ue=Z},this.dispose=function(){}}}const g_=new ie,Nf=new Yt;Nf.set(-1,0,0,0,1,0,0,0,1);function x_(s,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,wf(s)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function i(m,p,M,E,y){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,y)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),v(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,M,E):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===nn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===nn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const M=t.get(p),E=M.envMap,y=M.envMapRotation;E&&(m.envMap.value=E,m.envMapRotation.value.setFromMatrix4(g_.makeRotationFromEuler(y)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(Nf),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,M,E){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*M,m.scale.value=E*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,M){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===nn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.retroreflectivity>0&&(m.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=M.texture,m.transmissionSamplerSize.value.set(M.width,M.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function v(m,p){const M=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(M.matrixWorld),m.nearDistance.value=M.shadow.camera.near,m.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function v_(s,t,e,n){let i={},r={},a=[];const o=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,w){const T=w.program;n.uniformBlockBinding(y,T)}function c(y,w){let T=i[y.id];T===void 0&&(m(y),T=h(y),i[y.id]=T,y.addEventListener("dispose",M));const C=w.program;n.updateUBOMapping(y,C);const _=t.render.frame;r[y.id]!==_&&(u(y),r[y.id]=_)}function h(y){const w=f();y.__bindingPointIndex=w;const T=s.createBuffer(),C=y.__size,_=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,T),s.bufferData(s.UNIFORM_BUFFER,C,_),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,w,T),T}function f(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return le("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const w=i[y.id],T=y.uniforms,C=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,w);for(let _=0,A=T.length;_<A;_++){const P=T[_];if(Array.isArray(P))for(let L=0,N=P.length;L<N;L++)d(P[L],_,L,C);else d(P,_,0,C)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function d(y,w,T,C){if(v(y,w,T,C)===!0){const _=y.__offset,A=y.value;if(Array.isArray(A)){let P=0;for(let L=0;L<A.length;L++){const N=A[L],B=p(N);g(N,y.__data,P),typeof N!="number"&&typeof N!="boolean"&&!N.isMatrix3&&!ArrayBuffer.isView(N)&&(P+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(A,y.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,_,y.__data)}}function g(y,w,T){typeof y=="number"||typeof y=="boolean"?w[0]=y:y.isMatrix3?(w[0]=y.elements[0],w[1]=y.elements[1],w[2]=y.elements[2],w[3]=0,w[4]=y.elements[3],w[5]=y.elements[4],w[6]=y.elements[5],w[7]=0,w[8]=y.elements[6],w[9]=y.elements[7],w[10]=y.elements[8],w[11]=0):ArrayBuffer.isView(y)?w.set(new y.constructor(y.buffer,y.byteOffset,w.length)):y.toArray(w,T)}function v(y,w,T,C){const _=y.value,A=w+"_"+T;if(C[A]===void 0)return typeof _=="number"||typeof _=="boolean"?C[A]=_:ArrayBuffer.isView(_)?C[A]=_.slice():C[A]=_.clone(),!0;{const P=C[A];if(typeof _=="number"||typeof _=="boolean"){if(P!==_)return C[A]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(P.equals(_)===!1)return P.copy(_),!0}}return!1}function m(y){const w=y.uniforms;let T=0;const C=16;for(let A=0,P=w.length;A<P;A++){const L=Array.isArray(w[A])?w[A]:[w[A]];for(let N=0,B=L.length;N<B;N++){const U=L[N],k=Array.isArray(U.value)?U.value:[U.value];for(let K=0,W=k.length;K<W;K++){const rt=k[K],q=p(rt),j=T%C,nt=j%q.boundary,It=j+nt;T+=nt,It!==0&&C-It<q.storage&&(T+=C-It),U.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=T,T+=q.storage}}}const _=T%C;return _>0&&(T+=C-_),y.__size=T,y.__cache={},this}function p(y){const w={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(w.boundary=4,w.storage=4):y.isVector2?(w.boundary=8,w.storage=8):y.isVector3||y.isColor?(w.boundary=16,w.storage=12):y.isVector4?(w.boundary=16,w.storage=16):y.isMatrix3?(w.boundary=48,w.storage=48):y.isMatrix4?(w.boundary=64,w.storage=64):y.isTexture?Xt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(y)?(w.boundary=16,w.storage=y.byteLength):Xt("WebGLRenderer: Unsupported uniform value type.",y),w}function M(y){const w=y.target;w.removeEventListener("dispose",M);const T=a.indexOf(w.__bindingPointIndex);a.splice(T,1),s.deleteBuffer(i[w.id]),delete i[w.id],delete r[w.id]}function E(){for(const y in i)s.deleteBuffer(i[y]);a=[],i={},r={}}return{bind:l,update:c,dispose:E}}const __=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let On=null;function M_(){return On===null&&(On=new uf(__,16,16,Ki,$n),On.name="DFG_LUT",On.minFilter=Ye,On.magFilter=Ye,On.wrapS=si,On.wrapT=si,On.generateMipmaps=!1,On.needsUpdate=!0),On}class y_{constructor(t={}){const{canvas:e=rp(),context:n=null,depth:i=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=un}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=a;const v=d,m=new Set([mc,pc,dc]),p=new Set([un,qn,Pr,Lr,hc,uc]),M=new Uint32Array(4),E=new Int32Array(4),y=new I;let w=null,T=null;const C=[],_=[];let A=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Wn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let L=!1,N=null,B=null,U=null,k=null;this._outputColorSpace=qe;let K=0,W=0,rt=null,q=-1,j=null;const nt=new Te,It=new Te;let Tt=null;const ue=new Ft(0);let jt=0,ce=e.width,Z=e.height,tt=1,_t=null,Gt=null;const bt=new Te(0,0,ce,Z),Vt=new Te(0,0,ce,Z);let ge=!1;const et=new yc;let at=!1,ot=!1;const lt=new ie,ft=new I,kt=new Te,zt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Wt=!1;function qt(){return rt===null?tt:1}let D=n;function fe(b,F){return e.getContext(b,F)}let te,R,x,z,V,$,ht,ut,Y,Q,dt,Nt,xt,pt,Ut,Ht,Zt,O,mt,J,gt,St,it;try{const b={alpha:!0,depth:i,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${lc}`),e.addEventListener("webglcontextlost",be,!1),e.addEventListener("webglcontextrestored",de,!1),e.addEventListener("webglcontextcreationerror",wn,!1),D===null){const F="webgl2";if(D=fe(F,b),D===null)throw fe(F)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ot()}catch(b){throw e.removeEventListener("webglcontextlost",be,!1),e.removeEventListener("webglcontextrestored",de,!1),e.removeEventListener("webglcontextcreationerror",wn,!1),le("WebGLRenderer: "+b.message),b}function Ot(){te=new Mx(D),te.init(),gt=new u_(D,te),R=new hx(D,te,t,gt),x=new c_(D,te),R.reversedDepthBuffer&&u&&x.buffers.depth.setReversed(!0),B=D.createFramebuffer(),U=D.createFramebuffer(),k=D.createFramebuffer(),z=new bx(D),V=new Zv,$=new h_(D,te,x,V,R,gt,z),ht=new _x(P),ut=new Em(D),St=new lx(D,ut),Y=new yx(D,ut,z,St),Q=new Ex(D,Y,ut,St,z),O=new wx(D,R,$),Ut=new ux(V),dt=new Yv(P,ht,te,R,St,Ut),Nt=new x_(P,V),xt=new Jv,pt=new i_(te),Zt=new ox(P,ht,x,Q,g,l),Ht=new l_(P,Q,R),it=new v_(D,z,R,x),mt=new cx(D,te,z),J=new Sx(D,te,z),z.programs=dt.programs,P.capabilities=R,P.extensions=te,P.properties=V,P.renderLists=xt,P.shadowMap=Ht,P.state=x,P.info=z}v!==un&&(A=new Ax(v,e.width,e.height,o,i,r));const Pt=new m_(P,D);this.xr=Pt,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const b=te.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){const b=te.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return tt},this.setPixelRatio=function(b){b!==void 0&&(tt=b,this.setSize(ce,Z,!1))},this.getSize=function(b){return b.set(ce,Z)},this.setSize=function(b,F,X=!0){if(Pt.isPresenting){Xt("WebGLRenderer: Can't change size while VR device is presenting.");return}ce=b,Z=F,e.width=Math.floor(b*tt),e.height=Math.floor(F*tt),X===!0&&(e.style.width=b+"px",e.style.height=F+"px"),A!==null&&A.setSize(e.width,e.height),this.setViewport(0,0,b,F)},this.getDrawingBufferSize=function(b){return b.set(ce*tt,Z*tt).floor()},this.setDrawingBufferSize=function(b,F,X){ce=b,Z=F,tt=X,e.width=Math.floor(b*X),e.height=Math.floor(F*X),this.setViewport(0,0,b,F)},this.setEffects=function(b){if(v===un){le("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let F=0;F<b.length;F++)if(b[F].isOutputPass===!0){Xt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}A.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(nt)},this.getViewport=function(b){return b.copy(bt)},this.setViewport=function(b,F,X,H){b.isVector4?bt.set(b.x,b.y,b.z,b.w):bt.set(b,F,X,H),x.viewport(nt.copy(bt).multiplyScalar(tt).round())},this.getScissor=function(b){return b.copy(Vt)},this.setScissor=function(b,F,X,H){b.isVector4?Vt.set(b.x,b.y,b.z,b.w):Vt.set(b,F,X,H),x.scissor(It.copy(Vt).multiplyScalar(tt).round())},this.getScissorTest=function(){return ge},this.setScissorTest=function(b){x.setScissorTest(ge=b)},this.setOpaqueSort=function(b){_t=b},this.setTransparentSort=function(b){Gt=b},this.getClearColor=function(b){return b.copy(Zt.getClearColor())},this.setClearColor=function(){Zt.setClearColor(...arguments)},this.getClearAlpha=function(){return Zt.getClearAlpha()},this.setClearAlpha=function(){Zt.setClearAlpha(...arguments)},this.clear=function(b=!0,F=!0,X=!0){let H=0;if(b){let G=!1;if(rt!==null){const yt=rt.texture.format;G=m.has(yt)}if(G){const yt=rt.texture.type,Et=p.has(yt),Mt=Zt.getClearColor(),Rt=Zt.getClearAlpha(),Lt=Mt.r,Jt=Mt.g,ee=Mt.b;Et?(M[0]=Lt,M[1]=Jt,M[2]=ee,M[3]=Rt,D.clearBufferuiv(D.COLOR,0,M)):(E[0]=Lt,E[1]=Jt,E[2]=ee,E[3]=Rt,D.clearBufferiv(D.COLOR,0,E))}else H|=D.COLOR_BUFFER_BIT}F&&(H|=D.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(H|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&D.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),N=b},this.dispose=function(){e.removeEventListener("webglcontextlost",be,!1),e.removeEventListener("webglcontextrestored",de,!1),e.removeEventListener("webglcontextcreationerror",wn,!1),Zt.dispose(),xt.dispose(),pt.dispose(),V.dispose(),ht.dispose(),Q.dispose(),St.dispose(),it.dispose(),dt.dispose(),Pt.dispose(),Pt.removeEventListener("sessionstart",zc),Pt.removeEventListener("sessionend",Bc),Li.stop()};function be(b){b.preventDefault(),za("WebGLRenderer: Context Lost."),L=!0}function de(){za("WebGLRenderer: Context Restored."),L=!1;const b=z.autoReset,F=Ht.enabled,X=Ht.autoUpdate,H=Ht.needsUpdate,G=Ht.type;Ot(),z.autoReset=b,Ht.enabled=F,Ht.autoUpdate=X,Ht.needsUpdate=H,Ht.type=G}function wn(b){le("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Dn(b){const F=b.target;F.removeEventListener("dispose",Dn),$f(F)}function $f(b){Yf(b),V.remove(b)}function Yf(b){const F=V.get(b).programs;F!==void 0&&(F.forEach(function(X){dt.releaseProgram(X)}),b.isShaderMaterial&&dt.releaseShaderCache(b))}this.renderBufferDirect=function(b,F,X,H,G,yt){F===null&&(F=zt);const Et=G.isMesh&&G.matrixWorld.determinantAffine()<0,Mt=Jf(b,F,X,H,G);x.setMaterial(H,Et);let Rt=X.index,Lt=1;if(H.wireframe===!0){if(Rt=Y.getWireframeAttribute(X),Rt===void 0)return;Lt=2}const Jt=X.drawRange,ee=X.attributes.position;let Ct=Jt.start*Lt,pe=(Jt.start+Jt.count)*Lt;yt!==null&&(Ct=Math.max(Ct,yt.start*Lt),pe=Math.min(pe,(yt.start+yt.count)*Lt)),Rt!==null?(Ct=Math.max(Ct,0),pe=Math.min(pe,Rt.count)):ee!=null&&(Ct=Math.max(Ct,0),pe=Math.min(pe,ee.count));const Le=pe-Ct;if(Le<0||Le===1/0)return;St.setup(G,H,Mt,X,Rt);let Ee,Se=mt;if(Rt!==null&&(Ee=ut.get(Rt),Se=J,Se.setIndex(Ee)),G.isMesh)H.wireframe===!0?(x.setLineWidth(H.wireframeLinewidth*qt()),Se.setMode(D.LINES)):Se.setMode(D.TRIANGLES);else if(G.isLine){let Ve=H.linewidth;Ve===void 0&&(Ve=1),x.setLineWidth(Ve*qt()),G.isLineSegments?Se.setMode(D.LINES):G.isLineLoop?Se.setMode(D.LINE_LOOP):Se.setMode(D.LINE_STRIP)}else G.isPoints?Se.setMode(D.POINTS):G.isSprite&&Se.setMode(D.TRIANGLES);if(G.isBatchedMesh)if(te.get("WEBGL_multi_draw"))Se.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{const Ve=G._multiDrawStarts,wt=G._multiDrawCounts,Ke=G._multiDrawCount,he=Rt?ut.get(Rt).bytesPerElement:1,gn=V.get(H).currentProgram.getUniforms();for(let Nn=0;Nn<Ke;Nn++)gn.setValue(D,"_gl_DrawID",Nn),Se.render(Ve[Nn]/he,wt[Nn])}else if(G.isInstancedMesh)Se.renderInstances(Ct,Le,G.count);else if(X.isInstancedBufferGeometry){const Ve=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,wt=Math.min(X.instanceCount,Ve);Se.renderInstances(Ct,Le,wt)}else Se.render(Ct,Le)};function Oc(b,F,X,H){N!==null&&b.isNodeMaterial&&N.setObject(H,b),at===!0&&Ut.setState(b,X,!1),b.transparent===!0&&b.side===ii&&b.forceSinglePass===!1?(b.side=nn,b.needsUpdate=!0,Vr(b,F,H),b.side=Yi,b.needsUpdate=!0,Vr(b,F,H),b.side=ii):Vr(b,F,H)}this.compile=function(b,F,X=null){X===null&&(X=b),N!==null&&N.renderStart(b,F,X),T=pt.get(X),T.init(F),_.push(T),X.traverseVisible(function(G){G.isLight&&G.layers.test(F.layers)&&(T.pushLight(G),G.castShadow&&T.pushShadow(G))}),b!==X&&b.traverseVisible(function(G){G.isLight&&G.layers.test(F.layers)&&(T.pushLight(G),G.castShadow&&T.pushShadow(G))}),T.setupLights(),N!==null&&N.updateLights(T.state.lightsArray),ot=this.localClippingEnabled,at=Ut.init(this.clippingPlanes,ot),at===!0&&Ut.setGlobalState(this.clippingPlanes,F),N!==null&&Ht.render(T.state.shadowsArray,X,F);const H=new Set;return b.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;const yt=G.material;if(yt)if(Array.isArray(yt))for(let Et=0;Et<yt.length;Et++){const Mt=yt[Et];Oc(Mt,X,F,G),H.add(Mt)}else Oc(yt,X,F,G),H.add(yt)}),T=_.pop(),N!==null&&N.renderEnd(),H},this.compileAsync=function(b,F,X=null){const H=this.compile(b,F,X);return new Promise(G=>{function yt(){if(H.forEach(function(Et){const Rt=V.get(Et).currentProgram;(Rt===void 0||Rt.isReady())&&H.delete(Et)}),H.size===0){G(b);return}setTimeout(yt,10)}te.get("KHR_parallel_shader_compile")!==null?yt():setTimeout(yt,10)})};let no=null;function Zf(b){no&&no(b)}function zc(){Li.stop()}function Bc(){Li.start()}const Li=new Af;Li.setAnimationLoop(Zf),typeof self<"u"&&Li.setContext(self),this.setAnimationLoop=function(b){no=b,Pt.setAnimationLoop(b),b===null?Li.stop():Li.start()},Pt.addEventListener("sessionstart",zc),Pt.addEventListener("sessionend",Bc),this.render=function(b,F){if(F!==void 0&&F.isCamera!==!0){le("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;N!==null&&N.renderStart(b,F);const X=Pt.enabled===!0&&Pt.isPresenting===!0,H=A!==null&&(rt===null||X)&&A.begin(P,rt);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),Pt.enabled===!0&&Pt.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(Pt.cameraAutoUpdate===!0&&Pt.updateCamera(F),F=Pt.getCamera()),b.isScene===!0&&b.onBeforeRender(P,b,F,rt),T=pt.get(b,_.length),T.init(F),T.state.textureUnits=$.getTextureUnits(),_.push(T),lt.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),et.setFromProjectionMatrix(lt,Vn,F.reversedDepth),ot=this.localClippingEnabled,at=Ut.init(this.clippingPlanes,ot),w=xt.get(b,C.length),w.init(),C.push(w),Pt.enabled===!0&&Pt.isPresenting===!0){const Et=P.xr.getDepthSensingMesh();Et!==null&&io(Et,F,-1/0,P.sortObjects)}io(b,F,0,P.sortObjects),w.finish(),N!==null&&N.updateLights(T.state.lightsArray),P.sortObjects===!0&&w.sort(_t,Gt),Wt=Pt.enabled===!1||Pt.isPresenting===!1||Pt.hasDepthSensing()===!1,Wt&&Zt.addToRenderList(w,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),at===!0&&Ut.beginShadows();const G=T.state.shadowsArray;if(Ht.render(G,b,F),at===!0&&Ut.endShadows(),(H&&A.hasRenderPass())===!1){const Et=w.opaque,Mt=w.transmissive;if(T.setupLights(),F.isArrayCamera){const Rt=F.cameras;if(Mt.length>0)for(let Lt=0,Jt=Rt.length;Lt<Jt;Lt++){const ee=Rt[Lt];Hc(Et,Mt,b,ee)}Wt&&Zt.render(b);for(let Lt=0,Jt=Rt.length;Lt<Jt;Lt++){const ee=Rt[Lt];kc(w,b,ee,ee.viewport)}}else Mt.length>0&&Hc(Et,Mt,b,F),Wt&&Zt.render(b),kc(w,b,F)}rt!==null&&W===0&&($.updateMultisampleRenderTarget(rt),$.updateRenderTargetMipmap(rt)),H&&A.end(P),b.isScene===!0&&b.onAfterRender(P,b,F),St.resetDefaultState(),q=-1,j=null,_.pop(),_.length>0?(T=_[_.length-1],$.setTextureUnits(T.state.textureUnits),at===!0&&Ut.setGlobalState(P.clippingPlanes,T.state.camera)):T=null,C.pop(),C.length>0?w=C[C.length-1]:w=null,N!==null&&N.renderEnd()};function io(b,F,X,H){if(b.visible===!1)return;if(b.layers.test(F.layers)){if(b.isGroup)X=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(F);else if(b.isLightProbeGrid)T.pushLightProbeGrid(b);else if(b.isLight)T.pushLight(b),b.castShadow&&T.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum(et)){H&&kt.setFromMatrixPosition(b.matrixWorld).applyMatrix4(lt);const Et=Q.update(b),Mt=b.material;Mt.visible&&w.push(b,Et,Mt,X,kt.z,null,F)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum(et))){const Et=Q.update(b),Mt=b.material;if(H&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),kt.copy(b.boundingSphere.center)):(Et.boundingSphere===null&&Et.computeBoundingSphere(),kt.copy(Et.boundingSphere.center)),kt.applyMatrix4(b.matrixWorld).applyMatrix4(lt)),Array.isArray(Mt)){const Rt=Et.groups;for(let Lt=0,Jt=Rt.length;Lt<Jt;Lt++){const ee=Rt[Lt],Ct=Mt[ee.materialIndex];Ct&&Ct.visible&&w.push(b,Et,Ct,X,kt.z,ee,F)}}else Mt.visible&&w.push(b,Et,Mt,X,kt.z,null,F)}}const yt=b.children;for(let Et=0,Mt=yt.length;Et<Mt;Et++)io(yt[Et],F,X,H)}function kc(b,F,X,H){const{opaque:G,transmissive:yt,transparent:Et}=b;T.setupLightsView(X),at===!0&&Ut.setGlobalState(P.clippingPlanes,X),H&&x.viewport(nt.copy(H)),G.length>0&&Gr(G,F,X),yt.length>0&&Gr(yt,F,X),Et.length>0&&Gr(Et,F,X),x.buffers.depth.setTest(!0),x.buffers.depth.setMask(!0),x.buffers.color.setMask(!0),x.setPolygonOffset(!1)}function Hc(b,F,X,H){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[H.id]===void 0){const Ct=te.has("EXT_color_buffer_half_float")||te.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[H.id]=new Sn(1,1,{generateMipmaps:!0,type:Ct?$n:un,minFilter:Gi,samples:Math.max(4,R.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ae.workingColorSpace})}const yt=T.state.transmissionRenderTarget[H.id],Et=H.viewport||nt;yt.setSize(Et.z*P.transmissionResolutionScale,Et.w*P.transmissionResolutionScale);const Mt=P.getRenderTarget(),Rt=P.getActiveCubeFace(),Lt=P.getActiveMipmapLevel();P.setRenderTarget(yt),P.getClearColor(ue),jt=P.getClearAlpha(),jt<1&&P.setClearColor(16777215,.5),P.clear(),Wt&&Zt.render(X);const Jt=P.toneMapping;P.toneMapping=Wn;const ee=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),T.setupLightsView(H),at===!0&&Ut.setGlobalState(P.clippingPlanes,H),Gr(b,X,H),$.updateMultisampleRenderTarget(yt),$.updateRenderTargetMipmap(yt),te.has("WEBGL_multisampled_render_to_texture")===!1){let Ct=!1;for(let pe=0,Le=F.length;pe<Le;pe++){const Ee=F[pe],{object:Se,geometry:Ve,material:wt,group:Ke}=Ee;if(wt.side===ii&&Se.layers.test(H.layers)){const he=wt.side;wt.side=nn,wt.needsUpdate=!0,Gc(Se,X,H,Ve,wt,Ke),wt.side=he,wt.needsUpdate=!0,Ct=!0}}Ct===!0&&($.updateMultisampleRenderTarget(yt),$.updateRenderTargetMipmap(yt))}P.setRenderTarget(Mt,Rt,Lt),P.setClearColor(ue,jt),ee!==void 0&&(H.viewport=ee),P.toneMapping=Jt}function Gr(b,F,X){const H=F.isScene===!0?F.overrideMaterial:null;for(let G=0,yt=b.length;G<yt;G++){const Et=b[G],{object:Mt,geometry:Rt,group:Lt}=Et;let Jt=Et.material;Jt.allowOverride===!0&&H!==null&&(Jt=H),Mt.layers.test(X.layers)&&Gc(Mt,F,X,Rt,Jt,Lt)}}function Gc(b,F,X,H,G,yt){N!==null&&G.isNodeMaterial&&N.setObject(b,G),b.onBeforeRender(P,F,X,H,G,yt),b.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),G.onBeforeRender(P,F,X,H,b,yt),G.transparent===!0&&G.side===ii&&G.forceSinglePass===!1?(G.side=nn,G.needsUpdate=!0,P.renderBufferDirect(X,F,H,G,b,yt),G.side=Yi,G.needsUpdate=!0,P.renderBufferDirect(X,F,H,G,b,yt),G.side=ii):P.renderBufferDirect(X,F,H,G,b,yt),b.onAfterRender(P,F,X,H,G,yt)}function Vr(b,F,X){F.isScene!==!0&&(F=zt);const H=V.get(b),G=T.state.lights,yt=T.state.shadowsArray,Et=G.state.version,Mt=dt.getParameters(b,G.state,yt,F,X,T.state.lightProbeGridArray),Rt=dt.getProgramCacheKey(Mt);let Lt=H.programs;H.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?F.environment:null,H.fog=F.fog;const Jt=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;H.envMap=ht.get(b.envMap||H.environment,Jt),H.envMapRotation=H.environment!==null&&b.envMap===null?F.environmentRotation:b.envMapRotation,Lt===void 0&&(b.addEventListener("dispose",Dn),Lt=new Map,H.programs=Lt);let ee=Lt.get(Rt);if(ee!==void 0){if(H.currentProgram===ee&&H.lightsStateVersion===Et)return Wc(b,Mt),ee}else Mt.uniforms=dt.getUniforms(b),N!==null&&b.isNodeMaterial&&N.build(b,X,Mt),b.onBeforeCompile(Mt,P),ee=dt.acquireProgram(Mt,Rt),Lt.set(Rt,ee),H.uniforms=Mt.uniforms;const Ct=H.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ct.clippingPlanes=Ut.uniform),Wc(b,Mt),H.needsLights=jf(b),H.lightsStateVersion=Et,H.needsLights&&(Ct.ambientLightColor.value=G.state.ambient,Ct.lightProbe.value=G.state.probe,Ct.sunLights.value=G.state.sun,Ct.sunLightShadows.value=G.state.sunShadow,Ct.directionalLights.value=G.state.directional,Ct.directionalLightShadows.value=G.state.directionalShadow,Ct.spotLights.value=G.state.spot,Ct.spotLightShadows.value=G.state.spotShadow,Ct.rectAreaLights.value=G.state.rectArea,Ct.ltc_1.value=G.state.rectAreaLTC1,Ct.ltc_2.value=G.state.rectAreaLTC2,Ct.pointLights.value=G.state.point,Ct.pointLightShadows.value=G.state.pointShadow,Ct.hemisphereLights.value=G.state.hemi,Ct.sunShadowMatrix.value=G.state.sunShadowMatrix,Ct.sunShadowCascade.value=G.state.sunShadowCascade,Ct.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ct.spotLightMatrix.value=G.state.spotLightMatrix,Ct.spotLightMap.value=G.state.spotLightMap,Ct.pointShadowMatrix.value=G.state.pointShadowMatrix),H.lightProbeGrid=T.state.lightProbeGridArray.length>0,H.currentProgram=ee,H.uniformsList=null,ee}function Vc(b){if(b.uniformsList===null){const F=b.currentProgram.getUniforms();b.uniformsList=Aa.seqWithValue(F.seq,b.uniforms)}return b.uniformsList}function Wc(b,F){const X=V.get(b);X.outputColorSpace=F.outputColorSpace,X.batching=F.batching,X.batchingColor=F.batchingColor,X.instancing=F.instancing,X.instancingColor=F.instancingColor,X.instancingMorph=F.instancingMorph,X.skinning=F.skinning,X.morphTargets=F.morphTargets,X.morphNormals=F.morphNormals,X.morphColors=F.morphColors,X.morphTargetsCount=F.morphTargetsCount,X.numClippingPlanes=F.numClippingPlanes,X.numIntersection=F.numClipIntersection,X.vertexAlphas=F.vertexAlphas,X.vertexTangents=F.vertexTangents,X.toneMapping=F.toneMapping}function Kf(b,F){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;y.setFromMatrixPosition(F.matrixWorld);for(let X=0,H=b.length;X<H;X++){const G=b[X];if(G.texture!==null&&G.boundingBox.containsPoint(y))return G}return null}function Jf(b,F,X,H,G){F.isScene!==!0&&(F=zt),$.resetTextureUnits();const yt=F.fog,Et=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?F.environment:null,Mt=rt===null?P.outputColorSpace:rt.isXRRenderTarget===!0?rt.texture.colorSpace:ae.workingColorSpace,Rt=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,Lt=ht.get(H.envMap||Et,Rt),Jt=H.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,ee=!!X.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ct=!!X.morphAttributes.position,pe=!!X.morphAttributes.normal,Le=!!X.morphAttributes.color;let Ee=Wn;H.toneMapped&&(rt===null||rt.isXRRenderTarget===!0)&&(Ee=P.toneMapping);const Se=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Ve=Se!==void 0?Se.length:0,wt=V.get(H),Ke=T.state.lights;if(at===!0&&(ot===!0||b!==j)){const we=b===j&&H.id===q;Ut.setState(H,b,we)}let he=!1;H.version===wt.__version?(wt.needsLights&&wt.lightsStateVersion!==Ke.state.version||wt.outputColorSpace!==Mt||G.isBatchedMesh&&wt.batching===!1||!G.isBatchedMesh&&wt.batching===!0||G.isBatchedMesh&&wt.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&wt.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&wt.instancing===!1||!G.isInstancedMesh&&wt.instancing===!0||G.isSkinnedMesh&&wt.skinning===!1||!G.isSkinnedMesh&&wt.skinning===!0||G.isInstancedMesh&&wt.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&wt.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&wt.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&wt.instancingMorph===!1&&G.morphTexture!==null||wt.envMap!==Lt||H.fog===!0&&wt.fog!==yt||wt.numClippingPlanes!==void 0&&(wt.numClippingPlanes!==Ut.numPlanes||wt.numIntersection!==Ut.numIntersection)||wt.vertexAlphas!==Jt||wt.vertexTangents!==ee||wt.morphTargets!==Ct||wt.morphNormals!==pe||wt.morphColors!==Le||wt.toneMapping!==Ee||wt.morphTargetsCount!==Ve||!!wt.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(he=!0):(he=!0,wt.__version=H.version);let gn=wt.currentProgram;he===!0&&(gn=Vr(H,F,G),N&&H.isNodeMaterial&&N.onUpdateProgram(H,gn,wt));let Nn=!1,fi=!1,es=!1;const _e=gn.getUniforms(),Re=wt.uniforms;if(x.useProgram(gn.program)&&(Nn=!0,fi=!0,es=!0),H.id!==q&&(q=H.id,fi=!0),wt.needsLights){const we=Kf(T.state.lightProbeGridArray,G);wt.lightProbeGrid!==we&&(wt.lightProbeGrid=we,fi=!0)}if(Nn||j!==b){x.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),_e.setValue(D,"projectionMatrix",b.projectionMatrix),_e.setValue(D,"viewMatrix",b.matrixWorldInverse);const pi=_e.map.cameraPosition;pi!==void 0&&pi.setValue(D,ft.setFromMatrixPosition(b.matrixWorld)),R.logarithmicDepthBuffer&&_e.setValue(D,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&_e.setValue(D,"isOrthographic",b.isOrthographicCamera===!0),j!==b&&(j=b,fi=!0,es=!0)}if(wt.needsLights&&(Ke.state.sunShadowMap.length>0&&_e.setValue(D,"sunShadowMap",Ke.state.sunShadowMap,$),Ke.state.directionalShadowMap.length>0&&_e.setValue(D,"directionalShadowMap",Ke.state.directionalShadowMap,$),Ke.state.spotShadowMap.length>0&&_e.setValue(D,"spotShadowMap",Ke.state.spotShadowMap,$),Ke.state.pointShadowMap.length>0&&_e.setValue(D,"pointShadowMap",Ke.state.pointShadowMap,$)),G.isSkinnedMesh){_e.setOptional(D,G,"bindMatrix"),_e.setOptional(D,G,"bindMatrixInverse");const we=G.skeleton;we&&(we.boneTexture===null&&we.computeBoneTexture(),_e.setValue(D,"boneTexture",we.boneTexture,$))}G.isBatchedMesh&&(_e.setOptional(D,G,"batchingTexture"),_e.setValue(D,"batchingTexture",G._matricesTexture,$),_e.setOptional(D,G,"batchingIdTexture"),_e.setValue(D,"batchingIdTexture",G._indirectTexture,$),_e.setOptional(D,G,"batchingColorTexture"),G._colorsTexture!==null&&_e.setValue(D,"batchingColorTexture",G._colorsTexture,$));const di=X.morphAttributes;if((di.position!==void 0||di.normal!==void 0||di.color!==void 0)&&O.update(G,X,gn),(fi||wt.receiveShadow!==G.receiveShadow)&&(wt.receiveShadow=G.receiveShadow,_e.setValue(D,"receiveShadow",G.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&F.environment!==null&&(Re.envMapIntensity.value=F.environmentIntensity),Re.dfgLUT!==void 0&&(Re.dfgLUT.value=M_()),fi){if(_e.setValue(D,"toneMappingExposure",P.toneMappingExposure),wt.needsLights&&Qf(Re,es),yt&&H.fog===!0&&Nt.refreshFogUniforms(Re,yt),Nt.refreshMaterialUniforms(Re,H,tt,Z,T.state.transmissionRenderTarget[b.id]),wt.needsLights&&wt.lightProbeGrid){const we=wt.lightProbeGrid;Re.probesSH.value=we.texture,Re.probesMin.value.copy(we.boundingBox.min),Re.probesMax.value.copy(we.boundingBox.max),Re.probesResolution.value.copy(we.resolution)}Aa.upload(D,Vc(wt),Re,$)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(Aa.upload(D,Vc(wt),Re,$),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&_e.setValue(D,"center",G.center),_e.setValue(D,"modelViewMatrix",G.modelViewMatrix),_e.setValue(D,"normalMatrix",G.normalMatrix),_e.setValue(D,"modelMatrix",G.matrixWorld),H.uniformsGroups!==void 0){const we=H.uniformsGroups;for(let pi=0,ns=we.length;pi<ns;pi++){const qc=we[pi];it.update(qc,gn),it.bind(qc,gn)}}return gn}function Qf(b,F){b.ambientLightColor.needsUpdate=F,b.lightProbe.needsUpdate=F,b.sunLights.needsUpdate=F,b.sunLightShadows.needsUpdate=F,b.directionalLights.needsUpdate=F,b.directionalLightShadows.needsUpdate=F,b.pointLights.needsUpdate=F,b.pointLightShadows.needsUpdate=F,b.spotLights.needsUpdate=F,b.spotLightShadows.needsUpdate=F,b.rectAreaLights.needsUpdate=F,b.hemisphereLights.needsUpdate=F}function jf(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return K},this.getActiveMipmapLevel=function(){return W},this.getRenderTarget=function(){return rt},this.setRenderTargetTextures=function(b,F,X){const H=V.get(b);H.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),V.get(b.texture).__webglTexture=F,V.get(b.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:X,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,F){const X=V.get(b);X.__webglFramebuffer=F,X.__useDefaultFramebuffer=F===void 0},this.setRenderTarget=function(b,F=0,X=0){rt=b,K=F,W=X;let H=null,G=!1,yt=!1;if(b){const Mt=V.get(b);if(Mt.__useDefaultFramebuffer!==void 0){x.bindFramebuffer(D.FRAMEBUFFER,Mt.__webglFramebuffer),nt.copy(b.viewport),It.copy(b.scissor),Tt=b.scissorTest,x.viewport(nt),x.scissor(It),x.setScissorTest(Tt),q=-1;return}else if(Mt.__webglFramebuffer===void 0)$.setupRenderTarget(b);else if(Mt.__hasExternalTextures)$.rebindTextures(b,V.get(b.texture).__webglTexture,V.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){const Jt=b.depthTexture;if(Mt.__boundDepthTexture!==Jt){if(Jt!==null&&V.has(Jt)&&(b.width!==Jt.image.width||b.height!==Jt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");$.setupDepthRenderbuffer(b)}}const Rt=b.texture;(Rt.isData3DTexture||Rt.isDataArrayTexture||Rt.isCompressedArrayTexture)&&(yt=!0);const Lt=V.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Lt[F])?H=Lt[F][X]:H=Lt[F],G=!0):b.samples>0&&$.useMultisampledRTT(b)===!1?H=V.get(b).__webglMultisampledFramebuffer:Array.isArray(Lt)?H=Lt[X]:H=Lt,nt.copy(b.viewport),It.copy(b.scissor),Tt=b.scissorTest}else nt.copy(bt).multiplyScalar(tt).floor(),It.copy(Vt).multiplyScalar(tt).floor(),Tt=ge;if(X!==0&&(H=B),x.bindFramebuffer(D.FRAMEBUFFER,H)&&x.drawBuffers(b,H),x.viewport(nt),x.scissor(It),x.setScissorTest(Tt),G){const Mt=V.get(b.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+F,Mt.__webglTexture,X)}else if(yt){const Mt=F;for(let Rt=0;Rt<b.textures.length;Rt++){const Lt=V.get(b.textures[Rt]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+Rt,Lt.__webglTexture,X,Mt)}}else if(b!==null&&X!==0){const Mt=V.get(b.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Mt.__webglTexture,X)}q=-1};function Xc(b){const F=V.get(b);return(F.__readFormat!==b.format||F.__readType!==b.type)&&(F.__readFormat=b.format,F.__readType=b.type,F.__formatReadable=R.textureFormatReadable(b.format),F.__typeReadable=R.textureTypeReadable(b.type)),F}this.readRenderTargetPixels=function(b,F,X,H,G,yt,Et,Mt=0){if(!(b&&b.isWebGLRenderTarget)){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Rt=V.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Et!==void 0&&(Rt=Rt[Et]),Rt){x.bindFramebuffer(D.FRAMEBUFFER,Rt);try{const Lt=b.textures[Mt],Jt=Lt.format,ee=Lt.type;b.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+Mt);const Ct=Xc(Lt);if(Ct.__formatReadable===!1){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ct.__typeReadable===!1){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=b.width-H&&X>=0&&X<=b.height-G&&D.readPixels(F,X,H,G,gt.convert(Jt),gt.convert(ee),yt)}finally{const Lt=rt!==null?V.get(rt).__webglFramebuffer:null;x.bindFramebuffer(D.FRAMEBUFFER,Lt)}}},this.readRenderTargetPixelsAsync=async function(b,F,X,H,G,yt,Et,Mt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Rt=V.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Et!==void 0&&(Rt=Rt[Et]),Rt)if(F>=0&&F<=b.width-H&&X>=0&&X<=b.height-G){x.bindFramebuffer(D.FRAMEBUFFER,Rt);const Lt=b.textures[Mt],Jt=Lt.format,ee=Lt.type;b.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+Mt);const Ct=Xc(Lt);if(Ct.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ct.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const pe=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,pe),D.bufferData(D.PIXEL_PACK_BUFFER,yt.byteLength,D.STREAM_READ),D.readPixels(F,X,H,G,gt.convert(Jt),gt.convert(ee),0),D.bindBuffer(D.PIXEL_PACK_BUFFER,null);const Le=rt!==null?V.get(rt).__webglFramebuffer:null;x.bindFramebuffer(D.FRAMEBUFFER,Le);const Ee=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await ap(D,Ee,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,pe),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,yt),D.bindBuffer(D.PIXEL_PACK_BUFFER,null),D.deleteBuffer(pe),D.deleteSync(Ee),yt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,F=null,X=0){const H=Math.pow(2,-X),G=Math.floor(b.image.width*H),yt=Math.floor(b.image.height*H),Et=F!==null?F.x:0,Mt=F!==null?F.y:0;$.setTexture2D(b,0),D.copyTexSubImage2D(D.TEXTURE_2D,X,0,0,Et,Mt,G,yt),x.unbindTexture()},this.copyTextureToTexture=function(b,F,X=null,H=null,G=0,yt=0){let Et,Mt,Rt,Lt,Jt,ee,Ct,pe,Le;const Ee=b.isCompressedTexture?b.mipmaps[yt]:b.image;if(X!==null)Et=X.max.x-X.min.x,Mt=X.max.y-X.min.y,Rt=X.isBox3?X.max.z-X.min.z:1,Lt=X.min.x,Jt=X.min.y,ee=X.isBox3?X.min.z:0;else{const Re=Math.pow(2,-G);Et=Math.floor(Ee.width*Re),Mt=Math.floor(Ee.height*Re),b.isDataArrayTexture?Rt=Ee.depth:b.isData3DTexture?Rt=Math.floor(Ee.depth*Re):Rt=1,Lt=0,Jt=0,ee=0}H!==null?(Ct=H.x,pe=H.y,Le=H.z):(Ct=0,pe=0,Le=0);const Se=gt.convert(F.format),Ve=gt.convert(F.type);let wt;F.isData3DTexture?($.setTexture3D(F,0),wt=D.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?($.setTexture2DArray(F,0),wt=D.TEXTURE_2D_ARRAY):($.setTexture2D(F,0),wt=D.TEXTURE_2D),x.activeTexture(D.TEXTURE0),x.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,F.flipY),x.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),x.pixelStorei(D.UNPACK_ALIGNMENT,F.unpackAlignment);const Ke=x.getParameter(D.UNPACK_ROW_LENGTH),he=x.getParameter(D.UNPACK_IMAGE_HEIGHT),gn=x.getParameter(D.UNPACK_SKIP_PIXELS),Nn=x.getParameter(D.UNPACK_SKIP_ROWS),fi=x.getParameter(D.UNPACK_SKIP_IMAGES);x.pixelStorei(D.UNPACK_ROW_LENGTH,Ee.width),x.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Ee.height),x.pixelStorei(D.UNPACK_SKIP_PIXELS,Lt),x.pixelStorei(D.UNPACK_SKIP_ROWS,Jt),x.pixelStorei(D.UNPACK_SKIP_IMAGES,ee);const es=b.isDataArrayTexture||b.isData3DTexture,_e=F.isDataArrayTexture||F.isData3DTexture;if(b.isDepthTexture){const Re=V.get(b),di=V.get(F),we=V.get(Re.__renderTarget),pi=V.get(di.__renderTarget);x.bindFramebuffer(D.READ_FRAMEBUFFER,we.__webglFramebuffer),x.bindFramebuffer(D.DRAW_FRAMEBUFFER,pi.__webglFramebuffer);for(let ns=0;ns<Rt;ns++)es&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,V.get(b).__webglTexture,G,ee+ns),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,V.get(F).__webglTexture,yt,Le+ns)),D.blitFramebuffer(Lt,Jt,Et,Mt,Ct,pe,Et,Mt,D.DEPTH_BUFFER_BIT,D.NEAREST);x.bindFramebuffer(D.READ_FRAMEBUFFER,null),x.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(G!==0||b.isRenderTargetTexture||V.has(b)){const Re=V.get(b),di=V.get(F);x.bindFramebuffer(D.READ_FRAMEBUFFER,U),x.bindFramebuffer(D.DRAW_FRAMEBUFFER,k);for(let we=0;we<Rt;we++)es?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Re.__webglTexture,G,ee+we):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Re.__webglTexture,G),_e?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,di.__webglTexture,yt,Le+we):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,di.__webglTexture,yt),G!==0?D.blitFramebuffer(Lt,Jt,Et,Mt,Ct,pe,Et,Mt,D.COLOR_BUFFER_BIT,D.NEAREST):_e?D.copyTexSubImage3D(wt,yt,Ct,pe,Le+we,Lt,Jt,Et,Mt):D.copyTexSubImage2D(wt,yt,Ct,pe,Lt,Jt,Et,Mt);x.bindFramebuffer(D.READ_FRAMEBUFFER,null),x.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else _e?b.isDataTexture||b.isData3DTexture?D.texSubImage3D(wt,yt,Ct,pe,Le,Et,Mt,Rt,Se,Ve,Ee.data):F.isCompressedArrayTexture?D.compressedTexSubImage3D(wt,yt,Ct,pe,Le,Et,Mt,Rt,Se,Ee.data):D.texSubImage3D(wt,yt,Ct,pe,Le,Et,Mt,Rt,Se,Ve,Ee):b.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,yt,Ct,pe,Et,Mt,Se,Ve,Ee.data):b.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,yt,Ct,pe,Ee.width,Ee.height,Se,Ee.data):D.texSubImage2D(D.TEXTURE_2D,yt,Ct,pe,Et,Mt,Se,Ve,Ee);x.pixelStorei(D.UNPACK_ROW_LENGTH,Ke),x.pixelStorei(D.UNPACK_IMAGE_HEIGHT,he),x.pixelStorei(D.UNPACK_SKIP_PIXELS,gn),x.pixelStorei(D.UNPACK_SKIP_ROWS,Nn),x.pixelStorei(D.UNPACK_SKIP_IMAGES,fi),yt===0&&F.generateMipmaps&&D.generateMipmap(wt),x.unbindTexture()},this.initRenderTarget=function(b){V.get(b).__webglFramebuffer===void 0&&$.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?$.setTextureCube(b,0):b.isData3DTexture?$.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?$.setTexture2DArray(b,0):$.setTexture2D(b,0),x.unbindTexture()},this.resetState=function(){K=0,W=0,rt=null,x.reset(),St.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Vn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=ae._getDrawingBufferColorSpace(t),e.unpackColorSpace=ae._getUnpackColorSpace()}}const Cc=(s=0,t=0,e=0)=>({x:s,y:t,z:e}),Pe=(s,t,e)=>s<t?t:s>e?e:s,er=(s,t,e)=>s+(t-s)*e,Dt=(s,t)=>Math.sqrt(s*s+t*t);function Pi(s,t){let e=(t-s)%(Math.PI*2);return e>Math.PI&&(e-=Math.PI*2),e<-Math.PI&&(e+=Math.PI*2),e}function eo(s,t,e,n,i,r){const a=i-e,o=r-n,l=a*a+o*o;let c=l>0?((s-e)*a+(t-n)*o)/l:0;c=Pe(c,0,1);const h=e+a*c,f=n+o*c;return{d:Dt(s-h,t-f),t:c,cx:h,cz:f}}function Ql(s,t,e){const n=e.x-t.x,i=e.y-t.y,r=e.z-t.z,a=n*n+i*i+r*r;let o=a>0?((s.x-t.x)*n+(s.y-t.y)*i+(s.z-t.z)*r)/a:0;o=Pe(o,0,1);const l=t.x+n*o,c=t.y+i*o,h=t.z+r*o,f=s.x-l,u=s.y-c,d=s.z-h;return{d:Math.sqrt(f*f+u*u+d*d),nx:f,ny:u,nz:d,t:o}}class mr{constructor(t){S(this,"s");this.s=t>>>0||1}next(){let t=this.s=this.s+1831565813>>>0;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return Math.floor(this.range(t,e+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}shuffle(t){for(let e=t.length-1;e>0;e--){const n=Math.floor(this.next()*(e+1));[t[e],t[n]]=[t[n],t[e]]}return t}}const $e=.45,Pc=1.5,jl=26,S_=6.6,b_=52,Xo=17,w_=9.4,E_=13.8,T_=.12,A_=.14,cu=15.5,R_=.22,Uf=2.4,C_=-7;class hu{constructor(t,e,n,i){S(this,"id");S(this,"name");S(this,"isPlayer");S(this,"look");S(this,"alive",!0);S(this,"falling",!1);S(this,"gone",!1);S(this,"x",0);S(this,"y",0);S(this,"z",0);S(this,"vx",0);S(this,"vy",0);S(this,"vz",0);S(this,"yaw",0);S(this,"grounded",!0);S(this,"airTime",0);S(this,"coyote",0);S(this,"jumpBuf",0);S(this,"jumpWas",!1);S(this,"dashT",0);S(this,"dashCd",0);S(this,"stun",0);S(this,"spin",0);S(this,"power",null);S(this,"powerT",0);S(this,"padCd",0);S(this,"hitCd",0);S(this,"lastHitBy",-1);S(this,"lastHitT",-99);S(this,"hitSource","");S(this,"srcT",-99);S(this,"place",0);S(this,"outAt",0);S(this,"coins",0);S(this,"kos",0);S(this,"dodges",0);S(this,"dashHits",0);S(this,"pickups",0);S(this,"dashes",0);S(this,"ctl",{mx:0,mz:0,jump:!1,dash:!1});S(this,"runPhase",Math.random()*6);S(this,"landT",0);S(this,"speedNow",0);S(this,"lookX",NaN);S(this,"lookZ",NaN);S(this,"mood","");S(this,"moodT",0);this.id=t,this.name=e,this.isPlayer=n,this.look=i}get mass(){return this.power==="heavy"?4:1}get speedMul(){return this.power==="speed"?1.45:this.power==="heavy"?.9:1}place0(t,e,n){this.x=t,this.y=0,this.z=e,this.vx=this.vy=this.vz=0,this.yaw=n,this.grounded=!0}step(t,e,n){if(this.gone)return;this.dashCd=Math.max(0,this.dashCd-t),this.padCd=Math.max(0,this.padCd-t),this.hitCd=Math.max(0,this.hitCd-t),this.landT=Math.max(0,this.landT-t),this.powerT>0&&(this.powerT-=t,this.powerT<=0&&(this.power=null,n("powerEnd",this)));const i=this.ctl,r=this.stun>0;r?(this.stun-=t,this.spin+=t*9):this.spin=0;const a=S_*this.speedMul;let o=i.mx,l=i.mz;const c=Dt(o,l);c>1&&(o/=c,l/=c),(this.falling||!this.alive)&&(o=l=0);const h=Dt(this.vx,this.vz);if(r||this.falling){const d=this.grounded?Math.exp(-5*t):Math.exp(-.25*t);this.vx*=d,this.vz*=d}else if(this.dashT>0)this.dashT-=t;else{const d=(this.grounded?b_:Xo)*(this.power==="speed"?1.3:1);if(h>a*1.05){const g=Math.exp(-(this.grounded?4.5:.6)*t);this.vx=this.vx*g+o*Xo*.6*t,this.vz=this.vz*g+l*Xo*.6*t}else{let g=o*a-this.vx,v=l*a-this.vz;const m=Dt(g,v),p=d*t;m>p&&(g*=p/m,v*=p/m),this.vx+=g,this.vz+=v}if(c>.1){const g=Math.atan2(o,l);this.yaw+=Pi(this.yaw,g)*Math.min(1,t*14)}}if(i.jump&&!this.jumpWas&&(this.jumpBuf=A_),this.jumpWas=i.jump,this.jumpBuf=Math.max(0,this.jumpBuf-t),this.coyote=this.grounded?T_:Math.max(0,this.coyote-t),this.jumpBuf>0&&this.coyote>0&&!r&&!this.falling&&this.alive&&(this.vy=this.power==="jump"?E_:w_,this.grounded=!1,this.coyote=0,this.jumpBuf=0,n("jump",this,this.power==="jump"?1:0)),i.dash&&this.dashCd<=0&&!r&&!this.falling&&this.alive){let d=o,g=l;Dt(d,g)<.2&&(d=Math.sin(this.yaw),g=Math.cos(this.yaw));const v=Dt(d,g);d/=v,g/=v,this.vx=d*cu*(this.power==="speed"?1.15:1),this.vz=g*cu*(this.power==="speed"?1.15:1),this.grounded?this.vy=3:this.vy=Math.max(this.vy,1.5),this.grounded=!1,this.yaw=Math.atan2(d,g),this.dashT=R_,this.dashCd=Uf,this.dashes++,n("dash",this)}i.dash=!1;let f=jl;this.dashT>0?f*=.35:!i.jump&&this.vy>2&&!r&&(f*=1.9),this.vy-=f*t,this.x+=this.vx*t,this.y+=this.vy*t,this.z+=this.vz*t;const u=this.falling?-1/0:e.groundAt(this.x,this.z);if(u>-1/0&&this.y<=u&&this.y>u-.7&&this.vy<=0?(this.grounded||this.airTime>.25&&(this.landT=.18,n("land",this,Pe(-this.vy/18,0,1))),this.y=u,this.vy=0,this.grounded=!0,this.airTime=0):(this.grounded&&this.y>u+.05&&(this.grounded=!1),u===-1/0&&(this.grounded=!1),this.grounded||(this.airTime+=t)),!this.grounded&&this.y<-.75&&!this.falling&&(this.falling=!0,n("slip",this)),this.falling){const d=e.tileAt(this.x,this.z);if(d&&d.state<=1&&this.y>-2.5){const g=this.x-d.x,v=this.z-d.z,m=Dt(g,v)||1;this.vx+=g/m*18*t,this.vz+=v/m*18*t}}this.speedNow=Dt(this.vx,this.vz),this.grounded?this.runPhase+=t*(2+this.speedNow*1.7):this.runPhase+=t*6,this.y<-32&&(this.gone=!0)}hit(t,e,n,i,r,a,o){if(!this.alive||this.falling)return!1;if(this.power==="shield")return this.power=null,this.powerT=0,this.vx=this.vx*.3+t*.3,this.vz=this.vz*.3+n*.3,this.hitCd=.4,!1;const l=this.power==="heavy"?.35:1;return this.vx=this.vx*.25+t*l,this.vz=this.vz*.25+n*l,this.vy=Math.max(this.vy,e*(l<1?.5:1)),this.grounded=!1,this.stun=Math.max(this.stun,i*(l<1?.4:1)),this.dashT=0,r>=0&&r!==this.id&&(this.lastHitBy=r,this.lastHitT=o),this.hitSource=a,this.srcT=o,!0}}const Xn=1.6,Lc=Math.sqrt(3),zn=Xn*Lc,tn=0,Rn=1,ci=2,tc=3,P_=0,Ns=1,ka=(s,t)=>({x:Xn*Lc*(s+t/2),z:Xn*1.5*t}),bi=(s,t)=>(Math.abs(s)+Math.abs(t)+Math.abs(s+t))/2,qo=(s,t)=>(s+512)*1024+(t+512),uu=.3,Ff=[];for(let s=0;s<6;s++)Ff.push([Math.cos(s*Math.PI/3)*uu,Math.sin(s*Math.PI/3)*uu]);class L_{constructor(){S(this,"tiles",[]);S(this,"map",new Map);S(this,"cx",0);S(this,"cz",0);S(this,"spread",10);S(this,"solid",0);S(this,"version",0)}add(t,e,n=P_){const i=qo(t,e),r=this.map.get(i);if(r)return r.kind=n,r;const{x:a,z:o}=ka(t,e),l={i:this.tiles.length,q:t,r:e,x:a,z:o,state:tn,t:0,y:0,vy:0,spin:0,prio:0,kind:n,tx:0,tz:0,occupied:!1,shade:0,depth:0};return this.tiles.push(l),this.map.set(i,l),l}at(t,e){return this.map.get(qo(t,e))}tileAt(t,e){const n=(Lc/3*t-e/3)/Xn,i=2/3*e/Xn,r=-n-i;let a=Math.round(n),o=Math.round(i);const l=Math.round(r),c=Math.abs(a-n),h=Math.abs(o-i),f=Math.abs(l-r);return c>h&&c>f?a=-o-l:h>f&&(o=-a-l),this.map.get(qo(a,o))}solidAt(t,e){const n=this.tileAt(t,e);return!!n&&n.state<=Rn}safeAt(t,e){const n=this.tileAt(t,e);return!!n&&n.state===tn}groundAt(t,e){if(this.solidAt(t,e))return 0;for(const[n,i]of Ff)if(this.solidAt(t+n,e+i))return 0;return-1/0}warn(t,e){t.state===tn&&(t.state=Rn,t.t=e,this.version++,this.depths())}drop(t){t.state>=ci||(t.state=ci,t.t=0,t.vy=0,t.spin=(Math.random()-.5)*2,this.version++,this.measure())}update(t){for(const e of this.tiles)e.state===Rn?(e.t-=t,e.t<=0&&this.drop(e)):e.state===ci&&(e.t+=t,e.vy-=30*t,e.y+=e.vy*t,e.y<-60&&(e.state=tc,this.version++))}measure(){this.depths();let t=0,e=0,n=0;for(const r of this.tiles)r.state<=Rn&&(t+=r.x,e+=r.z,n++);if(this.solid=n,!n)return;this.cx=t/n,this.cz=e/n;let i=0;for(const r of this.tiles)r.state<=Rn&&(i=Math.max(i,Dt(r.x-this.cx,r.z-this.cz)));this.spread=i+Xn}depths(){const t=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];let e=[];for(const i of this.tiles)if(i.depth=0,i.state===tn)for(const[r,a]of t){const o=this.at(i.q+r,i.r+a);if(!o||o.state!==tn){i.depth=1,e.push(i);break}}let n=1;for(;e.length;){const i=[];n++;for(const r of e)for(const[a,o]of t){const l=this.at(r.q+a,r.r+o);l&&l.state===tn&&l.depth===0&&(l.depth=n,i.push(l))}e=i}}depthAt(t,e){const n=this.tileAt(t,e);return n&&n.state===tn?n.depth:0}support(t,e,n){let i=0;for(let r=0;r<6;r++){const a=r*Math.PI/3+.5;this.safeAt(t+Math.cos(a)*n,e+Math.sin(a)*n)&&i++}return i}standing(){return this.tiles.filter(t=>t.state===tn)}spreadPick(t,e,n){const i=this.tiles.filter(a=>a.state===tn&&n(a)),r=[];if(!i.length)return r;for(r.push(e.pick(i));r.length<t&&r.length<i.length;){let a=null,o=-1;for(let l=0;l<14;l++){const c=e.pick(i);if(r.includes(c))continue;let h=1/0;for(const f of r)h=Math.min(h,Dt(c.x-f.x,c.z-f.z));h>o&&(o=h,a=c)}if(!a)break;r.push(a)}return r}}const Ai=Cc(),Ri=Cc(),kn=Cc();function I_(s,t,e){kn.x=s.x,kn.y=s.y+.45,kn.z=s.z;const n=Ql(kn,t,e);kn.y=s.y+1.05;const i=Ql(kn,t,e);return n.d<i.d?n:i}class $o{constructor(t,e,n,i,r){S(this,"kind","hammer");S(this,"px");S(this,"pz");S(this,"py",8.6);S(this,"L",7.3);S(this,"dx");S(this,"dz");S(this,"amp");S(this,"speed");S(this,"at");S(this,"ph",0);S(this,"theta");S(this,"dtheta",0);S(this,"headHalf",1.35);S(this,"headR",1);S(this,"state",0);S(this,"near",new Set);S(this,"hx",0);S(this,"hy",0);S(this,"hz",0);this.px=t,this.pz=e,this.dx=Math.cos(n),this.dz=Math.sin(n),this.amp=1.05,this.theta=this.amp,this.at=i,this.speed=r,this.head()}head(){const t=Math.sin(this.theta),e=Math.cos(this.theta);this.hx=this.px+this.dx*this.L*t,this.hy=this.py-this.L*e,this.hz=this.pz+this.dz*this.L*t}update(t,e){if(t.t<this.at-1.6)this.state=0,this.theta=this.amp,this.dtheta=0;else if(t.t<this.at)this.state!==1&&t.emit("warn",this.px,this.py,this.pz,0),this.state=1,this.theta=this.amp+Math.sin(t.t*45)*.025,this.dtheta=0;else{this.state!==2&&t.emit("release",this.hx,this.hy,this.hz),this.state=2;const n=this.speed*(1+t.intensity*.45);this.ph+=n*e;const i=this.theta;this.theta=this.amp*Math.cos(this.ph),this.dtheta=-this.amp*Math.sin(this.ph)*n,Math.sign(i)!==Math.sign(this.theta)&&t.emit("whoosh",this.hx,this.hy,this.hz)}this.head()}collide(t,e){if(Dt(t.x-this.hx,t.z-this.hz)>3.2||t.y>this.hy+1.6||t.y+Pc<this.hy-1.6){this.near.has(t.id)&&this.state===2&&(this.near.delete(t.id),e.dodge(t));return}const n=-this.dz,i=this.dx;Ai.x=this.hx-n*this.headHalf,Ai.y=this.hy,Ai.z=this.hz-i*this.headHalf,Ri.x=this.hx+n*this.headHalf,Ri.y=this.hy,Ri.z=this.hz+i*this.headHalf;const r=I_(t,Ai,Ri);if(r.d>this.headR+$e+1.2)return;if(r.d>this.headR+$e){this.state===2&&Math.abs(this.dtheta)>1&&this.near.add(t.id);return}this.near.delete(t.id);const a=this.dtheta*this.L,o=Math.cos(this.theta),l=this.dx*o*a,c=this.dz*o*a,h=Math.abs(a);if(h>2&&t.hitCd<=0){const f=Dt(l,c)||1,u=Pe(8+h*.5,8,18);e.hit(t,l/f*u,6.5,c/f*u,.95,"hammer",Pe(h/12,.5,1))}else{const f=Math.sqrt(r.nx*r.nx+r.nz*r.nz)||1,u=this.headR+$e-r.d;t.x+=r.nx/f*u,t.z+=r.nz/f*u}}danger(t,e){if(this.state===0)return 0;const n=3.4;return eo(t,e,this.px-this.dx*n,this.pz-this.dz*n,this.px+this.dx*n,this.pz+this.dz*n).d<this.headHalf+.9?1:0}}class Yo{constructor(t,e,n,i,r,a,o){S(this,"kind","sweeper");S(this,"cx");S(this,"cz");S(this,"arms");S(this,"L");S(this,"barY",.55);S(this,"barR",.32);S(this,"hubR",1);S(this,"power",1);S(this,"ang",0);S(this,"omega",0);S(this,"base");S(this,"dir");S(this,"at");S(this,"state",0);S(this,"rel",new Map);this.cx=t,this.cz=e,this.arms=n,this.L=i,this.base=r,this.dir=a,this.at=o}update(t,e){let n=0;t.t>=this.at?(this.state!==2&&t.emit("spinup",this.cx,1,this.cz),this.state=2,n=this.dir*this.base*(1+t.intensity*.7)):t.t>this.at-1.5&&(this.state!==1&&t.emit("warn",this.cx,2,this.cz,1),this.state=1),this.omega+=(n-this.omega)*Math.min(1,e*.8),this.ang+=this.omega*e}timeToBar(t,e){const n=Dt(t-this.cx,e-this.cz);if(n>this.L+.8||n<this.hubR||Math.abs(this.omega)<.05)return 1/0;const i=Math.atan2(e-this.cz,t-this.cx);let r=1/0;for(let a=0;a<this.arms;a++){const o=this.ang+a*Math.PI*2/this.arms;let l=Pi(o,i)*Math.sign(this.omega);l<0&&(l+=Math.PI*2),r=Math.min(r,l/Math.abs(this.omega))}return r}collide(t,e){const n=t.x-this.cx,i=t.z-this.cz,r=Dt(n,i);if(r>this.L+1)return;if(r<this.hubR+$e&&t.y<2.2){const o=r||1,l=this.hubR+$e-r;t.x+=n/o*l,t.z+=i/o*l;const c=(t.vx*n+t.vz*i)/o;c<0&&(t.vx-=n/o*c*1.5,t.vz-=i/o*c*1.5)}const a=Math.atan2(i,n);for(let o=0;o<this.arms;o++){const l=this.ang+o*Math.PI*2/this.arms,c=this.cx+Math.cos(l)*this.L,h=this.cz+Math.sin(l)*this.L,f=eo(t.x,t.z,this.cx,this.cz,c,h),u=t.id*8+o,d=Pi(l,a),g=this.rel.get(u);if(this.rel.set(u,d),g!==void 0&&Math.sign(g)!==Math.sign(d)&&Math.abs(d)<.5&&r<this.L&&!t.grounded&&t.y>this.barY&&t.stun<=0&&e.dodge(t),f.d>this.barR+$e||t.y>this.barY+this.barR-.04||t.y+Pc<this.barY-this.barR)continue;const v=Math.sign(this.omega)||1,m=-Math.sin(l)*v,p=Math.cos(l)*v,M=Math.abs(this.omega)*f.t*this.L;if(M>1.2&&t.hitCd<=0){const E=Pe(3.5+M*.5,4.5,9)*this.power*(.85+e.intensity*.3);e.hit(t,m*E,7.8,p*E,.7,"sweeper",Pe(M/10,.4,1))}else if(t.hitCd<=0){const E=Math.sign(d)||1;t.x+=-Math.sin(l)*E*(this.barR+$e-f.d),t.z+=Math.cos(l)*E*(this.barR+$e-f.d)}}}danger(t,e){if(this.state===0)return 0;const n=Dt(t-this.cx,e-this.cz);return n<this.hubR+.6?1:n<this.L?.45:0}}class D_{constructor(){S(this,"kind","ball");S(this,"state",0);S(this,"x",0);S(this,"y",0);S(this,"z",0);S(this,"vx",0);S(this,"vy",0);S(this,"vz",0);S(this,"R",1.4);S(this,"warnT",0);S(this,"sx",0);S(this,"sz",0);S(this,"ex",0);S(this,"ez",0);S(this,"rollX",0);S(this,"rollZ",0);S(this,"landed",!1);S(this,"near",new Set)}launch(t,e,n,i,r,a,o){this.state=1,this.warnT=a,this.sx=t,this.sz=e,this.ex=n,this.ez=i,this.R=o?1.9:1.4;const l=Dt(n-t,i-e)||1;this.vx=(n-t)/l*r,this.vz=(i-e)/l*r,this.vy=0,this.x=t,this.z=e,this.y=14,this.landed=!1,this.near.clear()}update(t,e){if(this.state===1){this.warnT-=e,this.warnT<=0&&(this.state=2,this.vy=-6);return}if(this.state!==2)return;if(!this.landed){this.vy-=jl*e,this.y+=this.vy*e,this.y<=this.R&&t.arena.groundAt(this.x,this.z)===0?(this.y=this.R,this.landed=!0,this.vy=0,t.emit("thud",this.x,0,this.z,this.R/1.9)):this.y<-40&&(this.state=0);return}this.x+=this.vx*e,this.z+=this.vz*e,(this.y>-.5?t.arena.groundAt(this.x,this.z):-1/0)===0&&this.y<=this.R+.01&&this.vy<=0?(this.y=this.R,this.vy=0):(this.vy-=jl*e,this.y+=this.vy*e),this.rollX+=this.vz*e/this.R,this.rollZ-=this.vx*e/this.R,this.y<-40&&(this.state=0)}collide(t,e){if(this.state!==2)return;const n=t.x-this.x,i=t.z-this.z,r=Dt(n,i);if(r>this.R+3){this.near.has(t.id)&&(this.near.delete(t.id),e.dodge(t));return}kn.x=this.x,kn.y=this.y,kn.z=this.z,Ai.x=t.x,Ai.y=t.y+.45,Ai.z=t.z,Ri.x=t.x,Ri.y=t.y+1.05,Ri.z=t.z;const a=Ql(kn,Ai,Ri);if(a.d>this.R+$e){a.d<this.R+$e+1.6&&this.landed&&this.near.add(t.id);return}if(this.near.delete(t.id),t.hitCd>0)return;if(!this.landed&&this.vy<-2){e.hit(t,n*3,4,i*3,1.3,"ball",1);return}const o=Dt(this.vx,this.vz),l=r||1;let c=this.vx/(o||1)*.75+n/l*.6,h=this.vz/(o||1)*.75+i/l*.6;const f=Dt(c,h)||1,u=11+o*.35;c=c/f*u,h=h/f*u,e.hit(t,c,7.5,h,1,"ball",1)}danger(t,e){if(this.state===1)return eo(t,e,this.sx,this.sz,this.ex,this.ez).d<this.R+1.1?.8:0;if(this.state!==2||this.y<-1)return 0;for(let n=0;n<=4;n++){const i=n*.35;if(Dt(t-(this.x+this.vx*i),e-(this.z+this.vz*i))<this.R+1.3)return 1-n*.12}return 0}}class N_{constructor(){S(this,"kind","wall");S(this,"state",0);S(this,"cx",0);S(this,"cz",0);S(this,"nx",1);S(this,"nz",0);S(this,"W",9);S(this,"T",.9);S(this,"H",2.2);S(this,"speed",3.5);S(this,"dist",0);S(this,"moved",0);S(this,"y",-3);S(this,"t",0);S(this,"sx",0);S(this,"sz",0)}launch(t,e,n,i,r,a,o,l){this.state=1,this.sx=this.cx=t,this.sz=this.cz=e,this.nx=n,this.nz=i,this.dist=r,this.speed=a,this.W=o,this.moved=0,this.t=l,this.y=-3}update(t,e){if(this.state===1)this.t-=e,this.t<=0&&(this.state=2,this.t=.45,t.emit("wallup",this.cx,0,this.cz));else if(this.state===2)this.t-=e,this.y=-3*Math.max(0,this.t/.45),this.t<=0&&(this.y=0,this.state=3);else if(this.state===3){const n=this.speed*(1+t.intensity*.3)*e;this.cx+=this.nx*n,this.cz+=this.nz*n,this.moved+=n,this.moved>=this.dist&&(this.state=4,this.t=.6)}else this.state===4&&(this.t-=e,this.y=-3*(1-Math.max(0,this.t/.6)),this.t<=0&&(this.state=0))}collide(t,e){if(this.state<2||this.y<-1.4)return;const n=t.x-this.cx,i=t.z-this.cz,r=n*this.nx+i*this.nz,a=-n*this.nz+i*this.nx,o=this.W/2+$e,l=this.T/2+$e;if(Math.abs(a)>o||Math.abs(r)>l||t.y>this.y+this.H||t.y+Pc<this.y)return;const c=l-Math.abs(r),h=o-Math.abs(a);if(h<c){const g=Math.sign(a)||1;t.x+=-this.nz*g*h,t.z+=this.nx*g*h;return}const d=(this.state===3?1:Math.sign(r)||1)*l-r;if(t.x+=this.nx*d,t.z+=this.nz*d,this.state===3){const g=t.vx*this.nx+t.vz*this.nz,v=this.speed*1.25;g<v&&(t.vx+=this.nx*(v-g),t.vz+=this.nz*(v-g)),t.hitCd<=0&&t.grounded&&e.rand()<.02&&e.hit(t,this.nx*7,3.5,this.nz*7,.3,"wall",.4)}}danger(t,e){if(this.state===0||this.state===4)return 0;const n=t-this.cx,i=e-this.cz,r=n*this.nx+i*this.nz,a=-n*this.nz+i*this.nx;if(Math.abs(a)>this.W/2+1.2)return 0;const o=this.state===1?this.dist:this.speed*2.6;return r>-this.T&&r<o?this.state===1?.6:1:0}}class Zo{constructor(t){S(this,"kind","bumper");S(this,"x");S(this,"z");S(this,"tile");S(this,"R",.85);S(this,"H",1.15);S(this,"squash",0);this.tile=t,this.x=t.x,this.z=t.z,t.occupied=!0}get up(){return this.tile.state===tn||this.tile.state===Rn}update(t,e){this.squash=Math.max(0,this.squash-e*4)}collide(t,e){if(!this.up)return;const n=t.x-this.x,i=t.z-this.z,r=Dt(n,i);if(r>this.R+$e||t.y>this.H)return;const a=r||1;t.x=this.x+n/a*(this.R+$e),t.z=this.z+i/a*(this.R+$e),t.hitCd<=0&&(this.squash=1,e.hit(t,n/a*10,4.5,i/a*10,.3,"bumper",.6))}danger(t,e){return this.up&&Dt(t-this.x,e-this.z)<this.R+1?.5:0}}const va=["bowl","isles","donut"],fu=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];function _a(s,t,e,n){const i=[];for(let r=-n;r<=n;r++)for(let a=-n;a<=n;a++)bi(r,a)<=n&&i.push(s.add(t+r,e+a));return i}function du(s,t,e,n,i){const r=s.add(t,e,Ns),a=ka(n,i);return r.tx=a.x,r.tz=a.z,r}function U_(s,t,e){const n=new L_,i=[],r=[],a=[],o=[];let l=9,c=null;const h=t.range(0,Math.PI*2),f=t.range(.4,1.1),u=t.shuffle([9,15,21,28,35]).map(d=>e+d+t.range(-1,1));if(s==="bowl"){_a(n,0,0,6);for(const p of n.tiles){const M=bi(p.q,p.r);p.shade=M%2,p.prio=M+t.range(0,1.3)+Math.cos(Math.atan2(p.z,p.x)-h)*f}const d=n.at(0,0);d.occupied=!0,d.prio=-99,r.push(new Yo(0,0,t.pick([2,3]),zn*2.6,t.range(1,1.2),t.pick([-1,1]),e+t.range(3,6)));const g=t.pick([3,4]),v=t.range(0,Math.PI*2);for(let p=0;p<g;p++){const M=v+p*Math.PI*2/g,E=zn*4.2;i.push(new $o(Math.cos(M)*E,Math.sin(M)*E,M+Math.PI/2,u[p],t.range(1.7,2.1)))}const m=n.tiles.filter(p=>{const M=bi(p.q,p.r);return M>=2&&M<=5&&!p.occupied});for(const p of t.shuffle(m).slice(0,4))a.push(new Zo(p));o.push({x:0,z:0,r:zn*6+1}),l=9}else if(s==="isles"){const d=_a(n,0,0,2);for(const m of d)m.shade=0;const g=[];for(const m of[0,2,4]){const[p,M]=fu[m],E=_a(n,p*7,M*7,2);for(const T of E)T.shade=1;g.push([p*7,M*7]);for(const T of[3,4])n.add(p*T,M*T).shade=2;const y=ka(p*3.5,M*3.5),w=Math.atan2(y.z,y.x);i.push(new $o(y.x,y.z,w+Math.PI/2,u[m/2],t.range(1.8,2.2)))}for(const m of[1,3,5]){const[p,M]=fu[m],E=_a(n,p*6,M*6,1);for(const y of E)y.shade=2;du(n,p*2,M*2,p*6,M*6),du(n,p*5,M*5,p,M)}for(const m of n.tiles){const p=Dt(m.x,m.z)/zn;m.prio=p*.8+t.range(0,2.2)+Math.cos(Math.atan2(m.z,m.x)-h)*f}const v=n.at(0,0);v.occupied=!0,v.prio=-99,r.push(new Yo(0,0,2,zn*2.35,t.range(1.05,1.25),t.pick([-1,1]),e+t.range(3,6))),r[0].power=.75;for(const[m,p]of g){const M=n.tiles.filter(y=>bi(y.q-m,y.r-p)===1);a.push(new Zo(t.pick(M)));const E=ka(m,p);o.push({x:E.x,z:E.z,r:zn*2+1.2})}l=5.5}else{for(let v=-6;v<=6;v++)for(let m=-6;m<=6;m++){const p=bi(v,m);p>=3&&p<=6&&(n.add(v,m).shade=p===3||p===6?1:0)}for(const v of n.tiles){const m=bi(v.q,v.r);v.prio=Math.abs(m-4.4)*1.4+t.range(0,1.6)+Math.cos(Math.atan2(v.z,v.x)-h)*f}r.push(new Yo(0,0,2,zn*6.3,t.range(.4,.48),t.pick([-1,1]),e+t.range(4,7))),r[0].hubR=2.4,r[0].power=.8;const d=3,g=t.range(0,Math.PI*2);for(let v=0;v<d;v++){const m=g+v*Math.PI*2/d,p=zn*4.5;i.push(new $o(Math.cos(m)*p,Math.sin(m)*p,m,u[v],t.range(1.7,2.1)))}for(const v of t.shuffle(n.tiles.filter(m=>bi(m.q,m.r)===4||bi(m.q,m.r)===5)).slice(0,5))a.push(new Zo(v));c=[zn*3.4,zn*5.2]}return n.measure(),{arena:n,hammers:i,sweepers:r,bumpers:a,wallZones:o,wallLen:l,ballRing:c}}const Of={aggressive:{aggr:1,caution:.55,greed:.3,centre:.4,skill:.75,noise:.25,vigilance:.45,focus:3,nerve:.6,temper:1},defensive:{aggr:.1,caution:1,greed:.35,centre:.7,skill:.75,noise:.15,vigilance:.95,focus:4,nerve:.5,temper:.3},competitive:{aggr:.45,caution:.8,greed:.6,centre:1,skill:.9,noise:.1,vigilance:.75,focus:5,nerve:.85,temper:.5},wild:{aggr:.6,caution:.25,greed:.8,centre:.2,skill:.6,noise:.8,vigilance:.3,focus:2,nerve:.3,temper:.8},beginner:{aggr:.2,caution:.45,greed:.5,centre:.3,skill:.3,noise:.6,vigilance:.35,focus:2,nerve:.25,temper:.4}},pu=["aggressive","defensive","competitive","wild","beginner"];function F_(s,t){const e=[];let n=t.int(0,4);for(const i of s.chars){if(i.isPlayer)continue;const r=pu[n++%pu.length],a=Of[r],o=()=>t.range(-.12,.12);e.push(new zf(i,{style:r,...a,aggr:Pe(a.aggr+o(),0,1),caution:Pe(a.caution+o(),0,1),greed:Pe(a.greed+o(),0,1),skill:Pe(a.skill+o(),.1,1),nerve:Pe(a.nerve+o(),.1,1)},t))}return e}function mu(s,t){return new zf(s,{style:"competitive",...Of.competitive,skill:.95},t)}const gu=12,O_=1.75,xu=3.2,z_=28;class zf{constructor(t,e,n){S(this,"c");S(this,"p");S(this,"rng");S(this,"gx");S(this,"gz");S(this,"goalScore",-1/0);S(this,"thinkIn");S(this,"lastThink",0);S(this,"target",null);S(this,"jumpIn",-1);S(this,"dashIn",-1);S(this,"dashX",0);S(this,"dashZ",0);S(this,"holdJump",0);S(this,"idleT",0);S(this,"tracks",new Map);S(this,"warnSeen",new Set);S(this,"aversion",[]);S(this,"flee",[]);S(this,"anger",new Map);S(this,"rhythm",new Map);S(this,"heardUpTo",0);S(this,"gaze");S(this,"glanceT");S(this,"glanceYaw",0);S(this,"glanceLeft",0);S(this,"lookAt",null);S(this,"stress",0);S(this,"cocky",0);S(this,"freezeT",0);S(this,"dazed",0);S(this,"derpT",0);S(this,"derpX",0);S(this,"derpZ",0);S(this,"jitter",0);S(this,"seenSrcT",-99);S(this,"seenKos",0);S(this,"seenDodges",0);S(this,"wasStunned",!1);S(this,"nearEdgeWhileStunned",!1);this.c=t,this.p=e,this.rng=n,this.gx=t.x,this.gz=t.z,this.thinkIn=n.range(0,.3),this.gaze=t.yaw,this.glanceT=n.range(.5,3)}idle(t,e){this.idleT-=e;const n=this.c;if(n.ctl.jump=!1,this.idleT<=0){this.idleT=this.rng.range(.4,1.6),this.rng.chance(.3)&&(n.ctl.jump=!0),n.ctl.mx=this.rng.range(-1,1),n.ctl.mz=this.rng.range(-1,1);const i=this.rng.pick(t.chars);this.lookAt=i!==n?{x:i.x,z:i.z}:null}this.head(e)}get reaction(){let t=0;for(const e of this.tracks.values())e.known&&this.c&&this.isThreat(e)&&t++;return .17+(1-this.p.skill)*.22+Math.log2(1+t)*.045-this.stress*.04}isThreat(t){const e=t.o.kind;return e==="ball"||e==="wall"||e==="hammer"||e==="sweeper"}canSee(t,e,n=0){const i=t-this.c.x,r=e-this.c.z,a=Dt(i,r);return a<xu+n?!0:a>z_+n*2?!1:Math.abs(Pi(this.gaze,Math.atan2(i,r)))<O_}where(t){switch(t.kind){case"ball":return t.state===1?{x:(t.sx+t.ex)/2,z:(t.sz+t.ez)/2,size:6,live:!0}:{x:t.x,z:t.z,size:t.R,live:t.state===2&&t.y>-2};case"wall":return{x:t.cx,z:t.cz,size:t.W/2,live:t.state>0};case"hammer":return{x:t.hx,z:t.hz,size:3,live:t.state>0};case"sweeper":return{x:t.cx,z:t.cz,size:t.L,live:t.state>0};default:return{x:t.x,z:t.z,size:1,live:t.up}}}perceive(t,e){const n=this.c,i=t.t,r=this.reaction+this.rng.range(0,.06),a=[...t.balls,...t.walls,...t.hammers,...t.sweepers,...t.bumpers];for(const h of a){const f=this.where(h);let u=this.tracks.get(h);if(!f.live){u&&(h.kind==="ball"||h.kind==="wall")&&i-u.seenAt>1.5&&this.tracks.delete(h);continue}if(!this.canSee(f.x,f.z,f.size)){u&&(h.kind==="ball"||h.kind==="wall")&&i-u.seenAt>4&&this.tracks.delete(h),u&&!u.known&&(u.watch=Math.max(0,u.watch-e));continue}u||(u={o:h,watch:0,known:!1,x:f.x,z:f.z,vx:0,vz:0,hasV:!1,seenAt:i,firstAt:i},this.tracks.set(h,u)),u.watch+=e,!u.known&&u.watch>=r&&(u.known=!0);const g=i-u.seenAt;if(g>.08&&u.known){const v=(f.x-u.x)/g,m=(f.z-u.z)/g;Dt(v,m)<40&&(u.vx=u.hasV?u.vx*.5+v*.5:v,u.vz=u.hasV?u.vz*.5+m*.5:m,u.hasV=!0)}h.kind==="ball"&&h.state===1&&(u.hasV=!1),u.x=f.x,u.z=f.z,u.seenAt=i}let o=0;const l=this.p.focus*2;for(const h of t.arena.tiles){if(h.state!==Rn||this.warnSeen.has(h.i))continue;const f=Dt(h.x-n.x,h.z-n.z);(f<2.6||f<16&&o<l&&this.canSee(h.x,h.z,1)&&this.rng.chance(.35+this.p.vigilance*.4))&&(this.warnSeen.add(h.i),o++)}const c=[];for(const h of t.chars)h===n||!h.alive||h.falling||h.stun>0||Dt(h.x-n.x,h.z-n.z)>9||h.speedNow<5.5||!this.canSee(h.x,h.z)||c.push({x:h.x-h.vx*.5,z:h.z-h.vz*.5});for(let h=0;h<c.length;h++)for(let f=h+1;f<c.length;f++)Dt(c[h].x-c[f].x,c[h].z-c[f].z)<3&&this.flee.push({x:(c[h].x+c[f].x)/2,z:(c[h].z+c[f].z)/2,t:i+1.2});for(const h of t.sounds){if(h.t<=this.heardUpTo)continue;const f=Dt(h.x-n.x,h.z-n.z);if(h.type==="alarm"){this.stress+=.08*(1.2-this.p.nerve),this.glance(this.gaze+Math.PI+this.rng.range(-1,1),.4);continue}if(!(f>16)&&(h.type==="out"&&h.id!==n.id&&(this.stress+=.14*(1-f/16)*(1.2-this.p.nerve)),(h.type==="thud"||h.type==="wallup"||h.type==="whoosh"||h.type==="shock"||h.type==="hit"&&f<8)&&(this.glance(Math.atan2(h.x-n.x,h.z-n.z),.45),h.type==="thud"))){for(const u of t.balls)if(Dt(u.x-h.x,u.z-h.z)<2&&u.state===2){const d=this.tracks.get(u);d&&(d.known=!0)}}}if(t.sounds.length&&(this.heardUpTo=t.sounds[t.sounds.length-1].t),this.flee=this.flee.filter(h=>h.t>i),this.aversion=this.aversion.filter(h=>h.t>i),this.warnSeen.size>40)for(const h of this.warnSeen)t.arena.tiles[h].state>ci&&this.warnSeen.delete(h)}glance(t,e){this.glanceYaw=t,this.glanceLeft=e}head(t){const e=this.c;let n=e.yaw;this.glanceLeft>0?n=this.glanceYaw:this.lookAt&&(n=Math.atan2(this.lookAt.x-e.x,this.lookAt.z-e.z)),this.gaze+=Pi(this.gaze,n)*Math.min(1,t*9),e.lookX=e.x+Math.sin(this.gaze)*6,e.lookZ=e.z+Math.cos(this.gaze)*6}tileOk(t,e,n){const i=t.arena.tileAt(e,n);return!i||i.state>=ci?!1:!(i.state===Rn&&this.warnSeen.has(i.i))}support(t,e,n,i){let r=0;for(let a=0;a<6;a++){const o=a*Math.PI/3+.5;this.tileOk(t,e+Math.cos(o)*i,n+Math.sin(o)*i)&&r++}return r}danger(t,e,n){const i=t.t;let r=0;for(const o of this.tracks.values()){if(!o.known)continue;const l=o.o,c=i-o.seenAt;switch(l.kind){case"ball":{if(!o.hasV){if(l.state===1||c<.4){const u=eo(e,n,l.sx,l.sz,l.ex,l.ez);r+=u.d<l.R+1.1?.8:0}else r+=Dt(e-o.x,n-o.z)<l.R+2?.7:0;break}const h=o.x+o.vx*c,f=o.z+o.vz*c;for(let u=0;u<=4;u++){const d=u*.35;if(Dt(e-(h+o.vx*d),n-(f+o.vz*d))<l.R+1.3){r+=1-u*.12;break}}break}case"wall":{const h=o.x+o.vx*c,f=o.z+o.vz*c,u=e-h,d=n-f,g=u*l.nx+d*l.nz,v=-u*l.nz+d*l.nx;Math.abs(v)<l.W/2+1.2&&g>-l.T&&g<(l.state===1?l.dist:l.speed*2.6)&&(r+=l.state===1?.6:1);break}case"hammer":{let h=l.danger(e,n);h&&i-o.firstAt>3&&this.p.skill>.5&&Math.sign(l.theta)!==Math.sign(l.dx*(e-l.px)+l.dz*(n-l.pz))&&Math.abs(l.theta)>.5&&(h*=.35),r+=h;break}default:r+=l.danger(e,n)}}const a=t.arena.tileAt(e,n);a&&a.state===Rn&&this.warnSeen.has(a.i)&&(r+=1.6);for(const o of this.aversion)Dt(o.x-e,o.z-n)<2.2&&(r+=.8);for(const o of this.flee)Dt(o.x-e,o.z-n)<2.5&&(r+=.6);return r}think(t,e){const n=this.c,i=n.ctl;if(n.moodT>0&&(n.moodT-=e,n.moodT<=0&&(n.mood="")),!n.alive||n.falling){if(i.mx=i.mz=0,i.jump=!1,n.falling&&n.alive){const c=t.arena.cx-n.x,h=t.arena.cz-n.z,f=Dt(c,h)||1;i.mx=c/f,i.mz=h/f}n.mood="scared",n.moodT=1;return}if(t.phase==="end"){i.mx=i.mz=0,i.jump=this.rng.chance(.05)||i.jump&&this.rng.chance(.8),n.mood="cheer",n.moodT=1,this.lookAt=null,this.head(e);return}if(this.feelings(t,e),this.thinkIn-=e,this.thinkIn<=0){const c=t.t-this.lastThink;this.lastThink=t.t,this.thinkIn=.11+this.rng.range(0,.08)+(1-this.p.skill)*.1-this.stress*.04,this.perceive(t,Math.min(.4,c)),this.choose(t)}if(this.glanceT-=e,this.glanceT<=0&&(this.glanceT=this.rng.range(1.2,3.5)/(.4+this.p.vigilance+this.stress),this.glance(n.yaw+Math.PI+this.rng.range(-1.1,1.1),.35)),this.glanceLeft-=e,this.head(e),this.freezeT>0){this.freezeT-=e,i.mx=i.mz=0,i.jump=!1;return}let r=this.gx-n.x,a=this.gz-n.z,o=Dt(r,a);if(o<.5)r=a=0;else{r/=o,a/=o,this.jitter+=(this.rng.next()-.5)*e*6,this.jitter*=Math.exp(-e*2);const c=this.jitter*((1-this.p.skill)*.5+this.stress*.6*(1.2-this.p.nerve)),h=Math.atan2(a,r)+c;r=Math.cos(h),a=Math.sin(h)}if(this.derpT>0)this.derpT-=e,r=this.derpX,a=this.derpZ;else if(n.grounded&&(r||a)&&this.dazed<=0){const c=n.x+r*1.1+n.vx*.15,h=n.z+a*1.1+n.vz*.15;if(!t.arena.solidAt(c,h)&&this.rng.next()<.6+this.p.skill*.4){const f=Math.atan2(a,r);let u=!1;for(let d=1;d<=6&&!u;d++)for(const g of[1,-1]){const v=f+g*d*.45;if(this.tileOk(t,n.x+Math.cos(v)*1.2,n.z+Math.sin(v)*1.2)){r=Math.cos(v),a=Math.sin(v),u=!0;break}}u||(r=a=0)}}const l=Dt(n.vx,n.vz);l>3&&n.stun<=0&&this.dazed<=0&&(t.arena.solidAt(n.x+n.vx*.3,n.z+n.vz*.3)||(r=-n.vx/l,a=-n.vz/l)),i.mx=r,i.mz=a;for(const c of t.sweepers){const h=this.tracks.get(c);if(!h||!h.known)continue;const f=c.timeToBar(n.x,n.z);if(f===1/0)continue;const u=this.rhythm.get(c)||0,d=Dt(n.x-c.cx,n.z-c.cz),g=Math.atan2(n.z-c.cz,n.x-c.cx)-Math.sign(c.omega)*Math.abs(c.omega)*f,v=c.cx+Math.cos(g)*d,m=c.cz+Math.sin(g)*d,p=this.canSee(v,m)||Math.abs(c.omega)*f*d<xu;if(!p&&u<.3)continue;const M=.03+(1-this.p.skill)*.12+this.stress*.05-u*.07+(p?0:.08),E=.2+this.gauss()*Math.max(.02,M);f<E&&this.jumpIn<0&&n.grounded&&(this.jumpIn=0),p&&f<1.2&&(this.lookAt={x:v,z:m})}this.jumpIn>=0&&(this.jumpIn-=e,this.jumpIn<0&&(this.holdJump=.3)),this.holdJump>0?(this.holdJump-=e,i.jump=!0):i.jump=!1,this.dashIn>=0&&(this.dashIn-=e,this.dashIn<0&&n.dashCd<=0&&(i.mx=this.dashX,i.mz=this.dashZ,i.dash=!0))}gauss(){return(this.rng.next()+this.rng.next()+this.rng.next()-1.5)*1.15}feelings(t,e){const n=this.c,i=this.p;this.stress=Math.max(0,this.stress-e*.12*(.5+i.nerve)),this.cocky=Math.max(0,this.cocky-e),this.dazed=Math.max(0,this.dazed-e);for(const[a,o]of this.anger){const l=o-e*.08;l<=0?this.anger.delete(a):this.anger.set(a,l)}if(n.srcT!==this.seenSrcT&&(this.seenSrcT=n.srcT,this.stress+=.3*(1.2-i.nerve),this.dazed=.08+(1-i.skill)*.18,n.lastHitT===n.srcT&&n.lastHitBy>=0)){const a=n.lastHitBy;this.anger.set(a,(this.anger.get(a)||0)+.6+i.temper*.8);const o=t.chars[a];o&&(this.lookAt={x:o.x,z:o.z}),i.temper>.6&&(n.mood="angry",n.moodT=1.2)}if(n.kos!==this.seenKos&&(this.seenKos=n.kos,n.mood="cheer",n.moodT=1.4,this.cocky=3,t.arena.depthAt(n.x,n.z)>=2&&(this.holdJump=.2)),n.dodges!==this.seenDodges){this.seenDodges=n.dodges,this.stress+=.06;for(const a of t.sweepers)Dt(n.x-a.cx,n.z-a.cz)<a.L+1&&this.rhythm.set(a,Math.min(.6,(this.rhythm.get(a)||0)+.15))}const r=this.support(t,n.x,n.z,1.2);r<=3&&(this.stress+=e*(.25+(n.stun>0?.5:0))*(1.2-i.nerve)),n.stun>0&&r<=3&&(this.nearEdgeWhileStunned=!0),this.wasStunned&&n.stun<=0&&this.nearEdgeWhileStunned&&(this.aversion.push({x:n.x,z:n.z,t:t.t+20}),this.nearEdgeWhileStunned=!1),this.wasStunned=n.stun>0,t.sudden&&this.stress<.3&&(this.stress+=e*.1),this.stress=Math.min(1,this.stress),this.stress>.7&&n.mood===""&&(n.mood="scared",n.moodT=.6)}choose(t){const e=this.c,n=this.p,i=this.rng,r=t.arena,a=n.caution*(this.cocky>0?.7:1);if(n.style==="beginner"&&this.derpT<=0&&i.chance(.012)){const M=i.range(0,Math.PI*2);this.derpX=Math.cos(M),this.derpZ=Math.sin(M),this.derpT=i.range(.3,.7),i.chance(.4)&&(this.holdJump=.25)}n.style==="wild"&&i.chance(.02)&&(this.holdJump=.3),this.target=null;let o=1/0;for(const M of t.chars){if(M===e||!M.alive||M.falling)continue;const E=Dt(M.x-e.x,M.z-e.z),y=this.anger.get(M.id)||0;if(E>7+y*4||!this.canSee(M.x,M.z)||n.aggr+y<.3)continue;const w=Dt(M.x-r.cx,M.z-r.cz)/Math.max(4,r.spread),T=E-w*3*n.aggr-y*4;T<o&&(o=T,this.target=M)}const l=Math.min(1.4,n.aggr+(this.target&&this.anger.get(this.target.id)||0)*.5+(this.cocky>0?.2:0)),c=n.noise*(1+this.stress*1.5);let h=-1/0,f=e.x,u=e.z;const d=(M,E,y)=>{if(!this.reachable(t,M,E))return;const w=this.score(t,M,E,a,l)+y+i.range(-1,1)*c;w>h&&(h=w,f=M,u=E)};d(e.x,e.z,.4);const g=i.range(0,Math.PI*2);for(let M=0;M<gu;M++){const E=g+M*Math.PI*2/gu;for(const y of[2,4.5])d(e.x+Math.cos(E)*y,e.z+Math.sin(E)*y,0)}r.solidAt(r.cx,r.cz)&&d(r.cx,r.cz,n.centre*.8);for(const M of t.coins)M.alive&&Math.abs(M.x-e.x)<6&&Math.abs(M.z-e.z)<6&&this.canSee(M.x,M.z)&&d(M.x,M.z,n.greed*1.2);for(const M of t.items)M.alive&&Dt(M.x-e.x,M.z-e.z)<12&&this.canSee(M.x,M.z,1)&&d(M.x,M.z,n.greed*3+.8);const v=this.target;if(v){const M=v.x-r.cx,E=v.z-r.cz,y=Dt(M,E)||1;d(v.x-M/y*1.3,v.z-E/y*1.3,l*2.2);const w=v.x-e.x,T=v.z-e.z,C=Dt(w,T),_=(w*M+T*E)/((C||1)*y),A=this.anger.get(v.id)||0;if(C<3.2&&C>.8&&e.dashCd<=0&&this.dashIn<0&&(_>.5-l*.4||A>1)&&t.t>2&&i.chance(.04+l*.14)){this.dashIn=this.reaction*.5;const P=this.gauss()*((1-n.skill)*.25+this.stress*.2),L=Math.atan2(T+v.vz*.15,w+v.vx*.15)+P;this.dashX=Math.cos(L),this.dashZ=Math.sin(L)}C<6&&(this.lookAt={x:v.x,z:v.z})}if((this.reachable(t,this.gx,this.gz)?this.score(t,this.gx,this.gz,a,l):-1/0)>h-.9&&Dt(this.gx-e.x,this.gz-e.z)>.6&&!v&&(f=this.gx,u=this.gz),this.gx=f,this.gz=u,!v){let M=null,E=9;for(const y of this.tracks.values()){if(!y.known||!this.isThreat(y))continue;const w=Dt(y.x-e.x,y.z-e.z);w<E&&(E=w,M=y)}this.lookAt=M&&i.chance(.6)?{x:M.x,z:M.z}:null}if(this.danger(t,e.x,e.z)>.7&&e.dashCd<=0&&this.dashIn<0){const M=f-e.x,E=u-e.z,y=Dt(M,E);if(this.threatsAround(t)&&i.chance((1-n.nerve)*.25))this.freezeT=i.range(.2,.45);else if(y>1&&i.chance(.15+n.skill*.4)&&this.tileOk(t,e.x+M/y*3.5,e.z+E/y*3.5))this.dashIn=this.reaction*.6,this.dashX=M/y,this.dashZ=E/y;else if(this.stress>.75&&i.chance(.08*(1-n.nerve))){const w=Math.atan2(E,M)+i.range(-1,1);this.dashIn=0,this.dashX=Math.cos(w),this.dashZ=Math.sin(w)}}i.chance(.006+(n.style==="wild"?.02:0)+this.stress*.01)&&(this.holdJump=.2)}threatsAround(t){const e=this.c,n=[];for(const i of this.tracks.values())!i.known||!this.isThreat(i)||Dt(i.x-e.x,i.z-e.z)<5&&n.push(Math.atan2(i.x-e.x,i.z-e.z));for(let i=0;i<n.length;i++)for(let r=i+1;r<n.length;r++)if(Math.abs(Pi(n[i],n[r]))>2.2)return t.t>0;return!1}reachable(t,e,n){const i=this.c,r=Dt(e-i.x,n-i.z),a=Math.ceil(r/.9);for(let o=1;o<=a;o++){const l=o/a;if(!t.arena.solidAt(i.x+(e-i.x)*l,i.z+(n-i.z)*l))return!1}return!0}score(t,e,n,i,r){const a=t.arena,o=this.p;if(!this.tileOk(t,e,n))return a.solidAt(e,n)?-30*i-5:-100;let l=0;const c=this.support(t,e,n,1.4),h=this.support(t,e,n,3);l-=(6-c)*1.6*(.4+i),l-=(6-h)*.5*(.4+i),l-=this.danger(t,e,n)*6*(.3+i),l+=Math.min(4,a.depthAt(e,n))*.9*(.3+o.centre);let f=0;for(const u of t.chars)u===this.c||!u.alive||u.falling||Math.abs(u.x-e)+Math.abs(u.z-n)<2&&f++;return l-=f*(i-r*.6)*.8,l-=Dt(e-this.c.x,n-this.c.z)*.12,l}}const B_=new Set(["thud","whoosh","alarm","crumble","hit","out","wallup","shock","bump","launch"]),k_=["speed","shield","jump","heavy","shock","magnet"],Bf={speed:6,shield:10,jump:8,heavy:7,shock:0,magnet:8},H_=3;class G_{constructor(t){S(this,"opts");S(this,"rng");S(this,"layout");S(this,"built");S(this,"arena");S(this,"chars",[]);S(this,"player",null);S(this,"brains",[]);S(this,"hammers");S(this,"sweepers");S(this,"bumpers");S(this,"balls",[]);S(this,"walls",[]);S(this,"coins",[]);S(this,"items",[]);S(this,"events",[]);S(this,"sounds",[]);S(this,"phase","countdown");S(this,"countdown");S(this,"t",0);S(this,"intensity",0);S(this,"alive",0);S(this,"winner",null);S(this,"endT",0);S(this,"order",[]);S(this,"nextBalls");S(this,"nextWall");S(this,"waves");S(this,"wave",0);S(this,"suddenAt");S(this,"suddenNext",0);S(this,"sudden",!1);S(this,"nextItem");S(this,"nextCoins");S(this,"startTiles");S(this,"charEv",(t,e,n=0)=>{this.emit(t,e.x,e.y,e.z,n,e.id)});this.opts=t,this.rng=new mr(t.seed),this.layout=t.layout,this.countdown=t.countdown??H_,this.built=U_(t.layout,this.rng,0),this.arena=this.built.arena,this.hammers=this.built.hammers,this.sweepers=this.built.sweepers,this.bumpers=this.built.bumpers;for(let a=0;a<8;a++)this.balls.push(new D_);for(let a=0;a<3;a++)this.walls.push(new N_);const e=this.rng;this.nextBalls=e.range(8,12),this.nextWall=this.built.wallZones.length?e.range(20,28):1/0,this.waves=[e.range(16,19),e.range(31,35),e.range(46,50),e.range(59,63)],this.suddenAt=e.range(70,74),this.nextItem=e.range(3,5),this.nextCoins=6,this.startTiles=this.arena.tiles.length;const n=t.bots+(t.player?1:0),i=this.arena.spreadPick(n,e,a=>!a.occupied&&a.kind!==Ns&&!this.underHammer(a));for(;i.length<n;)i.push(e.pick(this.arena.tiles.filter(a=>!a.occupied)));e.shuffle(i);let r=0;t.player&&(this.player=new hu(r++,t.player.name,!0,t.player.look),this.chars.push(this.player));for(let a=0;a<t.bots;a++)this.chars.push(new hu(r++,t.botNames[a%t.botNames.length],!1,t.botLooks[a%t.botLooks.length]));this.chars.forEach((a,o)=>{const l=i[o],c=e.range(-.4,.4),h=e.range(-.4,.4);a.place0(l.x+c,l.z+h,Math.atan2(this.arena.cx-l.x,this.arena.cz-l.z))}),this.alive=this.chars.length,this.brains=F_(this,e);for(let a=0;a<18;a++)this.spawnCoin()}underHammer(t){for(const e of this.hammers)if(e.danger(t.x,t.z)>.5||Dt(t.x-e.px,t.z-e.pz)<3.6)return!0;return!1}rand(){return this.rng.next()}emit(t,e,n,i,r=0,a=-1,o=-1,l=""){this.events.push({type:t,x:e,y:n,z:i,a:r,id:a,id2:o,s:l}),B_.has(t)&&this.sounds.push({t:this.t,x:e,z:i,type:t,id:a,id2:o})}hit(t,e,n,i,r,a,o,l=-1){const c=.65+this.intensity*.45,h=t.hit(e*c,n,i*c,r,l,a,this.t);t.hitCd=.35,h?this.emit("hit",t.x,t.y+1,t.z,o,t.id,l,a):this.emit("shieldPop",t.x,t.y+1,t.z,o,t.id,l,a)}dodge(t){!t.alive||t.falling||(t.dodges++,t.isPlayer&&this.emit("dodge",t.x,t.y+1.8,t.z,t.dodges,t.id))}step(t){if(this.sounds.length&&this.sounds[0].t<this.t-2&&(this.sounds=this.sounds.filter(e=>e.t>=this.t-2)),this.phase==="countdown"){const e=Math.ceil(this.countdown);this.countdown-=t,Math.ceil(this.countdown)!==e&&this.countdown>0&&this.emit("count",0,0,0,Math.ceil(this.countdown));for(const n of this.chars){const i=n.ctl.mx,r=n.ctl.mz;n.ctl.mx=n.ctl.mz=0,n.ctl.dash=!1,n.step(t,this.arena,this.charEv),Dt(i,r)>.2&&(n.yaw=Math.atan2(i,r))}for(const n of this.brains)n.idle(this,t);this.countdown<=0&&(this.phase="play",this.emit("go",0,0,0));return}this.phase==="play"?this.t+=t:this.endT+=t,this.intensity=Pe(this.t/75,0,1),this.phase==="play"&&this.direct(),this.arena.update(t);for(const e of this.hammers)e.update(this,t);for(const e of this.sweepers)e.update(this,t);for(const e of this.balls)e.update(this,t);for(const e of this.walls)e.update(this,t);for(const e of this.bumpers)e.update(this,t);for(const e of this.brains)e.think(this,t);for(const e of this.chars)if(!e.gone&&(e.step(t,this.arena,this.charEv),!(!e.alive||e.falling)&&e.grounded&&e.padCd<=0)){const n=this.arena.tileAt(e.x,e.z);n&&n.kind===Ns&&n.state<=Rn&&(e.vx=(n.tx-e.x)/1.05,e.vz=(n.tz-e.z)/1.05,e.vy=13.6,e.grounded=!1,e.padCd=.8,e.stun=0,this.emit("launch",n.x,.2,n.z,1,e.id))}this.collideChars();for(const e of this.chars)if(!(!e.alive||e.falling||e.gone)){for(const n of this.hammers)n.collide(e,this);for(const n of this.sweepers)n.collide(e,this);for(const n of this.balls)n.collide(e,this);for(const n of this.walls)n.collide(e,this);for(const n of this.bumpers)n.collide(e,this)}this.pickups(t),this.eliminate()}collideChars(){const t=this.chars,e=$e*2;for(let n=0;n<t.length;n++){const i=t[n];if(!(i.gone||i.falling))for(let r=n+1;r<t.length;r++){const a=t[r];if(a.gone||a.falling)continue;const o=a.x-i.x;if(o>e||o<-e)continue;const l=a.z-i.z;if(l>e||l<-e||Math.abs(i.y-a.y)>1.3)continue;const c=Dt(o,l);if(c>=e)continue;const h=c>1e-4?o/c:1,f=c>1e-4?l/c:0,u=i.mass,d=a.mass,g=e-c;i.x-=h*g*(d/(u+d)),i.z-=f*g*(d/(u+d)),a.x+=h*g*(u/(u+d)),a.z+=f*g*(u/(u+d));const v=(a.vx-i.vx)*h+(a.vz-i.vz)*f;if(v>=0)continue;const m=i.dashT>0&&i.vx*h+i.vz*f>4,p=a.dashT>0&&-(a.vx*h+a.vz*f)>4;if(m&&(!p||i.speedNow>=a.speedNow))this.dashHit(i,a,h,f);else if(p)this.dashHit(a,i,-h,-f);else{const M=-1.6*v/(1/u+1/d);i.vx-=M/u*h,i.vz-=M/u*f,a.vx+=M/d*h,a.vz+=M/d*f,-v>3&&(a.lastHitBy=i.id,a.lastHitT=this.t,i.lastHitBy=a.id,i.lastHitT=this.t),-v>6.5&&(i.stun=Math.max(i.stun,.2),a.stun=Math.max(a.stun,.2),this.emit("bump",(i.x+a.x)/2,i.y+1,(i.z+a.z)/2,Pe(-v/12,0,1),i.id,a.id))}}}}dashHit(t,e,n,i){const r=(8.5+this.intensity*2)*(t.power==="heavy"?1.3:1);if(e.power==="shield"){this.hit(e,n*2,0,i*2,0,"dash",.6,t.id),t.hit(-n*8,4,-i*8,.45,e.id,"shield",this.t),this.emit("hit",t.x,t.y+1,t.z,.6,t.id,e.id,"shield");return}this.hit(e,n*r,4.5,i*r,.45,"dash",.8,t.id),t.vx*=.25,t.vz*=.25,t.dashT=0,t.dashHits++}spawnCoin(t){const e=this.arena.tiles.filter(r=>r.state===tn&&!r.occupied);if(!e.length||this.coins.filter(r=>r.alive).length>=40)return;const n=t||this.rng.pick(e);let i=this.coins.find(r=>!r.alive);i||(i={x:0,y:0,z:0,tile:null,alive:!1,t:0},this.coins.push(i)),i.x=n.x+this.rng.range(-.7,.7),i.z=n.z+this.rng.range(-.7,.7),i.y=.55,i.tile=n,i.alive=!0,i.t=this.rng.range(0,6)}spawnItem(){if(this.items.filter(i=>i.alive).length>=3)return;const t=this.arena.tiles.filter(i=>i.state===tn&&!i.occupied&&i.kind!==Ns);if(!t.length)return;const e=this.rng.pick(t);let n=this.items.find(i=>!i.alive);n||(n={x:0,y:0,z:0,tile:e,kind:"speed",alive:!1,t:0},this.items.push(n)),n.tile=e,n.x=e.x,n.z=e.z,n.y=.9,n.kind=this.rng.pick(k_),n.alive=!0,n.t=0,this.emit("itemSpawn",n.x,n.y,n.z)}pickups(t){for(const e of this.coins)if(e.alive){if(e.t+=t,e.tile&&e.tile.state>=ci){e.y=.55+e.tile.y,e.tile.y<-20&&(e.alive=!1);continue}for(const n of this.chars){if(!n.alive||n.falling)continue;const i=n.x-e.x,r=n.z-e.z;if(n.power==="magnet"&&Math.abs(i)<7&&Math.abs(r)<7){const a=Dt(i,r);if(a<7&&a>.01){const o=er(14,5,a/7)*t;e.x+=i/a*Math.min(o,a),e.z+=r/a*Math.min(o,a),e.tile=null,e.y+=(n.y+.6-e.y)*Math.min(1,t*6)}}if(Math.abs(n.x-e.x)<.9&&Math.abs(n.z-e.z)<.9&&Math.abs(n.y+.5-e.y)<1.4){e.alive=!1,n.coins++,this.emit("coin",e.x,e.y,e.z,n.coins,n.id);break}}}for(const e of this.items)if(e.alive){if(e.t+=t,e.tile.state>=ci){e.y=.9+e.tile.y,e.tile.y<-20&&(e.alive=!1);continue}for(const n of this.chars)if(!(!n.alive||n.falling)&&Math.abs(n.x-e.x)<1&&Math.abs(n.z-e.z)<1&&Math.abs(n.y+.6-e.y)<1.5){e.alive=!1,this.givePower(n,e.kind);break}}}givePower(t,e){if(t.pickups++,this.emit("power",t.x,t.y+1,t.z,0,t.id,-1,e),e==="shock"){this.emit("shock",t.x,t.y+.3,t.z,1,t.id);for(const n of this.chars){if(n===t||!n.alive||n.falling)continue;const i=n.x-t.x,r=n.z-t.z,a=Dt(i,r);if(a>5.5||Math.abs(n.y-t.y)>2.5)continue;const o=er(13,6,a/5.5),l=a||1;this.hit(n,i/l*o,6.5,r/l*o,.65,"shock",.8,t.id)}return}t.power=e,t.powerT=Bf[e]}direct(){const t=this.rng,e=this.t;if(e>=this.nextBalls){const n=1+Math.floor(this.intensity*2.2+t.next()*.8);for(let i=0;i<n;i++)this.launchBall(i*.45);this.emit("alarm",0,0,0,0,-1,-1,"balls"),this.nextBalls=e+er(11,5,this.intensity)*t.range(.8,1.2)}if(e>=this.nextWall&&(this.launchWall(),this.emit("alarm",0,0,0,0,-1,-1,"wall"),this.nextWall=e+er(17,9,this.intensity)*t.range(.85,1.2)),this.wave<this.waves.length&&e>=this.waves[this.wave]&&(this.wave++,this.collapse(Math.round(this.startTiles*.14),2.2),this.emit("alarm",0,0,0,this.wave,-1,-1,"floor")),!this.sudden&&e>=this.suddenAt&&(this.sudden=!0,this.suddenNext=e,this.emit("alarm",0,0,0,0,-1,-1,"sudden")),this.sudden&&e>=this.suddenNext){const n=this.arena.tiles.filter(i=>i.state===tn).length;e>104?this.collapse(n,1.2):n>2&&this.collapse(n>14?2:1,1.6),this.suddenNext=e+er(1.1,.55,Pe((e-this.suddenAt)/25,0,1))}if(e>=this.nextItem&&(this.spawnItem(),this.nextItem=e+t.range(6,9)),e>=this.nextCoins){for(let n=0;n<5;n++)this.spawnCoin();this.nextCoins=e+7}}collapse(t,e){const n=this.arena.tiles.filter(a=>a.state===tn);n.sort((a,o)=>o.prio-a.prio);const i=this.sudden?0:7,r=Math.min(t,Math.max(0,n.length-i));for(let a=0;a<r;a++)this.arena.warn(n[a],e+this.rng.range(0,.5));r&&this.emit("crumble",0,0,0,r)}launchBall(t){const e=this.balls.find(m=>m.state===0);if(!e)return;const n=this.rng,i=this.arena,r=n.range(0,Math.PI*2),a=Math.cos(r),o=Math.sin(r);let l;this.built.ballRing?l=n.range(this.built.ballRing[0],this.built.ballRing[1])*n.pick([-1,1]):l=n.range(-.55,.55)*i.spread;const c=i.cx-o*l,h=i.cz+a*l;let f=c,u=h,d=!1;for(let m=i.spread+2;m>-i.spread;m-=.7){const p=c-a*m,M=h-o*m;if(i.safeAt(p,M)){f=p+a*.8,u=M+o*.8,d=!0;break}}if(!d)return;const g=this.intensity>.5&&n.chance(.3),v=n.range(8.5,11.5)*(1+this.intensity*.25);e.launch(f,u,f+a*i.spread*2.4,u+o*i.spread*2.4,v,1.5+t,g)}launchWall(){const t=this.walls.find(f=>f.state===0);if(!t)return;const e=this.rng,n=this.built.wallZones.filter(f=>this.arena.tiles.some(u=>u.state===tn&&Dt(u.x-f.x,u.z-f.z)<f.r));if(!n.length)return;const i=e.pick(n),r=e.range(0,Math.PI*2),a=Math.cos(r),o=Math.sin(r),l=e.range(-.3,.3)*i.r,c=i.x-a*(i.r-.5)-o*l,h=i.z-o*(i.r-.5)+a*l;t.launch(c,h,a,o,i.r*2+1,e.range(3.2,4.4),this.built.wallLen,1.8)}eliminate(){const t=[];for(const e of this.chars)e.alive&&e.falling&&e.y<C_&&t.push(e);if(t.length){t.sort((e,n)=>e.y-n.y);for(const e of t){if(this.phase!=="play")continue;if(this.alive===1){this.finish(e);return}e.alive=!1,e.place=this.alive,e.outAt=this.t,this.alive--,this.order.push(e);let n=-1;if(e.lastHitBy>=0&&this.t-e.lastHitT<5){const i=this.chars[e.lastHitBy];i&&i!==e&&(i.kos++,n=i.id)}this.emit("out",e.x,e.y,e.z,e.place,e.id,n,this.t-e.srcT<4?e.hitSource:"")}if(this.alive<=1&&this.phase==="play"){const e=this.chars.find(n=>n.alive)||this.order[this.order.length-1];this.finish(e)}}}finish(t){this.winner=t,t.place=1,t.outAt=this.t,this.phase="end",this.emit("win",t.x,t.y,t.z,0,t.id)}danger(t,e){let n=0;for(const i of this.hammers)n+=i.danger(t,e);for(const i of this.sweepers)n+=i.danger(t,e);for(const i of this.balls)n+=i.danger(t,e);for(const i of this.walls)n+=i.danger(t,e);for(const i of this.bumpers)n+=i.danger(t,e);return n}}const vu=new ie,_u=new Yn,Mu=new mn,Ko=new I,yu=new I;function At(s,t,e={}){const n=s.index?s.toNonIndexed():s.clone();s.dispose(),Mu.set(...e.r||[0,0,0]),_u.setFromEuler(Mu);const i=e.s===void 0?1:e.s;typeof i=="number"?Ko.set(i,i,i):Ko.set(...i),yu.set(...e.p||[0,0,0]),vu.compose(yu,_u,Ko),n.applyMatrix4(vu);const r=new Ft(t),a=n.attributes.position.count,o=new Float32Array(a*3);for(let l=0;l<a;l++)o[l*3]=r.r,o[l*3+1]=r.g,o[l*3+2]=r.b;n.setAttribute("color",new Ge(o,3));for(const l of Object.keys(n.attributes))l!=="position"&&l!=="normal"&&l!=="color"&&n.deleteAttribute(l);return n}function Ce(s){let t=0;for(const o of s)t+=o.attributes.position.count;const e=new Float32Array(t*3),n=new Float32Array(t*3),i=new Float32Array(t*3);let r=0;for(const o of s){const l=o.attributes.position.count*3;e.set(o.attributes.position.array,r),o.attributes.normal&&n.set(o.attributes.normal.array,r),i.set(o.attributes.color.array,r),r+=l,o.dispose()}const a=new Be;return a.setAttribute("position",new Ge(e,3)),a.setAttribute("normal",new Ge(n,3)),a.setAttribute("color",new Ge(i,3)),a.computeBoundingSphere(),a}function V_(s,t){const e=s.index?s.toNonIndexed():s;e!==s&&s.dispose();const n=e.attributes.position,i=new Float32Array(n.count*3),r=new Ft;for(let a=0;a<n.count;a+=3){const o=(n.getX(a)+n.getX(a+1)+n.getX(a+2))/3,l=(n.getY(a)+n.getY(a+1)+n.getY(a+2))/3,c=(n.getZ(a)+n.getZ(a+1)+n.getZ(a+2))/3;r.set(t(o,l,c));for(let h=0;h<3;h++)i[(a+h)*3]=r.r,i[(a+h)*3+1]=r.g,i[(a+h)*3+2]=r.b}e.setAttribute("color",new Ge(i,3));for(const a of Object.keys(e.attributes))a!=="position"&&a!=="normal"&&a!=="color"&&e.deleteAttribute(a);return e}function en(s,t,e={}){const n=At(s,16777215,e);return V_(n,t)}function kf(s="rgba(0,0,0,0.55)",t="rgba(0,0,0,0)",e=64){const n=document.createElement("canvas");n.width=n.height=e;const i=n.getContext("2d"),r=i.createRadialGradient(e/2,e/2,0,e/2,e/2,e/2);r.addColorStop(0,s),r.addColorStop(.6,s.replace(/[\d.]+\)$/,o=>String(parseFloat(o)*.6)+")")),r.addColorStop(1,t),i.fillStyle=r,i.fillRect(0,0,e,e);const a=new df(n);return a.colorSpace=qe,a}function Hr(s,t,e,n=!1){const i=document.createElement("canvas");i.width=s,i.height=t,e(i.getContext("2d"));const r=new df(i);return r.colorSpace=qe,n&&(r.wrapS=r.wrapT=La),r.anisotropy=4,r}const Hf={bowl:{name:["Sunny Splash","Солнечный всплеск"],skyTop:"#3d9cff",skyBottom:"#c9ecff",fog:"#bfe4ff",water:"#25b7d9",tiles:["#ffcf4a","#ff8f5e","#62d6a8"],hemiSky:"#e6f4ff",hemiGround:"#9a7b5a",sun:"#fff4dc"},isles:{name:["Candy Isles","Конфетные острова"],skyTop:"#ff8fcf",skyBottom:"#ffe8f4",fog:"#ffd6ea",water:"#a77dff",tiles:["#ffffff","#7fdcff","#ff9ad5"],hemiSky:"#fff0f8",hemiGround:"#a47bc9",sun:"#fff0e0"},donut:{name:["Sunset Spin","Закатная карусель"],skyTop:"#33246e",skyBottom:"#ff9a62",fog:"#e98e72",water:"#36479c",tiles:["#ffd166","#ef5f86","#2fd6a6"],hemiSky:"#ffd9c2",hemiGround:"#5a3d7a",sun:"#ffd2a6"}},Su=new ie().makeScale(0,0,0),ys=new ie,nr=new Yn,Jo=new mn,Ss=new I,ir=new I(1,1,1),sr=new Ft,W_=new Ft("#ff2a2a"),X_=new Ft("#ffffff");function q_(){const s=new oe(Xn*.965,Xn*.86,1.1,6,1);s.translate(0,-.55,0);const t=s.toNonIndexed();s.dispose();const e=t.attributes.position,n=new Float32Array(e.count*3);for(let i=0;i<e.count;i++){const r=e.getY(i),a=r>-.01?1:.55+(r+1.1)*.3;n[i*3]=n[i*3+1]=n[i*3+2]=a}return t.setAttribute("color",new Ge(n,3)),t.deleteAttribute("uv"),t}function $_(){const s=new oe(Xn*.8,Xn*.8,.06,6,1);return s.translate(0,0,0),s}class Y_{constructor(t,e){S(this,"scene");S(this,"group",new fn);S(this,"sky");S(this,"water");S(this,"waterTex");S(this,"hemi");S(this,"sun");S(this,"tiles",null);S(this,"tops",null);S(this,"pads",[]);S(this,"spinners",[]);S(this,"bobbers",[]);S(this,"clouds",null);S(this,"cloudData",[]);S(this,"arena",null);S(this,"palette",[]);S(this,"quality");S(this,"t",0);S(this,"lastVersion",-1);this.scene=t,this.quality=e;const n=new In({side:nn,depthWrite:!1,fog:!1,uniforms:{top:{value:new Ft},bottom:{value:new Ft}},vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4+0.25,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h*h*(3.0-2.0*h)),1.0); }"});if(this.sky=new re(new ye(420,24,12),n),this.sky.renderOrder=-10,t.add(this.sky),this.waterTex=Hr(128,128,i=>{i.fillStyle="#ffffff",i.fillRect(0,0,128,128),i.strokeStyle="rgba(0,40,90,0.13)",i.lineWidth=5;for(let r=0;r<4;r++){i.beginPath();for(let a=0;a<=128;a+=4)i.lineTo(a,16+r*32+Math.sin(a/128*Math.PI*2)*6);i.stroke()}},!0),this.waterTex.repeat.set(60,60),this.water=new re(new li(900,900).rotateX(-Math.PI/2),new an({map:this.waterTex})),this.water.position.y=-34,t.add(this.water),this.hemi=new Tc(16777215,8939076,1.6),t.add(this.hemi),this.sun=new Rc(16777215,2.2),this.sun.position.set(-18,34,14),e>=2){this.sun.castShadow=!0,this.sun.shadow.mapSize.set(1024,1024);const i=this.sun.shadow.camera;i.left=i.bottom=-26,i.right=i.top=26,i.near=1,i.far=90,this.sun.shadow.bias=-.0015}t.add(this.sun),t.add(this.sun.target),t.add(this.group)}build(t,e,n){this.clear(),this.arena=e;const i=Hf[t],r=this.sky.material;r.uniforms.top.value.set(i.skyTop),r.uniforms.bottom.value.set(i.skyBottom),this.scene.fog=new _c(i.fog,70,300),this.scene.background=new Ft(i.fog),this.water.material.color.set(i.water),this.hemi.color.set(i.hemiSky),this.hemi.groundColor.set(i.hemiGround),this.sun.color.set(i.sun),this.palette=i.tiles.map(o=>new Ft(o));const a=e.tiles.length;this.tiles=new Ci(q_(),new an({vertexColors:!0}),a),this.tops=new Ci($_(),new an({color:16777215}),a);for(const o of[this.tiles,this.tops])o.instanceMatrix.setUsage(Ir),o.receiveShadow=this.quality>=2,o.frustumCulled=!1,this.group.add(o);for(const o of e.tiles){const l=this.palette[o.shade%3];sr.copy(l).offsetHSL(0,0,(o.q*7+o.r*13)%3*.025-.02),this.tiles.setColorAt(o.i,sr),this.tops.setColorAt(o.i,sr.clone().lerp(new Ft("#ffffff"),.28))}for(const o of e.tiles){if(o.kind!==Ns)continue;const l=Ce([At(new dn(1.05,.14,6,24),"#ffffff",{p:[0,.08,0],r:[Math.PI/2,0,0]}),At(new hn(.5,.9,3),"#ffffff",{p:[0,.1,.25],r:[Math.PI/2,0,0],s:[1,1,.3]}),At(new bn(.3,.08,.7),"#ffffff",{p:[0,.1,-.35]})]),c=new re(l,new pn({color:4063152,vertexColors:!0}));c.position.set(o.x,0,o.z),c.rotation.y=Math.atan2(o.tx-o.x,o.tz-o.z),this.pads.push(c),this.group.add(c)}this.scenery(t,n),this.lastVersion=-1,this.updateTiles(0,!0)}scenery(t,e){const n=(c,h,f,u,d=0,g=1,v)=>{const m=new re(c,v||new an({vertexColors:!0}));return m.position.set(h,f,u),m.rotation.y=d,m.scale.setScalar(g),this.group.add(m),m},i=(c,h,f,u)=>{const d=e.range(0,Math.PI*2);for(let g=0;g<c;g++){const v=d+g/c*Math.PI*2+e.range(-.2,.2),m=e.range(h,f);u(Math.cos(v)*m,Math.sin(v)*m,v,g)}},r=(c,h)=>Ce([At(new hn(4,7,7),h,{p:[0,-3.6,0],r:[Math.PI,0,0]}),At(new oe(4.2,4,.8,7),c,{p:[0,.2,0]})]);if(t==="bowl"){const c=()=>Ce([At(new oe(.25,.4,5,6),"#a0703f",{p:[0,2.5,0],r:[0,0,.12]}),...[0,1,2,3,4].map(h=>At(new hn(.7,3.2,4),"#3cbf5a",{p:[Math.cos(h*1.26)*1.3+.3,5,Math.sin(h*1.26)*1.3],r:[Math.sin(h*1.26)*1.2,0,-Math.cos(h*1.26)*1.2]}))]);i(7,48,80,(h,f,u)=>{const d=e.range(-14,6);n(r("#5fd16b","#b58a5e"),h,d,f,u,e.range(1,1.8)),n(c(),h+1,d+.6,f,u,e.range(1,1.4))}),i(5,40,90,(h,f,u,d)=>{const g=["#ff5d5d","#ffd93d","#4fb8ff","#ff8fd0","#62d6a8"],v=Ce([en(new ye(3,12,10),p=>Math.floor((Math.atan2(p,1)+2)*3)%2?g[d%5]:"#ffffff",{s:[1,1.2,1]}),At(new oe(.9,.7,1,6),"#8a5a2b",{p:[0,-5,0]})]),m=n(v,h,e.range(8,26),f);this.bobbers.push({o:m,y:m.position.y,k:e.range(0,6)})}),n(new ye(16,20,12),-150,110,-260,0,1,new pn({color:16774064,fog:!1}))}else if(t==="isles")i(9,45,85,(c,h,f,u)=>{const d=e.range(-12,10);if(u%3===0){const g=Ce([At(new oe(.3,.3,12,6),"#ffffff",{p:[0,6,0]}),en(new oe(4,4,.9,20),(m,p,M)=>Math.floor((Math.atan2(M,m)+Math.hypot(m,M)*.9)*1.6)%2?"#ff4fa3":"#ffffff",{p:[0,14,0],r:[Math.PI/2,0,0]})]),v=n(g,c,d-6,h,f+Math.PI/2,e.range(1,1.6));this.spinners.push(v)}else if(u%3===1){const g=Ce([At(new dn(4,1.8,8,16),"#f2b46d"),en(new dn(4,1.85,8,16,Math.PI*2),(m,p,M)=>M>.4?"#ff8fcf":"#f2b46d")]),v=n(g,c,d+6,h,f,e.range(.9,1.5));v.rotation.x=e.range(-.5,.5),this.bobbers.push({o:v,y:v.position.y,k:e.range(0,6)})}else{const g=Ce([At(new oe(3,2.2,3,10),"#ffb3d9",{p:[0,1.5,0]}),At(new ye(3.2,12,8,0,Math.PI*2,0,Math.PI/2),"#fff4fb",{p:[0,3,0]}),At(new ye(.8,8,6),"#ff3355",{p:[0,6.3,0]})]);n(r("#ffd1ea","#c99bff"),c,d,h,f,1.3),n(g,c,d+.6,h,f,1.2)}});else{const c=new fn,h=[At(new dn(16,.5,6,40),"#ffe9a8")];for(let g=0;g<12;g++){const v=g/12*Math.PI*2;h.push(At(new oe(.18,.18,16,4),"#ffe9a8",{p:[Math.cos(v)*8,Math.sin(v)*8,0],r:[0,0,v+Math.PI/2]})),h.push(At(new bn(2.2,2,1.8),["#ef5f86","#2fd6a6","#ffd166","#6c8cff"][g%4],{p:[Math.cos(v)*16,Math.sin(v)*16-1.4,0]}))}const f=new re(Ce(h),new an({vertexColors:!0}));c.add(f),c.position.set(-70,4,-60),c.rotation.y=.8,this.group.add(c),this.spinners.push(f);const u=Ce([At(new oe(.6,.8,30,6),"#8f6bb3",{p:[-5,-11,0],r:[0,0,-.25]}),At(new oe(.6,.8,30,6),"#8f6bb3",{p:[5,-11,0],r:[0,0,.25]})]);n(u,-70,4,-60,.8),i(7,50,85,(g,v,m)=>{const p=e.range(-12,4);n(r("#7a5cc4","#4a3470"),g,p,v,m,1.4);const M=Ce([en(new oe(3,3,3,12),(E,y,w)=>Math.floor((Math.atan2(w,E)+4)*2)%2?"#ef5f86":"#fff2d6",{p:[0,1.5,0]}),en(new hn(3.6,3,12),(E,y,w)=>Math.floor((Math.atan2(w,E)+4)*2)%2?"#ef5f86":"#fff2d6",{p:[0,4.5,0]}),At(new ye(.4,6,4),"#ffd166",{p:[0,6.2,0]})]);n(M,g,p+.6,v,m,1.2)});const d=[];for(let g=0;g<60;g++){const v=e.range(0,Math.PI*2),m=e.range(.35,1.2);d.push(At(new Qa(e.range(.6,1.4)),"#fff6d8",{p:[Math.cos(v)*Math.cos(m)*380,Math.sin(m)*380,Math.sin(v)*Math.cos(m)*380]}))}n(Ce(d),0,0,0,0,1,new pn({vertexColors:!0,fog:!1}))}const a=Ce([At(new Ln(2.4,1),"#ffffff",{p:[0,0,0]}),At(new Ln(1.8,1),"#ffffff",{p:[2.3,-.3,.3]}),At(new Ln(1.6,1),"#ffffff",{p:[-2.2,-.4,-.2]}),At(new Ln(1.5,1),"#ffffff",{p:[.5,1.2,.6]})]),o=this.quality>=1?26:12,l=t==="isles"?"#ffe3f3":t==="donut"?"#ffc7b0":"#ffffff";this.clouds=new Ci(a,new an({color:l,vertexColors:!0}),o),this.clouds.frustumCulled=!1,this.cloudData=[];for(let c=0;c<o;c++){const h=e.range(0,Math.PI*2),f=e.range(36,140);this.cloudData.push({x:Math.cos(h)*f,y:e.range(-28,20),z:Math.sin(h)*f,s:e.range(1.2,3.2),v:e.range(.4,1.4)})}this.group.add(this.clouds)}clear(){this.group.traverse(t=>{const e=t;e.geometry&&e.geometry.dispose();const n=e.material;Array.isArray(n)?n.forEach(i=>i.dispose()):n&&n.dispose(),t.isInstancedMesh&&t.dispose()}),this.group.clear(),this.tiles=this.tops=null,this.pads=[],this.spinners=[],this.bobbers=[],this.clouds=null}updateTiles(t,e=!1){const n=this.arena;if(!n||!this.tiles||!this.tops)return;this.t+=t;let i=!1;for(const a of n.tiles){if(!e&&a.state===0&&this.lastVersion===n.version)continue;if(a.state===tc){this.tiles.setMatrixAt(a.i,Su),this.tops.setMatrixAt(a.i,Su);continue}let o=a.x,l=a.y,c=a.z;if(Jo.set(0,0,0),a.state===Rn){const h=Math.max(0,1-a.t/2.4);o+=Math.sin(this.t*50+a.i)*.06*(.3+h),c+=Math.cos(this.t*47+a.i)*.06*(.3+h),l+=Math.sin(this.t*60+a.i*3)*.03*h-h*.12;const f=Math.sin(this.t*(7+h*20))>0;sr.copy(f?W_:X_).lerp(this.palette[a.shade%3],f?.1:.45-h*.3),this.tops.setColorAt(a.i,sr),i=!0}else a.state===ci&&Jo.set(a.t*a.spin*1.4,0,a.t*a.spin);nr.setFromEuler(Jo),Ss.set(o,l,c),ys.compose(Ss,nr,ir),this.tiles.setMatrixAt(a.i,ys),Ss.set(o,l+.01,c),ys.compose(Ss,nr,ir),this.tops.setMatrixAt(a.i,ys)}this.lastVersion=n.version,this.tiles.instanceMatrix.needsUpdate=!0,this.tops.instanceMatrix.needsUpdate=!0,i&&this.tops.instanceColor&&(this.tops.instanceColor.needsUpdate=!0);let r=0;for(const a of n.tiles){if(a.kind!==Ns)continue;const o=this.pads[r++];if(!o)break;o.position.y=a.y,o.visible=a.state!==tc;const l=1+Math.sin(this.t*6)*.06;o.scale.set(l,1,l)}}update(t){this.updateTiles(t),this.waterTex.offset.x+=t*.004,this.waterTex.offset.y+=t*.002;for(const e of this.spinners)e.rotation.z+=t*.12;for(const e of this.bobbers)e.o.position.y=e.y+Math.sin(this.t*.6+e.k)*1.2;if(this.clouds){for(let e=0;e<this.cloudData.length;e++){const n=this.cloudData[e];n.x+=n.v*t,n.x>150&&(n.x=-150),Ss.set(n.x,n.y,n.z),ir.set(n.s,n.s*.7,n.s),nr.identity(),ys.compose(Ss,nr,ir),this.clouds.setMatrixAt(e,ys)}ir.set(1,1,1),this.clouds.instanceMatrix.needsUpdate=!0}}follow(t,e){this.sun.position.set(t-18,34,e+14),this.sun.target.position.set(t,0,e)}}const Oi=()=>new Ds({vertexColors:!0,shininess:50,specular:3355443});function Z_(){return Ce([en(new oe(1,1,2.7,16),(s,t)=>Math.abs(t)>1.05?"#ffd23f":Math.abs(t)>.75?"#2b2d42":"#ef3e5c",{r:[Math.PI/2,0,0]}),At(new oe(.75,.75,2.9,16),"#ffffff",{r:[Math.PI/2,0,0]})])}function K_(){return Hr(64,128,s=>{s.fillStyle="#ff3b2f",s.beginPath(),s.roundRect(4,4,56,120,18),s.fill(),s.strokeStyle="#ffffff",s.lineWidth=6,s.stroke(),s.fillStyle="#ffffff",s.fillRect(24,18,16,64),s.fillRect(24,94,16,16)})}function J_(){return Hr(64,64,s=>{s.fillStyle="#ff2d2d",s.fillRect(0,0,64,64),s.fillStyle="#ffe14d",s.beginPath(),s.moveTo(0,0),s.lineTo(32,0),s.lineTo(64,32),s.lineTo(64,64),s.closePath(),s.fill(),s.beginPath(),s.moveTo(0,32),s.lineTo(32,64),s.lineTo(0,64),s.closePath(),s.fill()},!0)}function Q_(){return Hr(64,64,s=>{s.clearRect(0,0,64,64),s.fillStyle="rgba(255,60,40,0.95)",s.beginPath(),s.moveTo(8,6),s.lineTo(32,30),s.lineTo(56,6),s.lineTo(56,26),s.lineTo(32,50),s.lineTo(8,26),s.closePath(),s.fill()},!0)}const bu=new I;function wu(s,t){const e=s.material,n=Math.max(.18,Math.min(1,(t-2.5)/4)),i=n<.99;e.transparent!==i&&(e.transparent=i,e.depthWrite=!i,e.needsUpdate=!0),e.opacity=n}class j_{constructor(t){S(this,"group",new fn);S(this,"hammers",[]);S(this,"sweepers",[]);S(this,"balls",[]);S(this,"walls",[]);S(this,"bumpers",[]);S(this,"bangTex",K_());S(this,"stripeTex",J_());S(this,"arrowTex",Q_());S(this,"quality");S(this,"t",0);S(this,"shadowTex",null);this.quality=t}build(t,e){this.clear(),this.shadowTex=e;const n=this.quality>=2,i=new Mc({map:this.bangTex,depthTest:!1,transparent:!0});for(const h of t.hammers){const f=new fn;f.position.set(h.px,h.py,h.pz),f.rotation.y=Math.atan2(-h.dz,h.dx);const u=new re(Ce([At(new Ln(1.3,1),"#ffffff",{p:[0,.9,0],s:[1.6,.9,1.1]}),At(new Ln(.9,1),"#f3f7ff",{p:[1.3,.7,0]}),At(new Ln(.9,1),"#f3f7ff",{p:[-1.3,.7,0]}),At(new oe(.55,.55,.5,8),"#6c7a89",{r:[Math.PI/2,0,0]})]),Oi());f.add(u);const d=new fn,g=new re(At(new oe(.16,.16,h.L,6),"#8d99ae",{p:[0,-h.L/2,0]}),Oi()),v=new re(Z_(),Oi());v.position.y=-h.L,v.castShadow=n,d.add(g,v),f.add(d);const m=new hf(i);m.scale.set(1.1,2.2,1),m.position.set(0,2.8,0),m.visible=!1,f.add(m),this.group.add(f),this.hammers.push({h,pivot:f,swing:d,bang:m,anchor:u,head:v})}for(const h of t.sweepers){const f=h.hubR>1.5,u=new re(Ce([en(new oe(h.hubR,h.hubR*1.1,f?40:1.8,16),(m,p)=>Math.floor((p+40)*(f?.4:2.5))%2?"#ffffff":"#ef3e5c",{p:[0,f?-18.8:.9,0]}),At(new ye(h.hubR*1.05,16,8,0,Math.PI*2,0,Math.PI/2),"#ffd23f",{p:[0,f?1.2:1.8,0]})]),Oi());u.position.set(h.cx,0,h.cz),u.castShadow=n,this.group.add(u);const d=new fn;d.position.set(h.cx,h.barY,h.cz);const g=[];for(let m=0;m<h.arms;m++){const p=m/h.arms*Math.PI*2,M=en(new oe(h.barR,h.barR,h.L-h.hubR,10),(E,y)=>Math.floor((y+50)*.8)%2?"#2ec4ff":"#ffffff",{p:[Math.cos(p)*(h.hubR+(h.L-h.hubR)/2),0,Math.sin(p)*(h.hubR+(h.L-h.hubR)/2)],r:[0,-p,Math.PI/2]});g.push(M),g.push(At(new ye(h.barR*1.5,10,8),"#ffd23f",{p:[Math.cos(p)*h.L,0,Math.sin(p)*h.L]}))}const v=new re(Ce(g),Oi());v.castShadow=n,d.add(v),this.group.add(d),this.sweepers.push({s:h,arms:d})}const r=en(new Ln(1,2),(h,f,u)=>{const d=Math.atan2(u,h);return Math.abs(f)>.82?"#ffffff":["#ff4d6d","#ffd23f","#3fa9ff","#3ddc97","#ff8f3d","#b45cff"][Math.floor((d+Math.PI)/(Math.PI*2)*6)%6]}),a=()=>{const h=this.arrowTex.clone();return h.needsUpdate=!0,new pn({map:h,transparent:!0,depthWrite:!1,opacity:.9})},o=new pn({map:e,transparent:!0,depthWrite:!1});for(const h of t.balls){const f=new re(r,Oi());f.castShadow=n,f.visible=!1;const u=new re(new li(1,1).rotateX(-Math.PI/2),a());u.visible=!1,u.renderOrder=2;const d=new re(new li(1,1).rotateX(-Math.PI/2),o);d.visible=!1,d.renderOrder=1,this.group.add(f,u,d),this.balls.push({b:h,m:f,lane:u,shadow:d})}const l=new an({map:this.stripeTex});for(const h of t.walls){const f=new re(new bn(1,1,1),l);f.castShadow=n,f.visible=!1;const u=new re(new bn(1,1,1),new an({color:16777215}));f.add(u),u.position.set(.55,0,0),u.scale.set(.15,.8,.98);const d=new re(new li(1,1).rotateX(-Math.PI/2),a());d.visible=!1,d.renderOrder=2,this.group.add(f,d),this.walls.push({w:h,m:f,path:d})}const c=Ce([At(new oe(.45,.6,.7,12),"#fff3e3",{p:[0,.35,0]}),en(new ye(.95,16,10,0,Math.PI*2,0,Math.PI/2),(h,f,u)=>(Math.round(h*2.2)+Math.round(u*2.2))%2===0&&f>.3?"#ffffff":"#ff3d7f",{p:[0,.65,0],s:[1,.75,1]})]);for(const h of t.bumpers){const f=new re(c,Oi());f.position.set(h.x,0,h.z),f.castShadow=n,this.group.add(f),this.bumpers.push({b:h,m:f})}}clear(){const t=new Set;this.group.traverse(e=>{const n=e;n.geometry&&!t.has(n.geometry)&&(t.add(n.geometry),n.geometry.dispose());const i=n.material;if(i&&!t.has(i)){t.add(i);const r=i.map;r&&r!==this.arrowTex&&r!==this.stripeTex&&r!==this.bangTex&&r!==this.shadowTex&&!t.has(r)&&(t.add(r),r.dispose()),i.dispose()}}),this.group.clear(),this.hammers=[],this.sweepers=[],this.balls=[],this.walls=[],this.bumpers=[]}update(t,e,n){this.t+=t;for(const i of this.hammers)i.swing.rotation.z=i.h.theta,n&&(wu(i.anchor,i.pivot.position.distanceTo(n)),i.head.getWorldPosition(bu),wu(i.head,bu.distanceTo(n))),i.bang.visible=i.h.state===1,i.bang.visible&&i.bang.scale.set(1.1+Math.sin(this.t*20)*.15,2.2+Math.sin(this.t*20)*.3,1);for(const i of this.sweepers)i.arms.rotation.y=-i.s.ang;for(const i of this.balls){const r=i.b;if(i.m.visible=r.state===2,i.lane.visible=r.state===1||r.state===2&&!r.landed,i.lane.visible){const o=r.ex-r.sx,l=r.ez-r.sz,c=Math.hypot(o,l);i.lane.position.set((r.sx+r.ex)/2,.06,(r.sz+r.ez)/2),i.lane.rotation.y=Math.atan2(o,l),i.lane.scale.set(r.R*1.6,1,c);const h=i.lane.material;h.map.repeat.set(1,c/(r.R*1.6)),h.map.offset.y=-this.t*2,h.opacity=.55+Math.sin(this.t*16)*.35}i.m.visible&&(i.m.position.set(r.x,r.y,r.z),i.m.scale.setScalar(r.R),i.m.rotation.set(r.rollX,0,r.rollZ));const a=r.state===2&&r.y>r.R-.1&&e.arena.groundAt(r.x,r.z)===0;if(i.shadow.visible=a,a){i.shadow.position.set(r.x,.04,r.z);const o=Math.max(.6,2.6-(r.y-r.R)*.1);i.shadow.scale.set(r.R*o,1,r.R*o)}}for(const i of this.walls){const r=i.w;i.m.visible=r.state>=2,i.path.visible=r.state===1||r.state===2;const a=Math.atan2(r.nx,r.nz);if(i.m.visible&&(i.m.position.set(r.cx,r.y+r.H/2,r.cz),i.m.rotation.y=a-Math.PI/2,i.m.scale.set(r.T,r.H,r.W),i.m.material.map.repeat.set(1,r.W/2)),i.path.visible){const o=r.dist;i.path.position.set(r.sx+r.nx*(o/2),.07,r.sz+r.nz*(o/2)),i.path.rotation.y=a,i.path.scale.set(r.W,1,o);const l=i.path.material;l.map.repeat.set(r.W/2.2,o/2.2),l.map.offset.y=-this.t*1.5,l.opacity=.4+Math.sin(this.t*14)*.3}}for(const i of this.bumpers){const r=i.b;i.m.position.y=r.tile.y,i.m.visible=r.tile.state!==3;const a=Math.sin(r.squash*Math.PI*3)*r.squash*.35;i.m.scale.set(1+a,1-a,1+a)}}}const tM=1.28;function Eu(s,t){const e=new Ka(s,t,3,8);return e.translate(0,-(t/2+s),0),e}function eM(s){const t=[];switch(s){case"propeller":{t.push(en(new ye(.44,16,8,0,Math.PI*2,0,Math.PI/2),(e,n,i)=>{const r=Math.atan2(i,e)+Math.PI;return["#ff4757","#ffd32a","#1e90ff","#2ed573"][Math.floor(r/(Math.PI*2)*4)%4]},{p:[0,.17,0],s:[1,.9,1]})),t.push(At(new oe(.025,.025,.14,6),"#555555",{p:[0,.62,0]})),t.push(At(new ye(.05,8,6),"#ffd32a",{p:[0,.7,0]})),t.push(At(new oe(.22,.22,.04,12,1,!1,-Math.PI/2,Math.PI),"#1e90ff",{p:[0,.2,.33],r:[.12,0,0],s:[1.1,1,1.15]}));break}case"party":{t.push(en(new hn(.22,.6,14),(e,n)=>Math.floor((n+.3)*8)%2?"#ff4fa3":"#ffe14d",{p:[.08,.62,0],r:[0,0,-.25]})),t.push(At(new ye(.08,8,6),"#3ddc97",{p:[.16,.92,0]}));break}case"beanie":{t.push(en(new ye(.45,16,8,0,Math.PI*2,0,Math.PI/2),(e,n)=>Math.floor(n*14)%2?"#e8414b":"#ff6b6b",{p:[0,.15,0],s:[1,1.05,1]})),t.push(At(new dn(.4,.07,6,18),"#ffffff",{p:[0,.17,0],r:[Math.PI/2,0,0]})),t.push(At(new ye(.14,10,8),"#ffffff",{p:[0,.64,0]}));break}case"cone":{t.push(en(new hn(.3,.75,16,1,!0),(e,n)=>n>-.05&&n<.12?"#ffffff":"#ff7b1c",{p:[0,.68,0]})),t.push(At(new bn(.72,.06,.72),"#ff7b1c",{p:[0,.32,0]}));break}case"chef":{t.push(At(new oe(.32,.32,.32,16),"#ffffff",{p:[0,.5,0]}));for(let e=0;e<5;e++){const n=e/5*Math.PI*2;t.push(At(new ye(.19,10,8),"#f7f7f7",{p:[Math.cos(n)*.18,.74,Math.sin(n)*.18]}))}t.push(At(new ye(.2,10,8),"#ffffff",{p:[0,.82,0]}));break}case"tophat":{t.push(At(new oe(.52,.52,.05,20),"#1b1b24",{p:[0,.33,0]})),t.push(At(new oe(.3,.32,.55,18),"#1b1b24",{p:[0,.62,0]})),t.push(At(new oe(.325,.325,.1,18),"#d1203a",{p:[0,.42,0]}));break}case"plunger":{t.push(At(new ye(.3,14,8,0,Math.PI*2,0,Math.PI/2),"#d62839",{p:[0,.28,0],s:[1,.8,1]})),t.push(At(new oe(.045,.045,.8,8),"#c68b59",{p:[0,.8,0]}));break}case"viking":{t.push(At(new ye(.45,16,8,0,Math.PI*2,0,Math.PI/2),"#9aa5b1",{p:[0,.15,0]})),t.push(At(new dn(.42,.05,6,18),"#c9a227",{p:[0,.17,0],r:[Math.PI/2,0,0]}));for(const e of[-1,1])t.push(At(new hn(.1,.42,8),"#f4ead5",{p:[e*.5,.45,0],r:[0,0,-e*.9]}));break}case"unicorn":{t.push(en(new hn(.09,.5,10),(e,n)=>Math.floor((n+.25)*14)%2?"#ffffff":"#ff9ad5",{p:[0,.48,.2],r:[.45,0,0]}));for(const e of[-1,1])t.push(At(new hn(.08,.16,6),"#ffd1ec",{p:[e*.27,.36,-.05],r:[0,0,-e*.4]}));break}case"banana":{t.push(At(new dn(.32,.1,8,14,Math.PI*.85),"#ffe135",{p:[-.02,.32,0],r:[0,0,.25]})),t.push(At(new oe(.035,.05,.12,6),"#6b4f2a",{p:[.33,.43,0],r:[0,0,-.5]}));break}case"crown":{t.push(At(new oe(.32,.3,.2,16,1,!0),"#ffc21a",{p:[0,.44,0]}));for(let e=0;e<6;e++){const n=e/6*Math.PI*2;t.push(At(new hn(.07,.18,6),"#ffc21a",{p:[Math.cos(n)*.3,.62,Math.sin(n)*.3]})),t.push(At(new ye(.045,6,4),e%2?"#e63946":"#3fa9ff",{p:[Math.cos(n)*.32,.45,Math.sin(n)*.32]}))}break}case"halo":{t.push(At(new dn(.3,.05,8,24),"#fff3a0",{p:[0,.72,0],r:[Math.PI/2,0,0]}));break}default:return null}return Ce(t)}const me=new ie,Mi=new ie,yi=new ie,vn=new ie,Tu=new Yn,Au=new mn,Ru=new I,Cu=new I,Si=new ie().makeScale(0,0,0),bs=new Ft;function sn(s,t,e,n,i,r,a,o=1,l=1,c=1){return Au.set(i,r,a,"YXZ"),Tu.setFromEuler(Au),Ru.set(t,e,n),Cu.set(o,l,c),s.compose(Ru,Tu,Cu)}class ec{constructor(t,e){S(this,"group",new fn);S(this,"cap");S(this,"slots",[]);S(this,"headYaw");S(this,"dt",0);S(this,"parts",{});S(this,"hats",{});S(this,"shadows");S(this,"marker");S(this,"t",0);this.cap=t,this.headYaw=new Float32Array(t);const n=(h=30)=>new Ds({color:16777215,shininess:h,specular:3355443}),i=()=>new an({color:16777215}),r=(h,f,u,d=t)=>{const g=new Ci(f,u,d);return g.instanceMatrix.setUsage(Ir),g.frustumCulled=!1,g.castShadow=e>=2,this.parts[h]=g,this.group.add(g),g},a=e>=1?1:.7;r("body",new Ka(.29,.28,4,Math.round(14*a)),n(40)),r("head",new ye(.42,Math.round(18*a),Math.round(14*a)),n(25)),r("eye",new ye(.135,12,8),n(80),t*2),r("pupil",new ye(.068,8,6),new pn({color:16777215}),t*2),r("mouth",new dn(.1,.03,6,12,Math.PI).rotateZ(Math.PI),i()),r("cheek",new ye(.07,8,6),i(),t*2),r("arm",Eu(.085,.28),n(30),t*2),r("hand",new ye(.1,8,6),n(30),t*2),r("leg",Eu(.1,.17),n(30),t*2),r("shoe",new ye(.13,10,6),n(60),t*2),r("blade",new bn(.62,.02,.1),i()),this.parts.blade.material=new an({color:16729943});const o=new Ds({vertexColors:!0,shininess:40,specular:2236962});for(const h of qi){const f=eM(h.id);if(!f)continue;const u=new Ci(f,o,t);u.instanceMatrix.setUsage(Ir),u.frustumCulled=!1,u.castShadow=e>=2,this.hats[h.id]=u,this.group.add(u)}const l=new pn({map:kf("rgba(20,10,40,0.42)"),transparent:!0,depthWrite:!1});this.shadows=new Ci(new li(1,1).rotateX(-Math.PI/2),l,t),this.shadows.frustumCulled=!1,this.shadows.renderOrder=1,this.group.add(this.shadows);const c=Ce([At(new hn(.22,.34,4),"#ffffff",{p:[0,0,0],r:[Math.PI,Math.PI/4,0]})]);this.marker=new re(c,new pn({color:8257359,vertexColors:!0})),this.marker.visible=!1,this.group.add(this.marker);for(let h=0;h<t;h++)this.slots.push({pose:null,hat:"none",hatIdx:0});for(const h of[...Object.values(this.parts),...Object.values(this.hats),this.shadows])for(let f=0;f<h.count;f++)h.setMatrixAt(f,Si)}setCast(t){const e={};for(let i=0;i<this.cap;i++){const r=t[i]||null,a=this.slots[i];a.pose=r,a.hat=r?r.look.hat:"none",a.hatIdx=e[a.hat]||0,e[a.hat]=a.hatIdx+1,r&&this.paint(i,r.look)}const n=Math.min(this.cap,t.length);for(const[i,r]of Object.entries(this.parts))r.count=["eye","pupil","cheek","arm","hand","leg","shoe"].includes(i)?n*2:n;for(const[i,r]of Object.entries(this.hats))r.count=e[i]||0;this.shadows.count=n;for(const i of Object.values(this.parts))i.instanceColor&&(i.instanceColor.needsUpdate=!0)}paint(t,e){const n=rl(e.skin),i=(r,a,o)=>this.parts[r].setColorAt(a,bs.set(o));i("body",t,n.suit),i("head",t,n.skin),i("mouth",t,"#5b1d2c"),i("blade",t,"#ff4757");for(const r of[0,1])i("eye",t*2+r,"#ffffff"),i("pupil",t*2+r,"#1a1423"),i("cheek",t*2+r,"#ff9aa8"),i("arm",t*2+r,n.trim),i("hand",t*2+r,n.skin),i("leg",t*2+r,n.pants),i("shoe",t*2+r,n.shoes);for(const r of Object.values(this.parts))r.instanceColor&&(r.instanceColor.needsUpdate=!0)}fx(t,e){const n=rl(e.skin);if(!n.fx)return;const i=this.parts.body;if(n.fx==="rainbow")i.setColorAt(t,bs.setHSL((this.t*.25+t*.13)%1,.85,.6));else if(n.fx==="galaxy")i.setColorAt(t,bs.set(n.suit).lerp(new Ft("#6a3cc9"),.5+Math.sin(this.t*2+t)*.5));else if(n.fx==="lava"){const r=.5+Math.sin(this.t*3+t)*.5;this.parts.arm.setColorAt(t*2,bs.set("#ff4d00").lerp(new Ft("#ffd000"),r)),this.parts.arm.setColorAt(t*2+1,bs),this.parts.arm.instanceColor.needsUpdate=!0}else n.fx==="gold"&&i.setColorAt(t,bs.set(n.suit).lerp(new Ft("#fff6c8"),Math.max(0,Math.sin(this.t*4+t*2))*.5));i.instanceColor.needsUpdate=!0}update(t,e){this.t+=t,this.dt=t;const n=this.parts;for(let i=0;i<this.cap;i++){const r=this.slots[i],a=r.pose,o=this.hats[r.hat];if(!a||a.gone){for(const c of["body","head","mouth","blade"])n[c].setMatrixAt(i,Si);for(const c of["eye","pupil","cheek","arm","hand","leg","shoe"])n[c].setMatrixAt(i*2,Si),n[c].setMatrixAt(i*2+1,Si);o&&o.setMatrixAt(r.hatIdx,Si),this.shadows.setMatrixAt(i,Si);continue}this.fx(i,a.look),this.pose(i,a,o,r.hatIdx);const l=e(a.x,a.z);if(l>-1/0&&a.y>-.5){const c=Math.max(0,a.y-l),h=Math.max(.35,1.25-c*.12);sn(me,a.x,l+.03,a.z,0,0,0,h,1,h),this.shadows.setMatrixAt(i,me)}else this.shadows.setMatrixAt(i,Si)}for(const i of Object.values(n))i.instanceMatrix.needsUpdate=!0;for(const i of Object.values(this.hats))i.instanceMatrix.needsUpdate=!0;this.shadows.instanceMatrix.needsUpdate=!0}pose(t,e,n,i){const r=this.parts,a=this.t+e.id*1.7,o=Math.min(1.4,e.speedNow/6.6),l=!e.grounded,c=e.stun>0,h=e.runPhase;let f=e.grounded?o*.16:0;e.dashT>0&&(f=.55);let u=0,d=f;c&&l?d+=e.spin:c&&(u=Math.sin(a*9)*.18),e.falling&&(d+=a*4,u=Math.sin(a*6)*.6);const g=e.grounded?Math.abs(Math.sin(h))*.07*o:0,v=e.power==="heavy"?1.28:1;let m=1,p=1;e.landT>0?(m=1-e.landT*1.4,p=1+e.landT*.9):l&&!c&&(m=1+Math.min(.15,Math.abs(e.vy)*.012),p=1/Math.sqrt(m));const M=o<.05&&e.grounded?Math.sin(a*2.2)*.02:0;sn(Mi,e.x,e.y+g,e.z,0,e.yaw,0,v*p,v*(m+M),v*p),(d||u)&&(me.makeTranslation(0,.75,0),Mi.multiply(me),sn(me,0,0,0,d,0,u),Mi.multiply(me),me.makeTranslation(0,-.75,0),Mi.multiply(me)),sn(me,0,.68,0,0,0,0,1.08,1,.92),r.body.setMatrixAt(t,vn.multiplyMatrices(Mi,me));const E=c?Math.sin(a*7)*.25:Math.sin(h)*.05*o;let y=0;e.lookX!==void 0&&Number.isFinite(e.lookX)&&e.lookZ!==void 0&&!c&&(y=Math.max(-1.15,Math.min(1.15,Pi(e.yaw,Math.atan2(e.lookX-e.x,e.lookZ-e.z))))),this.headYaw[t]+=(y-this.headYaw[t])*Math.min(1,this.dt*10);const w=e.mood||"";sn(me,0,tM,0,-f*.4+(w==="cheer"?-.2:0),this.headYaw[t],E),yi.multiplyMatrices(Mi,me),r.head.setMatrixAt(t,yi);const T=(a%3.7<.12?.15:1)*(c?1.15:1),C=l&&e.vy<-6||w==="scared"?1.25:1,_=w==="angry"?.55:1;for(const L of[0,1]){const N=L?1:-1;sn(me,N*.155,.07,.355,w==="angry"?N*0:0,N*.25,w==="angry"?-N*.35:0,C,1.15*T*C*_,.55),r.eye.setMatrixAt(t*2+L,vn.multiplyMatrices(yi,me));let B=Math.sin(a*.7+L)*.02,U=0;c?(B=Math.cos(a*14+L*3)*.045,U=Math.sin(a*14+L*3)*.045):l&&(U=e.vy>0?.035:-.03),sn(me,N*.155+B+N*.012,.07+U,.43,0,0,0,1,T,.6),r.pupil.setMatrixAt(t*2+L,vn.multiplyMatrices(yi,me)),sn(me,N*.27,-.09,.3,0,N*.6,0,1,.55,.4),r.cheek.setMatrixAt(t*2+L,vn.multiplyMatrices(yi,me))}let A=c||e.falling||l&&e.vy<-4||w==="scared"?2.6:e.dashT>0?1.8:1;w==="cheer"&&(A=1.7);const P=w==="cheer"?1.35:w==="angry"?.8:A>1?.75:1;if(sn(me,0,-.1,.39,-.3,0,w==="angry"?Math.PI:0,P,A>1?A*.9:w==="angry"?.6:1,.8),r.mouth.setMatrixAt(t,vn.multiplyMatrices(yi,me)),n&&n.setMatrixAt(i,yi),e.look.hat==="propeller"){const L=this.t*(l?30:6+o*18)+t;sn(me,0,.6,0,0,L,0),r.blade.setMatrixAt(t,vn.multiplyMatrices(yi,me))}else r.blade.setMatrixAt(t,Si);for(const L of[0,1]){const N=L?1:-1;let B=-Math.sin(h)*.9*o*N,U=N*(.18+o*.1);l&&(B=Math.sin(a*18+L)*.35,U=N*(2.3+Math.sin(a*20+L*2)*.35)),(c||e.falling)&&(B=a*14*N,U=N*1.6),e.dashT>0&&(B=1.4,U=N*.5),o<.05&&e.grounded&&!c&&(U=N*(.12+Math.sin(a*2.2)*.04)),w==="cheer"&&!c&&(B=Math.sin(a*12+L*2)*.35,U=N*(2.6+Math.sin(a*12+L)*.3)),sn(me,N*.31,.92,0,B,0,U),vn.multiplyMatrices(Mi,me),r.arm.setMatrixAt(t*2+L,vn),sn(me,0,-.46,0,0,0,0),r.hand.setMatrixAt(t*2+L,me.premultiply(vn))}for(const L of[0,1]){const N=L?1:-1;let B=Math.sin(h)*.95*o*N,U=0;l&&(B=c?Math.sin(a*16+L*2)*.8:-.5+Math.sin(a*16+L*2)*.25*N,U=N*.12),sn(me,N*.14,.46,0,B,0,U),vn.multiplyMatrices(Mi,me),r.leg.setMatrixAt(t*2+L,vn),sn(me,0,-.38,.05,0,0,0,1,.7,1.45),r.shoe.setMatrixAt(t*2+L,me.premultiply(vn))}}showMarker(t){if(!t||t.gone||t.falling){this.marker.visible=!1;return}this.marker.visible=!0,this.marker.position.set(t.x,t.y+2.3+Math.sin(this.t*4)*.1,t.z),this.marker.rotation.y=this.t*2}dispose(){for(const t of[...Object.values(this.parts),...Object.values(this.hats),this.shadows])t.geometry.dispose(),t.material.dispose(),t.dispose()}}const Ti={speed:"#22d3ee",shield:"#4f7bff",jump:"#3ddc5f",heavy:"#9b6bff",shock:"#ffcc1a",magnet:"#ff4757"},Gf={speed:["Speed!","Скорость!"],shield:["Shield!","Щит!"],jump:["Super jump!","Суперпрыжок!"],heavy:["Heavy!","Тяжеловес!"],shock:["Shockwave!","Ударная волна!"],magnet:["Coin magnet!","Магнит!"]};function Vf(s,t,e,n=!0){switch(s.save(),n&&(s.fillStyle=Ti[t],s.beginPath(),s.arc(e/2,e/2,e*.47,0,Math.PI*2),s.fill(),s.lineWidth=e*.06,s.strokeStyle="#ffffff",s.stroke()),s.fillStyle="#ffffff",s.strokeStyle="#ffffff",s.lineCap="round",s.lineJoin="round",s.translate(e/2,e/2),s.scale(e/100,e/100),s.beginPath(),t){case"speed":s.moveTo(8,-34),s.lineTo(-18,6),s.lineTo(0,6),s.lineTo(-8,34),s.lineTo(20,-8),s.lineTo(2,-8),s.closePath(),s.fill();break;case"shield":s.moveTo(0,-30),s.lineTo(24,-20),s.quadraticCurveTo(24,18,0,32),s.quadraticCurveTo(-24,18,-24,-20),s.closePath(),s.fill();break;case"jump":s.moveTo(0,-30),s.lineTo(22,-4),s.lineTo(8,-4),s.lineTo(8,26),s.lineTo(-8,26),s.lineTo(-8,-4),s.lineTo(-22,-4),s.closePath(),s.fill();break;case"heavy":s.moveTo(-24,26),s.lineTo(-16,-12),s.lineTo(16,-12),s.lineTo(24,26),s.closePath(),s.fill(),s.beginPath(),s.lineWidth=7,s.arc(0,-18,9,Math.PI,0),s.stroke();break;case"shock":for(let i=0;i<8;i++){const r=i/8*Math.PI*2,a=i%2?14:10;s.lineTo(Math.cos(r)*32,Math.sin(r)*32),s.lineTo(Math.cos(r+Math.PI/8)*a,Math.sin(r+Math.PI/8)*a)}s.closePath(),s.fill();break;case"magnet":s.lineWidth=15,s.arc(0,0,18,Math.PI,0,!0),s.moveTo(-18,0),s.lineTo(-18,-22),s.moveTo(18,0),s.lineTo(18,-22),s.stroke();break}s.restore()}const Pu=new Map;function nM(s,t=64){const e=s+t;let n=Pu.get(e);if(!n){const i=document.createElement("canvas");i.width=i.height=t,Vf(i.getContext("2d"),s,t),n=i.toDataURL(),Pu.set(e,n)}return n}const Wf=new ie().makeScale(0,0,0),Ha=new ie,Ga=new Yn,Va=new mn,Wa=new I,yr=new I,ws=new Ft;class Qo{constructor(t,e,n){S(this,"mesh");S(this,"n");S(this,"next",0);S(this,"live",0);S(this,"px");S(this,"py");S(this,"pz");S(this,"vx");S(this,"vy");S(this,"vz");S(this,"life");S(this,"max");S(this,"size");S(this,"grav");S(this,"drag");S(this,"spin");S(this,"rot");S(this,"flat");S(this,"cr");S(this,"cg");S(this,"cb");this.n=n,this.mesh=new Ci(t,e,n),this.mesh.instanceMatrix.setUsage(Ir),this.mesh.frustumCulled=!1;const i=()=>new Float32Array(n);this.px=i(),this.py=i(),this.pz=i(),this.vx=i(),this.vy=i(),this.vz=i(),this.life=i(),this.max=i(),this.size=i(),this.grav=i(),this.drag=i(),this.spin=i(),this.rot=i(),this.flat=new Uint8Array(n),this.cr=i(),this.cg=i(),this.cb=i(),this.mesh.count=0;for(let r=0;r<n;r++)this.mesh.setMatrixAt(r,Wf),this.mesh.setColorAt(r,ws.set(16777215))}add(t,e,n,i,r,a,o,l,c,h=0,f=1,u=0,d=!1){const g=this.next;this.next=(this.next+1)%this.n,this.px[g]=t,this.py[g]=e,this.pz[g]=n,this.vx[g]=i,this.vy[g]=r,this.vz[g]=a,this.life[g]=this.max[g]=o,this.size[g]=l,this.grav[g]=h,this.drag[g]=f,this.spin[g]=u,this.rot[g]=Math.random()*6,this.flat[g]=d?1:0,ws.set(c),this.cr[g]=ws.r,this.cg[g]=ws.g,this.cb[g]=ws.b}update(t){let e=0;for(let n=0;n<this.n;n++){if(this.life[n]<=0||(this.life[n]-=t,this.life[n]<=0))continue;const i=Math.exp(-this.drag[n]*t);this.vx[n]*=i,this.vz[n]*=i,this.vy[n]=this.vy[n]*i-this.grav[n]*t,this.px[n]+=this.vx[n]*t,this.py[n]+=this.vy[n]*t,this.pz[n]+=this.vz[n]*t,this.rot[n]+=this.spin[n]*t;const r=this.life[n]/this.max[n],a=this.size[n]*Math.min(1,(1-r)*8)*(.3+.7*r);Va.set(this.rot[n],this.rot[n]*.7,0),Ga.setFromEuler(Va),Wa.set(this.px[n],this.py[n],this.pz[n]),this.flat[n]?yr.set(a,a*.18,a*.6):yr.set(a,a,a),Ha.compose(Wa,Ga,yr),this.mesh.setMatrixAt(e,Ha),this.mesh.setColorAt(e,ws.setRGB(this.cr[n],this.cg[n],this.cb[n])),e++}this.mesh.count=e,this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.instanceColor&&(this.mesh.instanceColor.needsUpdate=!0)}reset(){this.life.fill(0),this.mesh.count=0}}function iM(s){return Hr(128,128,t=>Vf(t,s,128))}class sM{constructor(t){S(this,"group",new fn);S(this,"cubes");S(this,"blobs");S(this,"hearts");S(this,"rings",[]);S(this,"coins");S(this,"items",[]);S(this,"icons",{});S(this,"gemMats",{});S(this,"auras",[]);S(this,"bubbles",[]);S(this,"trailT",new Float32Array(32));S(this,"t",0);S(this,"scale");this.scale=t>=2?1:t>=1?.75:.45;const e=Math.round(700*this.scale);this.cubes=new Qo(new bn(1,1,1),new an({color:16777215}),e),this.blobs=new Qo(new Ln(.5,1),new an({color:16777215}),e);const n=new _f;n.moveTo(0,-.5),n.bezierCurveTo(-.9,.1,-.4,.8,0,.35),n.bezierCurveTo(.4,.8,.9,.1,0,-.5),this.hearts=new Qo(new wc(n,{depth:.2,bevelEnabled:!1}),new an({color:16777215}),Math.round(120*this.scale)+20),this.group.add(this.cubes.mesh,this.blobs.mesh,this.hearts.mesh);for(let c=0;c<5;c++){const h=new re(new dn(1,.12,6,32).rotateX(Math.PI/2),new pn({color:16777215,transparent:!0,depthWrite:!1}));h.visible=!1,this.group.add(h),this.rings.push({m:h,t:0,max:1,r:1})}const i=Ce([At(new oe(.34,.34,.1,16),"#ffc61a",{r:[Math.PI/2,0,0]}),At(new oe(.24,.24,.12,16),"#ffe36b",{r:[Math.PI/2,0,0]})]);this.coins=new Ci(i,new Ds({vertexColors:!0,shininess:90,specular:8939008,emissive:3351040}),48),this.coins.instanceMatrix.setUsage(Ir),this.coins.frustumCulled=!1;for(let c=0;c<48;c++)this.coins.setMatrixAt(c,Wf);this.group.add(this.coins);for(const c of Object.keys(Ti))this.icons[c]=iM(c),this.gemMats[c]=new Ds({color:Ti[c],shininess:100,specular:16777215,emissive:Ti[c],emissiveIntensity:.25});const r=new Qa(.42,0),a=new dn(.75,.06,6,24).rotateX(Math.PI/2);for(let c=0;c<6;c++){const h=new fn,f=new re(r,this.gemMats.speed),u=new hf(new Mc({map:this.icons.speed,depthWrite:!1}));u.scale.set(.85,.85,1),u.position.y=1;const d=new re(a,new pn({color:16777215,transparent:!0,opacity:.7}));h.add(f,u,d),h.visible=!1,this.items.push({g:h,gem:f,icon:u,ring:d}),this.group.add(h)}const o=new Ec(.55,.85,24).rotateX(-Math.PI/2),l=new ye(1.05,18,12);for(let c=0;c<24;c++){const h=new re(o,new pn({color:16777215,transparent:!0,opacity:.8,depthWrite:!1}));h.visible=!1;const f=new re(l,new Ds({color:8368895,transparent:!0,opacity:.28,shininess:120,specular:16777215,depthWrite:!1}));f.visible=!1,this.auras.push(h),this.bubbles.push(f),this.group.add(h,f)}}reset(){this.cubes.reset(),this.blobs.reset(),this.hearts.reset();for(const t of this.rings)t.m.visible=!1;this.trailT.fill(0)}dust(t,e,n,i,r="#f3e9da",a=1){i=Math.max(1,Math.round(i*this.scale));for(let o=0;o<i;o++){const l=Math.random()*Math.PI*2,c=(1.5+Math.random()*2.5)*a;this.blobs.add(t,e+.1,n,Math.cos(l)*c,.8+Math.random()*1.5,Math.sin(l)*c,.45+Math.random()*.3,.35+Math.random()*.3,r,-1,3)}}hit(t,e,n,i){const r=Math.round((8+i*14)*this.scale);for(let a=0;a<r;a++){const o=Math.random()*Math.PI*2,l=Math.random()*1.2-.2,c=4+Math.random()*6*(.5+i);this.cubes.add(t,e,n,Math.cos(o)*Math.cos(l)*c,Math.sin(l)*c+2,Math.sin(o)*Math.cos(l)*c,.35+Math.random()*.3,.16+Math.random()*.14,a%3?"#fff27a":"#ffffff",12,2,10)}this.ring(t,e-.5,n,.6+i*1.6,"#ffffff",.25)}stars(t,e,n){for(let i=0;i<5;i++){const r=i/5*Math.PI*2;this.cubes.add(t+Math.cos(r)*.5,e,n+Math.sin(r)*.5,Math.cos(r)*1.5,2,Math.sin(r)*1.5,.6,.18,"#ffe14d",4,1,8)}}coin(t,e,n){for(let i=0;i<Math.round(8*this.scale)+2;i++){const r=Math.random()*Math.PI*2;this.cubes.add(t,e,n,Math.cos(r)*3,2+Math.random()*3,Math.sin(r)*3,.4,.12,i%2?"#ffd23f":"#fff6b0",9,2,12)}}power(t,e,n,i){for(let r=0;r<Math.round(22*this.scale)+4;r++){const a=Math.random()*Math.PI*2,o=2+Math.random()*4;this.blobs.add(t,e,n,Math.cos(a)*o,3+Math.random()*4,Math.sin(a)*o,.6,.25,r%3?i:"#ffffff",6,2)}this.ring(t,e-.8,n,2.2,i,.4)}shock(t,e,n){this.ring(t,e,n,5.5,"#ffe14d",.45),this.ring(t,e+.4,n,4.5,"#ffffff",.35),this.dust(t,e,n,26,"#fff4c2",2.2)}splash(t,e){for(let i=0;i<Math.round(26*this.scale)+6;i++){const r=Math.random()*Math.PI*2,a=Math.random()*4;this.blobs.add(t,-34,e,Math.cos(r)*a,8+Math.random()*9,Math.sin(r)*a,1+Math.random()*.5,.5+Math.random()*.5,i%3?"#e8fbff":"#8fe3ff",18,.5)}this.ring(t,-34+.2,e,4,"#ffffff",.8)}confetti(t,e,n,i=90){const r=["#ff4d6d","#ffd23f","#3ddc97","#4fb8ff","#b45cff","#ff8f3d"];i=Math.round(i*this.scale)+10;for(let a=0;a<i;a++){const o=Math.random()*Math.PI*2,l=2+Math.random()*6;this.cubes.add(t,e,n,Math.cos(o)*l,7+Math.random()*9,Math.sin(o)*l,2+Math.random()*1.5,.28,r[a%r.length],7,1.6,8,!0)}}ring(t,e,n,i,r,a){const o=this.rings.find(l=>!l.m.visible)||this.rings[0];o.m.visible=!0,o.m.position.set(t,e,n),o.m.material.color.set(r),o.t=0,o.max=a,o.r=i}trails(t,e){for(let n=0;n<e.length;n++){const i=e[n];if(!i.alive||i.gone||i.falling)continue;const r=gd(i.look.trail);if(rl(i.look.skin).fx==="gold"&&Math.random()<t*4&&this.cubes.add(i.x+(Math.random()-.5),i.y+.5+Math.random(),i.z+(Math.random()-.5),0,1,0,.6,.1,"#fff6b0",0,1,10),r.kind==="none"||i.speedNow<2.5||(this.trailT[n]-=t*(i.isPlayer?1:.45)*this.scale*(.5+i.speedNow/8),this.trailT[n]>0))continue;this.trailT[n]=.05;const o=r.colors[Math.floor(Math.random()*r.colors.length)],l=i.x-Math.sin(i.yaw)*.3,c=i.z-Math.cos(i.yaw)*.3;switch(r.kind){case"puff":this.blobs.add(l,i.y+.15,c,(Math.random()-.5)*.6,.6,(Math.random()-.5)*.6,.55,.42,r.id==="rainbow"?r.colors[Math.floor(this.t*10)%r.colors.length]:o,-.5,2);break;case"bubble":this.blobs.add(l,i.y+.4,c,(Math.random()-.5)*.8,1.2,(Math.random()-.5)*.8,.9,.3,o,-1.2,1);break;case"spark":this.cubes.add(l,i.y+.3+Math.random()*.6,c,(Math.random()-.5)*2,1.5,(Math.random()-.5)*2,.5,.12,o,3,1,12);break;case"fire":this.blobs.add(l,i.y+.1,c,(Math.random()-.5)*.5,2.2,(Math.random()-.5)*.5,.45,.38,o,-2,2);break;case"heart":this.hearts.add(l,i.y+.5,c,(Math.random()-.5)*.6,1.4,(Math.random()-.5)*.6,.8,.45,o,-.6,1,2);break;case"confetti":this.cubes.add(l,i.y+.4,c,(Math.random()-.5)*3,2.5,(Math.random()-.5)*3,.8,.18,o,6,1.5,9,!0);break}}}update(t,e){this.t+=t,this.cubes.update(t),this.blobs.update(t),this.hearts.update(t);for(const i of this.rings){if(!i.m.visible)continue;i.t+=t;const r=i.t/i.max;if(r>=1){i.m.visible=!1;continue}const a=i.r*(.2+.8*Math.sqrt(r));i.m.scale.set(a,1+r,a),i.m.material.opacity=1-r}if(!e)return;let n=0;for(const i of e.coins)!i.alive||n>=48||(Va.set(0,i.t*3,0),Ga.setFromEuler(Va),Wa.set(i.x,i.y+Math.sin(i.t*3)*.1,i.z),yr.set(1,1,1),Ha.compose(Wa,Ga,yr),this.coins.setMatrixAt(n++,Ha));this.coins.count=n,this.coins.instanceMatrix.needsUpdate=!0;for(let i=0;i<this.items.length;i++){const r=this.items[i],a=e.items[i];if(!a||!a.alive){r.g.visible=!1;continue}r.g.visible=!0,r.gem.material=this.gemMats[a.kind],r.icon.material.map=this.icons[a.kind],r.ring.material.color.set(Ti[a.kind]);const o=Math.min(1,a.t*3);r.g.position.set(a.x,a.y+Math.sin(this.t*3+i)*.15,a.z),r.g.scale.setScalar(o),r.gem.rotation.y=this.t*2.5,r.ring.rotation.x=Math.sin(this.t*2+i)*.4,r.ring.position.y=-.6}for(let i=0;i<24;i++){const r=e.chars[i],a=this.auras[i],o=this.bubbles[i];if(!r||!r.alive||r.gone||!r.power){a.visible=o.visible=!1;continue}if(r.power==="shield"){a.visible=!1,o.visible=!0,o.position.set(r.x,r.y+.85,r.z);const h=1+Math.sin(this.t*6)*.04;o.scale.set(h,h*1.05,h);continue}o.visible=!1,a.visible=!0,a.position.set(r.x,r.y+.06,r.z),a.rotation.y=this.t*3;const l=1+Math.sin(this.t*8)*.1;a.scale.set(l*(r.power==="magnet"?1.8:1),1,l*(r.power==="magnet"?1.8:1));const c=a.material;c.color.set(Ti[r.power]),c.opacity=r.powerT<1.5?Math.sin(this.t*20)>0?.8:.2:.8,r.power==="speed"&&r.speedNow>3&&Math.random()<.5&&this.blobs.add(r.x,r.y+.6,r.z,-r.vx*.1,.2,-r.vz*.1,.3,.3,"#a5f3fc",0,1)}this.trails(t,e.chars)}}class rM{constructor(t){S(this,"cam");S(this,"yaw",0);S(this,"pitch",.52);S(this,"dist",10.5);S(this,"tx",0);S(this,"ty",1);S(this,"tz",0);S(this,"shakeT",0);S(this,"shakeK",0);S(this,"fovKick",0);S(this,"baseFov",62);S(this,"orbit",!1);S(this,"t",0);S(this,"shakeOn",!0);this.cam=new on(this.baseFov,t,.3,900)}basis(){const t=-Math.sin(this.yaw),e=-Math.cos(this.yaw);return{fx:t,fz:e,rx:-e,rz:t}}turn(t,e,n){this.yaw-=t,this.pitch=Pe(this.pitch+e,.18,1.15),this.dist=Pe(this.dist+n*.8,7,16)}lookFrom(t,e,n,i){this.yaw=Math.atan2(t-n,e-i),Math.hypot(t-n,e-i)<1&&(this.yaw=0),this.tx=t,this.tz=e}shake(t,e=.25){this.shakeOn&&(this.shakeK=Math.max(this.shakeK,t),this.shakeT=Math.max(this.shakeT,e))}update(t,e,n,i,r,a){this.t+=t;const o=this.cam;if(this.orbit){this.yaw+=t*.07;const p=40;o.position.set(r+Math.sin(this.yaw)*p,19,a+Math.cos(this.yaw)*p),o.lookAt(r,-1,a),o.fov=this.baseFov,o.updateProjectionMatrix();return}const l=e+(r-e)*.15,c=i+(a-i)*.15,h=1-Math.exp(-t*9);this.tx+=(l-this.tx)*h,this.tz+=(c-this.tz)*h;const f=Math.max(n,-5);this.ty+=(f+1.1-this.ty)*(1-Math.exp(-t*6));const u=Math.cos(this.pitch);let d=this.tx+Math.sin(this.yaw)*u*this.dist,g=this.ty+Math.sin(this.pitch)*this.dist,v=this.tz+Math.cos(this.yaw)*u*this.dist;if(this.shakeT>0){this.shakeT-=t;const p=this.shakeK*Math.max(0,this.shakeT)*4;d+=Math.sin(this.t*71)*p*.3,g+=Math.sin(this.t*83)*p*.3,v+=Math.cos(this.t*67)*p*.3,this.shakeT<=0&&(this.shakeK=0)}o.position.set(d,g,v),o.lookAt(this.tx,this.ty,this.tz),this.fovKick+=(0-this.fovKick)*(1-Math.exp(-t*5));const m=this.baseFov+this.fovKick;Math.abs(o.fov-m)>.05&&(o.fov=m,o.updateProjectionMatrix())}chase(t,e){this.yaw+=Pi(this.yaw,e)*Math.min(1,t*.8)}}const Oe=new Set;let Sr=!1,br=!1,Wi=!1,ki=0,wr=0,nc=0,Xi=1,Us=!0,As=-1,rr=0,ar=0,Er=0,Tr=0,Rs=-1,jo=0,tl=0,Xa=!1,Ra=!1,gr=!1,el=0,nl=0,_n=null,or=null;const qa=()=>Ra||typeof matchMedia<"u"&&matchMedia("(pointer: coarse)").matches;function aM(s){Xi=s}function Es(s){Us=s,s||(Oe.clear(),As=Rs=-1,Er=Tr=0,Xa=!1,gr=!1,_n&&(_n.style.display="none"))}function oM(s){const t=s.target;return!!t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")}function lM(s,t){_n=t.stick,or=t.knob;const e=()=>{Ra=!0,document.body.classList.add("touch")};qa()&&e(),addEventListener("touchstart",e,{passive:!0,capture:!0}),addEventListener("keydown",a=>{if(oM(a))return;Wi=!0;const o=a.code;["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(o)&&a.preventDefault(),Us&&((o==="ShiftLeft"||o==="ShiftRight"||o==="KeyK")&&!Oe.has(o)&&(Sr=!0),(o==="KeyP"||o==="Escape")&&!Oe.has(o)&&(br=!0),Oe.add(o))}),addEventListener("keyup",a=>Oe.delete(a.code)),addEventListener("blur",()=>{Oe.clear(),gr=!1}),s.addEventListener("mousedown",a=>{gr=!0,el=a.clientX,nl=a.clientY,Wi=!0}),addEventListener("mouseup",()=>gr=!1),addEventListener("mousemove",a=>{!gr||!Us||(ki+=(a.clientX-el)*.006*Xi,wr+=(a.clientY-nl)*.004*Xi,el=a.clientX,nl=a.clientY)}),s.addEventListener("wheel",a=>{nc+=Math.sign(a.deltaY),a.preventDefault()},{passive:!1}),s.addEventListener("contextmenu",a=>a.preventDefault());const n={passive:!1};s.addEventListener("touchstart",a=>{Ra=!0,Wi=!0,document.body.classList.add("touch");for(const o of Array.from(a.changedTouches))o.clientX<innerWidth*.45&&As<0?(As=o.identifier,rr=o.clientX,ar=o.clientY,Er=Tr=0,_n&&(_n.style.display="block",_n.style.left=rr+"px",_n.style.top=ar+"px"),document.body.classList.add("stick-on")):Rs<0&&(Rs=o.identifier,jo=o.clientX,tl=o.clientY);a.preventDefault()},n),s.addEventListener("touchmove",a=>{for(const o of Array.from(a.changedTouches))if(o.identifier===As){let c=o.clientX-rr,h=o.clientY-ar;const f=Math.hypot(c,h);f>56&&(rr+=c/f*(f-56),ar+=h/f*(f-56),c=c/f*56,h=h/f*56,_n&&(_n.style.left=rr+"px",_n.style.top=ar+"px")),Er=c/56,Tr=h/56,or&&(or.style.transform=`translate(${c}px, ${h}px)`)}else o.identifier===Rs&&Us&&(ki+=(o.clientX-jo)*.008*Xi,wr+=(o.clientY-tl)*.005*Xi,jo=o.clientX,tl=o.clientY);a.preventDefault()},n);const i=a=>{for(const o of Array.from(a.changedTouches))o.identifier===As&&(As=-1,Er=Tr=0,_n&&(_n.style.display="none"),or&&(or.style.transform=""),document.body.classList.remove("stick-on")),o.identifier===Rs&&(Rs=-1)};s.addEventListener("touchend",i),s.addEventListener("touchcancel",i);const r=(a,o,l)=>{a.addEventListener("touchstart",c=>{Ra=!0,Wi=!0,o(),a.classList.add("down"),c.preventDefault()},n),a.addEventListener("touchend",()=>{l?.(),a.classList.remove("down")}),a.addEventListener("touchcancel",()=>{l?.(),a.classList.remove("down")}),a.addEventListener("mousedown",c=>{o(),c.stopPropagation()}),a.addEventListener("mouseup",()=>l?.())};r(t.jump,()=>Xa=!0,()=>Xa=!1),r(t.dash,()=>Sr=!0),r(t.pause,()=>br=!0)}let Lu=!1,Iu=!1;function cM(){let s=0,t=0;(Oe.has("KeyA")||Oe.has("ArrowLeft"))&&(s-=1),(Oe.has("KeyD")||Oe.has("ArrowRight"))&&(s+=1),(Oe.has("KeyW")||Oe.has("ArrowUp"))&&(t+=1),(Oe.has("KeyS")||Oe.has("ArrowDown"))&&(t-=1),Oe.has("KeyQ")&&(ki-=.035),Oe.has("KeyE")&&(ki+=.035),s+=Er,t-=Tr;let e=Oe.has("Space")||Oe.has("KeyJ")||Xa;const n=typeof navigator<"u"&&navigator.getGamepads?navigator.getGamepads():[];for(const a of n){if(!a||!a.connected)continue;const o=h=>Math.abs(h)<.18?0:h;s+=o(a.axes[0]||0),t-=o(a.axes[1]||0),ki+=o(a.axes[2]||0)*.05*Xi,wr+=o(a.axes[3]||0)*.03*Xi,a.buttons[0]?.pressed&&(e=!0);const l=!!(a.buttons[1]?.pressed||a.buttons[2]?.pressed||a.buttons[5]?.pressed||a.buttons[7]?.pressed);l&&!Lu&&(Sr=!0),Lu=l;const c=!!a.buttons[9]?.pressed;c&&!Iu&&(br=!0),Iu=c,a.buttons.some(h=>h.pressed)&&(Wi=!0);break}const i=Math.hypot(s,t);i>1&&(s/=i,t/=i);const r={mx:s,my:t,jump:Us&&e,dash:Us&&Sr,camX:ki,camY:wr,zoom:nc,pause:br,any:Wi};return Sr=!1,br=!1,Wi=!1,ki=wr=nc=0,r}const Qe=112,Xf={};let Hn=null,qf=null;function hM(s,t){return Xf[s+":"+t]||""}let Ma=null;function uM(s){if(!Hn){qf=s||null,Hn=[];for(const t of hi)Hn.push({key:"skin:"+t.id,skin:t.id,hat:"none",close:!1});for(const t of qi)Hn.push({key:"hat:"+t.id,skin:"rookie",hat:t.id,close:!0})}}function fM(s,t=4){if(!(!Hn||!Hn.length))try{if(!Ma){const a=new Sn(Qe,Qe,{samples:4});a.texture.colorSpace=qe;const o=new ql;o.add(new Tc(16774378,6969994,2));const l=new Rc(16777215,2.2);l.position.set(2,5,6),o.add(l);const c=new ec(1,2);c.shadows.visible=!1,o.add(c.group);const h={id:0,x:0,y:0,z:0,vy:0,yaw:.35,speedNow:0,runPhase:0,grounded:!0,stun:0,spin:0,landT:0,falling:!1,alive:!0,gone:!1,power:null,dashT:0,look:{skin:"rookie",hat:"none",trail:"none"},isPlayer:!1},f=document.createElement("canvas");f.width=f.height=Qe;const u=f.getContext("2d");Ma={rt:a,scene:o,cam:new on(30,1,.1,50),view:c,pose:h,px:new Uint8Array(Qe*Qe*4),cv:f,g:u,img:u.createImageData(Qe,Qe)}}const e=Ma,n=s.getRenderTarget(),i=s.getClearAlpha(),r=s.getClearColor(new Ft);s.setClearColor(0,0);for(let a=0;a<t&&Hn.length;a++){const o=Hn.shift();e.pose.look={skin:o.skin,hat:o.hat,trail:"none"},e.view.setCast([e.pose]),e.view.t=.6,e.view.update(0,()=>0),o.close?(e.cam.position.set(0,1.95,2.5),e.cam.lookAt(0,1.52,0)):(e.cam.position.set(0,1.1,4.6),e.cam.lookAt(0,.85,0)),s.setRenderTarget(e.rt),s.clear(),s.render(e.scene,e.cam),s.readRenderTargetPixels(e.rt,0,0,Qe,Qe,e.px);for(let l=0;l<Qe;l++)e.img.data.set(e.px.subarray((Qe-1-l)*Qe*4,(Qe-l)*Qe*4),l*Qe*4);e.g.putImageData(e.img,0,0),Xf[o.key]=e.cv.toDataURL("image/png")}s.setRenderTarget(n),s.setClearColor(r,i),Hn.length||(e.rt.dispose(),e.view.dispose(),Ma=null,qf?.())}catch{Hn=[]}}const De=s=>document.querySelector(s),ei=s=>s.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t]),lr='<i class="coin"></i>';class dM{constructor(t){S(this,"screens",De("#screens"));S(this,"hud",De("#hud"));S(this,"banner",De("#banner"));S(this,"feed",De("#feed"));S(this,"count",De("#count"));S(this,"pop",De("#pop"));S(this,"power",De("#power"));S(this,"powerCv",De("#power canvas"));S(this,"dashCv",De("#dashMeter canvas"));S(this,"tDashCv",De("#tDash canvas"));S(this,"hints",De("#hints"));S(this,"spectate",De("#spectate"));S(this,"current","");S(this,"wardTab","skin");S(this,"bannerT",0);S(this,"popT",0);S(this,"countT",0);S(this,"hintT",0);S(this,"lastPowerKind","");S(this,"powerImg",null);document.addEventListener("click",e=>{const n=e.target.closest("[data-act]");n&&t(n.dataset.act,n.dataset.arg||"")}),De("#spectate button").textContent=st("retry")}hideScreens(){this.screens.innerHTML="",this.screens.className="",this.current=""}show(t,e,n=""){this.current=t,this.screens.className="on "+n,this.screens.innerHTML=`<div class="panel ${t}">${e}</div>`}coinsBadge(){return`<div class="wallet">${lr}<b>${Bt.coins}</b></div>`}menu(t){const e=Bt.stats,n=!Os&&document.fullscreenEnabled?`<button class="btn round" data-act="fullscreen" title="${st("fullscreen")}"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg></button>`:"";this.show("menu",`${this.coinsBadge()}
      <div class="logo"><span class="w1">NOOB</span><span class="w2">SURVIVORS</span><span class="io">.io</span></div>
      <div class="tag">${ei(st("lastNoob"))}</div>
      <button class="btn play yellow" data-act="play">${st("play")}</button>
      <div class="arena-name">${st("arena")}: <b>${ei(t)}</b></div>
      <div class="row">
        <button class="btn round" data-act="wardrobe" title="${st("wardrobe")}"><svg viewBox="0 0 24 24"><path d="M8 3l4 3 4-3 5 4-3 4-2-1v11H8V10l-2 1-3-4z" fill="#fff"/></svg><small>${st("wardrobe")}</small></button>
        <button class="btn round" data-act="challenges" title="${st("challenges")}"><svg viewBox="0 0 24 24"><path d="M6 3h12v4a6 6 0 0 1-12 0zM9 15h6v3h3v3H6v-3h3z" fill="#fff"/></svg><small>${st("challenges")}</small>${this.chalDot()}</button>
        <button class="btn round" data-act="settings" title="${st("settings")}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg><small>${st("settings")}</small></button>
        ${n}
      </div>
      <div class="mini-stats">${st("wins")}: <b>${e.wins}</b> · ${st("bestTime")}: <b>${e.bestTime.toFixed(0)}s</b>${e.matches?` · ${st("bestPlace")}: <b>${ao(e.bestPlace)}</b>`:""}</div>
      ${Os?"":`<div class="credits"><a href="../?lang=${Rr}">${st("allGames")}</a> · ${st("credits")} · <a href="https://temirlab.com" target="_blank" rel="noopener">temirlab.com</a> · ${st("fictional")}</div>`}`,"menu-bg")}chalDot(){return Bt.chal.some(e=>Ar.find(i=>i.id===e.id)&&e.progress>0)?'<i class="dot"></i>':""}result(t,e,n,i,r){const a=Bt.stats,o=i.challenges.map(c=>`<div class="chal-done">✔ ${ei(Hi(c.def.text))} <b>+${c.reward}</b> ${lr}</div>`).join(""),l=t?`<h1 class="win">${st("victory")}</h1><div class="sub">${st("lastNoob")}</div>`:`<h1 class="out">${st("eliminated")}</h1><div class="sub">${ei(r)}</div>`;this.show("result",`${this.coinsBadge()}
      ${l}
      <div class="place"><span>${st("place")}</span><b>${ao(e.place)}</b><span>${st("of")} ${n}</span></div>
      <div class="stats">
        <div><b>${e.time.toFixed(1)}s</b><span>${st("survived")}</span></div>
        <div><b>${e.kos}</b><span>${st("kos")}</span></div>
        <div><b>${e.coins}</b><span>${st("coins")}</span></div>
        <div><b>${e.dodges}</b><span>${st("dodges")}</span></div>
      </div>
      ${i.newBest?`<div class="best">★ ${st("newBest")} ${e.time.toFixed(1)}s</div>`:`<div class="best dim">${st("best")}: ${a.bestTime.toFixed(1)}s</div>`}
      <div class="reward">${st("reward")}: <b>+${i.total}</b> ${lr}</div>
      ${o}
      <button class="btn play yellow" data-act="retry">${st(t?"next":"retry")}</button>
      <div class="row">
        ${t?"":`<button class="btn small" data-act="watch">${st("watch")}</button>`}
        <button class="btn small" data-act="wardrobe">${st("wardrobe")}</button>
        <button class="btn small" data-act="menu">${st("menu")}</button>
      </div>`,t?"win-bg":"out-bg")}pause(){this.show("pause",`<h2>${st("paused")}</h2>
      <button class="btn play yellow" data-act="resume">${st("resume")}</button>
      <div class="row">
        <button class="btn small" data-act="settings">${st("settings")}</button>
        <button class="btn small red" data-act="quit">${st("quit")}</button>
      </div>`,"dim")}settings(t){const e=Bt.settings,n=(a,o)=>`<button class="toggle ${o?"on":""}" data-act="set" data-arg="${a}">${st(o?"on":"off")}</button>`,i=(a,o)=>`<button class="seg ${e.quality===a?"on":""}" data-act="quality" data-arg="${a}">${o}</button>`,r=[.6,1,1.5,2].map(a=>`<button class="seg ${Math.abs(e.sens-a)<.01?"on":""}" data-act="sens" data-arg="${a}">${a}×</button>`).join("");this.show("settings",`<h2>${st("settings")}</h2>
      <div class="set-row"><span>${st("music")}</span>${n("music",e.music)}</div>
      <div class="set-row"><span>${st("sound")}</span>${n("sfx",e.sfx)}</div>
      <div class="set-row"><span>${st("quality")}</span><div class="segs">${i("auto",st("qAuto"))}${i("low",st("qLow"))}${i("medium",st("qMed"))}${i("high",st("qHigh"))}</div></div>
      <div class="set-row"><span>${st("sens")}</span><div class="segs">${r}</div></div>
      <div class="set-row"><span>${st("shake")}</span>${n("shake",e.shake)}</div>
      <div class="set-row"><span>${st("hints")}</span>${n("hints",e.hints)}</div>
      <div class="keys">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> ${st("hintMove")}</div>
        <div><kbd>Space</kbd> ${st("hintJump")} · <kbd>Shift</kbd> ${st("hintDash")}</div>
        <div><kbd>Mouse drag</kbd> / <kbd>Q</kbd><kbd>E</kbd> ${st("hintCam")} · <kbd>P</kbd> ${st("paused")}</div>
      </div>
      ${oc?"":'<div class="warn-note">Storage is blocked in this browser: progress will not be saved.</div>'}
      <div class="row">
        <button class="btn small yellow" data-act="${t?"pauseMenu":"menu"}">${st("back")}</button>
        ${t?"":`<button class="btn small red" data-act="reset">${st("reset")}</button>`}
      </div>`,"dim")}challenges(){const t=Bt.chal.map(n=>{const i=Ar.find(o=>o.id===n.id),r=i.low?n.progress>=i.target?1:0:Math.min(1,n.progress/i.target),a=i.low?r>=1?st("done"):"":`${Math.min(n.progress,i.target)} / ${i.target}`;return`<div class="chal"><div class="chal-t">${ei(Hi(i.text))}</div><div class="bar"><i style="width:${(r*100).toFixed(0)}%"></i><span>${a}</span></div><div class="chal-r">+${i.reward} ${lr}</div></div>`}).join(""),e=Bt.stats;this.show("challenges",`${this.coinsBadge()}<h2>${st("challenges")}</h2>${t}
      <h3>${st("stats")}</h3>
      <div class="stat-grid">
        <div><b>${e.matches}</b><span>${st("matches")}</span></div>
        <div><b>${e.wins}</b><span>${st("wins")}</span></div>
        <div><b>${e.bestTime.toFixed(1)}s</b><span>${st("bestTime")}</span></div>
        <div><b>${e.matches?ao(e.bestPlace):"–"}</b><span>${st("bestPlace")}</span></div>
        <div><b>${e.kos}</b><span>${st("totalKos")}</span></div>
      </div>
      <button class="btn small yellow" data-act="menu">${st("back")}</button>`,"dim")}wardrobe(t=this.wardTab,e=""){this.wardTab=t;const i=(t==="skin"?hi:t==="hat"?qi:$i).map(a=>{const o=Bt.owned.includes(a.id),l=Bt.look[t]===a.id,c=Ou(a.id,t),h=t==="skin"?hi.find(g=>g.id===a.id)?.suit??"#ccc":t==="trail"?$i.find(g=>g.id===a.id)?.colors[0]??"#ddd":"",f=t!=="trail"?hM(t,a.id):"",u=f?`<img class="thumb" src="${f}" alt="">`:h?`<i class="sw" style="background:${h}"></i>`:'<i class="sw hat"></i>',d=l?`<span class="tagon">${st("equipped")}</span>`:o?`<span class="tagown">${st("equip")}</span>`:`<span class="price ${Bt.coins>=c?"":"poor"}">${lr}${c}</span>`;return`<button class="card ${l?"on":""} ${o?"own":""}" style="--tier:${pd[a.tier]}" data-act="item" data-arg="${a.id}">
          ${u}<b>${ei(Hi(a.name))}</b><small>${st(a.tier)}</small>${d}</button>`}).join(""),r=(a,o)=>`<button class="tab ${t===a?"on":""}" data-act="tab" data-arg="${a}">${o}</button>`;this.show("wardrobe",`${this.coinsBadge()}
      <div class="tabs">${r("skin",st("skins"))}${r("hat",st("hats"))}${r("trail",st("trails"))}</div>
      <div class="cards">${i}</div>
      <div class="note">${e?`<b class="err">${ei(e)}</b>`:ei(st("looksOnly"))}</div>
      <div class="row"><button class="btn small yellow" data-act="menu">${st("back")}</button><button class="btn small" data-act="play">${st("play")}</button></div>`,"side")}showHud(t){this.hud.classList.toggle("hidden",!t),document.body.classList.toggle("playing",t)}setTimer(t,e){const n=Math.max(0,Math.floor(t));De("#timer").textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`,De("#alive b").textContent=String(e),De("#alive span").textContent=st("alive")}setRoundCoins(t){De("#roundCoins b").textContent=String(t)}alarm(t){this.banner.textContent=st("alarm_"+t),this.banner.className="show "+t,this.bannerT=1.8}countdown(t){this.count.textContent=t==="go"?st("go"):String(t),this.count.className="",this.count.offsetWidth,this.count.className="show"+(t==="go"?" go":""),this.countT=t==="go"?.8:1}popText(t,e=""){this.pop.textContent=t,this.pop.className="",this.pop.offsetWidth,this.pop.className="show "+e,this.popT=1.1}feedLine(t,e=!1){const n=document.createElement("div");for(n.className=e?"mine":"",n.innerHTML=t,this.feed.prepend(n);this.feed.children.length>4;)this.feed.lastChild.remove();setTimeout(()=>n.classList.add("fade"),2600),setTimeout(()=>n.remove(),3200)}clearFeed(){this.feed.innerHTML="",this.banner.className="",this.count.className="",this.pop.className=""}setPower(t,e,n){if(!t){this.lastPowerKind&&(this.power.className="",this.lastPowerKind="");return}this.lastPowerKind!==t&&(this.lastPowerKind=t,this.power.className="show",this.power.querySelector("span").textContent=Hi(Gf[t]),this.power.style.setProperty("--pc",Ti[t]),this.powerImg=new Image,this.powerImg.src=nM(t,88));const i=this.powerCv.getContext("2d");i.clearRect(0,0,88,88),this.powerImg?.complete&&i.drawImage(this.powerImg,8,8,72,72),i.lineWidth=6,i.strokeStyle="rgba(255,255,255,0.95)",i.beginPath(),i.arc(44,44,40,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,e/n)),i.stroke()}setDash(t){for(const[e,n]of[[this.dashCv,64],[this.tDashCv,96]]){const i=e.getContext("2d");i.clearRect(0,0,n,n),i.lineWidth=n*.09,i.strokeStyle=t>=1?"#7dff4f":"rgba(255,255,255,0.85)",i.beginPath(),i.arc(n/2,n/2,n*.42,-Math.PI/2,-Math.PI/2+Math.PI*2*t),i.stroke()}De("#dashMeter").classList.toggle("ready",t>=1),De("#tDash").classList.toggle("ready",t>=1)}showHints(t){if(!t){this.hints.className="";return}const e=qa();this.hints.innerHTML=e?`<div><b>◀ ▶</b> ${st("hintMove")}</div><div><b>⬆</b> ${st("hintJump")}</div><div><b>➜</b> ${st("hintDash")}</div><div class="goal">${st("hintGoal")}</div>`:`<div><kbd>WASD</kbd> ${st("hintMove")}</div><div><kbd>Space</kbd> ${st("hintJump")}</div><div><kbd>Shift</kbd> ${st("hintDash")}</div><div><kbd>🖱</kbd> ${st("hintCam")}</div><div class="goal">${st("hintGoal")}</div>`,this.hints.className="show",this.hintT=9}setSpectate(t,e="",n=0){this.spectate.classList.toggle("hidden",!t),t&&(this.spectate.querySelector("span").innerHTML=`${st("spectating")}: <b>${ei(e)}</b> · ${n} ${st("alive")}`)}tick(t){this.bannerT>0&&(this.bannerT-=t,this.bannerT<=0&&(this.banner.className="")),this.popT>0&&(this.popT-=t,this.popT<=0&&(this.pop.className="")),this.countT>0&&(this.countT-=t,this.countT<=0&&(this.count.className="")),this.hintT>0&&(this.hintT-=t,this.hintT<=0&&(this.hints.className=""))}}const Bi=new URLSearchParams(location.search),il=Bi.has("debug"),cr=1/60;class pM{constructor(t){S(this,"canvas");S(this,"renderer");S(this,"scene",new ql);S(this,"cam");S(this,"world");S(this,"hazards");S(this,"noobs");S(this,"fx");S(this,"ui");S(this,"shadowTex",kf("rgba(20,10,40,0.42)"));S(this,"match",null);S(this,"attract",!1);S(this,"mode","menu");S(this,"pstate","play");S(this,"paused",!1);S(this,"quality");S(this,"hitStop",0);S(this,"layoutQueue",[]);S(this,"nextLayout","bowl");S(this,"rounds",0);S(this,"resultT",-1);S(this,"resultArgs",null);S(this,"watching",!1);S(this,"watchId",-1);S(this,"splashed",new Set);S(this,"pilot",null);S(this,"autoplay",Bi.has("autoplay"));S(this,"last",performance.now());S(this,"frames",0);S(this,"fpsAcc",0);S(this,"fps",60);S(this,"slowWindows",0);S(this,"lastPowerKind",null);S(this,"pScene",new ql);S(this,"pCam",new on(35,1,.1,100));S(this,"pNoob");S(this,"pPose");S(this,"pTurn",0);S(this,"frozen",!1);S(this,"resScale",1);S(this,"fastWindows",0);S(this,"fpsBeforeDrop",0);S(this,"capped",!1);S(this,"starting",!1);S(this,"force",null);S(this,"startToken",0);this.canvas=t,this.quality=this.pickQuality(),this.renderer=new y_({canvas:t,antialias:this.quality>=1||qa(),powerPreference:"high-performance",preserveDrawingBuffer:il}),this.renderer.outputColorSpace=qe,this.renderer.shadowMap.enabled=this.quality>=2,this.renderer.shadowMap.type=xr,this.cam=new rM(innerWidth/innerHeight),this.world=new Y_(this.scene,this.quality),this.hazards=new j_(this.quality),this.noobs=new ec(24,this.quality),this.fx=new sM(this.quality),this.scene.add(this.hazards.group,this.noobs.group,this.fx.group),this.ui=new dM((r,a)=>this.act(r,a)),this.pNoob=new ec(1,2),this.pScene.add(this.pNoob.group),this.pScene.add(new Tc(16774378,6969994,1.8));const e=new Rc(16777215,2.4);e.position.set(3,6,5),this.pScene.add(e);const n=new re(Ce([At(new oe(1.3,1.45,.5,32),"#ffffff",{p:[0,-.25,0]}),At(new oe(1.32,1.32,.08,32),"#ffd23f",{p:[0,-.02,0]})]),new an({vertexColors:!0}));this.pScene.add(n),this.pPose={id:0,x:0,y:0,z:0,vy:0,yaw:.4,speedNow:0,runPhase:0,grounded:!0,stun:0,spin:0,landT:0,falling:!1,alive:!0,gone:!1,power:null,dashT:0,look:{...Bt.look},isPlayer:!0},this.pNoob.setCast([this.pPose]),lM(t,{jump:document.getElementById("tJump"),dash:document.getElementById("tDash"),stick:document.getElementById("stick"),knob:document.getElementById("knob"),pause:document.getElementById("pauseBtn")}),this.applySettings(),addEventListener("resize",()=>this.resize()),this.resize();const i=()=>$c();addEventListener("pointerdown",i),addEventListener("keydown",i),addEventListener("touchend",i),document.addEventListener("visibilitychange",()=>{document.hidden?(this.autoPause(),Ca(!0)):Ca(!1)}),addEventListener("blur",()=>this.autoPause()),addEventListener("keydown",r=>{(r.code==="Enter"||r.code==="Space")&&(this.ui.current==="result"||this.ui.current==="menu")&&(r.preventDefault(),this.act(this.ui.current==="menu"?"play":"retry",""))}),il&&(window.__ns=this.debugApi())}pickQuality(){const t=Bi.get("q")||Bt.settings.quality;return t==="low"?0:t==="medium"?1:t==="high"?2:Bt.autoLow?0:1}pixelRatio(){const t=devicePixelRatio||1,e=qa(),n=innerWidth*innerHeight;let i;return this.quality>=2?i=Math.min(t,2):this.quality===1?i=e?Math.min(t,2,Math.sqrt(26e5/n)):Math.min(t,1.25):i=e?Math.min(t,1.25):Math.min(t,1)*.8,Math.max(.6,i*this.resScale)}applySettings(){const t=Bt.settings;nd(t.sfx),id(t.music),aM(t.sens),this.cam.shakeOn=t.shake,this.quality=this.pickQuality(),this.renderer.setPixelRatio(this.pixelRatio()),this.world.sun.castShadow=this.quality>=2&&this.renderer.shadowMap.enabled,this.resize()}resize(){const t=innerWidth,e=innerHeight;this.renderer.setSize(t,e,!1),this.canvas.style.width=t+"px",this.canvas.style.height=e+"px",this.cam.cam.aspect=t/e,this.cam.baseFov=t<e?70:e<500?58:62,this.cam.cam.updateProjectionMatrix(),this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(t,e,!1);const n=t>760&&t>e;if(this.pCam.aspect=t/e,this.pCam.clearViewOffset(),n)this.pCam.position.set(1.3,1.4,6.2),this.pCam.lookAt(1.3,1.05,0);else{const i=e>t;this.pCam.position.set(0,1.3,i?10:7),this.pCam.lookAt(0,.95,0),this.pCam.setViewOffset(t,e,0,e*(i?.27:.2),t,e)}this.pCam.updateProjectionMatrix()}camDefaults(){const t=innerWidth,e=innerHeight;e>t?(this.cam.pitch=.7,this.cam.dist=12.5):e<500?(this.cam.pitch=.66,this.cam.dist=11.5):(this.cam.pitch=.52,this.cam.dist=10.5)}pickLayout(){const t=Bi.get("layout");if(t&&va.includes(t))return t;const e=this.nextLayout;return this.layoutQueue.length||(this.layoutQueue=new mr(Date.now()).shuffle(va.filter(n=>n!==e))),this.nextLayout=this.layoutQueue.shift(),e}startMatch(t){const e=this.force?.seed||Number(Bi.get("seed"))||Math.random()*1e9|0,n=new mr(e^1540483477),i=t?n.pick(va):this.force?.layout||this.pickLayout(),r=Number(Bi.get("bots")),a=r?Pe(r,1,23):this.quality===0?n.int(15,17):this.quality===1?n.int(17,23):n.int(20,23),o=n.shuffle([...xd]).slice(0,a+1),l=o.map(()=>vd(()=>n.next()));this.match=new G_({seed:e,layout:i,bots:t?a+1:a,player:t?null:{name:st("you"),look:{...Bt.look}},botLooks:l,botNames:o,countdown:t?.01:3});const c=this.match;if(this.attract=t,this.world.build(i,c.arena,n),this.hazards.build(c,this.shadowTex),this.noobs.setCast(c.chars),this.fx.reset(),this.splashed.clear(),this.hitStop=0,this.pstate="play",this.resultT=-1,this.resultArgs=null,this.watching=!1,this.watchId=-1,this.paused=!1,this.lastPowerKind=null,this.ui.clearFeed(),this.ui.setSpectate(!1),this.pilot=c.player&&(this.autoplay||t)?mu(c.player,new mr(e+7)):null,t)this.cam.orbit=!0,this.ui.showHud(!1),ro(0);else{this.mode="match",this.rounds++,this.cam.orbit=!1;const h=c.player;this.cam.lookFrom(h.x,h.z,c.arena.cx,c.arena.cz),this.camDefaults(),this.ui.hideScreens(),this.ui.showHud(!0),this.ui.setRoundCoins(0),this.ui.setPower(null,0,1),this.ui.countdown(3),se("count"),Bt.settings.hints&&Bt.tutorial<3?this.ui.showHints(!0):this.ui.showHints(!1),Bt.tutorial++,ni(),Es(!0),ro(1)}}menu(){this.startToken++,this.mode="menu",this.paused=!1,Es(!1),this.startMatch(!0);const t=Bi.get("layout");this.ui.menu(Hi(Hf[t&&va.includes(t)?t:this.nextLayout].name))}async retry(){if(this.starting)return;const t=++this.startToken;this.ui.hideScreens(),!(Os&&this.rounds>=2&&(this.starting=!0,Es(!1),await fd(),this.starting=!1,t!==this.startToken))&&this.startMatch(!1)}act(t,e){switch($c(),t!=="item"&&se("click",.6),t){case"play":case"retry":this.retry();break;case"menu":this.menu();break;case"watch":this.watching=!0,this.ui.hideScreens(),this.ui.showHud(!0);break;case"wardrobe":this.startToken++,this.mode="wardrobe",Es(!1),this.ui.showHud(!1),this.pPose.look={...Bt.look},this.pNoob.setCast([this.pPose]),this.ui.wardrobe();break;case"tab":this.ui.wardrobe(e);break;case"item":{const n=this.ui.wardTab;if(Bt.owned.includes(e))Bt.look[n]=e,ni(),se("click"),this.ui.wardrobe();else if(Sd(e,n))se("buy"),this.ui.wardrobe(),this.fx.confetti(0,1,0,30);else{se("pop",.6),this.pPose.look={...Bt.look,[n]:e},this.pNoob.setCast([this.pPose]),this.ui.wardrobe(n,st("notEnough"));return}this.pPose.look={...Bt.look},this.pNoob.setCast([this.pPose]),this.pPose.vy=6,this.pPose.grounded=!1;break}case"challenges":this.ui.challenges();break;case"settings":this.ui.settings(this.paused);break;case"pauseMenu":this.ui.pause();break;case"set":{const n=Bt.settings;n[e]=!n[e],ni(),this.applySettings(),e==="hints"&&!n[e]&&this.ui.showHints(!1),this.ui.settings(this.paused);break}case"quality":Bt.settings.quality=e,ni(),this.applySettings(),this.ui.settings(this.paused);break;case"sens":Bt.settings.sens=Number(e),ni(),this.applySettings(),this.ui.settings(this.paused);break;case"reset":confirm(st("resetAsk"))&&(yd(),this.applySettings(),this.menu());break;case"resume":this.setPaused(!1);break;case"quit":this.paused=!1,this.menu();break;case"fullscreen":document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.().catch(()=>{});break}}setPaused(t){this.mode!=="match"||this.pstate!=="play"||!this.match||(this.paused=t,Es(!t),t?this.ui.pause():this.ui.hideScreens())}autoPause(){this.mode==="match"&&this.pstate==="play"&&!this.paused&&this.match&&this.match.phase!=="end"&&!this.autoplay&&this.setPaused(!0)}frame(t){let e=(t-this.last)/1e3;this.last=t,e>.1&&(e=.1),e<=0&&(e=.001),this.trackFps(e),(this.mode==="menu"||this.mode==="wardrobe")&&(uM(()=>{this.ui.current==="wardrobe"&&this.ui.wardrobe()}),fM(this.renderer,3));const n=cM();n.pause&&this.mode==="match"&&this.setPaused(!this.paused),n.any&&this.ui.hintT>0&&this.ui.hintT<6&&this.ui.showHints(!1);const i=this.match;if(this.mode==="wardrobe"){this.wardrobeFrame(e),this.renderer.render(this.pScene,this.pCam);return}if(i&&!this.paused&&!this.frozen){this.cam.turn(n.camX,n.camY,n.zoom),this.control(i,n);let r=e;this.hitStop>0&&(this.hitStop-=e,r=e*.08);const a=Math.ceil(r/cr-.001);for(let o=0;o<a;o++)i.step(r/a);this.events(i),this.afterStep(i,e)}i&&this.draw(i,e),this.ui.tick(e),od(this.mode==="match"&&this.pstate==="play"&&!this.paused&&!document.hidden&&!!i&&i.phase!=="end")}control(t,e){const n=t.player;if(!n||this.pilot)return;const i=this.cam.basis();n.ctl.mx=i.rx*e.mx+i.fx*e.my,n.ctl.mz=i.rz*e.mx+i.fz*e.my,n.ctl.jump=e.jump,e.dash&&(n.ctl.dash=!0)}afterStep(t,e){this.pilot&&this.pilot.think(t,e);for(const n of t.chars)n.y<-33.6&&!this.splashed.has(n.id)&&(this.splashed.add(n.id),this.fx.splash(n.x,n.z),(n.isPlayer||this.near(n.x,n.z)<30)&&se("splash",n.isPlayer?.9:.25));this.resultT>0&&(this.resultT-=e,this.resultT<=0&&this.resultArgs&&(this.ui.result(...this.resultArgs),this.ui.showHud(!1),Es(!1),this.watching=!1)),this.attract&&t.phase==="end"&&t.endT>4&&this.startMatch(!0)}near(t,e){return Dt(t-this.cam.tx,e-this.cam.tz)}events(t){const e=t.player,n=!this.attract;for(const i of t.events)this.event(t,i,e,n);t.events.length=0}event(t,e,n,i){const r=!!n&&e.id===n.id,a=this.near(e.x,e.z),o=i?Pe(1.15-a/26,0,1):Pe(.5-a/60,0,.4);switch(e.type){case"count":i&&(this.ui.countdown(e.a),se("count"));break;case"go":i&&(this.ui.countdown("go"),se("go"));break;case"jump":r?se(e.a?"superjump":"jump"):a<7&&se("jump",.25,1.2+Math.random()*.3),e.a&&this.fx.dust(e.x,e.y,e.z,8,"#c8ffd0",1.2);break;case"land":this.fx.dust(e.x,e.y,e.z,r?7:3,"#f3e9da",.5+e.a),r&&se("land",.4+e.a*.6);break;case"dash":this.fx.dust(e.x,e.y,e.z,r?6:2,"#ffffff",1),r?(se("dash"),this.cam.fovKick=9):a<9&&se("dash",.3);break;case"hit":{const l=Pe(e.a,0,1);this.fx.hit(e.x,e.y,e.z,l),this.fx.stars(e.x,e.y+.9,e.z);const c=!!n&&e.id2===n.id;r||c?(se("hit",1,r?.9:1.2),this.cam.shake(r?.5+l*.6:.3,.3),this.hitStop=r?.07+l*.05:.05):se("hit",o*.7,1+Math.random()*.3),e.s==="bumper"&&se("boing",r?1:o);break}case"shieldPop":this.fx.ring(e.x,e.y,e.z,2,"#7fb2ff",.3),se("shieldPop",r?1:o);break;case"bump":se("bump",r?.8:o*.5,.9+Math.random()*.4);break;case"launch":se("launch",r?1:o*.6),this.fx.dust(e.x,e.y,e.z,10,"#9fffd8",1.5),this.fx.ring(e.x,.2,e.z,1.8,"#3dffb0",.35);break;case"coin":this.fx.coin(e.x,e.y,e.z),r&&(se("coin",.8,1+Math.min(.5,n.coins%10*.05)),this.ui.setRoundCoins(n.coins));break;case"power":{const l=e.s;this.fx.power(e.x,e.y,e.z,Ti[l]),r?(se("power"),this.ui.popText(Hi(Gf[l]),"power")):se("power",o*.4);break}case"shock":this.fx.shock(e.x,e.y,e.z),se("shock",r?1:o),a<10&&i&&this.cam.shake(.6,.35);break;case"warn":i&&a<22&&se("warn",o*.6);break;case"whoosh":i&&a<9&&se("whoosh",o*.7);break;case"spinup":i&&se("alarm",.4);break;case"thud":this.fx.dust(e.x,0,e.z,14,"#ffffff",2*e.a),i&&(se("thud",o),a<12&&this.cam.shake(.35,.25));break;case"wallup":i&&se("wallup",o),this.fx.dust(e.x,0,e.z,12,"#ffd0d0",1.6);break;case"alarm":i&&(this.ui.alarm(e.s),se("alarm",.8),e.s==="sudden"&&ro(2));break;case"crumble":i&&se("crumble",.6);break;case"slip":r&&se("fall");break;case"dodge":r&&(se("dodge",.7),this.ui.popText(mM(),"dodge"));break;case"out":this.onOut(t,e,n,i);break;case"win":this.onWin(t,e,n,i);break;case"itemSpawn":this.fx.ring(e.x,.1,e.z,1.4,"#ffffff",.4);break}}onOut(t,e,n,i){const r=t.chars[e.id],a=e.id2>=0?t.chars[e.id2]:null;if(i){if(n&&r===n){this.pstate="out",se("lose",.9);let o;if(a)o=`${st("outBy")}: ${a.name}`;else if(e.s==="hammer")o=st("outHammer");else if(e.s==="ball")o=st("outBall");else if(e.s==="sweeper")o=st("outSweeper");else if(e.s==="bumper")o=st("outBumper");else if(e.s==="wall")o=st("outWall");else if(e.s==="shock")o=st("outShock");else{const h=t.arena.tiles.some(f=>f.state>=ci&&Dt(f.x-r.x,f.z-r.z)<3.2);o=st(h?"outFloor":"outEdge")}const l=this.stats(n,!1,n.place),c=eh(l,t.chars.length);this.resultArgs=[!1,l,t.chars.length,c,o],this.resultT=1,this.watchId=a&&a.alive?a.id:-1;return}n&&a===n?(se("ko",1),this.ui.popText(`KO! ${r.name}`,"ko"),this.ui.feedLine(`<b>${hr(st("youKo"))}</b> ${hr(r.name)}`,!0)):(this.near(r.x,r.z)<20&&se("pop",.35,.8+Math.random()*.5),this.ui.feedLine(a?`${hr(a.name)} <i class="ko-ic"></i> ${hr(r.name)}`:`<i class="fall-ic"></i> ${hr(r.name)}`))}}onWin(t,e,n,i){const r=t.chars[e.id];if(this.fx.confetti(r.x,r.y+1.5,r.z,i?120:40),!!i)if(n&&r===n){this.pstate="won",se("win"),ld(),this.cam.shake(.3,.3);const a=this.stats(n,!0,1),o=eh(a,t.chars.length);this.resultArgs=[!0,a,t.chars.length,o,""],this.resultT=1.8}else this.pstate==="out"&&(this.ui.alarm("none"),this.ui.banner.textContent=`${r.name} 👑`,this.watching&&(this.resultT=2.2))}stats(t,e,n){return{time:e?this.match.t:t.outAt,place:n,kos:t.kos,coins:t.coins,dodges:t.dodges,dashHits:t.dashHits,pickups:t.pickups,won:e?1:0}}draw(t,e){const n=(a,o)=>t.arena.groundAt(a,o);this.world.update(e),this.hazards.update(e,t,this.cam.cam.position),this.noobs.update(e,n),this.fx.update(e,t);const i=t.player;this.noobs.showMarker(i&&this.pstate==="play"?i:null);let r=i&&(this.pstate!=="out"||this.resultT>0)?i:null;if(!r&&t.player){let a=this.watchId>=0?t.chars[this.watchId]:null;(!a||!a.alive||a.falling)&&(a=t.winner||t.chars.find(o=>o.alive&&!o.falling)||null,this.watchId=a?a.id:-1),r=a,a&&this.watching&&this.ui.setSpectate(!0,a.name,t.alive)}this.cam.orbit||!r?this.cam.update(e,t.arena.cx,0,t.arena.cz,t.arena.cx,t.arena.cz):(r!==i&&this.cam.chase(e,Math.atan2(r.x-t.arena.cx,r.z-t.arena.cz)),this.cam.update(e,r.x,r.y,r.z,t.arena.cx,t.arena.cz)),this.world.follow(this.cam.tx,this.cam.tz),!this.attract&&i&&(this.ui.setTimer(this.pstate==="play"?t.t:i.outAt,t.alive),this.ui.setDash(i.dashCd>0?1-i.dashCd/Uf:1),(i.power!==this.lastPowerKind||i.power)&&(this.lastPowerKind=i.power,this.ui.setPower(i.power,i.powerT,i.power&&Bf[i.power]||1))),this.renderer.render(this.scene,this.cam.cam)}wardrobeFrame(t){const e=this.pPose;this.pTurn+=t*.6,e.yaw=.35+Math.sin(this.pTurn)*.5,e.grounded||(e.vy-=26*t,e.y+=e.vy*t,e.y<=0&&(e.y=0,e.vy=0,e.grounded=!0,e.landT=.18)),e.landT=Math.max(0,e.landT-t),e.runPhase+=t*2,this.pNoob.update(t,()=>0),this.fx.update(t,null);const n=new Ft(hi.find(i=>i.id===e.look.skin)?.suit||"#3d9cff").lerp(new Ft("#ffffff"),.55);this.pScene.background=n}trackFps(t){this.frames++,this.fpsAcc+=t,this.fpsAcc>=4&&(this.fps=this.frames/this.fpsAcc,this.frames=0,this.fpsAcc=0,Bt.settings.quality==="auto"&&this.mode==="match"&&!this.paused&&!document.hidden&&(this.fps<48&&this.capped||(this.fps<48?(this.fastWindows=0,this.fpsBeforeDrop&&this.fps<this.fpsBeforeDrop+3?(this.capped=!0,this.resScale=Math.min(1,this.resScale+.15),this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(innerWidth,innerHeight,!1),this.fpsBeforeDrop=0):this.resScale>.7?(this.fpsBeforeDrop=this.fps,this.resScale=Math.max(.7,this.resScale-.15),this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(innerWidth,innerHeight,!1)):!Bt.autoLow&&++this.slowWindows>=2&&(Bt.autoLow=!0,ni(),this.applySettings())):this.fps>57&&this.resScale<1&&++this.fastWindows>=3&&(this.fastWindows=0,this.resScale=Math.min(1,this.resScale+.1),this.renderer.setPixelRatio(this.pixelRatio()),this.renderer.setSize(innerWidth,innerHeight,!1)))),il&&(document.title=`${this.fps.toFixed(0)} fps`))}debugApi(){return{game:this,get match(){return this.game.match},step:(t,e=cr)=>{for(let n=0;n<t;n++)this.frameStep(e)},fast:(t,e=8)=>{const n=this.match;for(let i=0;i<t;i++){const r=this.match;if(!r||r!==n)break;r.step(cr),this.events(r),this.afterStep(r,cr),i%e===0&&this.draw(r,cr*e)}},give:t=>this.match?.player&&this.match.givePower(this.match.player,t),player:()=>{const t=this.match?.player;return t&&{x:t.x,y:t.y,z:t.z,vx:t.vx,vy:t.vy,vz:t.vz,alive:t.alive,falling:t.falling,grounded:t.grounded,dashes:t.dashes,dashCd:t.dashCd,power:t.power,stun:t.stun,coins:t.coins,place:t.place}},freeze:t=>this.frozen=t,force:(t,e=1)=>this.force=t?{layout:t,seed:e}:null,autoplay:t=>{this.autoplay=t,this.match?.player&&(this.pilot=t?mu(this.match.player,new mr(1)):null)},start:()=>this.startMatch(!1),act:(t,e="")=>this.act(t,e),state:()=>({mode:this.mode,rounds:this.rounds,pstate:this.pstate,paused:this.paused,screen:this.ui.current,phase:this.match?.phase,t:this.match?.t,alive:this.match?.alive,layout:this.match?.layout,chars:this.match?.chars.length,winner:this.match?.winner?.name,playerPlace:this.match?.player?.place,fps:this.fps,coins:Bt.coins,calls:this.renderer.info.render.calls,tris:this.renderer.info.render.triangles,geos:this.renderer.info.memory.geometries,texs:this.renderer.info.memory.textures}),save:()=>Bt,cosmetics:{SKINS:hi,HATS:qi,TRAILS:$i}}}frameStep(t){const e=this.match;e&&(e.step(t),this.events(e),this.afterStep(e,t),this.draw(e,t))}}function hr(s){return s.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function mM(){return st("dodges")==="Dodges"?"DODGE!":"УВОРОТ!"}async function gM(){await ad(),th(!0),Md(ud());const s=Os?null:new URLSearchParams(location.search).get("lang");bd(cd()||(s==="ru"||s==="en"?s:null)||navigator.language),hd(),Os&&document.body.classList.add("portal");const t=document.getElementById("c");let e;try{e=new pM(t)}catch(i){throw document.getElementById("boot").innerHTML='<div class="nogl">This game needs WebGL. Try another browser or turn on hardware acceleration.</div>',i}e.menu(),document.getElementById("boot").classList.add("gone"),th(!1);const n=i=>{try{e.frame(i)}catch(r){console.error(r)}requestAnimationFrame(n)};requestAnimationFrame(n)}gM();
