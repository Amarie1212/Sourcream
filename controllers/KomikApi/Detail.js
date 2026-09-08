const { setCache } = require('../../middlewares/CacheAPI');
const { getMangaDetail } = require('../../helpers/MangaDexHelper');

exports.index = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ success: false, message: 'Parameter slug diperlukan' });
  }

  try {
    const result = await getMangaDetail(slug);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Komik tidak ditemukan' });
    }

    const responseData = {
      success: true,
      data: result.data,
      chapters: result.chapters
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('KomikAPI Detail Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail komik' });
  }
};
