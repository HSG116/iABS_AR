import React, { useState, useEffect } from 'react';

export const AdminDashboard = ({ supabase, visitorCount, activePoll, setActivePoll, setIsAdmin, fetchLive }: any) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Overview / Polls
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // Announcements
    const [announcement, setAnnouncement] = useState('');
    const [isAnnouncementActive, setIsAnnouncementActive] = useState(false);

    // Sponsors
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [sponsorForm, setSponsorForm] = useState({ brand_name: '', promo_code: '', discount_desc: '', url: '' });

    // Clips
    const [clips, setClips] = useState<any[]>([]);
    const [clipForm, setClipForm] = useState({ title: '', video_url: '', platform: 'youtube' });

    // Schedule
    const [schedule, setSchedule] = useState<any[]>([]);
    const [isScheduleActive, setIsScheduleActive] = useState(true);

    // FAQs
    const [faqs, setFaqs] = useState<any[]>([]);
    const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
    const [isFaqActive, setIsFaqActive] = useState(true);

    const loadData = async () => {
        try {
            const { data: ann, error: err1 } = await supabase.from('announcements').select('*').eq('id', 1).single();
            if (err1) console.error("Announcements Error:", err1);
            else if (ann) { setAnnouncement(ann.message || ''); setIsAnnouncementActive(ann.is_active); }

            const { data: spon, error: err2 } = await supabase.from('sponsors').select('*').order('id', { ascending: false });
            if (err2) console.error("Sponsors Error:", err2);
            else if (spon) setSponsors(spon);

            const { data: clp, error: err3 } = await supabase.from('highlight_clips').select('*').order('id', { ascending: false });
            if (err3) console.error("Clips Error:", err3);
            else if (clp) setClips(clp);

            const { data: sch, error: err4 } = await supabase.from('schedule').select('*').order('id', { ascending: true });
            if (err4) console.error("Schedule Error:", err4);
            else if (sch) setSchedule(sch);

            // Fetch Schedule Visibility Toggle (Stored in announcements id=2)
            const { data: schToggle } = await supabase.from('announcements').select('*').eq('id', 2).single();
            if (schToggle) setIsScheduleActive(schToggle.is_active);
            else {
                await supabase.from('announcements').insert([{ id: 2, message: 'schedule_toggle', is_active: true }]);
                setIsScheduleActive(true);
            }

            const { data: fq, error: err5 } = await supabase.from('faqs').select('*').order('id', { ascending: false });
            if (err5) console.error("FAQs Error:", err5);
            else if (fq) setFaqs(fq);
            // Fetch FAQ Visibility Toggle (Stored in announcements id=3)
            const { data: faqToggle } = await supabase.from('announcements').select('*').eq('id', 3).single();
            if (faqToggle) setIsFaqActive(faqToggle.is_active);
            else {
                await supabase.from('announcements').insert([{ id: 3, message: 'faq_toggle', is_active: true }]);
                setIsFaqActive(true);
            }
        } catch (e) {
            console.error("Load Data Exception:", e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const saveAnnouncement = async () => {
        const { error } = await supabase.from('announcements').upsert({ id: 1, message: announcement, is_active: isAnnouncementActive });
        if (error) return alert('خطأ في قاعدة البيانات (هل أنشأت الجدول؟): ' + error.message);
        alert('تم حفظ الإعلان بنجاح');
        fetchLive();
    };

    const addSponsor = async () => {
        if (!sponsorForm.brand_name) return alert('اسم الراعي مطلوب');
        const { error } = await supabase.from('sponsors').insert([sponsorForm]);
        if (error) return alert('خطأ في قاعدة البيانات (هل أنشأت الجدول؟): ' + error.message);
        setSponsorForm({ brand_name: '', promo_code: '', discount_desc: '', url: '' });
        loadData();
        fetchLive();
    };

    const deleteSponsor = async (id: number) => {
        const { error } = await supabase.from('sponsors').delete().eq('id', id);
        if (error) return alert('خطأ: ' + error.message);
        loadData();
        fetchLive();
    };

    const addClip = async () => {
        if (!clipForm.title || !clipForm.video_url) return alert('العنوان والرابط مطلوبان');
        const { error } = await supabase.from('highlight_clips').insert([clipForm]);
        if (error) return alert('خطأ في قاعدة البيانات (هل أنشأت الجدول؟): ' + error.message);
        setClipForm({ title: '', video_url: '', platform: 'youtube' });
        loadData();
        fetchLive();
    };

    const deleteClip = async (id: number) => {
        const { error } = await supabase.from('highlight_clips').delete().eq('id', id);
        if (error) return alert('خطأ: ' + error.message);
        loadData();
        fetchLive();
    };

    const updateSchedule = async (id: number, plan: string, time: string) => {
        const { error } = await supabase.from('schedule').update({ stream_plan: plan, time }).eq('id', id);
        if (error) return alert('خطأ: ' + error.message);
        loadData();
        fetchLive();
    };

    const addFaq = async () => {
        if (!faqForm.question || !faqForm.answer) return alert('السؤال والإجابة مطلوبان');
        const { error } = await supabase.from('faqs').insert([faqForm]);
        if (error) return alert('خطأ في قاعدة البيانات (هل أنشأت الجدول؟): ' + error.message);
        setFaqForm({ question: '', answer: '' });
        loadData();
        fetchLive();
    };

    const deleteFaq = async (id: number) => {
        const { error } = await supabase.from('faqs').delete().eq('id', id);
        if (error) return alert('خطأ: ' + error.message);
        loadData();
        fetchLive();
    };

    const tabs = [
        { id: 'overview', name: 'الرئيسية 📊' },
        { id: 'announcements', name: 'الإعلانات 📢' },
        { id: 'sponsors', name: 'الرعاة والخصومات 💸' },
        { id: 'clips', name: 'مكتبة اللقطات 🎬' },
        { id: 'schedule', name: 'جدول البثوث 📅' },
        { id: 'faqs', name: 'الأسئلة الشائعة ❓' }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex justify-center p-0 md:p-6 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 md:rounded-[32px] w-full max-w-7xl h-full md:h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden relative">
                
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-[#111] border-l border-white/5 flex flex-col shrink-0">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xl font-black text-white">لوحة الإدارة <span className="text-[#FF2D2D]">👑</span></h2>
                        <button onClick={() => setIsAdmin(false)} className="md:hidden w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 flex md:block overflow-x-auto md:overflow-x-visible hide-scrollbar">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-right px-5 py-4 rounded-2xl font-bold transition-all duration-300 whitespace-nowrap flex justify-between items-center group relative overflow-hidden ${activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                            >
                                {activeTab === tab.id && <div className="absolute inset-0 bg-gradient-to-r from-[#FF2D2D] to-[#ff4747] opacity-100 z-0 shadow-[0_0_20px_rgba(255,45,45,0.4)]"></div>}
                                <span className="relative z-10">{tab.name}</span>
                                <div className={`w-2 h-2 rounded-full relative z-10 transition-all ${activeTab === tab.id ? 'bg-white shadow-[0_0_10px_white]' : 'bg-transparent group-hover:bg-white/20'}`}></div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/5 hidden md:block">
                        <button onClick={() => setIsAdmin(false)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all">إغلاق اللوحة ✕</button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
                    
                    {/* Tab: Overview (Polls & Stats) */}
                    {activeTab === 'overview' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">نظرة عامة</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-[#151515] to-black border border-white/10 p-8 rounded-3xl flex flex-col items-center justify-center">
                                    <h3 className="text-sm font-bold text-white/50 mb-3 tracking-widest uppercase">إجمالي زوار الموقع</h3>
                                    <p className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-[#FF2D2D] drop-shadow-2xl">{visitorCount}</p>
                                </div>
                                <div className="bg-gradient-to-br from-[#151515] to-black border border-white/10 p-8 rounded-3xl flex flex-col items-center justify-center">
                                    <h3 className="text-sm font-bold text-white/50 mb-3 tracking-widest uppercase">حالة التصويت الحالي</h3>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${activePoll ? 'bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className="text-2xl font-black text-white">{activePoll ? 'نشط (Live)' : 'لا يوجد'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                {activePoll ? (
                                    <div>
                                        <h3 className="text-xl font-black text-white mb-6">نتائج التصويت الحالي 📊</h3>
                                        <h4 className="text-lg text-white font-bold mb-6">{activePoll.question}</h4>
                                        <div className="space-y-4 mb-8">
                                            {activePoll.options.map((opt: any) => (
                                                <div key={opt.id} className="flex justify-between items-center bg-black p-5 rounded-2xl border border-white/5">
                                                    <span className="text-white font-bold text-lg">{opt.text}</span>
                                                    <span className="text-[#FF2D2D] font-black bg-[#FF2D2D]/10 px-4 py-2 rounded-xl">{opt.votes} أصوات</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                await supabase.from('polls').update({ is_active: false }).eq('id', activePoll.id);
                                                setActivePoll(null);
                                                alert('تم الإيقاف بنجاح');
                                            }}
                                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl transition-colors border border-red-500/30"
                                        >
                                            إيقاف وحذف التصويت من الموقع
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-xl font-black text-white mb-6">إنشاء تصويت جديد 📊</h3>
                                        <div className="space-y-4">
                                            <input className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold" placeholder="السؤال؟" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                                            {pollOptions.map((opt, i) => (
                                                <div key={i} className="flex gap-3">
                                                    <input className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-white" placeholder={`الخيار ${i + 1}`} value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }} />
                                                    {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="w-12 h-12 bg-white/5 text-white/50 rounded-xl">✕</button>}
                                                </div>
                                            ))}
                                            <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-[#FF2D2D] text-sm font-bold">+ إضافة خيار</button>
                                            <button 
                                                onClick={async () => {
                                                    const validOpts = pollOptions.filter(o => o.trim() !== '');
                                                    if (!pollQuestion || validOpts.length < 2) return alert('أكمل البيانات');
                                                    await supabase.from('polls').update({ is_active: false }).eq('is_active', true);
                                                    const { data } = await supabase.from('polls').insert([{ question: pollQuestion, options: validOpts.map((t, i) => ({ id: i, text: t, votes: 0 })), is_active: true }]).select().single();
                                                    setPollQuestion(''); setPollOptions(['', '']); setActivePoll(data); alert('تم النشر!');
                                                }}
                                                className="w-full bg-[#FF2D2D] text-black font-black py-4 rounded-xl mt-4"
                                            >
                                                نشر التصويت
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Announcements */}
                    {activeTab === 'announcements' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">شريط الأخبار والإعلانات 📢</h2>
                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                <label className="block text-white/50 font-bold mb-4">نص الإعلان (يظهر أعلى الموقع)</label>
                                <textarea 
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold h-32 mb-6" 
                                    placeholder="🔥 بث بطولة فالورانت الليلة الساعة 9!"
                                    value={announcement}
                                    onChange={e => setAnnouncement(e.target.value)}
                                />
                                <div className="flex items-center gap-4 mb-8">
                                    <button 
                                        onClick={() => setIsAnnouncementActive(!isAnnouncementActive)}
                                        className={`w-16 h-8 rounded-full transition-colors relative ${isAnnouncementActive ? 'bg-[#FF2D2D]' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform ${isAnnouncementActive ? 'left-1 translate-x-8' : 'left-1'}`}></div>
                                    </button>
                                    <span className="text-white font-bold">{isAnnouncementActive ? 'مُفعل ويظهر للزوار' : 'مخفي'}</span>
                                </div>
                                <button onClick={saveAnnouncement} className="w-full bg-[#FF2D2D] text-black font-black py-4 rounded-xl">حفظ التغييرات</button>
                            </div>
                        </div>
                    )}

                    {/* Tab: Sponsors */}
                    {activeTab === 'sponsors' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">أكواد الخصم والرعاة 💸</h2>
                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                <h3 className="text-xl font-bold text-white mb-6">إضافة راعي جديد</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="اسم الراعي (مثال: G-Fuel)" value={sponsorForm.brand_name} onChange={e => setSponsorForm({...sponsorForm, brand_name: e.target.value})} />
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="كود الخصم (مثال: iABS10)" value={sponsorForm.promo_code} onChange={e => setSponsorForm({...sponsorForm, promo_code: e.target.value})} />
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="وصف الخصم (مثال: خصم 20% على كل المنتجات)" value={sponsorForm.discount_desc} onChange={e => setSponsorForm({...sponsorForm, discount_desc: e.target.value})} />
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="رابط المتجر (URL)" value={sponsorForm.url} onChange={e => setSponsorForm({...sponsorForm, url: e.target.value})} />
                                </div>
                                <button onClick={addSponsor} className="w-full bg-[#FF2D2D] text-black font-black py-4 rounded-xl">إضافة الراعي</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sponsors.map(sp => (
                                    <div key={sp.id} className="bg-[#151515] p-6 rounded-2xl border border-white/5 hover:border-[#FF2D2D]/30 transition-colors flex justify-between items-center group shadow-xl">
                                        <div>
                                            <h4 className="text-xl font-black text-white">{sp.brand_name}</h4>
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <span className="text-sm bg-[#FF2D2D]/10 text-[#FF2D2D] px-3 py-1 rounded-lg font-bold">{sp.promo_code}</span>
                                                <span className="text-white/50 text-sm font-bold">{sp.discount_desc}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteSponsor(sp.id)} className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab: Clips */}
                    {activeTab === 'clips' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">مكتبة اللقطات 🎬</h2>
                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                <h3 className="text-xl font-bold text-white mb-6">إضافة مقطع جديد</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="عنوان المقطع" value={clipForm.title} onChange={e => setClipForm({...clipForm, title: e.target.value})} />
                                    <input className="bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="رابط المقطع (يوتيوب أو تيك توك)" value={clipForm.video_url} onChange={e => setClipForm({...clipForm, video_url: e.target.value})} />
                                    <select className="bg-black border border-white/10 rounded-xl p-4 text-white outline-none" value={clipForm.platform} onChange={e => setClipForm({...clipForm, platform: e.target.value})}>
                                        <option value="youtube">YouTube (Shorts / Video)</option>
                                        <option value="tiktok">TikTok</option>
                                    </select>
                                </div>
                                <button onClick={addClip} className="w-full bg-[#FF2D2D] text-black font-black py-4 rounded-xl">إضافة المقطع للموقع</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clips.map(clip => (
                                    <div key={clip.id} className="bg-[#151515] p-5 rounded-2xl border border-white/5 hover:border-[#FF2D2D]/30 transition-colors flex justify-between items-center gap-4 group shadow-xl">
                                        <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center border border-white/10 text-xl shrink-0">
                                            {clip.platform === 'tiktok' ? '📱' : '📺'}
                                        </div>
                                        <div className="flex-1 truncate">
                                            <h4 className="text-white font-black truncate text-lg">{clip.title}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-white/50 uppercase font-bold bg-black px-2 py-1 rounded-md border border-white/5">{clip.platform}</span>
                                                <a href={clip.video_url} target="_blank" rel="noreferrer" className="text-[#FF2D2D] hover:text-white text-xs font-bold transition-colors">مشاهدة الرابط ↗</a>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteClip(clip.id)} className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab: Schedule */}
                    {activeTab === 'schedule' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">جدول البثوث 📅</h2>
                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">ظهور الجدول للزوار</h3>
                                        <p className="text-white/50 text-sm">يمكنك إخفاء قسم الجدول بالكامل من الموقع بضغطة زر</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newState = !isScheduleActive;
                                            setIsScheduleActive(newState);
                                            const { error } = await supabase.from('announcements').upsert({ id: 2, message: 'schedule_toggle', is_active: newState });
                                            if (error) alert("حدث خطأ أثناء الحفظ: " + error.message);
                                            fetchLive();
                                        }}
                                        className={`w-16 h-8 rounded-full transition-colors relative shrink-0 ${isScheduleActive ? 'bg-[#FF2D2D]' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform ${isScheduleActive ? 'left-1 translate-x-8' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {schedule.map(day => (
                                        <div key={day.id} className="flex flex-col md:flex-row gap-4 items-center bg-black/50 p-4 rounded-2xl border border-white/5">
                                            <div className="w-32 text-center md:text-right font-black text-[#FF2D2D] text-lg">{day.day_name}</div>
                                            <input 
                                                className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-white" 
                                                placeholder="خطة البث (مثال: رول بلاي، إجازة...)" 
                                                defaultValue={day.stream_plan} 
                                                onBlur={e => updateSchedule(day.id, e.target.value, day.time)}
                                            />
                                            <input 
                                                className="w-32 bg-black border border-white/10 rounded-xl p-3 text-white text-center" 
                                                placeholder="الوقت 9:00 PM" 
                                                defaultValue={day.time} 
                                                onBlur={e => updateSchedule(day.id, day.stream_plan, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-white/50 text-xs mt-6 text-center">ملاحظة: يتم الحفظ تلقائياً بمجرد الكتابة والضغط خارج المربع.</p>
                            </div>
                        </div>
                    )}

                    {/* Tab: FAQs */}
                    {activeTab === 'faqs' && (
                        <div className="animate-fade-in-up space-y-8">
                            <h2 className="text-3xl font-black text-white mb-8">الأسئلة الشائعة ❓</h2>
                            <div className="bg-[#151515] p-8 rounded-3xl border border-white/10">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">ظهور الأسئلة للزوار</h3>
                                        <p className="text-white/50 text-sm">يمكنك إخفاء قسم الأسئلة الشائعة بالكامل من الموقع بضغطة زر</p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newState = !isFaqActive;
                                            setIsFaqActive(newState);
                                            const { error } = await supabase.from('announcements').upsert({ id: 3, message: 'faq_toggle', is_active: newState });
                                            if (error) alert("حدث خطأ أثناء الحفظ: " + error.message);
                                            fetchLive();
                                        }}
                                        className={`w-16 h-8 rounded-full transition-colors relative shrink-0 ${isFaqActive ? 'bg-[#FF2D2D]' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform ${isFaqActive ? 'left-1 translate-x-8' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-6">إضافة سؤال جديد</h3>
                                <div className="space-y-4 mb-6">
                                    <input className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="السؤال (مثال: كم عمرك؟)" value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})} />
                                    <textarea className="w-full bg-black border border-white/10 rounded-xl p-4 text-white h-24" placeholder="الإجابة..." value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})} />
                                </div>
                                <button onClick={addFaq} className="w-full bg-[#FF2D2D] text-black font-black py-4 rounded-xl">إضافة السؤال</button>
                            </div>

                            <div className="space-y-4">
                                {faqs.map(faq => (
                                    <div key={faq.id} className="bg-[#151515] p-6 rounded-2xl border border-white/5 hover:border-[#FF2D2D]/30 transition-colors group shadow-xl">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-black text-white mb-2">{faq.question}</h4>
                                                <p className="text-white/50 text-sm font-medium leading-relaxed">{faq.answer}</p>
                                            </div>
                                            <button onClick={() => deleteFaq(faq.id)} className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
