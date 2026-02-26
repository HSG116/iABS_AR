
const TIMEOUT_MS = 12000; // Increased to 12 seconds
const MAX_RETRIES = 2; // Total of 3 attempts

interface ProxyConfig {
    name: string;
    getUrl: (url: string) => string;
    parse: (res: any) => any;
}

const PROXIES: ProxyConfig[] = [
    {
        name: 'corsproxy.io',
        getUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    {
        name: 'allorigins-raw',
        getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (!res || !res.contents) return null;
            try {
                const parsed = JSON.parse(res.contents);
                return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            } catch (e) { return res.contents; }
        }
    },
    {
        name: 'codetabs',
        getUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    {
        name: 'thingproxy',
        getUrl: (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
        parse: (res) => res
    }
];

// Helper to shuffle array
const shuffle = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

export async function kickFetch(endpoint: string, cacheBust = true, attempt = 0): Promise<any> {
    const t = Math.floor(Date.now() / 1000);
    const url = cacheBust
        ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${t}`
        : endpoint;

    const fetchWithTimeout = async (proxy: ProxyConfig) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(proxy.getUrl(url), {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(id);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    throw new Error('Incomplete JSON');
                }
                return text;
            }

            const parsed = proxy.parse(json);
            if (!parsed) throw new Error('Empty after parse');

            // Check for Cloudflare/Forbidden blocks
            const isBlocked = (p: any) => {
                if (!p) return false;
                if (p.status === 403 || p.message === 'Forbidden') return true;
                if (typeof p === 'string' && (p.includes('Cloudflare') || p.includes('Just a moment'))) return true;
                return false;
            };

            if (isBlocked(parsed)) {
                throw new Error('Blocked');
            }

            return parsed;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    };

    try {
        // 1. Try Parallel Race first (Fastest)
        return await Promise.any(PROXIES.map(proxy => fetchWithTimeout(proxy)));
    } catch (err) {
        // 2. Serial Fallback with shuffled proxies
        const shuffledProxies = shuffle(PROXIES);
        for (const proxy of shuffledProxies) {
            try {
                const res = await fetchWithTimeout(proxy);
                if (res) return res;
            } catch (e) { }
        }

        // 3. Retry logic if internet is weak
        if (attempt < MAX_RETRIES) {
            const delay = 1000 * (attempt + 1); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return kickFetch(endpoint, cacheBust, attempt + 1);
        }

        return null;
    }
}

