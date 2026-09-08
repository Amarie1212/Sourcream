const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

exports.index = async (req, res) => {
  try {
    const { show = 'A', page = 1 } = req.query;
    const letter = show.toUpperCase();
    const url = `${GOGO_BASE}/anime-list.html?letter=${encodeURIComponent(letter)}&page=${page}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.anime_list_body ul.listing li a').each((i, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href') || '';
      const slug = href.replace(/^\/?category\//, '').replace(/^\//, '').trim();

      if (slug && title) {
        results.push({
          title,
          slug,
          image: '/assets/images/no-img.jpg',
          genres: ['Anime'],
          releaseDate: 'Available',
          status: 'Sedang Tayang',
          type: title.toLowerCase().includes('(dub)') ? 'DUB' : 'SUB',
          author: 'GogoAnime',
          studio: 'Animation'
        });
      }
    });

    const responseData = { success: true, data: results };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('AnimeAPI Alphabet Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};
