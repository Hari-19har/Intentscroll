// GET /api/youtube?q=topic&lang=Spanish -> { videos: [{id,title,channel}] }
// Needs the secret YOUTUBE_API_KEY. Pulls ~50 candidates, scores them for relevance, quality
// and language, drops junk, caps repeats per channel, and caches the result for 24h.
// Cost per uncached search: about 102 quota units (search 100 + videos 1 + channels 1).
const MIN_SEC = 8, MAX_SEC = 90, PER_CHANNEL = 2, RESULTS = 12;
const LANGS = {english:'en',spanish:'es',hindi:'hi',tamil:'ta',telugu:'te',bengali:'bn',marathi:'mr',urdu:'ur',french:'fr',german:'de',portuguese:'pt',arabic:'ar',japanese:'ja',korean:'ko',chinese:'zh',russian:'ru',italian:'it',indonesian:'id',turkish:'tr'};
const STOP = new Set(['the','and','for','with','about','how','what','why','from','into','your','you','basics','tips','learn','learning']);
const JUNK = /giveaway|subscribe|follow me|link in bio|free (?:robux|v-?bucks|money)|prank|#fyp|#viral|clickbait|you won'?t believe/i;
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), {status: s, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...h}});
const secs = d => { const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(d || ''); return m ? (+m[1] || 0) * 60 + (+m[2] || 0) : Infinity; };
const words = s => (String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);

function score(v, kws, rl, subs) {
  const sn = v.snippet, st = v.statistics || {}, t = sn.title || '';
  const title = t.toLowerCase();
  const rest = ((sn.description || '').slice(0, 500) + ' ' + (sn.tags || []).join(' ')).toLowerCase();
  let rel = 0;
  for (const k of kws) rel += title.includes(k) ? 1 : rest.includes(k) ? 0.5 : 0;
  rel = kws.length ? rel / kws.length : 0.5;
  const views = +st.viewCount || 0, likes = st.likeCount == null ? null : +st.likeCount;
  const eng = likes == null || views < 100 ? 0.3 : Math.min(1, likes / views / 0.08);
  const pop = Math.min(1, Math.log10(views + 1) / 6);
  const ch = Math.min(1, Math.log10(subs + 1) / 6);
  let s = 3 * rel + 1.2 * eng + 0.8 * pop + 0.5 * ch;
  if (['27', '28'].includes(sn.categoryId)) s += 0.3;           // Education / Science & Tech
  const al = (sn.defaultAudioLanguage || sn.defaultLanguage || '').toLowerCase();
  const wl = !!(rl && al && !al.startsWith(rl));
  if (rl && al) s += wl ? -1 : 0.4;                            // wrong language is a strong negative
  if ((t.match(/#/g) || []).length > 4) s -= 0.4;               // hashtag spam
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length > 8 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6) s -= 0.3; // SHOUTING
  if (views < 200) s -= 0.5;
  return {s, rel, wl};
}

export async function onRequestGet({request, env, waitUntil}) {
  if (!env.YOUTUBE_API_KEY) return json({error: 'Server is not configured'}, 503);
  const sf = request.headers.get('sec-fetch-site');
  if (sf && sf !== 'same-origin') return json({error: 'Forbidden'}, 403);
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 80);
  const lang = (u.searchParams.get('lang') || '').trim().slice(0, 20);
  if (q.length < 2 || !/^[\p{L}\p{N} .,'&+:?!#()-]+$/u.test(q)) return json({error: 'Invalid topic'}, 400);
  if (lang && !/^[\p{L} -]+$/u.test(lang)) return json({error: 'Invalid language'}, 400);

  const ck = new Request('https://cache.intentscroll.internal/yt?' + new URLSearchParams({v: '2', q: q.toLowerCase(), l: lang.toLowerCase()}));
  const hit = await caches.default.match(ck);
  if (hit) return new Response(hit.body, {headers: hit.headers});

  try {
    const key = env.YOUTUBE_API_KEY, rl = LANGS[lang.toLowerCase()];
    let kws = words(q).filter(w => w.length >= 3 && !STOP.has(w));
    if (!kws.length) kws = words(q).filter(w => w.length >= 2);

    const s = new URL('https://www.googleapis.com/youtube/v3/search');
    s.search = new URLSearchParams({part: 'snippet', type: 'video', videoDuration: 'short', videoEmbeddable: 'true', safeSearch: 'strict', order: 'relevance', maxResults: '50', q: `${q} ${lang} #shorts`.trim(), key, ...(rl ? {relevanceLanguage: rl} : {})});
    const r1 = await fetch(s);
    if (!r1.ok) throw new Error(r1.status === 403 ? 'quota' : 'upstream');
    const ids = [...new Set(((await r1.json()).items || []).map(i => i.id && i.id.videoId).filter(x => /^[\w-]{11}$/.test(x || '')))];
    if (!ids.length) return json({videos: []});

    const v = new URL('https://www.googleapis.com/youtube/v3/videos');
    v.search = new URLSearchParams({part: 'contentDetails,status,snippet,statistics', id: ids.join(','), key});
    const r2 = await fetch(v);
    if (!r2.ok) throw new Error('upstream');
    const vids = ((await r2.json()).items || []).filter(i => {
      const d = secs(i.contentDetails && i.contentDetails.duration);
      return i.status && i.status.embeddable && d >= MIN_SEC && d <= MAX_SEC && (i.snippet || {}).liveBroadcastContent !== 'live' && !JUNK.test((i.snippet || {}).title || '');
    });
    if (!vids.length) return json({videos: []});

    const cids = [...new Set(vids.map(i => i.snippet.channelId).filter(Boolean))].slice(0, 50);
    const subs = {};
    try {
      const c = new URL('https://www.googleapis.com/youtube/v3/channels');
      c.search = new URLSearchParams({part: 'statistics', id: cids.join(','), key});
      const r3 = await fetch(c);
      if (r3.ok) for (const it of (await r3.json()).items || []) subs[it.id] = it.statistics && !it.statistics.hiddenSubscriberCount ? +it.statistics.subscriberCount || 0 : 10000;
    } catch { /* channel stats are a bonus signal only */ }

    let cands = vids.map(i => ({i, ...score(i, kws, rl, subs[i.snippet.channelId] == null ? 10000 : subs[i.snippet.channelId])}));
    const onTopic = cands.filter(c => c.rel > 0);
    if (onTopic.length >= 3) cands = onTopic;                    // otherwise keep all (e.g. titles in another language)
    const sameLang = cands.filter(c => !c.wl);
    if (sameLang.length >= 3) cands = sameLang;                  // drop videos declared in another language when we have enough
    cands.sort((a, b) => b.s - a.s);

    const perCh = {}, videos = [];
    for (const c of cands) {
      const ch = c.i.snippet.channelId;
      if ((perCh[ch] = (perCh[ch] || 0) + 1) > PER_CHANNEL) continue;
      videos.push({id: c.i.id, title: String(c.i.snippet.title || '').slice(0, 120), channel: String(c.i.snippet.channelTitle || '').slice(0, 60)});
      if (videos.length >= RESULTS) break;
    }
    const res = json({videos}, 200, {'cache-control': 'public, max-age=86400'});
    if (videos.length) waitUntil(caches.default.put(ck, res.clone()));
    return res;
  } catch (e) {
    return json({error: e.message === 'quota' ? 'Daily video-search limit reached. Try again tomorrow.' : 'Video search failed. Try again later.'}, e.message === 'quota' ? 429 : 502);
  }
}
