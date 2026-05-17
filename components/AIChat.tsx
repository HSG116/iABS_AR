import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface AIChatProps {
  lang: Language;
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

تعليمات الرد:
- تحدث باللهجة السعودية دائمًا
- أجب بحماس واختصار
- استخدم كلمات: وش، يابو، الحين، كذا، اقصد`.trim();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const QS_AR = ['وش قصة iABS؟', 'كم عمره؟', 'وش نوع محتواه؟', 'من المودات؟', 'كم متابع عنده؟'];
const QS_EN = ['Who is iABS?', 'How old?', 'Content type?', 'Who are mods?', 'Followers?'];

export const AIChat: React.FC<AIChatProps> = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([
    { role: 'assistant', content: lang === 'ar' ? 'هلا والله 🌟 أنا iABS AI، وش تبي تعرف عن محمد القحطاني؟ 👑' : 'Hey! I\'m iABS AI 🎮 Ask me about Mohammed!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyIdx, setKeyIdx] = useState(0);
  const [showQ, setShowQ] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inpRef.current?.focus(), 500); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const fetchAI = async (body: object, ki: number): Promise<Response> => {
    if (ki >= API_KEYS.length) throw new Error('no keys');
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEYS[ki]}` },
      body: JSON.stringify(body),
    });
    if ([429, 401, 500].includes(r.status)) return fetchAI(body, ki + 1);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  };

  const send = async (t?: string) => {
    const txt = (t || input).trim();
    if (!txt || loading) return;
    setInput('' as string);
    setShowQ(false);
    const newMsgs = [...msgs, { role: 'user' as const, content: txt }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const res = await fetchAI({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...newMsgs.map(m => ({ role: m.role, content: m.content }))],
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }, keyIdx);
      setKeyIdx(0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('');
      const dec = new TextDecoder();
      let content = '';
      setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            const delta = p.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content }; return u; });
            }
          } catch {}
        }
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'ar' ? 'عذراً صار خطأ جرب مرة ثانية 🙏' : 'Sorry, error. Try again 🙏' }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .ai-wrap { animation: aiSlide 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes aiSlide { 0% { opacity:0; transform:translateY(24px) scale(0.95); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        .ai-msg { animation: aiPop 0.35s ease-out; }
        @keyframes aiPop { 0% { opacity:0; transform:translateY(12px) scale(0.96); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        .ai-float { animation: aiFloat 3s ease-in-out infinite; }
        @keyframes aiFloat { 0%,100% { transform:translateY(0); box-shadow:0 8px 32px rgba(255,45,45,0.3); } 50% { transform:translateY(-10px); box-shadow:0 16px 48px rgba(255,45,45,0.5); } }
        .ai-dots span { animation: aiDot 1.2s ease-in-out infinite; }
        .ai-dots span:nth-child(2) { animation-delay:0.15s; }
        .ai-dots span:nth-child(3) { animation-delay:0.3s; }
        @keyframes aiDot { 0%,80%,100% { transform:scale(0.5); opacity:0.3; } 40% { transform:scale(1.2); opacity:1; } }
        .ai-scroll::-webkit-scrollbar { width:3px; }
        .ai-scroll::-webkit-scrollbar-track { background:transparent; }
        .ai-scroll::-webkit-scrollbar-thumb { background:linear-gradient(180deg,#FF2D2D,#FF6B6B); border-radius:10px; }
      `}</style>

      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[999]">
        <button
          onClick={() => setOpen(!open)}
          className="ai-float relative w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2D2D] via-[#DD1515] to-[#991111] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-300 border-2 border-white/20"
        >
          <span className="absolute inset-0 rounded-full bg-[#FF2D2D] opacity-40 animate-ping"></span>
          <div className="absolute inset-1 rounded-full bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
          {open ? (
            <svg className="w-7 h-7 relative drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            <svg className="w-7 h-7 relative drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[999] w-[400px] max-w-[calc(100vw-48px)] h-[640px] max-h-[calc(100vh-150px)] ai-wrap">
          {/* Outer border glow */}
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#FF2D2D]/30 via-transparent to-[#FF2D2D]/10 opacity-60 blur-[2px]"></div>
          <div className="absolute inset-0 rounded-[28px] border border-white/10"></div>

          {/* Main container */}
          <div className="relative w-full h-full flex flex-col overflow-hidden rounded-[28px]" style={{ background: 'linear-gradient(160deg, #0c0c20 0%, #080810 100%)' }}>
            {/* Glows */}
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#FF2D2D]/10 blur-[120px] pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#FF6B6B]/5 blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="relative shrink-0 px-5 pt-5 pb-4 bg-gradient-to-b from-white/[0.04] to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF2D2D] via-[#DD1515] to-[#991111] flex items-center justify-center shadow-lg shadow-[#FF2D2D]/30">
                      <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0c0c20] shadow-[0_0_12px_rgba(34,197,94,0.6)]"></span>
                  </div>
                  <div>
                    <div className="text-white font-extrabold text-sm tracking-tight flex items-center gap-2">
                      iABS AI
                      <span className="text-[8px] font-bold bg-[#FF2D2D]/15 text-[#FF2D2D]/80 px-2 py-0.5 rounded-full border border-[#FF2D2D]/20 uppercase tracking-wider">Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      <span className="text-[10px] text-green-400/70 font-medium">{loading ? (lang === 'ar' ? 'يفكر...' : 'Thinking...') : (lang === 'ar' ? 'متصل' : 'Online')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setMsgs([{ role: 'assistant', content: lang === 'ar' ? 'هلا والله 🌟 أنا iABS AI، وش تبي تعرف عن محمد القحطاني؟ 👑' : 'Hey! I\'m iABS AI 🎮 Ask me about Mohammed!' }]); setShowQ(true); }} className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center border border-white/[0.04] transition-all" title={lang === 'ar' ? 'مسح' : 'Clear'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center border border-white/[0.04] transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-[#FF2D2D]/30 via-transparent to-transparent"></div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 ai-scroll">
              <div className="space-y-4">
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ai-msg ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${m.role === 'user' ? 'max-w-[80%]' : 'max-w-[88%]'}`} style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#FF2D2D] to-[#991111] flex items-center justify-center shadow-sm">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          </div>
                          <span className="text-[9px] font-bold text-[#FF2D2D]/60 tracking-[0.2em] uppercase">iABS AI</span>
                        </div>
                      )}
                      <div className={`px-4 py-3 text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white rounded-2xl rounded-tr-md shadow-[0_8px_24px_rgba(255,45,45,0.25)]'
                          : 'bg-[#16162a]/70 text-white/90 rounded-2xl rounded-tl-md border border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                      }`}>
                        <span className={`${lang === 'ar' ? 'leading-[1.7]' : ''} whitespace-pre-wrap`}>{m.content}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start ai-msg">
                    <div className="max-w-[88%]">
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#FF2D2D] to-[#991111] flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <span className="text-[9px] font-bold text-[#FF2D2D]/40 tracking-[0.2em] uppercase">iABS AI</span>
                      </div>
                      <div className="bg-[#16162a]/70 backdrop-blur-sm rounded-2xl rounded-tl-md border border-white/[0.06] px-6 py-5 shadow-lg">
                        <div className="flex items-center gap-2.5 ai-dots">
                          <span className="w-2 h-2 rounded-full bg-[#FF2D2D]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#FF2D2D]"></span>
                          <span className="w-2 h-2 rounded-full bg-[#FF2D2D]"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showQ && msgs.length <= 1 && (
                  <div className="mt-8">
                    <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase mb-4 text-center">{lang === 'ar' ? 'أسئلة مقترحة' : 'Quick Questions'}</p>
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {(lang === 'ar' ? QS_AR : QS_EN).map((q, i) => (
                        <button key={i} onClick={() => { setShowQ(false); send(q); }}
                          className="px-4 py-2.5 text-xs font-medium rounded-full bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white/90 border border-white/[0.06] hover:border-[#FF2D2D]/30 transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,45,45,0.1)] backdrop-blur-sm">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-3 bg-gradient-to-t from-[#0c0c20] via-[#0c0c20] to-transparent border-t border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <input ref={inpRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder={lang === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question...'}
                    disabled={loading}
                    className="w-full h-12 px-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none transition-all duration-300 focus:border-[#FF2D2D]/40 focus:bg-white/[0.06] focus:shadow-[0_0_24px_rgba(255,45,45,0.08)] disabled:opacity-40"
                    style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                  />
                </div>
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#CC1111] text-white flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,45,45,0.4)] active:scale-95 disabled:opacity-25 disabled:hover:scale-100 disabled:hover:shadow-none shadow-lg shadow-[#FF2D2D]/20 flex-shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin relative z-10" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
