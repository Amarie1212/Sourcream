const { setCache } = require('../../middlewares/CacheAPI');
const { getChapterInfo } = require('../../helpers/MangaDexHelper');

exports.index = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ success: false, message: 'Parameter slug diperlukan' });
  }

  try {
    const info = await getChapterInfo(slug);

    if (!info) {
      return res.status(404).json({ success: false, message: 'Chapter tidak ditemukan' });
    }

    const responseData = {
      success: true,
      title: info.title,
      comicSlug: info.comicSlug,
      comicTitle: info.comicTitle,
      prevChapter: info.prevChapter,
      nextChapter: info.nextChapter,
      data: info.pages
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('KomikAPI Chapter Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data chapter' });
  }
};
