import React, { useEffect, useState } from 'react';
import type { Language } from '../types';

// ============================================================
//  MODERATORS — قسم المشرفين (بيانات حية من X via FixTweet)
//  20 مشرف: 1 قائد BOSS (inormalq) + 19 مشرف GRID
//  الطبقات: بروكسي /api/kick → مباشر → fallback ثابت
//  الكاش: localStorage 30 دقيقة + تحديث صامت كل 10 دقائق
// ============================================================

interface RosterEntry {
  kick: string;
  x: string;
  boss?: boolean;
}

// 20 moderators — Kick name + X handle (live data via FixTweet)
// القائد أولاً دائماً: ROSTER[0] هو الـ BOSS
const ROSTER: RosterEntry[] = [
  { kick: 'inormalq', x: 'inormalq', boss: true },
  { kick: '_iAli5', x: '_iAli5' },
  { kick: 'iAbo3tab', x: 'iAbo3tab' },
  { kick: 'SHADDDOH', x: 'SHADDDOH' },
  { kick: 'Shanzleezayh', x: 'Shanzleezayh' },
  { kick: 'rwubii', x: 'rwubii' },
  { kick: 'IIYZL1', x: 'IIYZL1' },
  { kick: 'Fotaamii', x: 'Fotaamii' },
  { kick: '4sshd', x: '4sshd' },
  { kick: 'mohmd505_', x: 'mohmd505_' },
  { kick: 'jj4naa', x: 'jj4naa' },
  { kick: 'Moh_HSG', x: 'Moh_HSG' },
  { kick: 'awash70_', x: 'awash70_' },
  { kick: 'wjdann_38', x: 'wjdann_38' },
  { kick: 'sipdai', x: 'sipdai' },
  { kick: 'unnFamiliarr', x: 'unnFamiliarr' },
  { kick: '_A7MEDO_', x: '_A7MEDO_' },
  { kick: 'Ywvqg3', x: 'Ywvqg3' },
  { kick: 'r8gd0', x: 'r8gd0' },
  { kick: 'iluxl3', x: 'iluxl3' },
];

interface ModProfile {
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  followers: number | null;
  tweets: number | null;
  live: boolean;
}

const CACHE_KEY = 'iabs_mods_cache_v3';
const LEGACY_CACHE_KEY = 'iabs_mods_cache_v2';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

/**
 * يضبط مقاس صورة البانر من CDN.
 * المقاسات المتاحة فعلياً عند pbs.twimg.com: 1500x500 (59KB) · 600x200 (15KB) · 300x100 (6KB)
 * Anything else يرجع 404 — لذلك نحصرها هنا ومعها fallback عند فشل التحميل.
 */
const BANNER_SIZES = ['1500x500', '600x200', '300x100'] as const;

const stripBannerSize = (url: string): string => url.split('?')[0].replace(/\/$/, '').replace(/\/(1500x500|600x200|300x100|normal)$/, '');

const bannerAt = (url: string, size: typeof BANNER_SIZES[number]): string => {
  if (!url) return '';
  return `${stripBannerSize(url)}/${size}`;
};

const compact = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '---';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

async function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Layer 1: our server proxy (no CORS issues) → Layer 2: direct FixTweet → Layer 3: static fallback
async function fetchMod(handle: string): Promise<ModProfile | null> {
  const target = `https://api.fxtwitter.com/${handle}`;
  let user: any = null;
  try {
    const via = await fetchJson('/api/kick?endpoint=' + encodeURIComponent(target));
    user = via?.user || null;
  } catch {
    /* fall through */
  }
  if (!user) {
    try {
      const direct = await fetchJson(target);
      user = direct?.user || null;
    } catch {
      /* fall through */
    }
  }
  if (!user) return null;

  // ===== مقاسات صور معقولة =====
  // البانر يُعرض بحجم ~96px ارتفاع فقط — تحميل 1500x500 كان يستهلك مئات
  // الكيلوبايت لكل مشرف (20 مشرف) ويسبّب تعليق الموقع. الآن 500x150.
  const avatarRaw: string = user.avatar_url || '';
  const bannerRaw: string = user.banner_url || '';

  return {
    name: user.name || handle,
    handle: user.screen_name || handle,
    // الصورة تُعرض بحجم 56px (أو 96px للبوس) — 200x200 أكثر من كافٍ
    avatar: avatarRaw ? avatarRaw.replace('_normal.', '_200x200.') : '',
    banner: bannerAt(bannerRaw, '600x200'),
    bio: user.description || '',
    followers: typeof user.followers === 'number' ? user.followers : null,
    tweets: typeof user.tweets === 'number' ? user.tweets : null,
    live: true,
  };
}

function readCache(): { at: number; data: Record<string, ModProfile> } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------- Icons ----------
const XIconSmall: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const CrownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-7 h-7'} viewBox="0 0 24 24" fill="none">
    <path fill="#FFD76A" d="M2.5 8.5 6.5 12l5.5-7 5.5 7 4-3.5L20 18H4L2.5 8.5z" />
    <rect x="4" y="18.6" width="16" height="2.2" rx="1.1" fill="#B45309" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-3 h-3'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

// ---------- Section ----------
const ModeratorsSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const [profiles, setProfiles] = useState<Record<string, ModProfile>>(() => readCache()?.data || {});
  const [loading, setLoading] = useState(true);

  const t = {
    mod: lang === 'ar' ? 'مشرف' : 'MOD',
    boss: lang === 'ar' ? 'القائد' : 'BOSS',
    followers: lang === 'ar' ? 'متابع' : 'Followers',
    posts: lang === 'ar' ? 'منشور' : 'Posts',
    follow: lang === 'ar' ? 'تابع' : 'Follow',
  };

  useEffect(() => {
    let cancelled = false;

    const load = async (useCacheFirst = true) => {
      const cached = readCache();
      const fresh = cached && Date.now() - cached.at < CACHE_TTL_MS;
      if (useCacheFirst && fresh) {
        setProfiles(cached.data);
        setLoading(false);
        return;
      }
      // دفعات 3 متوازية + عرض تدريجي
      for (let i = 0; i < ROSTER.length; i += 3) {
        const batch = await Promise.all(
          ROSTER.slice(i, i + 3).map(async (m) => {
            try {
              const p = await fetchMod(m.x);
              return { x: m.x.toLowerCase(), p };
            } catch {
              return { x: m.x.toLowerCase(), p: null };
            }
          }),
        );
        if (cancelled) return;
        const next: Record<string, ModProfile> = {};
        batch.forEach(({ x, p }) => {
          if (p) next[x] = p;
        });
        if (Object.keys(next).length > 0) {
          setProfiles((prev) => {
            const merged = { ...prev, ...next };
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: merged }));
            } catch {}
            return merged;
          });
        }
      }
      if (!cancelled) setLoading(false);
    };

    load(true);
    // تحديث صامت كل 10 دقائق، ويتوقف كلياً والتبويب مخفي (20 طلب شبكة لكل دورة)
    let timer: ReturnType<typeof setInterval> | null = null;
    const startRefresh = () => { if (!timer) timer = setInterval(() => load(false), REFRESH_MS); };
    const stopRefresh = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => {
      if (document.visibilityState === 'visible') startRefresh();
      else stopRefresh();
    };
    startRefresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      stopRefresh();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Fallback ذكي: بيانات Kick الثابتة إن غابت X
  const get = (x: string): ModProfile => {
    const p = profiles[x.toLowerCase()];
    if (p) return p;
    const r = ROSTER.find((m) => m.x.toLowerCase() === x.toLowerCase())!;
    return {
      name: r.kick,
      handle: x,
      avatar: '',
      banner: '',
      bio: '',
      followers: null,
      tweets: null,
      live: false,
    };
  };

  const boss = ROSTER[0];
  const rest = ROSTER.slice(1);
  const bossP = get(boss.x);

  return (
    <div className="w-full">
      {/* شريط المزامنة العلوي */}
      <div
        className={`h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06] mb-4 md:mb-6 transition-opacity duration-700 ${loading ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#C9A24B] to-transparent animate-pulse" />
      </div>

      {/* ===== 👑 BOSS HERO ===== */}
      <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-b from-[#FFE9B8] via-[#C9A24B]/50 to-transparent shadow-[0_30px_90px_rgba(201,162,75,0.25)] mb-4 md:mb-6 overflow-hidden animate-fade-in-up">
        <div className="relative rounded-[26.5px] bg-[#080808] overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#FFE9B8]/70 to-transparent" />
          {/* بانر */}
          <div className="relative h-36 sm:h-48 lg:h-56 overflow-hidden">
            {bossP.banner ? (
              <img
                src={bannerAt(bossP.banner, '1500x500')}
                alt="" loading="lazy" decoding="async" width={1500} height={500}
                onError={(e) => {
                  const img = e.currentTarget;
                  const base = stripBannerSize(bossP.banner);
                  if (!img.src.endsWith(base)) img.src = base;
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-l from-[#C9A24B]/30 via-[#8B5CF6]/20 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/30 to-transparent" />
            <a
              href={`https://x.com/${boss.x}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`X — @${boss.x}`}
              className="absolute top-3 end-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/55 backdrop-blur border border-white/20 text-white hover:bg-white hover:text-black transition-all"
            >
              <XIconSmall className="w-4 h-4" />
            </a>
          </div>
          {/* الهوية */}
          <div className="relative px-5 sm:px-8 pb-6 sm:pb-8 -mt-10 sm:-mt-12">
            <div className="flex flex-row items-end gap-4 sm:gap-5">
              {/* الحاوية بمقاس ثابت حتى يبقى التاج والنقطة ملتصقين بالصورة دائماً */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                <span
                  className="absolute inset-0 block rounded-full p-[3px]"
                  style={{
                    background: 'conic-gradient(from 200deg,#ffe977,#8a6a00,#fff6c8,#8a6a00,#ffe977)',
                    boxShadow: '0 0 44px rgba(255,215,106,0.55)',
                  }}
                >
                  {/* الحرف البديل تحت الصورة — يظهر دائماً لو الصورة ما وصلت */}
                  <span className="w-full h-full rounded-full bg-[#141414] flex items-center justify-center font-black text-3xl text-[#FFE9B8]">
                    {boss.kick.charAt(0).toUpperCase()}
                  </span>
                  {bossP.avatar && (
                    <img
                      src={bossP.avatar} alt={bossP.name} loading="lazy" decoding="async"
                      width={200} height={200}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="absolute inset-[3px] rounded-full object-cover bg-black"
                    />
                  )}
                </span>
                <CrownIcon className="absolute -top-6 left-1/2 -translate-x-1/2 w-7 h-7 drop-shadow-[0_0_10px_rgba(255,215,106,0.9)] animate-float-soft" />
                {bossP.live && (
                  <span className="absolute bottom-0 end-0 w-4 h-4 rounded-full bg-[#53FC18] border-[3px] border-[#080808] shadow-[0_0_10px_#53FC18]" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex items-end justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-black text-white truncate" dir="ltr">
                    {bossP.name}
                  </p>
                  <p className="flex items-center gap-2 mt-1 flex-wrap" dir="ltr">
                    <span className="text-[12px] font-bold text-[#53FC18]">@{bossP.handle}</span>
                    <span className="text-[10px] font-bold text-[#C9A24B]/80">KICK: {boss.kick}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="inline-flex flex-col items-center px-4 py-2 rounded-2xl bg-[#FFE9B8]/10 border border-[#FFE9B8]/30">
                    <span className="text-base sm:text-lg font-black text-[#FFE9B8]" dir="ltr">
                      {compact(bossP.followers)}
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{t.followers}</span>
                  </span>
                  <span className="inline-flex flex-col items-center px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-base sm:text-lg font-black text-white" dir="ltr">
                      {compact(bossP.tweets)}
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{t.posts}</span>
                  </span>
                </div>
              </div>
            </div>
            {bossP.bio && (
              <p className="text-[13px] sm:text-sm text-white/60 font-medium leading-relaxed mt-4 max-w-3xl" dir="auto">
                {bossP.bio}
              </p>
            )}            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <a
                href={`https://x.com/${boss.x}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-white text-black text-[13px] font-black hover:brightness-90 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <XIconSmall className="w-4 h-4" />
                {t.follow} @{boss.x}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 🛡️ MODS GRID ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {rest.map((m, i) => {
          const p = get(m.x);
          return (
            <div
              key={m.x}
              className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0b0b]/85 transition-colors hover:border-[#C9A24B]/50 hover:-translate-y-1 hover:shadow-[0_24px_60px_-16px_rgba(201,162,75,0.35)] duration-300 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
            >
              {/* بانر */}
              <div className="relative h-20 sm:h-24 overflow-hidden bg-gradient-to-l from-[#C9A24B]/20 via-white/[0.03] to-black">
                {p.banner && (
                  <img
                    src={p.banner}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={200}
                    onError={(e) => {
                      const img = e.currentTarget;
                      const base = stripBannerSize(p.banner);
                      if (!img.src.endsWith(base)) img.src = base;
                    }}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/30 to-transparent" />
                <span className="absolute top-2 start-2 inline-flex items-center gap-1 text-[8px] font-black tracking-[0.16em] px-2 py-[3px] rounded-lg bg-black/55 backdrop-blur border border-[#C9A24B]/40 text-[#FFE9B8] uppercase">
                  <ShieldIcon className="w-3 h-3 text-[#C9A24B]" />
                  {t.mod}
                </span>
                <a
                  href={`https://x.com/${m.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`X — @${m.x}`}
                  className="absolute top-2 end-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/55 backdrop-blur border border-white/20 text-white/70 hover:bg-white hover:text-black transition-all"
                >
                  <XIconSmall className="w-3.5 h-3.5" />
                </a>
              </div>
              {/* الهوية */}
              <div className="relative px-4 pb-4 -mt-7">
                <div className="flex items-end gap-3">
                  <div className="relative w-14 h-14 shrink-0">
                    <span
                      className="absolute inset-0 block rounded-full p-[2px]"
                      style={{ background: 'conic-gradient(from 200deg,#ffe977,#8a6a00,#fff6c8,#8a6a00,#ffe977)' }}
                    >
                      <span className="w-full h-full rounded-full bg-[#141414] flex items-center justify-center font-black text-xl text-[#FFE9B8]">
                        {m.kick.charAt(0).toUpperCase()}
                      </span>
                      {p.avatar && (
                        <img
                          src={p.avatar} alt={p.name} loading="lazy" decoding="async"
                          width={200} height={200}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="absolute inset-[2px] rounded-full object-cover bg-black"
                        />
                      )}
                    </span>
                    {p.live && (
                      <span className="absolute bottom-0 end-0 w-3.5 h-3.5 rounded-full bg-[#53FC18] border-2 border-[#0b0b0b] shadow-[0_0_10px_#53FC18]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <p className="text-[15px] font-black text-white truncate" dir="ltr">
                      {p.name}
                    </p>
                    <p className="text-[11px] font-bold text-white/40 truncate" dir="ltr">
                      @{p.handle} <span className="text-[#C9A24B]/70">• KICK: {m.kick}</span>
                    </p>
                  </div>
                </div>
                <p className="text-[11.5px] text-white/45 font-medium leading-relaxed mt-2 line-clamp-2 min-h-[32px]" dir="auto">
                  {p.bio || '---'}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[11px] font-black text-white/70" dir="ltr">
                    {compact(p.followers)} <span className="font-bold text-white/35">{t.followers}</span>
                  </span>
                  <span className="ms-auto flex items-center gap-1.5">
                    <a
                      href={`https://x.com/${m.x}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-xl bg-white text-black text-[11px] font-black hover:brightness-90 active:scale-95 transition-all"
                    >
                      <XIconSmall className="w-3 h-3" />
                      {t.follow}
                    </a>
                  </span>
                </div>
              </div>
              {/* خط سفلي ذهبي يتمدد */}
              <span className="absolute bottom-0 start-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#FFE9B8] to-[#C9A24B] transition-all duration-500" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModeratorsSection;
