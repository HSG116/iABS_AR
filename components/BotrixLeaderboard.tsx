import React, { useEffect, useState, useMemo, useCallback } from 'react';

interface BotrixEntry {
  level: number;
  watchtime: number;
  xp: number;
  points: number;
  name: string;
}

type SortKey = 'watchtime' | 'level' | 'xp' | 'points';

interface BotrixLeaderboardProps {
  lang: 'en' | 'ar';
}

const API_URL = 'https://botrix.live/api/public/leaderboard?platform=kick&user=iabs';

const formatWatchtime = (seconds: number) => {
  const hrs = seconds / 3600;
  return `${hrs.toFixed(1)}h`;
};

const formatNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const TABS: { key: SortKey; labelEn: string; labelAr: string; icon: string }[] = [
  { key: 'watchtime', labelEn: 'Watch Time', labelAr: 'وقت المشاهدة', icon: '⏱' },
  { key: 'level', labelEn: 'Level', labelAr: 'المستوى', icon: '⭐' },
  { key: 'xp', labelEn: 'XP', labelAr: 'نقاط الخبرة', icon: '⚡' },
  { key: 'points', labelEn: 'Points', labelAr: 'النقاط', icon: '💎' },
];

const BotrixLeaderboard: React.FC<BotrixLeaderboardProps> = ({ lang }) => {
  const [data, setData] = useState<BotrixEntry[] | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('watchtime');

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then(r => r.json())
      .then((json: BotrixEntry[]) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 50);
  }, [data, sortBy]);

  const getSortValue = useCallback((entry: BotrixEntry) => {
    switch (sortBy) {
      case 'watchtime': return formatWatchtime(entry.watchtime);
      case 'level': return `${entry.level}`;
      case 'xp': return formatNum(entry.xp);
      case 'points': return formatNum(entry.points);
    }
  }, [sortBy]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) return (
      <div className="w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FFD700] to-[#FFA500] shadow-[0_0_25px_rgba(255,215,0,0.6)] border-2 border-[#FFF8DC] text-black font-black text-sm md:text-base shrink-0 animate-bounce-subtle">
        <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>
    );
    if (rank === 2) return (
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#E8E8E8] to-[#B0B0B0] shadow-[0_0_20px_rgba(192,192,192,0.4)] border-2 border-white/60 text-black font-black text-xs md:text-sm shrink-0">
        <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>
    );
    if (rank === 3) return (
      <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-[#E6A373] to-[#8B4513] shadow-[0_0_20px_rgba(205,127,50,0.4)] border-2 border-[#FFDAB9]/50 text-white font-black text-[10px] md:text-xs shrink-0">
        <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>
    );
    return (
      <span className="w-6 md:w-7 text-center text-[10px] md:text-xs font-bold text-white/20 font-mono shrink-0">
        {rank < 10 ? `0${rank}` : rank}
      </span>
    );
  };

  return (
    <div className="w-full animate-fade-in-up">
      <div className="group relative flex flex-col rounded-[28px] md:rounded-[36px] overflow-hidden transition-all duration-700 bg-[#070707] backdrop-blur-lg border border-white/[0.06] shadow-[0_0_80px_-20px_rgba(83,252,24,0.06)] hover:border-white/[0.12] hover:shadow-[0_0_100px_-15px_rgba(83,252,24,0.1)]">

        {/* Ambient Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#53FC18] opacity-[0.03] blur-[120px] pointer-events-none rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[300px] h-[200px] bg-[#FF2D2D] opacity-[0.02] blur-[100px] pointer-events-none rounded-full"></div>

        {/* Header */}
        <div className="relative p-5 md:p-8 pb-0 z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#53FC18]/20 blur-xl rounded-2xl"></div>
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#53FC18]/15 to-black border border-[#53FC18]/20 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-[#53FC18] drop-shadow-[0_0_10px_rgba(83,252,24,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none mb-0.5">
                  {lang === 'ar' ? 'متداولين البثوث' : 'Stream Regulars'}
                </h3>
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-[#53FC18] to-emerald-500 bg-clip-text text-transparent">
                  {lang === 'ar' ? 'الأكثر تفاعلاً عبر البثوث' : 'Most active across all streams'}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-black/60 p-1 rounded-2xl border border-white/[0.04] self-start md:self-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSortBy(tab.key)}
                  className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold tracking-wide transition-all duration-300 ${
                    sortBy === tab.key
                      ? 'bg-[#53FC18] text-black shadow-[0_0_20px_rgba(83,252,24,0.25)] scale-105'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[11px] md:text-sm">{tab.icon}</span>
                  <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-4 md:p-8 pt-4 z-10">
          {!data && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 md:p-4 rounded-2xl bg-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/[0.04]"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-white/[0.04] rounded-lg"></div>
                    <div className="h-2 w-16 bg-white/[0.02] rounded-lg"></div>
                  </div>
                  <div className="w-14 h-5 bg-white/[0.04] rounded-lg"></div>
                </div>
              ))}
            </div>
          )}

          {data && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.05]">
                <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <p className="text-sm text-white/30 font-medium">{lang === 'ar' ? 'لا توجد بيانات حالياً' : 'No data available'}</p>
            </div>
          )}

          {data && data.length > 0 && (
            <>
              {/* Column Headers */}
              <div className="flex items-center justify-between px-2 md:px-3 pb-2 mb-1 border-b border-white/[0.03]">
                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-white/[0.15]">
                  {lang === 'ar' ? 'الترتيب' : 'Rank'}
                </span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-white/[0.15]">
                  {TABS.find(t => t.key === sortBy) ? (lang === 'ar' ? TABS.find(t => t.key === sortBy)!.labelAr : TABS.find(t => t.key === sortBy)!.labelEn) : ''}
                </span>
              </div>

              {/* List */}
              <div className="space-y-1 max-h-[420px] md:max-h-[500px] overflow-y-auto scrollbar-hide">
                {sorted.map((entry, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <div
                      key={entry.name}
                      className={`relative flex items-center justify-between p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 group/row ${
                        isTop3
                          ? 'bg-gradient-to-r from-white/[0.03] via-white/[0.01] to-transparent border border-white/[0.06]'
                          : 'hover:bg-white/[0.02] border border-transparent'
                      }`}
                    >
                      {/* Rank + Name */}
                      <div className="flex items-center gap-2.5 md:gap-4 min-w-0 flex-1">
                        <div className="shrink-0 flex justify-center w-7 md:w-9">
                          {renderRankBadge(idx + 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm md:text-[15px] font-bold truncate leading-tight ${
                            idx === 0 ? 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]' : 'text-white/80 group-hover/row:text-white'
                          }`}>
                            {entry.name}
                          </span>
                          <span className="text-[9px] md:text-[10px] text-white/20 font-medium mt-0.5">
                            Lv.{entry.level} · {formatWatchtime(entry.watchtime)} · {formatNum(entry.xp)} XP
                          </span>
                        </div>
                      </div>

                      {/* Value */}
                      <div className={`flex items-center gap-2 pl-3 rounded-xl px-3 py-2 border transition-all duration-300 ${
                        idx === 0
                          ? 'bg-[#53FC18]/10 border-[#53FC18]/20 shadow-[0_0_20px_rgba(83,252,24,0.1)]'
                          : 'bg-black/40 border-white/[0.04] group-hover/row:border-white/[0.08]'
                      }`}>
                        <span className={`text-xs md:text-sm font-black tracking-wide leading-none ${
                          idx === 0 ? 'text-[#53FC18] drop-shadow-[0_0_8px_rgba(83,252,24,0.3)]' : 'text-white/60'
                        }`}>
                          {getSortValue(entry)}
                        </span>
                        {idx === 0 && (
                          <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#53FC18] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#53FC18]"></span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#070707] via-[#070707]/90 to-transparent pointer-events-none z-20"></div>

        {/* Footer */}
        <div className="relative px-5 md:px-8 pb-5 md:pb-6 flex items-center justify-center gap-3 z-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"></div>
          <a
            href="https://botrix.live"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] text-white/15 hover:text-[#53FC18]/50 transition-all duration-300 hover:tracking-[0.35em]"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {lang === 'ar' ? 'مدعوم من Botrix' : 'Powered by Botrix'}
          </a>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default BotrixLeaderboard;
