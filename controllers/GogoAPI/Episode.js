const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

exports.index = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug episode diperlukan' });
    }

    const url = `${GOGO_BASE}/${slug}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);

    const title = $('h1').text().trim();
    let videoEmbedUrl = $('div.play-video iframe').attr('src') || '';
    if (videoEmbedUrl.startsWith('//')) {
      videoEmbedUrl = `https:${videoEmbedUrl}`;
    }

    const description = $('.description').text().trim() || $('.anime_video_body p').text().trim() || '-';
    
    // Extract anime series reference
    const rawAnimeHref = $('.anime-info a').attr('href') || $('a[href*="/category/"]').attr('href') || '';
    const animeSlug = rawAnimeHref.replace(/^\/?category\//, '').replace(/^\//, '').trim() || slug.replace(/-episode-\d+.*$/, '');
    const animeTitle = $('.anime-info a').text().trim() || $('a[href*="/category/"]').first().text().trim() || animeSlug.replace(/-/g, ' ').toUpperCase();

    // Extract servers
    const servers = [];
    $('.anime_muti_link ul li a').each((i, el) => {
      let vUrl = $(el).attr('data-video') || '';
      if (vUrl.startsWith('//')) vUrl = `https:${vUrl}`;
      servers.push({
        name: $(el).text().replace('Choose this server', '').trim(),
        url: vUrl
      });
    });

    // Compute prev and next episode
    let prevEpisode = null;
    let nextEpisode = null;
    const epMatch = slug.match(/^(.*)-episode-(\d+(\.\d+)?)$/i);
    if (epMatch) {
      const prefix = epMatch[1];
      const epNum = parseFloat(epMatch[2]);
      if (epNum > 1) {
        prevEpisode = `${prefix}-episode-${epNum - 1}`;
      }
      nextEpisode = `${prefix}-episode-${epNum + 1}`;
    }

    const results = {
      title,
      slug,
      animeSlug,
      animeTitle,
      description,
      videoEmbedUrl,
      servers,
      prevEpisode,
      nextEpisode
    };

    const responseData = { success: true, data: results };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('GogoAPI Episode Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil episode dari Gogoanime' });
  }
};
