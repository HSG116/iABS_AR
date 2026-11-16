/* ============================================================
   أرشيف جدار الـ60 — منطق العرض فقط (قراءة فقط)
   لا رفع، لا رسائل، لا إعجابات، لا بلاغات — عرض الذكريات فقط
   ============================================================ */
const $ = (s) => document.querySelector(s);
const state = {
  submissions: [], messages: [],
  gallery: 'media', sort: 'balanced', videosOnly: false, msgSort: 'newest',
  cols: columnCount(), loading: true, failed: false,
  lbList: [], lbIndex: 0, lbItem: null,
};
const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- إحصائيات عدّادة ---------- */
function countUp(el, to) {
  const from = Number(el.dataset.v || 0);
  if (from === to) { el.textContent = fmtNum(to); return; }
  el.dataset.v = to;
  const t0 = performance.now(), dur = 800;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmtNum(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function updateStats() {
  countUp($('#stEdits'), state.submissions.length);
  countUp($('#stPeople'), new Set(state.submissions.map((s) => s.name.toLowerCase())).size);
  countUp($('#stMsgs'), state.messages.length);
  $('#galMediaN').textContent = fmtNum(state.submissions.length);
  $('#galMsgN').textContent = fmtNum(state.messages.length);
}

/* ---------- جلب البيانات (مرة واحدة + تحديث يدوي) ---------- */
async function fetchWall(showSpin) {
  if (showSpin) $('#refreshWall').classList.add('spin');
  try {
    const [subs, msgs] = await Promise.all([
      sbGet('edits_submissions', 'status=eq.approved&order=created_at.desc&limit=600'),
      sbGet('edits_messages', 'status=eq.approved&order=created_at.desc&limit=600'),
    ]);
    state.submissions = subs.map(normalizeMedia);
    state.messages = msgs;
    state.failed = false;
  } catch (e) {
    state.failed = true;
    $('#wallNotice').innerHTML = `<div class="notice">${IC.warn}<div><b>الأرشيف غير متصل حالياً</b><p>${esc(e.message || 'تعذر جلب البيانات')} — حدّث الصفحة بعد قليل.</p></div></div>`;
  }
  state.loading = false;
  $('#refreshWall').classList.remove('spin');
  updateStats();
  renderWall();
}

/* ---------- ترتيب + رص ---------- */
function orderedMedia() {
  let src = state.videosOnly ? state.submissions.filter((s) => s.media_type === 'video') : state.submissions;
  if (state.sort === 'newest') return [...src].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (state.sort === 'top') return [...src].sort((a, b) => b.likes_count - a.likes_count);
  return seededShuffle(src);
}
function orderedMessages() {
  const src = state.messages;
  if (state.msgSort === 'random') return seededShuffle(src);
  if (state.msgSort === 'top') return [...src].sort((a, b) => b.likes_count - a.likes_count);
  return [...src].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/* ---------- بناء الكروت ---------- */
function mediaCardEl(sub, idx, priority) {
  const el = document.createElement('article');
  el.className = 'wcard' + (sub.media_type === 'video' ? ' has-vbadge' : '');
  el.style.setProperty('--dl', Math.min(idx, 6) * 0.05 + 's');
  const ratio = mediaRatio(sub);
  const thumb = sub.media_type === 'image' ? imageThumb(sub.media_url) : posterSrc(sub, 640);
  el.innerHTML = `
    <div class="media" style="aspect-ratio:${ratio}">
      ${thumb
        ? `<img class="thumb" src="${esc(thumb)}" alt="${esc(sub.caption || sub.name)}" loading="${priority ? 'eager' : 'lazy'}" decoding="async" ${priority ? 'fetchpriority="high"' : ''}>`
        : `<div class="thumb thumb-empty" aria-hidden="true"></div>`}
      <div class="shade"></div>
      ${sub.media_type === 'video' ? `<span class="vbadge">${IC.video} فيديو</span><span class="playbtn">${IC.play}</span>` : ''}
    </div>
    <span class="likepill" title="عدد الإعجابات">${IC.heart}<span class="mono-num">${fmtNum(sub.likes_count)}</span></span>
    <div class="body">
      <div class="who">@${esc(sub.name)}</div>
      <div class="cap">${esc(sub.caption || 'بدون وصف')}</div>
      <div class="when">${timeAgo(sub.created_at)}</div>
    </div>`;
  const img = el.querySelector('img.thumb');
  if (img) previewFallback(img, sub);
  /* فيديو hover — ديسكتوب فقط */
  if (sub.media_type === 'video' && hoverFine) {
    const media = el.querySelector('.media');
    let vid = null;
    media.addEventListener('mouseenter', () => {
      if (vid) return;
      const sources = mediaSources(sub);
      if (!sources.length) return;
      vid = document.createElement('video');
      vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'metadata';
      let i = 0;
      const tryNext = () => { if (i < sources.length) vid.src = sources[i++]; else { vid.remove(); vid = null; } };
      vid.addEventListener('error', tryNext);
      vid.addEventListener('loadeddata', () => { if (vid.duration > 0.1) { try { vid.currentTime = 0.1; } catch {} } }, { once: true });
      tryNext();
      media.insertBefore(vid, media.querySelector('.shade'));
      vid.play().catch(() => {});
    });
    media.addEventListener('mouseleave', () => { if (vid) { vid.pause(); vid.remove(); vid = null; } });
  }
  el.addEventListener('click', () => openLightbox(sub));
  return el;
}

const MSG_ACCENTS = ['#FF2D2D', '#F5E9E4', '#6AB8FF', '#3DDC97', '#FFB020', '#C9B8FF'];
function messageCardEl(msg, idx) {
  const el = document.createElement('article');
  el.className = 'mcard';
  el.style.setProperty('--dl', Math.min(idx, 6) * 0.05 + 's');
  const h = hashIds([msg]);
  el.style.setProperty('--ac', MSG_ACCENTS[Math.abs(h) % MSG_ACCENTS.length]);
  el.style.setProperty('--tilt', ((Math.abs(h >> 3) % 5) - 2) * 0.4 + 'deg');
  el.innerHTML = `
    <div class="head">
      <span class="av">${avatarSVG(msg.avatar, 44)}</span>
      <span class="nm"><b>${esc(msg.name)}</b><small>${msg.anonymous ? '<span class="anon-badge">مجهول</span>' : 'عضو المجتمع'}</small></span>
    </div>
    <div class="txt">${esc(msg.body)}</div>
    <div class="foot">
      <span class="when">${timeAgo(msg.created_at)}</span>
      <span class="likepill" title="عدد الإعجابات">${IC.heart}<span class="mono-num">${fmtNum(msg.likes_count)}</span></span>
    </div>`;
  return el;
}

/* ---------- رندر الجدار ---------- */
function renderWall() {
  const colsEl = $('#wallCols'), emptyEl = $('#wallEmpty');
  colsEl.innerHTML = ''; emptyEl.innerHTML = '';
  if (state.loading) {
    $('#wallNotice').innerHTML = '';
    for (let c = 0; c < Math.min(state.cols, 3); c++) {
      const col = document.createElement('div'); col.className = 'wall-col';
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('div'); s.className = 'skel skel-card';
        s.style.height = (180 + ((i * 97 + c * 53) % 160)) + 'px';
        col.appendChild(s);
      }
      colsEl.appendChild(col);
    }
    return;
  }
  if (state.failed) return;
  $('#wallNotice').innerHTML = '';
  const isMedia = state.gallery === 'media';
  const items = isMedia ? orderedMedia() : orderedMessages();
  $('#wallCount').textContent = isMedia ? `${fmtNum(items.length)} إيديت` : '';
  $('#msgCount').textContent = !isMedia ? `${fmtNum(items.length)} رسالة` : '';
  if (items.length === 0) {
    emptyEl.innerHTML = isMedia
      ? `<div class="empty"><div class="ic">${IC.spark}</div><b>لا إيديتات في الأرشيف</b><p>ما انحفظت أي إيديتات معتمدة على الجدار</p></div>`
      : `<div class="empty"><div class="ic">${IC.msg}</div><b>لا رسائل في الأرشيف</b><p>ما انحفظت أي رسائل على جدار الأساطير</p></div>`;
    return;
  }
  const packed = isMedia ? packColumns(items, state.cols) : packColumns(items, state.cols, messageCost, messageOrient);
  packed.forEach((col, ci) => {
    const colEl = document.createElement('div'); colEl.className = 'wall-col';
    col.forEach((item, i) => {
      const idx = i * state.cols + ci;
      colEl.appendChild(isMedia ? mediaCardEl(item, idx, idx < state.cols * 2 + 2) : messageCardEl(item, idx));
    });
    colsEl.appendChild(colEl);
  });
}

/* ---------- لايت بوكس ---------- */
function openLightbox(sub) {
  state.lbList = orderedMedia();
  state.lbIndex = Math.max(0, state.lbList.findIndex((s) => s.id === sub.id));
  state.lbItem = sub;
  renderLightbox();
  $('#lb').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function renderLightbox() {
  const sub = state.lbItem; if (!sub) return;
  const stage = $('#lbStage');
  stage.querySelectorAll('img,video,.media-error').forEach(n => { if (n.tagName === 'VIDEO') n.pause(); n.remove(); });
  if (sub.media_type === 'video') {
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.autoplay = true; v.loop = true; v.dir = 'ltr';
    v.poster = posterOf(sub);
    const sources = mediaSources(sub);
    let i = 0;
    const tryNext = () => {
      if (i < sources.length) { v.src = sources[i++]; return; }
      v.remove(); mediaError(stage, 'video');
    };
    v.addEventListener('error', tryNext);
    tryNext();
    stage.insertBefore(v, stage.querySelector('.navbtn'));
  } else {
    const img = document.createElement('img');
    img.src = sub.media_url; img.alt = sub.caption || sub.name;
    img.addEventListener('error', () => { img.remove(); mediaError(stage, 'image'); }, { once: true });
    stage.insertBefore(img, stage.querySelector('.navbtn'));
  }
  $('#lbName').textContent = '@' + sub.name;
  $('#lbWhen').textContent = timeAgo(sub.created_at) + ' · ' + (sub.media_type === 'video' ? 'فيديو' : 'صورة');
  $('#lbCap').textContent = sub.caption || 'بدون وصف';
  $('#lbBadge').textContent = (sub.name[0] || '?').toUpperCase();
  $('#lbCount').textContent = (state.lbIndex + 1) + ' / ' + state.lbList.length;
  $('#lbOpen').href = sub.media_url;
  $('#lbLikes').innerHTML = IC.heart + `<span class="mono-num">${fmtNum(sub.likes_count)}</span> إعجاب`;
}
function closeLightbox() {
  $('#lb').classList.remove('open');
  document.body.style.overflow = '';
  $('#lbStage').querySelectorAll('video').forEach((v) => { v.pause(); v.remove(); });
  state.lbItem = null;
}
function lbNav(dir) {
  if (!state.lbList.length) return;
  state.lbIndex = (state.lbIndex + dir + state.lbList.length) % state.lbList.length;
  state.lbItem = state.lbList[state.lbIndex];
  renderLightbox();
}
$('#lbClose').addEventListener('click', closeLightbox);
$('#lbPrev').addEventListener('click', () => lbNav(1));
$('#lbNext').addEventListener('click', () => lbNav(-1));
$('#lb').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLightbox(); });
$('#lbCopy').addEventListener('click', async () => {
  if (!state.lbItem) return;
  try { await navigator.clipboard.writeText(state.lbItem.media_url); toast('تم نسخ رابط الملف', 'ok', 2200); }
  catch { toast('تعذر النسخ', 'bad'); }
});
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || document.fullscreenElement || !$('#lb').classList.contains('open')) return;
  if (e.key === 'Escape') { closeLightbox(); return; }
  if (e.target.closest('video, input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowRight') lbNav(1);
  if (e.key === 'ArrowLeft') lbNav(-1);
});

/* ---------- تبديل المعرض والأدوات ---------- */
function setGallery(g) {
  state.gallery = g;
  document.querySelectorAll('#gallerySeg button').forEach((b) => b.classList.toggle('on', b.dataset.gal === g));
  $('#mediaTools').classList.toggle('hidden', g !== 'media');
  $('#msgTools').classList.toggle('hidden', g !== 'messages');
  $('#wallTitle').textContent = g === 'media' ? 'الإيديتات' : 'رسائل الأساطير';
  $('#wallNote').textContent = g === 'media' ? 'ترتيب متوازن — لا عمود أطول من الثاني' : 'أرشيف الرسائل — محفوظة كما كُتبت';
  renderWall();
}
document.querySelectorAll('#gallerySeg button').forEach((b) => b.addEventListener('click', () => setGallery(b.dataset.gal)));
document.querySelectorAll('[data-gal-link]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  setGallery(a.dataset.galLink);
  document.getElementById('wall').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelectorAll('#sortSeg button').forEach((b) => b.addEventListener('click', () => {
  state.sort = b.dataset.sort;
  document.querySelectorAll('#sortSeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderWall();
}));
document.querySelectorAll('#msgSortSeg button').forEach((b) => b.addEventListener('click', () => {
  state.msgSort = b.dataset.msort;
  document.querySelectorAll('#msgSortSeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderWall();
}));
$('#videosOnly').addEventListener('change', (e) => { state.videosOnly = e.target.checked; renderWall(); });
$('#refreshWall').addEventListener('click', () => fetchWall(true));

/* ---------- تجاوب الأعمدة ---------- */
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    const c = columnCount();
    if (c !== state.cols) { state.cols = c; renderWall(); }
  }, 160);
});

/* ---------- ميلان الآيفون مع الماوس ---------- */
if (hoverFine) {
  const vis = $('#heroVis'), ph = $('#phone3d');
  vis.addEventListener('mousemove', (e) => {
    const r = vis.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ph.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
  });
  vis.addEventListener('mouseleave', () => { ph.style.transform = ''; });
}

/* ---------- تشغيل ---------- */
watchReveal();
fetchWall(false);
if (location.hash === '#messages') setGallery('messages');