const axios = require('axios');
const path = require('path');
const { httpsAgent } = require('../helpers/MangaDexHelper');

/**
 * Proxy MangaDex cover art through local server to bypass ISP blocking
 */
exports.cover = async (req, res) => {
  const { mangaId, fileName } = req.params;

  if (!mangaId || !fileName) {
    return res.status(404).send('Cover not found');
  }

  const url = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}`;

  try {
    const upstream = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://v1.komikcast.ac/'
      },
      httpsAgent,
      responseType: 'stream',
      timeout: 10000
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');

    upstream.data.pipe(res);
  } catch (error) {
    // If upstream cover fetch fails, serve fallback no-img placeholder
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.redirect('/assets/images/no-img.jpg');
  }
};

/**
 * Optional proxy for chapter images if client browser is blocked
 */
exports.pageProxy = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const upstream = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://v1.komikcast.ac/'
      },
      httpsAgent,
      responseType: 'stream',
      timeout: 12000
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    upstream.data.pipe(res);
  } catch (error) {
    return res.redirect('/assets/images/no-img.jpg');
  }
};

