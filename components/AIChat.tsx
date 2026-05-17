import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface AIChatProps {
  lang: Language;
  streamerInfo?: string;
}

const API_KEYS = [
  'sk-f606af64b454403684bec8eb477916e5',
  'sk-7ae88917fa654723b43323e950abd9d4',
  'sk-8d59f937022948ba94960876a0511848',
];

const SYSTEM_PROMPT = `أنت مساعد iABS الرسمي، تتحدث باللهجة السعودية دائمًا. اسمك "iABS AI".

معلومات كاملة عن iABS (محمد القحطاني):
- الاسم الكامل: محمد القحطاني
- العمر: 24 سنة (مواليد 2002)
- الجنسية: سعودي من سراة عبيدة، من سكان أبها
- المنصة الأساسية: Kick - iABS
- المتابعين: 124K على Kick، 40K يوتيوب، 43K تيك توك، 57K تويتر
- طوله: 176 سم - وزنه: 80 كجم
- أخوه: iMSA3Dq ستريمر في Kick
- محتواه: GTA V / FiveM، Just Chatting، ألعاب تنويعية
- أسلوبه: عفوي، تفاعلي، فكاهي، يعتمد على الكاريزما والضحك
- كلانه: LevelOne
- المودات: inormal, yousef1098, ireim, shaddoh, sipdai, maryamqa, imiro97, iali5, lena81l, a7medo, wjdan3, fotaami, 2inoura, awash7, rton, janaxx, mohmd505, raghada1
- أشهر كلماته: "ملك القبول والاستمرارية" 👑، هاشتاق #StayOne
- شخصيته: واثق، حماسي، يحب التفاعل مع الشات، بثوثه طويلة وسابثونات
- معروف بـ: الكاريزما العالية، الأجواء العفوية، المحتوى المتنوع
- ليش الناس تتابعه: شخصيته قوية، يعرف يسوي "جو" بالبث، مجتمع متفاعل، استمرارية يومية

تعليمات الرد:
- تحدث باللهجة السعودية دائمًا (مثل: وشلونك، تمام، يابو فلان، اقصد، الخ)
- أجب بإثارة وحماس على طول
- اختصر بالردود عشان التوكنز، ما تطول
- إذا سأل عن iABS جاوب بمعلومة دقيقة ومختصرة
- إذا ما تعرف شيء، قول "والله مدري بالضبط بس أقدر أساعدك بشي ثاني"
- استخدم كلمات سعودية: وش، اقصد، يابو، هذاك، كذا، الحين، الخ`.trim();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const AIChat: React.FC<AIChatProps> = ({ lang, streamerInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: lang === 'ar'
        ? 'هلا والله! أنا مساعد iABS الذكي 🤖✋ وليتس سوالف عن محمد القحطاني، وش تبي تعرف؟ 👑'
        : 'Hello! I\'m the iABS AI Assistant. How can I help you? 😊'
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyIndex, setKeyIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveStreamerInfo = (info: string) => {
    localStorage.setItem('iabs_ai_streamer_info', info);
  };

  const tryRequest = async (body: object, keyIdx: number): Promise<Response> => {
    if (keyIdx >= API_KEYS.length) throw new Error('All API keys failed');
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS[keyIdx]}`,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status === 401 || res.status === 500) {
      return tryRequest(body, keyIdx + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const body = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...newMessages.map(m => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      };

      const response = await tryRequest(body, keyIndex);
      setKeyIndex(0);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: lang === 'ar'
            ? 'عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.'
            : 'Sorry, connection error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes float-glow {
          0%, 100% { transform: translateY(0px) scale(1); box-shadow: 0 0 30px rgba(255,45,45,0.4); }
          50% { transform: translateY(-8px) scale(1.05); box-shadow: 0 0 50px rgba(255,45,45,0.7); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(100%) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes message-pop {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          50% { transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes tai {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .scrollbar-ai::-webkit-scrollbar { width: 4px; }
        .scrollbar-ai::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-ai::-webkit-scrollbar-thumb { background: rgba(255,45,45,0.3); border-radius: 10px; }
        .scrollbar-ai::-webkit-scrollbar-thumb:hover { background: rgba(255,45,45,0.5); }
      `}</style>

      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <div className="relative">
          {!isOpen && (
            <span className="absolute -top-2 -right-2 z-10 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D2D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-[#FF2D2D] text-[10px] items-center justify-center text-white font-black">AI</span>
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20"
            style={{ animation: 'float-glow 3s ease-in-out infinite' }}
          >
            <div className="absolute inset-0 rounded-full bg-[#FF2D2D] opacity-30" style={{ animation: 'pulse-ring 2s ease-out infinite' }}></div>
            {isOpen ? (
              <svg className="w-7 h-7 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-180px)] bg-[#0a0a0f]/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{ animation: isOpen ? 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}
      >
        {/* Header */}
        <div className="relative h-16 bg-gradient-to-r from-[#FF2D2D]/20 to-transparent border-b border-white/5 flex items-center justify-between px-5 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF2D2D]/10 to-transparent opacity-50"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] flex items-center justify-center shadow-lg shadow-[#FF2D2D]/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide">iABS AI</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                <span className="text-[10px] text-green-400/80 font-mono">
                  {isLoading ? (lang === 'ar' ? 'جارِ التفكير...' : 'Thinking...') : (lang === 'ar' ? 'متصل' : 'Online')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="relative z-10 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-ai bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f]" style={{ height: 'calc(100% - 120px)' }}>
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0a0f] to-transparent pointer-events-none z-10"></div>

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'message-pop 0.3s ease-out' }}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white rounded-br-md shadow-[#FF2D2D]/20'
                    : 'bg-[#151525]/80 border border-white/5 text-white/90 rounded-bl-md backdrop-blur-sm'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF2D2D]/80 uppercase tracking-wider">iABS AI</span>
                  </div>
                )}
                <span className={`${msg.role === 'user' ? 'text-white' : 'text-white/90'} whitespace-pre-wrap ${lang === 'ar' ? 'font-arabic' : ''}`}>
                  {msg.content}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start" style={{ animation: 'message-pop 0.3s ease-out' }}>
              <div className="bg-[#151525]/80 border border-white/5 text-white rounded-2xl rounded-bl-md px-5 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite' }}></span>
                  <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite 0.2s' }}></span>
                  <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite 0.4s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-[#0a0a0f] border-t border-white/5 px-3 flex items-center gap-2 backdrop-blur-xl">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'ar' ? 'اسأل أي شيء...' : 'Ask anything...'}
              disabled={isLoading}
              className="w-full h-11 px-4 pr-10 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm outline-none transition-all focus:border-[#FF2D2D]/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(255,45,45,0.1)] disabled:opacity-50"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shadow-lg shadow-[#FF2D2D]/20 flex-shrink-0"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
