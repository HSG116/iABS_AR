import React from 'react';

/* ============================================================
   أرشيف جدار الـ60 — أسود وأبيض مع لمسات أحمر الموقع
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
        mapNote: 'Every square is a day we lived together — all sixty, kept forever.',
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
        mapNote: 'كل مربع يوم عشناه مع بعض — الستون كلها، محفوظة للأبد.',
    },
} as const;

const LockIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="3" />
        <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

const Archive60: React.FC<{ lang: 'en' | 'ar' }> = ({ lang }) => {
    const T = COPY[lang];
    const cells = Array.from({ length: 60 }, (_, i) => i + 1);

    return (
        <section id="archive60" className="scroll-mt-28" aria-label={T.eyebrow}>
            <div
                className="relative overflow-hidden rounded-[30px] md:rounded-[36px] p-px bg-gradient-to-br from-white/25 via-white/10 via-55% to-[#FF2D2D]/45"
                style={{ boxShadow: '0 26px 70px -34px rgba(0,0,0,0.95)' }}
            >
                <div className="absolute -top-px inset-x-16 h-px bg-gradient-to-l from-transparent via-white/60 to-transparent pointer-events-none z-10" />
                <div className="relative overflow-hidden rounded-[29px] md:rounded-[35px] bg-[#0a0a0a] px-5 py-7 sm:px-8 sm:py-9">
                    {/* إضاءة بيضاء خافتة + لمسة حمراء صغيرة بالزاوية */}
                    <div className="absolute -top-32 -end-24 w-80 h-80 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 42%, transparent 70%)' }} />
                    <div className="absolute -bottom-36 -start-28 w-72 h-72 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(255,45,45,0.09) 0%, rgba(255,45,45,0.03) 42%, transparent 70%)' }} />
                    <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent" />

                    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-11">
                        {/* ===== العمود الأول: الختام + الأزرار ===== */}
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 mb-4">
                                <LockIcon className="w-3 h-3 text-[#FF2D2D]" />
                                <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-white/70 uppercase">{T.badge}</span>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="relative shrink-0 w-[108px] h-[108px] sm:w-[124px] sm:h-[124px] flex items-center justify-center">
                                    <div className="absolute inset-2 rounded-full pointer-events-none"
                                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, transparent 75%)' }} />
                                    <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" />
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="url(#a60grad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="188.5 188.5" />
                                        <defs>
                                            <linearGradient id="a60grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#FF2D2D" />
                                                <stop offset="100%" stopColor="#ff8a8a" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="relative text-center leading-none">
                                        <p className="font-gaming text-[46px] sm:text-[54px] text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.35)]" dir="ltr">60</p>
                                        <p className="text-[9px] font-black tracking-[0.24em] text-white/50 uppercase mt-1">{T.done}</p>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl md:text-[30px] font-black text-white leading-tight tracking-tight">
                                        {T.title}
                                    </h2>
                                    <div className="h-[3px] w-14 rounded-full bg-gradient-to-l from-[#FF2D2D] to-transparent mt-2.5 mb-2.5" />
                                    <p className="text-[11px] sm:text-xs font-bold text-white/50 leading-relaxed">{T.lead}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
                                {[
                                    { v: '60', l: T.days, icon: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /> },
                                    { v: '4', l: T.marks, icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /> },
                                    { v: '∞', l: T.forever, icon: <path d="M18.2 8.2a4 4 0 010 7.6c-2.2.8-3.6-1-6.2-3.8-2.6-2.8-4-4.6-6.2-3.8a4 4 0 000 7.6c2.2.8 3.6-1 6.2-3.8 2.6-2.8 4-4.6 6.2-3.8z" /> },
                                ].map((s, i) => (
                                    <div key={i} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3.5 text-center overflow-hidden transition-all duration-300 hover:border-white/30 hover:bg-white/[0.06] hover:-translate-y-0.5">
                                        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent" />
                                        <svg className="w-3.5 h-3.5 mx-auto mb-1.5 text-white/40 transition-colors group-hover:text-[#FF2D2D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{s.icon}</svg>
                                        <p className="text-lg sm:text-xl font-black text-white" dir="ltr">{s.v}</p>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-white/45 mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
                                <a href="60day/"
                                    className="btn-arena group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-b from-white to-white/85 text-black font-black text-[14px] shadow-[0_10px_30px_-12px_rgba(255,255,255,0.45)] transition-all duration-300 hover:shadow-[0_14px_40px_-12px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 active:scale-[0.98]">
                                    <svg className="w-[18px] h-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-4.5-4.5L6 21" /></svg>
                                    {T.wall}
                                </a>
                                <a href="60day/#messages"
                                    className="btn-arena group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white/[0.05] border border-white/15 text-white font-black text-[14px] transition-all duration-300 hover:border-[#FF2D2D]/50 hover:bg-[#FF2D2D]/[0.08] hover:-translate-y-0.5 active:scale-[0.98]">
                                    <svg className="w-[18px] h-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" /></svg>
                                    {T.msgs}
                                </a>
                            </div>
                            <p className="flex items-center gap-1.5 text-[10px] font-bold text-white/35 mt-3.5">
                                <LockIcon className="w-3 h-3 shrink-0" />
                                {T.lock}
                            </p>
                        </div>

                        {/* ===== العمود الثاني: المحطات + خريطة الـ60 ===== */}
                        <div className="lg:ps-9 lg:border-s lg:border-white/[0.07]">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-3.5 h-3.5 text-white/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /></svg>
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-white/40 uppercase">{T.marksTitle}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                {MILESTONES.map((m) => {
                                    const finale = m.day === 60;
                                    return (
                                        <div key={m.day}
                                            className={`group relative rounded-2xl border px-3.5 py-3 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${finale
                                                ? 'border-[#FF2D2D]/45 bg-gradient-to-br from-[#FF2D2D]/[0.10] to-transparent hover:border-[#FF2D2D]/70 shadow-[0_0_24px_-12px_rgba(255,45,45,0.8)]'
                                                : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`font-gaming text-[22px] leading-none ${finale ? 'text-[#FF2D2D] drop-shadow-[0_0_12px_rgba(255,45,45,0.55)]' : 'text-white'}`} dir="ltr">{m.day}</span>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-black ${finale ? 'bg-[#FF2D2D]/12 border-[#FF2D2D]/35 text-[#ff8a8a]' : 'bg-white/[0.05] border-white/15 text-white/60'}`}>
                                                    <CheckIcon className={`w-2.5 h-2.5 ${finale ? '' : 'text-[#FF2D2D]'}`} />
                                                    {T.delivered}
                                                </span>
                                            </div>
                                            <p className="text-[10px] sm:text-[10.5px] font-bold text-white/55 mt-1.5 leading-snug">{lang === 'en' ? m.en : m.ar}</p>
                                            {finale && <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-l from-transparent via-[#FF2D2D]/70 to-transparent" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between mt-6 mb-2.5">
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-white/40 uppercase">{T.mapTitle}</p>
                                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-white/60 uppercase" dir="ltr">60 / 60 · 100%</p>
                            </div>
                            <div className="grid grid-cols-15 xl:grid-cols-20 gap-[4px] sm:gap-1.5">
                                {cells.map((n) => {
                                    const shade = 0.16 + (n / 60) * 0.74;
                                    const last = n === 60;
                                    return (
                                        <span
                                            key={n}
                                            title={`${lang === 'en' ? 'Day' : 'يوم'} ${n}`}
                                            className={`relative block rounded-[4px] sm:rounded-[6px] aspect-square transition-transform duration-200 hover:scale-125 hover:z-10 ${last ? 'ring-1 ring-white/70' : ''}`}
                                            style={last
                                                ? { background: 'linear-gradient(to bottom, #ff5a5a, #FF2D2D)', boxShadow: '0 0 14px rgba(255,45,45,0.8)' }
                                                : { background: `linear-gradient(to bottom, rgba(255,255,255,${shade}), rgba(255,255,255,${shade * 0.55}))` }}
                                        />
                                    );
                                })}
                            </div>
                            <p className="text-[9px] sm:text-[10px] font-bold text-white/30 mt-3 leading-relaxed">{T.mapNote}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Archive60;