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
    
    // Add realistic User-Agent to avoid Kick blocking
    const response = await fetch(kickUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      // Forward the error status
      return res.status(response.status).json({ error: `Kick API responded with status: ${response.status}` });
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
