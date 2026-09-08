const { setCache } = require('../../middlewares/CacheAPI');
const { getMangaList } = require('../../helpers/MangaDexHelper');

exports.index = async (req, res) => {
  const { q = '', page = 1 } = req.query;
  const pageNum = parseInt(page) || 1;

  try {
    const result = await getMangaList({
      title: q,
      page: pageNum,
      limit: 24
    });

    const responseData = {
      success: true,
      data: result.data,
      total: result.total,
      page: pageNum
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('KomikAPI Search Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mencari komik' });
  }
};
