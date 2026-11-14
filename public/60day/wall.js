/* ============================================================
   منطق الصفحة
   ============================================================ */
const $ = (s) => document.querySelector(s);
const state = {
  submissions: [], messages: [],
  gallery: 'media', sort: 'balanced', videosOnly: false, msgSort: 'newest',
  cols: columnCount(), loading: true, failed: false,
  liked: likedSet('60day_likes'), likedMsgs: likedSet('60day_msg_likes'),
  reported: likedSet('60day_reported'),
  lbList: [], lbIndex: 0, lbItem: null,
  reportTarget: null, reportReason: '',
  msgAvatar: Math.floor(Math.random() * 12),
  file: null, filePreviewUrl: '', uploading: false,
};
const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- عدّاد اليوم ---------- */
function tickDay() {
  const d = dayNow(), p = progressNow();
  $('#navDay').textContent = d;
  $('#dayLabel').textContent = `يوم ${d} / 60`;
  $('#dayBar').style.width = (p * 100).toFixed(1) + '%';
  $('#dayNote').innerHTML = `ذاب الثلج <b>${Math.round(p * 100)}%</b> · الباقي على الآيفون ${60 - d} يوم`;
}
tickDay();
setInterval(tickDay, 60000);

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

/* ---------- جلب البيانات ---------- */
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
    $('#wallNotice').innerHTML = `<div class="notice">${IC.warn}<div><b>الجدار غير متصل حالياً</b><p>${esc(e.message || 'تعذر جلب البيانات')} — تأكد من تشغيل SQL الخاص بالجدار في سوبا بيس ثم حدّث الصفحة.</p></div></div>`;
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
  const liked = state.liked.has(sub.id);
  const poster = posterOf(sub);
  const thumb = sub.media_type === 'image' ? ikThumb(sub.media_url) : posterSrc(sub, 640);
  el.innerHTML = `
    <div class="media" style="aspect-ratio:${ratio}">
      ${thumb
        ? `<img class="thumb" src="${esc(thumb)}" alt="${esc(sub.caption || sub.name)}" loading="${priority ? 'eager' : 'lazy'}" decoding="async" ${priority ? 'fetchpriority="high"' : ''}>`
        : `<div class="thumb thumb-empty" aria-hidden="true"></div>`}
      <div class="shade"></div>
      ${sub.media_type === 'video' ? `<span class="vbadge">${IC.video} فيديو</span><span class="playbtn">${IC.play}</span>` : ''}
    </div>
    <button class="likepill${liked ? ' liked' : ''}" data-like="${sub.id}" aria-label="إعجاب">${liked ? IC.heart : IC.heartO}<span class="mono-num">${fmtNum(sub.likes_count)}</span></button>
    <button class="repbtn" data-report="${sub.id}" aria-label="بلاغ" title="بلاغ">${IC.flag}</button>
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
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-like]') || e.target.closest('[data-report]')) return;
    openLightbox(sub);
  });
  el.querySelector('[data-like]').addEventListener('click', (e) => { e.stopPropagation(); likeSubmission(sub, e.currentTarget); });
  el.querySelector('[data-report]').addEventListener('click', (e) => { e.stopPropagation(); openReport(sub); });
  return el;
}

const MSG_ACCENTS = ['#FF4D7E', '#EAC9A8', '#6AB8FF', '#3DDC97', '#FFB020', '#C9B8FF'];
function messageCardEl(msg, idx) {
  const el = document.createElement('article');
  el.className = 'mcard';
  el.style.setProperty('--dl', Math.min(idx, 6) * 0.05 + 's');
  const h = hashIds([msg]);
  el.style.setProperty('--ac', MSG_ACCENTS[Math.abs(h) % MSG_ACCENTS.length]);
  el.style.setProperty('--tilt', ((Math.abs(h >> 3) % 5) - 2) * 0.4 + 'deg');
  const liked = state.likedMsgs.has(msg.id);
  el.innerHTML = `
    <div class="head">
      <span class="av">${avatarSVG(msg.avatar, 44)}</span>
      <span class="nm"><b>${esc(msg.name)}</b><small>${msg.anonymous ? '<span class="anon-badge">مجهول</span>' : 'عضو المجتمع'}</small></span>
    </div>
    <div class="txt">${esc(msg.body)}</div>
    <div class="foot">
      <span class="when">${timeAgo(msg.created_at)}</span>
      <button class="likepill${liked ? ' liked' : ''}" data-mlike="${msg.id}" aria-label="إعجاب">${liked ? IC.heart : IC.heartO}<span class="mono-num">${fmtNum(msg.likes_count)}</span></button>
    </div>`;
  el.querySelector('[data-mlike]').addEventListener('click', (e) => likeMessage(msg, e.currentTarget));
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
      ? `<div class="empty"><div class="ic">${IC.spark}</div><b>الجدار بانتظار أول إيديت</b><p>كن أول أسطورة ترفع إيديتها على جدار التحدي</p><br><a class="btn btn-primary" href="#submit">شارك الآن</a></div>`
      : `<div class="empty"><div class="ic">${IC.msg}</div><b>لا رسائل بعد</b><p>اكتب أول رسالة على جدار الأساطير — تظهر فوراً</p><br><button class="btn btn-primary" type="button" data-write-message>اكتب رسالة</button></div>`;
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

/* ---------- لايك ---------- */
async function likeSubmission(sub, btn) {
  if (state.liked.has(sub.id)) { toast('أعجبت بهذا الإيديت من قبل', 'info', 2200); return; }
  state.liked.add(sub.id); saveLiked('60day_likes', state.liked);
  sub.likes_count++;
  btn.classList.add('liked', 'pop');
  btn.innerHTML = IC.heart + `<span class="mono-num">${fmtNum(sub.likes_count)}</span>`;
  if (state.lbItem && state.lbItem.id === sub.id) renderLbLike();
  try { await rpc('edits_like', { p_id: sub.id }); }
  catch (e) { sub.likes_count--; state.liked.delete(sub.id); saveLiked('60day_likes', state.liked); btn.classList.remove('liked'); btn.innerHTML = IC.heartO + `<span class="mono-num">${fmtNum(sub.likes_count)}</span>`; toast(e.message, 'bad'); }
}
async function likeMessage(msg, btn) {
  if (state.likedMsgs.has(msg.id)) { toast('أعجبت بهذه الرسالة من قبل', 'info', 2200); return; }
  state.likedMsgs.add(msg.id); saveLiked('60day_msg_likes', state.likedMsgs);
  msg.likes_count++;
  btn.classList.add('liked', 'pop');
  btn.innerHTML = IC.heart + `<span class="mono-num">${fmtNum(msg.likes_count)}</span>`;
  try { await rpc('edits_message_like', { p_id: msg.id }); }
  catch (e) { msg.likes_count--; state.likedMsgs.delete(msg.id); saveLiked('60day_msg_likes', state.likedMsgs); btn.classList.remove('liked'); btn.innerHTML = IC.heartO + `<span class="mono-num">${fmtNum(msg.likes_count)}</span>`; toast(e.message, 'bad'); }
}

/* ---------- بلاغ ---------- */
function openReport(sub) {
  if (state.reported.has(sub.id)) { toast('أرسلت بلاغاً عن هذا الإيديت من قبل', 'info'); return; }
  state.reportTarget = sub; state.reportReason = '';
  $('#repText').value = '';
  $('#repSend').disabled = true;
  document.querySelectorAll('#repReasons button').forEach((b) => b.classList.remove('on'));
  openModal($('#reportModal'));
}
document.querySelectorAll('#repReasons button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#repReasons button').forEach((x) => x.classList.remove('on'));
  b.classList.add('on');
  state.reportReason = b.dataset.r;
  $('#repSend').disabled = false;
}));
$('#repClose').addEventListener('click', () => closeModal($('#reportModal')));
$('#reportModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal($('#reportModal')); });
$('#repSend').addEventListener('click', async () => {
  const sub = state.reportTarget; if (!sub || !state.reportReason) return;
  const extra = $('#repText').value.trim();
  const reason = state.reportReason + (extra ? ' — ' + extra : '');
  $('#repSend').disabled = true;
  try {
    await rpc('edits_report', { p_id: sub.id, p_reason: reason.slice(0, 300) });
    state.reported.add(sub.id); saveLiked('60day_reported', state.reported);
    closeModal($('#reportModal'));
    toast('وصل بلاغك للإدارة — شكراً لك', 'ok');
  } catch (e) { toast(e.message, 'bad'); $('#repSend').disabled = false; }
});

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
  renderLbLike();
}
function renderLbLike() {
  const sub = state.lbItem; if (!sub) return;
  const liked = state.liked.has(sub.id);
  $('#lbLike').innerHTML = (liked ? IC.heart : IC.heartO) + ` ${liked ? 'أعجبك' : 'إعجاب'} · <span class="mono-num">${fmtNum(sub.likes_count)}</span>`;
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
$('#lbLike').addEventListener('click', () => { if (state.lbItem) likeSubmission(state.lbItem, $('#lbLike')); });
$('#lbReport').addEventListener('click', () => { if (state.lbItem) openReport(state.lbItem); });
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
  $('#wallNote').textContent = g === 'media' ? 'ترتيب متوازن — لا عمود أطول من الثاني' : 'لوح عشوائي على قد الرسالة — نشر فوري بدون مراجعة';
  renderWall();
}
document.querySelectorAll('#gallerySeg button').forEach((b) => b.addEventListener('click', () => setGallery(b.dataset.gal)));
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

/* ---------- فورم: تبديل ---------- */
function setForm(f) {
  document.querySelectorAll('#formSeg button').forEach((b) => b.classList.toggle('on', b.dataset.form === f));
  $('#editForm').classList.toggle('hidden', f !== 'edit');
  $('#msgForm').classList.toggle('hidden', f !== 'msg');
  $('#formOk').classList.add('hidden');
  $('#formTitle').textContent = f === 'edit' ? 'شارك إيديتك' : 'اترك رسالة';
}
document.querySelectorAll('#formSeg button').forEach((b) => b.addEventListener('click', () => setForm(b.dataset.form)));
$('#ctaMsg').addEventListener('click', () => { setForm('msg'); document.getElementById('submit').scrollIntoView({ behavior: 'smooth' }); });
$('#ctaEdit').addEventListener('click', () => setForm('edit'));
document.addEventListener('click', e => { if (e.target.closest('[data-write-message]')) $('#ctaMsg').click(); });
$('#okAgain').addEventListener('click', () => { $('#formOk').classList.add('hidden'); setForm(state.gallery === 'messages' ? 'msg' : 'edit'); });

/* ---------- عدّادات الحقول ---------- */
$('#edCap').addEventListener('input', (e) => { $('#edCapN').textContent = e.target.value.length; });
$('#mgBody').addEventListener('input', (e) => {
  $('#mgBodyN').textContent = e.target.value.length;
  $('#mgBodyN').parentElement.classList.toggle('over', e.target.value.length > 580);
});
$('#mgAnon').addEventListener('change', (e) => {
  $('#mgName').disabled = e.target.checked;
  $('#mgName').style.opacity = e.target.checked ? 0.4 : 1;
  if (e.target.checked) $('#mgName').value = '';
});
function renderMsgAvatar() { $('#msgAv').innerHTML = avatarSVG(state.msgAvatar, 52); }
$('#avDice').addEventListener('click', () => {
  state.msgAvatar = (state.msgAvatar + 1 + Math.floor(Math.random() * 11)) % 12;
  renderMsgAvatar();
});
renderMsgAvatar();

/* ---------- دروب زون ---------- */
const dz = $('#dz'), fileInput = $('#edFile');
dz.addEventListener('click', () => { if (!state.file) fileInput.click(); });
dz.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !state.file) { e.preventDefault(); fileInput.click(); } });
['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) pickFile(f); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) pickFile(fileInput.files[0]); });

function pickFile(f) {
  let type;
  try { type = validateMediaFile(f); } catch (e) { toast(e.message, 'bad', 5000); return; }
  const isImg = type === 'image';
  if (state.filePreviewUrl) URL.revokeObjectURL(state.filePreviewUrl);
  state.file = f;
  dz.classList.add('has-file');
  const url = state.filePreviewUrl = URL.createObjectURL(f);
  const heavy = !isImg && f.size > 46000000;
  dz.innerHTML = `<div class="dz-preview">
      ${isImg ? `<img src="${url}" alt="معاينة">` : `<video src="${url}" muted playsinline preload="metadata"></video>`}
      <div class="dz-meta"><span class="nm">${esc(f.name)}</span><span class="chip chip-champ" dir="ltr">${fmtBytes(f.size)}</span>${heavy ? `<span class="chip chip-warn">يُضغط تلقائياً تحت 50MB</span>` : ''}<button class="btn btn-sm btn-danger" type="button" id="dzClear">${IC.x} إزالة</button></div>
    </div>`;
  $('#dzClear').addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });
}
function clearFile() {
  const video = dz.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  if (state.filePreviewUrl) URL.revokeObjectURL(state.filePreviewUrl);
  state.filePreviewUrl = '';
  state.file = null; fileInput.value = '';
  dz.classList.remove('has-file');
  dz.innerHTML = `<div class="dz-in"><div class="dz-ic">${IC.upload}</div><b>اسحب صورة أو فيديو هنا أو اضغط للاختيار</b><small>صورة حتى 20MB · فيديو حتى 350MB (يُضغط تلقائياً تحت 50MB)</small></div>`;
}

/* ---------- إرسال الإيديت ---------- */
function setUploadUI(label, pct) {
  $('#upbar').classList.remove('hidden');
  $('#upLabel').textContent = label || 'جارِ الرفع…';
  $('#upPct').textContent = Math.round(pct || 0) + '%';
  $('#upFill').style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
}

$('#editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.uploading) return;
  const name = $('#edName').value.trim();
  const cap = $('#edCap').value.trim();
  if (!name) { toast('اكتب اسمك أولاً', 'bad'); $('#edName').focus(); return; }
  if (!state.file) { toast('اختر صورة أو فيديو', 'bad'); return; }
  let type;
  try { type = fileMediaType(state.file); } catch (err) { toast(err.message, 'bad'); return; }
  state.uploading = true;
  const btn = $('#edSubmit'); btn.disabled = true;
  let upTicket = '';
  setUploadUI('جارِ التجهيز…', 0);
  try {
    let payload;
    if (type === 'image') {
      const up = await uploadMedia(state.file, (p) => setUploadUI('رفع الصورة…', p));
      payload = {
        p_media_type: 'image', p_media_url: up.url, p_poster_url: up.poster,
        p_width: up.width, p_height: up.height, p_size_bytes: up.size,
        p_file_id: up.fileId, p_account_id: up.accountId, p_upload_ticket: up.uploadTicket,
      };
    } else {
      if (!window.EditsVideo) throw new Error('نظام الفيديو غير محمّل — حدّث الصفحة');
      const onProg = (s) => setUploadUI(s.label || 'معالجة الفيديو…', s.pct);
      const prep = await EditsVideo.prepare(state.file, onProg);
      const up = await EditsVideo.upload(prep, onProg);
      upTicket = up.ticket || '';
      payload = {
        p_media_type: 'video', p_media_url: up.media_url, p_poster_url: up.poster_url,
        p_width: up.width, p_height: up.height, p_size_bytes: up.size_bytes,
        p_file_id: up.file_id, p_account_id: up.account_id, p_upload_ticket: up.ticket,
      };
    }
    setUploadUI('جارِ التسجيل…', 100);
    await rpc('edits_submit', {
      p_name: name, p_caption: cap,
      p_media_type: payload.p_media_type, p_media_url: payload.p_media_url,
      p_poster_url: payload.p_poster_url, p_width: payload.p_width, p_height: payload.p_height,
      p_size_bytes: payload.p_size_bytes, p_file_id: payload.p_file_id,
      p_account_id: payload.p_account_id, p_upload_ticket: payload.p_upload_ticket,
    });
    $('#editForm').classList.add('hidden');
    $('#upbar').classList.add('hidden');
    $('#okTitle').textContent = 'وصل إيديتك!';
    $('#okText').textContent = 'بيظهر على الجدار بعد مراجعة الإدارة. شكراً لمشاركتك في التحدي.';
    $('#formOk').classList.remove('hidden');
    toast('تم رفع الإيديت بنجاح', 'ok');
    clearFile(); $('#edCap').value = ''; $('#edCapN').textContent = '0';
  } catch (err) {
    if (upTicket && window.EditsVideo) EditsVideo.release(upTicket);
    toast(err.message || 'فشل الرفع', 'bad', 6000);
    $('#upbar').classList.add('hidden');
  } finally {
    state.uploading = false; btn.disabled = false;
  }
});

/* ---------- إرسال الرسالة ---------- */
$('#msgForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const anon = $('#mgAnon').checked;
  const name = $('#mgName').value.trim();
  const body = $('#mgBody').value.trim();
  if (!anon && !name) { toast('اكتب اسمك أو فعّل المجهول', 'bad'); $('#mgName').focus(); return; }
  if (!body) { toast('اكتب رسالتك أولاً', 'bad'); $('#mgBody').focus(); return; }
  const btn = $('#mgSubmit'); btn.disabled = true;
  try {
    const id = await rpc('edits_message_submit', { p_name: anon ? null : name, p_body: body, p_anonymous: anon, p_avatar: state.msgAvatar });
    state.messages.unshift({ id, name: anon ? 'مجهول' : name, body, anonymous: anon, avatar: state.msgAvatar, status: 'approved', likes_count: 0, created_at: new Date().toISOString() });
    updateStats();
    $('#msgForm').classList.add('hidden');
    $('#okTitle').textContent = 'رسالتك على الجدار!';
    $('#okText').textContent = 'نُشرت فوراً بدون مراجعة — شوفها بين رسائل الأساطير.';
    $('#formOk').classList.remove('hidden');
    $('#mgBody').value = ''; $('#mgBodyN').textContent = '0';
    toast('نُشرت رسالتك فوراً', 'ok');
    setGallery('messages');
    setTimeout(() => document.getElementById('wall').scrollIntoView({ behavior: 'smooth' }), 650);
  } catch (err) {
    toast(err.message || 'فشل النشر', 'bad', 5000);
  } finally { btn.disabled = false; }
});

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

/* ---------- تحديث دوري (45 ثانية، والتبويب ظاهر فقط) ---------- */
let pollTimer = null;
const startPoll = () => { if (!pollTimer) pollTimer = setInterval(() => fetchWall(false), 45000); };
const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { fetchWall(false); startPoll(); } else stopPoll(); });
startPoll();

/* ---------- تشغيل ---------- */
watchReveal();
fetchWall(false);
if (location.hash === '#messages') setGallery('messages');
