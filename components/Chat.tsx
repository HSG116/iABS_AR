import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { Language, ChatMessage } from '../types';
import { kickFetch } from '../utils/kickApi';


interface ChatWidgetProps {
  lang: Language;
}

// --- Helper: Role Detection ---
const getRoleFromIdentity = (identity: any): 'owner' | 'moderator' | 'vip' | 'user' => {
  if (!identity || !identity.badges) return 'user';
  const badges = identity.badges;
  if (badges.some((b: any) => b.type === 'broadcaster')) return 'owner';
  if (badges.some((b: any) => b.type === 'moderator')) return 'moderator';
  if (badges.some((b: any) => b.type === 'vip')) return 'vip';
  return 'user';
};

// --- Icons for Badges ---
const OwnerBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#53FC18] text-black shrink-0 shadow-[0_0_10px_rgba(83,252,24,0.4)]" title="Broadcaster">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M5 19h14v2H5v-2zm7-13l3.5 7h-7L12 6zM6 17h12l-3-6H9l-3 6z" />
      <path d="M12 2L2 19h20L12 2zm0 3.5L18.5 17H5.5L12 5.5z" />
    </svg>
  </div>
);

const ModBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#00E560] text-black shrink-0 shadow-[0_0_8px_rgba(0,229,96,0.4)]" title="Moderator">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M18.828 2.343a3.001 3.001 0 00-4.243 0l-5.071 5.071-3.657-3.657a1 1 0 00-1.414 0l-1.414 1.414a1 1 0 000 1.414l3.657 3.657-5.071 5.071a1 1 0 000 1.414l2.828 2.828a1 1 0 001.414 0l5.071-5.071 3.657 3.657a1 1 0 001.414 0l1.414-1.414a1 1 0 000-1.414l-3.657-3.657 5.071-5.071a3.001 3.001 0 000-4.243zm-2.829 2.829a1 1 0 111.414-1.414 1 1 0 01-1.414 1.414z" />
    </svg>
  </div>
);

const VipBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#F542A8] text-white shrink-0 shadow-[0_0_8px_rgba(245,66,168,0.4)]" title="VIP">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M12 2L2 9l10 13 10-13-10-7z" />
    </svg>
  </div>
);

// Initial fallback message
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    username: 'System',
    message: 'Welcome to iABS Stream Hub! 💚',
    role: 'user',
    color: '#53FC18',
    timestamp: Date.now()
  }
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ lang }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const t = {
    title: lang === 'en' ? 'Live Chat' : 'شات البث',
    connecting: lang === 'en' ? 'Connecting...' : 'جارِ الاتصال...',
    connected: lang === 'en' ? 'Live' : 'متصل',
    error: lang === 'en' ? 'Connection Issue' : 'مشكلة اتصال',
    retry: lang === 'en' ? 'Retry' : 'إعادة المحاولة'
  };

  const connectToKick = async () => {
    setIsConnected(false);
    setConnectionError(false);
    let pusher: Pusher | null = null;
    let channel: any = null;

    try {
      const channelSlug = 'iabs';

      // 1. Fetch Channel Data to get Chatroom ID using robust kickFetch
      const data = await kickFetch(`https://kick.com/api/v2/channels/${channelSlug}`);

      if (!data || !data.chatroom || !data.chatroom.id) {
        throw new Error('Failed to fetch chatroom ID via all proxies');
      }

      const chatroomId = data.chatroom.id;

      // 2. Fetch Chat History (Best effort)
      try {
        // Try to get history, but don't fail connection if this fails
        const historyData = await kickFetch(`https://kick.com/api/v2/chatrooms/${chatroomId}/messages`);

        if (historyData) {
          // Safe navigation here to avoid crash
          const rawMessages = historyData?.data?.messages || [];

          const formattedHistory: ChatMessage[] = rawMessages.map((m: any) => ({
            id: m.id,
            username: m.sender.username,
            message: m.content,
            role: getRoleFromIdentity(m.sender.identity),
            color: m.sender.identity.color || '#53FC18',
            timestamp: new Date(m.created_at).getTime()
          }));

          setMessages([...INITIAL_MESSAGES, ...formattedHistory.reverse()]);
        }
      } catch (histErr) {
        console.warn("Could not fetch chat history, proceeding to live", histErr);
      }

      // 3. Initialize Pusher
      // Handle potential import issues with ESM
      const PusherClient = (Pusher as any).default || Pusher;
      pusher = new PusherClient('32cbd69e4b950bf97679', {
        cluster: 'us2',
        forceTLS: true
      });

      channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);

      // 4. Bind to new message events
      channel.bind('App\\Events\\ChatMessageEvent', (eventData: any) => {
        if (!eventData) return;

        const newMessage: ChatMessage = {
          id: eventData.id || Date.now().toString(),
          username: eventData.sender?.username || 'Unknown',
          message: eventData.content || '',
          role: getRoleFromIdentity(eventData.sender?.identity),
          color: eventData.sender?.identity?.color || '#53FC18',
          timestamp: Date.now()
        };

        setMessages(prev => {
          const newArr = [...prev, newMessage];
          if (newArr.length > 75) return newArr.slice(newArr.length - 75);
          return newArr;
        });
      });

      setIsConnected(true);

    } catch (error) {
      console.error("Failed to connect to Kick Chat:", error);
      setConnectionError(true);
      // Keep initial welcome message but indicate offline
    }

    // Cleanup function needs to access the instance
    return () => {
      if (channel && pusher) {
        channel.unbind_all();
        channel.unsubscribe();
      }
      if (pusher) {
        pusher.disconnect();
      }
    };
  };

  useEffect(() => {
    const cleanup = connectToKick();
    // The async function returns a cleanup promise, but useEffect cleanup needs to be a function.
    // We can't await inside cleanup easily, so we rely on the internal variables if we could, 
    // but here we just ignore the complex cleanup returning logic and rely on the fact that 
    // connectToKick creates local variables. 
    // Actually, connectToKick as written above returns a cleanup function, so this works:
    return () => {
      cleanup.then(c => c && c());
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isNearBottom || messages.length <= 5) {
        chatContainerRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  const getBadge = (role: string) => {
    switch (role) {
      case 'owner': return <OwnerBadge />;
      case 'moderator': return <ModBadge />;
      case 'vip': return <VipBadge />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0e0f]/80 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative ring-1 ring-white/5 isolate group">

      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-kick/5 rounded-full blur-3xl -z-10 group-hover:bg-kick/10 transition-colors duration-500"></div>

      {/* --- Header --- */}
      <div className="h-14 shrink-0 bg-white/5 border-b border-white/5 flex items-center justify-between px-5 z-20 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 border border-white/5 transition-colors ${isConnected ? 'text-kick' : connectionError ? 'text-red-500' : 'text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-white font-bold tracking-wide text-sm uppercase ${lang === 'ar' ? 'font-arabic' : ''}`}>{t.title}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-kick shadow-[0_0_8px_#53FC18]' : connectionError ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-[10px] text-white/40 font-mono uppercase">
                {isConnected ? t.connected : connectionError ? t.error : t.connecting}
              </span>
            </div>
          </div>
        </div>

        {/* Retry Button if Error */}
        {connectionError && (
          <button
            onClick={() => connectToKick()} // Retry connection without page reload
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs flex items-center gap-1"
            title={t.retry}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden md:inline">{t.retry}</span>
          </button>
        )}
      </div>

      {/* --- Chat List --- */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide bg-gradient-to-b from-[#0b0e0f]/50 to-transparent"
      >
        {/* Shadow Mask at top for fade effect */}
        <div className="sticky top-0 h-8 bg-gradient-to-b from-[#0b0e0f] to-transparent z-10 -mt-4 pointer-events-none"></div>

        {messages.map((msg) => (
          <div key={msg.id} className="group flex items-start gap-2.5 py-1.5 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 animate-fade-in-up border border-transparent hover:border-white/5">

            {/* Badge Area */}
            {(msg.role === 'owner' || msg.role === 'moderator' || msg.role === 'vip') && (
              <div className="mt-1 shrink-0 transform group-hover:scale-110 transition-transform">
                {getBadge(msg.role)}
              </div>
            )}

            {/* Message Content */}
            <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] md:text-sm leading-relaxed break-words w-full">

              {/* Username */}
              <span
                className="font-bold hover:underline cursor-pointer transition-opacity shrink-0 drop-shadow-sm"
                style={{ color: msg.color || '#fff' }}
              >
                {msg.username}
              </span>

              {/* Text */}
              <span className={`text-white/80 font-medium group-hover:text-white transition-colors ${lang === 'ar' ? 'font-arabic' : ''}`}>
                {msg.message}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Decorative Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0b0e0f] to-transparent pointer-events-none z-10"></div>
    </div>
  );
};