// GET /api/youtube?q=topic&lang=Spanish -> { videos: [{id,title,channel}] }
// Needs the secret YOUTUBE_API_KEY. Results are cached 24h to protect your daily quota.
const MAX_SEC = 90;
const LANGS = {english:'en',spanish:'es',hindi:'hi',tamil:'ta',telugu:'te',bengali:'bn',marathi:'mr',urdu:'ur',french:'fr',german:'de',portuguese:'pt',arabic:'ar',japanese:'ja',korean:'ko',chinese:'zh',russian:'ru',italian:'it',indonesian:'id',turkish:'tr'};
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), {status: s, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...h}});
const secs = d => { const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(d || ''); return m ? (+m[1] || 0) * 60 + (+m[2] || 0) : Infinity; };

export async function onRequestGet({request, env, waitUntil}) {
  if (!env.YOUTUBE_API_KEY) return json({error: 'Server is not configured'}, 503);
  const sf = request.headers.get('sec-fetch-site');
  if (sf && sf !== 'same-origin') return json({error: 'Forbidden'}, 403);
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 80);
  const lang = (u.searchParams.get('lang') || '').trim().slice(0, 20);
  if (q.length < 2 || !/^[\p{L}\p{N} .,'&+:?!#()-]+$/u.test(q)) return json({error: 'Invalid topic'}, 400);
  if (lang && !/^[\p{L} -]+$/u.test(lang)) return json({error: 'Invalid language'}, 400);

  const ck = new Request('https://cache.intentscroll.internal/yt?' + new URLSearchParams({q: q.toLowerCase(), l: lang.toLowerCase()}));
  const hit = await caches.default.match(ck);
  if (hit) return new Response(hit.body, {headers: hit.headers});

  try {
    const rl = LANGS[lang.toLowerCase()];
    const s = new URL('https://www.googleapis.com/youtube/v3/search');
    s.search = new URLSearchParams({part: 'snippet', type: 'video', videoDuration: 'short', videoEmbeddable: 'true', safeSearch: 'strict', maxResults: '30', q: `${q} ${lang} #shorts`.trim(), key: env.YOUTUBE_API_KEY, ...(rl ? {relevanceLanguage: rl} : {})});
    const r1 = await fetch(s);
    if (!r1.ok) throw new Error(r1.status === 403 ? 'quota' : 'upstream');
    const ids = ((await r1.json()).items || []).map(i => i.id && i.id.videoId).filter(x => /^[\w-]{11}$/.test(x || ''));
    if (!ids.length) return json({videos: []});
    const v = new URL('https://www.googleapis.com/youtube/v3/videos');
    v.search = new URLSearchParams({part: 'contentDetails,status,snippet', id: ids.join(','), key: env.YOUTUBE_API_KEY});
    const r2 = await fetch(v);
    if (!r2.ok) throw new Error('upstream');
    const videos = ((await r2.json()).items || [])
      .filter(i => i.status && i.status.embeddable && secs(i.contentDetails && i.contentDetails.duration) <= MAX_SEC)
      .slice(0, 12)
      .map(i => ({id: i.id, title: String(i.snippet.title || '').slice(0, 120), channel: String(i.snippet.channelTitle || '').slice(0, 60)}));
    const res = json({videos}, 200, {'cache-control': 'public, max-age=86400'});
    if (videos.length) waitUntil(caches.default.put(ck, res.clone()));
    return res;
  } catch (e) {
    return json({error: e.message === 'quota' ? 'Daily video-search limit reached. Try again tomorrow.' : 'Video search failed. Try again later.'}, e.message === 'quota' ? 429 : 502);
  }
}
