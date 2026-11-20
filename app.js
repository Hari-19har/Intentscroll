
const $=s=>document.querySelector(s);
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P={home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',tabs:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M9 4v5"/>',source:'<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',back:'<path d="m15 18-6-6 6-6"/>',play:'<path d="m9 7 8 5-8 5V7Z"/>',check:'<path d="m5 12 4 4L19 6"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',moon:'<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',speed:'<path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-4M7 19h10"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'};
const ic=n=>`<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const SAFE=k=>typeof k==='string'&&/^[A-Za-z0-9_-]{5,24}$/.test(k);
const cleanLesson=a=>(Array.isArray(a)?a:[]).slice(0,5).map(c=>({title:String(c&&c.title||'').slice(0,80),hook:String(c&&c.hook||'').slice(0,200),points:(Array.isArray(c&&c.points)?c.points:[]).slice(0,3).map(p=>String(p).slice(0,140)),takeaway:String(c&&c.takeaway||'').slice(0,140)})).filter(c=>c.title);
const today=()=>new Date().toISOString().slice(0,10);
function mark(){const d=today();if(!S.days.includes(d))S.days.push(d)}
function streak(){let n=0,d=new Date();if(!S.days.includes(today()))d=new Date(Date.now()-864e5);while(S.days.includes(d.toISOString().slice(0,10))){n++;d=new Date(d-864e5)}return n}
function toast(m,err){const t=document.createElement('div');t.setAttribute('role','status');t.textContent=m;t.className='toast'+(err?' err':'');document.body.appendChild(t);setTimeout(()=>t.remove(),4200)}
async function api(path,opt){const r=await fetch(path,opt);if(!r.ok){let m='Request failed ('+r.status+')';try{m=(await r.json()).error||m}catch(e){}throw new Error(m)}return r.json()}
const setBusy=(sel,txt)=>{const b=document.querySelector(sel);if(b){b.disabled=true;b.textContent=txt}};
let busy=false;
const KEY='intentscroll-v1';
const mk=(id,title,goal)=>({id,title,lang:'English',goal,seen:[],quiz:true});
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
S=S||{topics:[mk(1,'Behavioral economics',12),mk(2,'Modern architecture',8),mk(3,'The science of sleep',10)],sources:[],settings:{theme:null,reduced:false}};
S.days=Array.isArray(S.days)?S.days.filter(d=>/^\d{4}-\d\d-\d\d$/.test(d)).slice(-400):[];
S.settings=Object.assign({theme:null,reduced:false},S.settings);
S.sources=(Array.isArray(S.sources)?S.sources:[]).filter(x=>x&&SAFE(x.key)&&(x.type=='yt'||x.type=='ig')).map(x=>({id:+x.id||0,topicId:+x.topicId||0,type:x.type,key:x.key,title:String(x.title||'').slice(0,120),channel:String(x.channel||'').slice(0,60)}));
S.topics=(Array.isArray(S.topics)?S.topics:[]).map(t=>({id:+t.id||0,title:String(t.title||'').slice(0,60),lang:String(t.lang||'English').slice(0,20),goal:Math.max(1,Math.min(100,+t.goal||10)),quiz:!!t.quiz,score:t.score==null?undefined:(+t.score||0),seen:(Array.isArray(t.seen)?t.seen:[]).filter(k=>/^[\w-]{1,24}$/.test(k)).slice(0,300),lesson:t.lesson?cleanLesson(t.lesson):undefined}));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let view='home',sel=null,modal=null,quiz={s:false,i:0,a:[]};
const SUG=['Decision making','Design psychology','Personal finance'];
const QS=[{q:'Which approach best supports long-term learning?',o:['Active recall','Passive rereading','Multitasking'],a:0},{q:'What makes a goal more actionable?',o:['Keeping it broad','Adding a measurable target','Avoiding a deadline'],a:1},{q:'When should you review new information?',o:['At spaced intervals','Only once','Before learning it'],a:0}];
const pct=t=>Math.min(100,Math.round(Math.min(t.goal,t.seen.length)/t.goal*100));
const ring=v=>`<div class="ring" style="background:conic-gradient(var(--on) ${v}%,var(--ring) ${v}% 100%)"><i>${v}%</i></div>`;
const T=id=>S.topics.find(t=>t.id===id);
const searchUrl=t=>'https://www.youtube.com/results?search_query='+encodeURIComponent(t.title+' '+t.lang+' #shorts')+'&sp=EgIYAQ%253D%253D';
function parse(u){u=u.trim();let m=u.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);if(m)return{type:'yt',key:m[1]};m=u.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);return m?{type:'ig',key:m[1]}:null}

function home(){
  const done=S.topics.filter(t=>pct(t)>=100).length,n=S.topics.length;
  return `<header style="max-width:760px;margin-bottom:40px"><p class="sub" style="font-weight:600">Your learning space · ${streak()}-day streak</p><h1>Keep your curiosity moving.</h1></header>
  <div class="grid g3"><article class="pc" style="grid-column:span 2;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center"><div><p class="eye">Learning progress</p><h2 style="margin:8px 0 0;font-size:24px">Your active tabs</h2></div><button class="rb" data-a="nav" data-v="tabs" aria-label="Open tabs">${ic('arrow')}</button></div>
  <div style="margin-top:24px">${n?S.topics.slice(0,3).map(t=>`<button class="row" data-a="open" data-id="${t.id}"><div><b>${E(t.title)}</b><p class="sub" style="margin:4px 0 0">${E(t.lang)} · Goal ${t.goal} videos${t.quiz?' · Quiz '+(t.score!=null?(+t.score||0)+'%':'ready'):''}</p></div>${ring(pct(t))}</button>`).join(''):'<p class="empty">No tabs yet. Create one below.</p>'}</div></article>
  <article class="pc dk"><p class="eye" style="color:#a3a3a3">Goals reached</p><p style="margin:32px 0 0;font-size:96px;font-weight:700;letter-spacing:-.08em;line-height:1">${done}<span style="font-size:32px;color:#777">/${n}</span></p><p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#d4d4d4">${done?'Strong work. You finished a learning goal.':'Finish your video goals to build lasting momentum.'}</p><div class="bar" style="margin-top:32px;background:#262626"><b style="background:#b7f565;width:${n?done/n*100:0}%"></b></div></article></div>
  <article class="pc bl" style="margin-top:20px"><p class="eye">Picked for you</p><h2 style="margin:12px 0 4px;font-size:30px;letter-spacing:-.03em">What could you learn next?</h2><p class="sub">Create a topic from a suggestion and set your own goal.</p><div class="grid g3" style="margin-top:20px">${SUG.map((s,i)=>`<button class="sc" style="min-height:140px;display:flex;flex-direction:column;justify-content:space-between;text-align:left" data-a="new" data-t="${E(s)}"><span class="sub">0${i+1}</span><span style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;font-weight:700">${E(s)}<span class="rb" style="width:36px;height:36px;font-size:20px">+</span></span></button>`).join('')}</div></article>`;
}
function tabsList(){
  return `<header class="hd"><div><p class="eye">Your library · ${S.topics.length}</p><h1>Tabs</h1></div><button class="plus" data-a="new" data-t="" aria-label="Create tab">+</button></header>
  <div>${S.topics.length?S.topics.map((t,i)=>`<div class="tr"><span class="eye">0${i+1}</span><button data-a="open" data-id="${t.id}" style="text-align:left;min-height:80px"><strong>${E(t.title)}</strong><small class="sub" style="display:block;margin-top:4px">${E(t.lang)} · Goal: ${t.goal} videos · ${t.quiz?'Quiz on':'Quiz off'} · ${pct(t)}%</small></button><button class="circ" style="border:0" data-a="open" data-id="${t.id}" aria-label="Open ${E(t.title)}">${ic('arrow')}</button><button class="rm" data-a="deltab" data-id="${t.id}" aria-label="Remove ${E(t.title)}">${ic('trash')}</button></div>`).join(''):'<p class="empty">No tabs yet. Tap + to create your first one.</p>'}</div>`;
}
function quizHtml(t){
  if(t.score!=null&&!quiz.s)return `<div style="text-align:center;padding:24px 0"><span class="rb" style="margin:auto;background:#b7f565;color:#000">${ic('check')}</span><p class="sub" style="margin:16px 0 0;font-weight:600">Quiz complete</p><p style="margin:4px 0;font-size:60px;font-weight:700;letter-spacing:-.05em">${+t.score||0}%</p><button style="min-height:44px;border-bottom:1px solid var(--ink);font-weight:600" data-a="qstart">Try again</button></div>`;
  if(!quiz.s)return `<div style="text-align:center;padding:48px 0"><p class="sub">${QS.length} questions · about 2 min</p><h3 style="margin:8px 0 24px;font-size:24px">Ready to test yourself?</h3><button class="pb" data-a="qstart" style="padding:12px 40px">Start quiz</button></div>`;
  const q=QS[quiz.i],last=quiz.i===QS.length-1;
  return `<div><div style="display:flex;justify-content:space-between" class="eye sub"><span>Question ${quiz.i+1}</span><span>${quiz.i+1}/${QS.length}</span></div><h3 style="margin:20px 0;font-size:22px">${q.q}</h3><div class="sg" style="margin:0">${q.o.map((o,i)=>`<button class="opt${quiz.a[quiz.i]===i?' sel':''}" data-a="qpick" data-i="${i}">${'ABC'[i]}. ${o}</button>`).join('')}</div><div style="display:flex;justify-content:space-between;margin-top:24px"><button class="sb" data-a="qprev" ${quiz.i?'':'disabled'}>Back</button>${last?`<button class="pb" style="background:#b7f565;color:#000" data-a="qfin" ${quiz.a.length<QS.length||quiz.a.includes(undefined)?'disabled':''}>Finish quiz</button>`:`<button class="pb" data-a="qnext" ${quiz.a[quiz.i]===undefined?'disabled':''}>Next</button>`}</div></div>`;
}
function detail(t){
  const p=pct(t),c=S.sources.filter(s=>s.topicId===t.id).length;
  return `<button data-a="back" style="display:flex;gap:8px;align-items:center;min-height:44px;font-weight:700;margin-bottom:24px">${ic('back')} All tabs</button><p class="eye">Learning tab · ${E(t.lang)}</p><h1 style="font-size:clamp(2.6rem,7vw,5.5rem)">${E(t.title)}</h1><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px"><button class="pb" id="bAuto" data-a="auto" data-id="${t.id}">✦ Auto-find videos</button><button class="sb" id="bAi" data-a="ai" data-id="${t.id}">✦ ${t.lesson&&t.lesson.length?'Refresh':'Generate'} AI key ideas</button></div>
  <div class="grid g3" style="margin-top:40px"><article class="pc"><p class="eye">01 · Progress</p><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px"><p style="margin:0;font-size:60px;font-weight:700">${p}%</p>${ring(p)}</div><div class="bar" style="margin-top:32px"><b style="width:${p}%"></b></div><p class="sub" style="margin-top:12px">${Math.min(t.goal,t.seen.length)} of ${t.goal} videos watched</p></article>
  <button class="pc vi" data-a="feed" style="min-height:320px"><p class="eye" style="opacity:.6">02 · Content</p><span class="circ" style="margin-top:40px;width:64px;height:64px">${ic('play')}</span><h2 style="margin:32px 0 0;font-size:30px">Start scrolling</h2><p style="margin:8px 0 0;font-size:14px;opacity:.75">${c||(t.lesson||[]).length?c+' video'+(c==1?'':'s')+((t.lesson||[]).length?' + '+t.lesson.length+' AI ideas':'')+'. The feed ends.':'Tap Auto-find videos to fill this tab.'}</p></button>
  <article class="pc li"><p class="eye">03 · Quiz</p><div style="margin-top:16px">${t.quiz?quizHtml(t):'<p class="empty">Quiz is disabled for this tab.</p>'}</div></article></div>`;
}
function sources(){
  return `<header class="hd"><div><p class="eye">Knowledge inputs</p><h1>Sources</h1></div><button class="plus" data-a="addsrc" aria-label="Add source">+</button></header><div class="grid" style="margin-top:32px">${S.topics.map(t=>{const it=S.sources.filter(s=>s.topicId===t.id);return `<section class="pc" style="background:transparent;box-shadow:none"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--soft);padding-bottom:16px;gap:8px"><div><p class="eye sub">Tab topic</p><h2 style="margin:4px 0 0;font-size:24px">${E(t.title)}</h2></div><span class="eye" style="border:1px solid var(--soft);border-radius:99px;padding:6px 12px">${it.length} source${it.length==1?'':'s'}</span></div><div class="grid g3" style="margin-top:16px">${it.length?it.map(s=>`<article class="sc"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="circ" style="border:0;background:var(--ring)">${ic('video')}</span><button class="rm" data-a="delsrc" data-id="${s.id}" aria-label="Remove source">${ic('trash')}</button></div><p class="eye sub" style="margin:24px 0 0">${s.type=='yt'?'YouTube Short':'Instagram Reel'}</p><h3 style="margin:6px 0 0;font-size:15px;overflow-wrap:anywhere">${E(s.title||s.key)}</h3>${s.channel?`<p class="sub" style="margin:4px 0 0;font-size:13px">${E(s.channel)}</p>`:''}</article>`).join(''):'<p class="empty" style="grid-column:1/-1">No videos yet. <a class="lnk" style="color:var(--ink);font-weight:700" target="_blank" rel="noopener" href="'+searchUrl(t)+'">Find Shorts on YouTube ↗</a></p>'}</div></section>`}).join('')||'<p class="empty">Create a tab first.</p>'}</div>`;
}
function modalHtml(){
  if(!modal)return '';
  const wrap=(title,body)=>`<div class="mb" data-a="mclose"><div class="mp" role="dialog" aria-modal="true" aria-label="${E(title)}"><div class="mh"><h2>${E(title)}</h2><button class="x" data-a="mx" aria-label="Close">×</button></div>${body}</div></div>`;
  if(modal.k=='new')return wrap('Create a learning tab',`<form data-f="topic" style="display:grid;gap:20px"><label class="field">Topic<input name="topic" required value="${E(modal.t||'')}" placeholder="e.g. Art history"></label><label class="field">Video language<input name="lang" required value="English" placeholder="e.g. Spanish, Hindi"></label><label class="field">How many videos per goal?<input name="goal" type="number" min="1" max="100" value="10" required></label><label style="display:flex;justify-content:space-between;align-items:center;min-height:56px;border:1px solid #c8c8c4;border-radius:16px;padding:0 16px;font-weight:600">Enable quiz<input name="quiz" type="checkbox" checked style="width:20px;height:20px;accent-color:#000"></label><button class="pb">Create tab</button><p class="sub" style="text-align:center;font-size:12px;margin:0">Saved only in this browser.</p></form>`);
  if(modal.k=='src')return wrap('Add a video',`<form data-f="src" style="display:grid;gap:20px"><label class="field">Which tab is this for?<select name="topic">${S.topics.map(t=>`<option value="${t.id}"${t.id==sel?' selected':''}>${E(t.title)}</option>`).join('')}</select></label><label class="field">YouTube Shorts or Instagram Reel link<input name="url" type="url" required placeholder="https://"></label><p class="sub" id="ferr" style="margin:0;color:var(--danger)"></p><button class="pb" ${S.topics.length?'':'disabled'}>Add video</button></form>`);
  if(modal.k=='delt'){const t=T(modal.id);return wrap('Remove this tab?',`<p style="line-height:1.6;color:var(--muted)"><strong style="color:var(--ink)">${E(t.title)}</strong>, its progress, quiz result and videos will be removed from this browser.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px"><button class="sb" data-a="mx">Keep tab</button><button class="db" data-a="dotab" data-id="${t.id}">Remove tab</button></div>`)}
  if(modal.k=='dels')return wrap('Remove this video?',`<p style="line-height:1.6;color:var(--muted)">It will be removed from this browser. This can’t be undone.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px"><button class="sb" data-a="mx">Keep it</button><button class="db" data-a="dosrc" data-id="${modal.id}">Remove</button></div>`);
  if(modal.k=='set'){const s=S.settings,dk=s.theme?s.theme=='dark':matchMedia('(prefers-color-scheme:dark)').matches;return wrap('Experience settings',`<button class="set" data-a="dark" aria-pressed="${dk}"><span class="circ">${ic('moon')}</span><span><strong style="display:block">Dark mode</strong><small class="sub">A softer, low-light appearance</small></span><span class="tg${dk?' on':''}"><span></span></span></button><button class="set" data-a="motion" aria-pressed="${s.reduced}"><span class="circ">${ic('speed')}</span><span><strong style="display:block">Minimal performance</strong><small class="sub">No motion, blur, or heavy effects</small></span><span class="tg${s.reduced?' on':''}"><span></span></span></button><button class="sb" data-a="wipe" style="width:100%;margin-bottom:12px">Reset all data</button><p class="sub" style="font-size:12px;line-height:1.6">Everything is stored only in this browser. Video lists come from YouTube; key ideas are AI-generated, so double-check important facts.</p>`)}
}
function render(){
  document.documentElement.dataset.theme=S.settings.theme||'';
  document.body.classList.toggle('low',!!S.settings.reduced);
  const t=sel&&T(sel);let body;
  if(view=='home')body=home();else if(view=='tabs')body=t?detail(t):tabsList();else body=sources();
  $('#app').innerHTML=`<header class="top"><button class="brand" data-a="nav" data-v="home" aria-label="IntentScroll home"><img class="logo" src="/logo.png" alt="" width="27" height="30">IntentScroll</button><div style="display:flex;align-items:center"><span class="tag" style="display:none" id="tg">Learn with intent</span><button class="circ" data-a="set" aria-label="Open settings">${ic('settings')}</button></div></header><main key="${view}${sel}">${body}</main><nav aria-label="Primary navigation"><div>${[['home','Home'],['tabs','Tabs'],['source','Source']].map(([v,l])=>`<button data-a="nav" data-v="${v}" aria-pressed="${view==v}">${ic(v)}${l}</button>`).join('')}</div></nav>`;
  if(innerWidth>=640)$('#tg').style.display='block';
  $('#modal').innerHTML=modalHtml();
  const f=$('#modal input,#modal select');if(f&&modal&&(modal.k=='new'||modal.k=='src'))f.focus();
}
function openFeed(id){
  const t=T(id);if(!t)return;const src=S.sources.filter(s=>s.topicId===id&&SAFE(s.key));const L=t.lesson||[],has=src.length||L.length;
  const el=$('#feed');
  const cols=['#4c38ff','#0b0b0b','#dff0ff'];const ai=L.map((c,i)=>`<article class="fc" data-k="ai${i}" style="background:${cols[i%3]};color:${i%3==2?'#000':'#fff'}"><span class="eye" style="opacity:.7">AI key idea ${i+1}/${L.length}</span><h2 style="font-size:clamp(1.8rem,6vw,3rem);letter-spacing:-.04em;margin:0;max-width:640px">${E(c.title)}</h2><p style="max-width:520px;opacity:.85;line-height:1.6;margin:0">${E(c.hook)}</p><ul style="text-align:left;max-width:520px;line-height:1.7;margin:0">${c.points.map(p=>`<li>${E(p)}</li>`).join('')}</ul><p style="font-weight:800;margin:0;max-width:520px">${E(c.takeaway)}</p><span class="eye" style="opacity:.5">AI-generated · verify important facts</span></article>`).join('');const cards=ai+src.map((s,i)=>{const u=s.type=='yt'?'https://www.youtube-nocookie.com/embed/'+s.key+'?playsinline=1&rel=0':'https://www.instagram.com/reel/'+s.key+'/embed';const l=s.type=='yt'?'https://www.youtube.com/shorts/'+s.key:'https://www.instagram.com/reel/'+s.key+'/';return `<article class="fc" data-k="${E(s.key)}"><span class="eye" style="opacity:.7">${E(t.title)} · ${i+1}/${src.length}</span><div class="fr"><iframe loading="lazy" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" src="${u}" title="Video ${i+1}"></iframe></div><a href="${l}" target="_blank" rel="noopener" class="lnk">Open original ↗</a></article>`}).join('');
  const end=`<article class="fc"><div style="max-width:420px"><h2 style="font-size:36px;letter-spacing:-.03em;margin:0">${has?(pct(t)>=100?'Goal reached. You’re done for today.':'That’s the end of this tab.'):'No videos yet'}</h2><p style="opacity:.7;line-height:1.6">${has?'Go use what you learned.':'Tap Auto-find videos on the tab page, or add links in Source.'}</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px"><a class="pb lnk" style="background:#fff;color:#000" target="_blank" rel="noopener" href="${searchUrl(t)}">Find Shorts ↗</a><button class="sb" data-a="closefeed">Back</button></div></div></article>`;
  el.innerHTML=`<div class="feed" id="fd"><button class="back" data-a="closefeed">${ic('back')} Back</button><span class="fp" id="fp">${Math.min(t.goal,t.seen.length)}/${t.goal}</span>${cards}${end}</div>`;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const k=e.target.dataset.k;if(k&&!t.seen.includes(k)){t.seen.push(k);mark();save();$('#fp').textContent=Math.min(t.goal,t.seen.length)+'/'+t.goal}}),{root:$('#fd'),threshold:.6});
  el.querySelectorAll('[data-k]').forEach(c=>io.observe(c));
  document.body.style.overflow='hidden';
}
function closeFeed(){$('#feed').innerHTML='';document.body.style.overflow='';render()}
async function autoFind(id){
  if(busy)return;const t=T(id);if(!t)return;busy=true;setBusy('#bAuto','Finding videos…');
  try{const r=await api('/api/youtube?q='+encodeURIComponent(t.title)+'&lang='+encodeURIComponent(t.lang));let n=0;
    (Array.isArray(r.videos)?r.videos:[]).forEach(v=>{if(v&&SAFE(v.id)&&!S.sources.some(x=>x.topicId===id&&x.key===v.id)){S.sources.push({id:Date.now()+n,topicId:id,type:'yt',key:v.id,title:String(v.title||'').slice(0,120),channel:String(v.channel||'').slice(0,60)});n++}});
    save();toast(n?'Added '+n+' Shorts to “'+t.title+'”':'No new Shorts found. Try a broader topic.')}
  catch(e){toast('Auto-find unavailable: '+e.message,true)}
  busy=false;render()}
async function genAI(id){
  if(busy)return;const t=T(id);if(!t)return;busy=true;setBusy('#bAi','Writing key ideas…');
  try{const titles=S.sources.filter(x=>x.topicId===id&&x.title).slice(0,8).map(x=>x.title);
    const r=await api('/api/lesson',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({topic:t.title,lang:t.lang,titles})});
    const c=cleanLesson(r.cards);if(!c.length)throw new Error('Empty result');t.lesson=c;save();toast(c.length+' AI key ideas added to your feed')}
  catch(e){toast('AI unavailable: '+e.message,true)}
  busy=false;render()}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,d=b.dataset;
  if(a=='mclose'){if(e.target!==b)return;modal=null}
  else if(a=='mx')modal=null;
  else if(a=='nav'){view=d.v;sel=null}
  else if(a=='open'){view='tabs';sel=+d.id;quiz={s:false,i:0,a:[]}}
  else if(a=='back')sel=null;
  else if(a=='new')modal={k:'new',t:d.t};
  else if(a=='addsrc')modal={k:'src'};
  else if(a=='set')modal={k:'set'};
  else if(a=='deltab')modal={k:'delt',id:+d.id};
  else if(a=='delsrc')modal={k:'dels',id:+d.id};
  else if(a=='dotab'){S.topics=S.topics.filter(t=>t.id!=d.id);S.sources=S.sources.filter(s=>s.topicId!=d.id);sel=null;modal=null;save()}
  else if(a=='dosrc'){S.sources=S.sources.filter(s=>s.id!=d.id);modal=null;save()}
  else if(a=='dark'){const s=S.settings;const dk=s.theme?s.theme=='dark':matchMedia('(prefers-color-scheme:dark)').matches;s.theme=dk?'light':'dark';save()}
  else if(a=='motion'){S.settings.reduced=!S.settings.reduced;save()}
  else if(a=='feed'){openFeed(sel);return}
  else if(a=='auto'){autoFind(+d.id);return}
  else if(a=='ai'){genAI(+d.id);return}
  else if(a=='wipe'){if(confirm('Delete all tabs, videos and progress from this browser?')){try{localStorage.removeItem(KEY)}catch(e){}location.reload()}return}
  else if(a=='closefeed'){closeFeed();return}
  else if(a=='qstart')quiz={s:true,i:0,a:[]};
  else if(a=='qpick')quiz.a[quiz.i]=+d.i;
  else if(a=='qnext')quiz.i++;
  else if(a=='qprev')quiz.i--;
  else if(a=='qfin'){const t=T(sel);t.score=Math.round(QS.filter((q,i)=>quiz.a[i]===q.a).length/QS.length*100);quiz.s=false;save()}
  render();
});
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target.dataset.f,D=new FormData(e.target);
  if(f=='topic'){const t={id:Date.now(),title:String(D.get('topic')).trim().slice(0,60),lang:String(D.get('lang')).trim().slice(0,20),goal:Math.max(1,Math.min(100,+D.get('goal')||10)),seen:[],quiz:!!D.get('quiz')};S.topics.push(t);save();modal=null;view='tabs';sel=t.id;quiz={s:false,i:0,a:[]};render()}
  if(f=='src'){const p=parse(String(D.get('url'))),id=+D.get('topic');
    if(!p){$('#ferr').textContent='That doesn’t look like a YouTube or Instagram Reel link.';return}
    if(S.sources.some(s=>s.topicId===id&&s.key===p.key)){$('#ferr').textContent='Already added to this tab.';return}
    S.sources.push({id:Date.now(),topicId:id,type:p.type,key:p.key});save();modal=null;render()}
});
document.addEventListener('keydown',e=>{if(e.key=='Escape'){if($('#feed').innerHTML)closeFeed();else if(modal){modal=null;render()}}});
render();
