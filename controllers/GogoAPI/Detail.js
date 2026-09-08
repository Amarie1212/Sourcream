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
      return res.status(400).json({ success: false, message: 'Slug diperlukan' });
    }

    const url = `${GOGO_BASE}/category/${slug}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);

    const title = $('.anime_info_body_bg h1').text().trim();
    let imageUrl = $('.anime_info_body_bg img').attr('src') || '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${GOGO_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    let type = 'TV';
    let description = '-';
    let genres = [];
    let releaseDate = '-';
    let status = '-';

    $('.anime_info_body_bg p.type').each((i, el) => {
      const text = $(el).text().trim();
      if (text.startsWith('Type:')) {
        type = $(el).find('a').text().trim() || text.replace('Type:', '').trim();
      } else if (text.startsWith('Plot Summary:')) {
        description = text.replace(/^Plot Summary:\s*/i, '').trim();
      } else if (text.startsWith('Genre:')) {
        $(el).find('a').each((j, g) => genres.push($(g).text().trim()));
      } else if (text.startsWith('Released:')) {
        releaseDate = text.replace(/^Released:\s*/i, '').trim();
      } else if (text.startsWith('Status:')) {
        status = $(el).find('a').text().trim() || text.replace('Status:', '').trim();
      }
    });

    const episodesList = [];
    $('#episode_related li a').each((i, el) => {
      const epName = $(el).find('.name').text().trim() || `Episode ${i + 1}`;
      const epSlug = $(el).attr('href')?.replace(/^\//, '').trim() || '';
      if (epSlug) {
        episodesList.push({
          title: epName.toUpperCase().startsWith('EP') ? epName.replace(/^EP\s*/i, 'Episode ') : epName,
          slug: epSlug
        });
      }
    });

    // Sort episodes ascending (1 to N)
    episodesList.sort((a, b) => {
      const matchA = a.slug ? a.slug.match(/episode-(\d+(\.\d+)?)/i) : null;
      const matchB = b.slug ? b.slug.match(/episode-(\d+(\.\d+)?)/i) : null;
      const numA = matchA ? parseFloat(matchA[1]) : 0;
      const numB = matchB ? parseFloat(matchB[1]) : 0;
      return numA - numB;
    });

    const results = {
      title,
      slug,
      imageUrl,
      description,
      status,
      releaseDate,
      type: title.toLowerCase().includes('(dub)') ? 'ANIME (DUB)' : 'ANIME (SUB)',
      episodes: episodesList.length.toString(),
      duration: '24 Min',
      author: 'GogoAnime',
      studio: 'Animation Studio',
      season: releaseDate,
      updatedAt: 'Recently',
      genres: genres.join(', '),
      episodesList
    };

    const responseData = { success: true, data: results };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('GogoAPI Detail Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail anime dari Gogoanime' });
  }
};
