import React, { useState, useEffect } from 'react';
import { KickIcon, XIcon, SnapchatIcon, DiscordIcon, TikTokIcon, WhatsAppIcon, InstagramIcon, YoutubeIcon, FacebookIcon, MailIcon } from './components/Icons';
import { SocialLink, Language } from './types';
import { StreamPlayer } from './components/StreamPlayer';
import { ChatWidget } from './components/Chat';
import { StatsSection } from './components/StatsSection';

// --- Constants ---
const DEFAULT_PROFILE_IMAGE = "https://files.kick.com/images/user/1106194/profile_image/conversion/140c7236-24f9-4267-b318-6be659f6035e-fullsize.webp";
import { kickFetch } from './utils/kickApi';

// Updated to iABS offline banner
const DEFAULT_BACKGROUND_IMAGE = "https://files.kick.com/images/channel/1067089/offline_banner/conversion/c37058d0-ad7a-42b0-9c80-5ab180d0e2da-fullsize.jpg";
const CHANNEL_SLUG = 'iabs';

// Helper to construct full social object
const createSocialLink = (key: string, value: string): SocialLink | null => {
    if (!value) return null;
    const handle = value.replace(/^https?:\/\/(www\.)?(twitter|x|instagram|youtube|discord|tiktok|facebook|snapchat|whatsapp)\.com\//i, '')
        .replace(/\/channel\//i, '') // Clean up whatsapp channel part if simple regex
        .replace(/^@/, '')
        .replace(/\/$/, ''); // Remove trailing slash

    switch (key) {
        case 'twitter': return { name: 'X', url: value.startsWith('http') ? value : `https://x.com/${handle}`, icon: <XIcon className="w-8 h-8" />, color: '', username: `@${handle}`, hex: '#FFFFFF' };
        case 'instagram': return { name: 'Instagram', url: value.startsWith('http') ? value : `https://instagram.com/${handle}`, icon: <InstagramIcon className="w-8 h-8" />, color: '', username: `@${handle}`, hex: '#E1306C' };
        case 'youtube': return { name: 'YouTube', url: value.startsWith('http') ? value : `https://youtube.com/@${handle}`, icon: <YoutubeIcon className="w-8 h-8" />, color: '', username: 'Channel', hex: '#FF0000' };
        case 'discord': return { name: 'Discord', url: value.startsWith('http') ? value : `https://discord.gg/${handle}`, icon: <DiscordIcon className="w-8 h-8" />, color: '', username: 'Community', hex: '#5865F2' };
        case 'tiktok': return { name: 'TikTok', url: value.startsWith('http') ? value : `https://tiktok.com/@${handle}`, icon: <TikTokIcon className="w-8 h-8" />, color: '', username: `@${handle}`, hex: '#FE2C55' };
        case 'facebook': return { name: 'Facebook', url: value.startsWith('http') ? value : `https://facebook.com/${handle}`, icon: <FacebookIcon className="w-8 h-8" />, color: '', username: 'Page', hex: '#1877F2' };
        case 'snapchat': return { name: 'Snapchat', url: value.startsWith('http') ? value : `https://snapchat.com/add/${handle}`, icon: <SnapchatIcon className="w-8 h-8" />, color: '', username: 'x2end', hex: '#FFFC00' };
        case 'whatsapp': return { name: 'WhatsApp', url: value, icon: <WhatsAppIcon className="w-8 h-8" />, color: '', username: 'Group', hex: '#25D366' };
        default: return null;
    }
};

const KICK_SOCIAL: SocialLink = { name: 'KICK', url: 'https://kick.com/iabs', icon: <KickIcon className="w-8 h-8" />, color: '', username: 'iABS', hex: '#53FC18' };

const EMAIL_ADDRESS = ""; // Removed as not specified for iABS

// Define Static Socials with specific requested order
const STATIC_SOCIALS = [
    KICK_SOCIAL,
    createSocialLink('snapchat', 'https://www.snapchat.com/@iabsq'),
    createSocialLink('instagram', 'https://www.instagram.com/absq/'),
    createSocialLink('tiktok', 'https://www.tiktok.com/@iabsq'),
    createSocialLink('twitter', 'https://x.com/iABSq'),
    createSocialLink('whatsapp', 'https://www.whatsapp.com/channel/0029VadbqYx5Ui2eInkr7v2E'),
    createSocialLink('discord', 'https://discord.com/invite/64aggJ9yRA'),
    createSocialLink('youtube', 'https://www.youtube.com/channel/UCdIM7MB-8G-FgE7ld3XAQ8w'),
].filter(Boolean) as SocialLink[];

const TRANSLATIONS = {
    en: {
        status: 'Online',
        statusOffline: 'Offline',
        headerTitle: 'iABS STREAM HUB',
        bio: 'Mohammed Al-Qahtani broadcasts here daily. Welcome! Follow the king of acceptance and perseverance for a better life.👑',
        tags: ['🎮 Gaming', '💬 Just Chatting', '🚀 Live'],
        defaultStreamTitle: 'CHECK OUT THE VODS | FOLLOW NOW',
        defaultCategory: 'Offline',
        footer: '© 2024 iABS. All Rights Reserved.',
        poweredBy: 'POWERED BY HSG',
        subOnly: 'SUB ONLY',
        dropsEnabled: 'DROPS ENABLED',
        noTags: 'No tags',
        shareTitle: 'iABS Stream Hub',
        shareText: 'Check out iABS live on Kick!',
        copied: 'Link copied!',
        contact: 'Contact & Business',
        lastSessionReport: 'LAST SESSION REPORT',
        ago: 'AGO',
        duration: 'DURATION',
        categoriesSpent: 'CATEGORIES SPENT IN STREAM'
    },
    ar: {
        status: 'متصل الآن',
        statusOffline: 'غير متصل',
        headerTitle: 'مركز iABS للبث المباشر',
        bio: '👑 محمد القحطاني نبث يوميا هنا حياك الله تابع ملك القبول والاستمرارية لحياة افضل.👑',
        tags: ['🎮 ألعاب', '💬 سوالف', '🚀 بث مباشر'],
        defaultStreamTitle: 'تابع البثوث السابقة | تابعني الآن',
        defaultCategory: 'غير متصل',
        footer: '© 2024 iABS. جميع الحقوق محفوظة.',
        poweredBy: 'بدعم من HSG',
        subOnly: 'للمشتركين فقط',
        dropsEnabled: 'الجوائز مفعلة',
        noTags: 'لا يوجد وسوم',
        shareTitle: 'مركز بث iABS',
        shareText: 'تابع بث iABS المباشر على كيك!',
        copied: 'تم نسخ الرابط!',
        contact: 'للتواصل والإعلان',
        lastSessionReport: 'تقرير الجلسة الأخيرة',
        ago: 'منذ',
        duration: 'المدة',
        categoriesSpent: 'الفئات التي تم بثها'
    }
};

// --- Last Session Report Component ---
const LastSessionReport: React.FC<{ lang: Language, data: any }> = ({ lang, data }) => {
    if (!data) return null;

    const isRTL = lang === 'ar';

    const timeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diff < 60) return lang === 'en' ? `${diff}s ago` : `منذ ${diff} ثانية`;
        if (diff < 3600) return lang === 'en' ? `${Math.floor(diff / 60)}m ago` : `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return lang === 'en' ? `${Math.floor(diff / 3600)}h ago` : `منذ ${Math.floor(diff / 3600)} ساعة`;
        return lang === 'en' ? `${Math.floor(diff / 86400)}d ago` : `منذ ${Math.floor(diff / 86400)} يوم`;
    };

    const formatDuration = (val: number) => {
        // Kick durations are usually in milliseconds
        // If it's suspiciously large (e.g. > 1000000), it's definitely ms
        const totalSeconds = val > 1000000 ? Math.floor(val / 1000) : val;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const t = TRANSLATIONS[lang] as any;

    return (
        <div className="w-full max-w-5xl mx-auto mt-24 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#e72a18]/10 blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10">
                    <div className={`flex items-center gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#e72a18] shadow-[0_0_15px_#e72a18] animate-pulse"></div>
                        <span className="text-[11px] font-black tracking-[0.4em] text-white/40 uppercase">{t.lastSessionReport}</span>
                    </div>

                    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-10 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                        <h2 className={`text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight max-w-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
                            {data.session_title || data.title}
                        </h2>

                        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="bg-white/5 border border-white/10 rounded-3xl px-8 py-5 min-w-[140px] text-center backdrop-blur-md">
                                <p className="text-[10px] font-bold text-white/30 uppercase mb-2 tracking-widest">{t.ago}</p>
                                <p className="text-2xl font-black text-white">{timeAgo(data.created_at)}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-3xl px-8 py-5 min-w-[140px] text-center backdrop-blur-md">
                                <p className="text-[10px] font-bold text-white/30 uppercase mb-2 tracking-widest">{t.duration}</p>
                                <p className="text-2xl font-black text-kick">{formatDuration(data.duration)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16">
                        <div className={`flex items-center gap-5 mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 rounded-2xl bg-[#e72a18]/10 border border-[#e72a18]/20 flex items-center justify-center shadow-[0_0_20px_rgba(231,42,24,0.1)]">
                                <svg className="w-6 h-6 text-[#e72a18]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                            <h3 className={`text-2xl font-black text-white uppercase tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>{t.categoriesSpent}</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {data.categories?.map((cat: any, i: number) => (
                                <div key={i} className="group/cat relative aspect-[3/4] rounded-[24px] overflow-hidden border border-white/5 hover:border-[#e72a18]/40 transition-all duration-700 hover:-translate-y-2 shadow-xl">
                                    <img
                                        src={cat.responsive_url || (cat.thumbnail ? cat.thumbnail.url : `https://picsum.photos/seed/${cat.name}/400/600`)}
                                        alt={cat.name}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/cat:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <p className={`text-sm font-black text-white uppercase tracking-tighter line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>{cat.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Custom ABN Icon ---
const AbnIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M22 2H2v20l20-20z" />
    </svg>
);

const SocialCard: React.FC<{ social: SocialLink, index: number, className?: string }> = ({ social, index, className = '' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const brandColor = social.hex || '#ffffff';

    // Determine text color based on background brightness (for Snapchat/Kick primarily)
    const isBrightBrand = social.name === 'Snapchat' || social.name === 'KICK';

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isRedirecting) return;

        setIsRedirecting(true);

        // Simulate "Charging" or "Launch" time (2 seconds)
        setTimeout(() => {
            window.open(social.url, '_blank');
            // Reset after a short delay so if they come back the button is normal
            setTimeout(() => setIsRedirecting(false), 1000);
        }, 2000);
    };

    // Adjusted mobile height to h-32 (was h-40) for better proportion and less empty space
    const containerClass = className.includes('h-') ? className : `h-32 md:h-32 ${className}`;

    return (
        <a
            href={social.url}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`group relative w-full animate-fade-in-up select-none ${isRedirecting ? 'z-50' : 'z-auto'} ${containerClass}`}
        >
            {/* === ACTIVE LAUNCH EFFECT (FULL SCREEN BLOOM) === */}
            {isRedirecting && (
                <div className="absolute inset-0 z-50 rounded-2xl animate-pulse" style={{ boxShadow: `0 0 50px ${brandColor}, inset 0 0 30px ${brandColor}` }}></div>
            )}

            {/* === SHADOW/GLOW BACKDROP === */}
            <div
                className={`absolute inset-0 rounded-2xl transition-all duration-500 blur-xl ${isRedirecting ? 'opacity-80 scale-105' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ backgroundColor: brandColor }}
            ></div>

            {/* === PERIODIC SHINE ANIMATION LAYER === */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-20">
                {/* Wide sheen for unified wave effect */}
                <div
                    className="absolute top-[-100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-br from-transparent via-white/10 to-transparent animate-shine-periodic"
                    style={{ animationDelay: `${index * 0.08}s` }}
                ></div>
            </div>

            {/* === MAIN CARD CONTAINER === */}
            <div
                className={`
                relative h-full w-full rounded-2xl bg-[#080808] border overflow-hidden transition-all duration-300
                flex flex-col justify-center
                ${isRedirecting ? 'glitch-active border-transparent' : 'border-white/10 group-hover:-translate-y-2'}
            `}
                style={{
                    borderColor: isRedirecting ? brandColor : (isHovered ? brandColor : 'rgba(255,255,255,0.1)'),
                }}
            >
                {/* === PROGRESS BAR (LAUNCHING) === */}
                {isRedirecting && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-white z-40 animate-charge" style={{ backgroundColor: brandColor, boxShadow: `0 0 10px ${brandColor}` }}></div>
                )}

                {/* === ANIMATED BACKGROUND GRADIENT === */}
                <div
                    className={`absolute inset-0 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent bg-size-200 animate-gradient-x pointer-events-none ${isHovered || isRedirecting ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        backgroundImage: `linear-gradient(45deg, ${brandColor}10, transparent, ${brandColor}20)`
                    }}
                ></div>

                {/* === HOVER SHINE EFFECT === */}
                <div className={`absolute inset-0 -translate-x-full ${isHovered && !isRedirecting ? 'translate-x-full' : ''} transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12`}></div>

                {/* === CONTENT === */}
                {/* IMPORTANT: Added justify-center to parent and inner flex to ensure vertical centering on mobile */}
                <div className="relative h-full flex flex-col md:flex-row items-center px-4 md:px-6 justify-center md:justify-between z-10 gap-2 md:gap-0">

                    {/* LEFT: ICON + TEXT */}
                    {/* Removed flex-1 on mobile or ensured justify-center to prevent top alignment */}
                    <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 md:gap-5 min-w-0 w-full md:w-auto md:flex-1">
                        {/* Icon Container with 3D Rotate */}
                        <div
                            className={`
                            relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-2xl bg-[#151515] border shadow-2xl transition-all duration-500 shrink-0
                            ${isRedirecting ? 'rotate-12 scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}
                        `}
                            style={{
                                color: (isHovered || isRedirecting) && isBrightBrand ? '#000' : brandColor,
                                backgroundColor: (isHovered || isRedirecting) && isBrightBrand ? brandColor : undefined,
                                borderColor: (isHovered || isRedirecting) ? brandColor : 'rgba(255,255,255,0.1)',
                                boxShadow: (isHovered || isRedirecting) ? `0 0 20px ${brandColor}40` : 'none'
                            }}
                        >
                            {social.icon}
                        </div>

                        {/* Text Details */}
                        <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left min-w-0">
                            <span
                                className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300"
                                style={{ color: isRedirecting ? brandColor : (isHovered ? brandColor : 'rgba(255,255,255,0.4)') }}
                            >
                                {isRedirecting ? 'LAUNCHING...' : social.name}
                            </span>
                            <span className={`text-sm md:text-xl font-black tracking-tighter transition-all duration-300 truncate max-w-[200px] md:max-w-none ${isRedirecting ? 'text-white scale-105' : 'text-white group-hover:text-white'}`}>
                                {social.username}
                            </span>
                            {/* Subtitle for Email/Contact */}
                            {social.subtitle && (
                                <span className="hidden md:block text-[9px] md:text-[10px] text-white/60 font-medium leading-tight max-w-[200px] mt-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/5 shadow-sm">
                                    {social.subtitle}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: ACTION ARROW (Hidden on mobile for cleaner 2-col look) */}
                    <div
                        className={`
                        hidden md:flex w-12 h-12 rounded-full items-center justify-center border transition-all duration-300 shrink-0 ml-2
                        ${isRedirecting ? 'opacity-100 scale-110 bg-white text-black' : 'opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 bg-white/5'}
                    `}
                        style={{
                            borderColor: isRedirecting ? 'white' : (isHovered ? brandColor : 'rgba(255,255,255,0.1)'),
                            backgroundColor: isRedirecting ? brandColor : undefined,
                            color: isRedirecting ? (isBrightBrand ? 'black' : 'white') : (isHovered && isBrightBrand ? brandColor : 'white')
                        }}
                    >
                        {isRedirecting ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        )}
                    </div>
                </div>

                {/* Mobile-only subtitle (rendered outside main flex flow if needed, but here simple flow works) */}
                {social.subtitle && (
                    <div className="md:hidden absolute bottom-2 left-0 right-0 flex justify-center">
                        <span className="text-[8px] text-white/60 font-medium leading-tight bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 max-w-[90%] text-center truncate">
                            {social.subtitle}
                        </span>
                    </div>
                )}
            </div>
        </a>
    );
};

// --- Multi-Provider Support Card Component ---
const PaymentCard: React.FC<{
    lang: Language,
    title: string,
    url: string,
    color: string,
    labelEn: string,
    labelAr: string,
    iconImg?: string,
    icon?: React.ReactNode, // Added to support custom SVG components
    className?: string
}> = ({ lang, title, url, color, labelEn, labelAr, iconImg, icon, className = '' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isRedirecting) return;

        setIsRedirecting(true);
        // 2 seconds delay before redirect
        setTimeout(() => {
            window.open(url, '_blank');
            setTimeout(() => setIsRedirecting(false), 1000);
        }, 2000);
    };

    const label = lang === 'en' ? labelEn : labelAr;
    const opening = lang === 'en' ? 'OPENING...' : 'جاري الفتح...';

    return (
        <a
            href={url}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
        group relative block w-full select-none overflow-hidden rounded-[24px] transition-all duration-300 transform border border-white/5
        ${isRedirecting ? 'scale-[1.02] z-50' : 'hover:-translate-y-2 hover:shadow-2xl'}
        ${className}
      `}
            style={{
                boxShadow: isHovered && !isRedirecting ? `0 20px 40px -15px ${color}30` : ''
            }}
        >
            {/* === BACKGROUND GLOW === */}
            <div
                className="absolute inset-0 opacity-20 transition-opacity duration-500"
                style={{
                    background: `linear-gradient(135deg, ${color} 0%, transparent 100%)`,
                    opacity: isHovered ? 0.4 : 0.1
                }}
            ></div>

            {/* === LUXURY OVERLAYS === */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

            {/* === CONTENT === */}
            <div className="relative z-10 p-4 md:p-6 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex items-center justify-between">
                    <div className={`p-2.5 md:p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${isRedirecting ? 'animate-spin' : ''}`}>
                        {icon ? (
                            icon
                        ) : iconImg ? (
                            <img src={iconImg} alt={title} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
                        ) : (
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    <div
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isHovered ? 'bg-white text-black border-white' : 'border-white/20 text-white/50'}`}
                    >
                        <svg className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>

                <div className="mt-2 md:mt-4">
                    <p className={`text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase mb-1 opacity-70`} style={{ color: color }}>
                        {isRedirecting ? opening : label}
                    </p>
                    <h3 className={`text-xl md:text-2xl font-black text-white tracking-tight ${lang === 'ar' ? 'font-arabic' : ''}`}>
                        {title}
                    </h3>
                </div>
            </div>
        </a>
    );
};

// --- Support Links Section ---
const SupportLinks: React.FC<{ lang: Language }> = ({ lang }) => {
    return (
        <div className="w-full max-w-5xl mx-auto mt-32 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-4 mb-6 px-2 opacity-80">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                <span className={`text-xs font-bold uppercase tracking-[0.3em] text-white/60 ${lang === 'ar' ? 'font-arabic' : ''}`}>{lang === 'en' ? 'SUPPORT & DONATION' : 'الدعم المادي'}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
            </div>

            {/* Layout: PayPal & Dokan Side-by-Side */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
                <PaymentCard
                    lang={lang}
                    title="PAYPAL"
                    url="https://streamlabs.com/iabs/tip"
                    color="#3B82F6" // Blue
                    labelEn="STREAMLABS"
                    labelAr="ستريم لابس"
                    className="h-32 md:h-40"
                />
                <PaymentCard
                    lang={lang}
                    title="DOKAN"
                    url="https://tip.dokan.sa/abs"
                    color="#FDE047" // Yellow
                    labelEn="SEND TIP"
                    labelAr="دعم دكان"
                    iconImg="https://i.postimg.cc/Y0pfrW58/dokan-logo-white.png"
                    className="h-32 md:h-40"
                />
            </div>

            <div className="mt-6 flex justify-center">
                <p className={`text-[9px] uppercase tracking-[0.2em] text-white/30 text-center ${lang === 'ar' ? 'font-arabic' : ''}`}>
                    {lang === 'en' ? 'Donations are non-refundable' : 'التبرعات غير قابلة للاسترداد'}
                </p>
            </div>
        </div>
    );
}

export default function App() {
    const [isHoveringProfile, setIsHoveringProfile] = useState(false);
    const [lang, setLang] = useState<Language>('en');

    const [branding] = useState({
        profileImage: DEFAULT_PROFILE_IMAGE,
        bannerImage: DEFAULT_BACKGROUND_IMAGE
    });

    const [socials] = useState<SocialLink[]>(STATIC_SOCIALS);
    const [lastSession, setLastSession] = useState<any>(null);

    const [streamInfo, setStreamInfo] = useState({
        isLive: false,
        viewers: 0,
        title: '',
        category: '',
        tags: [] as string[]
    });

    const t = TRANSLATIONS[lang];
    const isRTL = lang === 'ar';

    const fetchKickStatus = React.useCallback(async () => {
        // Use V1 API for status - much more reliable for followers and basic info
        const rawData = await kickFetch(`https://kick.com/api/v1/channels/${CHANNEL_SLUG}`);
        const data = rawData?.data || rawData;

        if (data) {
            // In V1, livestream data is often top-level
            const livestreamData = data.livestream || (data.data ? data.data.livestream : null);
            const isLive = livestreamData && (livestreamData.is_live === true || livestreamData.is_live === 1);

            // Extract last session
            const streams = data.previous_livestreams || (data.data ? data.data.previous_livestreams : []);
            if (streams && streams.length > 0) {
                setLastSession(streams[0]);
            }

            if (isLive) {
                // Extract Tag & Category with multiple fallbacks
                const category = livestreamData.categories?.[0]?.name ||
                    livestreamData.category?.name ||
                    livestreamData.category ||
                    'Just Chatting';

                const tags = livestreamData.tags || [];
                const normalizedTags = Array.isArray(tags)
                    ? tags.map((t: any) => typeof t === 'string' ? t : (t.name || ''))
                    : [];

                setStreamInfo({
                    isLive: true,
                    viewers: livestreamData.viewer_count || livestreamData.viewers || 0,
                    title: livestreamData.session_title || livestreamData.title || 'Live Stream',
                    category: category,
                    tags: normalizedTags.filter(Boolean)
                });
            }
            else {
                setStreamInfo({
                    isLive: false,
                    viewers: 0,
                    title: '',
                    category: '',
                    tags: []
                });
            }
        }
    }, []);

    useEffect(() => {
        fetchKickStatus();
        const interval = setInterval(fetchKickStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [fetchKickStatus]);

    const handleShare = async () => {
        const shareUrl = "https://kick.com/iabs";
        if (navigator.share) {
            try {
                await navigator.share({ title: t.shareTitle, text: t.shareText, url: shareUrl });
            } catch (err) { console.error('Share failed:', err); }
        } else {
            // Assuming setChannelInfo was a placeholder or mistake, reverting to original clipboard logic
            // as setChannelInfo is not declared and would cause a syntax error.
            navigator.clipboard.writeText(shareUrl);
            alert(t.copied);
        }
    };

    const displayTitle = streamInfo.isLive ? streamInfo.title : t.defaultStreamTitle;
    const displayCategory = streamInfo.isLive ? streamInfo.category : t.defaultCategory;

    // Split socials: 
    // 1. General: Kick, Snap, Insta, TikTok, Twitter, WhatsApp (Replaces Email)
    // 2. Community: Discord, YouTube (To be side-by-side)
    const generalSocials = socials.filter(s => !['Discord', 'YouTube'].includes(s.name));
    const communitySocials = socials.filter(s => ['Discord', 'YouTube'].includes(s.name));

    return (
        <div className={`relative min-h-screen w-full selection:bg-[#e72a18] selection:text-black overflow-x-hidden ${isRTL ? 'font-arabic' : 'font-sans'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="fixed inset-0 z-0 bg-[#050505]">
                <div
                    className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-1000 ease-in-out scale-105"
                    style={{
                        backgroundImage: `url(${branding.bannerImage})`,
                        backgroundPosition: 'center 20%', // Adjusted focus for banner
                        filter: 'blur(3px)'
                    }}
                />
                <div className="absolute inset-0 bg-black/70"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full max-w-[1800px] mx-auto p-4 md:p-6 min-h-screen flex flex-col perspective-1000">
                <header className="flex justify-between items-center mb-8 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-full border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-b-4 border-black/60">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_#e72a18] ${streamInfo.isLive ? 'bg-[#e72a18] animate-pulse' : 'bg-gray-500'}`}></div>
                            {streamInfo.isLive && <div className="absolute inset-0 bg-[#e72a18] rounded-full animate-ping opacity-50"></div>}
                        </div>
                        <span className={`font-bold tracking-widest text-xs uppercase ${streamInfo.isLive ? 'text-white text-shadow-glow' : 'text-white/40'}`}>{streamInfo.isLive ? t.status : t.statusOffline}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-white/30 text-[10px] font-mono tracking-[0.2em] uppercase drop-shadow-md">{t.headerTitle}</div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => fetchKickStatus()}
                                className="p-2 rounded-full bg-[#1a1a1a] hover:bg-[#252525] border-t border-l border-white/10 border-b-4 border-black/80 text-white/40 hover:text-kick transition-all hover:-translate-y-1 active:translate-y-0.5 active:border-b-0 shadow-lg"
                                title="Refresh Data"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <button onClick={() => setLang(prev => prev === 'en' ? 'ar' : 'en')} className="px-5 py-2 rounded-full bg-[#1a1a1a] hover:bg-[#252525] border-t border-l border-white/10 border-b-4 border-black/80 text-xs font-bold text-white transition-all hover:-translate-y-1 active:translate-y-0.5 active:border-b-0 shadow-lg flex items-center gap-2">
                                <span>{lang === 'en' ? '🇺🇸 EN' : '🇸🇦 AR'}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col items-center gap-12 w-full transition-all duration-700">
                    <div className="w-full max-w-5xl flex flex-col justify-center space-y-4 py-4">
                        {/* 
              PROFILE HEADER SECTION
              Alignment logic fixed using explicit conditionals instead of unsupported ltr:/rtl: variants.
            */}
                        <div className={`flex flex-col md:flex-row items-center md:items-start text-center ${isRTL ? 'md:text-right' : 'md:text-left'} gap-8 lg:gap-12 mb-8`}>
                            <div className="relative group cursor-pointer shrink-0 z-20 mx-auto md:mx-0 -mt-2" onMouseEnter={() => setIsHoveringProfile(true)} onMouseLeave={() => setIsHoveringProfile(false)}>
                                {/* Outer Rotating Rings */}
                                <div className="profile-3d-ring"></div>
                                <div className="profile-3d-ring-inner"></div>
                                <div className="profile-3d-ring scale-125 opacity-20 animation-delay-1000" style={{ animationDirection: 'reverse', animationDuration: '6s' }}></div>

                                {/* HUD Tech Corners */}
                                <div className="tech-corner tech-corner-tl group-hover:scale-125 transition-transform duration-500"></div>
                                <div className="tech-corner tech-corner-tr group-hover:scale-125 transition-transform duration-500"></div>
                                <div className="tech-corner tech-corner-bl group-hover:scale-125 transition-transform duration-500"></div>
                                <div className="tech-corner tech-corner-br group-hover:scale-125 transition-transform duration-500"></div>

                                {/* Main Image Container */}
                                <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(231,42,24,0.15)] z-10 bg-black transition-all group-hover:border-[#e72a18]/30">
                                    {/* Scanner Effect */}
                                    <div className="profile-scanner"></div>

                                    {/* Profile Image */}
                                    <img
                                        src={branding.profileImage}
                                        alt="iABS"
                                        className={`w-full h-full object-cover transition-transform duration-1000 ${isHoveringProfile ? 'scale-110 rotate-2' : 'scale-100'}`}
                                    />

                                    {/* Inner Shadow Overlay */}
                                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                                </div>

                                {/* Kick Badge with Orbiting Ring */}
                                <div className="absolute -bottom-1 -right-1 z-30">
                                    <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-[#e72a18] rounded-full blur-md opacity-40 animate-pulse"></div>
                                        <div className="absolute inset-[-4px] border border-[#e72a18]/30 rounded-full animate-spin-slow"></div>
                                        <div className="relative w-full h-full bg-black rounded-full p-2 border border-[#e72a18]/50 shadow-[0_0_20px_#e72a18] flex items-center justify-center">
                                            <KickIcon className="w-5 h-5 md:w-6 md:h-6 text-kick" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-2 relative z-10 flex-1 min-w-0">
                                <h1 className="relative text-7xl md:text-9xl font-heading font-black tracking-tighter leading-none select-none group/name" dir="ltr">
                                    {/* Combined Cracked Text Container */}
                                    <div className="relative inline-block hover:scale-110 transition-transform duration-700 cursor-default">

                                        {/* Background Aura Glow - Multi-layered */}
                                        <div className="absolute inset-[-20%] bg-[#e72a18]/10 blur-[100px] rounded-full opacity-0 group-hover/name:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="absolute inset-[-10%] bg-white/5 blur-[60px] rounded-full opacity-0 group-hover/name:opacity-100 transition-opacity duration-700 animate-pulse"></div>

                                        {/* Layer 2: Top Half (Split Upwards) */}
                                        <div className="relative z-10 -translate-y-1 -translate-x-1 group-hover/name:animate-glitch group-hover/name:-translate-y-4 group-hover/name:-translate-x-2 transition-transform duration-500"
                                            style={{ clipPath: 'polygon(-10% -10%, 110% -10%, 110% 35%, 90% 48%, 82% 52%, 75% 38%, 68% 32%, 60% 42%, 52% 38%, 45% 45%, 38% 42%, 30% 58%, 22% 55%, 15% 62%, 10% 60%, -10% 65%)' }}>

                                            {/* Text Depth/Shadow */}
                                            <span className="absolute inset-0 translate-x-1 translate-y-1 text-black/80 select-none pointer-events-none">iABS</span>

                                            {/* Main Text with Heavy Stroke */}
                                            <span className="relative">
                                                <span style={{ color: '#e72a18', textShadow: '0 0 20px rgba(231, 42, 24, 0.4)' }} className="[-webkit-text-stroke:6px_black] [paint-order:stroke_fill]">i</span>
                                                <span className="text-white [-webkit-text-stroke:6px_black] [paint-order:stroke_fill] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">ABS</span>
                                            </span>

                                            {/* Inner Sheen Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover/name:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                        </div>

                                        {/* Layer 3: Bottom Half (Split Downwards) */}
                                        <div className="absolute inset-0 z-10 translate-y-1 translate-x-1 group-hover/name:animate-glitch [animation-delay:0.1s] group-hover/name:translate-y-4 group-hover/name:translate-x-2 transition-transform duration-500"
                                            style={{ clipPath: 'polygon(-10% 65%, 10% 60%, 15% 62%, 22% 55%, 30% 58%, 38% 42%, 45% 45%, 52% 38%, 60% 42%, 68% 32%, 75% 38%, 82% 52%, 90% 48%, 110% 35%, 110% 110%, -10% 110%)' }}>

                                            {/* Text Depth/Shadow */}
                                            <span className="absolute inset-0 translate-x-1 translate-y-1 text-black/80 select-none pointer-events-none">iABS</span>

                                            {/* Main Text with Heavy Stroke */}
                                            <span className="relative">
                                                <span style={{ color: '#e72a18', textShadow: '0 0 20px rgba(231, 42, 24, 0.4)' }} className="[-webkit-text-stroke:6px_black] [paint-order:stroke_fill]">i</span>
                                                <span className="text-white [-webkit-text-stroke:3px_black] [paint-order:stroke_fill] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">ABS</span>
                                            </span>
                                        </div>

                                        {/* Layer 4: The Crack Line (Connecting them) */}
                                        <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            <defs>
                                                <filter id="crack-glow-heavy">
                                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                                <linearGradient id="crack-gradient-v2" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#e72a18" />
                                                    <stop offset="50%" stopColor="#ff0000" />
                                                    <stop offset="100%" stopColor="#e72a18" />
                                                </linearGradient>
                                            </defs>

                                            {/* Outer Glow Path */}
                                            <path d="M0 65 L10 60 L15 62 L22 55 L30 58 L38 42 L45 45 L52 38 L60 42 L68 32 L75 38 L82 52 L90 48 L100 35"
                                                stroke="#e72a18" strokeWidth="4" fill="none" opacity="0.2" filter="url(#crack-glow-heavy)" />

                                            {/* Main Realistic Jagged Crack */}
                                            <path d="M0 65 L10 60 L15 62 L22 55 L30 58 L38 42 L45 45 L52 38 L60 42 L68 32 L75 38 L82 52 L90 48 L100 35"
                                                stroke="url(#crack-gradient-v2)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                                className="animate-pulse" filter="url(#crack-glow-heavy)" />

                                            {/* Black Crack Core - Emerging from the red 'i' */}
                                            <path d="M0 65 L8 62 L12 64 L18 58 L25 61 L32 48 L40 52 L45 45"
                                                stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                                className="animate-pulse" opacity="0.9" />
                                            <path d="M12 64 L10 70 M25 61 L28 68 M32 48 L30 40"
                                                stroke="black" strokeWidth="0.8" fill="none" opacity="0.5" />

                                            {/* Inner Energy Core - Hot White */}
                                            <path d="M0 65 L10 60 L15 62 L22 55 L30 58 L38 42 L45 45 L52 38 L60 42 L68 32 L75 38 L82 52 L90 48 L100 35"
                                                stroke="white" strokeWidth="0.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                                className="animate-pulse [animation-delay:0.2s]" />

                                            {/* Traveling Energy Bolt */}
                                            <circle r="1.5" fill="white" className="shadow-[0_0_15px_white]">
                                                <animateMotion
                                                    path="M0 65 L10 60 L15 62 L22 55 L30 58 L38 42 L45 45 L52 38 L60 42 L68 32 L75 38 L82 52 L90 48 L100 35"
                                                    dur="2s" repeatCount="indefinite" />
                                            </circle>

                                            {/* Energy Sparks - Enhanced */}
                                            <circle cx="38" cy="42" r="2" fill="#e72a18" className="animate-ping shadow-[0_0_20px_#e72a18]" />
                                            <circle cx="68" cy="32" r="1.5" fill="white" className="animate-ping [animation-delay:0.4s] shadow-[0_0_20px_white]" />
                                            <circle cx="82" cy="52" r="2" fill="#e72a18" className="animate-ping [animation-delay:0.8s]" />
                                        </svg>

                                        {/* Floating Tech Particles */}
                                        <div className="absolute inset-0 pointer-events-none overflow-visible">
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#e72a18] opacity-0 group-hover/name:opacity-100 transition-all duration-500 translate-x-4 -translate-y-4"></div>
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white opacity-0 group-hover/name:opacity-100 transition-all duration-500 -translate-x-4 translate-y-4"></div>

                                            {/* Animated Shards */}
                                            <div className="absolute top-1/4 -right-8 w-8 h-[2px] bg-gradient-to-r from-transparent to-[#e72a18] rotate-45 opacity-0 group-hover/name:opacity-100 transition-all duration-700 delay-100"></div>
                                            <div className="absolute bottom-1/4 -left-8 w-8 h-[2px] bg-gradient-to-l from-transparent to-white -rotate-45 opacity-0 group-hover/name:opacity-100 transition-all duration-700 delay-200"></div>
                                        </div>
                                    </div>
                                </h1>
                                <p className="text-xl text-white/70 font-light drop-shadow-md max-w-lg mx-auto md:mx-0">{t.bio}</p>
                                {!streamInfo.isLive && (
                                    <div className={`flex flex-wrap justify-center ${isRTL ? 'md:justify-start' : 'md:justify-start'} gap-3`}>
                                        {t.tags.map((tag, i) => <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border-b-2 border-white/10 text-xs font-bold text-white/80">{tag}</span>)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* General Grid: Kick, Snap, Insta, TikTok, Twitter, WhatsApp */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 w-full">
                            {generalSocials.map((social, index) => (
                                <SocialCard
                                    key={social.name}
                                    social={social}
                                    index={index}
                                    className=""
                                />
                            ))}
                        </div>

                        {/* Community Grid: Discord, YouTube (Side by Side) */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3 md:gap-5 w-full">
                                {communitySocials.map((social, index) => (
                                    <SocialCard
                                        key={social.name}
                                        social={social}
                                        index={index + generalSocials.length}
                                        className="" // They will naturally split 50/50
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Support Section (Dokan, PayPal, ABN) */}
                        <SupportLinks lang={lang} />

                        {/* Last Session Report Section */}
                        <LastSessionReport lang={lang} data={lastSession} />
                    </div>

                    {streamInfo.isLive && (
                        <div className="w-full animate-slide-down border-t border-white/5 pt-12">
                            <div className="flex flex-col lg:flex-row gap-6 lg:h-[700px]">
                                <div className="flex-1 flex flex-col gap-4 min-w-0 lg:h-full">
                                    <div className="w-full aspect-video lg:aspect-auto lg:flex-1 rounded-3xl overflow-hidden shadow-2xl relative bg-black">
                                        <StreamPlayer
                                            lang={lang}
                                            isLive={streamInfo.isLive}
                                            viewers={streamInfo.viewers}
                                            channelSlug={CHANNEL_SLUG}
                                            poster={branding.bannerImage}
                                        />
                                    </div>
                                    <div className="shrink-0 p-5 rounded-2xl bg-[#0e0e0e]/90 backdrop-blur-xl border border-white/10 border-b-4 border-black/50 shadow-xl flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                <h2 className={`text-xl md:text-2xl font-bold text-white truncate leading-snug ${isRTL ? 'font-arabic' : ''}`} title={displayTitle}>{displayTitle}</h2>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="font-bold text-sm tracking-wide">
                                                        <span style={{ color: '#e72a18' }}>i</span>
                                                        <span className="text-white">ABS</span>
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                                    <span className="text-white/60 text-sm">{displayCategory}</span>
                                                </div>
                                            </div>
                                            <button onClick={handleShare} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-all">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-1 rounded bg-[#e72a18]/10 border border-[#e72a18]/20 text-[#e72a18] text-[10px] font-bold uppercase tracking-wider">{t.dropsEnabled}</div>
                                            </div>
                                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                                            <div className="flex flex-wrap gap-2">
                                                {streamInfo.tags.length > 0 ? streamInfo.tags.map((tag, i) => <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-white/50 text-[10px] font-medium hover:bg-white/10 transition-colors cursor-default">#{tag}</span>) : <span className="text-white/30 text-xs italic">{t.noTags}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full lg:w-[380px] h-[500px] lg:h-full shrink-0 flex flex-col">
                                    <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl border-b-4 border-black/50">
                                        <ChatWidget lang={lang} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-20 w-full max-w-6xl mx-auto"><StatsSection lang={lang} /></div>
                <footer className="mt-24 py-10 border-t border-white/5 flex flex-col items-center justify-center gap-6">
                    {/* Email Section - Subtle */}
                    {EMAIL_ADDRESS && (
                        <a href={`mailto:${EMAIL_ADDRESS}`} className="flex items-center gap-2 opacity-40 hover:opacity-80 transition-opacity duration-300 group">
                            <MailIcon className="w-4 h-4 text-white" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white group-hover:text-kick transition-colors">
                                {t.contact}: {EMAIL_ADDRESS}
                            </span>
                        </a>
                    )}

                    <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500">
                        <div className="flex items-center gap-2"><span className="text-xs font-bold tracking-[0.3em] text-white">{t.poweredBy}</span></div>
                        <p className="text-[10px] text-white/60">{t.footer}</p>
                    </div>
                </footer>
            </div>
        </div>
    );
}