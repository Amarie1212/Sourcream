const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

exports.index = async (req, res) => {
  try {
    const { q = '', page = 1 } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const url = `${GOGO_BASE}/search.html?keyword=${encodeURIComponent(q)}&page=${page}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.last_episodes ul.items li').each((i, el) => {
      const title = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
      const href = $(el).find('.name a').attr('href') || '';
      const slug = href.replace(/^\/?category\//, '').replace(/^\//, '').trim();
      let image = $(el).find('.img img').attr('src') || '';
      if (image && !image.startsWith('http')) {
        image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
      }
      const released = $(el).find('.released').text().trim();
      const isDub = title.toLowerCase().includes('(dub)');

      results.push({
        title,
        slug,
        image,
        episodes: released || 'Anime',
        status: 'Available',
        type: isDub ? 'DUB' : 'SUB'
      });
    });

    const responseData = { success: true, data: results, query: q, page };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('GogoAPI Search Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mencari anime dari Gogoanime' });
  }
};
