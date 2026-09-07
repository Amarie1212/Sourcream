const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function ProtocolFallback(rawUrl) {
  const protocols = ['https://', 'http://'];

  for (const proto of protocols) {
    const fullUrl = proto + rawUrl;
    try {
      const response = await axios.get(fullUrl, {
        httpsAgent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.warn(`Access failed: ${fullUrl}`);
    }
  }

  throw new Error('Failed to retrieve data from all URLs');
}

module.exports = {
  ProtocolFallback
};

