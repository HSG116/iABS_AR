
const TIMEOUT_MS = 15000; // Increased to 15 seconds for slow networks
const MAX_RETRIES = 2;

interface ProxyConfig {
    name: string;
    getUrl: (url: string) => string;
    parse: (res: any) => any;
}

const PROXIES: ProxyConfig[] = [
    {
        name: 'CORS-io',
        getUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    {
        name: 'AllOrigins-Raw',
        // Using /raw to get direct string which bypasses some JSON wrapping issues
        getUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (typeof res === 'string') {
                try { return JSON.parse(res); } catch (e) { return res; }
            }
            return res;
        }
    },
    {
        name: 'CodeTabs',
        getUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        parse: (res) => res
    },
    {
        name: 'IsItDown-Proxy',
        getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (!res || !res.contents) return null;
            try {
                const parsed = JSON.parse(res.contents);
                return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            } catch (e) { return res.contents; }
        }
    }
];

const shuffle = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

export async function kickFetch(endpoint: string, cacheBust = true, attempt = 0): Promise<any> {
    const t = Math.floor(Date.now() / 3600); // Identical cache for 1 hour to help proxy caching
    const url = cacheBust
        ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${t}`
        : endpoint;

    const fetchWithTimeout = async (proxy: ProxyConfig) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            console.log(`[KickAPI] Trying ${proxy.name} for ${endpoint}...`);
            const response = await fetch(proxy.getUrl(url), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            clearTimeout(id);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            if (!text || text.length < 10) throw new Error('Empty response');

            let parsedData;
            try {
                parsedData = JSON.parse(text);
            } catch (e) {
                // If it's not JSON, it might be RAW HTML or direct data from /raw
                if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    throw new Error('Incomplete JSON');
                }
                parsedData = text;
            }

            const final = proxy.parse(parsedData);

            // Check for Cloudflare blocks
            const isBlocked = (p: any) => {
                const content = typeof p === 'string' ? p : JSON.stringify(p);
                if (content.includes('Cloudflare') || content.includes('Just a moment') || content.includes('challenge-running')) {
                    return true;
                }
                return false;
            };

            if (isBlocked(final)) {
                console.warn(`[KickAPI] ${proxy.name} blocked by Cloudflare`);
                throw new Error('Blocked');
            }

            console.log(`[KickAPI] ${proxy.name} SUCCESS!`);
            return final;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    };

    try {
        // Parallel Race for speed
        const shuffled = shuffle(PROXIES);
        return await Promise.any(shuffled.map(proxy => fetchWithTimeout(proxy)));
    } catch (err) {
        // Serial Fallback with shuffling
        const shuffledProxies = shuffle(PROXIES);
        for (const proxy of shuffledProxies) {
            try {
                const res = await fetchWithTimeout(proxy);
                if (res) return res;
            } catch (e) { }
        }

        if (attempt < MAX_RETRIES) {
            console.log(`[KickAPI] All proxies failed. Retrying attempt ${attempt + 1}...`);
            await new Promise(r => setTimeout(r, 2000));
            return kickFetch(endpoint, cacheBust, attempt + 1);
        }

        console.error(`[KickAPI] Critical Failure: No proxy could reach Kick. Check internet or if Kick changed protection.`);
        return null;
    }
}

