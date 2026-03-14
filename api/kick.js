export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { endpoint } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint query parameter' });
  }

  try {
    const kickUrl = Array.isArray(endpoint) ? endpoint[0] : endpoint;
    
    // Add realistic User-Agent and headers to avoid Kick/Cloudflare blocking Vercel Datacenter IPs
    const response = await fetch(kickUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    if (!response.ok) {
        // If Vercel IP gets blocked (403), return an explicit message so the frontend knows to skip this proxy immediately.
        return res.status(200).json({ error_blocked: true, status: response.status, message: "Blocked by Cloudflare" });
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      data = text;
    }

    // Set Server-Side Cache Headers (SWR)
    // s-maxage=60: The CDN will cache this response for 60 seconds.
    // stale-while-revalidate=300: Serve stale content for up to 5 minutes while fetching new content in background.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    res.status(200).json(data);
  } catch (error) {
    console.error('Kick API Fetch Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
