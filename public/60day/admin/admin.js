/* ============================================================
   لوحة إدارة إيديتات الـ60 يوم — كلمة سر فقط
   ============================================================ */
const $ = (s) => document.querySelector(s);
const PW_KEY = 'iabs60_admin_session';
// نحذف أي كلمة سر حفظتها النسخة السابقة؛ نخزن رمز جلسة فقط
sessionStorage.removeItem('iabs60_admin_pw');
let pw = sessionStorage.getItem(PW_KEY) || '';

const state = {
  data: null, tab: 'dashboard', q: '', type: 'all', sort: 'newest',
  msgStatus: 'all', msgSort: 'newest', logFilter: 'all',
  sel: new Set(), busy: false, reviewId: null,
};

const isAuthErr = (e) => /انتهت جلسة الإدارة|invalid.*session|session.*expired/i.test(String(e && e.message || ''));
const accLabel = (id) => (state.data?.accounts || []).find(a => a.id === id)?.label || '—';

/* ---------- أيقونات إضافية ---------- */
const AIC = {
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"/></svg>',
};

/* ---------- تسميات السجل ---------- */
const LOG_LABELS = {
  approve: ['نشر', 'ok'], reject: ['رفض', 'bad'], withdraw: ['سحب من النشر', 'warn'],
  restore: ['إعادة للمراجعة', 'info'], dismiss_reports: ['تجاهل البلاغات', 'ok'], delete: ['حذف', 'bad'],
  hide: ['إخفاء رسالة', 'warn'], unhide: ['إظهار رسالة', 'ok'],
  mark_full: ['تعليم الحساب ممتلئ', 'warn'], mark_ok: ['تعليم الحساب متاح', 'ok'], toggle: ['تبديل تفعيل حساب', 'info'],
  change_password: ['تغيير كلمة السر', 'info'],
  bulk_approve: ['نشر جماعي', 'ok'], bulk_reject: ['رفض جماعي', 'bad'], bulk_withdraw: ['سحب جماعي', 'warn'],
  bulk_restore: ['إعادة جماعية', 'info'], bulk_delete: ['حذف جماعي', 'bad'], bulk_dismiss_reports: ['تجاهل بلاغات جماعي', 'ok'],
};
const STATUS_CHIP = { pending: '<span class="chip chip-warn">قيد المراجعة</span>', approved: '<span class="chip chip-ok">منشور</span>', rejected: '<span class="chip chip-bad">مرفوض</span>' };

/* ============================================================
   الدخول والخروج
   ============================================================ */
function showGate() {
  $('#app').classList.add('hidden');
  $('#gate').classList.remove('hidden');
  $('#gatePw').value = '';
  setTimeout(() => $('#gatePw').focus(), 80);
}
function showApp() {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
}
async function logout(notify) {
  const token = pw;
  pw = '';
  sessionStorage.removeItem(PW_KEY);
  state.data = null; state.sel.clear();
  closeReview();
  ['rvSub', 'rvName', 'rvCap', 'rvMeta', 'rvActs', 'cfText'].forEach(id => document.getElementById(id).replaceChildren());
  $('#rvReason').value = '';
  confirmCb = null;
  closeModal($('#confirmModal'));
  ['content', 'stats', 'tabs', 'toolbar', 'bulkBar'].forEach(id => document.getElementById(id)?.replaceChildren());
  showGate();
  if (token) {
    try { await rpc('edits_admin_logout', { p_password: token }); }
    catch { toast('أُغلقت الجلسة محلياً؛ تعذر إبطالها على الخادم وستنتهي تلقائياً', 'warn'); return; }
  }
  if (notify) toast(notify, 'info');
}
let lastActivity = Date.now();
['pointerdown', 'keydown', 'input'].forEach(event => document.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true }));
setInterval(() => { if (pw && Date.now() - lastActivity >= 30 * 60000) logout('انتهت الجلسة المحلية بسبب عدم النشاط'); }, 60000);

$('#gateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = $('#gatePw').value;
  if (!p) { gateFail('أدخل كلمة السر'); return; }
  const btn = $('#gateBtn');
  btn.disabled = true;
  btn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.2-8.56"/></svg> جارِ التحقق…';
  try {
    const auth = await rpc('edits_admin_login', { p_password: p });
    if (!auth || auth.ok !== true || !auth.token) throw new Error(auth?.message || 'فشل الدخول');
    pw = auth.token;
    lastActivity = Date.now();
    sessionStorage.setItem(PW_KEY, pw);
    $('#gatePw').value = '';
    $('#gateErr').classList.add('hidden');
    showApp();
    await loadData();
    toast('أهلاً بك في لوحة الإدارة', 'ok');
  } catch (err) {
    gateFail(err.message || 'فشل الدخول');
  } finally {
    btn.disabled = false;
    btn.innerHTML = IC.lock + ' دخول اللوحة';
  }
});
function gateFail(msg) {
  const el = $('#gateErr');
  el.textContent = msg;
  el.classList.remove('hidden');
  const card = document.querySelector('.gate-card');
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
}
$('#gateEye').addEventListener('click', () => {
  const inp = $('#gatePw');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $('#gateEye').innerHTML = show ? IC.eyeOff : IC.eye;
  inp.focus();
});
$('#logoutBtn').addEventListener('click', () => logout('تم تسجيل الخروج'));

/* ============================================================
   البيانات
   ============================================================ */
async function loadData(silent) {
  if (!pw) return;
  const token = pw;
  if (!silent) {
    $('#content').innerHTML = '<div class="skel-grid">' + Array.from({ length: 8 }, () => '<div class="skel skel-card"></div>').join('') + '</div>';
  }
  $('#refreshBtn').innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.2-8.56"/></svg>';
  try {
    const data = await rpc('edits_admin_data', { p_password: token });
    if (pw !== token) return;
    state.data = data;
    state.data.submissions = state.data.submissions.map(normalizeMedia);
    const ids = new Set(state.data.submissions.map(s => s.id));
    state.sel = new Set([...state.sel].filter(id => ids.has(id)));
    renderAll();
  } catch (e) {
    if (pw !== token) return;
    if (isAuthErr(e)) { logout('انتهت الجلسة — سجل الدخول من جديد'); return; }
    if (!silent) {
      $('#content').innerHTML = `<div class="empty"><div class="ic">${IC.warn}</div><b>تعذر تحميل البيانات</b><p>${esc(e.message || 'خطأ غير معروف')}</p><button class="btn btn-primary" style="margin-top:16px" data-retry>${IC.refresh} إعادة المحاولة</button></div>`;
    }
  } finally {
    $('#refreshBtn').innerHTML = IC.refresh;
  }
}
$('#refreshBtn').addEventListener('click', () => loadData(true));
setInterval(() => { if (pw && state.data && document.visibilityState === 'visible' && !state.busy) loadData(true); }, 60000);

/* ---------- تنفيذ إجراء مع كلمة السر ---------- */
async function act(fn, args, okMsg) {
  if (state.busy || !pw) return false;
  const token = pw;
  state.busy = true;
  try {
    const r = await rpc(fn, { p_password: token, ...args });
    if (pw !== token) return false;
    if (r?.ok === false) throw new Error(r.message || 'فشل الإجراء');
    // تغيير كلمة السر يبطل الجلسة القديمة: حدّث الرمز قبل إعادة تحميل البيانات
    if (fn === 'edits_admin_change_password' && r?.token) {
      pw = r.token;
      sessionStorage.setItem(PW_KEY, pw);
    }
    if (okMsg) toast(okMsg, 'ok');
    await loadData(true);
    return r === null ? true : r;
  } catch (e) {
    if (isAuthErr(e)) logout('كلمة المرور تغيّرت — سجل الدخول مجدداً');
    else toast(e.message || 'فشل الإجراء', 'bad');
    return false;
  } finally {
    state.busy = false;
  }
}

/* ============================================================
   التبويبات والإحصائيات
   ============================================================ */
const TABS = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: IC.chart },
  { id: 'pending', label: 'قيد المراجعة', icon: IC.clock, count: () => subs().filter(s => s.status === 'pending').length },
  { id: 'approved', label: 'منشورة', icon: IC.check, count: () => subs().filter(s => s.status === 'approved').length },
  { id: 'rejected', label: 'مرفوضة', icon: IC.x, count: () => subs().filter(s => s.status === 'rejected').length },
  { id: 'reported', label: 'البلاغات', icon: IC.flag, count: () => subs().filter(s => s.reports_count > 0).length },
  { id: 'messages', label: 'الرسائل', icon: IC.msg, count: () => (state.data?.messages || []).length },
  { id: 'log', label: 'السجل', icon: AIC.list },
  { id: 'storage', label: 'التخزين', icon: IC.folder },
  { id: 'settings', label: 'الإعدادات', icon: IC.gear },
];
const subs = () => state.data?.submissions || [];
const msgs = () => state.data?.messages || [];

function setTab(id) {
  state.tab = id;
  state.sel.clear();
  state.q = ''; state.type = 'all'; state.sort = id === 'reported' ? 'reports' : 'newest';
  state.msgStatus = 'all'; state.msgSort = 'newest'; state.logFilter = 'all';
  history.replaceState(null, '', '#' + id);
  renderAll();
}

function renderStats() {
  const p = subs().filter(s => s.status === 'pending').length;
  const a = subs().filter(s => s.status === 'approved').length;
  const r = subs().filter(s => s.status === 'rejected').length;
  const rep = subs().filter(s => s.reports_count > 0).length;
  const m = msgs().length;
  const cards = [
    { tab: 'pending', n: p, label: 'قيد المراجعة', c: 'var(--warn)', icon: IC.clock },
    { tab: 'approved', n: a, label: 'منشورة على الجدار', c: 'var(--ok)', icon: IC.check },
    { tab: 'rejected', n: r, label: 'مرفوضة', c: 'var(--bad)', icon: IC.x },
    { tab: 'reported', n: rep, label: 'عليها بلاغات', c: 'var(--rose)', icon: IC.flag },
    { tab: 'messages', n: m, label: 'رسائل الجدار', c: 'var(--info)', icon: IC.msg },
  ];
  $('#stats').innerHTML = cards.map(c => `
    <button class="stat" style="--sc:${c.c}" data-tab="${c.tab}">
      <span class="ic">${c.icon}</span>
      <b class="mono-num">${fmtNum(c.n)}</b><span>${c.label}</span>
    </button>`).join('');
}

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(t => `
    <button data-tab="${t.id}" class="${state.tab === t.id ? 'on' : ''}">
      ${t.icon} ${t.label} ${t.count && t.count() > 0 ? `<span class="n">${fmtNum(t.count())}</span>` : ''}
    </button>`).join('');
}

/* ============================================================
   شريط الأدوات + الجماعي
   ============================================================ */
const isMediaTab = () => ['pending', 'approved', 'rejected', 'reported'].includes(state.tab);

function renderToolbar() {
  const tb = $('#toolbar');
  if (isMediaTab()) {
    tb.classList.remove('hidden');
    tb.innerHTML = `
      <div class="search">${IC.search}<input id="qInp" class="inp" type="search" placeholder="ابحث بالاسم أو الوصف…" value="${esc(state.q)}"></div>
      <select id="typeSel" class="inp" aria-label="نوع الوسائط">
        <option value="all" ${state.type === 'all' ? 'selected' : ''}>كل الأنواع</option>
        <option value="image" ${state.type === 'image' ? 'selected' : ''}>صور فقط</option>
        <option value="video" ${state.type === 'video' ? 'selected' : ''}>فيديو فقط</option>
      </select>
      <select id="sortSel" class="inp" aria-label="الترتيب">
        <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>الأحدث أولاً</option>
        <option value="oldest" ${state.sort === 'oldest' ? 'selected' : ''}>الأقدم أولاً</option>
        <option value="likes" ${state.sort === 'likes' ? 'selected' : ''}>الأكثر إعجاباً</option>
        <option value="reports" ${state.sort === 'reports' ? 'selected' : ''}>الأكثر بلاغات</option>
      </select>
      <label class="sel-all"><input type="checkbox" class="ck" id="selAll"> تحديد الكل</label>`;
    $('#qInp').addEventListener('input', debounce((e) => { state.q = e.target.value; renderContent(); }, 220));
    $('#typeSel').addEventListener('change', (e) => { state.type = e.target.value; renderContent(); });
    $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; renderContent(); });
    $('#selAll').addEventListener('change', (e) => {
      const list = mediaList();
      if (e.target.checked) list.forEach(s => state.sel.add(s.id)); else state.sel.clear();
      renderContent(); renderBulk();
    });
  } else if (state.tab === 'messages') {
    tb.classList.remove('hidden');
    tb.innerHTML = `
      <div class="search">${IC.search}<input id="qInp" class="inp" type="search" placeholder="ابحث في الرسائل والأسماء…" value="${esc(state.q)}"></div>
      <select id="msgStatusSel" class="inp" aria-label="حالة الرسالة">
        <option value="all" ${state.msgStatus === 'all' ? 'selected' : ''}>كل الرسائل</option>
        <option value="approved" ${state.msgStatus === 'approved' ? 'selected' : ''}>الظاهرة</option>
        <option value="hidden" ${state.msgStatus === 'hidden' ? 'selected' : ''}>المخفية</option>
      </select>
      <select id="msgSortSel" class="inp" aria-label="الترتيب">
        <option value="newest" ${state.msgSort === 'newest' ? 'selected' : ''}>الأحدث أولاً</option>
        <option value="oldest" ${state.msgSort === 'oldest' ? 'selected' : ''}>الأقدم أولاً</option>
        <option value="likes" ${state.msgSort === 'likes' ? 'selected' : ''}>الأكثر إعجاباً</option>
      </select>`;
    $('#qInp').addEventListener('input', debounce((e) => { state.q = e.target.value; renderContent(); }, 220));
    $('#msgStatusSel').addEventListener('change', (e) => { state.msgStatus = e.target.value; renderContent(); });
    $('#msgSortSel').addEventListener('change', (e) => { state.msgSort = e.target.value; renderContent(); });
  } else if (state.tab === 'log') {
    tb.classList.remove('hidden');
    tb.innerHTML = `
      <select id="logSel" class="inp" aria-label="تصفية السجل">
        <option value="all" ${state.logFilter === 'all' ? 'selected' : ''}>كل الإجراءات</option>
        <option value="submission" ${state.logFilter === 'submission' ? 'selected' : ''}>الإيديتات</option>
        <option value="message" ${state.logFilter === 'message' ? 'selected' : ''}>الرسائل</option>
        <option value="account" ${state.logFilter === 'account' ? 'selected' : ''}>حسابات التخزين</option>
        <option value="settings" ${state.logFilter === 'settings' ? 'selected' : ''}>الإعدادات</option>
        <option value="bulk" ${state.logFilter === 'bulk' ? 'selected' : ''}>الإجراءات الجماعية</option>
      </select>
      <span class="muted" style="font-size:11.5px;font-weight:800">آخر 200 إجراء — يتحدث تلقائياً كل دقيقة</span>`;
    $('#logSel').addEventListener('change', (e) => { state.logFilter = e.target.value; renderContent(); });
  } else {
    tb.classList.add('hidden');
    tb.innerHTML = '';
  }
}

function renderBulk() {
  const bar = $('#bulkBar');
  if (!isMediaTab() || state.sel.size === 0) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
  bar.classList.remove('hidden');
  bar.innerHTML = `
    <span class="cnt">${IC.check} ${fmtNum(state.sel.size)} محدد</span>
    <button class="btn btn-sm btn-ok" data-bulk="approve">${IC.check} نشر</button>
    <button class="btn btn-sm btn-danger" data-bulk="reject">${IC.x} رفض</button>
    <button class="btn btn-sm btn-warn" data-bulk="withdraw">${IC.back} سحب</button>
    <button class="btn btn-sm" data-bulk="restore">${IC.refresh} إعادة للمراجعة</button>
    <button class="btn btn-sm" data-bulk="dismiss_reports">${IC.shield} تجاهل البلاغات</button>
    <button class="btn btn-sm btn-danger" data-bulk="delete">${IC.trash} حذف</button>
    <button class="btn btn-sm btn-ghost" id="bulkClear">إلغاء التحديد</button>`;
  $('#bulkClear').addEventListener('click', () => { state.sel.clear(); renderContent(); renderBulk(); });
}

/* ============================================================
   قوائم الوسائط
   ============================================================ */
function mediaList() {
  let list;
  if (state.tab === 'pending') list = subs().filter(s => s.status === 'pending');
  else if (state.tab === 'approved') list = subs().filter(s => s.status === 'approved');
  else if (state.tab === 'rejected') list = subs().filter(s => s.status === 'rejected');
  else list = subs().filter(s => s.reports_count > 0);
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter(s => (s.name + ' ' + (s.caption || '')).toLowerCase().includes(q));
  if (state.type !== 'all') list = list.filter(s => s.media_type === state.type);
  const sorters = {
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    likes: (a, b) => b.likes_count - a.likes_count,
    reports: (a, b) => b.reports_count - a.reports_count,
  };
  return [...list].sort(sorters[state.sort] || sorters.newest);
}

function statusActions(s, compact) {
  const b = (actn, cls, icon, label) => `<button class="btn ${cls}" data-act="${actn}" data-id="${s.id}">${icon}${compact ? '' : ' ' + label}</button>`;
  let html = b('view', '', IC.eye, 'عرض');
  if (s.status === 'pending') html += b('approve', 'btn-ok', IC.check, 'نشر') + b('reject', 'btn-danger', IC.x, 'رفض');
  else if (s.status === 'approved') html += b('withdraw', 'btn-warn', IC.back, 'سحب');
  else if (s.status === 'rejected') html += b('restore', 'btn-warn', IC.refresh, 'إعادة');
  if (s.reports_count > 0) html += b('dismiss', '', IC.shield, 'تجاهل البلاغات');
  html += '<span class="sp"></span>' + b('delete', 'btn-danger', IC.trash, '');
  return html;
}

function mediaCard(s, i) {
  const ratio = s.width && s.height ? Math.min(1.85, Math.max(0.5625, s.width / s.height)) : 16 / 9;
  const poster = ikThumb(ikPoster(s), 480);
  const checked = state.sel.has(s.id);
  return `
  <div class="mcard panel ${checked ? 'selected' : ''}" style="animation-delay:${Math.min(i, 10) * 0.04}s">
    <div class="thumb" style="aspect-ratio:${ratio.toFixed(3)}">
      <label class="selbox" title="تحديد"><input type="checkbox" class="ck" data-sel="${s.id}" ${checked ? 'checked' : ''}></label>
      <img src="${esc(poster)}" alt="${esc(s.name)}" loading="lazy" data-media-id="${s.id}">
      ${s.media_type === 'video' ? `<span class="play-ic"><i>${IC.play}</i></span>` : ''}
      <span class="tbadge">${s.media_type === 'video' ? IC.video + ' فيديو' : IC.image + ' صورة'}</span>
      ${s.reports_count > 0 ? `<span class="tbadge rep">${IC.flag} ${s.reports_count}</span>` : ''}
    </div>
    <div class="mbody">
      <div class="mname"><span>${esc(s.name)}</span><span class="when">${timeAgo(s.created_at)}</span></div>
      <p class="mcap">${esc(s.caption || 'بدون وصف')}</p>
      <div class="mmeta">
        ${STATUS_CHIP[s.status]}
        <span class="chip">${IC.heart} ${fmtNum(s.likes_count)}</span>
        <span class="chip">${IC.folder} ${fmtBytes(s.size_bytes)}</span>
        <span class="chip chip-champ">${esc(accLabel(s.account_id))}</span>
        ${s.reject_reason ? `<span class="chip chip-bad" title="${esc(s.reject_reason)}">سبب الرفض: ${esc(s.reject_reason.slice(0, 26))}${s.reject_reason.length > 26 ? '…' : ''}</span>` : ''}
      </div>
      <div class="macts">${statusActions(s)}</div>
    </div>
  </div>`;
}

function renderMedia() {
  const list = mediaList();
  if (!list.length) {
    const labels = { pending: 'لا توجد إيديتات بانتظار المراجعة', approved: 'لا توجد إيديتات منشورة بعد', rejected: 'لا توجد إيديتات مرفوضة', reported: 'لا توجد بلاغات — الجدار نظيف' };
    return `<div class="empty"><div class="ic">${state.tab === 'reported' ? IC.shield : IC.inbox || AIC.inbox}</div><b>${labels[state.tab]}</b><p>${state.q || state.type !== 'all' ? 'جرّب تغيير البحث أو الفلاتر' : 'كل شيء تحت السيطرة'}</p></div>`;
  }
  return `<div class="mgrid">${list.map((s, i) => mediaCard(s, i)).join('')}</div>`;
}

/* ============================================================
   الرسائل
   ============================================================ */
function messageList() {
  let list = msgs();
  if (state.msgStatus !== 'all') list = list.filter(m => m.status === state.msgStatus);
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter(m => (m.name + ' ' + m.body).toLowerCase().includes(q));
  const sorters = {
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    likes: (a, b) => b.likes_count - a.likes_count,
  };
  return [...list].sort(sorters[state.msgSort] || sorters.newest);
}

function renderMessages() {
  const list = messageList();
  if (!list.length) return `<div class="empty"><div class="ic">${IC.msg}</div><b>لا توجد رسائل</b><p>${state.q || state.msgStatus !== 'all' ? 'جرّب تغيير البحث أو الفلاتر' : 'الرسائل تُنشر فوري بدون مراجعة'}</p></div>`;
  return `<div class="msggrid">${list.map((m, i) => `
    <div class="msgcard panel ${m.status === 'hidden' ? 'hidden-msg' : ''}" style="animation-delay:${Math.min(i, 10) * 0.04}s">
      <div class="msg-head">
        <span class="av">${avatarSVG(m.avatar, 42)}</span>
        <div style="min-width:0">
          <b>${esc(m.name)}</b>
          <div class="sub">
            ${m.anonymous ? '<span class="chip chip-warn">مجهول</span>' : ''}
            <span class="chip chip-champ">${avatarName(m.avatar)}</span>
            ${m.status === 'hidden' ? '<span class="chip chip-bad">مخفية</span>' : '<span class="chip chip-ok">ظاهرة</span>'}
          </div>
        </div>
      </div>
      <div class="msg-body">${esc(m.body)}</div>
      <div class="msg-foot">
        <span class="chip">${IC.heart} ${fmtNum(m.likes_count)}</span>
        <span class="when">${timeAgo(m.created_at)}</span>
        <span class="sp"></span>
        ${m.status === 'approved'
          ? `<button class="btn btn-sm btn-warn" data-act="m-hide" data-id="${m.id}">${IC.eyeOff} إخفاء</button>`
          : `<button class="btn btn-sm btn-ok" data-act="m-unhide" data-id="${m.id}">${IC.eye} إظهار</button>`}
        <button class="btn btn-sm btn-danger" data-act="m-delete" data-id="${m.id}">${IC.trash}</button>
      </div>
    </div>`).join('')}</div>`;
}

/* ============================================================
   لوحة القيادة
   ============================================================ */
function renderDashboard() {
  const all = subs();
  const totalLikes = all.reduce((t, s) => t + s.likes_count, 0);
  const msgLikes = msgs().reduce((t, m) => t + m.likes_count, 0);
  const usedBytes = (state.data.accounts || []).reduce((t, a) => t + Number(a.used_bytes || 0), 0);
  const names = new Set([...all.map(s => s.name.trim().toLowerCase()), ...msgs().filter(m => !m.anonymous).map(m => m.name.trim().toLowerCase())]);

  /* آخر 7 أيام */
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = d.getTime() + 864e5;
    const inDay = all.filter(s => { const t = new Date(s.created_at).getTime(); return t >= d.getTime() && t < next; });
    days.push({ d, total: inDay.length, approved: inDay.filter(s => s.status === 'approved').length });
  }
  const maxV = Math.max(1, ...days.map(x => x.total));
  const W = 640, H = 210, padB = 34, padT = 24, bw = 26, gap = (W - 40) / 7;
  const wd = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  let bars = '';
  days.forEach((x, i) => {
    const cx = 20 + gap * i + gap / 2;
    const hTotal = Math.max(x.total > 0 ? 6 : 2, (H - padB - padT) * (x.total / maxV));
    const hApp = Math.max(x.approved > 0 ? 6 : 0, (H - padB - padT) * (x.approved / maxV));
    const yT = H - padB - hTotal, yA = H - padB - hApp;
    bars += `
      <rect x="${cx - bw - 3}" y="${yT}" width="${bw}" height="${hTotal}" rx="6" fill="url(#gTotal)"/>
      <rect x="${cx + 3}" y="${yA}" width="${bw}" height="${hApp}" rx="6" fill="url(#gApp)"/>
      ${x.total > 0 ? `<text x="${cx - bw / 2 - 3}" y="${yT - 7}" text-anchor="middle" font-size="11" font-weight="800" fill="#EAC9A8">${x.total}</text>` : ''}
      ${x.approved > 0 ? `<text x="${cx + bw / 2 + 3}" y="${yA - 7}" text-anchor="middle" font-size="11" font-weight="800" fill="#FF9DB1">${x.approved}</text>` : ''}
      <text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${i === 6 ? '#FF9DB1' : '#7E6470'}">${wd[x.d.getDay()]}</text>
      <text x="${cx}" y="${H - 2}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#7E6470">${x.d.getDate()}/${x.d.getMonth() + 1}</text>`;
  });
  const chart = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="مخطط آخر 7 أيام">
      <defs>
        <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A06C"/><stop offset="1" stop-color="#6B1B36"/></linearGradient>
        <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4D7E"/><stop offset="1" stop-color="#8C2447"/></linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75, 1].map(f => `<line x1="16" x2="${W - 16}" y1="${H - padB - (H - padB - padT) * f}" y2="${H - padB - (H - padB - padT) * f}" stroke="rgba(234,201,168,0.09)" stroke-dasharray="3 5"/>`).join('')}
      <line x1="16" x2="${W - 16}" y1="${H - padB}" y2="${H - padB}" stroke="rgba(234,201,168,0.2)"/>
      ${bars}
    </svg>`;

  /* الأكثر إعجاباً */
  const topLiked = [...all].sort((a, b) => b.likes_count - a.likes_count).slice(0, 5);
  const likedHtml = topLiked.length ? topLiked.map((s, i) => `
    <div class="rank-row">
      <span class="rank-num">${i + 1}</span>
      <img class="th" src="${esc(ikThumb(ikPoster(s), 96))}" alt="" loading="lazy" data-rank-media="${s.id}">
      <div class="nm"><b>${esc(s.name)}</b><span>${s.media_type === 'video' ? 'فيديو' : 'صورة'} · ${timeAgo(s.created_at)}</span></div>
      <span class="val">${IC.heart} ${fmtNum(s.likes_count)}</span>
    </div>`).join('') : '<p class="muted" style="font-size:12px">لا توجد إيديتات بعد</p>';

  /* أكثر المساهمين */
  const contrib = {};
  for (const s of all) {
    const k = s.name.trim();
    if (!k) continue;
    contrib[k] = contrib[k] || { count: 0, likes: 0 };
    contrib[k].count++; contrib[k].likes += s.likes_count;
  }
  const topContrib = Object.entries(contrib).sort((a, b) => b[1].count - a[1].count || b[1].likes - a[1].likes).slice(0, 5);
  const contribHtml = topContrib.length ? topContrib.map(([name, v], i) => `
    <div class="rank-row">
      <span class="rank-num">${i + 1}</span>
      <span class="av" style="flex:none">${avatarSVG(name.length + name.charCodeAt(0), 38)}</span>
      <div class="nm"><b>${esc(name)}</b><span>${fmtNum(v.likes)} إعجاب</span></div>
      <span class="val">${IC.spark} ${fmtNum(v.count)}</span>
    </div>`).join('') : '<p class="muted" style="font-size:12px">لا يوجد مساهمون بعد</p>';

  /* آخر الإجراءات */
  const recent = (state.data.log || []).slice(0, 8);
  const recentHtml = recent.length ? recent.map(l => {
    const [label, tone] = LOG_LABELS[l.action] || [l.action, 'info'];
    return `<div class="act-row"><span class="chip chip-${tone}">${label}</span><span class="t">${l.target_name ? '<b>' + esc(l.target_name) + '</b> · ' : ''}${esc(l.detail || '')}</span><span class="w">${timeAgo(l.created_at)}</span></div>`;
  }).join('') : '<p class="muted" style="font-size:12px">لا توجد إجراءات بعد</p>';

  return `
    <div class="dash-minis">
      <div class="mini panel" style="--mc:var(--rose)"><span class="ic">${IC.heart}</span><div><b class="mono-num">${fmtNum(totalLikes)}</b><span>إعجابات الإيديتات</span></div></div>
      <div class="mini panel" style="--mc:var(--info)"><span class="ic">${IC.msg}</span><div><b class="mono-num">${fmtNum(msgs().length)}</b><span>رسالة · ${fmtNum(msgLikes)} إعجاب</span></div></div>
      <div class="mini panel" style="--mc:var(--champ)"><span class="ic">${IC.folder}</span><div><b class="mono-num">${fmtBytes(usedBytes)}</b><span>تخزين مستخدم</span></div></div>
      <div class="mini panel" style="--mc:var(--ok)"><span class="ic">${IC.users}</span><div><b class="mono-num">${fmtNum(names.size)}</b><span>مساهم في الجدار</span></div></div>
    </div>
    <div class="chart-panel panel">
      <div class="chart-head">
        <h3>${IC.chart} نشاط آخر 7 أيام</h3>
        <div class="legend">
          <span><i style="background:linear-gradient(180deg,#C9A06C,#6B1B36)"></i>كل المشاركات</span>
          <span><i style="background:linear-gradient(180deg,#FF4D7E,#8C2447)"></i>المنشور</span>
        </div>
      </div>
      ${chart}
    </div>
    <div class="dash-grid">
      <div class="dpanel panel"><h3>${IC.heart} الأكثر إعجاباً</h3><p class="dsub">أفضل 5 إيديتات على الجدار</p><div class="rank-list">${likedHtml}</div></div>
      <div class="dpanel panel"><h3>${IC.users} أكثر المساهمين</h3><p class="dsub">حسب عدد المشاركات</p><div class="rank-list">${contribHtml}</div></div>
      <div class="dpanel panel"><h3>${IC.clock} آخر الإجراءات</h3><p class="dsub">من سجل الإدارة</p><div class="act-list">${recentHtml}</div></div>
    </div>`;
}

/* ============================================================
   السجل
   ============================================================ */
function renderLog() {
  let list = state.data.log || [];
  if (state.logFilter === 'bulk') list = list.filter(l => l.action.startsWith('bulk_'));
  else if (state.logFilter !== 'all') list = list.filter(l => l.target_type === state.logFilter && !l.action.startsWith('bulk_'));
  if (!list.length) return `<div class="empty"><div class="ic">${AIC.list}</div><b>السجل فارغ</b><p>ستظهر هنا كل إجراءات الإدارة فور تنفيذها</p></div>`;
  return `<div class="loglist">${list.map((l, i) => {
    const [label, tone] = LOG_LABELS[l.action] || [l.action, 'info'];
    const typeLbl = { submission: 'إيديت', message: 'رسالة', account: 'حساب تخزين', settings: 'الإعدادات' }[l.target_type] || l.target_type;
    return `
    <div class="logrow panel" style="animation-delay:${Math.min(i, 12) * 0.03}s">
      <span class="chip chip-${tone}">${label}</span>
      <div class="body">
        <b>${l.target_name ? esc(l.target_name) : typeLbl}</b>
        <span>${typeLbl}${l.detail ? ' · ' + esc(l.detail) : ''}</span>
      </div>
      <span class="when">${timeAgo(l.created_at)}</span>
    </div>`;
  }).join('')}</div>`;
}

/* ============================================================
   التخزين — حسابا ImageKit والنقل التلقائي
   ============================================================ */
function renderStorage() {
  const accs = state.data.accounts || [];
  const totalUsed = accs.reduce((t, a) => t + Number(a.used_bytes || 0), 0);
  const totalLimit = accs.reduce((t, a) => t + Number(a.storage_limit_bytes || 0), 0);
  const cards = accs.map((a, idx) => {
    const used = Number(a.used_bytes || 0), limit = Number(a.storage_limit_bytes || 1);
    const pct = Math.min(100, (used / limit) * 100);
    const pctCls = a.is_full ? 'full' : pct >= 85 ? 'hot' : '';
    return `
    <div class="store-card panel ${idx === 0 ? 'primary' : ''}">
      <div class="store-head">
        <span class="sic">${IC.folder}</span>
        <b>${esc(a.label)}</b>
        <div class="chips">
          <span class="chip ${idx === 0 ? 'chip-rose' : 'chip-champ'}">${idx === 0 ? 'الأساسي' : 'الاحتياطي'}</span>
          ${a.is_active ? '<span class="chip chip-ok"><span class="dot pulse"></span> نشط</span>' : '<span class="chip chip-bad">موقوف</span>'}
          ${a.is_full ? '<span class="chip chip-bad">ممتلئ</span>' : '<span class="chip chip-info">متاح</span>'}
        </div>
      </div>
      <div class="store-meta">${esc(a.url_endpoint)}<br>${esc(a.public_key)}</div>
      <div class="store-nums"><span>المستخدم <b class="mono-num">${fmtBytes(used)}</b></span><span>السعة <b class="mono-num">${fmtBytes(limit)}</b></span></div>
      <div class="pbar"><i style="width:${Math.max(pct, used > 0 ? 1.5 : 0).toFixed(1)}%"></i></div>
      <div class="store-pct ${pctCls}">${pct.toFixed(1)}% مستخدم${a.is_full ? ' — التحويل يتم للحساب التالي تلقائياً' : pct >= 98 ? ' — على وشك الامتلاء' : ''}</div>
      ${a.quota_failures > 0 ? `<div class="store-fail">${IC.warn} ${a.quota_failures} تنبيه امتلاء مسجل في النسخة السابقة — لا يغيّر حالة الحساب تلقائياً</div>` : ''}
      <div class="store-acts">
        ${!a.is_full ? `<button class="btn btn-sm btn-warn" data-act="s-full" data-id="${a.id}">${IC.warn} تعليم ممتلئ</button>` : `<button class="btn btn-sm btn-ok" data-act="s-ok" data-id="${a.id}">${IC.check} تعليم متاح</button>`}
        ${a.quota_failures > 0 && !a.is_full ? `<button class="btn btn-sm" data-act="s-ok" data-id="${a.id}">${IC.refresh} تصفير المحاولات</button>` : ''}
        <button class="btn btn-sm ${a.is_active ? 'btn-danger' : 'btn-ok'}" data-act="s-toggle" data-id="${a.id}">${a.is_active ? IC.eyeOff + ' إيقاف مؤقت' : IC.eye + ' إعادة تفعيل'}</button>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="failover-note panel">
      <span class="ic">${IC.refresh}</span>
      <div>
        <b>إعادة محاولة الرفع على الحساب الاحتياطي</b>
        <p>إذا رفض ImageKit الرفع بسبب حد التخزين، تُعاد محاولة الملف <b>تلقائياً</b> على الحساب التالي. الحساب الذي تعلّمه ممتلئاً أو توقفه من هنا يُستبعد من الاختيار. الأخطاء الأخرى لا تغيّر حالة الحساب. العدّاد تقديري وليس مزامنة لاستهلاك ImageKit. حذف المشاركة لا يحذف أصل الملف ولا يحرر مساحة؛ حذف الأصل من لوحة ImageKit. الإجمالي المسجل: <b>${fmtBytes(totalUsed)}</b> من ${fmtBytes(totalLimit)}.</p>
      </div>
    </div>
    <div class="store-grid">${cards}</div>`;
}

/* ============================================================
   الإعدادات
   ============================================================ */
function renderSettings() {
  const upd = state.data.password_updated_at;
  return `
  <div class="set-grid">
    <div class="set-panel panel">
      <h3>${IC.lock} تغيير كلمة السر</h3>
      <p class="dsub">كلمة واحدة فقط للوحة — بدون بريد إلكتروني. تُخزّن مشفّرة bcrypt داخل القاعدة.${upd ? ' آخر تغيير: ' + timeAgo(upd) : ''}</p>
      <div class="field"><label for="pwOld">كلمة السر الحالية</label><input id="pwOld" type="password" class="inp" autocomplete="current-password" placeholder="الحالية"></div>
      <div class="field"><label for="pwNew">كلمة السر الجديدة (12 حرفاً على الأقل)</label><input id="pwNew" type="password" class="inp" autocomplete="new-password" placeholder="الجديدة"></div>
      <div class="field"><label for="pwNew2">تأكيد كلمة السر الجديدة</label><input id="pwNew2" type="password" class="inp" autocomplete="new-password" placeholder="أعد كتابتها"></div>
      <button class="btn btn-primary" id="pwSave">${IC.shield} حفظ كلمة السر</button>
    </div>
    <div class="set-panel panel">
      <h3>${IC.shield} الحماية المفعّلة</h3>
      <p class="dsub">تتطلب تشغيل تحديث SQL؛ الحدود عامة وليست بديلاً عن التحقق من الزائر أو CAPTCHA.</p>
      <div class="sec-list">
        <div class="sec-item">${IC.check}<div><b>تشفير bcrypt</b>كلمة السر محفوظة كهاش bcrypt؛ الجلسة بحد أقصى ساعتين، مع خروج محلي بعد 30 دقيقة من عدم النشاط. تغيير كلمة السر يُبطل كل الجلسات.</div></div>
        <div class="sec-item">${IC.check}<div><b>حد محاولات الدخول</b>15 محاولة خاطئة خلال 15 دقيقة = قفل مؤقت تلقائي.</div></div>
        <div class="sec-item">${IC.check}<div><b>مفاتيح ImageKit الخاصة محجوبة</b>توقيع الرفع يتم داخل القاعدة — المفاتيح الخاصة لا تصل للمتصفح إطلاقاً.</div></div>
        <div class="sec-item">${IC.check}<div><b>حدود الإرسال</b>حدود عامة ذرّية للرفع والرسائل والبلاغات والإعجابات، وتصريح رفع محدد بالاسم والمجلد والنوع والحجم.</div></div>
        <div class="sec-item">${IC.check}<div><b>سجل كامل</b>كل إجراء إدارة يُوثّق في تبويب السجل مع الوقت والتفاصيل.</div></div>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   العرض الرئيسي
   ============================================================ */
function renderContent() {
  const c = $('#content');
  if (state.tab === 'dashboard') c.innerHTML = renderDashboard();
  else if (isMediaTab()) c.innerHTML = renderMedia();
  else if (state.tab === 'messages') c.innerHTML = renderMessages();
  else if (state.tab === 'log') c.innerHTML = renderLog();
  else if (state.tab === 'storage') c.innerHTML = renderStorage();
  else if (state.tab === 'settings') { c.innerHTML = renderSettings(); bindSettings(); }
  c.querySelectorAll('img[data-media-id]').forEach(img => previewFallback(img, subs().find(s => s.id === img.dataset.mediaId)));
  c.querySelectorAll('img[data-rank-media]').forEach(img => img.addEventListener('error', () => {
    const item = subs().find(s => s.id === img.dataset.rankMedia);
    if (item.media_type === 'video' && item.media_url) {
      const video = videoPreview(item);
      video.className = 'th';
      img.replaceWith(video);
      video.addEventListener('error', () => video.remove(), { once: true });
    } else img.remove();
  }, { once: true }));
  if (isMediaTab()) {
    const sa = $('#selAll');
    if (sa) { const list = mediaList(); sa.checked = list.length > 0 && list.every(s => state.sel.has(s.id)); }
  }
}
function renderAll() {
  renderStats(); renderTabs(); renderToolbar(); renderBulk(); renderContent();
}

/* ---------- الإعدادات: ربط الحقول ---------- */
function bindSettings() {
  $('#pwSave').addEventListener('click', async () => {
    const old = $('#pwOld').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
    if (!old) { toast('أدخل كلمة السر الحالية', 'bad'); return; }
    if ([...n1].length < 12 || new TextEncoder().encode(n1).length > 72) { toast('كلمة السر يجب أن تكون 12 حرفاً على الأقل ولا تتجاوز 72 بايت', 'bad'); return; }
    if (n1 === old) { toast('اختر كلمة سر مختلفة عن الحالية', 'bad'); return; }
    if (n1 !== n2) { toast('التأكيد غير مطابق لكلمة السر الجديدة', 'bad'); return; }
    await act('edits_admin_change_password', { p_old: old, p_new: n1 }, 'تم تغيير كلمة السر بنجاح');
  });
}

/* ============================================================
   مودال المراجعة
   ============================================================ */
function openReview(id, focusReason) {
  const s = subs().find(x => x.id === id);
  if (!s) return;
  state.reviewId = id;
  $('#rvSub').textContent = `${s.media_type === 'video' ? 'فيديو' : 'صورة'} · ${timeAgo(s.created_at)} · ${accLabel(s.account_id)}`;
  $('#rvMedia').innerHTML = s.media_type === 'video'
    ? `<video controls playsinline preload="metadata" poster="${esc(ikPoster(s))}" src="${esc(s.media_url)}"></video>`
    : `<img src="${esc(s.media_url)}" alt="${esc(s.name)}">`;
  $('#rvMedia').firstElementChild.addEventListener('error', e => { e.target.remove(); mediaError($('#rvMedia'), s.media_type); }, { once: true });
  $('#rvName').innerHTML = `<b>${esc(s.name)}</b> ${STATUS_CHIP[s.status]} ${s.reports_count > 0 ? `<span class="chip chip-bad">${IC.flag} ${s.reports_count} بلاغ</span>` : ''}`;
  $('#rvCap').textContent = s.caption || 'بدون وصف';
  $('#rvMeta').innerHTML = `
    <span class="chip">${IC.heart} ${fmtNum(s.likes_count)} إعجاب</span>
    <span class="chip">${IC.folder} ${fmtBytes(s.size_bytes)}</span>
    ${s.width && s.height ? `<span class="chip">${s.width}×${s.height}</span>` : ''}
    ${s.reviewed_at ? `<span class="chip chip-champ">${IC.clock} روجع ${timeAgo(s.reviewed_at)}</span>` : ''}
    ${s.reject_reason ? `<span class="chip chip-bad">سبب الرفض: ${esc(s.reject_reason)}</span>` : ''}`;
  $('#rvReason').value = '';
  $('#rvActs').innerHTML = statusActions(s).replace('data-act="view"', 'data-act="copy"');
  const copyBtn = $('#rvActs [data-act="copy"]');
  if (copyBtn) copyBtn.innerHTML = IC.link + ' نسخ الرابط';
  openModal($('#reviewModal'));
  if (focusReason) setTimeout(() => $('#rvReason').focus(), 250);
}
function closeReview() {
  const v = $('#rvMedia video');
  if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  $('#rvMedia').replaceChildren();
  state.reviewId = null;
  closeModal($('#reviewModal'));
}
$('#rvClose').addEventListener('click', closeReview);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.reviewId && !$('#reviewModal').classList.contains('open')) closeReview(); });
$('#reviewModal').addEventListener('click', (e) => { if (e.target === $('#reviewModal')) closeReview(); });

/* ---------- تأكيد الحذف ---------- */
let confirmCb = null;
function askConfirm(text, cb, title) {
  $('#cfTitle').textContent = title || 'تأكيد الحذف';
  $('#cfText').textContent = text;
  confirmCb = cb;
  openModal($('#confirmModal'));
}
$('#cfCancel').addEventListener('click', () => { confirmCb = null; closeModal($('#confirmModal')); });
$('#confirmModal').addEventListener('click', (e) => { if (e.target === $('#confirmModal')) { confirmCb = null; closeModal($('#confirmModal')); } });
$('#cfOk').addEventListener('click', async () => {
  const cb = confirmCb; confirmCb = null;
  closeModal($('#confirmModal'));
  if (cb) await cb();
});

/* ============================================================
   الإجراءات
   ============================================================ */
async function doAction(actn, id) {
  const s = subs().find(x => x.id === id);
  if (actn === 'view') { openReview(id); return; }
  if (actn === 'copy') {
    try { await navigator.clipboard.writeText(s.media_url); toast('تم نسخ رابط الملف', 'ok'); }
    catch { toast('تعذر النسخ — انسخ الرابط يدوياً', 'bad'); }
    return;
  }
  if (actn === 'reject') { openReview(id, true); return; }
  if (actn === 'delete') {
    askConfirm(`سيتم حذف إيديت "${s ? s.name : ''}" نهائياً من الجدار ومن قاعدة البيانات. الملف الأصلي يبقى في ImageKit ولا تتحرر مساحة التخزين. لا يمكن التراجع.`, async () => {
      closeReview();
      await act('edits_admin_action', { p_id: id, p_action: 'delete' }, 'تم الحذف نهائياً');
    });
    return;
  }
  const map = {
    approve: ['approve', 'تم النشر على الجدار'],
    withdraw: ['withdraw', 'تم السحب من النشر — عاد للمراجعة'],
    restore: ['restore', 'تمت الإعادة لقائمة المراجعة'],
    dismiss: ['dismiss_reports', 'تم تجاهل البلاغات'],
  };
  const m = map[actn];
  if (!m) return;
  const reason = actn === 'approve' && state.reviewId === id ? $('#rvReason').value : null;
  closeReview();
  await act('edits_admin_action', { p_id: id, p_action: m[0], p_reason: reason }, m[1]);
}

/* رفض من المودال مع السبب */
async function doRejectFromModal(id) {
  const reason = $('#rvReason').value.trim();
  closeReview();
  await act('edits_admin_action', { p_id: id, p_action: 'reject', p_reason: reason || null }, reason ? 'تم الرفض مع تسجيل السبب' : 'تم الرفض');
}

async function doBulk(action) {
  const ids = [...state.sel];
  if (!ids.length) return;
  if (action === 'delete') {
    askConfirm(`سيتم حذف ${ids.length} إيديت نهائياً من الجدار. الملفات الأصلية تبقى في ImageKit ولا تتحرر مساحة التخزين. لا يمكن التراجع.`, async () => {
      state.sel.clear();
      await act('edits_admin_bulk', { p_ids: ids, p_action: 'delete' }, 'تم الحذف الجماعي');
    }, 'تأكيد الحذف الجماعي');
    return;
  }
  const labels = { approve: 'تم النشر الجماعي', reject: 'تم الرفض الجماعي', withdraw: 'تم السحب الجماعي', restore: 'تمت الإعادة الجماعية', dismiss_reports: 'تم تجاهل البلاغات' };
  state.sel.clear();
  await act('edits_admin_bulk', { p_ids: ids, p_action: action }, labels[action] || 'تم');
}

async function doMessageAction(actn, id) {
  if (actn === 'm-delete') {
    askConfirm('سيتم حذف هذه الرسالة نهائياً من الجدار. لا يمكن التراجع.', async () => {
      await act('edits_admin_message_action', { p_id: id, p_action: 'delete' }, 'تم حذف الرسالة');
    });
    return;
  }
  const m = actn === 'm-hide' ? ['hide', 'تم إخفاء الرسالة من الجدار'] : ['unhide', 'تمت إعادة إظهار الرسالة'];
  await act('edits_admin_message_action', { p_id: id, p_action: m[0] }, m[1]);
}

async function doStorageAction(actn, id) {
  const m = { 's-full': ['mark_full', 'تم تعليم الحساب ممتلئ — الرفعيات ستنقل للتالي'], 's-ok': ['mark_ok', 'تم تعليم الحساب متاحاً'], 's-toggle': ['toggle', 'تم تبديل حالة الحساب'] };
  const x = m[actn];
  if (x) await act('edits_admin_storage', { p_account_id: id, p_action: x[0] }, x[1]);
}

/* ============================================================
   تفويض الأحداث
   ============================================================ */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-retry]')) { loadData(); return; }
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { setTab(tabBtn.dataset.tab); return; }

  const bulkBtn = e.target.closest('[data-bulk]');
  if (bulkBtn) { doBulk(bulkBtn.dataset.bulk); return; }

  const actBtn = e.target.closest('[data-act]');
  if (actBtn) {
    const { act: actn, id } = actBtn.dataset;
    if (actn === 'reject' && state.reviewId === id) { doRejectFromModal(id); return; }
    if (actn.startsWith('m-')) { doMessageAction(actn, id); return; }
    if (actn.startsWith('s-')) { doStorageAction(actn, id); return; }
    doAction(actn, id);
  }
});
document.addEventListener('change', (e) => {
  const ck = e.target.closest('[data-sel]');
  if (ck) {
    const id = ck.dataset.sel;
    if (ck.checked) state.sel.add(id); else state.sel.delete(id);
    ck.closest('.mcard')?.classList.toggle('selected', ck.checked);
    renderBulk();
    const sa = $('#selAll');
    if (sa) { const list = mediaList(); sa.checked = list.length > 0 && list.every(s => state.sel.has(s.id)); }
  }
});

/* ============================================================
   الإقلاع
   ============================================================ */
$('#gateIc').innerHTML = IC.shield;
$('#gateEye').innerHTML = IC.eye;
$('#gateBtn').innerHTML = IC.lock + ' دخول اللوحة';
$('#gateBack').innerHTML = IC.back + ' العودة لجدار الإيديتات';
$('#brandMark').innerHTML = IC.spark;
$('#dayPill').innerHTML = IC.spark + ` اليوم ${dayNow()} من 60`;
$('#logoutBtn').innerHTML = IC.logout + ' خروج';
$('#wallLink').innerHTML = IC.grid + ' الجدار';
$('#rvClose').innerHTML = IC.x;
$('#footWall').innerHTML = IC.grid + ' جدار الإيديتات';
$('#footHome').innerHTML = IC.home + ' الموقع الرئيسي';

const hashTab = location.hash.slice(1);
if (TABS.some(t => t.id === hashTab)) state.tab = hashTab;

if (pw) { showApp(); loadData(); } else { showGate(); }
