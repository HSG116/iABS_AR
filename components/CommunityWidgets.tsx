import React, { useState, useEffect } from 'react';
import { DiscordIcon, YoutubeIcon } from './Icons';
import { Language } from '../types';

interface DiscordData {
  name: string;
  instant_invite: string;
  presence_count: number;
  members: Array<{
    username: string;
    avatar_url: string;
    status: string;
    game?: {
      name: string;
    };
  }>;
  channels: Array<{
    id: string;
    name: string;
  }>;
}

interface YoutubeData {
  title: string;
  link: string;
  date: string;
  thumbnail: string;
}

interface CommunityWidgetsProps {
  lang: Language;
}

export const DiscordWidget: React.FC<CommunityWidgetsProps> = ({ lang }) => {
  const [data, setData] = useState<DiscordData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiscord = async () => {
      try {
        const response = await fetch('https://discord.com/api/guilds/882327352858783765/widget.json');
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Discord fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiscord();
    const interval = setInterval(fetchDiscord, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="aspect-square w-full bg-[#0a0b14] rounded-[48px] animate-pulse border-8 border-white/5" />
    );
  }

  const isRTL = lang === 'ar';
  const activeMembers = (data as any).members.filter((m: any) => m.game);
  const squadAvatars = data.members.slice(0, 12);

  return (
    <div className="group relative flex flex-col aspect-square w-full bg-[#0a0b14] border-[6px] md:border-[10px] border-[#5865F2]/20 rounded-[32px] md:rounded-[56px] overflow-hidden transition-all duration-700 hover:border-[#5865F2]/40 hover:shadow-[0_0_100px_rgba(88,101,242,0.15)] hover:-translate-y-2">
      {/* BACKGROUND LINK */}
      <a 
        href={data.instant_invite}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-40"
        aria-label="Join Discord"
      />

      {/* Background Ambience */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#5865F2] to-transparent animate-plasma-flow z-20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(88,101,242,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

      {/* 0. TOP BANNER - MATCHED TO YOUTUBE (28%) */}
      <div className="relative h-[28%] w-full overflow-hidden shrink-0 z-0">
          <img src="/12ab6917-943c-4013-a96f-18156e8ed881.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[5000ms]" />
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5865F2] to-transparent animate-plasma-flow z-20 top-0"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0b14] to-95%"></div>
      </div>

      {/* 2. LAYERED PROFILE LOGO - MINIFIED FOR HALF-WIDTH MOBILE */}
      <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
         <div className="relative">
            <div className="absolute -inset-10 bg-[#5865F2] blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
            <div className="relative w-10 h-10 md:w-28 md:h-28 rounded-[12px] md:rounded-[42px] p-1 md:p-1.5 bg-[#0a0b14] border-2 md:border-[3px] border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] md:shadow-[0_20px_60px_rgba(0,0,0,1)] overflow-hidden transform group-hover:rotate-[6deg] transition-all duration-700">
               <img src="/favicon.png" className="w-full h-full object-cover rounded-[8px] md:rounded-[34px]" />
            </div>
         </div>
      </div>

      <div className="relative z-10 p-2 md:p-5 flex-1 flex flex-col items-center overflow-hidden">
        
        {/* HEADER: COMPACT & MATCHED OFFSET */}
        <div className="text-center mt-4 md:mt-10 mb-1 md:mb-2 w-full">
           <h2 className="text-[10px] md:text-2xl lg:text-3xl font-black text-white tracking-widest leading-none mb-1 md:mb-2 uppercase drop-shadow-md">
              ABS COMMUNITY
           </h2>
           <div className="flex items-center justify-center gap-1 md:gap-2">
              <div className="px-1.5 py-0.5 md:px-3 md:py-1 bg-[#5865F2]/20 border border-[#5865F2]/30 rounded-md text-[5px] md:text-[10px] font-black text-white/70 uppercase tracking-[0.1em] md:tracking-[0.2em] flex items-center gap-1 md:gap-2 backdrop-blur-xl">
                 <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 ELITE
              </div>
           </div>
        </div>

        {/* REPLACEMENT: ULTRA COMPACT CENTRALIZED SQUAD & ACTIVITY */}
        <div className="flex-1 w-full flex flex-col items-center justify-center gap-1 text-center pointer-events-none px-1 md:px-2 mb-0.5 md:mb-1">
           
           {/* Squad Preview - SHRUNK FOR SPACE */}
           <div className="flex flex-col items-center gap-0.5">
              <div className="flex -space-x-1.5 md:-space-x-2">
                 {squadAvatars.slice(0, 4).map((m: any, i: number) => (
                    <img key={i} src={m.avatar_url} className="w-4 h-4 md:w-7 md:h-7 rounded-full border border-[#0a0b14] bg-white/5 shadow-lg" />
                 ))}
                 <div className="w-4 h-4 md:w-7 md:h-7 rounded-full border border-[#0a0b14] bg-[#5865F2] flex items-center justify-center text-[4px] md:text-[7px] font-black text-white shadow-lg">
                    +{data.presence_count - 4}
                 </div>
              </div>
              <p className="hidden md:block text-[7px] font-black text-white/20 tracking-[0.4em] uppercase">SQUAD ACTIVE</p>
           </div>

           {/* Current Featured Activity */}
           <div className="w-full">
              <div className="hidden md:block w-6 h-px bg-white/10 mx-auto mb-1 opacity-20"></div>
              {activeMembers.length > 0 ? (
                 <div className="flex flex-col gap-0.5 items-center">
                    <span className="text-[7px] md:text-[10px] font-black text-white/80 line-clamp-1 whitespace-nowrap overflow-hidden max-w-full">
                       {activeMembers[0].username}
                    </span>
                    <span className="text-[5px] md:text-[8px] font-bold text-[#5865F2] italic opacity-70 uppercase tracking-widest line-clamp-1">
                       {activeMembers[0].game.name}
                    </span>
                 </div>
              ) : (
                 <p className="text-[6px] md:text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">STANDBY</p>
              )}
           </div>
        </div>

        {/* FOOTER AREA: ACTION & STATS */}
        <div className="mt-auto w-full flex flex-col items-center gap-1 md:gap-1.5 pt-1 md:pt-2 border-t border-white/[0.03]">
           <div className="flex items-center gap-2 md:gap-4">
              <span className="text-[10px] md:text-lg font-black text-white italic leading-none">{data.presence_count} LIVE</span>
              <div className="w-px h-2 md:h-4 bg-white/10"></div>
              <span className="text-[6px] md:text-[9px] font-black text-[#5865F2] tracking-widest uppercase">8.6K TOTAL</span>
           </div>

           {/* ACTION BUTTON: LARGE CENTERED - NOW VISIBLE */}
           <div className="group/btn relative w-full flex justify-center pointer-events-auto z-50">
              <div className="relative w-full px-4 py-1 md:px-12 md:py-3 bg-[#5865F2] rounded-[10px] md:rounded-[24px] shadow-[0_10px_30px_rgba(88,101,242,0.3)] hover:scale-[1.03] active:scale-95 transition-all duration-500 cursor-pointer overflow-hidden flex items-center justify-center gap-1 md:gap-2">
                  <div className="absolute inset-x-0 -bottom-10 h-20 bg-white blur-[80px] opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                  <span className="text-[6px] md:text-xs font-black text-white uppercase tracking-[0.05em] md:tracking-[0.1em] leading-none">
                     {lang === 'en' ? 'DEPLOY' : 'انـتـشـر'}
                  </span>
                  <div className="w-3 h-3 md:w-6 md:h-6 rounded-full bg-white text-[#5865F2] flex items-center justify-center shrink-0">
                     <svg className={`w-1.5 h-1.5 md:w-4 md:h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export const YoutubeWidget: React.FC<CommunityWidgetsProps> = ({ lang }) => {
  const [video, setVideo] = useState<YoutubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const channelId = 'UCdIM7MB-8G-FgE7ld3XAQ8w';
  const channelUrl = 'https://www.youtube.com/@ABS11';

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const latest = data.items[0];
          setVideo({
            title: latest.title,
            link: latest.link,
            date: new Date(latest.pubDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            thumbnail: '/channels4_banner.jpg'
          });
        } else {
          throw new Error('No items');
        }
      } catch (err) {
        console.error('YouTube fetch error:', err);
        setVideo({
          title: lang === 'en' ? 'ULTRA ELITE GAMING CONTENT' : 'أقـوى مـحـتوى ألعاب - iABS',
          link: channelUrl,
          date: 'CHANNELS',
          thumbnail: '/channels4_banner.jpg'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [lang]);

  if (loading && !video) {
    return (
      <div className="aspect-square w-full bg-[#050000] rounded-[48px] animate-pulse border-8 border-white/5" />
    );
  }

  const isRTL = lang === 'ar';

  return (
    <div className="group relative flex flex-col aspect-square w-full bg-[#050000] border-[6px] md:border-[10px] border-[#FF0000]/20 rounded-[32px] md:rounded-[56px] overflow-hidden transition-all duration-700 hover:border-[#FF0000]/40 hover:shadow-[0_0_100px_rgba(255,0,0,0.15)] hover:-translate-y-2">
      {/* BACKGROUND LINK */}
      <a 
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label="Visit Channel"
      />

      {/* 1. COMPACT TOP BANNER */}
      <div className="relative h-[28%] w-full overflow-hidden shrink-0 z-0">
          <img src="/channels4_banner.jpg" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[5000ms]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#050000]"></div>
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF0000] to-transparent animate-plasma-flow z-20 top-0"></div>
      </div>

      {/* 2. LAYERED PROFILE LOGO - MINIFIED FOR HALF-WIDTH MOBILE */}
      <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
         <div className="relative">
            <div className="absolute -inset-10 bg-[#FF0000] blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
            <div className="relative w-10 h-10 md:w-28 md:h-28 rounded-[12px] md:rounded-[42px] p-1 md:p-1.5 bg-[#050000] border-2 md:border-[3px] border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden transform group-hover:rotate-[-6deg] transition-all duration-700">
               <img src="/favicon.png" className="w-full h-full object-cover rounded-[8px] md:rounded-[34px]" />
            </div>
         </div>
      </div>

      <div className="relative z-10 p-2 md:p-6 flex-1 flex flex-col items-center overflow-hidden">
        
        {/* 3. CHANNEL INFO & SPACER */}
        <div className="text-center mt-4 md:mt-10 mb-1 md:mb-2 w-full">
           <h2 className="text-[10px] md:text-3xl lg:text-4xl font-black text-white tracking-widest leading-none mb-1 md:mb-2 uppercase drop-shadow-md">
              {lang === 'en' ? 'ABS' : 'قـناة iABS'}
           </h2>
           <div className="flex items-center justify-center gap-1 md:gap-2">
              <div className="px-1.5 py-0.5 md:px-3 md:py-1 bg-white/[0.03] border border-white/5 rounded-md text-[5px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.1em] md:tracking-[0.2em] flex items-center gap-1 md:gap-2 backdrop-blur-xl">
                 <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#FF0000] animate-pulse"></span>
                 ELITE
              </div>
           </div>
        </div>

        {/* 4. CONTENT CENTER: DYNAMIC TITLES */}
        <div className="px-1 md:px-2 flex-1 flex flex-col justify-center text-center max-w-[280px] pointer-events-none">
            <div className="hidden md:block w-10 h-px bg-white/10 mx-auto mb-2 md:mb-4"></div>
            <h3 className="text-[9px] md:text-xl font-black text-white/95 leading-tight tracking-tight line-clamp-2 drop-shadow-2xl">
                {video?.title}
            </h3>
        </div>

        {/* 5. FOOTER AREA: ACTION & STATS */}
        <div className="mt-auto w-full flex flex-col items-center gap-1 md:gap-3 pt-1 md:pt-2 border-t border-white/[0.03]">
           <div className="flex items-center gap-3 md:gap-5">
              <span className="text-[10px] md:text-2xl font-black text-white italic leading-none drop-shadow-md">37.9K+</span>
              <div className="w-px h-2 md:h-5 bg-white/10"></div>
              <span className="text-[6px] md:text-sm font-black text-[#FF0000] tracking-widest uppercase">4K-HDR</span>
           </div>

            {/* ACTION BUTTON: SPECIFIC VIDEO LINK */}
            <div className="group/btn relative w-full flex justify-center pointer-events-auto z-50">
               <a 
                 href={video?.link || channelUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="relative w-full px-4 py-1 md:px-14 md:py-4 bg-[#FF0000] rounded-[10px] md:rounded-[28px] shadow-[0_10px_30px_rgba(255,0,0,0.3)] hover:scale-[1.05] active:scale-95 transition-all duration-500 cursor-pointer overflow-hidden flex items-center justify-center gap-1 md:gap-3"
               >
                  <div className="absolute inset-x-0 -bottom-10 h-20 bg-white blur-[80px] opacity-0 group-hover/btn:opacity-20 transition-opacity"></div>
                  <span className="text-[6px] md:text-sm font-black text-white uppercase tracking-[0.05em] md:tracking-[0.1em] leading-none">
                     {lang === 'en' ? 'WATCH' : 'شـاهـد الآن'}
                  </span>
                  <div className="w-3 h-3 md:w-7 md:h-7 rounded-full bg-white text-[#FF0000] flex items-center justify-center shrink-0">
                     <svg className={`w-1.5 h-1.5 md:w-4.5 md:h-4.5 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </div>
               </a>
            </div>
        </div>

      </div>
    </div>
  );
};



