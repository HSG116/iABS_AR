const TIMEOUT_MS = 8000; // 8 ثواني كحد أقصى للطلب

// كاش محلي لتسريع الموقع وتخفيف الطلبات
const getCache = () => {
    try {
        const saved = localStorage.getItem('kick_api_cache');
        if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {};
};

const apiCache: Record<string, { data: any, timestamp: number }> = (() => {
    const parsed = getCache();
    const now = Date.now();
    // تنظيف الكاش القديم (أقدم من 10 دقائق)
    Object.keys(parsed).forEach(k => {
        if (now - parsed[k].timestamp > 600000) delete parsed[k]; 
    });
    return parsed;
})();

const saveCache = () => {
    try { localStorage.setItem('kick_api_cache', JSON.stringify(apiCache)); } catch (e) { }
};

// البروكسيات الموثوقة بالترتيب (بدون إرسال طلبات عشوائية)
const PROXY_URLS = [
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
];

export async function kickFetch(endpoint: string, cacheBust = true): Promise<any> {
    const cachedItem = apiCache[endpoint];
    
    // إذا كان لدينا كاش صالح (أقل من 3 دقائق)، نعرضه فوراً لمنع التعليق
    if (cachedItem && (Date.now() - cachedItem.timestamp < 180000)) {
        console.log(`[Cache Hit] ${endpoint}`);
        return cachedItem.data;
    }

    const t = Math.floor(Date.now() / 60000); 
    const url = cacheBust ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${t}` : endpoint;

    // سنجرب البروكسيات واحداً تلو الآخر وليس في نفس الوقت لمنع تجمد المتصفح
    for (let i = 0; i < PROXY_URLS.length; i++) {
        const proxyUrl = PROXY_URLS[i](url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue; // إذا فشل، جرب البروكسي اللي بعده

            const text = await response.text();
            let data;
            
            try {
                data = JSON.parse(text);
            } catch (e) {
                continue; // إذا لم يكن JSON صحيح، جرب البروكسي اللي بعده
            }

            // AllOrigins يرجع البيانات داخل contents
            const finalData = proxyUrl.includes('allorigins') && data.contents 
                ? JSON.parse(data.contents) 
                : data;

            const contentStr = JSON.stringify(finalData);
            if (contentStr.includes('Cloudflare') || contentStr.includes('Just a moment')) {
                continue; // إذا تم حظرنا من كلاود فلير، جرب البروكسي الآخر
            }

            // نجاح! نحفظ في الكاش ونرجع البيانات
            apiCache[endpoint] = { data: finalData, timestamp: Date.now() };
            saveCache();
            return finalData;

        } catch (err) {
            clearTimeout(timeoutId);
            // تجاهل الخطأ وانتقل للبروكسي التالي
        }
    }

    // في حال فشل كل شيء، نرجع البيانات القديمة من الكاش إن وجدت (كي لا يظهر Skeleton للأبد)
    if (cachedItem) return cachedItem.data;
    
    // إذا لم يكن هناك كاش وفشل الاتصال، نرجع null لكي تختفي السكيلتون وتظهر كلمة "لا توجد بيانات"
    return null; 
}
