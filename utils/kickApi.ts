const TIMEOUT_MS = 8000;

const getCache = () => {
    try {
        // غيرنا اسم الكاش هنا لنجبر المتصفح على مسح البيانات الوهمية القديمة
        const saved = localStorage.getItem('kick_api_cache_v3');
        if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {};
};

const apiCache: Record<string, { data: any, timestamp: number }> = (() => {
    const parsed = getCache();
    const now = Date.now();
    Object.keys(parsed).forEach(k => {
        if (now - parsed[k].timestamp > 180000) delete parsed[k]; // 3 دقائق
    });
    return parsed;
})();

const saveCache = () => {
    try { localStorage.setItem('kick_api_cache_v3', JSON.stringify(apiCache)); } catch (e) { }
};

// بروكسيات أقوى بكثير في تخطي حماية كيك
const PROXY_URLS =[
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

export async function kickFetch(endpoint: string, cacheBust = true): Promise<any> {
    const cachedItem = apiCache[endpoint];
    
    if (cachedItem && (Date.now() - cachedItem.timestamp < 180000)) {
        return cachedItem.data;
    }

    const t = Math.floor(Date.now() / 60000); 
    const url = cacheBust ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${t}` : endpoint;

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

            if (!response.ok) continue;

            const text = await response.text();
            
            // التأكد من أن الرد ليس صفحة حماية من كلاود فلير
            if (text.includes('Cloudflare') || text.includes('Just a moment') || text.includes('<html')) {
                continue;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                continue; 
            }

            // أحياناً كيك يرسل البيانات داخل غلاف اسمه data، هذا السطر يحل المشكلة
            const finalData = data.data ? data.data : data;

            // نجاح!
            apiCache[endpoint] = { data: finalData, timestamp: Date.now() };
            saveCache();
            return finalData;

        } catch (err) {
            clearTimeout(timeoutId);
        }
    }

    if (cachedItem) return cachedItem.data;
    return null; 
}
