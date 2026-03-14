const TIMEOUT_MS = 6000; // 6s timeout for very fast proxy failover
const MAX_RETRIES = 1;

interface ProxyConfig {
    name: string;
    getUrl: (url: string) => string;
    parse: (res: any) => any;
}

const PROXIES: ProxyConfig[] = [
    // Primary: Backend API Gateway (Vercel Serverless / Vite Local Proxy)
    {
        name: 'BackendProxy',
        getUrl: (url) => `/api/kick?endpoint=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    // Fallback 1: CORS Proxy IO (Very Fast)
    {
        name: 'CorsProxy',
        getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    // Fallback 2: AllOrigins Raw
    {
        name: 'AllOrigins-Raw',
        getUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    // Fallback 3: AllOrigins Wrapped (Slowest, but reliable)
    {
        name: 'AllOrigins',
        getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (res && res.contents) {
                try { return JSON.parse(res.contents); } catch (e) { return res.contents; }
            }
            return res;
        }
    }
];

// Persistent Cache for SWR (Stale-While-Revalidate)
const CACHE_TTL = 300000; // 5 minutes fresh
const MAX_STALE = 86400000; // 24 hours stale

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
    Object.keys(parsed).forEach(k => {
        if (now - parsed[k].timestamp > MAX_STALE) delete parsed[k]; // Clear deeply stale data
    });
    return parsed;
})();

const saveCache = () => {
    try { localStorage.setItem('kick_api_cache', JSON.stringify(apiCache)); } catch (e) { }
};

// Deduplicate identical requests running at the same time
const fetchCache: Record<string, Promise<any>> = {};

export async function kickFetch(
    endpoint: string,
    cacheBust = true,
    attempt = 0,
    onStaleUpdate?: (data: any) => void
): Promise<any> {
    const t = Math.floor(Date.now() / 600000); // 10-min window for proxy cache busting
    const url = cacheBust
        ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${t}`
        : endpoint;

    const now = Date.now();
    const cachedItem = apiCache[endpoint]; // Key cache by base endpoint

    if (cachedItem) {
        const age = now - cachedItem.timestamp;
        
        // Cache is fresh
        if (age < CACHE_TTL) {
            console.log(`[kickFetch] Cache Hit (Fresh): ${endpoint}`);
            return cachedItem.data;
        }
        
        // Cache is stale -> Return stale immediately, but fetch new data silently
        if (onStaleUpdate && age < MAX_STALE) {
            console.log(`[kickFetch] Cache Hit (Stale - Revalidating): ${endpoint}`);
            doFetch(endpoint, url, attempt).then(newData => {
                if (newData) onStaleUpdate(newData);
            }).catch(() => {});
            return cachedItem.data;
        }
    }

    return await doFetch(endpoint, url, attempt);
}

async function doFetch(endpoint: string, url: string, attempt: number): Promise<any> {
    if (fetchCache[endpoint]) {
        console.log(`[kickFetch] Deduplicating request: ${endpoint}`);
        return fetchCache[endpoint];
    }

    const fetchTask = async () => {
        const fetchFromProxy = async (proxy: ProxyConfig) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                const response = await fetch(proxy.getUrl(url), {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) throw new Error("HTTP Fail");
                const text = await response.text();
                
                // Safe JSON Parsing to avoid unhandled crashes
                let parsedPayload;
                try {
                    parsedPayload = text.length < 5 ? text : JSON.parse(text);
                } catch (e) {
                    parsedPayload = text; // Pass as raw string if JSON parsing fails 
                }

                const final = proxy.parse(parsedPayload);

                // If the final payload isn't an object, JSON parsing essentially failed on the target data
                if (!final || typeof final !== 'object') throw new Error("Invalid Format");

                const content = JSON.stringify(final);
                if (content.includes('Cloudflare') || content.includes('Request blocked') || content.includes('needs to review the security')) {
                    throw new Error("Blocked");
                }

                clearTimeout(id);
                return final;
            } catch (err) {
                clearTimeout(id);
                throw err;
            }
        };

        try {
            // Race all proxies to guarantee the fastest delivery
            const result = await Promise.any(PROXIES.map(p => fetchFromProxy(p)));

            if (result) {
                apiCache[endpoint] = { data: result, timestamp: Date.now() };
                saveCache();
                return result;
            }
        } catch (e) {
            if (attempt < MAX_RETRIES) {
                console.warn(`[kickFetch] Proxies failed, retrying once...`);
                return await doFetch(endpoint, url, attempt + 1);
            }
        }

        console.error(`[kickFetch] ❌ All fetch attempts failed for ${endpoint}`);
        return null; // Don't throw to prevent unhandled rejections that break UI
    };

    const promise = fetchTask().finally(() => {
        delete fetchCache[endpoint];
    });
    
    fetchCache[endpoint] = promise;
    return promise;
}
