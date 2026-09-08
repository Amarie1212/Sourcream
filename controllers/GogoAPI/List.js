const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

exports.index = async (req, res) => {
  try {
    const { order = 'default' } = req.query;
    const page = parseInt(req.query.page) || 1;

    let results = [];

    if (order === 'populer') {
      // 1. TERPOPULER: Scrape popular new-season anime from Gogoanime
      const url = `${GOGO_BASE}/new-season.html?page=${page}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('.last_episodes ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }

        const released = $(el).find('.released').text().replace(/^Updated:\s*/i, '').trim();
        const isDub = rawTitle.toLowerCase().includes('(dub)');

        if (slug && rawTitle) {
          results.push({
            title: rawTitle,
            slug,
            image,
            episodes: released || 'Ongoing',
            status: isDub ? 'Dub' : 'Sub',
            type: isDub ? 'DUB' : 'TV'
          });
        }
      });

    } else if (order === 'peringkat' || order === 'rating') {
      // 2. TOP RATING / PERINGKAT: Scrape top rated anime movies & masterpieces
      const url = `${GOGO_BASE}/anime-movies.html?page=${page}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('.last_episodes ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }

        const isDub = rawTitle.toLowerCase().includes('(dub)');

        if (slug && rawTitle) {
          results.push({
            title: rawTitle,
            slug,
            image,
            episodes: 'Top Rating',
            status: 'Top Rated',
            type: isDub ? 'DUB' : 'MOVIE'
          });
        }
      });

    } else {
      // 3. RILIS TERBARU (Baru / Publikasi / Default): Scrape live newly released episodes
      const url = `${GOGO_BASE}/ajax/page-recent-release?page=${page}&type=1`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${GOGO_BASE}/`
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const epSlug = rawHref.replace(/^\//, '').trim();
        // Derive anime series slug for detail page routing
        const animeSlug = epSlug.replace(/-episode-\d+.*$/, '');

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }
        const episodes = $(el).find('.episode').text().trim();
        const isDub = rawTitle.toLowerCase().includes('(dub)');

        if (animeSlug && rawTitle) {
          results.push({
            title: rawTitle,
            slug: animeSlug,
            episodeSlug: epSlug,
            image,
            episodes,
            status: isDub ? 'Dub' : 'Sub',
            type: isDub ? 'DUB' : 'SUB'
          });
        }
      });
    }

    const responseData = { success: true, data: results, page };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('List Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};
