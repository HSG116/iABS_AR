/* ============================================================
   جدار الـ60 يوم — النواة المشتركة (أرشيف + إدارة)
   Supabase REST + خوارزمية 60day.md حرفياً + أفاتار SVG كرتونية
   + أدوات الوسائط (تستخدمها لوحة الإدارة لإعادة الاستضافة)
   ============================================================ */

const SB_URL = 'https://mqegvdtuyqglxjqakfha.supabase.co';
const SB_KEY = 'sb_publishable_mcxu0guthgq1U5w97JdKUQ_zaG9H8wa';

/* ---------- REST / RPC ---------- */
const sbHeaders = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

async function sbError(res) {
  const t = await res.text();
  try {
    const j = JSON.parse(t);
    const msg = String(j.message || '');
    if (j.code === 'PGRST202' || /could not find the function|schema cache/i.test(msg)) {
      console.error('RPC غير موجود في القاعدة:', msg);
      return new Error('خدمة الفيديو غير مهيّأة في القاعدة الرئيسية بعد — يلزم تفعيل إعدادات الفيديو مرة واحدة');
    }
    return new Error(j.message || j.hint || j.error || t);
  } catch { return new Error(t || ('HTTP ' + res.status)); }
}
async function rpc(fn, args) {
  const res = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: sbHeaders, body: JSON.stringify(args || {}) });
  if (!res.ok) throw await sbError(res);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
async function sbGet(table, query) {
  const res = await fetch(SB_URL + '/rest/v1/' + table + '?' + query, { headers: sbHeaders });
  if (!res.ok) throw await sbError(res);
  return res.json();
}

/* ---------- تحدي الـ60 يوم (نفس تقويم الموقع) ---------- */
const DAY1 = new Date(2026, 8, 18).getTime();
const TOTAL_DAYS = 60;
const DAY_MS = 864e5;
const dayNow = () => {
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.max(1, Math.min(TOTAL_DAYS, Math.round((today - DAY1) / DAY_MS) + 1));
};
const progressNow = () => Math.min(1, Math.max(0, (Date.now() - DAY1) / (TOTAL_DAYS * DAY_MS)));

/* ---------- أدوات ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const fmtBytes = (b) => {
  b = Number(b || 0);
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
};
const fmtMB = (b) => Math.round(Number(b || 0) / 1048576).toLocaleString('en-US') + ' MB';
function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 45000) return 'الآن';
  const m = Math.floor(ms / 60000);
  if (m < 60) return m === 1 ? 'منذ دقيقة' : m === 2 ? 'منذ دقيقتين' : m <= 10 ? `منذ ${m} دقائق` : `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? 'منذ ساعة' : h === 2 ? 'منذ ساعتين' : h <= 10 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'منذ يوم' : d === 2 ? 'منذ يومين' : d <= 10 ? `منذ ${d} أيام` : `منذ ${d} يوماً`;
  return new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'short' });
}
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- توست ---------- */
const TOAST_ICONS = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/></svg>',
};
function toast(msg, type = 'info', ms = 3800) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (TOAST_ICONS[type] || TOAST_ICONS.info) + '<div>' + esc(msg) + '</div>';
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}

/* ---------- مودال ---------- */
let openModalEl = null;
function openModal(el) {
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  openModalEl = el;
}
function closeModal(el) {
  (el || openModalEl)?.classList.remove('open');
  if (!el || el === openModalEl) { document.body.style.overflow = document.querySelector('.lb-backdrop.open') ? 'hidden' : ''; openModalEl = null; }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && openModalEl) { e.preventDefault(); closeModal(openModalEl); } });

/* ============================================================
   خوارزمية الترتيب — من 60day.md حرفياً
   ============================================================ */
const MIN_RATIO = 0.5625; // 9:16
const MAX_RATIO = 1.85;
const ORIENTATION_PENALTY = 0.55;

function mediaRatio(sub) {
  if (sub.width && sub.height) {
    const r = sub.width / sub.height;
    return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));
  }
  return 16 / 9;
}
function mediaCost(sub) { return 1 / mediaRatio(sub) + 0.35; }
function orientationOf(sub) {
  if (!sub.width || !sub.height) return 'square';
  const r = sub.width / sub.height;
  if (r > 1.05) return 'landscape';
  if (r < 0.95) return 'portrait';
  return 'square';
}
function hashIds(items) {
  let h = 7;
  for (const item of items) {
    const id = String(item.id);
    for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return h;
}
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(items) {
  const rnd = mulberry32(hashIds(items));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function packColumns(items, n, costFn = mediaCost, orientFn = orientationOf) {
  const cols = Array.from({ length: n }, () => []);
  const heights = new Array(n).fill(0);
  const lastOrient = new Array(n).fill(null);
  for (const item of items) {
    const o = orientFn(item);
    let best = 0, bestScore = Infinity;
    for (let c = 0; c < n; c++) {
      const score = heights[c] + (lastOrient[c] === o ? ORIENTATION_PENALTY : 0);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    cols[best].push(item);
    heights[best] += costFn(item);
    lastOrient[best] = o;
  }
  return cols;
}
function columnCount() {
  const w = window.innerWidth;
  return w >= 1440 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1;
}

/* تقدير ارتفاع كارت الرسالة — على قد الرسالة */
function messageLines(msg) {
  const len = String(msg.body || '').length;
  const explicit = String(msg.body || '').split('\n').length - 1;
  return Math.max(1, Math.min(14, Math.ceil(len / 26) + explicit));
}
function messageCost(msg) { return 0.38 + messageLines(msg) * 0.095; }
function messageOrient(msg) {
  const l = messageLines(msg);
  return l >= 6 ? 'tall' : l <= 2 ? 'short' : 'mid';
}

/* ============================================================
   أفاتار كرتونية SVG — 12 شخصية تُوزّع عشوائياً وثابتة
   ============================================================ */
const AVATAR_DEFS = [
  { bg: ['#FF7EA5', '#C22A55'], name: 'قطة' },
  { bg: ['#FFB25C', '#C56A1B'], name: 'ثعلب' },
  { bg: ['#7FE3C0', '#2E9E7B'], name: 'باندا' },
  { bg: ['#EAC9A8', '#A87B4F'], name: 'دب' },
  { bg: ['#C9B8FF', '#7A5FD0'], name: 'أرنب' },
  { bg: ['#8FC7FF', '#3D7BC4'], name: 'روبوت' },
  { bg: ['#A5F3A0', '#4BA84A'], name: 'فضائي' },
  { bg: ['#9ADFFF', '#4A90C2'], name: 'بطريق' },
  { bg: ['#FFA26B', '#D0542A'], name: 'نمر' },
  { bg: ['#C9C2D8', '#7E7494'], name: 'كوالا' },
  { bg: ['#D3F36B', '#7BA824'], name: 'ضفدع' },
  { bg: ['#FF9DB1', '#6B1B36'], name: 'شبح' },
];
const AVATAR_ART = [
  /* قطة */ `<path d="M18 22l-3-9 8 4zM46 22l3-9-8 4z" fill="#fff"/><circle cx="32" cy="35" r="16" fill="#fff"/><circle cx="26" cy="33" r="2.4" fill="#2A0E1B"/><circle cx="38" cy="33" r="2.4" fill="#2A0E1B"/><path d="M30 38h4l-2 2.6z" fill="#FF7EA5"/><path d="M32 40.6c-1.4 2-4 2-5.4.6M32 40.6c1.4 2 4 2 5.4.6" stroke="#2A0E1B" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M14 34h7M14 38l7-1M50 34h-7M50 38l-7-1" stroke="#2A0E1B" stroke-width="1.2" stroke-linecap="round" opacity=".55"/><circle cx="23" cy="38" r="2.2" fill="#FFB3C8" opacity=".8"/><circle cx="41" cy="38" r="2.2" fill="#FFB3C8" opacity=".8"/>`,
  /* ثعلب */ `<path d="M16 24l-2-12 10 6zM48 24l2-12-10 6z" fill="#fff"/><path d="M17 21l-1-6 5 3zM47 21l1-6-5 3z" fill="#FFB25C"/><circle cx="32" cy="35" r="16" fill="#fff"/><path d="M32 51c-6 0-10-4-10-9h20c0 5-4 9-10 9z" fill="#FFE9D2"/><circle cx="26" cy="32" r="2.4" fill="#2A0E1B"/><circle cx="38" cy="32" r="2.4" fill="#2A0E1B"/><ellipse cx="32" cy="41" rx="3" ry="2.4" fill="#2A0E1B"/><path d="M32 43.4v3" stroke="#2A0E1B" stroke-width="1.4" stroke-linecap="round"/>`,
  /* باندا */ `<circle cx="19" cy="20" r="7" fill="#2A0E1B"/><circle cx="45" cy="20" r="7" fill="#2A0E1B"/><circle cx="32" cy="35" r="16" fill="#fff"/><ellipse cx="25" cy="33" rx="4.6" ry="5.4" fill="#2A0E1B" transform="rotate(-14 25 33)"/><ellipse cx="39" cy="33" rx="4.6" ry="5.4" fill="#2A0E1B" transform="rotate(14 39 33)"/><circle cx="25.6" cy="32.4" r="1.7" fill="#fff"/><circle cx="38.4" cy="32.4" r="1.7" fill="#fff"/><ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#2A0E1B"/><path d="M32 43.2c-1.2 1.6-3.4 1.6-4.6.4M32 43.2c1.2 1.6 3.4 1.6 4.6.4" stroke="#2A0E1B" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  /* دب */ `<circle cx="19" cy="21" r="6.5" fill="#fff"/><circle cx="45" cy="21" r="6.5" fill="#fff"/><circle cx="19" cy="21" r="3" fill="#EAC9A8"/><circle cx="45" cy="21" r="3" fill="#EAC9A8"/><circle cx="32" cy="35" r="16" fill="#fff"/><circle cx="26" cy="32" r="2.3" fill="#2A0E1B"/><circle cx="38" cy="32" r="2.3" fill="#2A0E1B"/><ellipse cx="32" cy="41" rx="6" ry="4.6" fill="#FFE9D2"/><ellipse cx="32" cy="39.4" rx="2.6" ry="2" fill="#2A0E1B"/><path d="M32 41.4v2.2M32 43.6c-1.2 1.4-3 1.4-4 .4M32 43.6c1.2 1.4 3 1.4 4 .4" stroke="#2A0E1B" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  /* أرنب */ `<ellipse cx="25" cy="16" rx="4.5" ry="11" fill="#fff" transform="rotate(-8 25 16)"/><ellipse cx="39" cy="16" rx="4.5" ry="11" fill="#fff" transform="rotate(8 39 16)"/><ellipse cx="25" cy="17" rx="2" ry="7" fill="#FFB3C8" transform="rotate(-8 25 17)"/><ellipse cx="39" cy="17" rx="2" ry="7" fill="#FFB3C8" transform="rotate(8 39 17)"/><circle cx="32" cy="38" r="15" fill="#fff"/><circle cx="26" cy="36" r="2.3" fill="#2A0E1B"/><circle cx="38" cy="36" r="2.3" fill="#2A0E1B"/><path d="M30 41h4l-2 2.4z" fill="#FF7EA5"/><path d="M32 43.4v2M30 47h4" stroke="#2A0E1B" stroke-width="1.3" stroke-linecap="round"/><circle cx="22.6" cy="41" r="2.2" fill="#FFB3C8" opacity=".85"/><circle cx="41.4" cy="41" r="2.2" fill="#FFB3C8" opacity=".85"/>`,
  /* روبوت */ `<rect x="29.4" y="8" width="5.2" height="6" rx="2" fill="#fff"/><circle cx="32" cy="8" r="3" fill="#D3F36B"/><rect x="17" y="16" width="30" height="26" rx="8" fill="#fff"/><rect x="21" y="22" width="22" height="12" rx="6" fill="#2A0E1B"/><circle cx="27" cy="28" r="2.6" fill="#8FC7FF"/><circle cx="37" cy="28" r="2.6" fill="#8FC7FF"/><path d="M27 38h10" stroke="#2A0E1B" stroke-width="2" stroke-linecap="round"/><rect x="12" y="24" width="4" height="10" rx="2" fill="#fff"/><rect x="48" y="24" width="4" height="10" rx="2" fill="#fff"/><rect x="24" y="45" width="16" height="6" rx="3" fill="#fff" opacity=".85"/>`,
  /* فضائي */ `<ellipse cx="32" cy="36" rx="16" ry="17" fill="#fff"/><path d="M24 14c0-4 3-6 3-6M40 14c0-4-3-6-3-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="27" cy="8" r="2.6" fill="#D3F36B"/><circle cx="37" cy="8" r="2.6" fill="#D3F36B"/><ellipse cx="25.6" cy="34" rx="4.4" ry="6" fill="#2A0E1B" transform="rotate(-12 25.6 34)"/><ellipse cx="38.4" cy="34" rx="4.4" ry="6" fill="#2A0E1B" transform="rotate(12 38.4 34)"/><circle cx="26.6" cy="32" r="1.5" fill="#A5F3A0"/><circle cx="37.4" cy="32" r="1.5" fill="#A5F3A0"/><path d="M28 45c2.4 1.8 5.6 1.8 8 0" stroke="#2A0E1B" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  /* بطريق */ `<ellipse cx="32" cy="36" rx="16" ry="17" fill="#2A0E1B"/><ellipse cx="32" cy="40" rx="11" ry="12" fill="#fff"/><circle cx="26" cy="30" r="2.6" fill="#fff"/><circle cx="38" cy="30" r="2.6" fill="#fff"/><circle cx="26.6" cy="30.6" r="1.3" fill="#2A0E1B"/><circle cx="37.4" cy="30.6" r="1.3" fill="#2A0E1B"/><path d="M28 35h8l-4 5z" fill="#FFB25C"/><path d="M18 40c-3 2-4 6-3 9M46 40c3 2 4 6 3 9" stroke="#2A0E1B" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="23" cy="36" r="2" fill="#FF9DB1" opacity=".7"/><circle cx="41" cy="36" r="2" fill="#FF9DB1" opacity=".7"/>`,
  /* نمر */ `<path d="M18 22l-3-9 8 4zM46 22l3-9-8 4z" fill="#fff"/><circle cx="32" cy="35" r="16" fill="#fff"/><path d="M24 22l2 5M32 20v6M40 22l-2 5" stroke="#D0542A" stroke-width="2.6" stroke-linecap="round"/><circle cx="26" cy="33" r="2.4" fill="#2A0E1B"/><circle cx="38" cy="33" r="2.4" fill="#2A0E1B"/><ellipse cx="32" cy="41" rx="5.6" ry="4.2" fill="#FFE9D2"/><path d="M30 39.6h4l-2 2.4z" fill="#2A0E1B"/><path d="M32 42v1.6M32 43.6c-1.2 1.4-3 1.4-4 .4M32 43.6c1.2 1.4 3 1.4 4 .4" stroke="#2A0E1B" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M17 34h5M17 38h5M47 34h-5M47 38h-5" stroke="#D0542A" stroke-width="1.6" stroke-linecap="round"/>`,
  /* كوالا */ `<circle cx="17" cy="26" r="8.5" fill="#fff"/><circle cx="47" cy="26" r="8.5" fill="#fff"/><circle cx="17" cy="26" r="4.5" fill="#C9C2D8"/><circle cx="47" cy="26" r="4.5" fill="#C9C2D8"/><circle cx="32" cy="36" r="15" fill="#fff"/><circle cx="26" cy="33" r="2.2" fill="#2A0E1B"/><circle cx="38" cy="33" r="2.2" fill="#2A0E1B"/><ellipse cx="32" cy="41" rx="4.6" ry="5.6" fill="#7E7494"/><path d="M28 47c2.4 1.6 5.6 1.6 8 0" stroke="#2A0E1B" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  /* ضفدع */ `<circle cx="23" cy="20" r="7.5" fill="#fff"/><circle cx="41" cy="20" r="7.5" fill="#fff"/><circle cx="23" cy="20" r="3.4" fill="#2A0E1B"/><circle cx="41" cy="20" r="3.4" fill="#2A0E1B"/><circle cx="24" cy="19" r="1.2" fill="#fff"/><circle cx="42" cy="19" r="1.2" fill="#fff"/><ellipse cx="32" cy="38" rx="16" ry="14" fill="#fff"/><path d="M22 40c6 5 14 5 20 0" stroke="#2A0E1B" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="20" cy="36" r="2.4" fill="#D3F36B"/><circle cx="44" cy="36" r="2.4" fill="#D3F36B"/><circle cx="28" cy="33" r="1.4" fill="#2A0E1B"/><circle cx="36" cy="33" r="1.4" fill="#2A0E1B"/>`,
  /* شبح */ `<path d="M32 12c-10 0-16 7-16 16v22l5.4-4 5.2 4 5.4-4 5.4 4 5.2-4 5.4 4V28c0-9-6-16-16-16z" fill="#fff"/><circle cx="26" cy="30" r="3" fill="#2A0E1B"/><circle cx="38" cy="30" r="3" fill="#2A0E1B"/><circle cx="27" cy="29" r="1" fill="#fff"/><circle cx="39" cy="29" r="1" fill="#fff"/><ellipse cx="32" cy="38" rx="3" ry="3.8" fill="#2A0E1B"/><circle cx="21.6" cy="35" r="2.2" fill="#FF9DB1" opacity=".85"/><circle cx="42.4" cy="35" r="2.2" fill="#FF9DB1" opacity=".85"/>`,
];
function avatarSVG(seed, size = 44) {
  const i = ((Number(seed) % 12) + 12) % 12;
  const [c1, c2] = AVATAR_DEFS[i].bg;
  const gid = 'avg' + i + '-' + Math.round(size);
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="display:block;border-radius:50%">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle cx="32" cy="32" r="32" fill="url(#${gid})"/>${AVATAR_ART[i]}</svg>`;
}
const avatarName = (seed) => AVATAR_DEFS[((Number(seed) % 12) + 12) % 12].name;

/* ============================================================
   تخزين الوسائط — صور وفيديو على مساحات Supabase الخمس
   ============================================================ */
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const IK_ORIGIN = 'https://ik.imagekit.io';
const IK_PATH = /^\/(ld5rplgcm|jco71x7fu)\/60day-edits\/[A-Za-z0-9_.-]+$/;
/* ---------- تخزين Supabase (صور + فيديو، مشاريع مستقلة) ----------
   المسار: https://<ref>.supabase.co/storage/v1/object/public/edits-videos/
           videos|images|posters/<uuid>.<ext>
   لا نعرف عدد المشاريع مسبقاً، لذلك نتعرّف على الشكل فقط ونمنع أي مسار آخر. */
const SB_MEDIA_PATH = /^\/storage\/v1\/object\/public\/edits-videos\/(videos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|m4v)|images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|avif)|posters\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp))$/;
const SB_MEDIA_HOST = /^[a-z0-9]+\.supabase\.co$/;

/* روابط الوسائط المسموح عرضها فقط (ImageKit القديم + تخزين Supabase) */
function safeMediaUrl(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return '';
    if (url.origin === IK_ORIGIN) return IK_PATH.test(url.pathname) ? url.href : '';
    if (url.protocol === 'https:' && SB_MEDIA_HOST.test(url.hostname) && SB_MEDIA_PATH.test(url.pathname)) return url.href;
    return '';
  } catch { return ''; }
}
function mediaType(item) {
  const path = safeMediaUrl(item.media_url);
  return VIDEO_EXT.test(path) || item.media_type === 'video' ? 'video' : 'image';
}
function normalizeMedia(item) {
  return { ...item, media_type: mediaType(item), media_url: safeMediaUrl(item.media_url) };
}
function fileMediaType(file) {
  if (VIDEO_EXT.test(file.name) && (!file.type || /^video\//.test(file.type))) return 'video';
  if (IMAGE_EXT.test(file.name) && (!file.type || /^image\/(jpeg|png|webp|gif|avif)$/.test(file.type))) return 'image';
  throw new Error('اختر صورة JPG أو PNG أو WEBP أو GIF أو AVIF، أو فيديو MP4 أو MOV أو WEBM');
}
/* ---------- قواعد اختيار الملف ----------
   الصور والفيديو: مساحات Supabase الخمس.
   الصورة تُضغط في المتصفح مع الحفاظ على الوضوح، والفيديو حتى 350MB يُضغط تحت 50MB. */
const VIDEO_INPUT_MAX = 350 * 1048576;
function validateMediaFile(file) {
  const type = fileMediaType(file);
  const limit = type === 'video' ? VIDEO_INPUT_MAX : 20 * 1048576;
  if (!file.size || file.size > limit) {
    throw new Error(type === 'video'
      ? 'حجم الفيديو الأصلي كبير جداً (الحد 350MB) — اضغطه أو قسّمه أولاً'
      : 'الصورة يجب أن تكون بين 1 بايت و20MB');
  }
  return type;
}
function ikThumb(url, w = 640) {
  if (!url) return '';
  return url + (url.includes('?') ? '&' : '?') + `tr=w-${w},q-82,f-auto`;
}
/* thumbnail للصور: تحويل ImageKit فقط للقديم؛ صور Supabase تُعرض كما هي */
function imageThumb(url, w = 640) {
  if (!url) return '';
  return url.startsWith(IK_ORIGIN + '/') ? ikThumb(url, w) : url;
}
/* ---------- صورة الغلاف (poster) ----------
   في ImageKit، مسار /ik-thumbnail.jpg لفيديو يستهلك وحدات معالجة فيديو،
   ولهذا يرجع 403 عند نفاد الحصة. لذلك نولّد صورة الغلاف في المتصفح
   ونحفظها كملف صورة مستقل (لا يستهلك وحدات فيديو إطلاقاً). */
function posterOf(item) {
  const stored = item && item.poster_url ? safeMediaUrl(item.poster_url) : '';
  if (stored) return stored;
  const url = safeMediaUrl(item.media_url);
  if (!url) return '';
  if (mediaType(item) === 'video') {
    // فيديو Supabase بلا غلاف: لا نخترع مساراً — نعرض إطار الفيديو نفسه
    return url.includes('/storage/v1/object/public/edits-videos/') ? '' : url + '/ik-thumbnail.jpg';
  }
  return url;
}
/* src جاهز لوسم img: تحويل ImageKit للصور القديمة فقط (تخزين Supabase لا يحول) */
function posterSrc(item, w = 640) {
  const p = posterOf(item);
  if (!p) return '';
  return p.startsWith(IK_ORIGIN + '/') ? ikThumb(p, w) : p;
}
/* أولوية التشغيل: الملف الأساسي ثم أي مصدر بديل متاح */
function mediaSources(item) {
  const list = [];
  const push = (u) => { const s = safeMediaUrl(u); if (s && !list.includes(s)) list.push(s); };
  push(item && item.media_url);
  return list;
}
function mediaError(container, type) {
  const el = document.createElement('div');
  el.className = 'media-error';
  el.innerHTML = (type === 'video' ? IC.video : IC.image) + '<span>' + (type === 'video' ? 'تعذر تشغيل هذا الترميز — جرّب فتح الملف الأصلي' : 'تعذر تحميل المعاينة') + '</span>';
  container.append(el);
}
/* ---------- تشغيل فيديو مع تبديل تلقائي بين الحسابات ---------- */
function attachVideo(container, item, opts = {}) {
  const sources = mediaSources(item);
  if (!sources.length) { mediaError(container, 'video'); return null; }
  const video = document.createElement('video');
  video.className = opts.className || 'thumb';
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = opts.preload || 'metadata';
  if (opts.controls) { video.controls = true; video.muted = false; video.loop = false; }
  if (opts.poster) video.poster = opts.poster;
  let idx = 0;
  const next = () => {
    if (idx >= sources.length) { video.remove(); mediaError(container, 'video'); return; }
    video.src = sources[idx++];
  };
  video.addEventListener('error', () => { video.remove(); mediaError(container, 'video'); }, { once: true });
  video.addEventListener('loadeddata', () => { if (video.duration > 0.1) { try { video.currentTime = 0.1; } catch {} } }, { once: true });
  next();
  container.prepend(video);
  return video;
}
function previewFallback(img, item) {
  img.addEventListener('error', () => {
    const container = img.parentElement;
    img.remove();
    if (mediaType(item) === 'video') {
      attachVideo(container, item, { className: 'thumb fallback-video' });
    } else {
      mediaError(container, 'image');
    }
  }, { once: true });
}

/* ---------- لايكات محلية ---------- */
const likedSet = (key) => { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } };
const saveLiked = (key, set) => { try { localStorage.setItem(key, JSON.stringify([...set].slice(-800))); } catch {} };

/* ---------- ظهور تدريجي ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
}, { rootMargin: '0px 0px -36px 0px', threshold: 0.06 });
const watchReveal = (root = document) => root.querySelectorAll('.rv:not(.in)').forEach((el) => revealObserver.observe(el));

/* ---------- أيقونات مشتركة ---------- */
const IC = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.9 1.2 5.8 3.4 1.9-2.2 3.6-3.4 5.8-3.4 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.9 1.2 5.8 3.4 1.9-2.2 3.6-3.4 5.8-3.4 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4c4-2.5 8 2.5 12 0v10c-4 2.5-8-2.5-12 0"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-4.5-4.5L6 21"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="3"/><path d="M16 10l6-3v10l-6-3"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-2.6-6.3M21 3v6h-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3.5v5.7c0 5-3.4 8.6-8 10.8-4.6-2.2-8-5.8-8-10.8V5.5z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-3.2 4M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 004.2 4.2"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.1 6.5L21 10l-6.9 1.5L12 18l-2.1-6.5L3 10l6.9-1.5zM19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 5a3.5 3.5 0 010 7M18.5 14.7c1.7.8 2.8 2.3 3.2 4.3"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2zM12 10v4M12 17.5h.01"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};