import React from 'react';

/* ============================================================
   أرشيف جدار الـ60 — قسم منفصل بلون الموقع (أحمر + أسود)
   التحدي اكتمل: كل الذكريات محفوظة، والجدار صار أرشيف دائم
   ============================================================ */

const MILESTONES = [
    { day: 33, ar: 'أول جائزة OG', en: 'First OG prize' },
    { day: 44, ar: 'جائزة OG الثانية', en: 'Second OG prize' },
    { day: 55, ar: 'جائزة OG الثالثة', en: 'Third OG prize' },
    { day: 60, ar: 'الختام — آيفون 18 برو', en: 'Finale — iPhone 18 Pro' },
];

const COPY = {
    en: {
        badge: 'ARCHIVE · 60/60',
        eyebrow: 'THE 60-DAY ARCHIVE',
        title: 'Sixty days… now a memory',
        lead: 'The challenge is complete. Every edit, every message and every OG moment is preserved here forever — a permanent archive, open for everyone to revisit.',
        done: 'Completed',
        days: 'days',
        marks: 'OG milestones',
        forever: 'kept forever',
        wall: 'Edits archive',
        msgs: 'Messages archive',
        marksTitle: 'Prize milestones',
        delivered: 'Delivered',
        mapTitle: 'The full 60 days',
        lock: 'Read-only archive — no new posts',
    },
    ar: {
        badge: 'الأرشيف · مكتمل 60/60',
        eyebrow: 'أرشيف الـ60 يوم',
        title: 'ستون يوماً… صارت ذكرى',
        lead: 'اكتمل التحدي. كل إيديت وكل رسالة وكل لحظة OG محفوظة هنا للأبد — أرشيف دائم مفتوح للجميع، يتصفّحونه وقت ما شاءوا.',
        done: 'مكتمل',
        days: 'يوم',
        marks: 'محطات OG',
        forever: 'ذكرى دائمة',
        wall: 'أرشيف الإيديتات',
        msgs: 'أرشيف الرسائل',
        marksTitle: 'محطات الجوائز',
        delivered: 'تم التسليم',
        mapTitle: 'الـ60 يوم كاملة',
        lock: 'أرشيف للقراءة فقط — لا مشاركات جديدة',
    },
} as const;

const Archive60: React.FC<{ lang: 'en' | 'ar' }> = ({ lang }) => {
    const T = COPY[lang];
    const cells = Array.from({ length: 60 }, (_, i) => i + 1);

    return (
        <section id="archive60" className="pt-4 md:pt-6 scroll-mt-28" aria-label={T.eyebrow}>
            <div
                className="relative overflow-hidden rounded-[30px] md:rounded-[34px] p-[1.5px] bg-gradient-to-br from-[#FF2D2D]/85 via-[#FF2D2D]/30 via-50% to-white/[0.08]"
                style={{ boxShadow: '0 22px 60px -28px rgba(255,45,45,0.7)' }}
            >
                <div className="absolute -top-px inset-x-16 h-px bg-gradient-to-l from-transparent via-white/70 to-transparent pointer-events-none z-10" />
                <div className="relative overflow-hidden rounded-[28.5px] md:rounded-[32.5px] bg-[#0a0a0a]/90 px-5 py-6 sm:px-7 sm:py-7">
                    <div className="absolute -top-28 -end-20 w-64 h-64 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,45,45,0.26) 0%, rgba(255,45,45,0.11) 40%, transparent 68%)' }} />
                    <div className="absolute -bottom-32 -start-24 w-60 h-60 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,45,45,0.10) 0%, rgba(255,45,45,0.04) 40%, transparent 68%)' }} />
                    <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

                    <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
                        {/* ===== العمود الأول: الختام + الأزرار ===== */}
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF2D2D]/35 bg-[#FF2D2D]/10 px-3 py-1 mb-3">
                                <svg className="w-3 h-3 text-[#FF2D2D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                                <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-[#ff8a8a] uppercase">{T.badge}</span>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="relative shrink-0 w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] flex items-center justify-center">
                                    <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="url(#a60grad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="188.5 188.5" />
                                        <defs>
                                            <linearGradient id="a60grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#FF2D2D" />
                                                <stop offset="100%" stopColor="#ff8a8a" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="relative text-center leading-none">
                                        <p className="font-gaming text-[44px] sm:text-[50px] text-white drop-shadow-[0_0_20px_rgba(255,45,45,0.6)]" dir="ltr">60</p>
                                        <p className="text-[9px] font-black tracking-[0.24em] text-[#ff8a8a] uppercase mt-0.5">{T.done}</p>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl md:text-[28px] font-black text-white leading-tight tracking-tight">{T.title}</h2>
                                    <p className="text-[11px] sm:text-xs font-bold text-white/50 mt-2 leading-relaxed">{T.lead}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
                                {[
                                    { v: '60', l: T.days },
                                    { v: '4', l: T.marks },
                                    { v: '∞', l: T.forever },
                                ].map((s, i) => (
                                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center">
                                        <p className="text-lg sm:text-xl font-black text-[#FF2D2D]" dir="ltr">{s.v}</p>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-white/45 mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                                <a href="60day/"
                                    className="btn-arena inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-b from-[#ff4d4d] to-[#FF2D2D] text-black font-black text-[14px] shadow-[0_0_30px_rgba(255,45,45,0.4)] active:scale-[0.98]">
                                    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-4.5-4.5L6 21" /></svg>
                                    {T.wall}
                                </a>
                                <a href="60day/#messages"
                                    className="btn-arena inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white/[0.06] border border-white/15 text-white font-black text-[14px] hover:border-[#FF2D2D]/50 active:scale-[0.98] transition-colors">
                                    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" /></svg>
                                    {T.msgs}
                                </a>
                            </div>
                            <p className="flex items-center gap-1.5 text-[10px] font-bold text-white/35 mt-3">
                                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                                {T.lock}
                            </p>
                        </div>

                        {/* ===== العمود الثاني: المحطات + خريطة الـ60 ===== */}
                        <div className="lg:ps-8 lg:border-s lg:border-white/[0.07]">
                            <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-white/30 uppercase mb-3">{T.marksTitle}</p>
                            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                {MILESTONES.map((m) => (
                                    <div key={m.day} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 hover:border-[#FF2D2D]/45 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-gaming text-[22px] leading-none text-white" dir="ltr">{m.day}</span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF2D2D]/12 border border-[#FF2D2D]/35 px-2 py-0.5 text-[8.5px] font-black text-[#ff8a8a]">
                                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                                {T.delivered}
                                            </span>
                                        </div>
                                        <p className="text-[10px] sm:text-[10.5px] font-bold text-white/55 mt-1.5 leading-snug">{lang === 'en' ? m.en : m.ar}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between mt-5 mb-2.5">
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-white/30 uppercase">{T.mapTitle}</p>
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-[#ff8a8a] uppercase" dir="ltr">60 / 60 · 100%</p>
                            </div>
                            <div className="grid grid-cols-15 xl:grid-cols-20 gap-[4px] sm:gap-1.5">
                                {cells.map((n) => {
                                    const shade = 0.35 + (n / 60) * 0.65;
                                    const last = n === 60;
                                    return (
                                        <span
                                            key={n}
                                            title={`${lang === 'en' ? 'Day' : 'يوم'} ${n}`}
                                            className={`relative block rounded-[4px] sm:rounded-[6px] aspect-square ${last ? 'ring-1 ring-white/70' : ''}`}
                                            style={{ background: `linear-gradient(to bottom, rgba(255,90,90,${shade}), rgba(255,45,45,${shade * 0.62}))`, boxShadow: last ? '0 0 14px rgba(255,45,45,0.8)' : '0 0 8px rgba(255,45,45,0.3)' }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Archive60;