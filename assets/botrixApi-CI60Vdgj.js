const C="/api/kick?endpoint="+encodeURIComponent("https://botrix.live/api/public/leaderboard?platform=kick&user=iabs"),x="iabs_botrix_cache_v1",y=300*1e3;let l=null,u=null;function h(t){if(typeof t=="number"&&Number.isFinite(t))return Math.round(t);if(typeof t=="string"){const n=parseInt(t.replace(/[^\d]/g,""),10);return Number.isFinite(n)?n:0}return 0}function M(t){return Array.isArray(t)?t.filter(n=>n&&typeof n.name=="string"&&n.name.trim().length>0).map(n=>({name:String(n.name).trim(),level:h(n.level),watchtime:h(n.watchtime),xp:h(n.xp),points:h(n.points)})):[]}function w(){if(l&&Date.now()-l.at<y)return l.data;try{const t=localStorage.getItem(x);if(!t)return null;const{at:n,data:e}=JSON.parse(t);return!Array.isArray(e)||Date.now()-n>y?null:(l={at:n,data:e},e)}catch{return null}}function _(t){l={at:Date.now(),data:t};try{localStorage.setItem(x,JSON.stringify({at:Date.now(),data:t}))}catch{}}async function L(t=!1){if(!t){const n=w();if(n)return n}return u||(u=(async()=>{try{const n=await fetch(C);if(!n.ok)throw new Error(`HTTP ${n.status}`);const e=await n.json(),r=M(e);return r.length>0&&_(r),r.length>0?r:w()||[]}catch{return w()||[]}finally{u=null}})(),u)}function $(t,n=10){return[...t].sort((e,r)=>r.watchtime-e.watchtime).slice(0,n)}function R(t,n=10){const e=$(t,n);if(e.length===0)return null;let r=0;try{const o=new Uint32Array(1);crypto.getRandomValues(o),r=o[0]%e.length}catch{r=Math.floor(Math.random()*e.length)}return e[r]}function S(t,n){const e=t.toLowerCase(),o=[...$(n,50)].sort((i,c)=>c.name.length-i.name.length);for(const i of o){const c=i.name.toLowerCase();if(c.length<3)continue;if(new RegExp(`(^|[^a-z0-9_])${c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}([^a-z0-9_]|$)`,"i").test(e))return i}return null}function b(t,n="ar"){const e=Math.max(0,Math.round(t||0)),r=Math.floor(e/86400),o=Math.floor(e%86400/3600),i=Math.floor(e%3600/60);return r>0?n==="ar"?`${r} يوم و${o} ساعة`:`${r}d ${o}h`:o>0?n==="ar"?`${o} ساعة`:`${o}h`:n==="ar"?`${i} دقيقة`:`${i}m`}function g(t){return t>=1e6?`${(t/1e6).toFixed(1)}M`:t>=1e3?`${(t/1e3).toFixed(1)}K`:`${t||0}`}function p(t,n){return`${t.name} — ${b(t.watchtime,n)} مشاهدة | لفله ${t.level} | ${g(t.xp)} XP | ${g(t.points)} نقطة`}const T=/اختار|اختر|رشح|عشوائ|واحد من|من الشات|ضحية|مين|منو|pick|random|choose/i,k=/اكثر|أكثر|اكتر|احسن|أحسن|افضل|أفضل|متصدر|توب|ملك|اسوأ|أسوأ|ازعج|أزعج|هطف|ورع|اطول|أطول|مدمن|top|best|most/i,A=/ساعات|ساعه|نقاط|نقط|مستو|لفل|xp|اكس بي|كم عنده|كم عنده|وش عنده|احصائ|إحصائ/i,E=/ساعاتي|نقاطي|نقطي|كم عندي|انا كم|أنا كم|مستواي|لفلي|ساعات انا/i;function N(t,n,e="ar"){if(!n||n.length===0)return`

[بوتريكس]: البيانات غير متوفرة حالياً. قل: "البيانات غير متوفرة حالياً" ولا تخترع أسماء ولا أرقام أبداً.`;const r=T.test(t),o=k.test(t),i=A.test(t)||o||r,c=E.test(t),s=S(t,n);if(c&&!s)return`

[بوتريكس]: المستخدم يسأل عن ساعات/نقاط نفسه ولم يذكر اسمه. اسأله أولاً بلطف عن اسمه في الكيك — ممنوع اختراع أي أرقام له.`;if(!i&&!s)return`

[بوتريكس]: توب 3 أهل الشات حالياً: ${$(n,3).map(m=>`${m.name} (${b(m.watchtime,e)})`).join("، ")}. استخدمها فقط لو سُئلت عن الشات.`;const d=$(n,10);let f=`

[أهل الشات من بوتريكس — بيانات حية، هذول فقط أهل الشات]
${d.map((a,m)=>`${m+1}. ${p(a,e)}`).join(`
`)}`;if(s&&(f+=`

⭐ الشخص المذكور في السؤال: ${p(s,e)} — أعطه أرقامه الحقيقية هذه مع تعليق ودود ومشجع.`),r){const a=R(n,10);a&&(f+=`

🎲 الاختيار العشوائي المحسوم: ${p(a,e)}
القاعدة: إذا طلب منك اختيار/ترشيح شخص استخدم هذا الاسم حرفياً ولا تغيره ولا تخترع غيره، وقدّمه بأسلوب مهذب ومحايد دون أي سخرية أو إساءة.`)}if(o&&!r){const a=d[0];a&&(f+=`

👑 الأول والأكثر: ${p(a,e)} — هذا جواب أي سؤال عن "الأكثر/الأعلى/المتصدر".`)}return f+=`

قواعد صارمة: (1) هذي الأسماء فقط هي أهل الشات — ممنوع تخترع اسم مو موجود هنا. (2) ممنوع تخترع أرقام — انسخها كما هي. (3) إذا سُئلت عن شخص مو موجود في القائمة قل إنك ما لقيته واطلب يتأكد من الاسم.`,f}export{N as b,L as f};
