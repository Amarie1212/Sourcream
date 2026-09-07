const axios = require('axios');
const cheerio = require('cheerio');
const { setCache } = require('../../middlewares/CacheAPI');
const { ProtocolFallback } = require('../../helpers/ProtocolHelper');

exports.index = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ success: false, message: 'Parameter slug diperlukan' });
  }

  try {
    const url = `komiku.org/${slug}`;
    const html = await ProtocolFallback(url);
    const $ = cheerio.load(html);

    const title = $('#Judul h1').text().trim() 
      || $('h1').first().text().trim() 
      || $('title').text().replace(/[-–|]\s*komiku.*$/i, '').trim()
      || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const results = [];

    $('#Baca_Komik img').each((index, element) => {
      const imgSrc = $(element).attr('src') || $(element).attr('data-src');
      const altText = $(element).attr('alt') || `Page ${index + 1}`;

      if (imgSrc) {
        results.push({ img: imgSrc, alt: altText });
      }
    });

    const responseData = { 
      success: true, 
      title,
      data: results
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data dari sumber' });
  }
};
