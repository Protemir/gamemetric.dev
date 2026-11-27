// Счётчик заходов на демо для заказчиков (taqta, synaq, nusqau): страница отдаётся как есть,
// запись в журнал (воркер demo-visits) идёт в фоне и на ответ не влияет.
// Свои заходы: браузер с меткой tl_self (ставится один раз заходом на любую витрину с ?tl_self=1)
// Свои IP отсеивает report.mjs (репо публичное, адреса здесь не храним).
const SELF_IPS = new Set();
const PREVIEW = /telegrambot|whatsapp|facebookexternalhit|slackbot|discordbot|linkedinbot|skypeuripreview|vkshare|twitterbot|viber/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python|node-fetch|undici|go-http|axios|okhttp|java\/|httpclient|scan|monitor|preview|fetch/i;
const MARK = 'tl_self=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax';

export async function onRequest(ctx) {
  let response = await ctx.next();
  try {
    const { request, env } = ctx;
    const url = new URL(request.url);
    const marking = url.searchParams.get('tl_self') === '1';
    if (env.VISITS && request.method === 'GET' && response.status < 400) {
      const p = url.pathname;
      const type = response.headers.get('content-type') || '';
      const last = p.slice(p.lastIndexOf('/') + 1);
      if ((!last.includes('.') || last.endsWith('.html')) && type.includes('text/html')) {
        const ip = request.headers.get('cf-connecting-ip') || '';
        const ua = request.headers.get('user-agent') || '';
        const cf = request.cf || {};
        const self = marking || SELF_IPS.has(ip) || /(?:^|;\s*)tl_self=1(?:;|$)/.test(request.headers.get('cookie') || '');
        const kind = self ? 'self' : PREVIEW.test(ua) ? 'preview' : BOT.test(ua) ? 'bot' : 'human';
        const body = JSON.stringify({
          path: p, ip, ua, kind,
          country: cf.country, city: cf.city, region: cf.region, asn: cf.asn, org: cf.asOrganization,
          ref: request.headers.get('referer') || '', lang: request.headers.get('accept-language') || '',
        });
        ctx.waitUntil(env.VISITS.fetch('https://demo-visits/hit', { method: 'POST', body }).catch(() => {}));
      }
    }
    if (marking && response.status < 400) {
      const marked = new Response(response.body, response);
      marked.headers.append('Set-Cookie', MARK);
      response = marked;
    }
  } catch {
    // журнал не должен ломать страницу
  }
  return response;
}
