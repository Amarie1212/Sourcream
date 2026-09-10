const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');
const { resolvePoster } = require('./List');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';
const NUMBERED_FALLBACKS = [
  ['+Himitsu no AiPri 3rd Season', 'himitsu-no-aipri-3rd-season'],
  ['0 Years Old Child Starting Dash Story Season 2', '0-years-old-child-starting-dash-story-season-2'],
  ['0-saiji Start Dash Monogatari', '0-saiji-start-dash-monogatari'],
  ['100 Meters', '100-meters'],
  ['100,000 Levels of Body Refining', '100-000-levels-of-body-refining-all-the-dogs-i-raise-are-the-emperor'],
  ['2.5 Dimensional Seduction', '2-5-dimensional-seduction'],
  ['86 Eighty-Six', '86-eighty-six']
];

async function enrichWithPosters(items) {
  const enriched = [];
  const batchSize = 8;
  const posterHosts = [GOGO_BASE, 'https://www.gogoanime.is'];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(async item => {
      for (const host of posterHosts) {
        try {
          const response = await axios.get(`${host}/category/${item.slug}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
            },
            httpsAgent,
            timeout: 6000
          });
          const detailPage = cheerio.load(response.data);
          let image = detailPage('.anime_info_body_bg img').attr('src') || '';
          if (image && !image.startsWith('http')) {
            image = `${host}${image.startsWith('/') ? '' : '/'}${image}`;
          }
          if (image) return { ...item, image: resolvePoster(item.slug, image) };
        } catch (error) {
          // Try the alternate host before falling back to the known poster map.
        }
      }
      return { ...item, image: resolvePoster(item.slug, '') || '/assets/images/no-img.jpg' };
    }));
    enriched.push(...batchResults);
  }

  return enriched;
}

exports.index = async (req, res) => {
  try {
    const { show = 'A', page = 1 } = req.query;
    const letter = show.toUpperCase();
    const sourceLetter = letter === '#' ? '0' : letter;
    const url = `${GOGO_BASE}/anime-list-${encodeURIComponent(sourceLetter)}.html?page=${page}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.anime_list_body ul.listing li a, ul.listing li a, ul.items li a').each((i, el) => {
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

    const filteredResults = results.filter(item => {
      const title = item.title.trim();
      if (letter === '#') return !/^[A-Za-z]/.test(title);
      return /^[A-Za-z]/.test(title) && title.charAt(0).toUpperCase() === letter;
    });
    if (letter === '#' && filteredResults.length === 0) {
      NUMBERED_FALLBACKS.forEach(([title, slug]) => {
        filteredResults.push({
          title,
          slug,
          image: '/assets/images/no-img.jpg',
          genres: ['Anime'],
          releaseDate: 'Available',
          status: 'Sedang Tayang',
          type: 'SUB',
          author: 'GogoAnime',
          studio: 'Animation'
        });
      });
    }
    const uniqueResults = [];
    const seenTitles = new Set();
    filteredResults.forEach(item => {
      const baseTitle = item.title
        .replace(/\s*\((?:dub|sub)\)\s*$/i, '')
        .trim()
        .toLowerCase();
      if (!seenTitles.has(baseTitle)) {
        seenTitles.add(baseTitle);
        uniqueResults.push(item);
      }
    });
    const enrichedResults = await enrichWithPosters(uniqueResults);
    const responseData = { success: true, data: enrichedResults };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('AnimeAPI Alphabet Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};
