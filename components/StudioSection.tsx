import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type StudioSource = 'direct' | 'tiktok' | 'x' | 'instagram' | 'youtube_shorts';
type StudioMediaType = 'image' | 'video';
type StudioSort = 'latest' | 'top_week' | 'top_month';

type StudioSubmission = {
  id: number;
  title: string;
  media_url: string;
  media_type: StudioMediaType;
  source: StudioSource;
  preview_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

type StudioLikeAgg = {
  submission_id: number;
  likes_count: number;
};

function getOrCreateDeviceId(): string {
  const key = 'iabs_device_id_v1';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = (globalThis.crypto?.randomUUID?.() || `dev_${Math.random().toString(16).slice(2)}_${Date.now()}`).slice(0, 64);
  localStorage.setItem(key, id);
  return id;
}

function weekStartISO(d = new Date()): string {
  // Week starts Saturday (common in KSA), but requirement says "كل جمعة" للتصفية الأسبوعية.
  // We'll calculate last Saturday as start-of-week and show "Top Week" for the last 7 days; that's consistent & simple.
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun ... 6 Sat
  const diffToSat = (day - 6 + 7) % 7;
  x.setDate(x.getDate() - diffToSat);
  return x.toISOString();
}

function monthStartISO(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x.toISOString();
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(url);
}

function isLikelyVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(url);
}

function normalizeYoutubeShorts(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      // shorts/<id>
      const parts = u.pathname.split('/').filter(Boolean);
      const shortsIdx = parts.indexOf('shorts');
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return `https://www.youtube.com/embed/${parts[shortsIdx + 1]}`;
      // watch?v=<id>
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeTikTok(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'tiktok.com' || host === 'vm.tiktok.com') {
      // Extract video ID from various TikTok URL formats
      const parts = u.pathname.split('/').filter(Boolean);
      const videoIdx = parts.indexOf('video');
      if (videoIdx >= 0 && parts[videoIdx + 1]) {
        const videoId = parts[videoIdx + 1];
        return `https://www.tiktok.com/embed/${videoId}`;
      }
      // Handle @username/video/ID format
      if (parts.length >= 3 && parts[1].startsWith('@')) {
        const videoId = parts[parts.length - 1];
        return `https://www.tiktok.com/embed/${videoId}`;
      }
      // Handle short format: tiktok.com/@username/videoID
      if (parts.length >= 2 && parts[0] === '' && parts[1].startsWith('@')) {
        const videoId = parts[2];
        return `https://www.tiktok.com/embed/${videoId}`;
      }
      // Handle direct video ID format
      if (parts.length >= 1 && parts[0] && !parts[0].startsWith('@')) {
        const videoId = parts[0];
        return `https://www.tiktok.com/embed/${videoId}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeInstagram(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'instagram.com' || host === 'www.instagram.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const postIdx = parts.indexOf('p');
      const reelIdx = parts.indexOf('reel');
      
      if (postIdx >= 0 && parts[postIdx + 1]) {
        const postId = parts[postIdx + 1];
        return `https://www.instagram.com/p/${postId}/embed`;
      }
      if (reelIdx >= 0 && parts[reelIdx + 1]) {
        const reelId = parts[reelIdx + 1];
        return `https://www.instagram.com/reel/${reelId}/embed`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeX(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'twitter.com' || host === 'x.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const statusIdx = parts.indexOf('status');
      if (statusIdx >= 0 && parts[statusIdx + 1]) {
        const tweetId = parts[statusIdx + 1];
        return `https://platform.x.com/embed/${tweetId}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

const VideoEmbed: React.FC<{
  url: string;
  source: StudioSource;
  title: string;
}> = ({ url, source, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getEmbedInfo = () => {
    switch (source) {
      case 'youtube_shorts':
        const ytEmbed = normalizeYoutubeShorts(url);
        return ytEmbed ? {
          embedUrl: ytEmbed,
          aspectRatio: '9 / 16',
          platform: 'YouTube',
          gradient: 'from-red-600 to-red-800'
        } : null;
      
      case 'tiktok':
        const ttEmbed = normalizeTikTok(url);
        return ttEmbed ? {
          embedUrl: ttEmbed,
          aspectRatio: '9 / 16',
          platform: 'TikTok',
          gradient: 'from-black to-gray-900'
        } : null;
      
      case 'instagram':
        const igEmbed = normalizeInstagram(url);
        return igEmbed ? {
          embedUrl: igEmbed,
          aspectRatio: '4 / 5',
          platform: 'Instagram',
          gradient: 'from-purple-600 to-pink-600'
        } : null;
      
      case 'x':
        const xEmbed = normalizeX(url);
        return xEmbed ? {
          embedUrl: xEmbed,
          aspectRatio: '16 / 9',
          platform: 'X',
          gradient: 'from-black to-gray-800'
        } : null;
      
      default:
        return {
          embedUrl: url,
          aspectRatio: '16 / 9',
          platform: 'Direct',
          gradient: 'from-blue-600 to-purple-600'
        };
    }
  };

  const embedInfo = getEmbedInfo();
  
  if (!embedInfo) {
    return (
      <div className="p-4 text-center">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 font-bold"
          dir="ltr"
        >
          فتح الفيديو (رابط خارجي)
        </a>
        <div className="text-white/40 text-xs mt-2">ملاحظة: بعض المنصات تمنع embed. الرابط سيفتح في تبويب جديد.</div>
      </div>
    );
  }

  const { embedUrl, aspectRatio, platform, gradient } = embedInfo;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Platform Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white text-[10px] font-black tracking-widest uppercase shadow-lg`}>
          {platform}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white/50 rounded-full animate-spin mx-auto mb-4 shadow-2xl"></div>
            <div className="text-white/80 text-sm font-bold">جاري تحميل الفيديو...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-20">
          <div className="text-center p-6">
            <div className="text-red-400 text-3xl mb-4">⚠️</div>
            <div className="text-white/80 text-sm font-bold mb-4">فشل تحميل الفيديو</div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              dir="ltr"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6m0 0h6m-6 6h6m-6-6v6m0 0h6m-6-6v6" />
              </svg>
              فتح في تبويب جديد
            </a>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div 
        className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl"
        style={{ aspectRatio }}
      >
        {source === 'youtube_shorts' && embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            loading="lazy"
          />
        )}
        
        {source === 'tiktok' && embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            loading="lazy"
          />
        )}
        
        {source === 'instagram' && embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            loading="lazy"
            scrolling="no"
            frameBorder="0"
          />
        )}
        
        {source === 'x' && embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            loading="lazy"
          />
        )}
        
        {source === 'direct' && isLikelyVideoUrl(url) && (
          <video
            src={url}
            controls
            playsInline
            className="w-full h-full object-contain"
            onLoadStart={() => setIsLoading(true)}
            onLoadedData={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            muted
            autoPlay={false}
          />
        )}
      </div>

      {/* Decorative Border */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} opacity-10`}></div>
        <div className="absolute inset-0 rounded-2xl border-2 border-white/10"></div>
      </div>
    </div>
  );
};

const SourceBadge: React.FC<{ source: StudioSource }> = ({ source }) => {
  const getBadgeInfo = () => {
    switch (source) {
      case 'youtube_shorts':
        return { label: 'YouTube Shorts', color: 'from-red-600 to-red-800' };
      case 'tiktok':
        return { label: 'TikTok', color: 'from-black to-gray-900' };
      case 'instagram':
        return { label: 'Instagram', color: 'from-purple-600 to-pink-600' };
      case 'x':
        return { label: 'X', color: 'from-black to-gray-800' };
      default:
        return { label: 'Direct', color: 'from-blue-600 to-purple-600' };
    }
  };

  const { label, color } = getBadgeInfo();

  return (
    <span className={`text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1 rounded-full bg-gradient-to-r ${color} text-white shadow-lg`}>
      {label}
    </span>
  );
};

const LikeButton: React.FC<{
  id: number;
  likes: number;
  liked: boolean;
  disabled?: boolean;
  onLike: () => void;
}> = ({ likes, liked, disabled, onLike }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!disabled && !liked) {
      setIsAnimating(true);
      onLike();
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <button
      disabled={disabled || liked}
      onClick={handleClick}
      className={`
        group relative inline-flex items-center gap-2 px-4 py-2 rounded-[20px] border-2 transition-all duration-300
        ${liked 
          ? 'bg-gradient-to-r from-[#FF2D2D] to-[#FF1A1A] text-white border-[#FF2D2D]/50 shadow-[0_0_20px_rgba(255,45,45,0.4)]' 
          : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,45,45,0.2)]'
        }
        ${(disabled || liked) ? 'opacity-80 cursor-not-allowed' : 'active:scale-95 shadow-[0_8px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-1'}
      `}
      title={liked ? 'تم الإعجاب' : 'إعجاب'}
    >
      {/* Cartoon heart with animation */}
      <div className={`relative ${isAnimating ? 'animate-bounce' : ''}`}>
        <span 
          className={`
            text-2xl transition-all duration-300
            ${liked ? 'text-white scale-110' : 'text-[#FF2D2D] group-hover:scale-125'}
            ${!liked && !disabled ? 'group-hover:animate-pulse' : ''}
          `}
          style={{
            filter: liked ? 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' : 'drop-shadow(0 0 6px rgba(255,45,45,0.6))'
          }}
        >
          ♥
        </span>
        {/* Sparkle effect when liked */}
        {isAnimating && (
          <>
            <span className="absolute -top-1 -right-1 text-yellow-300 text-xs animate-ping">✨</span>
            <span className="absolute -bottom-1 -left-1 text-pink-300 text-xs animate-ping" style={{ animationDelay: '0.1s' }}>✨</span>
            <span className="absolute top-0 -right-2 text-red-300 text-xs animate-ping" style={{ animationDelay: '0.2s' }}>✨</span>
          </>
        )}
      </div>
      
      <span className={`font-black text-sm transition-all duration-300 ${liked ? 'text-white' : 'text-white group-hover:text-[#FF2D2D]'}`}>
        {likes}
      </span>
      
      <span className={`
        text-[10px] font-black tracking-widest transition-all duration-300
        ${liked ? 'text-white/90' : 'text-white/60 group-hover:text-[#FF2D2D]'}
      `}>
        {liked ? 'تم' : 'لايك'}
      </span>

      {/* Glow effect */}
      {liked && (
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-r from-[#FF2D2D]/20 to-[#FF1A1A]/20 animate-pulse pointer-events-none" />
      )}
    </button>
  );
};

export const StudioSection: React.FC = () => {
  const [tab, setTab] = useState<'gallery' | 'submit'>('gallery');
  const [sort, setSort] = useState<StudioSort>('latest');
  const [items, setItems] = useState<StudioSubmission[]>([]);
  const [likesAgg, setLikesAgg] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isMobile, setIsMobile] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSource, setFormSource] = useState<StudioSource>('direct');
  const [formType, setFormType] = useState<StudioMediaType>('image');
  const [toast, setToast] = useState<string | null>(null);

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setDisplayLimit(window.innerWidth < 768 ? 10 : 30);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to new submissions
    const submissionsSubscription = supabase
      .channel('studio_submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'studio_submissions' },
        (payload) => {
          const newSubmission = payload.new as StudioSubmission;
          // Only add if status is 'approved' (RLS should handle this, but double check)
          if (newSubmission.status === 'approved') {
            setItems(prev => [newSubmission, ...prev]);
            // Fetch likes for the new item
            fetchLikesAgg([newSubmission.id]);
          }
        }
      )
      .subscribe();

    // Subscribe to new likes
    const likesSubscription = supabase
      .channel('studio_likes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'studio_likes' },
        (payload) => {
          const newLike = payload.new as any;
          const submissionId = newLike.submission_id as number;
          
          setLikesAgg(prev => {
            const next = new Map(prev);
            const currentCount = (next.get(submissionId) as number) || 0;
            next.set(submissionId, currentCount + 1);
            return next;
          });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      submissionsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, []);

  const likedKey = (id: number) => `studio_liked_${id}`;
  const hasLiked = (id: number) => localStorage.getItem(likedKey(id)) === '1';

  const fetchLikesAgg = async (ids: number[]) => {
    if (ids.length === 0) {
      setLikesAgg(new Map());
      return;
    }
    // Pull likes then aggregate client-side (simple + compatible)
    const { data, error } = await supabase
      .from('studio_likes')
      .select('submission_id, created_at')
      .in('submission_id', ids);
    if (error) return;
    const counts = new Map<number, number>();
    for (const row of (data || []) as any[]) {
      const sid = row.submission_id as number;
      const currentCount = counts.get(sid) || 0;
      counts.set(sid, currentCount + 1);
    }
    setLikesAgg(prev => {
      const next = new Map(prev);
      counts.forEach((count, id) => {
        next.set(id, count);
      });
      return next;
    });
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Base query: approved only (RLS)
      let query = supabase
        .from('studio_submissions')
        .select('id,title,media_url,media_type,source,preview_url,width,height,created_at')
        .order('created_at', { ascending: false })
        .limit(80);

      if (sort === 'top_week') {
        query = query.gte('created_at', weekStartISO(new Date()));
      } else if (sort === 'top_month') {
        query = query.gte('created_at', monthStartISO(new Date()));
      }

      const { data, error } = await query;
      if (error) {
        setToast('حدث خطأ أثناء تحميل الاستديو');
        return;
      }
      const list = (data || []) as StudioSubmission[];
      setItems(list);
      await fetchLikesAgg(list.map(x => x.id));

      // For top sorting we do client-side after likesAgg is updated below via effect
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const computedItems = useMemo(() => {
    if (sort === 'latest') return items;
    // Sort by likes desc then created_at desc
    return [...items].sort((a, b) => {
      const la = likesAgg.get(a.id) || 0;
      const lb = likesAgg.get(b.id) || 0;
      if (lb !== la) return lb - la;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, likesAgg, sort]);

  const displayedItems = computedItems.slice(0, displayLimit);
  const hasMore = computedItems.length > displayLimit;
  const loadMore = () => {
    setDisplayLimit(prev => prev + (isMobile ? 10 : 30));
  };

  const likeOne = async (id: number) => {
    if (hasLiked(id)) return;
    try {
      const { error } = await supabase.from('studio_likes').insert([
        { submission_id: id, device_id: deviceId }
      ]);
      if (error) {
        // Common cases: unique violation
        setToast('لا يمكن تسجيل إعجاب الآن (ربما أعجبت سابقاً)');
        localStorage.setItem(likedKey(id), '1'); // lock locally too
        return;
      }
      localStorage.setItem(likedKey(id), '1');
      setLikesAgg(prev => {
        const next = new Map(prev);
        const currentCount = (next.get(id) as number) || 0;
        next.set(id, currentCount + 1);
        return next;
      });
    } catch {
      setToast('حصل خطأ أثناء الإعجاب');
    }
  };

  const submit = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      setToast('اكتب الاسم والرابط');
      return;
    }
    const url = formUrl.trim();
    const title = formTitle.trim();
    let mediaType = formType;
    if (formType === 'image' && isLikelyVideoUrl(url)) mediaType = 'video';
    if (formType === 'video' && isLikelyImageUrl(url)) mediaType = 'image';

    setSubmitting(true);
    try {
      const payload: any = {
        title,
        media_url: url,
        media_type: mediaType,
        source: formSource,
        status: 'pending',
        placement: 'feed'
      };

      // For YouTube Shorts we store media_url as original, embed is computed on render.
      const { error } = await supabase.from('studio_submissions').insert([payload]);
      if (error) {
        setToast('فشل الإرسال (تحقق من الرابط)');
        return;
      }
      setToast('تم الإرسال! سيتم مراجعته قبل النشر.');
      setFormTitle('');
      setFormUrl('');
      setTab('gallery');
      
      // Show a notification about real-time updates
      setTimeout(() => {
        setToast('سيتم عرض المحتوى فور الموافقة عليه! 🔄');
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-20 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
      <div className="bg-[#0a0a0a]/70 backdrop-blur-2xl border border-white/10 rounded-[48px] p-6 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.75)] relative overflow-hidden">
        {/* Unique cartoon-ish blobs */}
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-[#FF2D2D]/16 blur-[90px] opacity-80 pointer-events-none animate-pulse-slow" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] rounded-full bg-white/6 blur-[110px] opacity-60 pointer-events-none animate-float" />
        <div className="absolute inset-0 opacity-[0.35] pointer-events-none [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,45,45,0.10),transparent_35%)]" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-black tracking-[0.45em] text-white/40 uppercase">STUDIO</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-2">استديو الصور والتصميمات</h2>
            <p className="text-white/50 mt-2 font-medium">أي شخص يقدر يضيف صورة/فيديو - النشر بعد مراجعة الإدارة. 3 فيديوهات يومياً لكل مستخدم.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTab('gallery')}
              className={`px-4 py-2 rounded-[16px] border-2 font-black transition ${tab === 'gallery' ? 'bg-white text-black border-black/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              المعرض
            </button>
            <button
              onClick={() => setTab('submit')}
              className={`px-4 py-2 rounded-[16px] border-2 font-black transition ${tab === 'submit' ? 'bg-[#FF2D2D] text-white border-black/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              إضافة مشاركة
            </button>
          </div>
        </div>

        {toast && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-white/80 font-bold flex items-center justify-between gap-3">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 transition">حسناً</button>
          </div>
        )}

        {tab === 'submit' && (
          <div className="bg-black/35 border-2 border-white/10 rounded-[34px] p-5 md:p-7 mb-8 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-white/60 text-sm font-bold mb-2">الاسم</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-white/30 outline-none rounded-[22px] p-4 text-white font-bold transition"
                  placeholder="مثال: تصميم جديد / لقطة رهيبة"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm font-bold mb-2">النوع</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as StudioMediaType)}
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-white/30 outline-none rounded-[22px] p-4 text-white font-bold transition"
                >
                  <option value="image">صورة</option>
                  <option value="video">فيديو</option>
                </select>
              </div>
              <div>
                <label className="block text-white/60 text-sm font-bold mb-2">المصدر</label>
                <select
                  value={formSource}
                  onChange={e => setFormSource(e.target.value as StudioSource)}
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-white/30 outline-none rounded-[22px] p-4 text-white font-bold transition"
                >
                  <option value="direct">رابط مباشر</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="x">X</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/60 text-sm font-bold mb-2">الرابط (صورة/فيديو)</label>
                <input
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-white/30 outline-none rounded-[22px] p-4 text-white font-mono transition"
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col md:flex-row gap-3">
              <button
                disabled={submitting}
                onClick={submit}
                className={`flex-1 bg-white text-black font-black py-4 rounded-[22px] border-2 border-black/30 shadow-[0_12px_0_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_4px_0_rgba(0,0,0,0.35)] transition ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'جاري الإرسال…' : 'إرسال للمراجعة'}
              </button>
              <button
                onClick={() => setTab('gallery')}
                className="md:w-56 bg-white/5 text-white font-black py-4 rounded-[22px] border-2 border-white/10 hover:bg-white/10 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {tab === 'gallery' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-[0.35em] text-white/40 uppercase">SORT</span>
                <span className="w-2 h-2 rounded-full bg-[#FF2D2D]" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSort('latest')} className={`px-4 py-2 rounded-[16px] border-2 font-black transition ${sort === 'latest' ? 'bg-white text-black border-black/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>الأحدث</button>
                <button onClick={() => setSort('top_week')} className={`px-4 py-2 rounded-[16px] border-2 font-black transition ${sort === 'top_week' ? 'bg-white text-black border-black/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>الأكثر هذا الأسبوع</button>
                <button onClick={() => setSort('top_month')} className={`px-4 py-2 rounded-[16px] border-2 font-black transition ${sort === 'top_month' ? 'bg-white text-black border-black/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>الأكثر هذا الشهر</button>
              </div>
            </div>

            {loading ? (
              <div className="text-white/60 font-bold py-10 text-center">جاري التحميل…</div>
            ) : computedItems.length === 0 ? (
              <div className="text-white/60 font-bold py-10 text-center">لا يوجد محتوى منشور بعد.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedItems.map((it) => {
                    const likes = likesAgg.get(it.id) || 0;
                    const liked = hasLiked(it.id);
                    const ytEmbed = it.source === 'youtube_shorts' ? normalizeYoutubeShorts(it.media_url) : null;

                    return (
                      <div
                        key={it.id}
                        className="mb-4 break-inside-avoid rounded-[24px] sm:rounded-[34px] border-2 border-white/10 bg-black/35 overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.65)] hover:border-white/20 transition duration-300 group"
                      >
                        {/* Subtle shine */}
                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>

                        <div className="relative p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white font-black truncate">{it.title}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <SourceBadge source={it.source} />
                              <span className="text-[10px] font-black tracking-widest text-white/40">{new Date(it.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <LikeButton
                            id={it.id}
                            likes={likes}
                            liked={liked}
                            onLike={() => likeOne(it.id)}
                          />
                        </div>

                        <div className="border-t border-white/10 bg-black/60">
                          {it.media_type === 'image' && (
                            <a href={it.media_url} target="_blank" rel="noreferrer">
                              <img
                                src={it.preview_url || it.media_url}
                                alt={it.title}
                                loading="lazy"
                                className="w-full h-auto object-contain"
                              />
                            </a>
                          )}

                          {it.media_type === 'video' && (
                            <div className="w-full aspect-video">
                              <VideoEmbed
                                url={it.media_url}
                                source={it.source}
                                title={it.title}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMore}
                      className="
                        group relative px-8 py-3 rounded-[24px] bg-gradient-to-r from-[#FF2D2D] to-[#FF1A1A] text-white 
                        font-black text-sm border-2 border-[#FF2D2D]/50 
                        shadow-[0_8px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-1
                        hover:shadow-[0_0_20px_rgba(255,45,45,0.4)] hover:scale-105
                        transition-all duration-300
                      "
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">+</span>
                        المزيد
                        <span className="text-xs opacity-70">({computedItems.length - displayLimit} متبقي)</span>
                      </span>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-[24px] bg-gradient-to-r from-[#FF2D2D]/20 to-[#FF1A1A]/20 animate-pulse pointer-events-none" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

