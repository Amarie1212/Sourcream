const cheerio = require('cheerio');
const { setCache } = require('../../middlewares/CacheAPI');
const { ProtocolFallback } = require('../../helpers/ProtocolHelper');

exports.index = async (req, res) => {
    const { show = 'A', page = 1 } = req.query;
    
    try {
        const url = `komiku.org/daftar-komik/?huruf=${encodeURIComponent(show)}&halaman=${page}`;
        const html = await ProtocolFallback(url);
        const $ = cheerio.load(html);

        const list = [];
        $('.manga-card').each((i, element) => {
            const linkElem = $(element).find('h4 a').length ? $(element).find('h4 a') : $(element).find('a');
            const slug = linkElem.attr('href')?.replace(/^https?:\/\/komiku\.org\/manga\//, '')
                .replace(/^\/manga\//, '')
                .replace(/\/$/, '') || '';
            const title = linkElem.text().trim();
            const imgElem = $(element).find('img');
            const image = imgElem.attr('data-src') || imgElem.attr('src') || '';
            const metaText = $(element).find('.meta').text().replace(/\s+/g, ' ').trim();
            
            let type = 'Manga';
            if (metaText.includes('Manhwa')) type = 'Manhwa';
            else if (metaText.includes('Manhua')) type = 'Manhua';
            else if (metaText.includes('Manga')) type = 'Manga';

            const statusMatch = metaText.match(/Status:\s*([a-zA-Z]+)/i);
            const status = statusMatch ? statusMatch[1] : '';

            list.push({
                title,
                slug,
                image,
                type,
                status,
                meta: metaText
            });
        });

        const responseData = { success: true, data: list };
        setCache(res.cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Komik Alphabet API Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load data.' });
    }
};
