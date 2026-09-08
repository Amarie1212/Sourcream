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

    const cleanSlug = (urlStr) => {
      if (!urlStr) return null;
      let s = urlStr.replace(/^https?:\/\/[^\/]+/i, '').replace(/^\/|\/$/g, '');
      s = s.replace(/^manga\//, '').replace(/^chapter\//, '');
      return s || null;
    };

    let prevUrl = $('a[aria-label="Prev"]').attr('href')
      || $('a.rl').filter((i, el) => $(el).find('.fa-caret-left, svg[class*="caret-left"]').length > 0).attr('href')
      || $('a.buttprev, a.prev').attr('href');

    let nextUrl = $('a[aria-label="Next"]').attr('href')
      || $('a.buttnext').attr('href')
      || $('a.rl').filter((i, el) => $(el).find('.fa-caret-right, svg[class*="caret-right"]').length > 0).attr('href')
      || $('a.next').attr('href');

    let comicUrl = $('.nxpr a[href*="/manga/"]').attr('href')
      || $('a').filter((i, el) => $(el).text().includes('Daftar Chapter')).attr('href');

    const prevChapter = cleanSlug(prevUrl);
    const nextChapter = cleanSlug(nextUrl);
    const comicSlug = cleanSlug(comicUrl);

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
      prevChapter,
      nextChapter,
      comicSlug,
      data: results
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data dari sumber' });
  }
};
