// Voice files are named by the line they say, so the game and tools/voices.mjs agree on names
// without a list: voice/<lang>/<who>-<hash>.mp3. Pure module: node uses it too.

export function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export const voiceFile = (lang, who, text) => `voice/${lang}/${who}-${hash(text)}.mp3`;

// what the speech engine is given: Kazakh letters spelled the way a Russian voice says them,
// and in English lines the Kazakh words written in Latin letters
const KK_RU = { қ: 'к', Қ: 'К', ә: 'а', Ә: 'А', і: 'и', І: 'И', ү: 'у', Ү: 'У', ұ: 'у', Ұ: 'У', ғ: 'г', Ғ: 'Г', ң: 'н', Ң: 'Н', ө: 'о', Ө: 'О', һ: 'х', Һ: 'Х' };
const CYR_LAT = { а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'gh', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', і: 'i', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n', ң: 'ng', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'kh', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };

export function speech(lang, text) {
  // dashes and guillemets read badly: commas and plain quotes instead
  let t = text.replace(/ — /g, ', ').replace(/[«»]/g, '"').replace(/…/g, '...');
  if (lang === 'ru') return t.replace(/[қәіүұғңөһҚӘІҮҰҒҢӨҺ]/g, (ch) => KK_RU[ch]);
  return t.replace(/[Ѐ-ӿ]+/g, (w) =>
    [...w]
      .map((ch, i) => {
        const lo = ch.toLowerCase();
        const lat = CYR_LAT[lo] ?? ch;
        return ch !== lo && i === 0 ? lat.charAt(0).toUpperCase() + lat.slice(1) : lat;
      })
      .join(''),
  );
}
