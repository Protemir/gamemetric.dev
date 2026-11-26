// Счётчик заходов на демо для заказчиков (taqta, synaq, nusqau): страница отдаётся как есть,
// запись в журнал (воркер demo-visits) идёт в фоне и на ответ не влияет.
const SELF_IPS = new Set(['213.211.101.253']);
const PREVIEW = /telegrambot|whatsapp|facebookexternalhit|slackbot|discordbot|linkedinbot|skypeuripreview|vkshare|twitterbot|viber/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python|node-fetch|undici|go-http|axios|okhttp|java\/|httpclient|scan|monitor|preview|fetch/i;

export async function onRequest(ctx) {
  const response = await ctx.next();
  try {
    const { request, env } = ctx;
    if (env.VISITS && request.method === 'GET' && response.status < 400) {
      const url = new URL(request.url);
      const p = url.pathname;
      const type = response.headers.get('content-type') || '';
      const last = p.slice(p.lastIndexOf('/') + 1);
      if ((!last.includes('.') || last.endsWith('.html')) && type.includes('text/html')) {
        const ip = request.headers.get('cf-connecting-ip') || '';
        const ua = request.headers.get('user-agent') || '';
        const cf = request.cf || {};
        const kind = SELF_IPS.has(ip) ? 'self' : PREVIEW.test(ua) ? 'preview' : BOT.test(ua) ? 'bot' : 'human';
        const body = JSON.stringify({
          path: p, ip, ua, kind,
          country: cf.country, city: cf.city, region: cf.region, asn: cf.asn, org: cf.asOrganization,
          ref: request.headers.get('referer') || '', lang: request.headers.get('accept-language') || '',
        });
        ctx.waitUntil(env.VISITS.fetch('https://demo-visits/hit', { method: 'POST', body }).catch(() => {}));
      }
    }
  } catch {
    // журнал не должен ломать страницу
  }
  return response;
}
