const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

exports.index = async (req, res) => {
  try {
    const { genre = "action", page = 1 } = req.query;
    const genreMap = {
      'aksi': 'action',
      'anak-anak': 'kids',
      'luar-angkasa': 'space',
      'dimensia': 'dementia',
      'sihir': 'magic',
      'olahraga': 'sports',
      'misteri': 'mystery',
      'kehidupan-sekolah': 'school',
      'romantis': 'romance',
      'petualangan': 'adventure',
      'komedi': 'comedy',
      'fantasi': 'fantasy',
      'horor': 'horror',
      'supranatural': 'supernatural',
      'psikologis': 'psychological'
    };
    const cleanGenre = genreMap[genre.toLowerCase()] || genre.toLowerCase().replace(/\s+/g, '-');
    const url = `${GOGO_BASE}/genre/${encodeURIComponent(cleanGenre)}?page=${page}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      httpsAgent,
      timeout: 12000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.last_episodes ul.items li').each((i, element) => {
      const title = $(element).find('.name a').attr('title') || $(element).find('.name a').text().trim();
      const rawHref = $(element).find('.name a').attr('href') || '';
      const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

      let image = $(element).find('.img img').attr('src') || '';
      if (image && !image.startsWith('http')) {
        image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
      }

      const released = $(element).find('.released').text().replace(/^Released:\s*/i, '').trim();
      const isDub = title.toLowerCase().includes('(dub)');

      if (slug && title) {
        results.push({
          title,
          slug,
          image,
          episodes: released || 'Available',
          status: isDub ? 'Dub' : 'Sub',
          type: isDub ? 'DUB' : 'TV'
        });
      }
    });

    const responseData = { success: true, data: results };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('AnimeAPI Filter error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

exports.Order = async (req, res) => {
  try {
    const data = [
      { slug: "default", title: "Standar" },
      { slug: "abjad", title: "Judul A-Z" },
      { slug: "dari-z", title: "Judul Z-A" },
      { slug: "update", title: "Baru Diupdate" },
      { slug: "publikasi", title: "Baru Ditambah" },
      { slug: "populer", title: "Terpopuler" },
      { slug: "baru", title: "Rilis Terbaru" },
      { slug: "lama", title: "Rilis Terlawas" },
      { slug: "rating", title: "Peringkat" }
    ];
    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

exports.Type = async (req, res) => {
  try {
    const data = [
      { slug: "", title: "Semua" },
      { slug: "TV", title: "TV" },
      { slug: "Movie", title: "Movie" },
      { slug: "OVA", title: "OVA" },
      { slug: "ONA", title: "ONA" },
      { slug: "Special", title: "Special" },
      { slug: "Music", title: "Music" }
    ];
    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

exports.Genre = async (req, res) => {
  try {
    const data = [
      { slug: "aksi", title: "Aksi" },
      { slug: "anak-anak", title: "Anak-Anak" },
      { slug: "luar-angkasa", title: "Antariksa" },
      { slug: "avant-garde", title: "Avant Garde" },
      { slug: "dementia", title: "Dimensia" },
      { slug: "donghua", title: "Donghua" },
      { slug: "drama", title: "Drama" },
      { slug: "ecchi", title: "Ecchi" },
      { slug: "fantasi", title: "Fantasi" },
      { slug: "game", title: "Game" },
      { slug: "harem", title: "Harem" },
      { slug: "historis", title: "Historis" },
      { slug: "horor", title: "Horor" },
      { slug: "isekai", title: "Isekai" },
      { slug: "josei", title: "Josei" },
      { slug: "kehidupan-sekolah", title: "Kehidupan Sekolah" },
      { slug: "komedi", title: "Komedi" },
      { slug: "magis", title: "Magis" },
      { slug: "mecha", title: "Mecha" },
      { slug: "misteri", title: "Misteri" },
      { slug: "musik", title: "Musik" },
      { slug: "olahraga", title: "Olahraga" },
      { slug: "parodi", title: "Parodi" },
      { slug: "petualangan", title: "Petualangan" },
      { slug: "psikologis", title: "Psikologis" },
      { slug: "reinkarnasi", title: "Reinkarnasi" },
      { slug: "romantis", title: "Romantis" },
      { slug: "samurai", title: "Samurai" },
      { slug: "seinen", title: "Seinen" },
      { slug: "shoujo", title: "Shoujo" },
      { slug: "shounen", title: "Shounen" },
      { slug: "slice-of-life", title: "Slice of Life" },
      { slug: "super-power", title: "Super Power" },
      { slug: "supranatural", title: "Supranatural" },
      { slug: "suspense", title: "Suspense" },
      { slug: "thriller", title: "Thriller" }
    ];
    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

exports.Status = async (req, res) => {
  try {
    const data = [
      { slug: "", title: "Semua" },
      { slug: "ongoing", title: "Sedang Tayang" },
      { slug: "completed", title: "Selesai Tayang" }
    ];
    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};

exports.Alphabet = async (req, res) => {
  try {
    const data = Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(65 + i);
      return { slug: letter, title: letter };
    });
    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};
