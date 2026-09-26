import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'local-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // ---- /api/groq : نفس سلوك سيرفر Vercel لكن محلياً (npm run dev) ----
            if (req.url && (req.url === '/api/groq' || req.url.startsWith('/api/groq?'))) {
              if (req.method === 'OPTIONS') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                res.statusCode = 204;
                res.end();
                return;
              }
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end(JSON.stringify({ error: 'Use POST' }));
                return;
              }
              try {
                const chunks: Buffer[] = [];
                for await (const c of req) chunks.push(c as Buffer);
                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
                const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
                if (!messages.length) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'messages array is required' }));
                  return;
                }

                // المفاتيح من .env المحلي (نفس أسماء Vercel)
                const keys: string[] = [];
                for (const n of ['1', '2', '3', '4', '5']) {
                  const k = env[`GROQ_API_KEY_${n}`];
                  if (k && k.trim()) keys.push(k.trim());
                }
                const combined = env.GROQ_API_KEYS || env.VITE_GROQ_API_KEYS;
                if (combined) {
                  for (const k of String(combined).split(',')) {
                    const t = k.trim();
                    if (t && !keys.includes(t)) keys.push(t);
                  }
                }
                if (!keys.length) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'No GROQ keys in local .env (GROQ_API_KEY_1..3)' }));
                  return;
                }

                const models = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'allam-2-7b'];
                const clean = messages
                  .filter((m: any) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
                  .slice(-20)
                  .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 6000) }));

                let lastErr = '';
                for (let k = 0; k < keys.length; k++) {
                  for (const model of models) {
                    try {
                      const controller = new AbortController();
                      const t = setTimeout(() => controller.abort(), 25000);
                      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys[k]}` },
                        body: JSON.stringify({ model, messages: clean, max_tokens: 1024, temperature: 0.7 }),
                        signal: controller.signal,
                      });
                      clearTimeout(t);
                      if (r.status === 401) { lastErr = `key${k + 1} unauthorized`; break; }
                      if (!r.ok) { lastErr = `key${k + 1}/${model} HTTP ${r.status}`; continue; }
                      const j: any = await r.json();
                      const reply = j?.choices?.[0]?.message?.content?.trim();
                      if (reply) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 200;
                        res.end(JSON.stringify({ reply, model, keyIndex: k + 1 }));
                        return;
                      }
                      lastErr = `key${k + 1}/${model} empty reply`;
                    } catch (err: any) {
                      lastErr = `key${k + 1}/${model} fail`;
                    }
                  }
                }
                res.statusCode = 502;
                res.end(JSON.stringify({ error: 'All GROQ keys/models failed', details: lastErr }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
              return;
            }
            if (req.url && req.url.startsWith('/api/kick')) {
              // Parse the URL
              const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const endpoint = url.searchParams.get('endpoint');
              
              if (!endpoint) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing endpoint' }));
                return;
              }
              
              try {
                const targetUrl = Array.isArray(endpoint) ? endpoint[0] : endpoint;
                
                // Use built-in Node.js fetch (Node 18+)
                const response = await fetch(targetUrl, {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                  }
                });
                
                const text = await response.text();
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.statusCode = response.status;
                res.end(text);
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
