import React, { useEffect, useState, useMemo } from 'react';

/* ============================================================
   تحدي الـ60 يوم
   - تاريخ البداية: 18 سبتمبر 2026  →  11 أكتوبر 2026 = اليوم 24
   - يزيد العدد لحاله عند منتصف الليل (بتوقيت جهاز الزائر)
   ============================================================ */
const CHALLENGE_START = new Date(2026, 8, 18); // 2026-09-18  (الأشهر تبدأ من 0)
const CHALLENGE_TOTAL = 60;
const DAY_MS = 86400000;

const clampDay = (n: number) => Math.min(CHALLENGE_TOTAL, Math.max(1, n));

/** رقم اليوم الحالي حسب تقويم الجهاز المحلي (لا يتأثر بفرق توقيت UTC) */
const calcDay = () => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMidnight = new Date(CHALLENGE_START.getFullYear(), CHALLENGE_START.getMonth(), CHALLENGE_START.getDate()).getTime();
    const diff = Math.round((todayMidnight - startMidnight) / DAY_MS);
    return clampDay(diff + 1);
};

/** كم ثانية متبقية حتى منتصف الليل القادم (+1.5 ثانية أمان ضد التوقيت المعتل) */
const msToMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 500);
    return Math.max(1000, next.getTime() - now.getTime());
};

/** يحدّث رقم اليوم عند منتصف الليل، ويعيد الحساب فور رجوع المستخدم للصفحة */
export const useChallengeDay = (): number => {
    const [day, setDay] = useState<number>(calcDay);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const schedule = () => {
            timer = setTimeout(() => {
                setDay(calcDay());
                schedule();
            }, msToMidnight());
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') setDay(calcDay());
        };

        schedule();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, []);

    return day;
};

const COPY = {
    en: {
        badge: '60-DAY CHALLENGE',
        of: 'of',
        left: 'days left',
        doneSub: '60 days — all of them. Legends never stop.',
        dayLabel: 'DAY',
        progress: 'Progress map',
    },
    ar: {
        badge: 'تحدي الـ60 يوم',
        of: 'من',
        left: 'يوم متبقي',
        doneSub: '60 يوم — كلها. الأسطورة ما توقف.',
        dayLabel: 'يوم',
        progress: 'خريطة التقدّم',
    },
} as const;

/* ============================================================
   1) الكرت الكبير — تحت الهيدر فوق الواجهة
   ============================================================ */
export const Challenge60: React.FC<{ lang: 'en' | 'ar' }> = ({ lang }) => {
    const day = useChallengeDay();
    const T = useMemo(() => COPY[lang], [lang]);

    const left = Math.max(0, CHALLENGE_TOTAL - day);
    const isDone = day >= CHALLENGE_TOTAL;
    const pct = Math.round((day / CHALLENGE_TOTAL) * 100);

    const R = 30;
    const C = 2 * Math.PI * R;
    const dash = (pct / 100) * C;

    const cells = useMemo(() => Array.from({ length: CHALLENGE_TOTAL }, (_, i) => i + 1), []);

    return (
        <section className="pt-4 md:pt-6" aria-label={T.badge}>
            <div
                className="relative overflow-hidden rounded-[30px] md:rounded-[34px] p-[1.5px] bg-gradient-to-br from-[#FF2D2D]/85 via-[#FF2D2D]/30 via-50% to-white/[0.08]"
                style={{ boxShadow: '0 22px 60px -28px rgba(255,45,45,0.7)' }}
            >
                {/* توهّج علوي على الإطار نفسه */}
                <div className="absolute -top-px inset-x-16 h-px bg-gradient-to-l from-transparent via-white/70 to-transparent pointer-events-none z-10" />
                <div className="relative overflow-hidden rounded-[28.5px] md:rounded-[32.5px] bg-[#0a0a0a]/90 px-5 py-6 sm:px-7 sm:py-6">
                    {/* توهّج خلفي (تدرّجات شعاعية بدون فلتر — نفس الشكل وبدون كلفة رسم) */}
                    <div className="absolute -top-28 -end-20 w-64 h-64 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,45,45,0.26) 0%, rgba(255,45,45,0.11) 40%, transparent 68%)' }} />
                    <div className="absolute -bottom-32 -start-24 w-60 h-60 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(83,252,24,0.09) 0%, rgba(83,252,24,0.04) 40%, transparent 68%)' }} />
                    {/* خطوط تقنية خفيفة */}
                    <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

                    <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
                        {/* ===== العمود الأول: الرقم + النصوص ===== */}
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="relative shrink-0 w-[124px] h-[124px] sm:w-[136px] sm:h-[136px] flex items-center justify-center">
                                {/* هالة خلفية */}
                                <span className="absolute inset-1 rounded-full animate-pulse pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(255,45,45,0.20) 0%, transparent 70%)' }} />
                                <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                                    <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                                    <circle
                                        cx="36" cy="36" r={R} fill="none"
                                        stroke="url(#d60grad)" strokeWidth="5" strokeLinecap="round"
                                        strokeDasharray={`${dash} ${C}`}
                                        className="d60-ring"
                                    />
                                    <defs>
                                        <linearGradient id="d60grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#FF2D2D" />
                                            <stop offset="100%" stopColor="#53FC18" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                <div className="relative text-center leading-none">
                                    <p className="font-gaming text-[54px] sm:text-[60px] text-white drop-shadow-[0_0_20px_rgba(255,45,45,0.6)]" dir="ltr">
                                        {day}
                                    </p>
                                    <p className="text-[9px] sm:text-[10px] font-black tracking-[0.28em] text-white/45 uppercase mt-0.5">
                                        {T.dayLabel}
                                    </p>
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#FF2D2D]/35 bg-[#FF2D2D]/10 px-3 py-1 mb-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] animate-pulse shadow-[0_0_8px_#FF2D2D]" />
                                    <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-[#ff8a8a] uppercase">{T.badge}</span>
                                </div>

                                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                                    <span dir="ltr" className="inline-block">
                                        <span className="text-[#FF2D2D]">{day}</span>
                                        <span className="text-white/35 mx-1.5 text-base sm:text-xl">/</span>
                                        <span className="text-white/80">{CHALLENGE_TOTAL}</span>
                                    </span>
                                    <span className="block text-[11px] sm:text-xs font-bold text-white/45 mt-1">
                                        {T.of} {CHALLENGE_TOTAL} {lang === 'en' ? 'days' : 'يوم'}
                                    </span>
                                </h2>

                                <p className="text-[11px] sm:text-xs font-bold text-white/45 mt-1.5 leading-relaxed">
                                    {isDone ? T.doneSub : (
                                        <>
                                            <span className="text-[#53FC18]">{left}</span>
                                            <span className="ms-1.5">{T.left}</span>
                                        </>
                                    )}
                                </p>

                                {/* شريط التقدّم + النسبة */}
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex-1 h-2 rounded-full bg-white/[0.07] border border-white/[0.06] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-l from-[#53FC18] via-[#FF2D2D] to-[#FF2D2D] shadow-[0_0_14px_rgba(255,45,45,0.6)]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black tracking-[0.15em] text-white/40 shrink-0" dir="ltr">{pct}%</span>
                                </div>
                            </div>
                        </div>

                        {/* ===== العمود الثاني: خريطة الـ60 يوم (ديسكتوب فقط) ===== */}
                        <div className="hidden lg:block lg:ps-8 lg:border-s lg:border-white/[0.07]">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-white/30 uppercase">
                                    {T.progress}
                                </p>
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-white/30 uppercase" dir="ltr">
                                    {day} / {CHALLENGE_TOTAL}
                                </p>
                            </div>

                            <div className="grid grid-cols-15 xl:grid-cols-20 gap-[4px] sm:gap-1.5">
                                {cells.map((n) => {
                                    const done = n < day;
                                    const today = n === day;
                                    // تدرّج: الأيام البعيدة أغمق والقريبة أفتح — يعطي إحساس بالزخم
                                    const shade = 0.3 + (n / CHALLENGE_TOTAL) * 0.7;
                                    return (
                                        <span
                                            key={n}
                                            title={`${T.dayLabel} ${n}`}
                                            className={[
                                                'relative block rounded-[4px] sm:rounded-[6px] aspect-square',
                                                done
                                                    ? 'shadow-[0_0_10px_rgba(255,45,45,0.45)]'
                                                    : today
                                                        ? 'bg-[#53FC18] shadow-[0_0_18px_rgba(83,252,24,0.9)]'
                                                        : 'bg-white/[0.06] border border-white/[0.05]',
                                            ].join(' ')}
                                            style={done ? { background: `linear-gradient(to bottom, rgba(255,90,90,${shade}), rgba(255,45,45,${shade * 0.62}))` } : undefined}
                                        >
                                            {today && (
                                                <>
                                                    <span className="absolute -inset-[3px] rounded-[6px] border border-[#53FC18]/60 animate-pulse" />
                                                    <span className="absolute -inset-1 rounded-[7px] bg-[#53FC18]/20 blur-md" />
                                                </>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ===== شريط ملخّص الجوال: بدون مربعات ===== */}
                    <div className="lg:hidden relative mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between gap-3 text-[10px] font-bold">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#53FC18] shadow-[0_0_10px_#53FC18]" />
                            <span className="text-[11px] font-black text-white/60" dir="ltr">{day} / {CHALLENGE_TOTAL}</span>
                        </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-white/40">
                                    <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-b from-[#ff5a5a] to-[#c01414]" />
                                    {lang === 'en' ? 'done' : 'مكتمل'}
                                </span>
                                <span className="flex items-center gap-1.5 text-white/40">
                                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#53FC18] shadow-[0_0_8px_#53FC18]" />
                                    {lang === 'en' ? 'today' : 'اليوم'}
                                </span>
                                <span className="flex items-center gap-1.5 text-white/40">
                                    <span className="w-2.5 h-2.5 rounded-[3px] bg-white/[0.06] border border-white/10" />
                                    {lang === 'en' ? 'later' : 'القادم'}
                                </span>
                            </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ============================================================
   2) شارة مضغوطة داخل الهيدر — تبقى ظاهرة أثناء التمرير
   ============================================================ */
export const Challenge60Mini: React.FC<{ lang: 'en' | 'ar' }> = ({ lang }) => {
    const day = useChallengeDay();
    const pct = Math.round((day / CHALLENGE_TOTAL) * 100);

    return (
        <a
            href="#challenge60"
            title={lang === 'en' ? `60-day challenge — day ${day} of 60` : `تحدي الـ60 يوم — اليوم ${day} من 60`}
            className="hidden md:inline-flex items-center gap-2 h-11 ps-2 pe-3 rounded-xl bg-white/[0.06] border border-[#FF2D2D]/30 hover:border-[#FF2D2D]/60 transition-colors group"
        >
            <span className="relative w-7 h-7 shrink-0">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90" aria-hidden="true">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                    <circle
                        cx="16" cy="16" r="13" fill="none"
                        stroke="#FF2D2D" strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={`${(pct / 100) * 2 * Math.PI * 13} ${2 * Math.PI * 13}`}
                        className="d60-ring"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white" dir="ltr">{day}</span>
            </span>
            <span className="leading-none text-start">
                <span className="block text-[9px] font-black tracking-[0.18em] text-white/35 uppercase">
                    {lang === 'en' ? 'DAY' : 'يوم'}
                </span>
                <span className="block text-[11px] font-black text-white/80" dir="ltr">{day} / 60</span>
            </span>
        </a>
    );
};

export default Challenge60;
