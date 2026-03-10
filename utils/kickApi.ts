const TIMEOUT_MS = 15000;
const MAX_RETRIES = 1; // Reduced for performance on slow net

interface ProxyConfig {
    name: string;
    getUrl: (url: string) => string;
    parse: (res: any) => any;
}

const PROXIES: ProxyConfig[] = [
    {
        name: 'AllOrigins-Get',
        getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (res && res.contents) {
                try { return JSON.parse(res.contents); } catch (e) { return res.contents; }
            }
            return res;
        }
    },
    {
        name: 'CodeTabs',
        getUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        parse: (res) => {
            if (typeof res === 'string') {
                try { return JSON.parse(res); } catch (e) { return res; }
            }
            return res;
        }
    }
];

// Memory for the working proxy to avoid re-testing everything
let workingProxyIndex = -1;

const shuffle = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

export async function kickFetch(endpoint: string, cacheBust = true, attempt = 0): Promise<any> {
    const t = Math.floor(Date.now() / 300000); // 5-minute cache window
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

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const text = await response.text();
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (jsonErr) {
                // If parsing fails, fall back to text so we don't crash entirely if the proxy sent text
                parsed = text;
            }
            const final = proxy.parse(parsed);

            // Cloudflare and Error Page Check
            const content = typeof final === 'string' ? final : JSON.stringify(final);
            if (
                typeof final === 'string' ||
                content.includes('Cloudflare') ||
                content.includes('Just a moment') ||
                content.includes('<body>') ||
                final === null ||
                typeof final !== 'object'
            ) {
                throw new Error('Blocked or Invalid Response');
            }

            clearTimeout(id);
            return final;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    };

    // 1. Try working proxy first if known
    if (workingProxyIndex !== -1) {
        try {
            return await fetchWithTimeout(PROXIES[workingProxyIndex]);
        } catch (e) {
            workingProxyIndex = -1; // Reset if it failed
        }
    }

    // 2. Competitive Proxy Search (Fastest wins)
    try {
        const result = await Promise.any(
            PROXIES.map(async (proxy, index) => {
                const res = await fetchWithTimeout(proxy);
                if (res) {
                    workingProxyIndex = index; // Store for next time
                    return res;
                }
                throw new Error("Empty response");
            })
        );
        if (result) return result;
    } catch (e) {
        // All proxies failed in this attempt
    }

    if (attempt < MAX_RETRIES) {
        return kickFetch(endpoint, cacheBust, attempt + 1);
    }
    return null;
}
