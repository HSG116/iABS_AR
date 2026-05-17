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
- تحدث باللهجة السعودية دائمًا (مثل: وشلونك، تمام، وش فيه، اقصد، الخ)
- أجب بحماس وعفوية، كانك صاحبي
- اختصر بالردود عشان التوكنز، ما تطول
- جاوب بمعلومة دقيقة ومختصرة
- إذا ما تعرف شيء، قول "والله مدري بالضبط بس أقدر أساعدك بشي ثاني"
- استخدم كلمات سعودية: وش، اقصد، هذاك، كذا، الحين، الخ
- استخدم تنسيق النصوص لتجميل الردود:
  • **كلمة** للنص العريض (مهم)
  • *كلمة* للنص المائل
  • ***كلمة*** للعريض والمائل معاً
- وزع التنسيق على ردودك عشان تكون جميلة وواضحة
- عندما تكتب كلمات إنجليزية مع العربية، اترك مسافة قبل وبعد الكلمة الإنجليزية (مثل: حسابه على **Kick** عنده)

استخدم الإيموجيز الحصرية لـ iABS في ردودك باستخدام الصيغة [emote:ID:NAME]:
• [emote:3989626:iABSWave] -> للترحيب والسلام (السلام عليكم، مرحبا، هلا)
• [emote:3823817:iABSCelebrate] -> للاحتفال والفرح
• [emote:5447899:iABSStayOne] -> كل ما ذكرت #StayOne، ون، LevelOne، كلان ليفل ون
• [emote:3329260:iABSWrong] -> لتصحيح خطأ، قبلها اكتب : ثم هذا الإيموجي
• [emote:5513874:iABSRandom1] -> إيموجي عشوائي إذا ما كان في إيموجي بالرسالة
• [emote:4937184:iABSRandom2] -> إيموجي عشوائي ثاني
• [emote:3689147:iABSLaugh] -> للضحك العالي
• [emote:3109190:iABSDisgust] -> للقرف أو شيء مقزز
• [emote:2893352:iABSQuestion] -> للسؤال
• [emote:1078051:iABSCelebrate2] -> للاحتفال أيضاً
• [emote:3329257:iABSKick] -> للطرد أو "روح اذلف"
• [emote:3330235:iABSMock] -> للضحك على شخص

وزع الإيموجيز بشكل طبيعي في ردودك عشان تكون تفاعلية وجميلة`.trim();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const EMOTES = {
  wave: { id: '3989626', name: 'iABSWave', desc: 'ترحيب/سلام' },
  celebrate: { id: '3823817', name: 'iABSCelebrate', desc: 'احتفال' },
  stayone: { id: '5447899', name: 'iABSStayOne', desc: '#StayOne' },
  wrong: { id: '3329260', name: 'iABSWrong', desc: 'خطأ' },
  random1: { id: '5513874', name: 'iABSRandom1', desc: 'ايموجي عشوائي' },
  random2: { id: '4937184', name: 'iABSRandom2', desc: 'ايموجي عشوائي' },
  laugh: { id: '3689147', name: 'iABSLaugh', desc: 'ضحك عالي' },
  disgust: { id: '3109190', name: 'iABSDisgust', desc: 'قرف' },
  question: { id: '2893352', name: 'iABSQuestion', desc: 'سؤال' },
  celebrate2: { id: '1078051', name: 'iABSCelebrate2', desc: 'احتفال' },
  kick: { id: '3329257', name: 'iABSKick', desc: 'طرد/اذلف' },
  mock: { id: '3330235', name: 'iABSMock', desc: 'ضحك على شخص' },
};

const renderFormattedText = (text: string) => {
  const parts: React.ReactNode[] = [];
  const combinedRegex = /(\[emote:(\d+):([\w\s\-]+)\])|(\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|\*(.*?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  const renderPlain = (t: string) => {
    const engRegex = /[a-zA-Z0-9]+(?:\.(?:com|net|org|io|sa|tv))?(?:[/\w-]*)?/g;
    const plainParts: React.ReactNode[] = [];
    let pLast = 0;
    let pMatch;
    while ((pMatch = engRegex.exec(t)) !== null) {
      if (pMatch.index > pLast) {
        plainParts.push(t.slice(pLast, pMatch.index));
      }
      plainParts.push(<span key={`e${key++}`} dir="ltr" className="inline-block">{pMatch[0]}</span>);
      pLast = engRegex.lastIndex;
    }
    if (pLast < t.length) {
      plainParts.push(t.slice(pLast));
    }
    return plainParts.length > 0 ? plainParts : t;
  };

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderPlain(text.slice(lastIndex, match.index)));
    }
    if (match[1]) {
      parts.push(
        <img
          key={`em${key++}`}
          src={`https://files.kick.com/emotes/${match[2]}/fullsize`}
          alt={match[3]}
          title={match[3]}
          className="inline-block w-8 h-8 md:w-10 md:h-10 mx-0.5 align-middle object-contain hover:scale-125 transition-transform"
        />
      );
    } else if (match[4]?.startsWith('***')) {
      parts.push(<span key={key++} className="font-bold italic text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{match[5]}</span>);
    } else if (match[4]?.startsWith('**')) {
      parts.push(<strong key={key++} className="font-black text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.12)]">{match[6]}</strong>);
    } else if (match[4]?.startsWith('*')) {
      parts.push(<em key={key++} className="italic text-white/80">{match[7]}</em>);
    }
    lastIndex = combinedRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(renderPlain(text.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : text;
};

interface QuickAction {
  name: string;
  label: string;
  url: string;
  color: string;
  icon: React.ReactNode;
  query: string;
}

const QuickActions: React.FC<{ lang: Language; onAsk: (q: string) => void }> = ({ lang, onAsk }) => {
  const actions: QuickAction[] = [
    {
      name: 'Kick',
      label: lang === 'ar' ? 'قناة كيك' : 'Kick Channel',
      url: 'https://kick.com/iabs',
      color: '#53FC18',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 3h4.5v6.9l6-6.9H19l-7.5 8.4L20 21h-5.4l-5.1-6.6V21H3V3z"/></svg>,
      query: lang === 'ar' ? 'وش قناة iABS بكيك؟' : 'What is iABS Kick channel?',
    },
    {
      name: 'X',
      label: 'X',
      url: 'https://x.com/iABSq',
      color: '#FFFFFF',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      query: lang === 'ar' ? 'وش حسابه بتويتر؟' : 'What is iABS X account?',
    },
    {
      name: 'Instagram',
      label: lang === 'ar' ? 'انستقرام' : 'Instagram',
      url: 'https://www.instagram.com/absq/',
      color: '#E1306C',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>,
      query: lang === 'ar' ? 'وش حسابه بالانستقرام؟' : 'What is iABS Instagram?',
    },
    {
      name: 'TikTok',
      label: lang === 'ar' ? 'تيك توك' : 'TikTok',
      url: 'https://www.tiktok.com/@iabsq',
      color: '#FE2C55',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
      query: lang === 'ar' ? 'وش حسابه بتيك توك؟' : 'What is iABS TikTok?',
    },
    {
      name: 'YouTube',
      label: lang === 'ar' ? 'يوتيوب' : 'YouTube',
      url: 'https://www.youtube.com/@ABS11',
      color: '#FF0000',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>,
      query: lang === 'ar' ? 'وش قناته باليوتيوب؟' : 'What is iABS YouTube channel?',
    },
    {
      name: 'Snapchat',
      label: lang === 'ar' ? 'سناب شات' : 'Snapchat',
      url: 'https://www.snapchat.com/@iabsq',
      color: '#FFFC00',
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12.185 2.162c-3.153 0-5.412 2.007-5.412 4.755 0 .546.064.981.163 1.503-.937.334-2.122.73-2.122 2.284 0 .616.355 1.147.666 1.612.054.08.067.182.029.27-.291.631-1.51 1.26-1.51 2.557 0 1.06.751 1.855 1.55 2.183.13.054.192.198.141.333-.217.606-.743 2.07-.743 2.675 0 1.076 1.15 1.579 2.018 1.579.629 0 1.236-.211 2.381-1.056.452-.333.884-.347 1.439-.051 1.132.607 2.454.607 3.583 0 .554-.298.985-.28 1.439.052 1.146.843 1.753 1.055 2.382 1.055.867 0 2.017-.504 2.017-1.58 0-.606-.526-2.07-.743-2.675-.05-.134.013-.279.143-.333.797-.327 1.549-1.121 1.549-2.181 0-1.298-1.219-1.926-1.51-2.557-.039-.088-.026-.189.028-.27.311-.465.667-.996.667-1.612 0-1.553-1.183-1.948-2.122-2.284.099-.522.162-.957.162-1.503 0-2.749-2.192-4.755-5.176-4.755z"/></svg>,
      query: lang === 'ar' ? 'وش سنابه؟' : 'What is iABS Snapchat?',
    },
  ];

  return (
    <div className="px-4 py-3">
      <p className="text-[10px] text-white/40 font-medium tracking-wider mb-2.5 uppercase">
        {lang === 'ar' ? 'حسابات iABS' : 'iABS Accounts'}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <a
            key={a.name}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/30 text-white/70 hover:text-white text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="transition-transform duration-300 group-hover:scale-110" style={{ color: a.color }}>
              {a.icon}
            </span>
            <span className="truncate max-w-[60px]">{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

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
  const [isWaiting, setIsWaiting] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [keyIndex, setKeyIndex] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaiting, isResponding]);

  const handleQuickAsk = (query: string) => {
    setInput(query);
    setShowQuickActions(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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
    if (!text || isWaiting || isResponding) return;
    setInput('');
    setIsResponding(false);

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsWaiting(true);
    setShowQuickActions(false);

    try {
      const body = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...newMessages.map(m => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      };

      const response = await tryRequest(body, keyIndex);
      setKeyIndex(0);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let started = false;

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
              if (!started) {
                started = true;
                setIsWaiting(false);
                setIsResponding(true);
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
              }
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
      setIsWaiting(false);
      setIsResponding(false);
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
      setIsWaiting(false);
      setIsResponding(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes float-glow {
          0%, 100% { transform: translateY(0px) scale(1); box-shadow: 0 0 30px rgba(255,45,45,0.4); }
          50% { transform: translateY(-8px) scale(1.05); box-shadow: 0 0 60px rgba(255,45,45,0.7); }
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
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; opacity: 0.3; }
          50% { background-position: 100% 50%; opacity: 0.5; }
          100% { background-position: 0% 50%; opacity: 0.3; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        @keyframes border-dance {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); max-height: 0; }
          to { opacity: 1; transform: translateY(0) scale(1); max-height: 200px; }
        }
        @keyframes glow-expand {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.4; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes message-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .scrollbar-ai::-webkit-scrollbar { width: 4px; }
        .scrollbar-ai::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-ai::-webkit-scrollbar-thumb { background: rgba(255,45,45,0.3); border-radius: 10px; }
        .scrollbar-ai::-webkit-scrollbar-thumb:hover { background: rgba(255,45,45,0.5); }
        .msg-enter {
          animation: message-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .ai-chat strong {
          color: #fff;
          font-weight: 900;
          text-shadow: 0 0 12px rgba(255,255,255,0.15), 0 0 30px rgba(255,45,45,0.1);
          background: linear-gradient(135deg, #fff 60%, rgba(255,45,45,0.3));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .user-msg strong {
          color: #fff;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(255,255,255,0.2);
        }
        .ai-chat em {
          font-style: italic;
          color: rgba(255,255,255,0.85);
          text-shadow: 0 0 8px rgba(255,45,45,0.15);
        }
        .ai-chat strong em, .ai-chat em strong {
          font-style: italic;
          font-weight: 900;
          background: linear-gradient(135deg, #fff 40%, #FF2D2D 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
        }
        .ai-bg {
          background-image: url('/c2a78a6d-22c1-4612-aa04-9a29500bcacc.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        @media (min-width: 768px) {
          .ai-bg {
            background-image: url('/84c78815-c9fc-4961-9b6b-c0d79b3a0138.png');
          }
        }
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
        ref={chatRef}
        className={`fixed bottom-24 right-6 z-[100] w-[400px] max-w-[calc(100vw-2rem)] h-[650px] max-h-[calc(100vh-180px)] rounded-3xl border shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'} ${isResponding ? 'border-[#FF2D2D]/30' : 'border-white/10'}`}
        style={{ animation: isOpen ? 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}
      >
        {/* Background Layer */}
        <div className="absolute inset-0 ai-bg"></div>
        <div className="absolute inset-0 bg-[#0a0a0f]/70 backdrop-blur-2xl"></div>

        {/* Animated Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,45,0.15) 0%, transparent 50%, rgba(255,45,45,0.05) 100%)',
            animation: 'gradient-shift 8s ease-in-out infinite',
            backgroundSize: '200% 200%',
          }}
        ></div>

        {/* Top Glow */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#FF2D2D]/10 blur-[100px] animate-pulse-slow pointer-events-none" style={{ animation: 'glow-pulse 4s ease-in-out infinite' }}></div>

        {/* Header */}
        <div className="relative h-16 bg-gradient-to-r from-[#FF2D2D]/20 via-[#FF2D2D]/5 to-transparent border-b border-white/5 flex items-center justify-between px-5 shrink-0 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF2D2D]/10 to-transparent opacity-50"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className={`w-12 h-12 flex items-center justify-center transition-all duration-700 ${isResponding ? 'animate-breathe' : ''} hover:rotate-12`}
              style={isResponding ? { animation: 'breathe 1.5s ease-in-out infinite' } : {}}>
              <img src="/ai-icon.png" alt="AI" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(255,45,45,0.4)]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide">iABS AI</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" style={{ animation: 'glow-pulse 2s ease-in-out infinite' }}></span>
                <span className="text-[10px] text-green-400/80 font-mono">
                  {isWaiting ? (lang === 'ar' ? 'يفكر...' : 'Thinking...') : isResponding ? (lang === 'ar' ? 'يكتب...' : 'Typing...') : (lang === 'ar' ? 'متصل' : 'Online')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="relative z-10 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all hover:rotate-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="relative flex-1 overflow-y-auto scrollbar-ai" style={{ height: 'calc(100% - 120px)' }}>
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10"></div>

          {showQuickActions && messages.length === 1 && (
            <div className="pt-4" style={{ animation: 'slide-up 0.5s ease-out' }}>
              <QuickActions lang={lang} onAsk={handleQuickAsk} />
            </div>
          )}

          <div className="p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex msg-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white rounded-br-md shadow-[#FF2D2D]/20'
                      : 'bg-[#0d0d15]/80 border border-white/5 text-white/90 rounded-bl-md backdrop-blur-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <img src="/ai-icon.png" alt="AI" className="w-6 h-6 object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#FF2D2D]/80 uppercase tracking-wider">iABS AI</span>
                    </div>
                  )}
                  <span dir="auto" className={`ai-chat ${msg.role === 'user' ? 'text-white user-msg' : 'text-white/90'} whitespace-pre-wrap ${lang === 'ar' ? 'font-arabic' : ''}`}>
                    {renderFormattedText(msg.content)}
                  </span>
                </div>
              </div>
            ))}

            {isWaiting && (
              <div className="flex justify-start" style={{ animation: 'message-pop 0.3s ease-out' }}>
                <div className="bg-[#151525]/80 border border-white/5 rounded-2xl rounded-bl-md px-5 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite' }}></span>
                    <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite 0.2s' }}></span>
                    <span className="w-2 h-2 bg-[#FF2D2D] rounded-full" style={{ animation: 'dot-pulse 1.4s ease-in-out infinite 0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            {isResponding && !isWaiting && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start" style={{ animation: 'message-pop 0.3s ease-out' }}>
                <div className="bg-[#0d0d15]/80 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <img src="/ai-icon.png" alt="AI" className="w-5 h-5 object-contain" />
                    </div>
                    <span className="text-[10px] font-bold text-[#FF2D2D]/80 uppercase tracking-wider">iABS AI</span>
                    <div className="flex items-center gap-1 mr-2">
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full" style={{ animation: 'dot-pulse 1s ease-in-out infinite' }}></span>
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full" style={{ animation: 'dot-pulse 1s ease-in-out infinite 0.15s' }}></span>
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full" style={{ animation: 'dot-pulse 1s ease-in-out infinite 0.3s' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="relative h-[60px] bg-black/60 border-t border-white/5 px-3 flex items-center gap-2 backdrop-blur-xl">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'ar' ? 'اسأل عن iABS...' : 'Ask about iABS...'}
              disabled={isWaiting}
              className={`w-full h-11 px-4 pr-10 rounded-2xl bg-white/5 border text-white placeholder-white/25 text-sm outline-none transition-all focus:border-[#FF2D2D]/50 focus:bg-white/10 disabled:opacity-50 ${isWaiting ? 'border-[#FF2D2D]/30 shadow-[0_0_15px_rgba(255,45,45,0.15)]' : 'border-white/10'}`}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isWaiting || isResponding}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shadow-lg shadow-[#FF2D2D]/20 flex-shrink-0"
          >
            {isWaiting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
